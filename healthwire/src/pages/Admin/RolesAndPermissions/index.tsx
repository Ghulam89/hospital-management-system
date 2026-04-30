import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, ConfigProvider, Modal as AntdModal, Select } from 'antd';
import axios from 'axios';
import { toast } from 'react-toastify';
import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import { Base_url } from '../../../utils/Base_url';
import SidebarCrudMatrix from './SidebarCrudMatrix';
import {
  MENU_ROWS,
  menuPermissionKey,
  type MenuMatrixAction,
  type MenuMatrixRow,
} from '../../../utils/menuPermissionCatalog';
import { getUserDataFromStorage, isSuperAdminRole } from '../../../utils/branchScope';

type CatalogItem = { key: string; label: string; group: string; description?: string };

type BranchLite = { _id: string; name?: string };

type AppRole = {
  _id: string;
  name: string;
  key: string;
  description?: string;
  permissions: string[];
  isSystem?: boolean;
  branchId?: string | { _id: string } | null;
};

const getAuthHeaders = () => {
  const token = localStorage.getItem('userToken') || '';
  return token ? { Authorization: `Bearer ${token}` } : {};
};

function branchIdFromRole(r: AppRole): string {
  const raw = r.branchId;
  if (raw == null) return '';
  if (typeof raw === 'object' && '_id' in raw) return String((raw as { _id: string })._id);
  return String(raw);
}

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

