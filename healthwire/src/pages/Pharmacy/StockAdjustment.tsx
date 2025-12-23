import React, { useEffect, useState } from 'react';
import { Table, Button, Input, Select, DatePicker, Card, Row, Col, Statistic, Tag, Modal, Form, Space, message } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, DownloadOutlined, PrinterOutlined, SwapOutlined } from '@ant-design/icons';
import { Base_url } from '../../utils/Base_url';
import axios from 'axios';
import Swal from 'sweetalert2';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface StockAdjustment {
  _id: string;
  adjustmentDate: string;
  itemName: string;
  itemCode: string;
  currentStock: number;
  adjustedStock: number;
  difference: number;
  adjustmentType: string;
  reason: string;
  reference: string;
  status: string;
  createdBy: {
    name: string;
  };
}

const StockAdjustment: React.FC = () => {
  const [stockAdjustments, setStockAdjustments] = useState<StockAdjustment[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateRange, setDateRange] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchStockAdjustments();
  }, [searchTerm, typeFilter, dateRange]);

  const fetchStockAdjustments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        ...(searchTerm && { search: searchTerm }),
        ...(typeFilter && { type: typeFilter }),
        ...(dateRange.length === 2 && {
          from: dateRange[0].format('YYYY-MM-DD'),
          to: dateRange[1].format('YYYY-MM-DD')
        })
      });

      // Mock data for now - replace with actual API call
      const mockData = [
        {
          _id: '1',
          adjustmentDate: '2024-01-15',
          itemName: 'Paracetamol 500mg',
          itemCode: 'PAR001',
          currentStock: 100,
          adjustedStock: 95,
          difference: -5,
          adjustmentType: 'Physical Count',
          reason: 'Damaged tablets found during inventory',
          reference: 'INV-2024-001',
          status: 'Approved',
          createdBy: { name: 'Admin User' }
        },
        {
          _id: '2',
          adjustmentDate: '2024-01-14',
          itemName: 'Amoxicillin 250mg',
          itemCode: 'AMO001',
          currentStock: 50,
          adjustedStock: 55,
          difference: 5,
          adjustmentType: 'Found Stock',
          reason: 'Additional stock found in back room',
          reference: 'STK-2024-002',
          status: 'Pending',
          createdBy: { name: 'Pharmacy Staff' }
        }
      ];
      setStockAdjustments(mockData);
    } catch (error) {
      console.error('Error fetching stock adjustments:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Adjustment Date',
      dataIndex: 'adjustmentDate',
      key: 'adjustmentDate',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Item Name',
      dataIndex: 'itemName',
      key: 'itemName',
      render: (text: string, record: StockAdjustment) => (
        <div>
          <div className="font-semibold text-gray-800">{text}</div>
          <div className="text-sm text-gray-500">{record.itemCode}</div>
        </div>
      ),
    },
    {
      title: 'Current Stock',
      dataIndex: 'currentStock',
      key: 'currentStock',
      render: (stock: number) => (
        <span className="font-semibold text-blue-600">
          {stock.toLocaleString()}
        </span>
      ),
    },
    {
      title: 'Adjusted Stock',
      dataIndex: 'adjustedStock',
      key: 'adjustedStock',
      render: (stock: number) => (
        <span className="font-semibold text-green-600">
          {stock.toLocaleString()}
        </span>
      ),
    },
    {
      title: 'Difference',
      dataIndex: 'difference',
      key: 'difference',
      render: (difference: number) => (
        <span className={`font-semibold ${difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {difference >= 0 ? '+' : ''}{difference}
        </span>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'adjustmentType',
      key: 'adjustmentType',
      render: (type: string) => {
        const colorMap: { [key: string]: string } = {
          'Physical Count': 'blue',
          'Found Stock': 'green',
          'Damaged Stock': 'red',
          'Expired Stock': 'orange',
          'Theft': 'purple',
        };
        return <Tag color={colorMap[type] || 'default'}>{type}</Tag>;
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colorMap: { [key: string]: string } = {
          'Approved': 'success',
          'Pending': 'processing',
          'Rejected': 'error',
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
      render: (text: any, record: StockAdjustment) => (
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

  const handleView = (record: StockAdjustment) => {
    Swal.fire({
      title: 'Stock Adjustment Details',
      html: `
        <div class="text-left">
          <p><strong>Adjustment Date:</strong> ${new Date(record.adjustmentDate).toLocaleDateString()}</p>
          <p><strong>Item:</strong> ${record.itemName} (${record.itemCode})</p>
          <p><strong>Current Stock:</strong> ${record.currentStock.toLocaleString()}</p>
          <p><strong>Adjusted Stock:</strong> ${record.adjustedStock.toLocaleString()}</p>
          <p><strong>Difference:</strong> ${record.difference >= 0 ? '+' : ''}${record.difference}</p>
          <p><strong>Type:</strong> ${record.adjustmentType}</p>
          <p><strong>Reason:</strong> ${record.reason}</p>
          <p><strong>Reference:</strong> ${record.reference}</p>
          <p><strong>Status:</strong> ${record.status}</p>
        </div>
      `,
      showCloseButton: true,
    });
  };

  const handleEdit = (record: StockAdjustment) => {
    form.setFieldsValue({
      ...record,
      adjustmentDate: new Date(record.adjustmentDate),
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (record: StockAdjustment) => {
    try {
      const result = await Swal.fire({
        title: 'Delete Stock Adjustment?',
        text: `Are you sure you want to delete this stock adjustment record?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, Delete',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#ef4444',
      });

      if (result.isConfirmed) {
        message.success('Stock adjustment record deleted successfully');
        fetchStockAdjustments();
      }
    } catch (error) {
      console.error('Error deleting stock adjustment:', error);
      message.error('Failed to delete stock adjustment record');
    }
  };

  const handleAddStockAdjustment = () => {
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleModalSubmit = async () => {
    try {
      const values = await form.validateFields();
      const data = {
        ...values,
        adjustmentDate: values.adjustmentDate?.format('YYYY-MM-DD'),
        difference: values.adjustedStock - values.currentStock,
        createdBy: 'current-user-id',
      };

      message.success('Stock adjustment saved successfully');
      setIsModalOpen(false);
      fetchStockAdjustments();
    } catch (error) {
      console.error('Error saving stock adjustment:', error);
      message.error('Failed to save stock adjustment');
    }
  };

  const handleExport = () => {
    message.info('Export functionality will be implemented');
  };

  const handlePrint = () => {
    window.print();
  };

  const totalAdjustments = stockAdjustments.length;
  const pendingAdjustments = stockAdjustments.filter(adj => adj.status === 'Pending').length;
  const approvedAdjustments = stockAdjustments.filter(adj => adj.status === 'Approved').length;

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
          <h1 className="text-2xl font-bold text-blue-600">Stock Adjustment</h1>
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
              onClick={handleAddStockAdjustment}
              className="flex items-center bg-blue-600 hover:bg-blue-700"
            >
              + Add Stock Adjustment
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
              placeholder="Search by item name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
            <Select
              placeholder="Select Type"
              value={typeFilter}
              onChange={setTypeFilter}
              className="w-full"
              allowClear
            >
              <Option value="Physical Count">Physical Count</Option>
              <Option value="Found Stock">Found Stock</Option>
              <Option value="Damaged Stock">Damaged Stock</Option>
              <Option value="Expired Stock">Expired Stock</Option>
              <Option value="Theft">Theft</Option>
            </Select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="bg-blue-50 border-blue-200">
            <Statistic
              title="Total Adjustments"
              value={totalAdjustments}
              prefix={<SwapOutlined className="text-blue-500" />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
          <Card className="bg-orange-50 border-orange-200">
            <Statistic
              title="Pending Adjustments"
              value={pendingAdjustments}
              prefix={<SwapOutlined className="text-orange-500" />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
          <Card className="bg-green-50 border-green-200">
            <Statistic
              title="Approved Adjustments"
              value={approvedAdjustments}
              prefix={<SwapOutlined className="text-green-500" />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </div>

        {/* Table */}
        <Card className="shadow-sm">
          <Table
            columns={columns}
            dataSource={stockAdjustments}
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
        {!loading && stockAdjustments.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg mb-4">No stock adjustment records found</div>
            <div className="text-gray-400 text-sm">
              Click "Add Stock Adjustment" to record your first stock adjustment
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
              {form.getFieldValue('_id') ? 'Edit Stock Adjustment' : 'Add Stock Adjustment'}
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
            {form.getFieldValue('_id') ? 'Update the stock adjustment information below.' : 'Fill in the details to record stock adjustment.'}
          </p>
        </div>
        
        <Form form={form} layout="vertical" className="pharmacy-form">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              name="adjustmentDate"
              label={
                <span className="font-semibold text-gray-700">
                  Adjustment Date <span className="text-red-500">*</span>
                </span>
              }
              rules={[{ required: true, message: 'Please select adjustment date' }]}
            >
              <DatePicker 
                className="w-full pharmacy-datepicker" 
                placeholder="Select adjustment date"
                format="DD/MM/YYYY"
              />
            </Form.Item>

            <Form.Item
              name="adjustmentType"
              label={
                <span className="font-semibold text-gray-700">
                  Adjustment Type <span className="text-red-500">*</span>
                </span>
              }
              rules={[{ required: true, message: 'Please select adjustment type' }]}
            >
              <Select placeholder="Select adjustment type" className="pharmacy-select">
                <Option value="Physical Count">Physical Count</Option>
                <Option value="Found Stock">Found Stock</Option>
                <Option value="Damaged Stock">Damaged Stock</Option>
                <Option value="Expired Stock">Expired Stock</Option>
                <Option value="Theft">Theft</Option>
              </Select>
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              name="itemName"
              label={
                <span className="font-semibold text-gray-700">
                  Item Name <span className="text-red-500">*</span>
                </span>
              }
              rules={[{ required: true, message: 'Please enter item name' }]}
            >
              <Input 
                placeholder="Enter item name" 
                className="pharmacy-input"
              />
            </Form.Item>

            <Form.Item
              name="itemCode"
              label={
                <span className="font-semibold text-gray-700">
                  Item Code <span className="text-red-500">*</span>
                </span>
              }
              rules={[{ required: true, message: 'Please enter item code' }]}
            >
              <Input 
                placeholder="Enter item code" 
                className="pharmacy-input"
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              name="currentStock"
              label={
                <span className="font-semibold text-gray-700">
                  Current Stock <span className="text-red-500">*</span>
                </span>
              }
              rules={[{ required: true, message: 'Please enter current stock' }]}
            >
              <Input 
                type="number" 
                placeholder="Enter current stock" 
                className="pharmacy-input"
              />
            </Form.Item>

            <Form.Item
              name="adjustedStock"
              label={
                <span className="font-semibold text-gray-700">
                  Adjusted Stock <span className="text-red-500">*</span>
                </span>
              }
              rules={[{ required: true, message: 'Please enter adjusted stock' }]}
            >
              <Input 
                type="number" 
                placeholder="Enter adjusted stock" 
                className="pharmacy-input"
              />
            </Form.Item>
          </div>

          <Form.Item
            name="reason"
            label={
              <span className="font-semibold text-gray-700">
                Reason <span className="text-red-500">*</span>
              </span>
            }
            rules={[{ required: true, message: 'Please enter reason for adjustment' }]}
          >
            <Input.TextArea 
              rows={3} 
              placeholder="Enter reason for stock adjustment..." 
              className="pharmacy-textarea"
            />
          </Form.Item>

          <Form.Item
            name="reference"
            label={
              <span className="font-semibold text-gray-700">
                Reference
              </span>
            }
          >
            <Input 
              placeholder="Enter reference number or document" 
              className="pharmacy-input"
            />
          </Form.Item>

          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex items-center text-sm text-blue-700">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span>Stock difference will be calculated automatically based on current and adjusted stock.</span>
            </div>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default StockAdjustment;
