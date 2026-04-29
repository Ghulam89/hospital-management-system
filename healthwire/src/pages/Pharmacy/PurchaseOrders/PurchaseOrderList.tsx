import React, { useEffect, useState } from 'react';
import { Table, Button, message, TablePaginationConfig, Tag, Space, Input, Select, DatePicker } from 'antd';
import axios from 'axios';
import { FaCloudUploadAlt, FaRegEdit, FaEye } from 'react-icons/fa';
import { RiDeleteBin5Line } from 'react-icons/ri';
import { FiDownload, FiPrinter, FiPlus } from 'react-icons/fi';
import Swal from 'sweetalert2';
import { Base_url } from '../../../utils/Base_url';
import { AsyncPaginate, type LoadOptions } from 'react-select-async-paginate';
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
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateRange, setDateRange] = useState<any[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [supplierSummaries, setSupplierSummaries] = useState<Record<string, any>>({});

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

  // Load suppliers with pagination and search
  const loadSuppliers = async (search: string, prevOptions: any, { page }: any) => {
    try {
      const response = await axios.get(`${Base_url}/apis/pharmSupplier/get`, {
        params: {
          search: search || '',
          page: page || 1,
          limit: 20,
        }
      });

      const data = response.data.data || [];
      const options = data.map((supplier: any) => ({
        value: supplier._id,
        label: supplier.name,
        ...supplier
      }));

      return {
        options,
        hasMore: data.length === 20,
        additional: {
          page: page + 1,
        },
      };
    } catch (error) {
      console.error('Error loading suppliers:', error);
      return {
        options: [],
        hasMore: false,
      };
    }
  };

  // Legacy fetchSuppliers function
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

  const fetchSupplierSummary = async (supplierId: string) => {
    if (!supplierId) return;
    setSupplierSummaries(prev => ({ ...prev, [supplierId]: { ...prev[supplierId], loading: true } }));
    try {
      const params: any = {
        supplierId,
        limit: 1000,
      };
      if (dateRange.length === 2 && dateRange[0] && dateRange[1]) {
        params.from = dateRange[0].format('YYYY-MM-DD');
        params.to = dateRange[1].format('YYYY-MM-DD');
      }
      const res = await axios.get(`${Base_url}/apis/pharmPurchaseOrder/get`, { params });
      const orders: PurchaseOrder[] = res.data?.data || [];
      const totalOrders = orders.length;
      const totalAmount = orders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
      const statusCount = (s: string) => orders.filter(o => o.status === s).length;
      const pending = statusCount('Pending');
      const approved = statusCount('Approved');
      const ordered = statusCount('Ordered');
      const delivered = statusCount('Delivered');
      const cancelled = statusCount('Cancelled');
      const lastOrderDate = orders
        .map(o => new Date(o.orderDate).getTime())
        .reduce((a, b) => Math.max(a, b), 0);
      setSupplierSummaries(prev => ({
        ...prev,
        [supplierId]: {
          loading: false,
          totalOrders,
          totalAmount,
          pending,
          approved,
          ordered,
          delivered,
          cancelled,
          lastOrderDate: lastOrderDate ? new Date(lastOrderDate).toLocaleDateString() : null,
        }
      }));
    } catch {
      setSupplierSummaries(prev => ({ ...prev, [supplierId]: { loading: false, error: true } }));
    }
  };

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
          <AsyncPaginate
            placeholder="Select Supplier"
            value={selectedSupplier}
            onChange={(option) => {
              setSelectedSupplier(option);
              setSupplierFilter(option?.value || '');
            }}
            loadOptions={loadSuppliers}
            additional={{
              page: 1,
            }}
            debounceTimeout={300}
            defaultOptions
            isClearable
            className="w-48"
            styles={{
              control: (provided) => ({
                ...provided,
                minHeight: '32px',
                fontSize: '14px',
              }),
              menuPortal: (provided) => ({
                ...provided,
                zIndex: 999999,
              }),
            }}
            menuPortalTarget={document.body}
            menuPosition="fixed"
          />
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
          expandable={{
            expandedRowRender: (record: PurchaseOrder) => {
              const sid = record.supplierId?._id;
              const summary = supplierSummaries[sid] || {};
              return (
                <div className="bg-gray-50 p-4 rounded-md">
                  <div className="text-sm font-semibold text-gray-700 mb-3">
                    Supplier Business Summary
                  </div>
                  {summary.loading ? (
                    <div className="text-gray-500 text-sm">Loading...</div>
                  ) : summary.error ? (
                    <div className="text-red-600 text-sm">Failed to load summary</div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                      <div className="border rounded-md p-2">
                        <div className="text-xs text-gray-500">Total Orders</div>
                        <div className="text-base font-bold text-gray-800">{summary.totalOrders || 0}</div>
                      </div>
                      <div className="border rounded-md p-2">
                        <div className="text-xs text-gray-500">Total Amount</div>
                        <div className="text-base font-bold text-green-700">Rs. {(Number(summary.totalAmount) || 0).toLocaleString()}</div>
                      </div>
                      <div className="border rounded-md p-2">
                        <div className="text-xs text-gray-500">Pending</div>
                        <div className="text-base font-bold text-orange-600">{summary.pending || 0}</div>
                      </div>
                      <div className="border rounded-md p-2">
                        <div className="text-xs text-gray-500">Approved</div>
                        <div className="text-base font-bold text-blue-700">{summary.approved || 0}</div>
                      </div>
                      <div className="border rounded-md p-2">
                        <div className="text-xs text-gray-500">Delivered</div>
                        <div className="text-base font-bold text-emerald-700">{summary.delivered || 0}</div>
                      </div>
                      <div className="border rounded-md p-2">
                        <div className="text-xs text-gray-500">Last Order</div>
                        <div className="text-base font-bold text-gray-700">{summary.lastOrderDate || 'N/A'}</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            },
            onExpand: (expanded, record: PurchaseOrder) => {
              if (expanded && record.supplierId?._id) {
                const sid = record.supplierId._id;
                if (!supplierSummaries[sid] || (!supplierSummaries[sid].loading && supplierSummaries[sid].totalOrders === undefined)) {
                  fetchSupplierSummary(sid);
                }
              }
            },
            rowExpandable: (record: PurchaseOrder) => Boolean(record.supplierId?._id),
          }}
        />
      </div>

      {/* No Data Message */}
      
    </div>
  );
};

export default PurchaseOrderList;
