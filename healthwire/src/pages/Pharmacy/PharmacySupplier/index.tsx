import React, { useEffect, useState } from 'react';
import { Table, Button, message, Input, Space } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, DownloadOutlined, PrinterOutlined } from '@ant-design/icons';
import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Base_url } from '../../../utils/Base_url';
import AddPharmacySupplier from './AddPharmacySupplier';

const { Search } = Input;

const PharmacySupplier = () => {
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalSuppliers, setTotalSuppliers] = useState(0);
  const [totalAmountDue, setTotalAmountDue] = useState(0);

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
      title: 'Supplier',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text, record) => (
        <div>
          <div className="font-semibold text-gray-800">{text}</div>
          <div className="text-sm text-gray-500">{record.phone}</div>
        </div>
      ),
    },
    {
      title: 'NTN',
      dataIndex: 'ntn',
      key: 'ntn',
      render: (text) => text || 'N/A',
    },
    {
      title: 'STN',
      dataIndex: 'stn',
      key: 'stn',
      render: (text) => text || 'N/A',
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: (text) => text || 'N/A',
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
      render: (text) => text || 'N/A',
    },
    {
      title: 'Primary Contact Person',
      dataIndex: 'primaryPersonName',
      key: 'primaryPersonName',
      render: (text, record) => (
        <div>
          <div className="font-medium">{text || 'N/A'}</div>
          <div className="text-sm text-gray-500">{record.primaryPersonPhone || 'N/A'}</div>
        </div>
      ),
    },
    {
      title: 'Opening Balance',
      dataIndex: 'openingBalance',
      key: 'openingBalance',
      render: (text) => (
        <span className="font-semibold text-green-600">
          Rs. {text?.toLocaleString() || '0'}
        </span>
      ),
      sorter: (a, b) => (a.openingBalance || 0) - (b.openingBalance || 0),
    },
    {
      title: 'SLA Date',
      dataIndex: 'slaDate',
      key: 'slaDate',
      render: (text) => text ? new Date(text).toLocaleDateString() : 'N/A',
    },
    {
      title: 'Total Amount',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (text) => (
        <span className="font-semibold text-blue-600">
          Rs. {text?.toLocaleString() || '0'}
        </span>
      ),
    },
    {
      title: 'Amount Due',
      dataIndex: 'amountDue',
      key: 'amountDue',
      render: (text) => (
        <span className="font-semibold text-red-600">
          Rs. {text?.toLocaleString() || '0'}
        </span>
      ),
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
            title="Edit Supplier"
          />
          <Button
            type="text"
            icon={<DeleteOutlined className="text-red-500" />}
            onClick={() => handleDelete(record._id)}
            title="Delete Supplier"
          />
        </Space>
      ),
    },
  ];

  const fetchSuppliers = async (page, search = '') => {
    try {
      setLoading(true);
      const url = `${Base_url}/apis/pharmSupplier/get?page=${page}&search=${search}`;
      const res = await axios.get(url);
      
      setSuppliers(res.data.data || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalSuppliers(res.data.total || 0);
      
      // Calculate total amount due
      const totalDue = res.data.data?.reduce((sum, supplier) => sum + (supplier.amountDue || 0), 0) || 0;
      setTotalAmountDue(totalDue);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      message.error('Failed to fetch suppliers');
    } finally {
      setLoading(false);
    }
  };

  const fetchManufacturers = async () => {
    try {
      const res = await axios.get(`${Base_url}/apis/pharmManufacturer/get`);
      setManufacturers(res.data.data);
    } catch (error) {
      message.error('Failed to fetch manufacturers');
    }
  };

  useEffect(() => {
    fetchSuppliers(currentPage, searchTerm);
    fetchManufacturers();
  }, [currentPage, searchTerm]);

  const handleTableChange = (pagination) => {
    setCurrentPage(pagination.current);
  };

  const handleDelete = (id) => {
    Swal.fire({
      title: "Confirm Deletion",
      text: "Are you sure you want to delete this supplier? This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#4EC3BD",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        axios.delete(`${Base_url}/apis/pharmSupplier/delete/${id}`)
          .then((res) => {
            if (res.data.status === 'ok') {
              Swal.fire({
                title: "Deleted!",
                text: "Supplier has been deleted successfully.",
                icon: "success",
                confirmButtonColor: "#4EC3BD",
              });
              fetchSuppliers(currentPage, searchTerm);
            }
          })
          .catch((error) => {
            Swal.fire({
              title: "Error!",
              text: error.response?.data?.message || "Failed to delete supplier.",
              icon: "error",
              confirmButtonColor: "#4EC3BD",
            });
          });
      }
    });
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingSupplier(null);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingSupplier(null);
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
      <Breadcrumb pageName="Pharmacy Suppliers" />

      <AddPharmacySupplier
        isModalOpen={isModalOpen}
        setIsModalOpen={handleModalClose}
        fetchSuppliers={() => fetchSuppliers(currentPage, searchTerm)}
        selectedSupplier={editingSupplier}
        manufacturers={manufacturers}
      />

      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <h4 className="text-xl font-semibold text-black dark:text-white">
            Pharmacy Suppliers
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
              + Add Supplier
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-4">
          <div className="flex items-center mb-3">
            <svg className="w-5 h-5 text-primary mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <h4 className="text-sm font-semibold text-gray-700">Filter & Search</h4>
          </div>
          <div className="flex flex-wrap gap-4 items-center">
            <Search
              placeholder="Search By Name, Phone or Address.."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onSearch={(value) => handleSearch(value)}
              allowClear
              onClear={() => handleSearch('')}
              className="w-80"
              enterButton={<SearchOutlined />}
            />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Suppliers */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-600 font-medium mb-1">Total Suppliers</p>
                <p className="text-2xl font-bold text-purple-700">
                  {totalSuppliers.toLocaleString()}
                </p>
              </div>
              <div className="bg-purple-200 p-3 rounded-full">
                <svg className="w-6 h-6 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Total Amount Due */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-600 font-medium mb-1">Total Amount Due</p>
                <p className="text-2xl font-bold text-green-700">
                  Rs. {totalAmountDue.toLocaleString()}
                </p>
              </div>
              <div className="bg-green-200 p-3 rounded-full">
                <svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Active Suppliers */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600 font-medium mb-1">Active Suppliers</p>
                <p className="text-2xl font-bold text-blue-700">
                  {suppliers.filter(sup => sup.active).length}
                </p>
              </div>
              <div className="bg-blue-200 p-3 rounded-full">
                <svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="max-w-full overflow-x-auto">
        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={suppliers}
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
              `${range[0]}-${range[1]} of ${total} suppliers`,
          }}
          scroll={{ x: 1500 }}
        />
      </div>

      {/* No Data Message */}
      {!loading && suppliers.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-4">No suppliers available</div>
          <div className="text-gray-400 text-sm">
            Click "Add Supplier" to create your first pharmacy supplier
          </div>
        </div>
      )}
    </div>
  );
};

export default PharmacySupplier;