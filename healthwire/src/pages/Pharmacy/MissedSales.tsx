import React, { useEffect, useState } from 'react';
import { Table, Button, Input, Select, DatePicker, Card, Tag, Modal, Form, Space } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, DownloadOutlined, PrinterOutlined } from '@ant-design/icons';
import { Base_url } from '../../utils/Base_url';
import axios from 'axios';
import Swal from 'sweetalert2';
import { type Dayjs } from 'dayjs';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface MissedSale {
  _id: string;
  pharmItemId: {
    _id: string;
    name: string;
    unitCost: number;
    retailPrice: number;
  };
  quantity: number;
  reason: string;
  missedDate: string;
  estimatedLoss: number;
  status: string;
  notes: string;
  createdBy: {
    name: string;
  };
}

const MissedSales: React.FC = () => {
  const [missedSales, setMissedSales] = useState<MissedSale[]>([]);
  const [pharmItems, setPharmItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchByName, setSearchByName] = useState('');
  const [searchByReason, setSearchByReason] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [totalLoss, setTotalLoss] = useState(0);

  useEffect(() => {
    fetchMissedSales();
    fetchPharmItems();
  }, [searchByName, searchByReason, statusFilter, dateRange]);

  const fetchMissedSales = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        ...(searchByName && { searchByName: searchByName }),
        ...(searchByReason && { searchByReason: searchByReason }),
        ...(statusFilter && { status: statusFilter }),
        ...(dateRange[0] && dateRange[1] && {
          from: dateRange[0].format('YYYY-MM-DD'),
          to: dateRange[1].format('YYYY-MM-DD')
        })
      });

      const response = await axios.get(`${Base_url}/apis/pharmMissedSale/get?${params}`);
      setMissedSales(response.data.data || []);
      
      const loss = response.data.data?.reduce((sum: number, sale: MissedSale) => sum + sale.estimatedLoss, 0) || 0;
      setTotalLoss(loss);
    } catch (error) {
      console.error('Error fetching missed sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPharmItems = async () => {
    try {
      const response = await axios.get(`${Base_url}/apis/pharmItem/get`);
      setPharmItems(response.data.data || []);
    } catch (error) {
      console.error('Error fetching pharmacy items:', error);
    }
  };

  const columns = [
    {
      title: 'Item Name',
      dataIndex: ['pharmItemId', 'name'],
      key: 'itemName',
      render: (text: string, record: MissedSale) => (
        <div>
          <div className="font-medium text-gray-800">{text}</div>
          <div className="text-sm text-gray-500">ID: {record.pharmItemId?._id?.slice(-6)}</div>
        </div>
      ),
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (quantity: number) => (
        <Tag color="orange" className="font-semibold">
          {quantity}
        </Tag>
      ),
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      render: (reason: string) => (
        <span className="text-gray-700">{reason}</span>
      ),
    },
    {
      title: 'Estimated Loss',
      dataIndex: 'estimatedLoss',
      key: 'estimatedLoss',
      render: (loss: number) => (
        <span className="font-semibold text-red-600">
          Rs. {loss.toLocaleString()}
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colorMap: { [key: string]: string } = {
          'Pending': 'processing',
          'Investigated': 'success',
          'Resolved': 'success',
          'Cancelled': 'error',
        };
        return <Tag color={colorMap[status] || 'default'}>{status}</Tag>;
      },
    },
    {
      title: 'Missed Date',
      dataIndex: 'missedDate',
      key: 'missedDate',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Created By',
      dataIndex: ['createdBy', 'name'],
      key: 'createdBy',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: MissedSale) => (
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

  const handleView = (record: MissedSale) => {
    Swal.fire({
      title: 'Missed Sale Details',
      html: `
        <div class="text-left">
          <p><strong>Item:</strong> ${record.pharmItemId?.name}</p>
          <p><strong>Quantity:</strong> ${record.quantity}</p>
          <p><strong>Reason:</strong> ${record.reason}</p>
          <p><strong>Estimated Loss:</strong> Rs. ${record.estimatedLoss.toLocaleString()}</p>
          <p><strong>Status:</strong> ${record.status}</p>
          <p><strong>Notes:</strong> ${record.notes || 'N/A'}</p>
          <p><strong>Date:</strong> ${new Date(record.missedDate).toLocaleDateString()}</p>
        </div>
      `,
      showCloseButton: true,
    });
  };

  const handleEdit = (record: MissedSale) => {
    form.setFieldsValue({
      _id: record._id,
      pharmItemId: record.pharmItemId?._id,
      quantity: record.quantity,
      reason: record.reason,
      missedDate: record.missedDate ? new Date(record.missedDate) : new Date(),
      status: record.status || 'Pending',
      notes: record.notes,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (record: MissedSale) => {
    try {
      const result = await Swal.fire({
        title: 'Delete Missed Sale?',
        text: `Are you sure you want to delete this missed sale record?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, Delete',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#ef4444',
      });

      if (result.isConfirmed) {
        await axios.delete(`${Base_url}/apis/pharmMissedSale/delete/${record._id}`);
        Swal.fire('Deleted!', 'Missed sale record has been deleted.', 'success');
        fetchMissedSales();
      }
    } catch (error) {
      console.error('Error deleting missed sale:', error);
      Swal.fire('Error!', 'Failed to delete missed sale record.', 'error');
    }
  };

  const handleAddMissedSale = () => {
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleModalSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      // Get current user from localStorage
      const storedData = localStorage.getItem('userData');
      let userData = null;
      try {
        userData = storedData ? JSON.parse(storedData) : null;
      } catch (error) {
        console.error('Error parsing user data:', error);
      }

      if (!userData || !userData._id) {
        Swal.fire('Error!', 'User information not found. Please log in again.', 'error');
        return;
      }

      // Get the selected item to calculate estimated loss
      const selectedItem = pharmItems.find(item => item._id === values.pharmItemId);
      if (!selectedItem) {
        Swal.fire('Error!', 'Selected item not found.', 'error');
        return;
      }

      // Calculate estimated loss
      const estimatedLoss = Number(values.quantity) * (selectedItem.retailPrice || selectedItem.unitCost || 0);

      const data = {
        pharmItemId: values.pharmItemId,
        quantity: Number(values.quantity),
        reason: values.reason,
        missedDate: values.missedDate?.format('YYYY-MM-DD') || new Date().toISOString().split('T')[0],
        status: values.status || 'Pending',
        notes: values.notes,
        createdBy: userData._id,
        estimatedLoss: estimatedLoss,
      };

      console.log('Submitting missed sale data:', data);

      if (form.getFieldValue('_id')) {
        await axios.put(`${Base_url}/apis/pharmMissedSale/update/${form.getFieldValue('_id')}`, data);
        Swal.fire('Updated!', 'Missed sale has been updated.', 'success');
      } else {
        await axios.post(`${Base_url}/apis/pharmMissedSale/create`, data);
        Swal.fire('Created!', 'Missed sale has been created.', 'success');
      }

      setIsModalOpen(false);
      fetchMissedSales();
    } catch (error: any) {
      console.error('Error saving missed sale:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to save missed sale';
      Swal.fire('Error!', errorMessage, 'error');
    }
  };

  const handleExport = () => {
    console.log('Export to Excel');
    Swal.fire('Export', 'Excel export functionality will be implemented.', 'info');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Banner */}
     
    

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-blue-600">Missed Sales</h1>
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
              onClick={handleAddMissedSale}
              className="flex items-center bg-blue-600 hover:bg-blue-700"
            >
              + Add Missed Sale
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
              onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null])}
              placeholder={['From Date', 'To Date']}
              className="w-80"
              format="DD/MM/YYYY"
            />
            <Search
              placeholder="Search by Item Name"
              value={searchByName}
              onChange={(e) => setSearchByName(e.target.value)}
              onSearch={(value) => setSearchByName(value)}
              allowClear
              className="w-60"
              enterButton={<SearchOutlined />}
            />
            <Search
              placeholder="Search by Reason"
              value={searchByReason}
              onChange={(e) => setSearchByReason(e.target.value)}
              onSearch={(value) => setSearchByReason(value)}
              allowClear
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
              <Option value="Pending">Pending</Option>
              <Option value="Investigated">Investigated</Option>
              <Option value="Resolved">Resolved</Option>
              <Option value="Cancelled">Cancelled</Option>
            </Select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Total Missed Sales */}
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-600 font-medium mb-1">Total Missed Sales</p>
                <p className="text-2xl font-bold text-red-700">
                  {missedSales.length.toLocaleString()}
                </p>
              </div>
              <div className="bg-red-200 p-3 rounded-full">
                <svg className="w-6 h-6 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
          </div>

          {/* Total Estimated Loss */}
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-orange-600 font-medium mb-1">Total Estimated Loss</p>
                <p className="text-2xl font-bold text-orange-700">
                  Rs. {totalLoss.toLocaleString()}
                </p>
              </div>
              <div className="bg-orange-200 p-3 rounded-full">
                <svg className="w-6 h-6 text-orange-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Pending Investigations */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600 font-medium mb-1">Pending Investigations</p>
                <p className="text-2xl font-bold text-blue-700">
                  {missedSales.filter(sale => sale.status === 'Pending').length.toLocaleString()}
                </p>
              </div>
              <div className="bg-blue-200 p-3 rounded-full">
                <svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <Card className="shadow-sm">
          <Table
            columns={columns}
            dataSource={missedSales}
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

    
      </div>

      {/* Add/Edit Modal */}
      <Modal
        title={
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold mr-3">
              {form.getFieldValue('_id') ? 'E' : 'A'}
            </div>
            <span className="text-lg font-semibold text-gray-800">
              {form.getFieldValue('_id') ? 'Edit Missed Sale' : 'Add Missed Sale'}
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
            {form.getFieldValue('_id') ? 'Update the missed sale information below.' : 'Fill in the details to record a new missed sale.'}
          </p>
        </div>
        
        <Form form={form} layout="vertical" className="pharmacy-form">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              name="pharmItemId"
              label={
                <span className="font-semibold text-gray-700">
                  Pharmacy Item <span className="text-red-500">*</span>
                </span>
              }
              rules={[{ required: true, message: 'Please select an item' }]}
            >
              <Select
                placeholder="Search and select pharmacy item"
                showSearch
                className="pharmacy-select"
              >
                {pharmItems.map(item => (
                  <Option key={item._id} value={item._id}>
                    <div className="flex justify-between items-center">
                      <span>{item.name}</span>
                      <span className="text-xs text-gray-500">Stock: {item.availableQuantity || 0}</span>
                    </div>
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="quantity"
              label={
                <span className="font-semibold text-gray-700">
                  Quantity <span className="text-red-500">*</span>
                </span>
              }
              rules={[{ required: true, message: 'Please enter quantity' }]}
            >
              <Input 
                type="number" 
                min={1} 
                placeholder="Enter quantity missed" 
                className="pharmacy-input"
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              name="reason"
              label={
                <span className="font-semibold text-gray-700">
                  Reason <span className="text-red-500">*</span>
                </span>
              }
              rules={[{ required: true, message: 'Please select reason' }]}
            >
              <Select placeholder="Select reason for missed sale" className="pharmacy-select">
                <Option value="Out of Stock">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                    Out of Stock
                  </div>
                </Option>
                <Option value="Customer Cancelled">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                    Customer Cancelled
                  </div>
                </Option>
                <Option value="Payment Failed">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                    Payment Failed
                  </div>
                </Option>
                <Option value="Item Damaged">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                    Item Damaged
                  </div>
                </Option>
                <Option value="Other">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-gray-500 rounded-full mr-2"></div>
                    Other
                  </div>
                </Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="missedDate"
              label={
                <span className="font-semibold text-gray-700">
                  Missed Date <span className="text-red-500">*</span>
                </span>
              }
              rules={[{ required: true, message: 'Please select date' }]}
            >
              <DatePicker 
                className="w-full pharmacy-datepicker" 
                placeholder="Select missed date"
                format="DD/MM/YYYY"
              />
            </Form.Item>
          </div>

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
              <Option value="Investigated">Investigated</Option>
              <Option value="Resolved">Resolved</Option>
              <Option value="Cancelled">Cancelled</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="notes"
            label={
              <span className="font-semibold text-gray-700">
                Additional Notes
              </span>
            }
          >
            <Input.TextArea 
              rows={4} 
              placeholder="Enter any additional notes or details about this missed sale..." 
              className="pharmacy-textarea"
            />
          </Form.Item>

          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex items-center text-sm text-blue-700">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span>Estimated loss will be calculated automatically based on item price and quantity.</span>
            </div>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default MissedSales;