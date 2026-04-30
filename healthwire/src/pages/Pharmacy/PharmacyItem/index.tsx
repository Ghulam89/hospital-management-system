import React, { useEffect, useState } from 'react';
import { Table, Button, message, TablePaginationConfig, Input, Select, Modal, Spin, DatePicker } from 'antd';
import { useNavigate } from 'react-router-dom';
import { SearchOutlined, DownloadOutlined } from '@ant-design/icons';
import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import axios from 'axios';
import { FaCloudUploadAlt, FaRegEdit } from 'react-icons/fa';
import { RiDeleteBin5Line } from 'react-icons/ri';
import { ScanBarcode } from 'lucide-react';
import BarcodeScanner from '../../../components/BarcodeScanner';
import Swal from 'sweetalert2';
import { Base_url } from '../../../utils/Base_url';
import AddPharmacyItems from './AddPharmacyItems';
import UploadPharmacyItem from './UploadPharmacyItem';
import dayjs from 'dayjs';
import { getUserDataFromStorage, isSuperAdminRole, buildAxiosBranchScopedParams } from '../../../utils/branchScope';

const { Search } = Input;
const { RangePicker } = DatePicker;

// Types for pharmacy item and reference data
interface PharmacyItem {
  _id: string;
  name: string;
  pharmRackId?: { _id: string; name: string } | string | null;
  barcode: string;
  alternateBarcodes?: string[];
  pharmManufacturerId?: { _id: string; name: string } | string | null;
  pharmSupplierId?: { _id: string; name: string } | string | null;
  pharmCategoryId?: { _id: string; name: string } | string | null;
  unit: string;
  conversionUnit: number;
  reOrderLevel: number;
  retailPrice: number;
  openingStock: number;
  drugInteraction: string[];
  genericName: string;
  unitCost: number;
  pieceCost?: number;
  availableQuantity: number;
  expiredQuantity?: number;
  narcotic: boolean;
  active: boolean;
  /** Synced global catalog row with no branch stock row yet */
  catalogMasterOnly?: boolean;
  sellablePharmItemId?: string | null;
  catalogMasterId?: string | null;
}

interface PharmItemFlow {
  purchasedUnits?: number;
  netSoldUnits?: number;
}

