import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, ConfigProvider } from 'antd';
import { flushSync } from 'react-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import { Base_url } from '../../../utils/Base_url';
import SidebarCrudMatrix from './SidebarCrudMatrix';
import { MENU_ROWS, menuPermissionKey, type MenuMatrixAction, type MenuMatrixRow } from '../../../utils/menuPermissionCatalog';
import { getUserDataFromStorage, isSuperAdminRole } from '../../../utils/branchScope';

type AppRole = {
  _id: string;
  name: string;
  key: string;
  description?: string;
  permissions: string[];
  isSystem?: boolean;
  branchId?: string | { _id: string } | null;
  createdBySuperAdmin?: boolean;
};

const getAuthHeaders = () => {
  const token = localStorage.getItem('userToken') || '';
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/** Match server `normalizeKey`: hide global elevated templates from branch matrix picker. */
function normalizeRoleKeyForFilter(raw: string): string {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');
}

const RESERVED_GLOBAL_TEMPLATE_KEYS = new Set([
  'superadmin',
  'super_admin',
  'administrator',
  'admin',
  'full_access',
]);

function elevatedRoleNameRoot(name: string): string {
  const s = String(name || '').trim().toLowerCase();
  if (!s) return '';
  const first = s.split(/[\s(_-]+/)[0] || '';
  return first.replace(/[^a-z0-9]/g, '');
}

function isElevatedRoleHiddenFromBranchClient(r: AppRole): boolean {
  const k = normalizeRoleKeyForFilter(r.key);
  if (RESERVED_GLOBAL_TEMPLATE_KEYS.has(k)) return true;
  const root = elevatedRoleNameRoot(r.name);
  return root === 'admin' || root === 'administrator' || root === 'superadmin';
}

function permSetsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sb = new Set(b);
  return a.every((x) => sb.has(x));
}

const APP_THEME_PRIMARY = '#3CBEB7';

const RolesAndPermissions = () => {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [menuMatrix, setMenuMatrix] = useState<MenuMatrixRow[]>([]);
  const [sidebarRoleId, setSidebarRoleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingMatrix, setSavingMatrix] = useState(false);

  const currentUser = useMemo(() => getUserDataFromStorage(), []);
  const isSuperAdmin = useMemo(() => isSuperAdminRole(currentUser?.role), [currentUser?.role]);

  const rolesVisibleForMatrix = useMemo(() => {
    if (isSuperAdmin) return roles;
    return roles.filter((r) => {
      if (r.isSystem) return false;
      return !isElevatedRoleHiddenFromBranchClient(r);
    });
  }, [roles, isSuperAdmin]);

  const [matrix, setMatrix] = useState<Record<string, string[]>>({});
  const [dirtyRoleIds, setDirtyRoleIds] = useState<Set<string>>(new Set());

  const fetchMenuMatrix = useCallback(() => {
    axios
      .get(`${Base_url}/apis/role/catalog`, { headers: getAuthHeaders() })
      .then((res) => {
        const mm = Array.isArray(res.data?.menuMatrix) ? res.data.menuMatrix : [];
        setMenuMatrix(mm.length ? mm : MENU_ROWS);
      })
      .catch((err) => {
        const msg = err?.response?.data?.message || 'Failed to load menu matrix';
        toast.error(msg);
        setMenuMatrix(MENU_ROWS);
      });
  }, []);

  const fetchRoles = useCallback(() => {
    setLoading(true);
    axios
      .get(`${Base_url}/apis/role/get`, { headers: getAuthHeaders() })
      .then((res) => {
        const list = Array.isArray(res.data?.data) ? res.data.data : [];
        setRoles(list);
      })
      .catch((err) => {
        const msg = err?.response?.data?.message || 'Failed to load roles';
        toast.error(msg);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchMenuMatrix();
    fetchRoles();
  }, [fetchMenuMatrix, fetchRoles]);

  useEffect(() => {
    const next: Record<string, string[]> = {};
    for (const r of roles) {
      next[r._id] = Array.isArray(r.permissions) ? [...r.permissions] : [];
    }
    setMatrix(next);
    setDirtyRoleIds(new Set());
  }, [roles]);

  useEffect(() => {
    if (rolesVisibleForMatrix.length === 0) return;
    setSidebarRoleId((prev) => {
      if (prev && rolesVisibleForMatrix.some((r) => r._id === prev)) return prev;
      const custom = rolesVisibleForMatrix.find((r) => !r.isSystem);
      return custom?._id ?? rolesVisibleForMatrix[0]?._id ?? null;
    });
  }, [rolesVisibleForMatrix]);

  const matrixDirty = dirtyRoleIds.size > 0;

  const mutateSidebarMpMatrix = useCallback(
    (mutate: (s: Set<string>) => void) => {
      if (!sidebarRoleId) return;
      const role = roles.find((x) => x._id === sidebarRoleId);
      if (!role || role.isSystem) return;
      const rid = sidebarRoleId;
      let nextUnique: string[] = [];
      flushSync(() => {
        setMatrix((m) => {
          const cur = new Set(m[rid] || []);
          mutate(cur);
          nextUnique = [...new Set(Array.from(cur))];
          return { ...m, [rid]: nextUnique };
        });
      });
      const baseline = role.permissions || [];
      setDirtyRoleIds((prev) => {
        const next = new Set(prev);
        if (permSetsEqual(nextUnique, baseline)) next.delete(rid);
        else next.add(rid);
        return next;
      });
    },
    [sidebarRoleId, roles],
  );

  const toggleMpPermission = (menuId: string, action: MenuMatrixAction, checked: boolean) => {
    if (!sidebarRoleId) return;
    const role = roles.find((x) => x._id === sidebarRoleId);
    if (!role || role.isSystem) return;
    const k = menuPermissionKey(menuId, action);
    mutateSidebarMpMatrix((cur) => {
      if (checked) cur.add(k);
      else cur.delete(k);
    });
  };

  const saveMatrix = async () => {
    const toSave = roles.filter((r) => dirtyRoleIds.has(r._id) && !r.isSystem);
    if (toSave.length === 0) {
      toast.info('No permission changes to save.');
      return;
    }
    try {
      setSavingMatrix(true);
      for (const r of toSave) {
        await axios.put(
          `${Base_url}/apis/role/update/${r._id}`,
          {
            name: r.name.trim(),
            description: String(r.description || '').trim(),
            permissions: matrix[r._id] || [],
          },
          { headers: getAuthHeaders() },
        );
      }
      toast.success('Permissions saved');
      setDirtyRoleIds(new Set());
      fetchRoles();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(msg || 'Save failed');
    } finally {
      setSavingMatrix(false);
    }
  };

  const discardMatrix = () => {
    const next: Record<string, string[]> = {};
    for (const r of roles) {
      next[r._id] = Array.isArray(r.permissions) ? [...r.permissions] : [];
    }
    setMatrix(next);
    setDirtyRoleIds(new Set());
  };

  const menuRowCount = (menuMatrix.length ? menuMatrix : MENU_ROWS).length;
  const editableRoles = rolesVisibleForMatrix.filter((r) => !r.isSystem).length;
  const rolesCountBadge = isSuperAdmin ? roles.length : rolesVisibleForMatrix.length;

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: APP_THEME_PRIMARY,
          borderRadius: 6,
        },
      }}
    >
      <Breadcrumb pageName="Menu permissions" />

      <section className="mb-6 rounded-lg border border-stroke bg-white px-4 py-5 shadow-default sm:px-6 dark:border-strokedark dark:bg-boxdark">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="border-l-4 border-primary pl-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Menu access</p>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-bodydark2">
                Pick a role your account can manage (Super Admin: all branches; branch admins: this branch only), tick
                Access / Create / Read / Update / Delete, then{' '}
                <span className="font-medium text-bodydark1 dark:text-bodydark">Save matrix</span>. Add or edit role
                names on{' '}
                <Link to="/admin/roles/manage" className="font-medium text-primary hover:underline">
                  Roles (list)
                </Link>{' '}
                — only Super Admin can delete a role there.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 pl-1 lg:pl-[calc(1rem+4px)]">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-stroke bg-gray-2 px-3 py-1.5 text-xs font-medium text-bodydark1 dark:border-strokedark dark:bg-meta-4 dark:text-bodydark2">
                <span className="text-black dark:text-white">{rolesCountBadge}</span>
                <span className="text-bodydark2">roles</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md border border-stroke bg-gray-2 px-3 py-1.5 text-xs font-medium text-bodydark1 dark:border-strokedark dark:bg-meta-4 dark:text-bodydark2">
                <span className="text-black dark:text-white">{menuRowCount}</span>
                <span className="text-bodydark2">menu rows</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary dark:border-primary/35 dark:bg-primary/15 dark:text-secondary">
                <span>{editableRoles}</span>
                <span className="opacity-90">editable role{editableRoles !== 1 ? 's' : ''}</span>
              </span>
            </div>
          </div>
          <div className="flex w-full shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end lg:w-auto lg:min-w-[220px]">
            <Link
              to="/admin/roles/manage"
              className="inline-flex items-center justify-center rounded-md border border-stroke bg-white px-4 py-2 text-sm font-medium text-bodydark1 shadow-sm hover:bg-gray-2 dark:border-strokedark dark:bg-meta-4 dark:text-bodydark2"
            >
              Roles (list)
            </Link>
            {matrixDirty ? (
              <>
                <Button onClick={discardMatrix} disabled={savingMatrix}>
                  Discard changes
                </Button>
                <Button type="primary" loading={savingMatrix} onClick={saveMatrix} className="bg-primary">
                  Save matrix
                </Button>
              </>
            ) : (
              <div className="rounded-md border border-dashed border-stroke bg-gray-2/80 px-4 py-3 text-center text-xs text-bodydark2 dark:border-strokedark dark:bg-meta-4 sm:text-left">
                No unsaved changes. Edit checkboxes above, then Save matrix.
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="rpm-matrix-wrap mb-8 overflow-hidden rounded-lg border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <header className="border-b border-stroke bg-gray-2 px-4 py-4 dark:border-strokedark dark:bg-meta-4 sm:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-black dark:text-white">Sidebar permission matrix</h2>
              <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-bodydark2">
                Select a role above, then use the checkboxes for each menu row.{' '}
                <span className="font-medium text-bodydark1 dark:text-bodydark">Access</span> opens the module in the
                sidebar; <span className="font-medium text-bodydark1 dark:text-bodydark">Create / Read / Update / Delete</span>{' '}
                control actions inside that area. Rows include main menus and sub-menus as listed. System roles are
                read-only here.
              </p>
            </div>
            {matrixDirty && (
              <span className="inline-flex shrink-0 items-center rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-800 dark:border-amber-400/35 dark:bg-amber-500/15 dark:text-amber-200">
                Unsaved changes — use Save matrix above
              </span>
            )}
          </div>
        </header>
        <div className="px-4 py-5 sm:px-6">
          <SidebarCrudMatrix
            loading={loading}
            roles={rolesVisibleForMatrix}
            menuRows={menuMatrix.length ? menuMatrix : MENU_ROWS}
            selectedRoleId={sidebarRoleId}
            onSelectRole={setSidebarRoleId}
            rolePermissions={sidebarRoleId ? matrix[sidebarRoleId] ?? [] : []}
            readOnly={false}
            onToggle={toggleMpPermission}
            onMatrixMutate={mutateSidebarMpMatrix}
          />
        </div>
      </div>
    </ConfigProvider>
  );
};

export default RolesAndPermissions;
