import React, { useEffect, useState } from 'react';
import { Table } from 'antd';
import { FaRegEdit } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment';
import { Base_url } from '../../../utils/Base_url';

import { RiDeleteBin5Line } from 'react-icons/ri';
import Swal from 'sweetalert2';
import { canCreateUsers, canDeleteUsers, canEditUsers, getStoredUserForPermissions } from '../../../utils/permissions';
import { useBranchScopeEpoch } from '../../../context/BranchScopeEpochContext';
import { buildAxiosBranchScopedParams } from '../../../utils/branchScope';

const columns = (handleDelete: (id: string) => void, handleEdit: (record: any) => void, canEdit: boolean, canDelete: boolean) =>
  [
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
      render: (text: string) =>
        text && moment(text).isValid() ? moment(text).format('DD/MM/YYYY') : '-',
    },
    (canEdit || canDelete) && {
      title: 'ACTION',
      dataIndex: 'action',
      render: (_: unknown, record: any) => (
        <div className="flex items-center gap-2">
          {canEdit && <FaRegEdit color="blue" size={20} onClick={() => handleEdit(record)} />}
          {canDelete && <RiDeleteBin5Line color="red" size={20} onClick={() => handleDelete(record._id)} />}
        </div>
      ),
    },
  ].filter(Boolean);

const Pharmacist = () => {
  const branchEpoch = useBranchScopeEpoch();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const navigate = useNavigate();
  const userData = getStoredUserForPermissions();
  const allowCreate = canCreateUsers(userData);
  const allowEdit = canEditUsers(userData);
  const allowDelete = canDeleteUsers(userData);

  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
    selections: [Table.SELECTION_ALL, Table.SELECTION_INVERT, Table.SELECTION_NONE],
  };

  const fetchUsersData = (page: number) => {
    axios
      .get(`${Base_url}/apis/user/get`, {
        params: { page, limit: 10, role: 'pharmacist', ...buildAxiosBranchScopedParams() },
      })
      .then((res) => {
        const rows = Array.isArray(res.data?.data) ? res.data.data : [];
        setUsers(rows);
        setTotalCount(Number(res.data?.count) || 0);
      })
      .catch(() => {
        setUsers([]);
        setTotalCount(0);
      });
  };

  useEffect(() => {
    fetchUsersData(currentPage);
  }, [currentPage, branchEpoch]);

  const handleTableChange = (pagination: any) => {
    const next = pagination?.current;
    setCurrentPage(typeof next === 'number' && !Number.isNaN(next) ? next : 1);
  };

  const handleEdit = (record: any) => {
    navigate(`/pharmacist/edit_user/${record._id}`);
  };

  const handleDelete = (key: string) => {
    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#4EC3BD',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!',
    }).then((result) => {
      if (result.isConfirmed) {
        axios
          .delete(`${Base_url}/apis/user/delete/${key}`)
          .then((res) => {
            if (res.data.status === 'ok') {
              Swal.fire('Deleted!', 'User has been deleted.', 'success');
              fetchUsersData(currentPage);
            }
          })
          .catch(() => {});
      }
    });
  };

  return (
    <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
      <div className="mb-5 flex justify-between items-center">
        <h1 className="text-xl font-semibold text-black dark:text-white">Pharmacist</h1>
        {allowCreate && (
          <Link
            to="/pharmacist/new_user"
            className="inline-flex items-center justify-center gap-2.5 rounded-md bg-primary py-3 px-10 text-center font-medium text-white hover:bg-opacity-90 lg:px-8 xl:px-10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="20px" height="20px">
              <g fill="#ffffff" fillRule="nonzero">
                <g transform="scale(5.12,5.12)">
                  <path d="M25,2c-12.6907,0 -23,10.3093 -23,23c0,12.69071 10.3093,23 23,23c12.69071,0 23,-10.30929 23,-23c0,-12.6907 -10.30929,-23 -23,-23zM25,4c11.60982,0 21,9.39018 21,21c0,11.60982 -9.39018,21 -21,21c-11.60982,0 -21,-9.39018 -21,-21c0,-11.60982 9.39018,-21 21,-21zM24,13v11h-11v2h11v11h2v-11h11v-2h-11v-11z"></path>
                </g>
              </g>
            </svg>
            Add User
          </Link>
        )}
      </div>
      <Table
        rowSelection={rowSelection}
        rowKey="_id"
        columns={columns(handleDelete, handleEdit, allowEdit, allowDelete) as any}
        dataSource={users}
        pagination={{ current: currentPage, pageSize: 10, total: totalCount }}
        onChange={handleTableChange}
      />
    </div>
  );
};

export default Pharmacist;
