import React, { useEffect, useState, useRef } from 'react';
import { Table, Button, message, Input, Space, Tag, Select, DatePicker, Modal } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, DownloadOutlined, PrinterOutlined, EyeOutlined } from '@ant-design/icons';
import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Base_url } from '../../../utils/Base_url';
import type { Dayjs } from 'dayjs';
import AddStockReturnModal from './AddStockReturnModal';
import * as XLSX from 'xlsx';
import { useReactToPrint } from 'react-to-print';

const { Search } = Input;
const { Option } = Select;

interface StockReturn {
  _id: string;
  returnNumber: string;
  supplierId: {
    _id: string;
    name: string;
  };
  returnDate: string;
  reason: string;
  items: Array<{
    itemId: {
  _id: string;
  name: string;
  barcode: string;
    };
    quantity: number;
  unitCost: number;
    totalCost: number;
  }>;
  totalAmount: number;
  status: string;
  notes?: string;
  createdBy: {
    _id: string;
    name: string;
  };
  createdAt: string;
}

const StockReturn: React.FC = () => {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [stockReturns, setStockReturns] = useState<StockReturn[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [totalReturnAmount, setTotalReturnAmount] = useState(0);
  const [totalReturnCount, setTotalReturnCount] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStockReturn, setEditingStockReturn] = useState<StockReturn | null>(null);
  const [printPreviewVisible, setPrintPreviewVisible] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

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

  // Fetch stock returns
  const fetchStockReturns = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(searchTerm && { search: searchTerm }),
        ...(supplierFilter && { supplierId: supplierFilter }),
        ...(dateRange[0] && dateRange[1] && {
          from: dateRange[0].format('YYYY-MM-DD'),
          to: dateRange[1].format('YYYY-MM-DD')
        })
      });

      const response = await axios.get(`${Base_url}/apis/pharmReturnStock/get?${params}`);
      setStockReturns(response.data.data || []);
      setTotalPages(response.data.totalPages || 1);
      
      // Calculate statistics
      const totalAmount = response.data.data?.reduce((sum: number, returnItem: StockReturn) => sum + returnItem.totalAmount, 0) || 0;
      const totalCount = response.data.data?.length || 0;
      
      setTotalReturnAmount(totalAmount);
      setTotalReturnCount(totalCount);
    } catch (error) {
      console.error('Error fetching stock returns:', error);
      message.error('Failed to fetch stock returns');
    } finally {
      setLoading(false);
    }
  };

  // Fetch reference data
  const fetchReferenceData = async () => {
    try {
      const response = await axios.get(`${Base_url}/apis/pharmSupplier/get`);
      setSuppliers(response.data.data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  useEffect(() => {
    fetchStockReturns();
    fetchReferenceData();
  }, [currentPage, searchTerm, supplierFilter, dateRange]);

  const columns = [
    {
      title: 'Return Number',
      dataIndex: 'returnNumber',
      key: 'returnNumber',
      sorter: (a: StockReturn, b: StockReturn) => a.returnNumber.localeCompare(b.returnNumber),
      render: (text: string) => (
        <span className="font-semibold text-blue-600">{text}</span>
      ),
    },
    {
      title: 'Supplier',
      dataIndex: ['supplierId', 'name'],
      key: 'supplier',
      render: (text: string) => text || 'N/A',
    },
    {
      title: 'Return Date',
      dataIndex: 'returnDate',
      key: 'returnDate',
      render: (text: string) => new Date(text).toLocaleDateString(),
      sorter: (a: StockReturn, b: StockReturn) => new Date(a.returnDate).getTime() - new Date(b.returnDate).getTime(),
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      render: (text: string) => text || 'N/A',
    },
    {
      title: 'Items Count',
      dataIndex: 'items',
      key: 'items',
      render: (items: any[]) => (
        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
          {items?.length || 0}
        </span>
      ),
    },
    {
      title: 'Total Amount',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount: number) => (
        <span className="font-semibold text-red-600">
          Rs. {amount.toLocaleString()}
        </span>
      ),
      sorter: (a: StockReturn, b: StockReturn) => a.totalAmount - b.totalAmount,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colorMap: { [key: string]: string } = {
          'Pending': 'orange',
          'Approved': 'green',
          'Rejected': 'red',
        };
        return <Tag color={colorMap[status] || 'default'}>{status}</Tag>;
      },
    },
    {
      title: 'Created By',
      dataIndex: ['createdBy', 'name'],
      key: 'createdBy',
      render: (text: string) => text || 'N/A',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: any, record: StockReturn) => (
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

  const handleView = (record: StockReturn) => {
    Swal.fire({
      title: 'Stock Return Details',
      html: `
        <div class="text-left" style="font-size: 14px;">
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <p style="margin: 8px 0;"><strong>Return Number:</strong> ${record.returnNumber}</p>
            <p style="margin: 8px 0;"><strong>Supplier:</strong> ${record.supplierId?.name || 'N/A'}</p>
            <p style="margin: 8px 0;"><strong>Return Date:</strong> ${new Date(record.returnDate).toLocaleDateString()}</p>
            <p style="margin: 8px 0;"><strong>Reason:</strong> ${record.reason}</p>
            <p style="margin: 8px 0;"><strong>Total Amount:</strong> Rs. ${record.totalAmount.toLocaleString()}</p>
            <p style="margin: 8px 0;"><strong>Status:</strong> ${record.status}</p>
            <p style="margin: 8px 0;"><strong>Created By:</strong> ${record.createdBy?.name || 'N/A'}</p>
            ${record.notes ? `<p style="margin: 8px 0;"><strong>Notes:</strong> ${record.notes}</p>` : ''}
          </div>
        </div>
      `,
      showCloseButton: true,
      width: 500,
    });
  };

  const handleEdit = (record: StockReturn) => {
    setEditingStockReturn(record);
    setIsModalOpen(true);
  };

  const handleDelete = async (record: StockReturn) => {
    try {
      const result = await Swal.fire({
        title: 'Delete Stock Return?',
        text: `Are you sure you want to delete this stock return record?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, Delete',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#ef4444',
      });

      if (result.isConfirmed) {
        await axios.delete(`${Base_url}/apis/pharmReturnStock/delete/${record._id}`);
        message.success('Stock return deleted successfully');
        fetchStockReturns();
      }
    } catch (error) {
      console.error('Error deleting stock return:', error);
      message.error('Failed to delete stock return');
    }
  };

  const handleAdd = () => {
    setEditingStockReturn(null);
    setIsModalOpen(true);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleExcelExport = () => {
    try {
      if (stockReturns.length === 0) {
        message.warning('No data to export');
        return;
      }

      // Prepare data for export
      const exportData = stockReturns.map((returnItem) => ({
        'Return Number': returnItem.returnNumber || '',
        'Supplier': returnItem.supplierId?.name || '',
        'Return Date': returnItem.returnDate ? new Date(returnItem.returnDate).toLocaleDateString() : '',
        'Reason': returnItem.reason || '',
        'Items Count': returnItem.itemsCount || 0,
        'Total Amount': returnItem.totalAmount || 0,
        'Status': returnItem.status || '',
        'Created By': returnItem.createdBy || 'N/A',
        'Created At': returnItem.createdAt ? new Date(returnItem.createdAt).toLocaleDateString() : '',
      }));

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Set column widths
      const columnWidths = [
        { wch: 15 }, // Return Number
        { wch: 25 }, // Supplier
        { wch: 12 }, // Return Date
        { wch: 20 }, // Reason
        { wch: 12 }, // Items Count
        { wch: 15 }, // Total Amount
        { wch: 12 }, // Status
        { wch: 20 }, // Created By
        { wch: 12 }, // Created At
      ];
      ws['!cols'] = columnWidths;

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Stock Returns');

      // Generate filename with current date
      const fileName = `Stock_Returns_${new Date().toISOString().split('T')[0]}.xlsx`;
      
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
    documentTitle: 'Stock Returns Report',
    onBeforeGetContent: () => {
      return Promise.resolve();
    },
    onAfterPrint: () => {
      setPrintPreviewVisible(false);
      message.success('Print completed');
    },
  });

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-6">
      <Breadcrumb pageName="Stock Return Management" />

      {/* Add/Edit Modal */}
      <AddStockReturnModal
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        fetchStockReturns={fetchStockReturns}
        selectedStockReturn={editingStockReturn}
        suppliers={suppliers}
      />

      {/* Header Actions */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-bold text-gray-800 flex items-center">
              <svg className="w-5 h-5 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              Stock Returns List
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
                onClick={handleAdd}
                className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 border-none rounded-lg flex items-center gap-2 shadow-md"
              >
                + Add Stock Return
              </Button>
            </div>
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
              onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null])}
              placeholder={['From Date', 'To Date']}
              className="w-80"
            />
            <Search
              placeholder="Search by Return Number"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onSearch={handleSearch}
              allowClear
              className="w-60"
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Total Return Amount */}
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-600 font-medium mb-1">Total Return Amount</p>
                <p className="text-2xl font-bold text-red-700">
                  Rs. {totalReturnAmount.toLocaleString()}
                </p>
              </div>
              <div className="bg-red-200 p-3 rounded-full">
                <svg className="w-6 h-6 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
            </div>
          </div>

          {/* Total Return Count */}
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-orange-600 font-medium mb-1">Total Return Count</p>
                <p className="text-2xl font-bold text-orange-700">
                  {totalReturnCount.toLocaleString()}
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
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="max-w-full overflow-x-auto">
          <Table
            rowSelection={rowSelection}
            columns={columns}
            dataSource={stockReturns}
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
    </div>
  );
};

export default StockReturn;