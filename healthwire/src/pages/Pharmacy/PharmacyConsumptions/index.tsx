import React, { useEffect, useState, useRef } from 'react';
import { Table, Button, message, Input, Space, Tag, Modal, Form, Select, DatePicker } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, DownloadOutlined, PrinterOutlined, EyeOutlined } from '@ant-design/icons';
import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Base_url } from '../../../utils/Base_url';
import { type Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { useReactToPrint } from 'react-to-print';

const { Search } = Input;
const { Option } = Select;

interface ConsumedStock {
  _id: string;
  pharmItemId: {
    _id: string;
    name: string;
    barcode: string;
  };
  quantity: number;
  consumedBy: {
    _id: string;
    name: string;
  };
  consumedAt: string;
  reason: string;
  notes?: string;
  status: string;
}

const ConsumeStocks: React.FC = () => {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [consumedStocks, setConsumedStocks] = useState<ConsumedStock[]>([]);
  const [pharmacyItems, setPharmacyItems] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editingConsumedStock, setEditingConsumedStock] = useState<ConsumedStock | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemFilter, setItemFilter] = useState('');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [totalConsumedQuantity, setTotalConsumedQuantity] = useState(0);
  const [totalConsumedCount, setTotalConsumedCount] = useState(0);
  const [form] = Form.useForm();

  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
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

  // Fetch consumed stocks
  const fetchConsumedStocks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(searchTerm && { search: searchTerm }),
        ...(itemFilter && { itemId: itemFilter }),
        ...(dateRange[0] && dateRange[1] && {
          from: dateRange[0].format('YYYY-MM-DD'),
          to: dateRange[1].format('YYYY-MM-DD')
        })
      });

      const response = await axios.get(`${Base_url}/apis/pharmConsumedStock/get?${params}`);
      setConsumedStocks(response.data.data || []);
      setTotalPages(response.data.totalPages || 1);
      
      // Calculate statistics
      const totalQty = response.data.data?.reduce((sum: number, stock: ConsumedStock) => sum + stock.quantity, 0) || 0;
      const totalCount = response.data.data?.length || 0;
      
      setTotalConsumedQuantity(totalQty);
      setTotalConsumedCount(totalCount);
    } catch (error) {
      console.error('Error fetching consumed stocks:', error);
      message.error('Failed to fetch consumed stocks');
    } finally {
      setLoading(false);
    }
  };

  // Fetch reference data
  const fetchReferenceData = async () => {
    try {
      const [itemsRes, usersRes, departmentsRes] = await Promise.all([
        axios.get(`${Base_url}/apis/pharmItem/get`),
        axios.get(`${Base_url}/apis/user/get`),
        axios.get(`${Base_url}/apis/department/get`).catch(() => ({ data: { data: [] } }))
      ]);
      setPharmacyItems(itemsRes.data.data || []);
      setUsers(usersRes.data.data || []);
      setDepartments(departmentsRes.data.data || []);
    } catch (error) {
      console.error('Error fetching reference data:', error);
    }
  };

  useEffect(() => {
    fetchConsumedStocks();
    fetchReferenceData();
  }, [currentPage, searchTerm, itemFilter, dateRange]);

  const columns = [
    {
      title: 'Item Name',
      dataIndex: ['pharmItemId', 'name'],
      key: 'itemName',
      sorter: (a, b) => (a.pharmItemId?.name || '').localeCompare(b.pharmItemId?.name || ''),
      render: (text) => (
        <span className="font-semibold text-gray-800">{text}</span>
      ),
    },
    {
      title: 'Barcode',
      dataIndex: ['pharmItemId', 'barcode'],
      key: 'barcode',
      render: (text) => text || 'N/A',
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
      title: 'Consumed By',
      dataIndex: ['consumedBy', 'name'],
      key: 'consumedBy',
      render: (text) => text || 'N/A',
    },
    {
      title: 'Consumed At',
      dataIndex: 'consumedAt',
      key: 'consumedAt',
      render: (text) => {
        if (!text) return 'N/A';
        try {
          const date = new Date(text);
          if (isNaN(date.getTime())) return 'Invalid Date';
          return date.toLocaleDateString();
        } catch (e) {
          return 'Invalid Date';
        }
      },
      sorter: (a, b) => {
        try {
          const dateA = new Date(a.consumedAt).getTime();
          const dateB = new Date(b.consumedAt).getTime();
          if (isNaN(dateA) || isNaN(dateB)) return 0;
          return dateA - dateB;
        } catch {
          return 0;
        }
      },
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      render: (text) => text || 'N/A',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const colorMap = {
          'Active': 'green',
          'Inactive': 'red',
        };
        return <Tag color={colorMap[status] || 'default'}>{status}</Tag>;
      },
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

  const handleView = (record: ConsumedStock) => {
    Swal.fire({
      title: 'Consumed Stock Details',
      html: `
        <div class="text-left" style="font-size: 14px;">
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <p style="margin: 8px 0;"><strong>Item Name:</strong> ${record.pharmItemId?.name}</p>
            <p style="margin: 8px 0;"><strong>Barcode:</strong> ${record.pharmItemId?.barcode || 'N/A'}</p>
            <p style="margin: 8px 0;"><strong>Quantity:</strong> ${record.quantity}</p>
            <p style="margin: 8px 0;"><strong>Consumed By:</strong> ${record.consumedBy?.name || 'N/A'}</p>
            <p style="margin: 8px 0;"><strong>Consumed At:</strong> ${new Date(record.consumedAt).toLocaleDateString()}</p>
            <p style="margin: 8px 0;"><strong>Reason:</strong> ${record.reason}</p>
            <p style="margin: 8px 0;"><strong>Status:</strong> ${record.status}</p>
            ${record.notes ? `<p style="margin: 8px 0;"><strong>Notes:</strong> ${record.notes}</p>` : ''}
          </div>
        </div>
      `,
      showCloseButton: true,
      width: 500,
    });
  };

  const handleEdit = (record: ConsumedStock) => {
    setEditingConsumedStock(record);
    const consumptionDate = record.consumedAt ? dayjs(record.consumedAt) : dayjs();
    form.setFieldsValue({
      itemId: record.pharmItemId?._id,
      quantity: record.quantity,
      consumedBy: record.consumedBy?._id,
      departmentId: (record as any).departmentId?._id || (record as any).departmentId,
      reason: record.reason,
      status: record.status,
      notes: record.notes,
      consumptionDate: consumptionDate,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (record: ConsumedStock) => {
    try {
      const result = await Swal.fire({
        title: 'Delete Consumed Stock?',
        text: `Are you sure you want to delete this consumed stock record?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, Delete',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#ef4444',
      });

      if (result.isConfirmed) {
        await axios.delete(`${Base_url}/apis/pharmConsumedStock/delete/${record._id}`);
        message.success('Consumed stock deleted successfully');
        fetchConsumedStocks();
      }
    } catch (error) {
      console.error('Error deleting consumed stock:', error);
      message.error('Failed to delete consumed stock');
    }
  };

  const handleAdd = () => {
    setEditingConsumedStock(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingConsumedStock(null);
    form.resetFields();
  };

  const handleModalSubmit = async () => {
    try {
      const values = await form.validateFields();
      const data = {
        pharmItemId: values.itemId, // Map itemId to pharmItemId for backend
        quantity: values.quantity,
        consumedBy: values.consumedBy,
        consumptionDate: values.consumptionDate ? values.consumptionDate.format('YYYY-MM-DD') : new Date().toISOString().split('T')[0],
        reason: values.reason,
        status: values.status || 'Active',
        notes: values.notes,
        departmentId: values.departmentId
      };

      console.log('Submitting consumed stock data:', data);

      if (editingConsumedStock) {
        await axios.put(`${Base_url}/apis/pharmConsumedStock/update/${editingConsumedStock._id}`, data);
        message.success('Consumed stock updated successfully');
      } else {
        await axios.post(`${Base_url}/apis/pharmConsumedStock/create`, data);
        message.success('Consumed stock created successfully');
      }
      
      handleModalClose();
      fetchConsumedStocks();
    } catch (error: any) {
      console.error('Error saving consumed stock:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to save consumed stock';
      message.error(errorMessage);
    }
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const [printPreviewVisible, setPrintPreviewVisible] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handleExcelExport = () => {
    try {
      if (consumedStocks.length === 0) {
        message.warning('No data to export');
        return;
      }

      const exportData = consumedStocks.map((stock) => ({
        'Item Name': stock.pharmItemId?.name || '',
        'Barcode': stock.pharmItemId?.barcode || '',
        'Quantity': stock.quantity || 0,
        'Consumed By': stock.consumedBy?.name || '',
        'Consumed At': stock.consumedAt ? new Date(stock.consumedAt).toLocaleDateString() : 'N/A',
        'Reason': stock.reason || '',
        'Status': stock.status || '',
        'Notes': stock.notes || '',
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const columnWidths = [
        { wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 20 }, { wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 30 }
      ];
      ws['!cols'] = columnWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Consumed Stocks');
      const fileName = `Consumed_Stocks_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      message.success('Excel file exported successfully');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      message.error('Failed to export Excel file');
    }
  };

  const handlePrint = () => {
    setPrintPreviewVisible(true);
  };

  const handlePrintConfirm = useReactToPrint({
    content: () => printRef.current,
    documentTitle: 'Consumed Stocks Report',
    onAfterPrint: () => {
      setPrintPreviewVisible(false);
      message.success('Print completed');
    },
  });

  return (
    <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
      <Breadcrumb pageName="Consume Stocks" />

      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <h4 className="text-xl font-semibold text-black dark:text-white">
            Consume Stocks
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
              onChange={(dates) => {
                setDateRange(dates as [Dayjs | null, Dayjs | null]);
                setCurrentPage(1);
              }}
              placeholder={['From Date', 'To Date']}
              className="w-80"
            />
            <Search
              placeholder="Search by Item Name"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (!e.target.value) {
                  setCurrentPage(1);
                }
              }}
              onSearch={(value) => {
                setSearchTerm(value);
                setCurrentPage(1);
              }}
              className="w-60"
              enterButton={<SearchOutlined />}
              allowClear
            />
            <Select
              placeholder="Select Item"
              value={itemFilter}
              onChange={(value) => {
                setItemFilter(value || '');
                setCurrentPage(1);
              }}
              className="w-48"
              allowClear
            >
              {pharmacyItems.map(item => (
                <Option key={item._id} value={item._id}>
                  {item.name}
                </Option>
              ))}
            </Select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Consumed Quantity */}
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-600 font-medium mb-1">Consumed Quantity</p>
                <p className="text-2xl font-bold text-red-700">
                  {totalConsumedQuantity.toLocaleString()}
                </p>
              </div>
              <div className="bg-red-200 p-3 rounded-full">
                <svg className="w-6 h-6 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
            </div>
          </div>

          {/* Consumed Count */}
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-orange-600 font-medium mb-1">Consumed Count</p>
                <p className="text-2xl font-bold text-orange-700">
                  {totalConsumedCount.toLocaleString()}
                </p>
              </div>
              <div className="bg-orange-200 p-3 rounded-full">
                <svg className="w-6 h-6 text-orange-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          dataSource={consumedStocks}
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

     

      {/* Add/Edit Modal */}
      <Modal
        title={editingConsumedStock ? 'Edit Consumed Stock' : 'Add Consumed Stock'}
        open={isModalOpen}
        onOk={handleModalSubmit}
        onCancel={handleModalClose}
        width={600}
        okText="Save"
        cancelText="Cancel"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="itemId"
            label="Item"
            rules={[{ required: true, message: 'Please select item' }]}
          >
            <Select 
              placeholder="Search and select item"
              showSearch
              filterOption={(input, option) =>
                (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
              }
              optionFilterProp="children"
            >
              {pharmacyItems.map(item => (
                <Option key={item._id} value={item._id}>
                  {item.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="quantity"
            label="Quantity"
            rules={[{ required: true, message: 'Please enter quantity' }, { type: 'number', min: 1, message: 'Quantity must be at least 1' }]}
          >
            <Input type="number" min={1} placeholder="Enter quantity" />
          </Form.Item>
          
          <Form.Item
            name="consumptionDate"
            label="Consumption Date"
            rules={[{ required: true, message: 'Please select consumption date' }]}
            initialValue={dayjs()}
          >
            <DatePicker className="w-full" format="YYYY-MM-DD" />
          </Form.Item>
          
          <Form.Item
            name="consumedBy"
            label="Consumed By"
            rules={[{ required: true, message: 'Please select user' }]}
          >
            <Select placeholder="Select user">
              {users.map(user => (
                <Option key={user._id} value={user._id}>
                  {user.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="departmentId"
            label="Department (Optional)"
          >
            <Select placeholder="Select department">
              {departments.map(dept => (
                <Option key={dept._id} value={dept._id}>
                  {dept.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="reason"
            label="Reason"
            rules={[{ required: true, message: 'Please select reason' }]}
          >
            <Select placeholder="Select reason">
              <Option value="Patient Treatment">Patient Treatment</Option>
              <Option value="Emergency Use">Emergency Use</Option>
              <Option value="Department Consumption">Department Consumption</Option>
              <Option value="Expired Disposal">Expired Disposal</Option>
              <Option value="Damaged Disposal">Damaged Disposal</Option>
              <Option value="Other">Other</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="status"
            label="Status"
            rules={[{ required: true, message: 'Please select status' }]}
          >
            <Select placeholder="Select status">
              <Option value="Active">Active</Option>
              <Option value="Completed">Completed</Option>
              <Option value="Pending">Pending</Option>
              <Option value="Cancelled">Cancelled</Option>
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

      {/* Print Preview Modal */}
      <Modal
        title="Print Preview - Consumed Stocks"
        open={printPreviewVisible}
        onCancel={() => setPrintPreviewVisible(false)}
        width={1200}
        footer={[
          <Button key="cancel" onClick={() => setPrintPreviewVisible(false)}>
            Cancel
          </Button>,
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={handlePrintConfirm}>
            Print
          </Button>,
        ]}
      >
        <div ref={printRef} className="print-preview-content">
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold">Holistic Care</h2>
            <p className="text-gray-600">Consumed Stocks Report</p>
            <p className="text-sm text-gray-500">
              Generated on: {new Date().toLocaleString()}
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-red-50 p-4 rounded border border-red-200">
              <p className="text-sm text-red-600 font-medium mb-1">Consumed Quantity</p>
              <p className="text-2xl font-bold text-red-700">
                {totalConsumedQuantity.toLocaleString()}
              </p>
            </div>
            <div className="bg-orange-50 p-4 rounded border border-orange-200">
              <p className="text-sm text-orange-600 font-medium mb-1">Consumed Count</p>
              <p className="text-2xl font-bold text-orange-700">
                {totalConsumedCount.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Table */}
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-3 py-2 text-left text-xs font-bold">Item Name</th>
                <th className="border border-gray-300 px-3 py-2 text-left text-xs font-bold">Barcode</th>
                <th className="border border-gray-300 px-3 py-2 text-left text-xs font-bold">Quantity</th>
                <th className="border border-gray-300 px-3 py-2 text-left text-xs font-bold">Consumed By</th>
                <th className="border border-gray-300 px-3 py-2 text-left text-xs font-bold">Consumed At</th>
                <th className="border border-gray-300 px-3 py-2 text-left text-xs font-bold">Reason</th>
                <th className="border border-gray-300 px-3 py-2 text-left text-xs font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {consumedStocks.map((stock) => (
                <tr key={stock._id}>
                  <td className="border border-gray-300 px-3 py-2 text-sm">{stock.pharmItemId?.name || 'N/A'}</td>
                  <td className="border border-gray-300 px-3 py-2 text-sm">{stock.pharmItemId?.barcode || 'N/A'}</td>
                  <td className="border border-gray-300 px-3 py-2 text-sm text-center">{stock.quantity}</td>
                  <td className="border border-gray-300 px-3 py-2 text-sm">{stock.consumedBy?.name || 'N/A'}</td>
                  <td className="border border-gray-300 px-3 py-2 text-sm">
                    {stock.consumedAt ? (() => {
                      try {
                        const date = new Date(stock.consumedAt);
                        return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleDateString();
                      } catch {
                        return 'Invalid Date';
                      }
                    })() : 'N/A'}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-sm">{stock.reason || 'N/A'}</td>
                  <td className="border border-gray-300 px-3 py-2 text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${
                      stock.status === 'Completed' ? 'bg-green-100 text-green-800' :
                      stock.status === 'Active' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {stock.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  );
};

export default ConsumeStocks;