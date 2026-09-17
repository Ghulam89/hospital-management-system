import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Dropdown, Input, Select, Table, Tag, message, Modal } from 'antd';
import { FaRegEdit } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment';
import { Base_url } from '../../../utils/Base_url';
import { RiDeleteBin5Line } from 'react-icons/ri';
import {
  canCreateUsers,
  canDeleteUsers,
  canEditUsers,
  getStoredUserForPermissions,
} from '../../../utils/permissions';
import {
  getSuperadminSelectedBranchId,
  getUserDataFromStorage,
  isSuperAdminRole,
  setSuperadminSelectedBranchId,
} from '../../../utils/branchScope';
import TableColumnCustomize from '../../../components/TableColumnCustomize';
import { useTableColumnPrefs } from '../../../hooks/useTableColumnPrefs';

type BranchRow = {
  userId: string;
  branchId: string;
  branchName: string;
  updatedAt?: string;
  isActive?: boolean;
};
type DoctorGroupRow = {
  _id: string;
  key: string;
  name: string;
  email: string;
  phone: string;
  PMDC?: string;
  branches: BranchRow[];
  branchCount: number;
  isMultiBranch: boolean;
  manageUserId?: string | null;
  latestUpdatedAt?: string;
  isActive?: boolean;
};

type BranchOption = { _id: string; name: string; code?: string };
type StatusTab = 'all' | 'active' | 'inactive';

