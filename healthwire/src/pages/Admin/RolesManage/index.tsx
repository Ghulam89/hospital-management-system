import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { ConfigProvider, Modal as AntdModal, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Link } from 'react-router-dom';
import { FaRegEdit } from 'react-icons/fa';
import { RiDeleteBin5Line } from 'react-icons/ri';
import axios from 'axios';
import { toast } from 'react-toastify';
import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import { Base_url } from '../../../utils/Base_url';
import { getUserDataFromStorage, isSuperAdminRole } from '../../../utils/branchScope';

type BranchLite = { _id: string; name?: string };

type AppRole = {
  _id: string;
  name: string;
  key: string;
  description?: string;
  permissions: string[];
  isSystem?: boolean;
  branchId?: string | { _id: string } | null;
  /** Super Admin–authored row for this branch; hidden from branch admins in API list */
  createdBySuperAdmin?: boolean;
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

const APP_THEME_PRIMARY = '#3CBEB7';

/** Match `Add_staff` / `Add_admin` form controls */
const LABEL_CLASS = 'mb-2.5 block text-black dark:text-white';
const INPUT_CLASS =
  'w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter disabled:opacity-70 dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary';
const TEXTAREA_CLASS =
  'w-full resize-y rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary';

const modalClassNames = {
  content:
    '!rounded-sm !border !border-stroke !bg-white !p-0 !shadow-default dark:!border-strokedark dark:!bg-boxdark [&_.ant-modal-close]:!text-bodydark1 dark:[&_.ant-modal-close]:!text-bodydark2 [&_.ant-modal-close:hover]:!text-black dark:[&_.ant-modal-close:hover]:!text-white',
  header:
    '!mb-0 !border-b !border-stroke !bg-white !px-6.5 !pb-4 !pt-6 dark:!border-strokedark dark:!bg-boxdark',
  body: '!px-6.5 !pb-6.5 !pt-0 !bg-white dark:!bg-boxdark',
};

const RolesManage = () => {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [branches, setBranches] = useState<BranchLite[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    key: '',
    description: '',
    branchId: '' as string,
  });
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<AppRole | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    branchId: '' as string,
  });

  const currentUser = useMemo(() => getUserDataFromStorage(), []);
  const isSuperAdmin = useMemo(() => isSuperAdminRole(currentUser?.role), [currentUser?.role]);

  const branchNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const b of branches) m.set(String(b._id), b.name || String(b._id));
    return m;
  }, [branches]);

  const tableRows = useMemo(() => roles, [roles]);

  const fetchRoles = useCallback(() => {
    setLoading(true);
    axios
      .get(`${Base_url}/apis/role/get`, { headers: getAuthHeaders() })
      .then((res) => {
        const list = Array.isArray(res.data?.data) ? res.data.data : [];
        setRoles(list);
      })
      .catch((err) => {
        toast.error(err?.response?.data?.message || 'Failed to load roles');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  useEffect(() => {
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
  }, []);

  const openCreate = () => {
    setCreateForm({ name: '', key: '', description: '', branchId: '' });
    setCreateOpen(true);
  };

  const submitCreate = async (e: FormEvent) => {
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
      toast.error('Branch is required for new roles');
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
      toast.success('Role created');
      setCreateOpen(false);
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
      toast.info('System roles cannot be edited.');
      return;
    }
    setEditing(r);
    setForm({
      name: r.name,
      description: r.description || '',
      branchId: branchIdFromRole(r),
    });
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditing(null);
    setSaving(false);
    setForm({ name: '', description: '', branchId: '' });
  };

  const submitEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (!form.name.trim()) {
      toast.error('Role name is required');
      return;
    }
    try {
      setSaving(true);
      const perms = Array.isArray(editing.permissions) ? [...editing.permissions] : [];
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
      closeEdit();
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
    if (!isSuperAdmin) {
      toast.info('Only Super Admin can delete roles.');
      return;
    }
    if (r.isSystem) {
      toast.info('System roles cannot be deleted.');
      return;
    }
    AntdModal.confirm({
      title: 'Delete this role?',
      content: 'Users assigned this role keep their role string until you change them under Users.',
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

  const columns: ColumnsType<AppRole> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, r) => (
        <div>
          <div className="font-medium text-black dark:text-white">{text}</div>
          {r.isSystem ? (
            <Tag color="blue" className="mt-1">
              System
            </Tag>
          ) : null}
        </div>
      ),
    },
    {
      title: 'Key',
      dataIndex: 'key',
      key: 'key',
      render: (k: string) => <code className="text-xs text-bodydark2">{k}</code>,
    },
    {
      title: 'Branch',
      key: 'branch',
      render: (_, r) => {
        const bid = branchIdFromRole(r);
        if (!bid) return <span className="text-bodydark2">Global</span>;
        return <span>{branchNameById.get(bid) || bid}</span>;
      },
    },
    {
      title: 'Menu rules',
      key: 'permCount',
      width: 110,
      render: (_, r) => (Array.isArray(r.permissions) ? r.permissions.length : 0),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (d: string) => d || '—',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: isSuperAdmin ? 100 : 64,
      render: (_, r) => (
        <div className="flex items-center gap-3">
          <button
            type="button"
            title="Edit role"
            disabled={!!r.isSystem}
            onClick={() => openEdit(r)}
            className={`inline-flex rounded p-1 transition ${
              r.isSystem
                ? 'cursor-not-allowed opacity-35'
                : 'cursor-pointer text-primary hover:bg-primary/10 dark:hover:bg-primary/15'
            }`}
          >
            <FaRegEdit size={20} aria-hidden />
          </button>
          {isSuperAdmin ? (
            <button
              type="button"
              title="Delete role"
              disabled={!!r.isSystem}
              onClick={() => handleDelete(r)}
              className={`inline-flex rounded p-1 transition ${
                r.isSystem
                  ? 'cursor-not-allowed opacity-35'
                  : 'cursor-pointer text-meta-1 hover:bg-red-50 dark:hover:bg-red-900/20'
              }`}
            >
              <RiDeleteBin5Line size={20} aria-hidden />
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: APP_THEME_PRIMARY,
          borderRadius: 6,
        },
      }}
    >
      <Breadcrumb pageName="Roles (list)" />

      <section className="mb-5 flex flex-col gap-3 rounded-sm border border-stroke bg-white px-4 py-4 shadow-default sm:flex-row sm:items-center sm:justify-between dark:border-strokedark dark:bg-boxdark sm:px-6">
        <div className="max-w-3xl space-y-2 text-sm text-bodydark2">
          <p>
            <span className="font-medium text-bodydark1 dark:text-white">Super Admin</span> sees roles for all branches.
            <span className="font-medium text-bodydark1 dark:text-white"> Branch admins</span> only see{' '}
          
  
          </p>
          
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/admin/roles"
            className="inline-flex justify-center rounded border border-stroke bg-white py-3 px-5 text-center text-sm font-medium text-black shadow-sm transition hover:bg-gray-2 dark:border-strokedark dark:bg-boxdark dark:text-white dark:hover:bg-meta-4"
          >
            Menu permissions
          </Link>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex justify-center rounded bg-primary py-3 px-5 text-center text-sm font-medium text-gray transition hover:opacity-95"
          >
            Add role
          </button>
        </div>
      </section>

      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <Table<AppRole>
          rowKey="_id"
          loading={loading}
          columns={columns}
          dataSource={tableRows}
          pagination={{ pageSize: 15, showSizeChanger: true }}
          scroll={{ x: 900 }}
          className="[&_.ant-table]:bg-transparent dark:[&_.ant-table]:text-bodydark1 [&_.ant-table-thead>tr>th]:bg-gray-2 dark:[&_.ant-table-thead>tr>th]:bg-meta-4 [&_.ant-table-thead>tr>th]:text-black dark:[&_.ant-table-thead>tr>th]:text-white [&_.ant-pagination-item-active>a]:border-primary [&_.ant-pagination-item-active>a]:text-primary"
        />
      </div>

      <AntdModal
        title={<span className="font-medium text-black dark:text-white">Add role</span>}
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        footer={null}
        destroyOnClose
        centered
        width={720}
        classNames={modalClassNames}
      >
        <form onSubmit={submitCreate}>
          <p className="mb-4 rounded-sm border border-stroke bg-gray-2 px-4 py-3 text-xs leading-relaxed text-bodydark2 dark:border-strokedark dark:bg-meta-4">
            New roles start with <span className="font-medium text-bodydark1 dark:text-bodydark">no</span> sidebar
            access. After you create the role, open{' '}
            <Link to="/admin/roles" className="font-medium text-primary hover:underline">
              Menu permissions
            </Link>{' '}
            {isSuperAdmin ? (
              <span>and tick the menus and actions this role should have.</span>
            ) : (
              <span>
                to assign <span className="font-medium text-bodydark1 dark:text-bodydark">Branches</span> sidebar
                access for this branch. Other menus stay with Super Admin.
              </span>
            )}
          </p>
          <div className="mb-4.5 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="w-full">
              <label className={LABEL_CLASS}>
                Name<span className="text-meta-1"> *</span>
              </label>
              <input
                required
                type="text"
                className={INPUT_CLASS}
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Senior pharmacist"
              />
            </div>
            <div className="w-full">
              <label className={LABEL_CLASS}>
                Key name<span className="text-meta-1"> *</span>
              </label>
              <input
                required
                type="text"
                className={`${INPUT_CLASS} font-mono text-sm`}
                value={createForm.key}
                onChange={(e) => setCreateForm((f) => ({ ...f, key: e.target.value }))}
                placeholder="e.g. senior_pharmacist"
              />
              <p className="mt-1.5 text-xs text-bodydark2">
                Lowercase letters, numbers, underscore (<span className="font-mono">_</span>), or hyphen (
                <span className="font-mono">-</span>).
              </p>
            </div>
            <div className="w-full sm:col-span-2">
              <label className={LABEL_CLASS}>Description (optional)</label>
              <input
                type="text"
                className={INPUT_CLASS}
                value={createForm.description}
                onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Short note"
              />
            </div>
            {isSuperAdmin ? (
              <div className="w-full sm:col-span-2">
                <label className={LABEL_CLASS}>
                  Branch<span className="text-meta-1"> *</span>
                </label>
                <select
                  required
                  value={createForm.branchId}
                  onChange={(e) => setCreateForm((f) => ({ ...f, branchId: e.target.value }))}
                  disabled={branchesLoading}
                  className={`${INPUT_CLASS} appearance-none bg-white dark:bg-form-input`}
                >
                  <option value="">{branchesLoading ? 'Loading branches…' : 'Select branch'}</option>
                  {branches.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name || b._id}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
          <div className="mt-4.5 flex flex-col-reverse gap-3 border-t border-stroke pt-4 dark:border-strokedark sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="flex justify-center rounded border border-stroke bg-white py-3 px-6 font-medium text-black transition hover:bg-gray-2 dark:border-strokedark dark:bg-boxdark dark:text-white dark:hover:bg-meta-4"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className={`flex justify-center rounded bg-primary py-3 px-8 font-medium text-gray ${
                creating ? 'cursor-not-allowed opacity-75' : ''
              }`}
            >
              {creating ? (
                <>
                  <svg
                    className="-ml-1 mr-3 h-5 w-5 animate-spin text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Processing…
                </>
              ) : (
                'Create role'
              )}
            </button>
          </div>
        </form>
      </AntdModal>

      <AntdModal
        title={
          <span className="font-medium text-black dark:text-white">
            {editing ? `Edit role — ${editing.name}` : 'Edit role'}
          </span>
        }
        open={editOpen && !!editing}
        onCancel={closeEdit}
        footer={null}
        destroyOnClose
        centered
        width={720}
        classNames={modalClassNames}
      >
        {editing ? (
          <form onSubmit={submitEdit}>
            <p className="mb-4 rounded-sm border border-stroke bg-gray-2 px-4 py-3 text-xs leading-relaxed text-bodydark2 dark:border-strokedark dark:bg-meta-4">
              The <span className="font-mono font-medium text-bodydark1 dark:text-bodydark">key name</span> is fixed
              because it is stored on user records. To change sidebar access, use{' '}
              <Link to="/admin/roles" className="font-medium text-primary hover:underline">
                Menu permissions
              </Link>
              {isSuperAdmin ? '.' : ' (Branches access only on your branch — other menus: Super Admin).'}
            </p>
            <div className="mb-4.5 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="w-full">
                <label className={LABEL_CLASS}>
                  Name<span className="text-meta-1"> *</span>
                </label>
                <input
                  required
                  type="text"
                  className={INPUT_CLASS}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Display name"
                />
              </div>
              <div className="w-full">
                <label className={LABEL_CLASS}>Key name (read-only)</label>
                <input readOnly disabled type="text" className={INPUT_CLASS} value={editing.key} />
              </div>
              <div className="w-full sm:col-span-2">
                <label className={LABEL_CLASS}>Description (optional)</label>
                <textarea
                  className={TEXTAREA_CLASS}
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Optional note"
                />
              </div>
              {isSuperAdmin ? (
                <div className="w-full sm:col-span-2">
                  <label className={LABEL_CLASS}>Branch</label>
                  <select
                    value={form.branchId}
                    onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}
                    disabled={branchesLoading}
                    className={`${INPUT_CLASS} appearance-none bg-white dark:bg-form-input`}
                  >
                    <option value="">Global (all branches)</option>
                    {branches.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.name || b._id}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-xs text-bodydark2">Leave as Global or choose one branch for this role.</p>
                </div>
              ) : null}
            </div>
            <div className="mt-4.5 flex flex-col-reverse gap-3 border-t border-stroke pt-4 dark:border-strokedark sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeEdit}
                disabled={saving}
                className="flex justify-center rounded border border-stroke bg-white py-3 px-6 font-medium text-black transition hover:bg-gray-2 disabled:opacity-60 dark:border-strokedark dark:bg-boxdark dark:text-white dark:hover:bg-meta-4"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className={`flex justify-center rounded bg-primary py-3 px-8 font-medium text-gray ${
                  saving ? 'cursor-not-allowed opacity-75' : ''
                }`}
              >
                {saving ? (
                  <>
                    <svg
                      className="-ml-1 mr-3 h-5 w-5 animate-spin text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Saving…
                  </>
                ) : (
                  'Save changes'
                )}
              </button>
            </div>
          </form>
        ) : null}
      </AntdModal>
    </ConfigProvider>
  );
};

export default RolesManage;
