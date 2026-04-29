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
    if (roles.length === 0) return;
    setSidebarRoleId((prev) => {
      if (prev && roles.some((r) => r._id === prev)) return prev;
      const custom = roles.find((r) => !r.isSystem);
      return custom?._id ?? roles[0]?._id ?? null;
    });
  }, [roles]);

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
    try {
      setCreating(true);
      await axios.post(
        `${Base_url}/apis/role/create`,
        {
          name,
          key: keyClean,
          description: createForm.description.trim(),
          permissions: [],
          ...(isSuperAdmin ? { branchId: createForm.branchId ? createForm.branchId : null } : {}),
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
  const editableRoles = roles.filter((r) => !r.isSystem).length;

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

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          
          
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full border border-stroke bg-white px-3 py-1 text-xs font-medium text-bodydark1 dark:border-strokedark dark:bg-meta-4">
              {roles.length} roles
            </span>
            <span className="inline-flex items-center rounded-full border border-stroke bg-white px-3 py-1 text-xs font-medium text-bodydark1 dark:border-strokedark dark:bg-meta-4">
              {permTotal} permission keys
            </span>
            <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary dark:border-primary/40 dark:bg-primary/15 dark:text-secondary">
              {editableRoles} editable role{editableRoles !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <div className="flex flex-shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex flex-wrap gap-2">
            <Button size="middle" onClick={() => setAllGroupsExpanded(true)}>
              Expand all groups
            </Button>
            <Button size="middle" onClick={() => setAllGroupsExpanded(false)}>
              Collapse all groups
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-stroke pt-2 sm:border-t-0 sm:pt-0 dark:border-strokedark">
            {matrixDirty && (
              <>
                <Button onClick={discardMatrix} disabled={savingMatrix}>
                  Discard changes
                </Button>
                <Button type="primary" loading={savingMatrix} onClick={saveMatrix} className="bg-primary">
                  Save matrix
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <form
        onSubmit={submitCreateRole}
        className="mb-6 rounded-sm border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark"
      >
        <h2 className="mb-3 text-sm font-semibold text-black dark:text-white">Add new role</h2>
        <p className="mb-4 text-xs text-bodydark2">
          After creating, the role appears as a column in the matrix. Assign permissions there, then use <strong>Save matrix</strong>.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-[180px] flex-1">
            <label className="mb-1 block text-xs font-medium text-bodydark1">Name</label>
            <input
              className="w-full rounded border border-stroke bg-white px-3 py-2 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark dark:text-white"
              value={createForm.name}
              onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Senior pharmacist"
            />
          </div>
          <div className="min-w-[160px] flex-1">
            <label className="mb-1 block text-xs font-medium text-bodydark1">Key</label>
            <input
              className="w-full rounded border border-stroke bg-white px-3 py-2 font-mono text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark dark:text-white"
              value={createForm.key}
              onChange={(e) => setCreateForm((f) => ({ ...f, key: e.target.value }))}
              placeholder="e.g. senior_pharmacist"
            />
          </div>
          <div className="min-w-[200px] flex-[2]">
            <label className="mb-1 block text-xs font-medium text-bodydark1">Description (optional)</label>
            <input
              className="w-full rounded border border-stroke bg-white px-3 py-2 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark dark:text-white"
              value={createForm.description}
              onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Short note"
            />
          </div>
          {isSuperAdmin && (
            <div className="min-w-[220px] flex-[2]">
              <label className="mb-1 block text-xs font-medium text-bodydark1">Branch</label>
              <Select
                allowClear
                placeholder="Global (all branches)"
                loading={branchesLoading}
                className="w-full min-w-[200px]"
                value={createForm.branchId || undefined}
                onChange={(v) => setCreateForm((f) => ({ ...f, branchId: (v as string) || '' }))}
                options={branches.map((b) => ({
                  value: b._id,
                  label: b.name || b._id,
                }))}
              />
              <p className="mt-1 text-xs text-bodydark2">
                Leave empty for a shared template; pick a branch for a role only that branch manages.
              </p>
            </div>
          )}
          <Button type="primary" htmlType="submit" loading={creating} className="bg-primary sm:min-w-[120px]">
            Create role
          </Button>
        </div>
      </form>

      <div className="rpm-matrix-wrap mb-8 overflow-hidden rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="border-b border-stroke px-5 py-5 dark:border-strokedark">
          <SidebarCrudMatrix
            loading={loading}
            roles={roles}
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
        title="Edit role"
        open={modalOpen && !!editing}
        onCancel={closeModal}
        width={520}
        footer={null}
        destroyOnClose
        styles={{ body: { maxHeight: '75vh', overflowY: 'auto' } }}
      >
        {editing ? (
          <form onSubmit={submitEditRole} className="flex flex-col gap-4">
          <p className="m-0 text-xs text-bodydark2">
            Update the display name or description. Permissions stay in the matrix — use <strong>Save matrix</strong> there.
            The key cannot be changed after creation.
          </p>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-bodydark1">Name</label>
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
          <div className="mt-2 flex justify-end gap-2 border-t border-stroke pt-4 dark:border-strokedark">
            <Button onClick={closeModal} disabled={saving}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={saving} className="bg-primary">
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
