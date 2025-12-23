import React, { useEffect, useState } from 'react';
import { Table, Button, message } from 'antd';
import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import axios from 'axios';
import { FaRegEdit } from 'react-icons/fa';
import { RiDeleteBin5Line } from 'react-icons/ri';
import Swal from 'sweetalert2';
import { Base_url } from '../../../utils/Base_url';
import AddPharmacyRack from './AddPharmacyRack';

const PharmacyRack = () => {
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [racks, setRacks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editingRack, setEditingRack] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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
        text: 'Select Odd Rows',
        onSelect: (changeableRowKeys) => {
          let newSelectedRowKeys = changeableRowKeys.filter((_, index) => index % 2 !== 0);
          setSelectedRowKeys(newSelectedRowKeys);
        },
      },
      {
        key: 'even',
        text: 'Select Even Rows',
        onSelect: (changeableRowKeys) => {
          let newSelectedRowKeys = changeableRowKeys.filter((_, index) => index % 2 === 0);
          setSelectedRowKeys(newSelectedRowKeys);
        },
      },
    ],
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Items Count',
      dataIndex: 'pharmItemId',
      render: (items) => items?.length || 0,
      sorter: (a, b) => (a.pharmItemId?.length || 0) - (b.pharmItemId?.length || 0),
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      render: (date) => new Date(date).toLocaleDateString(),
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    },
    {
      title: 'Actions',
      dataIndex: 'action',
      fixed: "right",
      width: 100,
      render: (text, record) => (
        <div className='flex items-center gap-4'> 
          <FaRegEdit 
            color='blue' 
            size={18} 
            onClick={() => handleEdit(record)} 
            className="cursor-pointer hover:text-blue-600"
            title="Edit Rack"
          />
          <RiDeleteBin5Line 
            color='red' 
            size={18} 
            onClick={() => handleDelete(record._id)} 
            className="cursor-pointer hover:text-red-600"
            title="Delete Rack"
          />
        </div>
      ),
    },
  ];

  const fetchRacks = async (page, search = '') => {
    try {
      setLoading(true);
      const url = `${Base_url}/apis/pharmRack/get?page=${page}&search=${search}`;
      const res = await axios.get(url);
      
      setRacks(res.data.data);
      setTotalPages(res.data.totalPages);
    } catch (error) {
      message.error('Failed to fetch pharmacy racks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRacks(currentPage, searchTerm);
  }, [currentPage, searchTerm]);

  const handleTableChange = (pagination) => {
    setCurrentPage(pagination.current);
  };

  const handleDelete = (id) => {
    Swal.fire({
      title: "Confirm Deletion",
      text: "Are you sure you want to delete this rack? This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#4EC3BD",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        axios.delete(`${Base_url}/apis/pharmRack/delete/${id}`)
          .then((res) => {
            if (res.data.status === 'ok') {
              Swal.fire({
                title: "Deleted!",
                text: "Rack has been deleted successfully.",
                icon: "success",
                confirmButtonColor: "#4EC3BD",
              });
              fetchRacks(currentPage, searchTerm);
            }
          })
          .catch((error) => {
            Swal.fire({
              title: "Error!",
              text: error.response?.data?.message || "Failed to delete rack. Make sure it's not associated with any items.",
              icon: "error",
              confirmButtonColor: "#4EC3BD",
            });
          });
      }
    });
  };

  const handleEdit = (rack) => {
    setEditingRack(rack);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingRack(null);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingRack(null);
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  return (
    <>
      <Breadcrumb pageName="Pharmacy Racks" />

      <AddPharmacyRack
        isModalOpen={isModalOpen}
        setIsModalOpen={handleModalClose}
        fetchRacks={() => fetchRacks(currentPage, searchTerm)}
        selectedRack={editingRack}
      />

      <div className="mb-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="w-full md:w-1/3">
          <input
            type="text"
            placeholder="Search Racks..."
            value={searchTerm}
            onChange={handleSearch}
            className="w-full rounded border-[1.5px] bg-white border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
          />
        </div>
        
        <button
          onClick={handleAdd}
          className="inline-flex items-center justify-center gap-2.5 rounded-md bg-primary py-3 px-6 text-center font-medium text-white hover:bg-opacity-90 transition-colors duration-200"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="currentColor"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
          </svg>
          Add Rack
        </button>
      </div>
      
      <div className="rounded-lg border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <Table
          rowKey="_id"
          rowSelection={rowSelection}
          columns={columns}
          dataSource={racks}
          pagination={{ 
            current: currentPage, 
            pageSize: 10, 
            total: totalPages * 10,
            showSizeChanger: false,
            showQuickJumper: true,
          }}
          onChange={handleTableChange}
          loading={loading}
          scroll={{ x: true }}
          bordered
          size="middle"
          className="custom-table"
        />
      </div>
    </>
  );
};

export default PharmacyRack;