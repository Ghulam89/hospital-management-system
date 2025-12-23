import React, { useEffect, useState } from 'react';
import { Table, Button, message, Card, Input, Space, Tag, Statistic, Row, Col } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, DownloadOutlined, PrinterOutlined } from '@ant-design/icons';
import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import axios from 'axios';
import Swal from 'sweetalert2';
import AddPharmacyCategories from './AddPharmacyCategories';
import { Base_url } from '../../../utils/Base_url';

const { Search } = Input;

const PharmacyCategories = () => {
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editingCategory, setEditingCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalCategories, setTotalCategories] = useState(0);

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
      title: 'Category Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text) => (
        <span className="font-semibold text-gray-800">{text}</span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'active',
      key: 'active',
      render: (active) => (
        <Tag color={active ? 'green' : 'red'}>
          {active ? 'Active' : 'Inactive'}
        </Tag>
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
            title="Edit Category"
          />
          <Button
            type="text"
            icon={<DeleteOutlined className="text-red-500" />}
            onClick={() => handleDelete(record._id)}
            title="Delete Category"
          />
        </Space>
      ),
    },
  ];

  const fetchExpenseCategories = async (page, search = '') => {
    try {
      setLoading(true);
      const url = `${Base_url}/apis/pharmCategory/get?page=${page}&search=${search}`;
      const res = await axios.get(url);
      
      setExpenseCategories(res.data.data || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalCategories(res.data.total || 0);
    } catch (error) {
      console.error('Error fetching categories:', error);
      message.error('Failed to fetch pharmacy categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenseCategories(currentPage, searchTerm);
  }, [currentPage, searchTerm]);

  const handleTableChange = (pagination) => {
    setCurrentPage(pagination.current);
  };

  const handleDelete = (id) => {
    Swal.fire({
      title: "Confirm Deletion",
      text: "Are you sure you want to delete this category? This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#4EC3BD",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        axios.delete(`${Base_url}/apis/pharmCategory/delete/${id}`)
          .then((res) => {
            if (res.data.status === 'ok') {
              Swal.fire({
                title: "Deleted!",
                text: "Category has been deleted successfully.",
                icon: "success",
                confirmButtonColor: "#4EC3BD",
              });
              fetchExpenseCategories(currentPage, searchTerm);
            }
          })
          .catch((error) => {
            Swal.fire({
              title: "Error!",
              text: error.response?.data?.message || "Failed to delete category.",
              icon: "error",
              confirmButtonColor: "#4EC3BD",
            });
          });
      }
    });
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingCategory(null);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
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
      <Breadcrumb pageName="Pharmacy Categories" />

      <AddPharmacyCategories
        isModalOpen={isModalOpen}
        setIsModalOpen={handleModalClose}
        fetchExpenseCategories={() => fetchExpenseCategories(currentPage, searchTerm)}
        selectedCategory={editingCategory}
      />

      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <h4 className="text-xl font-semibold text-black dark:text-white">
            Pharmacy Categories
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
              + Add Category
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <Search
            placeholder="Search by Pharmacy Category Name..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-80"
            enterButton={<SearchOutlined />}
          />
        </div>

        {/* Summary Card */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
          <Row gutter={16}>
            <Col span={8}>
              <Statistic
                title="Total Categories"
                value={totalCategories}
                prefix={<div className="bg-blue-100 p-2 rounded-lg inline-block mr-2">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>}
                valueStyle={{ color: '#1e40af', fontSize: '24px', fontWeight: 'bold' }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="Active Categories"
                value={expenseCategories.filter(cat => cat.active).length}
                prefix={<div className="bg-green-100 p-2 rounded-lg inline-block mr-2">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>}
                valueStyle={{ color: '#16a34a', fontSize: '24px', fontWeight: 'bold' }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="Inactive Categories"
                value={expenseCategories.filter(cat => !cat.active).length}
                prefix={<div className="bg-red-100 p-2 rounded-lg inline-block mr-2">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>}
                valueStyle={{ color: '#dc2626', fontSize: '24px', fontWeight: 'bold' }}
              />
            </Col>
          </Row>
        </Card>
      </div>

      {/* Table */}
      <div className="max-w-full overflow-x-auto">
        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={expenseCategories}
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
              `${range[0]}-${range[1]} of ${total} categories`,
          }}
          scroll={{ x: 800 }}
        />
      </div>

      {/* No Data Message */}
      {!loading && expenseCategories.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-4">No categories available</div>
          <div className="text-gray-400 text-sm">
            Click "Add Category" to create your first pharmacy category
          </div>
        </div>
      )}
    </div>
  );
};

export default PharmacyCategories;