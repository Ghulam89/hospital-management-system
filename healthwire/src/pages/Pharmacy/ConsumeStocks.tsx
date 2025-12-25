import React, { useEffect, useState } from 'react';
import { Table, Button, message, Input, Select, DatePicker, Card, Row, Col, Statistic, Tag, Modal, Form } from 'antd';
import { FaRegEdit, FaEye, FaTrashAlt, FaPlus, FaSearch } from 'react-icons/fa';
import { FiDownload, FiPrinter } from 'react-icons/fi';
import Swal from 'sweetalert2';
import axios from 'axios';
import { Base_url } from '../../utils/Base_url';
import dayjs, { Dayjs } from 'dayjs';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface ConsumedStock {
  _id: string;
  pharmItemId: {
    _id: string;
    name: string;
    unitCost: number;
    availableQuantity: number;
  };
  quantity: number;
  consumptionDate: string;
  reason: string;
  departmentId?: {
    name: string;
  };
  consumedBy: {
    name: string;
  };
  notes: string;
  status: string;
}

const ConsumeStocks: React.FC = () => {
  const [consumedStocks, setConsumedStocks] = useState<ConsumedStock[]>([]);
  const [pharmItems, setPharmItems] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchConsumedStocks();
    fetchPharmItems();
    fetchDepartments();
  }, [searchTerm, departmentFilter, dateRange]);

  const fetchConsumedStocks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        ...(searchTerm && { search: searchTerm }),
        ...(departmentFilter && { departmentId: departmentFilter }),
        ...(dateRange[0] && dateRange[1] && {
          from: dateRange[0].format('YYYY-MM-DD'),
          to: dateRange[1].format('YYYY-MM-DD')
        })
      });

      const response = await axios.get(`${Base_url}/apis/pharmConsumedStock/get?${params}`);
      setConsumedStocks(response.data.data || []);
    } catch (error) {
      console.error('Error fetching consumed stocks:', error);
      message.error('Failed to fetch consumed stocks');
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

  const fetchDepartments = async () => {
    try {
      const response = await axios.get(`${Base_url}/apis/department/get`);
      setDepartments(response.data.data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const columns = [
    {
      title: 'Item Name',
      dataIndex: ['pharmItemId', 'name'],
      key: 'itemName',
      render: (text: string, record: ConsumedStock) => (
        <div>
          <div className="font-medium text-gray-800">{text}</div>
          <div className="text-sm text-gray-500">ID: {record.pharmItemId?._id?.slice(-6)}</div>
        </div>
      ),
    },
    {
      title: 'Quantity Consumed',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (quantity: number) => (
        <Tag color="red" className="font-semibold">
          {quantity}
        </Tag>
      ),
    },
    {
      title: 'Department',
      dataIndex: ['departmentId', 'name'],
      key: 'department',
      render: (name: string) => name || 'General',
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
      title: 'Consumption Date',
      dataIndex: 'consumptionDate',
      key: 'consumptionDate',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Consumed By',
      dataIndex: ['consumedBy', 'name'],
      key: 'consumedBy',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colorMap: { [key: string]: string } = {
          'Active': 'success',
          'Completed': 'success',
          'Pending': 'processing',
          'Cancelled': 'error',
        };
        return <Tag color={colorMap[status] || 'default'}>{status}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (text: any, record: ConsumedStock) => (
        <div className="flex space-x-2">
          <Button
            type="text"
            icon={<FaEye className="text-blue-500" />}
            onClick={() => handleView(record)}
            title="View"
          />
          <Button
            type="text"
            icon={<FaRegEdit className="text-green-500" />}
            onClick={() => handleEdit(record)}
            title="Edit"
          />
          <Button
            type="text"
            icon={<FaTrashAlt className="text-red-500" />}
            onClick={() => handleDelete(record)}
            title="Delete"
          />
        </div>
      ),
    },
  ];

  const handleView = (record: ConsumedStock) => {
    Swal.fire({
      title: 'Consumed Stock Details',
      html: `
        <div class="text-left">
          <p><strong>Item:</strong> ${record.pharmItemId?.name}</p>
          <p><strong>Quantity:</strong> ${record.quantity}</p>
          <p><strong>Department:</strong> ${record.departmentId?.name || 'General'}</p>
          <p><strong>Reason:</strong> ${record.reason}</p>
          <p><strong>Consumed By:</strong> ${record.consumedBy?.name}</p>
          <p><strong>Date:</strong> ${new Date(record.consumptionDate).toLocaleDateString()}</p>
          <p><strong>Notes:</strong> ${record.notes || 'N/A'}</p>
        </div>
      `,
      showCloseButton: true,
    });
  };

  const handleEdit = (record: ConsumedStock) => {
    form.setFieldsValue({
      ...record,
      pharmItemId: (record.pharmItemId as any)?._id || record.pharmItemId,
      departmentId: (record.departmentId as any)?._id || record.departmentId,
      consumptionDate: dayjs(record.consumptionDate),
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (record: ConsumedStock) => {
    try {
      const result = await Swal.fire({
        title: 'Delete Consumed Stock?',
        text: `Are you sure you want to delete this consumption record?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, Delete',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#ef4444',
      });

      if (result.isConfirmed) {
        await axios.delete(`${Base_url}/apis/pharmConsumedStock/delete/${record._id}`);
        message.success('Consumed stock record deleted successfully');
        fetchConsumedStocks();
      }
    } catch (error) {
      console.error('Error deleting consumed stock:', error);
      message.error('Failed to delete consumed stock record');
    }
  };

  const handleAddConsumedStock = () => {
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleModalSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      // Get current user ID from localStorage
      const userDataStr = localStorage.getItem('userData');
      let consumedById = null;
      
      if (userDataStr) {
        try {
          const userData = JSON.parse(userDataStr);
          consumedById = userData._id || userData.id || null;
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      }
      
      if (!consumedById) {
        message.error('User information not found. Please login again.');
        return;
      }
      
      // Validate quantity is a valid number
      const quantity = Number(values.quantity);
      if (isNaN(quantity) || quantity <= 0) {
        message.error('Please enter a valid quantity greater than 0');
        return;
      }
      
      const data = {
        ...values,
        quantity: quantity,
        consumptionDate: values.consumptionDate?.format('YYYY-MM-DD'),
        consumedBy: consumedById,
      };

      if (form.getFieldValue('_id')) {
        await axios.put(`${Base_url}/apis/pharmConsumedStock/update/${form.getFieldValue('_id')}`, data);
        message.success('Consumed stock updated successfully');
      } else {
        await axios.post(`${Base_url}/apis/pharmConsumedStock/create`, data);
        message.success('Consumed stock created successfully');
      }

      setIsModalOpen(false);
      fetchConsumedStocks();
    } catch (error) {
      console.error('Error saving consumed stock:', error);
      message.error('Failed to save consumed stock');
    }
  };

  const handleExport = () => {
    console.log('Export to Excel');
  };

  const handlePrint = () => {
    window.print();
  };

  const totalConsumedQuantity = consumedStocks.reduce((sum, stock) => sum + stock.quantity, 0);
  const totalConsumedValue = consumedStocks.reduce((sum, stock) => 
    sum + (stock.quantity * stock.pharmItemId?.unitCost), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xl font-semibold text-black dark:text-white">
            Consume Stocks Management
          </h4>
          <div className="flex items-center gap-2">
            <Button
              icon={<FiDownload />}
              onClick={handleExport}
              className="flex items-center gap-2"
            >
              Excel
            </Button>
            <Button
              icon={<FiPrinter />}
              onClick={handlePrint}
              className="flex items-center gap-2"
            >
              Print
            </Button>
            <Button
              type="primary"
              icon={<FaPlus />}
              onClick={handleAddConsumedStock}
              className="flex items-center gap-2"
            >
              + Consume Stock
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center">
          <RangePicker
            value={dateRange}
            onChange={setDateRange}
            placeholder={['From Date', 'To Date']}
            className="w-80"
          />
          <Search
            placeholder="Search by item name or reason"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onSearch={(value) => {
              setSearchTerm(value);
            }}
            allowClear
            className="w-60"
            enterButton
          />
          <Select
            placeholder="Select Department"
            value={departmentFilter}
            onChange={setDepartmentFilter}
            className="w-48"
            allowClear
          >
            {departments.map(dept => (
              <Option key={dept._id} value={dept._id}>
                {dept.name}
              </Option>
            ))}
          </Select>
        </div>

        {/* Stats Cards */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Card className="bg-blue-50 border-blue-200">
              <Statistic
                title="Total Consumption Records"
                value={consumedStocks.length}
                prefix={<FaSearch className="text-blue-500" />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card className="bg-red-50 border-red-200">
              <Statistic
                title="Total Quantity Consumed"
                value={totalConsumedQuantity}
                prefix={<FaSearch className="text-red-500" />}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card className="bg-orange-50 border-orange-200">
              <Statistic
                title="Total Value Consumed"
                value={totalConsumedValue}
                prefix="Rs."
                precision={2}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
        </Row>
      </div>

      {/* Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={consumedStocks}
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

      {/* Add/Edit Modal */}
      <Modal
        title={
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold mr-3">
              {form.getFieldValue('_id') ? 'E' : 'A'}
            </div>
            <span className="text-lg font-semibold text-gray-800">
              {form.getFieldValue('_id') ? 'Edit Consumed Stock' : 'Add Consumed Stock'}
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
            {form.getFieldValue('_id') ? 'Update the consumed stock information below.' : 'Fill in the details to record stock consumption.'}
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
                filterOption={(input, option) =>
                  (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
                }
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
                placeholder="Enter quantity consumed" 
                className="pharmacy-input"
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              name="departmentId"
              label={
                <span className="font-semibold text-gray-700">
                  Department
                </span>
              }
            >
              <Select placeholder="Select department" className="pharmacy-select">
                {departments.map(dept => (
                  <Option key={dept._id} value={dept._id}>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                      {dept.name}
                    </div>
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="consumptionDate"
              label={
                <span className="font-semibold text-gray-700">
                  Consumption Date <span className="text-red-500">*</span>
                </span>
              }
              rules={[{ required: true, message: 'Please select date' }]}
            >
              <DatePicker 
                className="w-full pharmacy-datepicker" 
                placeholder="Select consumption date"
                format="DD/MM/YYYY"
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
            rules={[{ required: true, message: 'Please enter reason' }]}
          >
            <Select placeholder="Select reason for consumption" className="pharmacy-select">
              <Option value="Patient Treatment">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Patient Treatment
                </div>
              </Option>
              <Option value="Emergency Use">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                  Emergency Use
                </div>
              </Option>
              <Option value="Department Consumption">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                  Department Consumption
                </div>
              </Option>
              <Option value="Expired Disposal">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                  Expired Disposal
                </div>
              </Option>
              <Option value="Damaged Disposal">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                  Damaged Disposal
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
            name="notes"
            label={
              <span className="font-semibold text-gray-700">
                Additional Notes
              </span>
            }
          >
            <Input.TextArea 
              rows={4} 
              placeholder="Enter any additional notes or details about this consumption..." 
              className="pharmacy-textarea"
            />
          </Form.Item>

          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex items-center text-sm text-blue-700">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span>Stock will be automatically deducted from available quantity when saved.</span>
            </div>
          </div>
        </Form>
      </Modal>

      {/* No Data Message */}
      {!loading && consumedStocks.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-4">No consumed stock records found</div>
          <div className="text-gray-400 text-sm">
            Click "Consume Stock" to record your first stock consumption
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsumeStocks;