/** Align with server: hide HQ templates even when role key is a numeric/code but display name is "admin". */
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
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [menuMatrix, setMenuMatrix] = useState<MenuMatrixRow[]>([]);
  const [branches, setBranches] = useState<BranchLite[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [sidebarRoleId, setSidebarRoleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingMatrix, setSavingMatrix] = useState(false);
  const [editing, setEditing] = useState<AppRole | null>(null);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    key: '',
    description: '',
    branchId: '' as string,
  });
  const [form, setForm] = useState({
    name: '',
    key: '',
    description: '',
    branchId: '' as string,
  });

  const currentUser = useMemo(() => getUserDataFromStorage(), []);
  const isSuperAdmin = useMemo(() => isSuperAdminRole(currentUser?.role), [currentUser?.role]);

  const rolesVisibleForMatrix = useMemo(() => {
    if (isSuperAdmin) return roles;
    return roles.filter((r) => {
      if (r.isSystem) return false;
      return !isElevatedRoleHiddenFromBranchClient(r);
    });
  }, [roles, isSuperAdmin]);

  /** roleId → permission keys (working copy for matrix) */
  const [matrix, setMatrix] = useState<Record<string, string[]>>({});
  const [dirtyRoleIds, setDirtyRoleIds] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const groupedCatalog = useMemo(() => {
    const map = new Map<string, CatalogItem[]>();
    for (const item of catalog) {
      if (!map.has(item.group)) map.set(item.group, []);
      map.get(item.group)!.push(item);
    }
    return map;
  }, [catalog]);

  const groupOrder = useMemo(() => Array.from(groupedCatalog.keys()), [groupedCatalog]);

  useEffect(() => {
    const next: Record<string, boolean> = { ...expandedGroups };
    let changed = false;
    for (const g of groupOrder) {
      if (next[g] === undefined) {
        next[g] = true;
        changed = true;
      }
    }
    if (changed) setExpandedGroups(next);
  }, [groupOrder]);

  const fetchCatalog = useCallback(() => {
    axios
      .get(`${Base_url}/apis/role/catalog`, { headers: getAuthHeaders() })
      .then((res) => {
        const mm = Array.isArray(res.data?.menuMatrix) ? res.data.menuMatrix : [];
        setCatalog(Array.isArray(res.data?.data) ? res.data.data : []);
        setMenuMatrix(mm.length ? mm : MENU_ROWS);
      })
      .catch((err) => {
        const msg = err?.response?.data?.message || 'Failed to load permission list';
        toast.error(msg);
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
    fetchCatalog();
    fetchRoles();
  }, [fetchCatalog, fetchRoles]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    setBranchesLoading(true);
    axios
      .get(`${Base_url}/apis/branch/get`, {
        headers: getAuthHeaders(),
        params: { limit: 500, page: 1 },
      })
      .then((res) => {
        const list = Array.isArray(res.data?.data) ? res.data.data : [];
        setBranches(list.map((b: BranchLite) => ({ _id: String(b._id), name: b.name })));
      })
      .catch(() => setBranches([]))
      .finally(() => setBranchesLoading(false));
  }, [isSuperAdmin]);

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

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  const setAllGroupsExpanded = (expanded: boolean) => {
    const next: Record<string, boolean> = {};
    for (const g of groupedCatalog.keys()) next[g] = expanded;
    setExpandedGroups(next);
  };

  const hasPerm = (roleId: string, key: string) => (matrix[roleId] || []).includes(key);

  const setRolePerms = (roleId: string, keys: string[], role: AppRole) => {
    if (role.isSystem) return;
    const unique = [...new Set(keys)];
    setMatrix((m) => ({ ...m, [roleId]: unique }));
    const orig = roles.find((x) => x._id === roleId);
    const baseline = orig?.permissions || [];
    setDirtyRoleIds((prev) => {
      const next = new Set(prev);
      if (permSetsEqual(unique, baseline)) next.delete(roleId);
      else next.add(roleId);
      return next;
    });
  };

  const toggleMpPermission = (menuId: string, action: MenuMatrixAction, checked: boolean) => {
    if (!sidebarRoleId) return;
    const role = roles.find((x) => x._id === sidebarRoleId);
    if (!role || role.isSystem) return;
    const k = menuPermissionKey(menuId, action);
    const cur = new Set(matrix[sidebarRoleId] || []);
    if (checked) cur.add(k);
    else cur.delete(k);
    setRolePerms(sidebarRoleId, Array.from(cur), role);
  };

  const toggleCell = (roleId: string, permKey: string, role: AppRole) => {
    if (role.isSystem) {
      toast.info('System roles cannot be changed here.');
      return;
    }
    const cur = new Set(matrix[roleId] || []);
    if (cur.has(permKey)) cur.delete(permKey);
    else cur.add(permKey);
    setRolePerms(roleId, Array.from(cur), role);
  };

  const toggleCategoryColumn = (group: string, role: AppRole, items: CatalogItem[]) => {
    if (role.isSystem) {
      toast.info('System roles cannot be changed here.');
      return;
    }
    const roleId = role._id;
    const keysInGroup = items.map((i) => i.key);
    const cur = new Set(matrix[roleId] || []);
    const selected = keysInGroup.filter((k) => cur.has(k));
    const allOn = selected.length === keysInGroup.length;
    if (allOn) {
      keysInGroup.forEach((k) => cur.delete(k));
    } else {
      keysInGroup.forEach((k) => cur.add(k));
    }
    setRolePerms(roleId, Array.from(cur), role);
  };

  const categoryTriState = (_group: string, role: AppRole, items: CatalogItem[]) => {
    const keysInGroup = items.map((i) => i.key);
    const cur = new Set(matrix[role._id] || []);
    const selected = keysInGroup.filter((k) => cur.has(k));
    const checked = selected.length === keysInGroup.length && keysInGroup.length > 0;
    const indeterminate = selected.length > 0 && selected.length < keysInGroup.length;
    return { checked, indeterminate };
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

  const submitCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = createForm.name.trim();
    const keyClean = createForm.key.trim().toLowerCase().replace(/\s+/g, '_');
    if (!name) {
      toast.error('Role name is required');
      return;
    }
    if (!createForm.key.trim()) {
      toast.error('Role key is required (e.g. senior_nurse)');
      return;
    }
    if (!/^[a-z0-9_-]+$/.test(keyClean)) {
      toast.error('Key may only use lowercase letters, numbers, - and _');
      return;
    }
    if (isSuperAdmin && !createForm.branchId.trim()) {
      toast.error('Branch is required — pick which branch this role belongs to');
      return;
    }
    try {
      setCreating(true);
      await axios.post(
        `${Base_url}/apis/role/create`,
        {
          name,
          key: keyClean,
          description: createForm.description.trim(),
          permissions: [],
          ...(isSuperAdmin ? { branchId: createForm.branchId.trim() } : {}),
        },
        { headers: getAuthHeaders() },
      );
      toast.success('Role created — set permissions in the matrix, then Save matrix.');
      setCreateForm({ name: '', key: '', description: '', branchId: '' });
      fetchRoles();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(msg || 'Create failed');
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (r: AppRole) => {
    if (r.isSystem) {
      toast.info('System roles cannot be edited here.');
      return;
    }
    setEditing(r);
    setForm({
      name: r.name,
      key: r.key,
      description: r.description || '',
      branchId: branchIdFromRole(r),
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setSaving(false);
    setForm({ name: '', key: '', description: '', branchId: '' });
  };

  const submitEditRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (!form.name.trim()) {
      toast.error('Role name is required');
      return;
    }
    try {
      setSaving(true);
      const perms =
        matrix[editing._id] ?? (Array.isArray(editing.permissions) ? [...editing.permissions] : []);
      await axios.put(
        `${Base_url}/apis/role/update/${editing._id}`,
        {
          name: form.name.trim(),
          description: form.description.trim(),
          permissions: perms,
          ...(isSuperAdmin ? { branchId: form.branchId ? form.branchId : null } : {}),
        },
        { headers: getAuthHeaders() },
      );
      toast.success('Role updated');
      closeModal();
      fetchRoles();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(msg || 'Save failed');
      setSaving(false);
    }
  };

  const handleDelete = (r: AppRole) => {
    if (r.isSystem) {
      toast.info('System roles cannot be deleted.');
      return;
    }
    AntdModal.confirm({
      title: 'Delete this role?',
      content: 'Users already assigned this role are not changed — update them under Users if needed.',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await axios.delete(`${Base_url}/apis/role/delete/${r._id}`, { headers: getAuthHeaders() });
          toast.success('Role deleted');
          fetchRoles();
        } catch (err: unknown) {
          const msg =
            err && typeof err === 'object' && 'response' in err
              ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
              : undefined;
          toast.error(msg || 'Delete failed');
        }
      },
    });
  };

  const groupedCatalogEntries = useMemo(() => Array.from(groupedCatalog.entries()), [groupedCatalog]);

  const permTotal = catalog.length;
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
      <Breadcrumb pageName="Roles & permissions" />

      <section className="mb-6 rounded-lg border border-stroke bg-white px-4 py-5 shadow-default sm:px-6 dark:border-strokedark dark:bg-boxdark">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="border-l-4 border-primary pl-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Quick guide</p>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-bodydark2">
                Create a role below, select it in the matrix, set sidebar/menu permissions, then click{' '}
                <span className="font-medium text-bodydark1 dark:text-bodydark">Save matrix</span>. Text fields submit with{' '}
                <kbd className="rounded border border-stroke px-1.5 py-0.5 font-mono text-[11px] dark:border-strokedark">
                  Enter
                </kbd>
                .
              </p>
            </div>
            <div className="flex flex-wrap gap-2 pl-1 lg:pl-[calc(1rem+4px)]">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-stroke bg-gray-2 px-3 py-1.5 text-xs font-medium text-bodydark1 dark:border-strokedark dark:bg-meta-4 dark:text-bodydark2">
                <span className="text-black dark:text-white">{rolesCountBadge}</span>
                <span className="text-bodydark2">roles</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md border border-stroke bg-gray-2 px-3 py-1.5 text-xs font-medium text-bodydark1 dark:border-strokedark dark:bg-meta-4 dark:text-bodydark2">
                <span className="text-black dark:text-white">{permTotal}</span>
                <span className="text-bodydark2">permission keys</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary dark:border-primary/35 dark:bg-primary/15 dark:text-secondary">
                <span>{editableRoles}</span>
                <span className="opacity-90">editable role{editableRoles !== 1 ? 's' : ''}</span>
              </span>
            </div>
          </div>
          <div className="flex w-full shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end lg:w-auto lg:min-w-[220px]">
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
                No unsaved changes in the permission matrix.
              </div>
            )}
          </div>
        </div>
      </section>

      <form
        onSubmit={submitCreateRole}
        className="mb-6 rounded-lg border border-stroke bg-white p-5 shadow-default sm:p-6 dark:border-strokedark dark:bg-boxdark"
      >
        <div className="mb-5 flex flex-col gap-1 border-b border-stroke pb-4 dark:border-strokedark sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-black dark:text-white">Create role</h2>
            <p className="mt-0.5 text-xs text-bodydark2">
              New roles start with no permissions — configure them in the matrix next.
            </p>
          </div>
          {isSuperAdmin && (
            <span className="mt-2 inline-flex w-fit rounded-md bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary dark:bg-primary/15 dark:text-secondary sm:mt-0">
              Branch required for each new role
            </span>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-bodydark1">
                Name<span className="text-meta-1"> *</span>
              </label>
              <input
                required
                className="w-full rounded border border-stroke bg-white px-4 py-2.5 text-black outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark dark:text-white"
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Senior pharmacist"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-bodydark1">
                Key (slug)<span className="text-meta-1"> *</span>
              </label>
              <input
                required
                className="w-full rounded border border-stroke bg-white px-4 py-2.5 font-mono text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark dark:text-white"
                value={createForm.key}
                onChange={(e) => setCreateForm((f) => ({ ...f, key: e.target.value }))}
                placeholder="e.g. senior_pharmacist"
              />
              <p className="mt-1 text-xs text-bodydark2">
                Lowercase letters, numbers, <span className="font-mono">_</span> and <span className="font-mono">-</span> only.
              </p>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-bodydark1">Description (optional)</label>
            <input
              className="w-full rounded border border-stroke bg-white px-4 py-2.5 text-black outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark dark:text-white"
              value={createForm.description}
              onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Short note"
            />
          </div>
          {isSuperAdmin && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-bodydark1">
                Branch<span className="text-meta-1"> *</span>
              </label>
              <Select
                size="large"
                placeholder="Select branch"
                loading={branchesLoading}
                className="w-full"
                value={createForm.branchId || undefined}
                onChange={(v) => setCreateForm((f) => ({ ...f, branchId: (v as string) || '' }))}
                options={branches.map((b) => ({
                  value: b._id,
                  label: b.name || b._id,
                }))}
              />
              <p className="mt-1 text-xs text-bodydark2">
                Each new role is scoped to one branch so permissions stay separate per location.
              </p>
            </div>
          )}
          <div className="flex justify-end border-t border-stroke pt-4 dark:border-strokedark">
            <Button type="primary" htmlType="submit" loading={creating} className="bg-primary min-w-[130px]">
              Create role
            </Button>
          </div>
        </div>
      </form>

      <div className="rpm-matrix-wrap mb-8 overflow-hidden rounded-lg border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <header className="border-b border-stroke bg-gray-2 px-4 py-4 dark:border-strokedark dark:bg-meta-4 sm:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-black dark:text-white">Sidebar permission matrix</h2>
              <p className="mt-0.5 max-w-xl text-xs leading-relaxed text-bodydark2">
                Select a role from the dropdown, then use the checkboxes to grant Access, Create, Read, Update, or Delete per
                menu row. System roles cannot be edited here.
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
          />
        </div>
      </div>

      <AntdModal
        title={editing ? `Edit role · ${editing.name}` : 'Edit role'}
        open={modalOpen && !!editing}
        onCancel={closeModal}
        width={540}
        footer={null}
        destroyOnClose
        styles={{ body: { maxHeight: '75vh', overflowY: 'auto', paddingTop: 12 } }}
      >
        {editing ? (
          <form onSubmit={submitEditRole} className="flex flex-col gap-4">
          <p className="-mt-1 rounded-md bg-gray-2 px-3 py-2 text-xs leading-relaxed text-bodydark2 dark:bg-meta-4">
            Update the display name or branch assignment. Permission toggles stay in the matrix — remember to{' '}
            <span className="font-medium text-bodydark1 dark:text-white">Save matrix</span> after changing checkboxes.
            The role key cannot be changed.
          </p>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-bodydark1">
              Name<span className="text-meta-1"> *</span>
            </label>
            <input
              required
              className="w-full rounded border border-stroke bg-white px-4 py-2.5 text-black outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark dark:text-white"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Senior pharmacist"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-bodydark1">Key (slug)</label>
            <input
              readOnly
              disabled
              className="w-full rounded border border-stroke bg-white px-4 py-2.5 font-mono text-sm text-black outline-none focus:border-primary disabled:opacity-70 dark:border-strokedark dark:bg-boxdark dark:text-white"
              value={editing.key}
              placeholder="e.g. senior_pharmacist"
            />
            <p className="mt-1 text-xs text-bodydark2">
              Unique id for this role; use it as the user&apos;s role field in User management.
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-bodydark1">Description (optional)</label>
            <textarea
              className="w-full rounded border border-stroke bg-white px-4 py-2.5 text-black outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark dark:text-white"
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          {isSuperAdmin && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-bodydark1">Branch</label>
              <Select
                allowClear
                size="large"
                placeholder="Global (all branches)"
                loading={branchesLoading}
                className="w-full"
                value={form.branchId || undefined}
                onChange={(v) => setForm((f) => ({ ...f, branchId: (v as string) || '' }))}
                options={branches.map((b) => ({
                  value: b._id,
                  label: b.name || b._id,
                }))}
              />
              <p className="mt-1 text-xs text-bodydark2">
                Assign this role to one branch only, or leave empty for a global template.
              </p>
            </div>
          )}
          <div className="mt-1 flex flex-col-reverse gap-2 border-t border-stroke pt-4 dark:border-strokedark sm:flex-row sm:justify-end">
            <Button onClick={closeModal} disabled={saving}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={saving} className="bg-primary sm:min-w-[120px]">
              Save changes
            </Button>
          </div>
        </form>
        ) : null}
      </AntdModal>
    </ConfigProvider>
  );
};

export default RolesAndPermissions;
