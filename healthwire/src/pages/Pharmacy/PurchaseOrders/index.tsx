import React, { useEffect, useState } from 'react';
import { Table, Button, message, Tag, Space, Input, Select, DatePicker } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import axios from 'axios';
import { FaRegEdit, FaEye } from 'react-icons/fa';
import { RiDeleteBin5Line } from 'react-icons/ri';
import { FiDownload, FiPrinter, FiPlus } from 'react-icons/fi';
import Swal from 'sweetalert2';
import { Base_url } from '../../../utils/Base_url';
import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import { Link, useNavigate } from 'react-router-dom';
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
  // Optional fields (present in PO details endpoint)
  projectDays?: number;
  zeroQuantity?: boolean;
  unit?: string;
  notes?: string;
}

type SupplierOption = {
  label: string;
  value: string;
  supplierData?: {
    _id: string;
    name: string;
    phone?: string;
  };
};

type ManufacturerOption = {
  label: string;
  value: string;
  manufacturerData?: {
    _id: string;
    name: string;
  };
};

const PharmacyPurchaseOrders: React.FC = () => {
  const navigate = useNavigate();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierOption | null>(null);
  const [manufacturerFilter, setManufacturerFilter] = useState('');
  const [selectedManufacturer, setSelectedManufacturer] = useState<ManufacturerOption | null>(null);
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);
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
        ...(manufacturerFilter && { manufacturerId: manufacturerFilter }),
        ...(dateRange && dateRange[0] && dateRange[1] && {
          from: dateRange[0].format('YYYY-MM-DD'),
          to: dateRange[1].format('YYYY-MM-DD')
        })
      });

      const response = await axios.get(`${Base_url}/apis/pharmPurchaseOrder/get?${params}`);
      const rawData = response.data?.data || [];
      const filteredByManufacturer =
        manufacturerFilter
          ? rawData.filter((order: any) => {
              const items = order?.items || [];
              const manufacturerName = selectedManufacturer?.label?.toLowerCase?.() || '';
              return items.some((item: any) => {
                const ref =
                  item?.pharmItemId?.pharmManufacturerId ??
                  item?.pharmItemId?.manufacturerId ??
                  item?.pharmManufacturerId ??
                  item?.manufacturerId;
                const id =
                  typeof ref === 'object' && ref !== null ? String(ref?._id || '') : String(ref || '');
                if (id && id === manufacturerFilter) return true;

                const nameFromRef =
                  typeof ref === 'object' && ref !== null ? String(ref?.name || '') : '';
                const name =
                  String(item?.manufacturerName || nameFromRef || '').toLowerCase();
                return !!manufacturerName && name === manufacturerName;
              });
            })
          : rawData;

      setPurchaseOrders(filteredByManufacturer);
      setTotalPages(response.data.totalPages || 1);
      
      // Calculate grand total
      const total =
        filteredByManufacturer?.reduce(
          (sum: number, order: PurchaseOrder) => sum + order.totalAmount,
          0
        ) || 0;
      setGrandTotal(total);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      message.error('Failed to fetch purchase orders');
    } finally {
      setLoading(false);
    }
  };

  const loadSupplierOptions: LoadOptions<SupplierOption, false, { page: number }> = async (
    searchQuery,
    _loadedOptions,
    additional,
  ) => {
    const page = additional?.page || 1;
    try {
      const response = await axios.get(`${Base_url}/apis/pharmSupplier/get`, {
        params: {
          page,
          limit: 20,
          search: searchQuery || '',
        },
      });

      const raw = response.data || {};
      const data = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw?.data?.data) ? raw.data.data : [];
      const totalPages = Number(raw?.totalPages || raw?.data?.totalPages || 1);
      const currentPage = Number(raw?.currentPage || raw?.page || page);

      return {
        options: data.map((supplier: any) => ({
          label: `${supplier.name}${supplier.phone ? ` - ${supplier.phone}` : ''}`,
          value: supplier._id,
          supplierData: supplier,
        })),
        hasMore: currentPage < totalPages,
        additional: { page: currentPage + 1 },
      };
    } catch {
      return { options: [], hasMore: false, additional: { page } };
    }
  };

  const loadManufacturerOptions: LoadOptions<ManufacturerOption, false, { page: number }> = async (
    searchQuery,
    _loadedOptions,
    additional,
  ) => {
    const page = additional?.page || 1;
    try {
      const response = await axios.get(`${Base_url}/apis/pharmManufacturer/get`, {
        params: {
          page,
          limit: 20,
          search: searchQuery || '',
        },
      });

      const raw = response.data || {};
      const data = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw?.data?.data) ? raw.data.data : [];
      const totalPages = Number(raw?.totalPages || raw?.data?.totalPages || 1);
      const currentPage = Number(raw?.currentPage || raw?.page || page);

      return {
        options: data.map((m: any) => ({
          label: m.name,
          value: m._id,
          manufacturerData: m,
        })),
        hasMore: currentPage < totalPages,
        additional: { page: currentPage + 1 },
      };
    } catch {
      return { options: [], hasMore: false, additional: { page } };
    }
  };

  useEffect(() => {
    fetchPurchaseOrders();
  }, [currentPage, searchTerm, supplierFilter, manufacturerFilter, dateRange]);

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
      width: 150,
      render: (status: string, record: PurchaseOrder) => {
        const colorMap: { [key: string]: string } = {
          'Draft': 'default',
          'Pending': 'processing',
          'Approved': 'success',
          'Ordered': 'warning',
          'Delivered': 'success',
          'Cancelled': 'error',
        };
        
        const handleStatusChange = async (newStatus: string) => {
          try {
            await axios.put(`${Base_url}/apis/pharmPurchaseOrder/update/${record._id}`, {
              status: newStatus
            });
            message.success('Status updated successfully');
            fetchPurchaseOrders();
          } catch (error) {
            console.error('Error updating status:', error);
            message.error('Failed to update status');
          }
        };
        
        return (
          <Select
            value={status}
            onChange={handleStatusChange}
            style={{ width: '100%' }}
            size="small"
          >
            <Option value="Draft">
              <Tag color="default">Draft</Tag>
            </Option>
            <Option value="Pending">
              <Tag color="processing">Pending</Tag>
            </Option>
            <Option value="Approved">
              <Tag color="success">Approved</Tag>
            </Option>
            <Option value="Ordered">
              <Tag color="warning">Ordered</Tag>
            </Option>
            <Option value="Delivered">
              <Tag color="success">Delivered</Tag>
            </Option>
            <Option value="Cancelled">
              <Tag color="error">Cancelled</Tag>
            </Option>
          </Select>
        );
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
      render: (_: any, record: PurchaseOrder) => (
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
    navigate(`/admin/pharmacy/purchase-orders/view/${record._id}`);
  };

  const handleEdit = (record: PurchaseOrder) => {
    // Navigate to edit page with the purchase order ID
    window.location.href = `/admin/pharmacy/purchase-orders/edit/${record._id}`;
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
    // Navigate to add purchase order page
    window.location.href = '/admin/pharmacy/purchase-orders/add';
  };

  const handleAddOrderList = () => {
    // Implement bulk order list functionality
    console.log('Add Order List');
  };

  return (
<>
<Breadcrumb pageName="Purchase Orders" />
    
    {/* Tabs */}
    <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100 overflow-hidden">      {/* Header */}
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
            <Link to={'/admin/pharmacy/purchase-orders/add'}>
            <Button
              type="default"
              icon={<FiPlus />}
              // onClick={handleAddPurchaseOrder}
              className="flex items-center gap-2"
            >
              + Add Purchase Order
            </Button>
            </Link>
            {/* <Button
              type="default"
              icon={<FiPlus />}
              onClick={handleAddOrderList}
              className="flex items-center gap-2"
            >
              ▲ Add Order List
            </Button> */}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-4">
          <div className="flex items-center mb-4">
            <svg className="w-5 h-5 text-primary mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <h4 className="text-sm font-semibold text-gray-700">Filter & Search</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Range Filter */}
            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-600 mb-1.5 flex items-center">
                <svg className="w-3.5 h-3.5 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Date Range
              </label>
              <RangePicker
                value={dateRange}
                onChange={(dates) => {
                  setDateRange(dates);
                  setCurrentPage(1);
                }}
                placeholder={['From Date', 'To Date']}
                className="w-full"
                format="DD/MM/YYYY"
              />
            </div>

            {/* Search Filter */}
            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-600 mb-1.5 flex items-center">
                <svg className="w-3.5 h-3.5 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search
              </label>
              <Search
                placeholder="Search by Item Name or PO #"
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
                allowClear
                className="w-full"
                enterButton={<SearchOutlined />}
              />
            </div>

            {/* Supplier Filter */}
            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-600 mb-1.5 flex items-center">
                <svg className="w-3.5 h-3.5 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Supplier
              </label>
              <div className="w-full">
                <AsyncPaginate
                  value={selectedSupplier}
                  loadOptions={loadSupplierOptions}
                  onChange={(opt) => {
                    const option = (opt as SupplierOption | null) || null;
                    setSelectedSupplier(option);
                    setSupplierFilter(option?.value || '');
                    setCurrentPage(1);
                  }}
                  additional={{ page: 1 }}
                  placeholder="Select Supplier"
                  classNamePrefix="react-select"
                  className="w-full"
                  debounceTimeout={400}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  styles={{
                    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                    control: (base) => ({ ...base, minHeight: '40px' }),
                  }}
                  isClearable
                />
              </div>
            </div>

            {/* Manufacturer Filter */}
            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-600 mb-1.5 flex items-center">
                <svg className="w-3.5 h-3.5 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Manufacturer
              </label>
              <div className="w-full">
                <AsyncPaginate
                  value={selectedManufacturer}
                  loadOptions={loadManufacturerOptions}
                  onChange={(opt) => {
                    const option = (opt as ManufacturerOption | null) || null;
                    setSelectedManufacturer(option);
                    setManufacturerFilter(option?.value || '');
                    setCurrentPage(1);
                  }}
                  additional={{ page: 1 }}
                  placeholder="Select Manufacturer"
                  classNamePrefix="react-select"
                  className="w-full"
                  debounceTimeout={400}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  styles={{
                    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                    control: (base) => ({ ...base, minHeight: '40px' }),
                  }}
                  isClearable
                />
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Purchase Orders */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600 font-medium mb-1">Total Purchase Orders</p>
                <p className="text-2xl font-bold text-blue-700">
                  {purchaseOrders.length.toLocaleString()}
                </p>
              </div>
              <div className="bg-blue-200 p-3 rounded-full">
                <svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Grand Total */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-600 font-medium mb-1">Grand Total</p>
                <p className="text-2xl font-bold text-green-700">
                  Rs. {grandTotal.toLocaleString()}
                </p>
              </div>
              <div className="bg-green-200 p-3 rounded-full">
                <svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Pending Orders */}
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-orange-600 font-medium mb-1">Pending Orders</p>
                <p className="text-2xl font-bold text-orange-700">
                  {purchaseOrders.filter(po => po.status === 'Pending').length.toLocaleString()}
                </p>
              </div>
              <div className="bg-orange-200 p-3 rounded-full">
                <svg className="w-6 h-6 text-orange-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
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

</>
  );
};

export default PharmacyPurchaseOrders;

