import React, { useEffect, useState, useRef } from 'react';
import { Table, Button, message, Input, Select, DatePicker, Space, Modal } from 'antd';
import { PlusOutlined, DownloadOutlined, PrinterOutlined, EyeOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Base_url } from '../../../utils/Base_url';
import { Dayjs } from 'dayjs';
import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import * as XLSX from 'xlsx';
import { useReactToPrint } from 'react-to-print';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

// Types for pharmacy stock data
interface PharmacyStock {
  _id: string;
  documentNumber: string;
  supplierId: {
    _id: string;
    name: string;
    phone: string;
  };
  supplierInvoiceDate: string;
  supplierInvoiceNumber: string;
  createdAt: string;
  items: PharmacyStockItem[];
  totalCost: number;
  totalQuantity: number;
  status: string;
}

interface PharmacyStockItem {
  _id: string;
  pharmItemId: {
    _id: string;
    name: string;
    manufacturer: string;
    b2bCategory: string;
    conversionUnit: number;
    unit: string;
    unitCost: number;
    retailPrice: number;
  };
  quantity: number;
  looseUnitQty: number;
  unitCost: number;
  totalCost: number;
  batchNumber: string;
  expiryDate: string;
  rack: string;
}

const PharmacyStocks: React.FC = () => {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [stocks, setStocks] = useState<PharmacyStock[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [manufacturers, setManufacturers] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [manufacturerFilter, setManufacturerFilter] = useState('');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [totalInboundedPrice, setTotalInboundedPrice] = useState(0);
  const [netPurchase, setNetPurchase] = useState(0);
  const [printPreviewVisible, setPrintPreviewVisible] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

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

  // Table columns for stock documents
  const columns = [
    {
      title: 'Document #',
      dataIndex: 'documentNumber',
      key: 'documentNumber',
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
      render: (_: string, record: any) => {
        const supplier = record.supplierId;
        return (
          <div>
            <div className="font-medium">{supplier?.name || 'N/A'}</div>
            <div className="text-sm text-gray-500">{supplier?.phone || ''}</div>
          </div>
        );
      },
    },
    {
      title: 'SKUs',
      dataIndex: 'items',
      key: 'skus',
      width: 80,
      render: (items: PharmacyStockItem[]) => (
        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
          {items?.length || 0}
        </span>
      ),
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (text: string) => new Date(text).toLocaleDateString(),
    },
    {
      title: 'Supplier Invoice Date',
      dataIndex: 'supplierInvoiceDate',
      key: 'supplierInvoiceDate',
      width: 120,
      render: (text: string) => {
        if (!text) return 'N/A';
        try {
          return new Date(text).toLocaleDateString();
        } catch (e) {
          return 'Invalid Date';
        }
      },
    },
    {
      title: 'Supplier Invoice#',
      dataIndex: 'supplierInvoiceNumber',
      key: 'supplierInvoiceNumber',
      width: 120,
    },
    {
      title: 'Total Cost',
      dataIndex: 'totalCost',
      key: 'totalCost',
      width: 120,
      render: (amount: number, record: any) => {
        // Calculate total cost from items if available
        const calculatedTotal = record.items?.reduce((sum: number, item: any) => sum + (item.totalCost || 0), 0) || 0;
        const displayAmount = amount || calculatedTotal;
        return (
          <span className="font-semibold text-green-600">
            Rs. {displayAmount > 0 ? displayAmount.toLocaleString() : '0'}
          </span>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: any, record: PharmacyStock) => (
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

  // Fetch stock documents
  const fetchStocks = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage.toString(),
        limit: '20',
      };
      
      if (searchTerm) {
        params.search = searchTerm;
      }
      
      if (supplierFilter) {
        params.supplierId = supplierFilter;
      }
      
      if (manufacturerFilter) {
        params.manufacturerId = manufacturerFilter;
      }
      
      if (dateRange[0] && dateRange[1]) {
        params.fromDate = dateRange[0].format('YYYY-MM-DD');
        params.toDate = dateRange[1].format('YYYY-MM-DD');
      }

      const queryString = new URLSearchParams(params).toString();
      const response = await axios.get(`${Base_url}/apis/pharmAddStock/get?${queryString}`);
      
      const stocksData = response.data.data || [];
      setStocks(stocksData);
      setTotalPages(response.data.totalPages || 1);
      
      // Calculate totals from filtered results
      const inboundedPrice = stocksData.reduce((sum: number, stock: PharmacyStock) => sum + (stock.totalCost || 0), 0);
      setTotalInboundedPrice(inboundedPrice);
      setNetPurchase(inboundedPrice);
    } catch (error) {
      console.error('Error fetching stocks:', error);
      message.error('Failed to fetch pharmacy stocks');
    } finally {
      setLoading(false);
    }
  };

  // Fetch reference data
  const fetchReferenceData = async () => {
    try {
      const [suppliersRes, manufacturersRes] = await Promise.all([
        axios.get(`${Base_url}/apis/pharmSupplier/get`),
        axios.get(`${Base_url}/apis/pharmManufacturer/get`)
      ]);
      setSuppliers(suppliersRes.data.data || []);
      setManufacturers(manufacturersRes.data.data || []);
    } catch (error) {
      console.error('Error fetching reference data:', error);
    }
  };

  useEffect(() => {
    fetchReferenceData();
  }, []);

  useEffect(() => {
    fetchStocks();
    // eslint-disable-next-line
  }, [currentPage, searchTerm, supplierFilter, manufacturerFilter, dateRange]);


  const handleView = (record: PharmacyStock) => {
    Swal.fire({
      title: 'Stock Document Details',
      html: `
        <div class="text-left" style="font-size: 14px;">
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <p style="margin: 8px 0;"><strong>Document #:</strong> ${record.documentNumber}</p>
            <p style="margin: 8px 0;"><strong>Supplier:</strong> ${record.supplierId?.name}</p>
            <p style="margin: 8px 0;"><strong>Phone:</strong> ${record.supplierId?.phone}</p>
            <p style="margin: 8px 0;"><strong>Created:</strong> ${new Date(record.createdAt).toLocaleDateString()}</p>
            <p style="margin: 8px 0;"><strong>Invoice Date:</strong> ${new Date(record.supplierInvoiceDate).toLocaleDateString()}</p>
            <p style="margin: 8px 0;"><strong>Invoice #:</strong> ${record.supplierInvoiceNumber}</p>
          </div>
          
          <div style="background: #dbeafe; padding: 15px; border-radius: 8px;">
            <h4 style="margin-top: 0; color: #1e40af;">Items (${record.items?.length || 0})</h4>
            ${record.items?.map((item, index) => `
              <div style="border-bottom: 1px solid #e5e7eb; padding: 8px 0;">
                <p style="margin: 4px 0;"><strong>${index + 1}. ${item.pharmItemId?.name}</strong></p>
                <p style="margin: 4px 0;">Manufacturer: ${item.pharmItemId?.manufacturer || 'N/A'}</p>
                <p style="margin: 4px 0;">Quantity: ${(() => {
                  const conversionUnit = item.pharmItemId?.conversionUnit || 1;
                  const totalQty = item.quantity || 0;
                  const packQty = Math.floor(totalQty / conversionUnit);
                  const pieceQty = totalQty % conversionUnit;
                  if (conversionUnit > 1 && pieceQty > 0) {
                    return `${packQty} ${item.pharmItemId?.unit || 'pack'} ${pieceQty} piece`;
                  } else if (conversionUnit > 1) {
                    return `${packQty} ${item.pharmItemId?.unit || 'pack'}`;
                  } else {
                    return `${totalQty} ${item.pharmItemId?.unit || 'pack'}`;
                  }
                })()}</p>
                <p style="margin: 4px 0;">Unit Cost: Rs. ${item.unitCost}</p>
                <p style="margin: 4px 0;">Total Cost: Rs. ${item.totalCost}</p>
                ${item.batchNumber ? `<p style="margin: 4px 0;">Batch: ${item.batchNumber}</p>` : ''}
                ${item.expiryDate ? `<p style="margin: 4px 0;">Expiry: ${new Date(item.expiryDate).toLocaleDateString()}</p>` : ''}
              </div>
            `).join('') || '<p>No items found</p>'}
          </div>
          
          <div style="background: #dcfce7; padding: 15px; border-radius: 8px; margin-top: 15px;">
            <h4 style="margin-top: 0; color: #16a34a;">Summary</h4>
            <p style="margin: 8px 0;"><strong>Total Cost:</strong> Rs. ${record.totalCost.toLocaleString()}</p>
            <p style="margin: 8px 0;"><strong>Total Quantity:</strong> ${record.totalQuantity}</p>
          </div>
        </div>
      `,
      showCloseButton: true,
      width: 700,
    });
  };

  const handleEdit = (record: PharmacyStock) => {
    // Navigate to edit page or open edit modal
    console.log('Edit stock:', record);
  };

  const handleDelete = async (record: PharmacyStock) => {
    try {
      const result = await Swal.fire({
        title: 'Delete Stock Document?',
        text: `Are you sure you want to delete document ${record.documentNumber}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, Delete',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#ef4444',
      });

      if (result.isConfirmed) {
        await axios.delete(`${Base_url}/apis/pharmAddStock/delete/${record._id}`);
        message.success('Stock document deleted successfully');
        fetchStocks();
      }
    } catch (error) {
      console.error('Error deleting stock:', error);
      message.error('Failed to delete stock document');
    }
  };

  const handleExcelExport = () => {
    try {
      if (stocks.length === 0) {
        message.warning('No data to export');
        return;
      }

      // Prepare data for export
      const exportData = stocks.map((stock) => ({
        'Document #': stock.documentNumber || '',
        'Supplier': stock.supplierId?.name || '',
        'Supplier Phone': stock.supplierId?.phone || '',
        'SKUs': stock.items?.length || 0,
        'Created At': new Date(stock.createdAt).toLocaleDateString(),
        'Supplier Invoice Date': stock.supplierInvoiceDate ? new Date(stock.supplierInvoiceDate).toLocaleDateString() : '',
        'Supplier Invoice #': stock.supplierInvoiceNumber || '',
        'Total Cost': stock.totalCost || 0,
        'Status': stock.status || 'Active',
      }));

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Set column widths
      const columnWidths = [
        { wch: 15 }, // Document #
        { wch: 25 }, // Supplier
        { wch: 15 }, // Supplier Phone
        { wch: 8 },  // SKUs
        { wch: 12 }, // Created At
        { wch: 18 }, // Supplier Invoice Date
        { wch: 18 }, // Supplier Invoice #
        { wch: 15 }, // Total Cost
        { wch: 12 }, // Status
      ];
      ws['!cols'] = columnWidths;

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Stock Documents');

      // Generate filename with current date
      const fileName = `Stock_Documents_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      // Export file
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
    documentTitle: 'Stock Documents Report',
    onBeforeGetContent: () => {
      return Promise.resolve();
    },
    onAfterPrint: () => {
      setPrintPreviewVisible(false);
      message.success('Print completed');
    },
  } as any);

  const handleAddStock = () => {
    // Navigate to add stock page
    window.location.href = '/admin/pharmacy/stocks/new';
  };

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-6">
      <Breadcrumb pageName="Manage Stock" />
      
      

      {/* Header Actions */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-bold text-gray-800 flex items-center">
              <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Stock Documents
            </h4>
            <div className="flex items-center gap-2">
              <Button
                icon={<DownloadOutlined />}
                onClick={handleExcelExport}
                className="bg-green-100 hover:bg-green-200 text-green-700 border-green-300 rounded-lg flex items-center gap-2"
              >
                Excel
              </Button>
              <Button
                icon={<PrinterOutlined />}
                onClick={handlePrint}
                className="bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-300 rounded-lg flex items-center gap-2"
              >
                Print
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddStock}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 border-none rounded-lg flex items-center gap-2 shadow-md"
              >
                + Add New Stock
              </Button>
            </div>
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
                  setDateRange(dates as [Dayjs | null, Dayjs | null]);
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
                Search Document
              </label>
              <Search
                placeholder="Search by Document No..."
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
              <Select
                placeholder="Select Supplier"
                value={supplierFilter}
                onChange={(value) => {
                  setSupplierFilter(value || '');
                  setCurrentPage(1);
                }}
                className="w-full"
                allowClear
                showSearch
                filterOption={(input, option) =>
                  (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                }
              >
                {suppliers.map(supplier => (
                  <Option key={supplier._id} value={supplier._id}>
                    {supplier.name}
                  </Option>
                ))}
              </Select>
            </div>

            {/* Manufacturer Filter */}
            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-600 mb-1.5 flex items-center">
                <svg className="w-3.5 h-3.5 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Manufacturer
              </label>
              <Select
                placeholder="Select Manufacturer"
                value={manufacturerFilter}
                onChange={(value) => {
                  setManufacturerFilter(value || '');
                  setCurrentPage(1);
                }}
                className="w-full"
                allowClear
                showSearch
                filterOption={(input, option) =>
                  (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                }
              >
                {manufacturers.map(manufacturer => (
                  <Option key={manufacturer._id} value={manufacturer._id}>
                    {manufacturer.name}
                  </Option>
                ))}
              </Select>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Total Inbounded Price */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600 font-medium mb-1">Total Inbounded Price</p>
                <p className="text-2xl font-bold text-blue-700">
                  Rs. {totalInboundedPrice.toLocaleString()}
                </p>
              </div>
              <div className="bg-blue-200 p-3 rounded-full">
                <svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Net Purchase */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-600 font-medium mb-1">Net Purchase</p>
                <p className="text-2xl font-bold text-green-700">
                  Rs. {netPurchase.toLocaleString()}
                </p>
              </div>
              <div className="bg-green-200 p-3 rounded-full">
                <svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="max-w-full overflow-x-auto">
          <Table
            rowSelection={rowSelection}
            columns={columns}
            dataSource={stocks}
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
            className="custom-table"
          />
        </div>

        
      </div>

      {/* Print Preview Modal */}
      <Modal
        title="Print Preview - Stock Documents"
        open={printPreviewVisible}
        onCancel={() => setPrintPreviewVisible(false)}
        width={1200}
        footer={[
          <Button key="cancel" onClick={() => setPrintPreviewVisible(false)}>
            Cancel
          </Button>,
          <Button 
            key="print" 
            type="primary" 
            icon={<PrinterOutlined />} 
            onClick={() => {
              if (printRef.current) {
                handlePrintConfirm();
              } else {
                message.error('Print content not ready. Please try again.');
              }
            }}
          >
            Print
          </Button>,
        ]}
      >
        <div ref={printRef} className="print-preview-content">
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold">Holistic Care</h2>
            <p className="text-gray-600">Stock Documents Report</p>
            <p className="text-sm text-gray-500">
              Generated on: {new Date().toLocaleString()}
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded border border-blue-200">
              <p className="text-sm text-blue-600 font-medium mb-1">Total Inbounded Price</p>
              <p className="text-2xl font-bold text-blue-700">
                Rs. {totalInboundedPrice.toLocaleString()}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded border border-green-200">
              <p className="text-sm text-green-600 font-medium mb-1">Net Purchase</p>
              <p className="text-2xl font-bold text-green-700">
                Rs. {netPurchase.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Table */}
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-3 py-2 text-left text-xs font-bold">Document #</th>
                <th className="border border-gray-300 px-3 py-2 text-left text-xs font-bold">Supplier</th>
                <th className="border border-gray-300 px-3 py-2 text-left text-xs font-bold">SKUs</th>
                <th className="border border-gray-300 px-3 py-2 text-left text-xs font-bold">Created At</th>
                <th className="border border-gray-300 px-3 py-2 text-left text-xs font-bold">Invoice Date</th>
                <th className="border border-gray-300 px-3 py-2 text-left text-xs font-bold">Invoice #</th>
                <th className="border border-gray-300 px-3 py-2 text-left text-xs font-bold">Total Cost</th>
              </tr>
            </thead>
            <tbody>
              {stocks.map((stock) => (
                <tr key={stock._id}>
                  <td className="border border-gray-300 px-3 py-2 text-sm">{stock.documentNumber}</td>
                  <td className="border border-gray-300 px-3 py-2 text-sm">
                    {stock.supplierId?.name || 'N/A'}
                    {stock.supplierId?.phone && <br />}
                    {stock.supplierId?.phone && <span className="text-xs text-gray-500">{stock.supplierId.phone}</span>}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-sm text-center">{stock.items?.length || 0}</td>
                  <td className="border border-gray-300 px-3 py-2 text-sm">{new Date(stock.createdAt).toLocaleDateString()}</td>
                  <td className="border border-gray-300 px-3 py-2 text-sm">
                    {stock.supplierInvoiceDate ? new Date(stock.supplierInvoiceDate).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-sm">{stock.supplierInvoiceNumber || 'N/A'}</td>
                  <td className="border border-gray-300 px-3 py-2 text-sm font-semibold">
                    Rs. {(stock.totalCost || 0).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-bold">
                <td colSpan={6} className="border border-gray-300 px-3 py-2 text-right">Total:</td>
                <td className="border border-gray-300 px-3 py-2 text-sm">
                  Rs. {totalInboundedPrice.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Modal>
    </div>
  );
};

export default PharmacyStocks;