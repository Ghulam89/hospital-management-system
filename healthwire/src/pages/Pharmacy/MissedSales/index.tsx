import React, { useEffect, useState } from 'react';
import { Table, Button, message, Input, Space, Tag, Modal, Form, Select, DatePicker } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, DownloadOutlined, PrinterOutlined, EyeOutlined } from '@ant-design/icons';
import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Base_url } from '../../../utils/Base_url';
import dayjs from 'dayjs';

const { Search } = Input;
const { Option } = Select;

interface MissedSale {
  _id: string;
  itemName: string;
  quantity: number;
  phone: string;
  supplierId: {
    _id: string;
    name: string;
  };
  status: string;
  createdAt: string;
  resolvedAt?: string;
  notes?: string;
}

const MissedSales = () => {
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [missedSales, setMissedSales] = useState<MissedSale[]>([]);
  const [pharmacyItems, setPharmacyItems] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editingMissedSale, setEditingMissedSale] = useState<MissedSale | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [dateRange, setDateRange] = useState<any[]>([]);
  const [totalMissedQuantity, setTotalMissedQuantity] = useState(0);
  const [totalMissedCount, setTotalMissedCount] = useState(0);
  const [percentageInStock, setPercentageInStock] = useState(0);
  const [form] = Form.useForm();

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
    ],
  };

  // Fetch missed sales
  const fetchMissedSales = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(searchTerm && { search: searchTerm }),
        ...(supplierFilter && { supplierId: supplierFilter }),
        ...(dateRange.length === 2 && {
          from: dateRange[0].format('YYYY-MM-DD'),
          to: dateRange[1].format('YYYY-MM-DD')
        })
      });

      const response = await axios.get(`${Base_url}/apis/pharmMissedSale/get?${params}`);
      setMissedSales(response.data.data || []);
      setTotalPages(response.data.totalPages || 1);
      
      // Calculate statistics
      const totalQty = response.data.data?.reduce((sum: number, sale: MissedSale) => sum + sale.quantity, 0) || 0;
      const totalCount = response.data.data?.length || 0;
      const inStockCount = response.data.data?.filter(sale => sale.status === 'Resolved').length || 0;
      const percentage = totalCount > 0 ? (inStockCount / totalCount) * 100 : 0;
      
      setTotalMissedQuantity(totalQty);
      setTotalMissedCount(totalCount);
      setPercentageInStock(percentage);
    } catch (error) {
      console.error('Error fetching missed sales:', error);
      message.error('Failed to fetch missed sales');
    } finally {
      setLoading(false);
    }
  };

  // Fetch reference data
  const fetchReferenceData = async () => {
    try {
      const [itemsRes, suppliersRes] = await Promise.all([
        axios.get(`${Base_url}/apis/pharmItem/get`),
        axios.get(`${Base_url}/apis/pharmSupplier/get`)
      ]);
      setPharmacyItems(itemsRes.data.data || []);
      setSuppliers(suppliersRes.data.data || []);
    } catch (error) {
      console.error('Error fetching reference data:', error);
    }
  };

  useEffect(() => {
    fetchMissedSales();
    fetchReferenceData();
  }, [currentPage, searchTerm, supplierFilter, dateRange]);

  const columns = [
    {
      title: 'Item Name',
      dataIndex: 'itemName',
      key: 'itemName',
      sorter: (a, b) => a.itemName.localeCompare(b.itemName),
      render: (text) => (
        <span className="font-semibold text-gray-800">{text}</span>
      ),
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (quantity) => (
        <span className="font-semibold text-red-600">{quantity}</span>
      ),
      sorter: (a, b) => a.quantity - b.quantity,
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: (text) => text || 'N/A',
    },
    {
      title: 'Supplier',
      dataIndex: ['supplierId', 'name'],
      key: 'supplier',
      render: (text) => text || 'N/A',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const colorMap = {
          'Open': 'red',
          'Resolved': 'green',
          'In Progress': 'blue',
        };
        return <Tag color={colorMap[status] || 'default'}>{status}</Tag>;
      },
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text) => new Date(text).toLocaleDateString(),
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    },
    {
      title: 'Resolved At',
      dataIndex: 'resolvedAt',
      key: 'resolvedAt',
      render: (text) => text ? new Date(text).toLocaleDateString() : 'N/A',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EyeOutlined className="text-blue-500" />}
            onClick={() => handleView(record)}
            title="View Details"
          />
          <Button
            type="text"
            icon={<EditOutlined className="text-green-500" />}
            onClick={() => handleEdit(record)}
            title="Edit"
          />
          {record.status === 'Open' && (
            <Button
              type="text"
              icon={<EditOutlined className="text-blue-600" />}
              onClick={() => handleResolve(record)}
              title="Resolve"
            />
          )}
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
        <div class="text-left" style="font-size: 14px;">
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <p style="margin: 8px 0;"><strong>Item Name:</strong> ${record.itemName}</p>
            <p style="margin: 8px 0;"><strong>Quantity:</strong> ${record.quantity}</p>
            <p style="margin: 8px 0;"><strong>Phone:</strong> ${record.phone}</p>
            <p style="margin: 8px 0;"><strong>Supplier:</strong> ${record.supplierId?.name || 'N/A'}</p>
            <p style="margin: 8px 0;"><strong>Status:</strong> ${record.status}</p>
            <p style="margin: 8px 0;"><strong>Created:</strong> ${new Date(record.createdAt).toLocaleDateString()}</p>
            ${record.resolvedAt ? `<p style="margin: 8px 0;"><strong>Resolved:</strong> ${new Date(record.resolvedAt).toLocaleDateString()}</p>` : ''}
            ${record.notes ? `<p style="margin: 8px 0;"><strong>Notes:</strong> ${record.notes}</p>` : ''}
          </div>
        </div>
      `,
      showCloseButton: true,
      width: 500,
    });
  };

  const handleEdit = (record: MissedSale) => {
    setEditingMissedSale(record);
    form.setFieldsValue({
      itemName: record.itemName,
      quantity: record.quantity,
      phone: record.phone,
      supplierId: record.supplierId?._id,
      status: record.status,
      notes: record.notes,
    });
    setIsModalOpen(true);
  };

  const handleResolve = async (record: MissedSale) => {
    try {
      const result = await Swal.fire({
        title: 'Resolve Missed Sale?',
        text: `Are you sure you want to resolve this missed sale for ${record.itemName}?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, Resolve',
        cancelButtonText: 'Cancel',
      });

      if (result.isConfirmed) {
        await axios.put(`${Base_url}/apis/pharmMissedSale/resolve/${record._id}`, {
          resolvedAt: new Date().toISOString(),
          status: 'Resolved'
        });
        message.success('Missed sale resolved successfully');
        fetchMissedSales();
      }
    } catch (error) {
      console.error('Error resolving missed sale:', error);
      message.error('Failed to resolve missed sale');
    }
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
        message.success('Missed sale deleted successfully');
        fetchMissedSales();
      }
    } catch (error) {
      console.error('Error deleting missed sale:', error);
      message.error('Failed to delete missed sale');
    }
  };

  const handleAdd = () => {
    setEditingMissedSale(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingMissedSale(null);
    form.resetFields();
  };

  const handleModalSubmit = async () => {
    try {
      const values = await form.validateFields();
      const data = {
        ...values,
        createdAt: new Date().toISOString(),
        status: values.status || 'Open'
      };

      if (editingMissedSale) {
        await axios.put(`${Base_url}/apis/pharmMissedSale/update/${editingMissedSale._id}`, data);
        message.success('Missed sale updated successfully');
      } else {
        await axios.post(`${Base_url}/apis/pharmMissedSale/create`, data);
        message.success('Missed sale created successfully');
      }
      
      handleModalClose();
      fetchMissedSales();
    } catch (error) {
      console.error('Error saving missed sale:', error);
      message.error('Failed to save missed sale');
    }
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
      <Breadcrumb pageName="Missed Sales" />

      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <h4 className="text-xl font-semibold text-black dark:text-white">
            Missed Sales
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
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
              className="flex items-center gap-2"
            >
              + Add Stock
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-4">
          <div className="flex items-center mb-3">
            <svg className="w-5 h-5 text-primary mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <h4 className="text-sm font-semibold text-gray-700">Filter & Search</h4>
          </div>
          <div className="flex flex-wrap gap-4 items-center">
            <DatePicker.RangePicker
              value={dateRange}
              onChange={setDateRange}
              placeholder={['From Date', 'To Date']}
              className="w-80"
            />
            <Search
              placeholder="Search by Item Name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onSearch={handleSearch}
              className="w-60"
              allowClear
              enterButton={<SearchOutlined />}
            />
            <Select
              placeholder="Select Supplier"
              value={supplierFilter}
              onChange={setSupplierFilter}
              className="w-48"
              allowClear
            >
              {suppliers.map(supplier => (
                <Option key={supplier._id} value={supplier._id}>
                  {supplier.name}
                </Option>
              ))}
            </Select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Missed Sale Quantity */}
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-600 font-medium mb-1">Missed Sale Quantity</p>
                <p className="text-2xl font-bold text-red-700">
                  {totalMissedQuantity.toLocaleString()}
                </p>
              </div>
              <div className="bg-red-200 p-3 rounded-full">
                <svg className="w-6 h-6 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
            </div>
          </div>

          {/* Missed Sale Count */}
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-orange-600 font-medium mb-1">Missed Sale Count</p>
                <p className="text-2xl font-bold text-orange-700">
                  {totalMissedCount.toLocaleString()}
                </p>
              </div>
              <div className="bg-orange-200 p-3 rounded-full">
                <svg className="w-6 h-6 text-orange-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* % Age Of Missed Sale Now In Stock */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-600 font-medium mb-1">% Age Of Missed Sale Now In Stock</p>
                <p className="text-2xl font-bold text-green-700">
                  {percentageInStock.toFixed(1)}%
                </p>
              </div>
              <div className="bg-green-200 p-3 rounded-full">
                <svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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
          dataSource={missedSales}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: currentPage,
            total: totalPages * 20,
            pageSize: 20,
            onChange: setCurrentPage,
            showSizeChanger: false,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} items`,
          }}
          scroll={{ x: 1000 }}
        />
      </div>

      {/* No Data Message */}
      {!loading && missedSales.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-4">There are no missed sales</div>
          <div className="text-gray-400 text-sm">
            Click "Add Stock" to create your first missed sale record
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        title={editingMissedSale ? 'Edit Missed Sale' : 'Add Missed Sale'}
        open={isModalOpen}
        onOk={handleModalSubmit}
        onCancel={handleModalClose}
        width={600}
        okText="Save"
        cancelText="Cancel"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="itemName"
            label="Item Name"
            rules={[{ required: true, message: 'Please enter item name' }]}
          >
            <Input placeholder="Enter item name" />
          </Form.Item>
          
          <Form.Item
            name="quantity"
            label="Quantity"
            rules={[{ required: true, message: 'Please enter quantity' }]}
          >
            <Input type="number" placeholder="Enter quantity" />
          </Form.Item>
          
          <Form.Item
            name="phone"
            label="Phone"
            rules={[{ required: true, message: 'Please enter phone number' }]}
          >
            <Input placeholder="Enter phone number" />
          </Form.Item>
          
          <Form.Item
            name="supplierId"
            label="Supplier"
            rules={[{ required: true, message: 'Please select supplier' }]}
          >
            <Select placeholder="Select supplier">
              {suppliers.map(supplier => (
                <Option key={supplier._id} value={supplier._id}>
                  {supplier.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="status"
            label="Status"
            rules={[{ required: true, message: 'Please select status' }]}
          >
            <Select placeholder="Select status">
              <Option value="Open">Open</Option>
              <Option value="In Progress">In Progress</Option>
              <Option value="Resolved">Resolved</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="notes"
            label="Notes"
          >
            <Input.TextArea rows={3} placeholder="Enter any additional notes" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MissedSales;
