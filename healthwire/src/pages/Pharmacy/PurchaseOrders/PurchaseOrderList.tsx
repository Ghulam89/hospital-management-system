import React, { useEffect, useState } from 'react';
import { Table, Button, message, TablePaginationConfig, Tag, Space, Input, Select, DatePicker } from 'antd';
import axios from 'axios';
import { FaCloudUploadAlt, FaRegEdit, FaEye, FaCheckCircle } from 'react-icons/fa';
import { RiDeleteBin5Line } from 'react-icons/ri';
import { FiDownload, FiPrinter, FiPlus } from 'react-icons/fi';
import Swal from 'sweetalert2';
import { Base_url } from '../../../utils/Base_url';
// import dayjs from 'dayjs';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface PurchaseOrder {
  _id: string;
  purchaseOrderNumber: string;
  supplierId: {
    _id: string;
    name: string;
    phone: string;
  };
  orderDate: string;
  expectedDeliveryDate: string;
  status: string;
  totalAmount: number;
  poCategory: string;
  items: any[];
  createdBy: {
    _id: string;
    name: string;
  };
}

const PurchaseOrderList: React.FC = () => {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateRange, setDateRange] = useState<any[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);

  // Table row selection
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

  // Fetch purchase orders
  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(searchTerm && { search: searchTerm }),
        ...(supplierFilter && { supplierId: supplierFilter }),
        ...(statusFilter && { status: statusFilter }),
        ...(dateRange.length === 2 && {
          from: dateRange[0].format('YYYY-MM-DD'),
          to: dateRange[1].format('YYYY-MM-DD')
        })
      });

      const response = await axios.get(`${Base_url}/apis/pharmPurchaseOrder/get?${params}`);
      setPurchaseOrders(response.data.data || []);
      setTotalPages(response.data.totalPages || 1);
      
      // Calculate grand total
      const total = response.data.data?.reduce((sum: number, order: PurchaseOrder) => sum + order.totalAmount, 0) || 0;
      setGrandTotal(total);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      message.error('Failed to fetch purchase orders');
    } finally {
      setLoading(false);
    }
  };

  // Fetch suppliers
  const fetchSuppliers = async () => {
    try {
      const response = await axios.get(`${Base_url}/apis/pharmSupplier/get`);
      setSuppliers(response.data.data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  useEffect(() => {
    fetchPurchaseOrders();
    fetchSuppliers();
  }, [currentPage, searchTerm, supplierFilter, statusFilter, dateRange]);

  // Table columns
  const columns = [
    {
      title: 'PO Number',
      dataIndex: 'purchaseOrderNumber',
      key: 'purchaseOrderNumber',
      width: 120,
      render: (text: string) => (
        <span className="font-semibold text-blue-600">{text}</span>
      ),
    },
    {
      title: 'Supplier',
      dataIndex: ['supplierId', 'name'],
      key: 'supplier',
      width: 150,
      render: (text: string, record: PurchaseOrder) => (
        <div>
          <div className="font-medium">{text}</div>
          <div className="text-sm text-gray-500">{record.supplierId?.phone}</div>
        </div>
      ),
    },
    {
      title: 'Order Date',
      dataIndex: 'orderDate',
      key: 'orderDate',
      width: 120,
      render: (text: string) => new Date(text).toLocaleDateString(),
    },
    {
      title: 'Expected Delivery',
      dataIndex: 'expectedDeliveryDate',
      key: 'expectedDeliveryDate',
      width: 120,
      render: (text: string) => new Date(text).toLocaleDateString(),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => {
        const colorMap: { [key: string]: string } = {
          'Draft': 'default',
          'Pending': 'processing',
          'Approved': 'success',
          'Ordered': 'warning',
          'Delivered': 'success',
          'Cancelled': 'error',
        };
        return <Tag color={colorMap[status] || 'default'}>{status}</Tag>;
      },
    },
    {
      title: 'Category',
      dataIndex: 'poCategory',
      key: 'poCategory',
      width: 120,
    },
    {
      title: 'Total Amount',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 120,
      render: (amount: number) => (
        <span className="font-semibold text-green-600">
          Rs. {amount.toLocaleString()}
        </span>
      ),
    },
    {
      title: 'Items',
      dataIndex: 'items',
      key: 'items',
      width: 80,
      render: (items: any[]) => (
        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
          {items?.length || 0}
        </span>
      ),
    },
    {
      title: 'Created By',
      dataIndex: ['createdBy', 'name'],
      key: 'createdBy',
      width: 120,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (text: any, record: PurchaseOrder) => (
        <Space size="small">
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
          {record.status === 'Pending' && (
            <Button
              type="text"
              icon={<FaCheckCircle className="text-green-600" />}
              onClick={() => handleApprove(record)}
              title="Approve"
            />
          )}
          <Button
            type="text"
            icon={<RiDeleteBin5Line className="text-red-500" />}
            onClick={() => handleDelete(record)}
            title="Delete"
          />
        </Space>
      ),
    },
  ];

  const handleView = (record: PurchaseOrder) => {
    // Implement view functionality
    console.log('View:', record);
  };

  const handleEdit = (record: PurchaseOrder) => {
    // Implement edit functionality
    console.log('Edit:', record);
  };

  const handleApprove = async (record: PurchaseOrder) => {
    try {
      const result = await Swal.fire({
        title: 'Approve Purchase Order?',
        text: `Are you sure you want to approve PO ${record.purchaseOrderNumber}?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, Approve',
        cancelButtonText: 'Cancel',
      });

      if (result.isConfirmed) {
        await axios.put(`${Base_url}/apis/pharmPurchaseOrder/approve/${record._id}`, {
          approvedBy: 'current-user-id' // Replace with actual user ID
        });
        message.success('Purchase order approved successfully');
        fetchPurchaseOrders();
      }
    } catch (error) {
      console.error('Error approving purchase order:', error);
      message.error('Failed to approve purchase order');
    }
  };

  const handleDelete = async (record: PurchaseOrder) => {
    try {
      const result = await Swal.fire({
        title: 'Delete Purchase Order?',
        text: `Are you sure you want to delete PO ${record.purchaseOrderNumber}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, Delete',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#ef4444',
      });

      if (result.isConfirmed) {
        await axios.delete(`${Base_url}/apis/pharmPurchaseOrder/delete/${record._id}`);
        message.success('Purchase order deleted successfully');
        fetchPurchaseOrders();
      }
    } catch (error) {
      console.error('Error deleting purchase order:', error);
      message.error('Failed to delete purchase order');
    }
  };

  const handleExcelExport = () => {
    // Implement Excel export
    console.log('Export to Excel');
  };

  const handlePrint = () => {
    // Implement print functionality
    window.print();
  };

  const handleAddPurchaseOrder = () => {
    // Navigate to add purchase order tab
    console.log('Add Purchase Order');
  };

  const handleAddOrderList = () => {
    // Implement bulk order list functionality
    console.log('Add Order List');
  };

  return (
    <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <h4 className="text-xl font-semibold text-black dark:text-white">
            Pharmacy Purchase Orders
          </h4>
          <div className="flex items-center gap-2">
            <Button
              icon={<FiDownload />}
              onClick={handleExcelExport}
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
              icon={<FiPlus />}
              onClick={handleAddPurchaseOrder}
              className="flex items-center gap-2"
            >
              + Add Purchase Order
            </Button>
            <Button
              type="primary"
              icon={<FiPlus />}
              onClick={handleAddOrderList}
              className="flex items-center gap-2"
            >
              ▲ Add Order List
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
            placeholder="Search by Item Name"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-60"
          />
          <Search
            placeholder="Search by PO #"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-60"
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
          <Select
            placeholder="Select Manufacturer"
            className="w-48"
            allowClear
          >
            {/* Add manufacturer options */}
          </Select>
        </div>

        {/* Grand Total Card */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 w-fit">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-700">Grand Total</h3>
              <p className="text-2xl font-bold text-blue-600">Rs. {grandTotal.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="max-w-full overflow-x-auto">
        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={purchaseOrders}
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
          scroll={{ x: 1200 }}
        />
      </div>

      {/* No Data Message */}
      
    </div>
  );
};

export default PurchaseOrderList;
