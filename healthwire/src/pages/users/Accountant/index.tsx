import React, { useEffect, useState } from 'react';
import { Table, message } from 'antd';
import { FaRegEdit } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment';

import { RiDeleteBin5Line } from 'react-icons/ri';
import Swal from 'sweetalert2';

const columns = (handleDelete, handleEdit) => [
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
    render: (text) => moment(text).format('DD/MM/YYYY'),
  },
  {
    title: 'ACTION',
    dataIndex: 'action',
    render: (text, record) => (
      <div className='flex items-center gap-2'>
        <FaRegEdit color='blue' size={20} onClick={() => handleEdit(record)} />
        <RiDeleteBin5Line color='red' size={20} onClick={() => handleDelete(record._id)} />
      </div>
    ),
  },
];

const Accountant = () => {
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const navigate = useNavigate();

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
    axios.get(`https://api.holisticare.pk/apis/user/get?page=${page}&role=accountant`).then((res) => {
      setUsers(res.data.data);
      setTotalPages(res.data.totalPages);
      const accountant = res.data.data.filter(user => user.role === "accountant");
      setUsers(accountant);
      setTotalPages(res.data.totalPages);
    });
  };

  useEffect(() => {
    fetchUsersData(currentPage);
  }, [currentPage]);

  const handleTableChange = (pagination) => {
    setCurrentPage(pagination.current);
  };

  const handleEdit = (record) => {
    navigate(`/accountant/edit_user/${record._id}`);
  };

  

  const handleDelete = (key) => {
    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#4EC3BD",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    }).then((result) => {
      if (result.isConfirmed) {
        axios.delete(`https://api.holisticare.pk/apis/user/delete/${key}`)
          .then((res) => {
            if (res.data.status === 'ok') {
              Swal.fire("Deleted!", "Your file has been deleted.", "success");
              fetchUsersData(currentPage);
            }
          })
          .catch((error) => {
            console.log(error);
          });
      }
    });
  };

  return (
    <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default sm:px-7.5 xl:pb-1">
      <div className="mb-5 flex justify-between items-center">
        <h1 className="text-xl font-semibold text-black">Accountant</h1>
        <Link
          to="/accountant/new_user"
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
          Add User
        </Link>
      </div>
      <Table
        rowSelection={rowSelection}
        columns={columns(handleDelete, handleEdit)}
        dataSource={users}
        pagination={{ current: currentPage, pageSize: 10, total: totalPages * 10 }}
        onChange={handleTableChange}
      />
    </div>
  );
};

export default Accountant;