const Doctor = () => {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [doctors, setDoctors] = useState<DoctorGroupRow[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [statusTab, setStatusTab] = useState<StatusTab>('active');

  const navigate = useNavigate();
  const userData = getStoredUserForPermissions();
  const allowCreate = canCreateUsers(userData);
  const allowEdit = canEditUsers(userData);
  const allowDelete = canDeleteUsers(userData);
  const storedUser = getUserDataFromStorage();
  const isSuper = isSuperAdminRole(storedUser?.role);
  const actorBranchId = (() => {
    const raw = storedUser?.branchId;
    if (raw && typeof raw === 'object' && raw !== null && '_id' in raw) {
      return String((raw as { _id?: unknown })._id || '').trim();
    }
    return String(raw || '').trim();
  })();

  const manageUserIdFor = (record: DoctorGroupRow) => {
    if (record.manageUserId) return record.manageUserId;
    if (!isSuper && actorBranchId) {
      const local = record.branches.find((b) => String(b.branchId) === actorBranchId);
      if (local?.userId) return local.userId;
    }
    return record.branches[0]?.userId || '';
  };

  useEffect(() => {
    if (!isSuper) return;
    const token = localStorage.getItem('userToken') || '';
    axios
      .get(`${Base_url}/apis/branch/get`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        params: { limit: 500, page: 1 },
      })
      .then((res) => setBranches(Array.isArray(res.data?.data) ? res.data.data : []))
      .catch(() => setBranches([]));
    const saved = getSuperadminSelectedBranchId();
    if (saved) setBranchFilter(saved);
  }, [isSuper]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setCurrentPage(1);
    }, 400);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const fetchDoctors = useCallback(
    (page: number) => {
      setLoading(true);
      const params: Record<string, string | number> = {
        page,
        limit: pageSize,
        isActive: statusTab === 'all' ? 'all' : statusTab === 'inactive' ? 'false' : 'true',
      };
      if (search) params.search = search;
      if (isSuper) {
        if (branchFilter) params.branchId = branchFilter;
        else params.allBranches = 1;
      }

      axios
        .get(`${Base_url}/apis/user/doctors-grouped`, { params })
        .then((res) => {
          const rows = Array.isArray(res.data?.data) ? res.data.data : [];
          setDoctors(rows);
          setTotalCount(res.data?.count ?? 0);
        })
        .catch(() => {
          setDoctors([]);
          setTotalCount(0);
        })
        .finally(() => setLoading(false));
    },
    [search, branchFilter, isSuper, pageSize, statusTab],
  );

  useEffect(() => {
    fetchDoctors(currentPage);
  }, [currentPage, fetchDoctors]);

  const handleDelete = (userId: string) => {
    Modal.confirm({
      title: 'Delete Confirmation',
      content: 'Are you sure you want to delete this doctor account?',
      okText: 'Yes, Delete',
      cancelText: 'Cancel',
      okButtonProps: { danger: true },
      centered: true,
      onOk: async () => {
        try {
          await axios.delete(`${Base_url}/apis/user/delete/${userId}`);
          message.success('Doctor deleted successfully');
          fetchDoctors(currentPage);
        } catch {
          message.error('Failed to delete doctor');
        }
      },
    });
  };

  const handleToggleActive = async (record: DoctorGroupRow) => {
    if (!allowEdit) {
      message.warning('You do not have permission to change doctor status.');
      return;
    }
    const uid = manageUserIdFor(record);
    if (!uid) {
      message.error('Doctor record not found');
      return;
    }
    const nextActive = record.isActive === false;
    try {
      await axios.put(`${Base_url}/apis/user/update/${uid}`, { isActive: nextActive });
      message.success(`Doctor ${nextActive ? 'activated' : 'deactivated'} successfully`);
      fetchDoctors(currentPage);
    } catch {
      message.error('Failed to update doctor status');
    }
  };

  const renderEditAction = (record: DoctorGroupRow) => {
    if (!allowEdit) return null;
    const uid = manageUserIdFor(record);
    if (!uid) return null;
    return (
      <Link to={`/doctor/update/${uid}`}>
        <FaRegEdit color="blue" size={20} />
      </Link>
    );
  };

  const renderDeleteAction = (record: DoctorGroupRow) => {
    if (!allowDelete) return null;
    if (!isSuper) {
      const uid = manageUserIdFor(record);
      if (!uid) return null;
      return (
        <RiDeleteBin5Line
          color="red"
          size={20}
          className="cursor-pointer"
          onClick={() => handleDelete(uid)}
        />
      );
    }
    if (record.branches.length === 1) {
      return (
        <RiDeleteBin5Line
          color="red"
          size={20}
          className="cursor-pointer"
          onClick={() => handleDelete(record.branches[0].userId)}
        />
      );
    }
    return (
      <Dropdown
        menu={{
          items: record.branches.map((b) => ({
            key: b.userId,
            label: `Delete — ${b.branchName}`,
            danger: true,
            onClick: () => handleDelete(b.userId),
          })),
        }}
        trigger={['click']}
      >
        <RiDeleteBin5Line color="red" size={20} className="cursor-pointer" />
      </Dropdown>
    );
  };

  const columns = useMemo(
    () =>
      [
        {
          title: 'SR NO.',
          width: 72,
          render: (_: unknown, __: DoctorGroupRow, index: number) =>
            (currentPage - 1) * pageSize + index + 1,
        },
        { title: 'NAME', dataIndex: 'name', width: 160 },
        { title: 'EMAIL', dataIndex: 'email', width: 200 },
        { title: 'PHONE', dataIndex: 'phone', width: 130 },
        {
          title: 'BRANCHES',
          dataIndex: 'branches',
          width: 220,
          render: (branches: BranchRow[], record: DoctorGroupRow) => (
            <div className="flex flex-wrap gap-1">
              {(branches || []).map((b) => (
                <Tag
                  key={b.userId}
                  color={record.isMultiBranch ? 'blue' : 'default'}
                  className="m-0"
                >
                  {b.branchName}
                </Tag>
              ))}
            </div>
          ),
        },
        {
          title: 'PMDC',
          dataIndex: 'PMDC',
          width: 110,
          render: (v: string) => v || '—',
        },
        {
          title: 'STATUS',
          dataIndex: 'isActive',
          width: 100,
          render: (v: boolean | undefined) => (
            <span
              className={`px-2 py-1 rounded-full text-xs ${
                v !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}
            >
              {v !== false ? 'Active' : 'Inactive'}
            </span>
          ),
        },
        {
          title: 'LAST UPDATED',
          dataIndex: 'latestUpdatedAt',
          width: 120,
          render: (text: string) =>
            text && moment(text).isValid() ? moment(text).format('DD/MM/YYYY') : '—',
        },
        (allowEdit || allowDelete) && {
          title: 'ACTION',
          width: 200,
          render: (_: unknown, record: DoctorGroupRow) => (
            <div className="flex items-center gap-2">
              {allowEdit ? (
                <button
                  type="button"
                  onClick={() => handleToggleActive(record)}
                  title={record.isActive === false ? 'Activate' : 'Deactivate'}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    record.isActive === false
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-red-100 text-red-700 hover:bg-red-200'
                  }`}
                >
                  {record.isActive === false ? 'Activate' : 'Deactivate'}
                </button>
              ) : null}
              {renderEditAction(record)}
              {renderDeleteAction(record)}
            </div>
          ),
        },
      ].filter(Boolean),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allowEdit, allowDelete, currentPage, pageSize, isSuper, actorBranchId, navigate, statusTab],
  );

  const {
    visibleColumns,
    columnOptions,
    setColumnVisible,
    setAllVisible,
    resetColumns,
  } = useTableColumnPrefs('doctors.list', columns as any, {
    lockedKeys: ['ACTION', 'action'],
  });

  return (
    <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default sm:px-7.5 xl:pb-1">
      <div className="mb-5 flex flex-wrap justify-between items-center gap-3">
        <h1 className="text-xl font-semibold text-black">Doctor</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <TableColumnCustomize
            options={columnOptions}
            onToggle={setColumnVisible}
            onShowAll={() => setAllVisible(true)}
            onHideAll={() => setAllVisible(false)}
            onReset={resetColumns}
          />
          {allowCreate && (
            <Link
              to="/doctor/new"
              className="inline-flex items-center justify-center gap-2.5 rounded-md bg-primary py-3 px-10 text-center font-medium text-white hover:bg-opacity-90 lg:px-8 xl:px-10"
            >
              Add Doctor
            </Link>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <div className="flex p-1 bg-white rounded-lg shadow-sm overflow-hidden border border-stroke">
          {(['all', 'active', 'inactive'] as StatusTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setStatusTab(tab);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 text-sm font-medium transition-colors capitalize ${
                statusTab === tab
                  ? 'bg-primary text-white rounded-lg'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <Input.Search
          allowClear
          placeholder="Search name, email, phone, PMDC"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onSearch={(v) => {
            setSearchInput(v);
            setSearch(v.trim());
            setCurrentPage(1);
          }}
          style={{ width: 280, maxWidth: '100%' }}
        />
        {isSuper && (
          <Select
            allowClear
            showSearch
            placeholder="All branches"
            optionFilterProp="label"
            value={branchFilter || undefined}
            onChange={(v) => {
              const next = v || '';
              setBranchFilter(next);
              setSuperadminSelectedBranchId(next || null);
              setCurrentPage(1);
            }}
            style={{ minWidth: 220 }}
            options={branches.map((b) => ({
              value: b._id,
              label: b.name || b.code || b._id,
            }))}
          />
        )}
      </div>

      <Table
        rowKey="_id"
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        columns={visibleColumns}
        dataSource={doctors}
        loading={loading}
        pagination={{
          current: currentPage,
          pageSize,
          total: totalCount,
          showSizeChanger: false,
          onChange: (page) => setCurrentPage(page),
        }}
        scroll={{ x: 1200 }}
      />
    </div>
  );
};

export default Doctor;
