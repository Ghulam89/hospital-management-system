import React, { useEffect, useState } from 'react';
import { Table, Button, Input, Select, DatePicker, Card, Row, Col, Statistic, Tag, Modal, Form, Space, message } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, DownloadOutlined, PrinterOutlined, FileTextOutlined } from '@ant-design/icons';
import { Base_url } from '../../utils/Base_url';
import axios from 'axios';
import Swal from 'sweetalert2';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface InvoiceReturn {
  _id: string;
  returnDate: string;
  originalInvoiceNumber: string;
  returnInvoiceNumber: string;
  customerName: string;
  customerPhone: string;
  totalItems: number;
  totalAmount: number;
  returnAmount: number;
  returnReason: string;
  status: string;
  refundMethod: string;
  createdBy: {
    name: string;
  };
}

const InvoiceReturn: React.FC = () => {
  const [invoiceReturns, setInvoiceReturns] = useState<InvoiceReturn[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateRange, setDateRange] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchInvoiceReturns();
  }, [searchTerm, statusFilter, dateRange]);

  const fetchInvoiceReturns = async () => {
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
          returnDate: '2024-01-15',
          originalInvoiceNumber: 'INV-2024-001',
          returnInvoiceNumber: 'RET-2024-001',
          customerName: 'John Doe',
          customerPhone: '+92-300-1234567',
          totalItems: 3,
          totalAmount: 1500,
          returnAmount: 500,
          returnReason: 'Customer not satisfied with quality',
          status: 'Processed',
          refundMethod: 'Bank Transfer',
          createdBy: { name: 'Admin User' }
        },
        {
          _id: '2',
          returnDate: '2024-01-14',
          originalInvoiceNumber: 'INV-2024-002',
          returnInvoiceNumber: 'RET-2024-002',
          customerName: 'Jane Smith',
          customerPhone: '+92-301-9876543',
          totalItems: 2,
          totalAmount: 800,
          returnAmount: 200,
          returnReason: 'Wrong medication prescribed',
          status: 'Pending',
          refundMethod: 'Cash',
          createdBy: { name: 'Pharmacy Staff' }
        }
      ];
      setInvoiceReturns(mockData);
    } catch (error) {
      console.error('Error fetching invoice returns:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Return Date',
      dataIndex: 'returnDate',
      key: 'returnDate',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Original Invoice',
      dataIndex: 'originalInvoiceNumber',
      key: 'originalInvoiceNumber',
      render: (text: string) => (
        <span className="font-semibold text-blue-600">{text}</span>
      ),
    },
    {
      title: 'Return Invoice',
      dataIndex: 'returnInvoiceNumber',
      key: 'returnInvoiceNumber',
      render: (text: string) => (
        <span className="font-semibold text-red-600">{text}</span>
      ),
    },
    {
      title: 'Customer',
      key: 'customer',
      render: (text: any, record: InvoiceReturn) => (
        <div>
          <div className="font-semibold text-gray-800">{record.customerName}</div>
          <div className="text-sm text-gray-500">{record.customerPhone}</div>
        </div>
      ),
    },
    {
      title: 'Total Items',
      dataIndex: 'totalItems',
      key: 'totalItems',
      render: (items: number) => (
        <span className="font-semibold text-purple-600">
          {items}
        </span>
      ),
    },
    {
      title: 'Total Amount',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount: number) => (
        <span className="font-semibold text-green-600">
          Rs. {amount.toLocaleString()}
        </span>
      ),
    },
    {
      title: 'Return Amount',
      dataIndex: 'returnAmount',
      key: 'returnAmount',
      render: (amount: number) => (
        <span className="font-semibold text-red-600">
          Rs. {amount.toLocaleString()}
        </span>
      ),
    },
    {
      title: 'Refund Method',
      dataIndex: 'refundMethod',
      key: 'refundMethod',
      render: (method: string) => {
        const colorMap: { [key: string]: string } = {
          'Cash': 'green',
          'Bank Transfer': 'blue',
          'Credit Note': 'orange',
          'Card Refund': 'purple',
        };
        return <Tag color={colorMap[method] || 'default'}>{method}</Tag>;
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colorMap: { [key: string]: string } = {
          'Processed': 'success',
          'Pending': 'processing',
          'Rejected': 'error',
          'Refunded': 'green',
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
      render: (text: any, record: InvoiceReturn) => (
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

  const handleView = (record: InvoiceReturn) => {
    Swal.fire({
      title: 'Invoice Return Details',
      html: `
        <div class="text-left">
          <p><strong>Return Date:</strong> ${new Date(record.returnDate).toLocaleDateString()}</p>
          <p><strong>Original Invoice:</strong> ${record.originalInvoiceNumber}</p>
          <p><strong>Return Invoice:</strong> ${record.returnInvoiceNumber}</p>
          <p><strong>Customer:</strong> ${record.customerName} (${record.customerPhone})</p>
          <p><strong>Total Items:</strong> ${record.totalItems}</p>
          <p><strong>Total Amount:</strong> Rs. ${record.totalAmount.toLocaleString()}</p>
          <p><strong>Return Amount:</strong> Rs. ${record.returnAmount.toLocaleString()}</p>
          <p><strong>Return Reason:</strong> ${record.returnReason}</p>
          <p><strong>Refund Method:</strong> ${record.refundMethod}</p>
          <p><strong>Status:</strong> ${record.status}</p>
        </div>
      `,
      showCloseButton: true,
    });
  };

  const handleEdit = (record: InvoiceReturn) => {
    form.setFieldsValue({
      ...record,
      returnDate: new Date(record.returnDate),
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (record: InvoiceReturn) => {
    try {
      const result = await Swal.fire({
        title: 'Delete Invoice Return?',
        text: `Are you sure you want to delete this invoice return record?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, Delete',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#ef4444',
      });

      if (result.isConfirmed) {
        message.success('Invoice return record deleted successfully');
        fetchInvoiceReturns();
      }
    } catch (error) {
      console.error('Error deleting invoice return:', error);
      message.error('Failed to delete invoice return record');
    }
  };

  const handleAddInvoiceReturn = () => {
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleModalSubmit = async () => {
    try {
      const values = await form.validateFields();
      const data = {
        ...values,
        returnDate: values.returnDate?.format('YYYY-MM-DD'),
        createdBy: 'current-user-id',
      };

      message.success('Invoice return saved successfully');
      setIsModalOpen(false);
      fetchInvoiceReturns();
    } catch (error) {
      console.error('Error saving invoice return:', error);
      message.error('Failed to save invoice return');
    }
  };

  const handleExport = () => {
    message.info('Export functionality will be implemented');
  };

  const handlePrint = () => {
    window.print();
  };

  const totalReturns = invoiceReturns.length;
  const totalReturnAmount = invoiceReturns.reduce((sum, ret) => sum + ret.returnAmount, 0);
  const pendingReturns = invoiceReturns.filter(ret => ret.status === 'Pending').length;

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
          <h1 className="text-2xl font-bold text-blue-600">Invoice Return</h1>
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
              onClick={handleAddInvoiceReturn}
              className="flex items-center bg-blue-600 hover:bg-blue-700"
            >
              + Add Invoice Return
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              placeholder={['From Date', 'To Date']}
              className="w-full"
            />
            <Search
              placeholder="Search by customer or invoice"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
            <Select
              placeholder="Select Status"
              value={statusFilter}
              onChange={setStatusFilter}
              className="w-full"
              allowClear
            >
              <Option value="Processed">Processed</Option>
              <Option value="Pending">Pending</Option>
              <Option value="Rejected">Rejected</Option>
              <Option value="Refunded">Refunded</Option>
            </Select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="bg-blue-50 border-blue-200">
            <Statistic
              title="Total Invoice Returns"
              value={totalReturns}
              prefix={<FileTextOutlined className="text-blue-500" />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
          <Card className="bg-red-50 border-red-200">
            <Statistic
              title="Total Return Amount"
              value={totalReturnAmount}
              prefix="Rs."
              precision={2}
              valueStyle={{ color: '#ef4444' }}
            />
          </Card>
          <Card className="bg-orange-50 border-orange-200">
            <Statistic
              title="Pending Returns"
              value={pendingReturns}
              prefix={<FileTextOutlined className="text-orange-500" />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </div>

        {/* Table */}
        <Card className="shadow-sm">
          <Table
            columns={columns}
            dataSource={invoiceReturns}
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

        {/* No Data Message */}
        {!loading && invoiceReturns.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg mb-4">No invoice return records found</div>
            <div className="text-gray-400 text-sm">
              Click "Add Invoice Return" to record your first invoice return
            </div>
          </div>
        )}

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
              {form.getFieldValue('_id') ? 'Edit Invoice Return' : 'Add Invoice Return'}
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
            {form.getFieldValue('_id') ? 'Update the invoice return information below.' : 'Fill in the details to record invoice return.'}
          </p>
        </div>
        
        <Form form={form} layout="vertical" className="pharmacy-form">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              name="returnDate"
              label={
                <span className="font-semibold text-gray-700">
                  Return Date <span className="text-red-500">*</span>
                </span>
              }
              rules={[{ required: true, message: 'Please select return date' }]}
            >
              <DatePicker 
                className="w-full pharmacy-datepicker" 
                placeholder="Select return date"
                format="DD/MM/YYYY"
              />
            </Form.Item>

            <Form.Item
              name="originalInvoiceNumber"
              label={
                <span className="font-semibold text-gray-700">
                  Original Invoice Number <span className="text-red-500">*</span>
                </span>
              }
              rules={[{ required: true, message: 'Please enter original invoice number' }]}
            >
              <Input 
                placeholder="Enter original invoice number" 
                className="pharmacy-input"
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              name="returnInvoiceNumber"
              label={
                <span className="font-semibold text-gray-700">
                  Return Invoice Number <span className="text-red-500">*</span>
                </span>
              }
              rules={[{ required: true, message: 'Please enter return invoice number' }]}
            >
              <Input 
                placeholder="Enter return invoice number" 
                className="pharmacy-input"
              />
            </Form.Item>

            <Form.Item
              name="customerName"
              label={
                <span className="font-semibold text-gray-700">
                  Customer Name <span className="text-red-500">*</span>
                </span>
              }
              rules={[{ required: true, message: 'Please enter customer name' }]}
            >
              <Input 
                placeholder="Enter customer name" 
                className="pharmacy-input"
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              name="customerPhone"
              label={
                <span className="font-semibold text-gray-700">
                  Customer Phone
                </span>
              }
            >
              <Input 
                placeholder="Enter customer phone" 
                className="pharmacy-input"
              />
            </Form.Item>

            <Form.Item
              name="totalItems"
              label={
                <span className="font-semibold text-gray-700">
                  Total Items <span className="text-red-500">*</span>
                </span>
              }
              rules={[{ required: true, message: 'Please enter total items' }]}
            >
              <Input 
                type="number" 
                placeholder="Enter total items" 
                className="pharmacy-input"
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              name="totalAmount"
              label={
                <span className="font-semibold text-gray-700">
                  Total Amount <span className="text-red-500">*</span>
                </span>
              }
              rules={[{ required: true, message: 'Please enter total amount' }]}
            >
              <Input 
                type="number" 
                placeholder="Enter total amount" 
                className="pharmacy-input"
              />
            </Form.Item>

            <Form.Item
              name="returnAmount"
              label={
                <span className="font-semibold text-gray-700">
                  Return Amount <span className="text-red-500">*</span>
                </span>
              }
              rules={[{ required: true, message: 'Please enter return amount' }]}
            >
              <Input 
                type="number" 
                placeholder="Enter return amount" 
                className="pharmacy-input"
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              name="refundMethod"
              label={
                <span className="font-semibold text-gray-700">
                  Refund Method <span className="text-red-500">*</span>
                </span>
              }
              rules={[{ required: true, message: 'Please select refund method' }]}
            >
              <Select placeholder="Select refund method" className="pharmacy-select">
                <Option value="Cash">Cash</Option>
                <Option value="Bank Transfer">Bank Transfer</Option>
                <Option value="Credit Note">Credit Note</Option>
                <Option value="Card Refund">Card Refund</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="status"
              label={
                <span className="font-semibold text-gray-700">
                  Status <span className="text-red-500">*</span>
                </span>
              }
              rules={[{ required: true, message: 'Please select status' }]}
            >
              <Select placeholder="Select status" className="pharmacy-select">
                <Option value="Pending">Pending</Option>
                <Option value="Processed">Processed</Option>
                <Option value="Rejected">Rejected</Option>
                <Option value="Refunded">Refunded</Option>
              </Select>
            </Form.Item>
          </div>

          <Form.Item
            name="returnReason"
            label={
              <span className="font-semibold text-gray-700">
                Return Reason <span className="text-red-500">*</span>
              </span>
            }
            rules={[{ required: true, message: 'Please enter return reason' }]}
          >
            <Input.TextArea 
              rows={3} 
              placeholder="Enter reason for invoice return..." 
              className="pharmacy-textarea"
            />
          </Form.Item>

          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex items-center text-sm text-blue-700">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span>Make sure to verify the original invoice details before processing the return.</span>
            </div>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default InvoiceReturn;
