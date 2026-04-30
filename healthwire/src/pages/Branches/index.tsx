import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Table, Tag, Modal as AntdModal } from 'antd';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaRegEdit } from 'react-icons/fa';
import { RiDeleteBin5Line } from 'react-icons/ri';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import { Base_url } from '../../utils/Base_url';
import Modal from '../../components/modal';
import { MdClose } from 'react-icons/md';

type Branch = {
  _id: string;
  name: string;
  code?: string;
  address?: string;
  location?: string;
  phone?: string;
  isActive?: boolean;
  createdAt?: string;
};

const normalizeRole = (role: unknown) =>
  String(role || '')
    .toLowerCase()
    .replace(/\s+/g, '');

const getAuthHeaders = () => {
  const token = localStorage.getItem('userToken') || '';
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const Branches = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);

  const [branchModalMode, setBranchModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [createAdminOpen, setCreateAdminOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [branchSaving, setBranchSaving] = useState(false);
  const [createAdminLoading, setCreateAdminLoading] = useState(false);

  const [branchFormData, setBranchFormData] = useState({
    name: '',
    code: '',
    location: '',
    phone: '',
  });

  const [adminFormData, setAdminFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });

  const userRole = useMemo(() => {
    try {
      const raw = localStorage.getItem('userData');
      const parsed = raw ? JSON.parse(raw) : null;
      return normalizeRole(parsed?.role);
    } catch {
      return '';
    }
  }, []);

  const isSuperAdmin = userRole === 'superadmin';
  const isBranchScopedAdmin =
    userRole === 'administrator' ||
    userRole === 'admin' ||
    userRole === 'branchadmin' ||
    userRole === 'branch_admin';

  const fetchBranches = useCallback(() => {
    setLoading(true);
    axios
      .get(`${Base_url}/apis/branch/get`, { headers: getAuthHeaders() })
      .then((res) => {
        setBranches(res.data?.data || []);
      })
      .catch((error) => {
        const message = error?.response?.data?.message || 'Failed to load branches';
        toast.error(message);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const openCreateAdmin = (branch: Branch) => {
    setSelectedBranch(branch);
    setAdminFormData({ name: '', email: '', phone: '', password: '' });
    setCreateAdminLoading(false);
    setCreateAdminOpen(true);
  };

  const closeBranchModal = () => {
    setBranchModalMode(null);
    setEditingBranchId(null);
    setBranchFormData({ name: '', code: '', location: '', phone: '' });
    setBranchSaving(false);
  };

  const openCreateBranchModal = () => {
    setEditingBranchId(null);
    setBranchFormData({ name: '', code: '', location: '', phone: '' });
    setBranchModalMode('create');
  };

  const openEditBranchModal = (b: Branch) => {
    setEditingBranchId(b._id);
    setBranchFormData({
      name: b.name || '',
      code: b.code || '',
      location: b.location || b.address || '',
      phone: b.phone || '',
    });
    setBranchModalMode('edit');
  };

  const closeCreateAdmin = () => {
    setCreateAdminOpen(false);
    setSelectedBranch(null);
    setAdminFormData({ name: '', email: '', phone: '', password: '' });
    setCreateAdminLoading(false);
  };

  const submitBranchForm = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isSuperAdmin) return;
    if (!branchFormData.name.trim()) {
      toast.error('Branch name is required');
      return;
    }
    const body = {
      name: branchFormData.name.trim(),
      code: branchFormData.code.trim() || undefined,
      location: branchFormData.location.trim() || undefined,
      phone: branchFormData.phone.trim() || undefined,
      /** Deprecate separate address field; keep column/API field empty. */
      address: '',
    };
    try {
      setBranchSaving(true);
      if (branchModalMode === 'create') {
        await axios.post(`${Base_url}/apis/branch/create`, body, { headers: getAuthHeaders() });
        toast.success('Branch created');
      } else if (branchModalMode === 'edit' && editingBranchId) {
        await axios.put(`${Base_url}/apis/branch/update/${editingBranchId}`, body, {
          headers: getAuthHeaders(),
        });
        toast.success('Branch updated');
      }
      closeBranchModal();
      fetchBranches();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to save branch';
      toast.error(msg);
      setBranchSaving(false);
    }
  };

  const handleDeleteBranch = (b: Branch) => {
    if (!isSuperAdmin) return;
    AntdModal.confirm({
      title: 'Delete branch?',
      content: `This will remove "${b.name}" only if no users are assigned to it.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await axios.delete(`${Base_url}/apis/branch/delete/${b._id}`, { headers: getAuthHeaders() });
          toast.success('Branch deleted');
          fetchBranches();
        } catch (err: any) {
          const msg = err?.response?.data?.message || err?.message || 'Failed to delete';
          toast.error(msg);
        }
      },
    });
  };

  const createAdmin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedBranch?._id) return;
    if (!isSuperAdmin) return;
    if (!adminFormData.name.trim()) return toast.error('Name is required');
    if (!adminFormData.email.trim()) return toast.error('Email is required');
    if (!adminFormData.phone.trim()) return toast.error('Phone is required');
    if (!adminFormData.password) return toast.error('Password is required');
    try {
      setCreateAdminLoading(true);
      await axios.post(`${Base_url}/apis/branch/${selectedBranch._id}/create-admin`, adminFormData, {
        headers: getAuthHeaders(),
      });
      toast.success('Admin created');
      closeCreateAdmin();
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to create admin';
      toast.error(message);
      setCreateAdminLoading(false);
    }
  };

  const columns = useMemo(() => {
    const cols: any[] = [
      {
        title: 'Name',
        dataIndex: 'name',
        key: 'name',
      },
      {
        title: 'Code',
        dataIndex: 'code',
        key: 'code',
        render: (value: string) => value || '-',
      },
      {
        title: 'Location',
        dataIndex: 'location',
        key: 'location',
        ellipsis: true,
        render: (_: string, record: Branch) =>
          record.location || record.address || '-',
      },
      {
        title: 'Phone',
        dataIndex: 'phone',
        key: 'phone',
        render: (value: string) => value || '-',
      },
      {
        title: 'Status',
        dataIndex: 'isActive',
        key: 'isActive',
        render: (value: boolean) =>
          value === false ? <Tag color="red">Inactive</Tag> : <Tag color="green">Active</Tag>,
      },
    ];
    if (isSuperAdmin) {
      cols.push({
        title: 'Actions',
        key: 'actions',
        width: 200,
        render: (_: unknown, record: Branch) => (
          <div className="flex flex-wrap gap-2 items-center">
            <Button size="small" onClick={() => openCreateAdmin(record)}>
              Create Admin
            </Button>
            <FaRegEdit
              className="cursor-pointer text-primary shrink-0"
              size={20}
              title="Edit branch"
              role="button"
              onClick={() => openEditBranchModal(record)}
            />
            <RiDeleteBin5Line
              className="cursor-pointer text-red-500 shrink-0"
              size={20}
              title="Delete branch"
              role="button"
              onClick={() => handleDeleteBranch(record)}
            />
          </div>
        ),
      });
    }
    return cols;
  }, [isSuperAdmin]);

  return (
    <>
      <Breadcrumb pageName="Branches" />

      <div className="flex items-center justify-between pb-6 flex-wrap gap-3">
        <div className="text-sm text-bodydark2 max-w-3xl">
          {isSuperAdmin ? (
            <span>Super Admin: add, edit, or delete branches and create branch administrators.</span>
          ) : isBranchScopedAdmin ? (
            <span>
              View-only: details for <strong>your branch</strong> only. You cannot create, edit, or
              delete branches or branch admins — contact Super Admin for changes.
            </span>
          ) : (
            <span>Branch list for your account.</span>
          )}
        </div>
        {isSuperAdmin && (
          <Button
            className="inline-flex items-center justify-center gap-2.5 rounded-md bg-primary  h-12 px-10 text-center font-medium text-white hover:bg-opacity-90 lg:px-8 xl:px-10"
            type="primary"
            onClick={openCreateBranchModal}
          >
            Add Branch
          </Button>
        )}
      </div>

      <Table
        rowKey="_id"
        loading={loading}
        columns={columns as any}
        dataSource={branches}
        pagination={{ pageSize: 20 }}
      />

      {isSuperAdmin && (
      <Modal isOpen={branchModalMode !== null} onClose={closeBranchModal} className="sm:max-w-3xl sm:w-full">
        <div className="p-4 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
            {branchModalMode === 'edit' ? 'Edit Branch' : 'Add Branch'}
          </h1>
          <MdClose
            onClick={closeBranchModal}
            size={24}
            className="cursor-pointer text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          />
        </div>

        <hr className="border-gray dark:border-gray-700" />

        <form onSubmit={submitBranchForm}>
          <div className="p-6 space-y-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-1">
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Branch Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={branchFormData.name}
                onChange={(e) => setBranchFormData((p) => ({ ...p, name: e.target.value }))}
                placeholder="Main Branch"
                className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                required
                disabled={!isSuperAdmin || branchSaving}
              />
            </div>

            <div className="col-span-1">
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Code
              </label>
              <input
                type="text"
                value={branchFormData.code}
                onChange={(e) => setBranchFormData((p) => ({ ...p, code: e.target.value }))}
                placeholder="Optional"
                className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                disabled={!isSuperAdmin || branchSaving}
              />
            </div>

            <div className="col-span-2">
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Location
              </label>
              <input
                type="text"
                value={branchFormData.location}
                onChange={(e) => setBranchFormData((p) => ({ ...p, location: e.target.value }))}
                placeholder="Address, city, area, or landmark"
                className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                disabled={!isSuperAdmin || branchSaving}
              />
            </div>

            <div className="col-span-2">
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Phone
              </label>
              <input
                type="text"
                value={branchFormData.phone}
                onChange={(e) => setBranchFormData((p) => ({ ...p, phone: e.target.value }))}
                placeholder="Optional"
                className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                disabled={!isSuperAdmin || branchSaving}
              />
            </div>

            <div className="col-span-2 pt-2">
              <button
                type="submit"
                className="flex w-full justify-center rounded-lg bg-primary p-3 font-medium text-white hover:bg-opacity-90 transition-colors duration-200 disabled:opacity-50"
                disabled={!isSuperAdmin || branchSaving}
              >
                {branchSaving ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </span>
                ) : branchModalMode === 'edit' ? (
                  'Save Branch'
                ) : (
                  'Add Branch'
                )}
              </button>
            </div>
          </div>
        </form>
      </Modal>
      )}

      {isSuperAdmin && (
      <Modal isOpen={createAdminOpen} onClose={closeCreateAdmin} className="sm:max-w-3xl sm:w-full">
        <div className="p-4 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
            Create Admin{selectedBranch?.name ? ` (${selectedBranch.name})` : ''}
          </h1>
          <MdClose
            onClick={closeCreateAdmin}
            size={24}
            className="cursor-pointer text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          />
        </div>

        <hr className="border-gray dark:border-gray-700" />

        <form onSubmit={createAdmin}>
          <div className="p-6 space-y-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-1">
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={adminFormData.name}
                onChange={(e) => setAdminFormData((p) => ({ ...p, name: e.target.value }))}
                className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                required
                disabled={!isSuperAdmin || createAdminLoading}
              />
            </div>

            <div className="col-span-1">
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={adminFormData.email}
                onChange={(e) => setAdminFormData((p) => ({ ...p, email: e.target.value }))}
                className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                required
                disabled={!isSuperAdmin || createAdminLoading}
              />
            </div>

            <div className="col-span-1">
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={adminFormData.phone}
                onChange={(e) => setAdminFormData((p) => ({ ...p, phone: e.target.value }))}
                className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                required
                disabled={!isSuperAdmin || createAdminLoading}
              />
            </div>

            <div className="col-span-1">
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={adminFormData.password}
                onChange={(e) => setAdminFormData((p) => ({ ...p, password: e.target.value }))}
                className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                required
                disabled={!isSuperAdmin || createAdminLoading}
              />
            </div>

            <div className="col-span-2 pt-2">
              <button
                type="submit"
                className="flex w-full justify-center rounded-lg bg-primary p-3 font-medium text-white hover:bg-opacity-90 transition-colors duration-200 disabled:opacity-50"
                disabled={!isSuperAdmin || createAdminLoading}
              >
                {createAdminLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </span>
                ) : (
                  'Create Admin'
                )}
              </button>
            </div>
          </div>
        </form>
      </Modal>
      )}
    </>
  );
};

export default Branches;