const PharmacyItems: React.FC = () => {
  const navigate = useNavigate();
  const user = getUserDataFromStorage();
  const isSuperAdmin = isSuperAdminRole(user?.role);
  /** Table actions mirror header: edit/delete/upload only for super admin (same as Manufacturers page fix pattern). */
  const showPharmItemEdit = isSuperAdmin;
  const showPharmItemDelete = isSuperAdmin;

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [items, setItems] = useState<PharmacyItem[]>([]);
  const [racks, setRacks] = useState<any[]>([]);
  const [manufacturers, setManufacturers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [editingItem, setEditingItem] = useState<PharmacyItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [manufacturerFilter, setManufacturerFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [statusTab, setStatusTab] = useState<'all' | 'active' | 'inactive' | 'duplicates'>('active');
  const [isSearchScannerOpen, setIsSearchScannerOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsItem, setDetailsItem] = useState<PharmacyItem | null>(null);
  const [flowSummary, setFlowSummary] = useState<any | null>(null);
  const [purchaseDetails, setPurchaseDetails] = useState<any[]>([]);
  const [salesDetails, setSalesDetails] = useState<any[]>([]);
  const [auditDateRange, setAuditDateRange] = useState<any[]>([]);

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
      {
        key: 'odd',
        text: 'Select Odd Rows',
        onSelect: (changeableRowKeys: React.Key[]) => {
          let newSelectedRowKeys = changeableRowKeys.filter((_, index: number) => index % 2 !== 0);
          setSelectedRowKeys(newSelectedRowKeys);
        },
      },
      {
        key: 'even',
        text: 'Select Even Rows',
        onSelect: (changeableRowKeys: React.Key[]) => {
          let newSelectedRowKeys = changeableRowKeys.filter((_, index: number) => index % 2 === 0);
          setSelectedRowKeys(newSelectedRowKeys);
        },
      },
    ],
  };

  const handleToggleActive = async (item: PharmacyItem) => {
    if (!isSuperAdmin) {
      message.warning('Sirf super admin activate/deactivate kar sakta hai.');
      return;
    }
    try {
      const newStatus = !item.active;
      await axios.put(`${Base_url}/apis/pharmItem/update/${item._id}`, {
        active: newStatus,
      });
      message.success(`Item ${newStatus ? 'activated' : 'deactivated'} successfully`);
      fetchItems(currentPage, searchTerm, statusTab);
    } catch (error: any) {
      console.error('Error updating item status:', error);
      message.error(error.response?.data?.error || 'Failed to update item status');
    }
  };

  // Table columns (Toggle + Actions only for super admin — branches: view-only list)
  const allColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      sorter: (a: PharmacyItem, b: PharmacyItem) => a.name.localeCompare(b.name),
      render: (_: any, record: PharmacyItem) => {
        const meta = record as PharmacyItem & { catalogMasterOnly?: boolean };
        return (
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => openItemDetails(record)}
              className="text-left text-blue-600 hover:text-blue-800 underline decoration-dotted"
              title="View product details"
            >
              {record.name}
            </button>
         
          </div>
        );
      },
    },
    {
      title: 'Barcode',
      dataIndex: 'barcode',
      render: (_: any, record: PharmacyItem) => {
        const primary = record.barcode || '';
        const alternates = record.alternateBarcodes || [];
        return (
          <div className="flex flex-col">
            <span>{primary || '-'}</span>
            {alternates.length > 0 && (
              <span className="text-xs text-gray-500">
                {alternates.join(', ')}
              </span>
            )}
          </div>
        );
      },
      sorter: (a: PharmacyItem, b: PharmacyItem) => (a.barcode || '').localeCompare(b.barcode || ''),
    },
    {
      title: 'Rack',
      dataIndex: 'pharmRackId',
      render: (rack: any) => rack?.name || 'N/A',
      sorter: (a: PharmacyItem, b: PharmacyItem) => ((a.pharmRackId as any)?.name || '').localeCompare((b.pharmRackId as any)?.name || ''),
    },
    {
      title: 'Manufacturer',
      dataIndex: 'pharmManufacturerId',
      render: (manufacturer: any) => manufacturer?.name || 'N/A',
      sorter: (a: PharmacyItem, b: PharmacyItem) => ((a.pharmManufacturerId as any)?.name || '').localeCompare((b.pharmManufacturerId as any)?.name || ''),
    },
    {
      title: 'Category',
      dataIndex: 'pharmCategoryId',
      render: (category: any) => category?.name || 'N/A',
      sorter: (a: PharmacyItem, b: PharmacyItem) => ((a.pharmCategoryId as any)?.name || '').localeCompare((b.pharmCategoryId as any)?.name || ''),
    },
    {
      title: 'Stock (branch)',
      dataIndex: 'availableQuantity',
      render: (text: number) => text || 0,
      sorter: (a: PharmacyItem, b: PharmacyItem) => a.availableQuantity - b.availableQuantity,
    },
    {
      title: 'Retail Price',
      dataIndex: 'retailPrice',
      render: (text: number) => `${text?.toLocaleString() || '0'}`,
      sorter: (a: PharmacyItem, b: PharmacyItem) => a.retailPrice - b.retailPrice,
    },
    {
      title: 'Unit Cost',
      dataIndex: 'unitCost',
      render: (text: number) => `${text?.toLocaleString() || '0'}`,
      sorter: (a: PharmacyItem, b: PharmacyItem) => a.unitCost - b.unitCost,
    },
    {
      title: 'Status',
      dataIndex: 'active',
      render: (text: boolean) => (
        <span className={`px-2 py-1 rounded-full text-xs ${text ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {text ? 'Active' : 'Inactive'}
        </span>
      ),
      sorter: (a: PharmacyItem, b: PharmacyItem) => Number(a.active) - Number(b.active),
    },
    {
      title: 'Toggle',
      dataIndex: 'toggle',
      render: (_: any, record: PharmacyItem) => {
        return (
          <button
            type="button"
            onClick={() => handleToggleActive(record)}
            title={record.active ? 'Deactivate' : 'Activate'}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              record.active
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {record.active ? 'Deactivate' : 'Activate'}
          </button>
        );
      },
    },
    {
      title: 'Actions',
      dataIndex: 'action',
      fixed: 'right' as 'right',
      width: 100,
      render: (_: any, record: PharmacyItem) => (
        <div className="flex items-center gap-4">
          {showPharmItemEdit ? (
            <FaRegEdit
              color="blue"
              size={18}
              onClick={() => handleEdit(record)}
              className="cursor-pointer hover:text-blue-600"
              title="Edit Item"
            />
          ) : null}
          {showPharmItemDelete ? (
            <RiDeleteBin5Line
              color="red"
              size={18}
              onClick={() => handleDelete(record._id)}
              className="cursor-pointer hover:text-red-600"
              title="Delete Item"
            />
          ) : null}
        </div>
      ),
    },
  ];

  const columns = allColumns.filter((col) => {
    if (!isSuperAdmin && col.dataIndex === 'toggle') {
      return false;
    }
    if (col.dataIndex === 'action' && !showPharmItemEdit && !showPharmItemDelete) {
      return false;
    }
    return true;
  });

  // Fetch items
  const fetchItems = async (page: number, search = '', statusFilter?: 'all' | 'active' | 'inactive' | 'duplicates') => {
    try {
      setLoading(true);
      const params: string[] = [
        `page=${page}`,
        `limit=${pageSize}`,
        `search=${encodeURIComponent(search)}`,
      ];

      if (statusFilter === 'active') {
        params.push('active=true');
      } else if (statusFilter === 'inactive') {
        params.push('active=false');
      } else if (statusFilter === 'duplicates') {
        params.push('duplicates=true');
      }

      if (manufacturerFilter) {
        params.push(`pharmManufacturerId=${encodeURIComponent(manufacturerFilter)}`);
      }

      if (categoryFilter) {
        params.push(`pharmCategoryId=${encodeURIComponent(categoryFilter)}`);
      }
      if (supplierFilter) {
        params.push(`pharmSupplierId=${encodeURIComponent(supplierFilter)}`);
      }

      if ((statusFilter ?? statusTab) !== 'duplicates') {
        params.push('catalog=1');
      }

      const url = `${Base_url}/apis/pharmItem/get?${params.join('&')}`;
      const res = await axios.get(url);
      
      if (res.data && res.data.status === 'ok') {
        const list = res.data.data;
        setItems(Array.isArray(list) ? list : []);
        setTotalPages(res.data.totalPages || 1);
        setTotalItems(res.data.count || 0);
      } else {
        setItems([]);
        setTotalPages(1);
        setTotalItems(0);
      }
    } catch (error: any) {
      console.error('Error fetching items:', error);
      message.error(error.response?.data?.error || 'Failed to fetch pharmacy items');
      setItems([]);
      setTotalPages(1);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };

  // Fetch reference data
  const fetchReferenceData = async () => {
    try {
      const [racksRes, manufacturersRes, categoriesRes, suppliersRes] = await Promise.all([
        axios.get(`${Base_url}/apis/pharmRack/get`),
        axios.get(`${Base_url}/apis/pharmManufacturer/get`),
        axios.get(`${Base_url}/apis/pharmCategory/get`),
        axios.get(`${Base_url}/apis/pharmSupplier/get`),
      ]);
      setRacks(Array.isArray(racksRes.data?.data) ? racksRes.data.data : []);
      setManufacturers(Array.isArray(manufacturersRes.data?.data) ? manufacturersRes.data.data : []);
      setCategories(Array.isArray(categoriesRes.data?.data) ? categoriesRes.data.data : []);
      setSuppliers(Array.isArray(suppliersRes.data?.data) ? suppliersRes.data.data : []);
    } catch (error) {
      message.error('Failed to fetch reference data');
    }
  };

  useEffect(() => {
    fetchItems(currentPage, searchTerm, statusTab);
    fetchReferenceData();
    // eslint-disable-next-line
  }, [currentPage, searchTerm, statusTab, pageSize, manufacturerFilter, categoryFilter, supplierFilter]);

  // Table pagination change (Ant Design passes pagination as first arg)
  const handleTableChange = (pagination: TablePaginationConfig) => {
    const newPage = pagination.current || 1;
    const newPageSize = pagination.pageSize || pageSize;
    if (newPageSize !== pageSize) {
      setPageSize(newPageSize);
      setCurrentPage(1);
    } else {
      setCurrentPage(newPage);
    }
  };

  // Delete item
  const handleDelete = (id: string) => {
    Swal.fire({
      title: "Confirm Deletion",
      text: "Are you sure you want to delete this item? This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#4EC3BD",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        axios.delete(`${Base_url}/apis/pharmItem/delete/${id}`)
          .then((res) => {
            if (res.data.status === 'ok') {
              Swal.fire({
                title: "Deleted!",
                text: "Item has been deleted successfully.",
                icon: "success",
                confirmButtonColor: "#4EC3BD",
              });
              fetchItems(currentPage, searchTerm, statusTab);
            }
          })
          .catch((error) => {
            Swal.fire({
              title: "Error!",
              text: error.response?.data?.message || "Failed to delete item.",
              icon: "error",
              confirmButtonColor: "#4EC3BD",
            });
          });
      }
    });
  };

  // Edit item
  const handleEdit = (item: PharmacyItem) => {
    setEditingItem(item);
    setIsAddEditModalOpen(true);
  };

  // Add item
  const handleAdd = () => {
    setEditingItem(null);
    setIsAddEditModalOpen(true);
  };

  // Upload Excel
  const handleAddExcel = () => {
    setIsUploadModalOpen(true);
  };

  const openItemDetails = (item: PharmacyItem) => {
    const meta = item as PharmacyItem & { catalogMasterOnly?: boolean };
    if (meta.catalogMasterOnly && !isSuperAdmin) {
      message.info('Pehle branch par stock add karein (Manage Stock). Phir branch inventory row ka detail dekhein.');
      return;
    }
    navigate(`/admin/items/pharmacy/details/${item._id}`);
  };

  // Modal close
  const handleModalClose = () => {
    setIsAddEditModalOpen(false);
    setIsUploadModalOpen(false);
    setEditingItem(null);
  };

  // Search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const buildItemQueryParams = (page: number, limit: number, search = '', statusFilter?: 'all' | 'active' | 'inactive' | 'duplicates') => {
    const params: string[] = [
      `page=${page}`,
      `limit=${limit}`,
      `search=${encodeURIComponent(search)}`,
    ];

    if (statusFilter === 'active') {
      params.push('active=true');
    } else if (statusFilter === 'inactive') {
      params.push('active=false');
    } else if (statusFilter === 'duplicates') {
      params.push('duplicates=true');
    }

    if (manufacturerFilter) {
      params.push(`pharmManufacturerId=${encodeURIComponent(manufacturerFilter)}`);
    }

    if (categoryFilter) {
      params.push(`pharmCategoryId=${encodeURIComponent(categoryFilter)}`);
    }
    if (supplierFilter) {
      params.push(`pharmSupplierId=${encodeURIComponent(supplierFilter)}`);
    }

    if (statusFilter !== 'duplicates') {
      params.push('catalog=1');
    }

    const scoped = buildAxiosBranchScopedParams();
    Object.entries(scoped).forEach(([k, v]) => {
      if (v !== undefined && v !== '') {
        params.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
      }
    });

    return params;
  };

  const handleDownloadStockAudit = async () => {
    try {
      const d0 = auditDateRange?.[0];
      const d1 = auditDateRange?.[1];
      const hasAnyDate = Boolean(d0 || d1);
      const hasFullRange = Boolean(d0 && d1 && dayjs(d0).isValid() && dayjs(d1).isValid());
      if (hasAnyDate && !hasFullRange) {
        message.warning('Select both From and To dates for a filtered export, or clear the dates for all-time totals.');
        return;
      }

      setLoading(true);
      const exportLimit = 500;
      let page = 1;
      let count = 0;
      const allItems: PharmacyItem[] = [];

      // Fetch all items using current table filters for full audit export.
      do {
        const params = buildItemQueryParams(page, exportLimit, searchTerm, statusTab);
        const res = await axios.get(`${Base_url}/apis/pharmItem/get?${params.join('&')}`);
        const pageItems: PharmacyItem[] = res.data?.data || [];
        count = Number(res.data?.count) || 0;
        if (pageItems.length === 0) {
          break;
        }
        allItems.push(...pageItems);
        page += 1;
      } while (allItems.length < count);

      if (allItems.length === 0) {
        message.warning('No items found for audit export');
        return;
      }

      const ids = allItems.map((item) => item._id).filter(Boolean);
      // Backend allows max 100 itemIds per flow-summary request.
      const FLOW_CHUNK = 100;
      const flowData: Record<string, PharmItemFlow> = {};
      for (let i = 0; i < ids.length; i += FLOW_CHUNK) {
        const chunk = ids.slice(i, i + FLOW_CHUNK);
        const flowParams: Record<string, string> = {
          itemIds: chunk.join(','),
        };
        if (hasFullRange) {
          // Local start/end of day in ms (matches calendar; purchase uses inbound `date`, sales use `createdAt`).
          flowParams.fromMs = String(dayjs(d0).startOf('day').valueOf());
          flowParams.toMs = String(dayjs(d1).endOf('day').valueOf());
        }
        const flowRes = await axios.get(`${Base_url}/apis/pharmItem/flow-summary`, { params: flowParams });
        const chunkData = flowRes.data?.data || {};
        Object.assign(flowData, chunkData);
      }

      const escapeCsv = (value: string | number) => `"${String(value ?? '').replace(/"/g, '""')}"`;
      const headers = ['Item Name', 'Cost', 'Retail', 'Opening Stock', 'Available Qty', 'Total Sold', 'Total Purchase'];
      const rows = allItems.map((item) => {
        const flow = flowData[item._id] || {};
        return [
          escapeCsv(item.name || 'N/A'),
          escapeCsv(Number(item.unitCost) || 0),
          escapeCsv(Number(item.retailPrice) || 0),
          escapeCsv(Number(item.openingStock) || 0),
          escapeCsv(Number(item.availableQuantity) || 0),
          escapeCsv(Number(flow.netSoldUnits) || 0),
          escapeCsv(Number(flow.purchasedUnits) || 0),
        ].join(',');
      });

      const datePart =
        auditDateRange && auditDateRange.length === 2
          ? `${auditDateRange[0].format('YYYYMMDD')}-${auditDateRange[1].format('YYYYMMDD')}`
          : dayjs().format('YYYYMMDD');

      const csv = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `pharmacy-stock-audit-${datePart}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success('Stock audit downloaded successfully');
    } catch (error: any) {
      console.error('Stock audit download error:', error);
      const apiMsg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message;
      message.error(apiMsg ? `Stock audit failed: ${apiMsg}` : 'Failed to download stock audit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Breadcrumb pageName="Pharmacy Items" />
      
      <AddPharmacyItems
        isModalOpen={isAddEditModalOpen}
        setIsModalOpen={handleModalClose}
        fetchItems={() => fetchItems(currentPage, searchTerm, statusTab)}
        selectedItem={editingItem}
        racks={racks}
        manufacturers={manufacturers}
        suppliers={suppliers}
        categories={categories}
      />

      {/* Upload Excel Modal */}
      <UploadPharmacyItem
        isModalOpen={isUploadModalOpen}
        setIsModalOpen={handleModalClose}
        fetchItems={() => fetchItems(currentPage, searchTerm, statusTab)}
        selectedItem={editingItem}
        racks={racks}
        manufacturers={manufacturers}
        suppliers={suppliers}
        categories={categories}
      />

      {/* Header Actions */}
      <div className="mb-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            {/* Product Status Tabs */}
      <div className="flex mb-4 p-1  bg-white rounded-lg shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => { setStatusTab('all'); setCurrentPage(1); }}
          className={`px-5 py-3 text-sm rounded-lg font-medium transition-colors ${
            statusTab === 'all'
              ? 'bg-primary text-white'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          All Items
        </button>
        <button
          type="button"
          onClick={() => { setStatusTab('active'); setCurrentPage(1); }}
          className={`px-5 py-3 text-sm rounded-lg font-medium transition-colors ${
            statusTab === 'active'
              ? 'bg-primary text-white border-b-2 border-primary'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          Active
        </button>
        <button
          type="button"
          onClick={() => { setStatusTab('inactive'); setCurrentPage(1); }}
          className={`px-5 py-3 text-sm rounded-lg font-medium transition-colors ${
            statusTab === 'inactive'
              ? 'bg-primary text-white border-b-2 border-primary'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          Inactive
        </button>
        <button
          type="button"
          onClick={() => { setStatusTab('duplicates'); setCurrentPage(1); }}
          className={`px-5 py-3 text-sm rounded-lg font-medium transition-colors ${
            statusTab === 'duplicates'
              ? 'bg-primary text-white border-b-2 border-primary'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          Duplicates
        </button>
      </div>
        <div className="flex items-center gap-4">
          {isSuperAdmin ? (
            <>
              <button
                onClick={handleAddExcel}
                className="inline-flex items-center justify-center gap-2.5 rounded-md bg-primary py-3 px-6 text-center font-medium text-white hover:bg-opacity-90 transition-colors duration-200"
              >
                <FaCloudUploadAlt className=" text-white" />
                Upload Excel
              </button>

              <button
                onClick={handleAdd}
                className="inline-flex items-center justify-center gap-2.5 rounded-md bg-primary py-3 px-6 text-center font-medium text-white hover:bg-opacity-90 transition-colors duration-200"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="currentColor"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
                </svg>
                Add Item
              </button>
            </>
          ) : null}
        </div>
     
      </div>

     

      {/* Filter Section */}
      <div className="bg-white rounded shadow-sm border border-gray-100 border p-4 mb-5">
        <div className="flex items-center mb-4">
          <svg className="w-5 h-5 text-primary mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <h4 className="text-sm font-semibold text-gray-700">Filter & Search</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex flex-col md:col-span-1 lg:col-span-2">
            <label className="text-xs font-medium text-gray-600 mb-1.5 flex items-center">
              <svg className="w-3.5 h-3.5 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search Items
            </label>
            <div className="flex gap-2">
              <Search
                placeholder="Search by item name, barcode, or generic name..."
                value={searchTerm}
                onChange={(e) => handleSearch(e)}
                onSearch={(value) => {
                  setSearchTerm(value);
                  setCurrentPage(1);
                }}
                allowClear
                className="w-full"
                enterButton={<SearchOutlined />}
              />
              <Button
                type="default"
                onClick={() => setIsSearchScannerOpen(true)}
                icon={<ScanBarcode size={18} />}
              />
            </div>
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-600 mb-1.5">Manufacturer</label>
            <Select
              value={manufacturerFilter || undefined}
              onChange={(val) => {
                setManufacturerFilter(val || '');
                setCurrentPage(1);
              }}
              allowClear
              showSearch
              placeholder="All"
              className="w-full"
              filterOption={(input, option) =>
                ((option?.label as string) || '').toLowerCase().includes(input.toLowerCase())
              }
              options={[
                ...manufacturers.map((m: any) => ({ value: m?._id, label: m?.name })),
              ]}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-600 mb-1.5">Category</label>
            <Select
              value={categoryFilter || undefined}
              onChange={(val) => {
                setCategoryFilter(val || '');
                setCurrentPage(1);
              }}
              allowClear
              showSearch
              placeholder="All"
              className="w-full"
              filterOption={(input, option) =>
                ((option?.label as string) || '').toLowerCase().includes(input.toLowerCase())
              }
              options={[
                ...categories.map((c: any) => ({ value: c?._id, label: c?.name })),
              ]}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-600 mb-1.5">Supplier</label>
            <Select
              value={supplierFilter || undefined}
              onChange={(val) => {
                setSupplierFilter(val || '');
                setCurrentPage(1);
              }}
              allowClear
              showSearch
              placeholder="All"
              className="w-full"
              filterOption={(input, option) =>
                ((option?.label as string) || '').toLowerCase().includes(input.toLowerCase())
              }
              options={[
                ...suppliers.map((s: any) => ({ value: s?._id, label: s?.name })),
              ]}
            />
          </div>
        </div>
      </div>

      {/* Table container with z-index/overflow fix */}
      <div className="rounded-lg border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark relative" style={{ zIndex: 1, overflow: 'visible' }}>
        {/* Table Header with Excel Upload Button */}
        <div className="p-4 border-b border-stroke dark:border-strokedark flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Pharmacy Items List</h2>
          <div className="flex flex-wrap items-center gap-2">
            <RangePicker
              value={auditDateRange as any}
              onChange={(dates) => setAuditDateRange(dates || [])}
              placeholder={['From Date', 'To Date']}
              format="DD/MM/YYYY"
            />
            <Button icon={<DownloadOutlined />} onClick={handleDownloadStockAudit}>
              Download Stock Audit
            </Button>
            {isSuperAdmin ? (
              <button
                onClick={handleAddExcel}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-primary py-2 px-4 text-sm font-medium text-white hover:bg-opacity-90 transition-colors duration-200"
                title="Upload Excel File"
              >
                <FaCloudUploadAlt className="text-white" size={16} />
                Upload Excel
              </button>
            ) : null}
          </div>
        </div>
        
        <Table
          rowKey="_id"
          rowSelection={isSuperAdmin ? rowSelection : undefined}
          columns={columns}
          dataSource={items}
          pagination={{ 
            current: currentPage, 
            pageSize: pageSize, 
            total: totalItems,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
          }}
          onChange={handleTableChange}
          loading={loading}
          scroll={{ x: true }}
          bordered
          size="middle"
          className="custom-table"
        />
      </div>
      <BarcodeScanner
        isOpen={isSearchScannerOpen}
        onClose={() => setIsSearchScannerOpen(false)}
        onScan={(code) => {
          setSearchTerm(code);
          setCurrentPage(1);
        }}
        title="Scan To Search Item"
      />
    </>
  );
};

export default PharmacyItems;
