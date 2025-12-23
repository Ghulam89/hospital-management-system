import React, { useEffect, useState } from 'react';
import { Table, Button, Input, Select, DatePicker, Card, Tag, Modal, Form, Space, message } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, DownloadOutlined, PrinterOutlined } from '@ant-design/icons';
import { Base_url } from '../../utils/Base_url';
import axios from 'axios';
import Swal from 'sweetalert2';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface StoreClosing {
  _id: string;
  closingDate: string;
  openingBalance: number;
  closingBalance: number;
  totalSales: number;
  totalPurchases: number;
  totalReturns: number;
  totalAdjustments: number;
  cashInHand: number;
  bankDeposit: number;
  expenses: number;
  status: string;
  notes: string;
  createdBy: {
    name: string;
  };
}

const StoreClosing: React.FC = () => {
  const [storeClosings, setStoreClosings] = useState<StoreClosing[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateRange, setDateRange] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchStoreClosings();
  }, [searchTerm, statusFilter, dateRange]);

  const fetchStoreClosings = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter && { status: statusFilter }),
        ...(dateRange.length === 2 && {
          from: dateRange[0].format('YYYY-MM-DD'),
          to: dateRange[1].format('YYYY-MM-DD')
        })
      });

      // Mock data for now - replace with actual API call
      const mockData = [
        {
          _id: '1',
          closingDate: '2024-01-15',
          openingBalance: 50000,
          closingBalance: 45000,
          totalSales: 25000,
          totalPurchases: 15000,
          totalReturns: 2000,
          totalAdjustments: 1000,
          cashInHand: 30000,
          bankDeposit: 15000,
          expenses: 5000,
          status: 'Completed',
          notes: 'Daily closing completed successfully',
          createdBy: { name: 'Admin User' }
        }
      ];
      setStoreClosings(mockData);
    } catch (error) {
      console.error('Error fetching store closings:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Closing Date',
      dataIndex: 'closingDate',
      key: 'closingDate',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Opening Balance',
      dataIndex: 'openingBalance',
      key: 'openingBalance',
      render: (amount: number) => (
        <span className="font-semibold text-blue-600">
          Rs. {amount.toLocaleString()}
        </span>
      ),
    },
    {
      title: 'Closing Balance',
      dataIndex: 'closingBalance',
      key: 'closingBalance',
      render: (amount: number) => (
        <span className="font-semibold text-green-600">
          Rs. {amount.toLocaleString()}
        </span>
      ),
    },
    {
      title: 'Total Sales',
      dataIndex: 'totalSales',
      key: 'totalSales',
      render: (amount: number) => (
        <span className="font-semibold text-purple-600">
          Rs. {amount.toLocaleString()}
        </span>
      ),
    },
    {
      title: 'Cash in Hand',
      dataIndex: 'cashInHand',
      key: 'cashInHand',
      render: (amount: number) => (
        <span className="font-semibold text-orange-600">
          Rs. {amount.toLocaleString()}
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colorMap: { [key: string]: string } = {
          'Completed': 'success',
          'Pending': 'processing',
          'In Progress': 'warning',
          'Cancelled': 'error',
        };
        return <Tag color={colorMap[status] || 'default'}>{status}</Tag>;
      },
    },
    {
      title: 'Created By',
      dataIndex: ['createdBy', 'name'],
      key: 'createdBy',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (text: any, record: StoreClosing) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EyeOutlined className="text-blue-500" />}
            onClick={() => handleView(record)}
            title="View"
          />
          <Button
            type="text"
            icon={<EditOutlined className="text-green-500" />}
            onClick={() => handleEdit(record)}
            title="Edit"
          />
          <Button
            type="text"
            icon={<DeleteOutlined className="text-red-500" />}
            onClick={() => handleDelete(record)}
            title="Delete"
          />
        </Space>
      ),
    },
  ];

  const handleView = (record: StoreClosing) => {
    Swal.fire({
      title: 'Store Closing Details',
      html: `
        <div class="text-left">
          <p><strong>Closing Date:</strong> ${new Date(record.closingDate).toLocaleDateString()}</p>
          <p><strong>Opening Balance:</strong> Rs. ${record.openingBalance.toLocaleString()}</p>
          <p><strong>Closing Balance:</strong> Rs. ${record.closingBalance.toLocaleString()}</p>
          <p><strong>Total Sales:</strong> Rs. ${record.totalSales.toLocaleString()}</p>
          <p><strong>Cash in Hand:</strong> Rs. ${record.cashInHand.toLocaleString()}</p>
          <p><strong>Bank Deposit:</strong> Rs. ${record.bankDeposit.toLocaleString()}</p>
          <p><strong>Expenses:</strong> Rs. ${record.expenses.toLocaleString()}</p>
          <p><strong>Status:</strong> ${record.status}</p>
          <p><strong>Notes:</strong> ${record.notes || 'N/A'}</p>
        </div>
      `,
      showCloseButton: true,
    });
  };

  const handleEdit = (record: StoreClosing) => {
    form.setFieldsValue({
      ...record,
      closingDate: new Date(record.closingDate),
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (record: StoreClosing) => {
    try {
      const result = await Swal.fire({
        title: 'Delete Store Closing?',
        text: `Are you sure you want to delete this store closing record?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, Delete',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#ef4444',
      });

      if (result.isConfirmed) {
        message.success('Store closing record deleted successfully');
        fetchStoreClosings();
      }
    } catch (error) {
      console.error('Error deleting store closing:', error);
      message.error('Failed to delete store closing record');
    }
  };

  const handleAddStoreClosing = () => {
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleModalSubmit = async () => {
    try {
      const values = await form.validateFields();
      const data = {
        ...values,
        closingDate: values.closingDate?.format('YYYY-MM-DD'),
        createdBy: 'current-user-id',
      };

      message.success('Store closing saved successfully');
      setIsModalOpen(false);
      fetchStoreClosings();
    } catch (error) {
      console.error('Error saving store closing:', error);
      message.error('Failed to save store closing');
    }
  };

  const handleExport = () => {
    message.info('Export functionality will be implemented');
  };

  const handlePrint = () => {
    window.print();
  };

  const totalSales = storeClosings.reduce((sum, closing) => sum + closing.totalSales, 0);
  const totalCash = storeClosings.reduce((sum, closing) => sum + closing.cashInHand, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Banner */}
      <div className="bg-red-600 text-white py-2 px-4 text-center">
        <p className="text-sm">
          We're sorry, your message quota has been reached and your access to our messages service has been suspended. 
          To reactivate, please contact us at 04232500988, or send a WhatsApp message at 03330425754. Thank you.
        </p>
      </div>

      {/* Navigation Bar */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold mr-2">
                    C
                  </div>
                  <span className="text-xl font-semibold text-gray-900">Cloud</span>
                </div>
              </div>
              <nav className="hidden md:ml-6 md:flex md:space-x-8">
                <a href="#" className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium">Dashboard</a>
                <a href="#" className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium">Health Records</a>
                <a href="#" className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium">Indoor Management</a>
                <a href="#" className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium">Indoor Patients</a>
                <div className="relative">
                  <a href="#" className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium flex items-center">
                    More
                    <svg className="ml-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </a>
                </div>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <Button type="primary" className="bg-blue-600 hover:bg-blue-700">
                Create
                <svg className="ml-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </Button>
              <button className="text-gray-500 hover:text-gray-700">
                <SearchOutlined className="h-5 w-5" />
              </button>
              <div className="relative">
                <button className="text-gray-500 hover:text-gray-700">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                  </svg>
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">429</span>
                </button>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-gray-700">Holistic Care ...</span>
                <div className="ml-2">
                  <span className="text-sm text-gray-500">ID: 10276084</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-blue-600">Store Closing</h1>
          <div className="flex items-center space-x-2">
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExport}
              className="flex items-center"
            >
              Excel
            </Button>
            <Button
              icon={<PrinterOutlined />}
              onClick={handlePrint}
              className="flex items-center"
            >
              Print
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddStoreClosing}
              className="flex items-center bg-blue-600 hover:bg-blue-700"
            >
              + Add Store Closing
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex items-center mb-3">
            <svg className="w-5 h-5 text-primary mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <h4 className="text-sm font-semibold text-gray-700">Filter & Search</h4>
          </div>
          <div className="flex flex-wrap gap-4 items-center">
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              placeholder={['From Date', 'To Date']}
              className="w-80"
            />
            <Search
              placeholder="Search by notes"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-60"
              enterButton={<SearchOutlined />}
            />
            <Select
              placeholder="Select Status"
              value={statusFilter}
              onChange={setStatusFilter}
              className="w-48"
              allowClear
            >
              <Option value="Completed">Completed</Option>
              <Option value="Pending">Pending</Option>
              <Option value="In Progress">In Progress</Option>
              <Option value="Cancelled">Cancelled</Option>
            </Select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Total Store Closings */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600 font-medium mb-1">Total Store Closings</p>
                <p className="text-2xl font-bold text-blue-700">
                  {storeClosings.length.toLocaleString()}
                </p>
              </div>
              <div className="bg-blue-200 p-3 rounded-full">
                <svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Total Sales */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-600 font-medium mb-1">Total Sales</p>
                <p className="text-2xl font-bold text-green-700">
                  Rs. {totalSales.toLocaleString()}
                </p>
              </div>
              <div className="bg-green-200 p-3 rounded-full">
                <svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Total Cash in Hand */}
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-orange-600 font-medium mb-1">Total Cash in Hand</p>
                <p className="text-2xl font-bold text-orange-700">
                  Rs. {totalCash.toLocaleString()}
                </p>
              </div>
              <div className="bg-orange-200 p-3 rounded-full">
                <svg className="w-6 h-6 text-orange-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <Card className="shadow-sm">
          <Table
            columns={columns}
            dataSource={storeClosings}
            rowKey="_id"
            loading={loading}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} of ${total} items`,
            }}
            scroll={{ x: 1200 }}
          />
        </Card>

      

        {/* Floating Action Buttons */}
        <div className="fixed right-6 bottom-6 flex flex-col space-y-4">
          <button className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <button className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg">
            <EditOutlined className="h-6 w-6" />
          </button>
          <button className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        title={
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold mr-3">
              {form.getFieldValue('_id') ? 'E' : 'A'}
            </div>
            <span className="text-lg font-semibold text-gray-800">
              {form.getFieldValue('_id') ? 'Edit Store Closing' : 'Add Store Closing'}
            </span>
          </div>
        }
        open={isModalOpen}
        onOk={handleModalSubmit}
        onCancel={() => setIsModalOpen(false)}
        width={700}
        className="pharmacy-modal"
        okText="Save"
        cancelText="Cancel"
        okButtonProps={{
          className: "bg-blue-600 hover:bg-blue-700 border-blue-600 hover:border-blue-700"
        }}
      >
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <p className="text-sm text-gray-600 mb-0">
            {form.getFieldValue('_id') ? 'Update the store closing information below.' : 'Fill in the details to record store closing.'}
          </p>
        </div>
        
        <Form form={form} layout="vertical" className="pharmacy-form">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              name="closingDate"
              label={
                <span className="font-semibold text-gray-700">
                  Closing Date <span className="text-red-500">*</span>
                </span>
              }
              rules={[{ required: true, message: 'Please select closing date' }]}
            >
              <DatePicker 
                className="w-full pharmacy-datepicker" 
                placeholder="Select closing date"
                format="DD/MM/YYYY"
              />
            </Form.Item>

            <Form.Item
              name="openingBalance"
              label={
                <span className="font-semibold text-gray-700">
                  Opening Balance <span className="text-red-500">*</span>
                </span>
              }
              rules={[{ required: true, message: 'Please enter opening balance' }]}
            >
              <Input 
                type="number" 
                placeholder="Enter opening balance" 
                className="pharmacy-input"
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              name="totalSales"
              label={
                <span className="font-semibold text-gray-700">
                  Total Sales <span className="text-red-500">*</span>
                </span>
              }
              rules={[{ required: true, message: 'Please enter total sales' }]}
            >
              <Input 
                type="number" 
                placeholder="Enter total sales" 
                className="pharmacy-input"
              />
            </Form.Item>

            <Form.Item
              name="cashInHand"
              label={
                <span className="font-semibold text-gray-700">
                  Cash in Hand <span className="text-red-500">*</span>
                </span>
              }
              rules={[{ required: true, message: 'Please enter cash in hand' }]}
            >
              <Input 
                type="number" 
                placeholder="Enter cash in hand" 
                className="pharmacy-input"
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              name="bankDeposit"
              label={
                <span className="font-semibold text-gray-700">
                  Bank Deposit
                </span>
              }
            >
              <Input 
                type="number" 
                placeholder="Enter bank deposit" 
                className="pharmacy-input"
              />
            </Form.Item>

            <Form.Item
              name="expenses"
              label={
                <span className="font-semibold text-gray-700">
                  Expenses
                </span>
              }
            >
              <Input 
                type="number" 
                placeholder="Enter expenses" 
                className="pharmacy-input"
              />
            </Form.Item>
          </div>

          <Form.Item
            name="notes"
            label={
              <span className="font-semibold text-gray-700">
                Notes
              </span>
            }
          >
            <Input.TextArea 
              rows={4} 
              placeholder="Enter any additional notes about this store closing..." 
              className="pharmacy-textarea"
            />
          </Form.Item>

          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex items-center text-sm text-blue-700">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span>Closing balance will be calculated automatically based on opening balance, sales, and expenses.</span>
            </div>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default StoreClosing;
