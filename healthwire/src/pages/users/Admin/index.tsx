import React, { useEffect, useState } from 'react';
import { Table, message, Modal } from 'antd';
import { FaRegEdit } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment';
import { Base_url } from '../../../utils/Base_url';
import { canCreateUsers, canDeleteUsers, canEditUsers, getStoredUserForPermissions } from '../../../utils/permissions';
import { useBranchScopeEpoch } from '../../../context/BranchScopeEpochContext';
import { buildAxiosBranchScopedParams } from '../../../utils/branchScope';

import { RiDeleteBin5Line } from 'react-icons/ri';

const columns = (handleDelete, handleEdit, canEdit, canDelete) => [
  {
    title: 'NAME',
    dataIndex: 'name',
  },
  {
    title: 'EMAIL',
    dataIndex: 'email',
  },
  {
    title: 'PHONE',
    dataIndex: 'phone',
  },
  {
    title: 'LAST SIGNED IN ON',
    dataIndex: 'updatedAt',
    render: (text) =>
      text && moment(text).isValid() ? moment(text).format('DD/MM/YYYY') : '-',
  },
  (canEdit || canDelete) && {
    title: 'ACTION',
    dataIndex: 'action',
    render: (text, record) => (
      <div className='flex items-center gap-2'>
        {canEdit && <FaRegEdit color='blue' size={20} onClick={() => handleEdit(record)} />}
        {canDelete && <RiDeleteBin5Line color='red' size={20} onClick={() => handleDelete(record._id)} />}
      </div>
    ),
  },
].filter(Boolean);

const Admin = () => {
  const branchEpoch = useBranchScopeEpoch();
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const navigate = useNavigate();
  const userData = getStoredUserForPermissions();
  const allowCreate = canCreateUsers(userData);
  const allowEdit = canEditUsers(userData);
  const allowDelete = canDeleteUsers(userData);

  const onSelectChange = (newSelectedRowKeys) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
    selections: [
      Table.SELECTION_ALL,
      Table.SELECTION_INVERT,
      Table.SELECTION_NONE,
      {
        key: 'odd',
        text: 'Select Odd Row',
        onSelect: (changeableRowKeys) => {
          let newSelectedRowKeys = [];
          newSelectedRowKeys = changeableRowKeys.filter((_, index) => index % 2 !== 0);
          setSelectedRowKeys(newSelectedRowKeys);
        },
      },
      {
        key: 'even',
        text: 'Select Even Row',
        onSelect: (changeableRowKeys) => {
          let newSelectedRowKeys = [];
          newSelectedRowKeys = changeableRowKeys.filter((_, index) => index % 2 === 0);
          setSelectedRowKeys(newSelectedRowKeys);
        },
      },
    ],
  };

  const fetchUsersData = (page) => {
    axios
      .get(`${Base_url}/apis/user/get`, {
        params: { page, role: 'administrator', ...buildAxiosBranchScopedParams() },
      })
      .then((res) => {
        const rows = Array.isArray(res.data?.data) ? res.data.data : [];
        const administrators = rows.filter((user) => user.role === 'administrator');
        setUsers(administrators);
        setTotalPages(res.data?.totalPages ?? 1);
      })
      .catch(() => {
        setUsers([]);
        setTotalPages(1);
      });
  };

  useEffect(() => {
    fetchUsersData(currentPage);
  }, [currentPage, branchEpoch]);

  const handleTableChange = (pagination) => {
    setCurrentPage(pagination.current);
  };

  const handleEdit = (record) => {
    navigate(`/admin/edit_admin/${record._id}`);
  };

  const handleDelete = (key) => {
    Modal.confirm({
      title: 'Delete Confirmation',
      content: 'Are you sure you want to delete this user?',
      okText: 'Yes, Delete',
      cancelText: 'Cancel',
      okButtonProps: { danger: true },
      centered: true,
      onOk: async () => {
        try {
          await axios.delete(`${Base_url}/apis/user/delete/${key}`);
          message.success('User deleted successfully');
          fetchUsersData(currentPage);
        } catch (err) {
          message.error('Failed to delete user');
        }
      },
    });
  };

  return (
    <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default sm:px-7.5 xl:pb-1">
      <div className="mb-5 flex justify-between items-center">
        <h1 className="text-xl font-semibold text-black">Admin</h1>
        {allowCreate && <Link
          to="/admin/new"
          className="inline-flex items-center justify-center gap-2.5 rounded-md bg-primary py-3 px-10 text-center font-medium text-white hover:bg-opacity-90 lg:px-8 xl:px-10"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 256 256"
            width="20px"
            height="20px"
          >
            <g
              fill="#ffffff"
              fillRule="nonzero"
              stroke="none"
              strokeWidth="1"
              strokeLinecap="butt"
              strokeLinejoin="miter"
              strokeMiterlimit="10"
              strokeDasharray=""
              strokeDashoffset="0"
              fontFamily="none"
              fontWeight="none"
              fontSize="none"
              textAnchor="none"
            >
              <g transform="scale(5.12,5.12)">
                <path d="M25,2c-12.6907,0 -23,10.3093 -23,23c0,12.69071 10.3093,23 23,23c12.69071,0 23,-10.30929 23,-23c0,-12.6907 -10.30929,-23 -23,-23zM25,4c11.60982,0 21,9.39018 21,21c0,11.60982 -9.39018,21 -21,21c-11.60982,0 -21,-9.39018 -21,-21c0,-11.60982 9.39018,-21 21,-21zM24,13v11h-11v2h11v11h2v-11h11v-2h-11v-11z"></path>
              </g>
            </g>
          </svg>
          Add Admin
        </Link>}
      </div>
      <Table
        rowSelection={rowSelection}
        columns={columns(handleDelete, handleEdit, allowEdit, allowDelete)}
        dataSource={users}
        pagination={{ current: currentPage, pageSize: 10, total: totalPages * 10 }}
        onChange={handleTableChange}
      />
    </div>
  );
};

export default Admin;
