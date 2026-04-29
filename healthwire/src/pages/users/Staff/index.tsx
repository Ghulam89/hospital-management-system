import React, { useEffect, useMemo, useState } from 'react';
import { Table, Modal, message } from 'antd';
import { FaRegEdit } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment';
import { RiDeleteBin5Line } from 'react-icons/ri';
import { Base_url } from '../../../utils/Base_url';
import {
  canCreateUsers,
  canDeleteUsers,
  canEditUsers,
  getStoredUserForPermissions,
} from '../../../utils/permissions';

const buildColumns = (showEdit: boolean, showDelete: boolean, onEdit: (r: any) => void, onDelete: (id: string) => void) => {
  const cols: any[] = [
    { title: 'NAME', dataIndex: 'name' },
    { title: 'EMAIL', dataIndex: 'email' },
    { title: 'PHONE', dataIndex: 'phone' },
    {
      title: 'LAST SIGNED IN ON',
      dataIndex: 'updatedAt',
      render: (text: string) => (text ? moment(text).format('DD/MM/YYYY') : '-'),
    },
  ];
  if (showEdit || showDelete) {
    cols.push({
      title: 'ACTION',
      dataIndex: 'action',
      render: (_: unknown, record: any) => (
        <div className="flex items-center gap-2">
          {showEdit && <FaRegEdit color="blue" size={20} onClick={() => onEdit(record)} />}
          {showDelete && <RiDeleteBin5Line color="red" size={20} onClick={() => onDelete(record._id)} />}
        </div>
      ),
    });
  }
  return cols;
};

const Staff = () => {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const navigate = useNavigate();

  const userData = getStoredUserForPermissions();
  const allowCreate = canCreateUsers(userData);
  const allowEdit = canEditUsers(userData);
  const allowDelete = canDeleteUsers(userData);

  const columns = useMemo(
    () => buildColumns(allowEdit, allowDelete, (r) => navigate(`/staff/edit_user/${r._id}`), handleDelete),
    [allowEdit, allowDelete, navigate],
  );

  function fetchUsersData(page: number) {
    axios.get(`${Base_url}/apis/user/get`, { params: { page, role: 'staff', branchId: 'all' } }).then((res) => {
      setUsers(res.data.data || []);
      setTotalCount(res.data.count || 0);
    });
  }

  function handleDelete(id: string) {
    if (!allowDelete) return;
    Modal.confirm({
      title: 'Delete Confirmation',
      content: 'Are you sure you want to delete this staff user?',
      okText: 'Yes, Delete',
      cancelText: 'Cancel',
      okButtonProps: { danger: true },
      centered: true,
      onOk: async () => {
        try {
          await axios.delete(`${Base_url}/apis/user/delete/${id}`);
          message.success('Staff deleted successfully');
          fetchUsersData(currentPage);
        } catch {
          message.error('Failed to delete staff');
        }
      },
    });
  }

  useEffect(() => {
    fetchUsersData(currentPage);
  }, [currentPage]);

  return (
    <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
      <div className="flex pb-5 justify-between items-center">
        <h4 className="text-xl font-semibold text-black dark:text-white">Staff</h4>
        {allowCreate && (
          <Link
            to="/staff/new_user"
            className="inline-flex items-center justify-center gap-2.5 rounded-md bg-primary py-3 px-10 text-center font-medium text-white hover:bg-opacity-90 lg:px-8 xl:px-10"
          >
            Add Staff
          </Link>
        )}
      </div>
      <Table
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        columns={columns}
        dataSource={users}
        rowKey="_id"
        pagination={{ current: currentPage, pageSize: 20, total: totalCount }}
        onChange={(pagination) => setCurrentPage(pagination.current || 1)}
      />
    </div>
  );
};

export default Staff;
