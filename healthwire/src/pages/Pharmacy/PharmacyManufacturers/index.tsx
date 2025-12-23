import React, { useEffect, useState } from 'react';
import { Table, Button, message, Card, Input, Space, Tag, Statistic, Row, Col } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, DownloadOutlined, PrinterOutlined } from '@ant-design/icons';
import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Base_url } from '../../../utils/Base_url';
import AddPharmacyManufacturers from './AddPharmacyManufacturers';

const { Search } = Input;

const PharmacyManufacturers = () => {
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editingManufacturer, setEditingManufacturer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalManufacturers, setTotalManufacturers] = useState(0);

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
      title: 'Manufacturer Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text) => (
        <span className="font-semibold text-gray-800">{text}</span>
      ),
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text) => new Date(text).toLocaleDateString(),
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined className="text-blue-500" />}
            onClick={() => handleEdit(record)}
            title="Edit Manufacturer"
          />
          <Button
            type="text"
            icon={<DeleteOutlined className="text-red-500" />}
            onClick={() => handleDelete(record._id)}
            title="Delete Manufacturer"
          />
        </Space>
      ),
    },
  ];

  const fetchManufacturers = async (page, search = '') => {
    try {
      setLoading(true);
      const url = `${Base_url}/apis/pharmManufacturer/get?page=${page}&search=${search}`;
      const res = await axios.get(url);
      
      setManufacturers(res.data.data || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalManufacturers(res.data.count || 0);
    } catch (error) {
      console.error('Error fetching manufacturers:', error);
      message.error('Failed to fetch pharmacy manufacturers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManufacturers(currentPage, searchTerm);
  }, [currentPage, searchTerm]);

  const handleDelete = (id) => {
    Swal.fire({
      title: "Confirm Deletion",
      text: "Are you sure you want to delete this manufacturer? This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#4EC3BD",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        axios.delete(`${Base_url}/apis/pharmManufacturer/delete/${id}`)
          .then((res) => {
            if (res.data.status === 'ok') {
              Swal.fire({
                title: "Deleted!",
                text: "Manufacturer has been deleted successfully.",
                icon: "success",
                confirmButtonColor: "#4EC3BD",
              });
              fetchManufacturers(currentPage, searchTerm);
            }
          })
          .catch((error) => {
            Swal.fire({
              title: "Error!",
              text: error.response?.data?.message || "Failed to delete manufacturer.",
              icon: "error",
              confirmButtonColor: "#4EC3BD",
            });
          });
      }
    });
  };

  const handleEdit = (manufacturer) => {
    setEditingManufacturer(manufacturer);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingManufacturer(null);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingManufacturer(null);
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleExcelExport = () => {
    message.info('Excel export functionality will be implemented');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
      <Breadcrumb pageName="Pharmacy Manufacturers" />

      <AddPharmacyManufacturers
        isModalOpen={isModalOpen}
        setIsModalOpen={handleModalClose}
        fetchExpenseCategories={() => fetchManufacturers(currentPage, searchTerm)}
        selectedCategory={editingManufacturer}
      />

      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <h4 className="text-xl font-semibold text-black dark:text-white">
            Pharmacy Manufacturers
          </h4>
          <div className="flex items-center gap-2">
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExcelExport}
              className="flex items-center gap-2"
            >
              Excel
            </Button>
            <Button
              icon={<PrinterOutlined />}
              onClick={handlePrint}
              className="flex items-center gap-2"
            >
              Print
            </Button>
            <Button
              type="default"
              icon={<PlusOutlined />}
              onClick={handleAdd}
              className="flex items-center gap-2"
            >
              + Add Manufacturer
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <Search
            placeholder="Search by Manufacturer Name..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-80"
            enterButton={<SearchOutlined />}
          />
        </div>

       
      </div>

      {/* Table */}
      <div className="max-w-full overflow-x-auto">
        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={manufacturers}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: currentPage,
            total: totalPages * 10,
            pageSize: 10,
            onChange: setCurrentPage,
            showSizeChanger: false,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} manufacturers`,
          }}
          scroll={{ x: 1000 }}
        />
      </div>

      {/* No Data Message */}
      {!loading && manufacturers.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-4">No manufacturers available</div>
          <div className="text-gray-400 text-sm">
            Click "Add Manufacturer" to create your first pharmacy manufacturer
          </div>
        </div>
      )}
    </div>
  );
};

export default PharmacyManufacturers;