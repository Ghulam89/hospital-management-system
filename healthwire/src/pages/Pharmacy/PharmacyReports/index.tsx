import React, { useState, useEffect } from 'react';
import { Table, Button, message, Input, DatePicker, Tag, Space } from 'antd';
import { SearchOutlined, DownloadOutlined, PrinterOutlined, EyeOutlined, DollarOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import axios from 'axios';
import { Base_url } from '../../../utils/Base_url';
import dayjs, { Dayjs } from 'dayjs';
import Swal from 'sweetalert2';

const { Search } = Input;
const { RangePicker } = DatePicker;

interface POSTransaction {
  _id: string;
  invoiceNumber?: string;
  patientId?: {
    _id: string;
    name: string;
    mr: string;
    phone: string;
  };
  patientName?: string;
  referId?: {
    _id: string;
    name: string;
  };
  doctorName?: string;
  totalDiscount: number;
  totalTax: number;
  due: number;
  advance: number;
  paid: number;
  note: string;
  allItem: Array<{
    pharmItemId: {
      _id: string;
      name: string;
    };
    unit: string;
    rate: number;
    quantity: number;
    totalAmount: number;
    discount: number;
    tax: number;
  }>;
  payment: Array<{
    method: string;
    payDate: string;
    paid: number;
    reference: string;
  }>;
  createdBy?: {
    _id: string;
    name: string;
  };
  createdAt: string;
}

interface StockTransaction {
  _id: string;
  documentNumber: string;
  supplierId: {
    _id: string;
    name: string;
  };
  supplierInvoiceDate: string;
  supplierInvoiceNumber: string;
  items: Array<any>;
  totalCost: number;
  createdBy?: {
    _id: string;
    name: string;
  };
  createdAt: string;
}

const PharmacyReports: React.FC = () => {
  const [activeTab, setActiveTab] = useState('pos-sales');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([
    null,
    null
  ]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  
  // POS Sales Data - All calculated on BACKEND, not frontend
  const [posTransactions, setPosTransactions] = useState<POSTransaction[]>([]);
  const [totalSales, setTotalSales] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [totalDue, setTotalDue] = useState(0);
  const [totalTransactions, setTotalTransactions] = useState(0);
  
  // Stock Data - All calculated on BACKEND, not frontend
  const [stockTransactions, setStockTransactions] = useState<StockTransaction[]>([]);
  const [totalPurchases, setTotalPurchases] = useState(0);
  const [totalStockTransactions, setTotalStockTransactions] = useState(0);

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

  // Fetch FIXED summary once on mount - doesn't change with filters
  useEffect(() => {
    if (activeTab === 'pos-sales') {
      fetchPOSSummary(); // Fetch FIXED summary once
    }
  }, [activeTab]);

  // Fetch transactions when filters/pagination change
  useEffect(() => {
    if (activeTab === 'pos-sales') {
      fetchPOSTransactions();
    } else if (activeTab === 'stock-purchases') {
      fetchStockTransactions();
    }
  }, [activeTab, currentPage, searchTerm, dateRange]);

  // Fetch POS transactions - Only display, NO calculations here
  const fetchPOSTransactions = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        limit: 20, // 20 records per page
        sort: '-createdAt'
      };
      
      if (searchTerm) {
        params.search = searchTerm;
      }
      
      if (dateRange[0] && dateRange[1]) {
        params.from = dateRange[0].format('YYYY-MM-DD');
        params.to = dateRange[1].format('YYYY-MM-DD');
      }

      console.log('📤 Fetching POS transactions - Page:', currentPage);
      const response = await axios.get(`${Base_url}/apis/pharmPos/get`, { params });
      console.log('📥 POS API Response:', response.data);
      
      const transactions = response.data.data || [];
      console.log('💊 Transactions in current page:', transactions.length);
      
      if (transactions.length === 0) {
        console.warn('⚠️ No POS transactions found! Check if:');
        console.warn('   1. You have created any POS transactions');
        console.warn('   2. Date range is correct:', dateRange[0]?.format('YYYY-MM-DD'), 'to', dateRange[1]?.format('YYYY-MM-DD'));
        console.warn('   3. Search term is not too restrictive:', searchTerm);
      }
      
      // Only set display data - NO calculations
      setPosTransactions(transactions);
      setTotalTransactions(response.data.count || response.data.total || transactions.length);
    } catch (error) {
      console.error('❌ Error fetching POS transactions:', error);
      message.error('Failed to fetch POS transactions');
    } finally {
      setLoading(false);
    }
  };

  // Fetch FIXED POS summary - NO filters (shows GRAND TOTAL)
  const fetchPOSSummary = async () => {
    try {
      const params: any = {};
      
      // NO filters - fetch complete total
      // If you want to apply date filter, uncomment:
      /*
      if (dateRange[0] && dateRange[1]) {
        params.from = dateRange[0].format('YYYY-MM-DD');
        params.to = dateRange[1].format('YYYY-MM-DD');
      }
      */

      console.log('📊 Fetching FIXED/GRAND TOTAL summary (NO filters)');
      console.log('📊 Summary API URL:', `${Base_url}/apis/pharmPos/summary`);
      
      const response = await axios.get(`${Base_url}/apis/pharmPos/summary`, { params });
      
      console.log('📊 Summary API Full Response:', response);
      console.log('📊 Summary API Response Data:', response.data);
      
      if (response.data.status === 'ok' && response.data.summary) {
        const summary = response.data.summary;
        console.log('✅ FIXED Summary received (GRAND TOTAL - No table filters):', {
          totalTransactions: summary.totalTransactions,
          totalSales: summary.totalSales,
          totalPaid: summary.totalPaid,
          totalDue: summary.totalDue
        });
        
        // Direct assignment - NO calculations, just display backend data
        setTotalTransactions(summary.totalTransactions || 0);
        setTotalSales(summary.totalSales || 0);
        setTotalPaid(summary.totalPaid || 0);
        setTotalDue(summary.totalDue || 0);
        
        console.log('✅ FIXED summary cards updated - will NOT change when table filters applied!');
      } else {
        console.warn('⚠️ Invalid summary response format:', response.data);
      }
    } catch (error: any) {
      console.error('❌ Error fetching POS summary:', error);
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      if (error.response?.status === 404) {
        message.error('Summary API endpoint not found. Please restart the backend server.');
      }
    }
  };

  const fetchStockTransactions = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        limit: 20, // 20 records per page
        sort: '-createdAt'
      };
      
      if (searchTerm) {
        params.search = searchTerm;
      }
      
      if (dateRange[0] && dateRange[1]) {
        params.from = dateRange[0].format('YYYY-MM-DD');
        params.to = dateRange[1].format('YYYY-MM-DD');
      }

      console.log('📦 Fetching stock transactions from backend - Page:', currentPage);
      const response = await axios.get(`${Base_url}/apis/pharmAddStock/get`, { params });
      
      const transactions = response.data.data || [];
      setStockTransactions(transactions);
      setTotalStockTransactions(response.data.count || response.data.total || transactions.length);
      
      // No frontend calculations - backend should send summary
      if (response.data.summary) {
        setTotalPurchases(response.data.summary.totalPurchases || 0);
        console.log('✅ Stock summary from backend:', response.data.summary);
      } else {
        // Fallback only if backend doesn't send summary
        setTotalPurchases(0);
        console.warn('⚠️ No summary from backend, add summary endpoint for stock');
      }
    } catch (error) {
      console.error('Error fetching stock transactions:', error);
      message.error('Failed to fetch stock transactions');
    } finally {
      setLoading(false);
    }
  };

  const posColumns = [
    {
      title: 'Invoice #',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      render: (text: string, record: POSTransaction) => (
        <span className="font-semibold text-blue-600">
          {text || record._id.slice(-8).toUpperCase()}
        </span>
      ),
    },
    {
      title: 'Date & Time',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => (
        <div>
          <div>{dayjs(text).format('DD/MM/YYYY')}</div>
          <div className="text-xs text-gray-500">{dayjs(text).format('hh:mm A')}</div>
        </div>
      ),
      sorter: (a: POSTransaction, b: POSTransaction) => 
        dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
    },
    {
      title: 'Patient',
      key: 'patient',
      render: (_: any, record: POSTransaction) => (
        <div>
          <div className="font-medium">
            {record.patientName || record.patientId?.name || 'Walk-in'}
          </div>
          {record.patientId?.mr && (
            <div className="text-xs text-gray-500">MR: {record.patientId.mr}</div>
          )}
          {record.patientId?.phone && (
            <div className="text-xs text-gray-500">{record.patientId.phone}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Doctor',
      key: 'doctor',
      render: (_: any, record: POSTransaction) => (
        <span>{record.doctorName || record.referId?.name || 'N/A'}</span>
      ),
    },
    {
      title: 'Items',
      dataIndex: 'allItem',
      key: 'items',
      render: (items: any[]) => (
        <Tag color="blue">{items?.length || 0} items</Tag>
      ),
    },
    {
      title: 'Total Amount',
      key: 'totalAmount',
      render: (_: any, record: POSTransaction) => (
        <span className="font-semibold text-green-600">
          Rs. {(record.paid + record.due).toLocaleString()}
        </span>
      ),
      sorter: (a: POSTransaction, b: POSTransaction) => 
        (a.paid + a.due) - (b.paid + b.due),
    },
    {
      title: 'Paid',
      dataIndex: 'paid',
      key: 'paid',
      render: (paid: number) => (
        <span className="font-semibold text-blue-600">
          Rs. {paid.toLocaleString()}
        </span>
      ),
    },
    {
      title: 'Due',
      dataIndex: 'due',
      key: 'due',
      render: (due: number) => (
        <span className={`font-semibold ${due > 0 ? 'text-red-600' : 'text-gray-500'}`}>
          Rs. {due.toLocaleString()}
        </span>
      ),
    },
    {
      title: 'Payment Method',
      dataIndex: 'payment',
      key: 'paymentMethod',
      render: (payments: any[]) => (
        <div>
          {payments?.slice(0, 2).map((p, i) => (
            <Tag key={i} color="purple" className="mb-1">
              {p.method}
            </Tag>
          ))}
          {payments?.length > 2 && (
            <Tag color="default">+{payments.length - 2} more</Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Created By',
      dataIndex: ['createdBy', 'name'],
      key: 'createdBy',
      render: (text: string) => text || 'System',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: POSTransaction) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EyeOutlined className="text-blue-500" />}
            onClick={() => handleViewPOSDetail(record)}
            title="View Details"
          />
          <Button
            type="text"
            icon={<PrinterOutlined className="text-green-500" />}
            onClick={() => handlePrintInvoice(record)}
            title="Print Invoice"
          />
        </Space>
      ),
    },
  ];

  const stockColumns = [
    {
      title: 'Document #',
      dataIndex: 'documentNumber',
      key: 'documentNumber',
      render: (text: string) => (
        <span className="font-semibold text-blue-600">{text}</span>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => dayjs(text).format('DD/MM/YYYY hh:mm A'),
      sorter: (a: StockTransaction, b: StockTransaction) => 
        dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
    },
    {
      title: 'Supplier',
      dataIndex: ['supplierId', 'name'],
      key: 'supplier',
      render: (text: string) => text || 'N/A',
    },
    {
      title: 'Invoice #',
      dataIndex: 'supplierInvoiceNumber',
      key: 'supplierInvoiceNumber',
      render: (text: string) => text || 'N/A',
    },
    {
      title: 'Invoice Date',
      dataIndex: 'supplierInvoiceDate',
      key: 'supplierInvoiceDate',
      render: (text: string) => text ? dayjs(text).format('DD/MM/YYYY') : 'N/A',
    },
    {
      title: 'Items',
      dataIndex: 'items',
      key: 'items',
      render: (items: any[]) => (
        <Tag color="green">{items?.length || 0} items</Tag>
      ),
    },
    {
      title: 'Total Cost',
      dataIndex: 'totalCost',
      key: 'totalCost',
      render: (cost: number) => (
        <span className="font-semibold text-green-600">
          Rs. {(cost || 0).toLocaleString()}
        </span>
      ),
      sorter: (a: StockTransaction, b: StockTransaction) => 
        (a.totalCost || 0) - (b.totalCost || 0),
    },
    {
      title: 'Created By',
      dataIndex: ['createdBy', 'name'],
      key: 'createdBy',
      render: (text: string) => text || 'System',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: StockTransaction) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EyeOutlined className="text-blue-500" />}
            onClick={() => handleViewStockDetail(record)}
            title="View Details"
          />
        </Space>
      ),
    },
  ];

  const handleViewPOSDetail = (record: POSTransaction) => {
    const itemsHtml = record.allItem?.map((item, index) => `
      <div style="border-bottom: 1px solid #e5e7eb; padding: 8px 0;">
        <p style="margin: 4px 0;"><strong>${index + 1}. ${item.pharmItemId?.name || 'N/A'}</strong></p>
        <p style="margin: 4px 0; font-size: 12px; color: #666;">
          Quantity: ${item.quantity} ${item.unit} | 
          Rate: Rs. ${item.rate} | 
          Discount: Rs. ${item.discount} | 
          Tax: ${item.tax}%
        </p>
        <p style="margin: 4px 0; font-size: 12px; color: #059669;">
          <strong>Total: Rs. ${item.totalAmount.toLocaleString()}</strong>
        </p>
      </div>
    `).join('') || '<p>No items</p>';

    const paymentsHtml = record.payment?.map((payment, index) => `
      <div style="padding: 4px 0;">
        <strong>${index + 1}. ${payment.method}</strong>: Rs. ${payment.paid.toLocaleString()}
        ${payment.reference ? ` (Ref: ${payment.reference})` : ''}
        <br/><small style="color: #666;">${dayjs(payment.payDate).format('DD/MM/YYYY hh:mm A')}</small>
      </div>
    `).join('') || '<p>No payments</p>';

    Swal.fire({
      title: 'POS Invoice Details',
      html: `
        <div style="text-align: left; font-size: 14px; max-height: 70vh; overflow-y: auto;">
          <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <h4 style="margin-top: 0; color: #1e40af;">Invoice Information</h4>
            <p style="margin: 6px 0;"><strong>Invoice #:</strong> ${record.invoiceNumber || record._id.slice(-8).toUpperCase()}</p>
            <p style="margin: 6px 0;"><strong>Date:</strong> ${dayjs(record.createdAt).format('DD/MM/YYYY hh:mm A')}</p>
            <p style="margin: 6px 0;"><strong>Patient:</strong> ${record.patientName || record.patientId?.name || 'Walk-in'}</p>
            ${record.patientId?.mr ? `<p style="margin: 6px 0;"><strong>MR:</strong> ${record.patientId.mr}</p>` : ''}
            ${record.patientId?.phone ? `<p style="margin: 6px 0;"><strong>Phone:</strong> ${record.patientId.phone}</p>` : ''}
            <p style="margin: 6px 0;"><strong>Doctor:</strong> ${record.doctorName || record.referId?.name || 'N/A'}</p>
            ${record.note ? `<p style="margin: 6px 0;"><strong>Note:</strong> ${record.note}</p>` : ''}
          </div>
          
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <h4 style="margin-top: 0; color: #1e40af;">Items (${record.allItem?.length || 0})</h4>
            ${itemsHtml}
          </div>
          
          <div style="background: #dcfce7; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <h4 style="margin-top: 0; color: #16a34a;">Payment Summary</h4>
            <p style="margin: 8px 0;"><strong>Sub Total:</strong> Rs. ${(record.paid + record.due).toLocaleString()}</p>
            <p style="margin: 8px 0;"><strong>Discount:</strong> Rs. ${record.totalDiscount.toLocaleString()}</p>
            <p style="margin: 8px 0;"><strong>Tax:</strong> Rs. ${record.totalTax.toLocaleString()}</p>
            <p style="margin: 8px 0; font-size: 16px;"><strong>Total:</strong> <span style="color: #059669;">Rs. ${(record.paid + record.due).toLocaleString()}</span></p>
            <hr style="margin: 10px 0;"/>
            <p style="margin: 8px 0;"><strong>Paid:</strong> <span style="color: #2563eb;">Rs. ${record.paid.toLocaleString()}</span></p>
            <p style="margin: 8px 0;"><strong>Due:</strong> <span style="color: ${record.due > 0 ? '#dc2626' : '#059669'};">Rs. ${record.due.toLocaleString()}</span></p>
          </div>
          
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px;">
            <h4 style="margin-top: 0; color: #92400e;">Payment Details</h4>
            ${paymentsHtml}
          </div>
        </div>
      `,
      showCloseButton: true,
      showConfirmButton: false,
      width: 800,
    });
  };

  const handleViewStockDetail = (record: StockTransaction) => {
    const itemsHtml = record.items?.map((item, index) => `
      <div style="border-bottom: 1px solid #e5e7eb; padding: 8px 0;">
        <p style="margin: 4px 0;"><strong>${index + 1}. ${item.pharmItemId?.name || 'N/A'}</strong></p>
        <p style="margin: 4px 0; font-size: 12px; color: #666;">
          Quantity: ${item.quantity} | 
          Unit Cost: Rs. ${item.unitCost} | 
          Total: Rs. ${item.totalCost?.toLocaleString() || 0}
        </p>
        ${item.batchNumber ? `<p style="margin: 4px 0; font-size: 12px; color: #666;">Batch: ${item.batchNumber}</p>` : ''}
        ${item.expiryDate ? `<p style="margin: 4px 0; font-size: 12px; color: #666;">Expiry: ${dayjs(item.expiryDate).format('DD/MM/YYYY')}</p>` : ''}
      </div>
    `).join('') || '<p>No items</p>';

    Swal.fire({
      title: 'Stock Purchase Details',
      html: `
        <div style="text-align: left; font-size: 14px; max-height: 70vh; overflow-y: auto;">
          <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <h4 style="margin-top: 0; color: #1e40af;">Document Information</h4>
            <p style="margin: 6px 0;"><strong>Document #:</strong> ${record.documentNumber}</p>
            <p style="margin: 6px 0;"><strong>Date:</strong> ${dayjs(record.createdAt).format('DD/MM/YYYY hh:mm A')}</p>
            <p style="margin: 6px 0;"><strong>Supplier:</strong> ${record.supplierId?.name || 'N/A'}</p>
            <p style="margin: 6px 0;"><strong>Supplier Invoice #:</strong> ${record.supplierInvoiceNumber || 'N/A'}</p>
            <p style="margin: 6px 0;"><strong>Supplier Invoice Date:</strong> ${record.supplierInvoiceDate ? dayjs(record.supplierInvoiceDate).format('DD/MM/YYYY') : 'N/A'}</p>
            <p style="margin: 6px 0;"><strong>Created By:</strong> ${record.createdBy?.name || 'System'}</p>
          </div>
          
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <h4 style="margin-top: 0; color: #1e40af;">Items (${record.items?.length || 0})</h4>
            ${itemsHtml}
          </div>
          
          <div style="background: #dcfce7; padding: 15px; border-radius: 8px;">
            <h4 style="margin-top: 0; color: #16a34a;">Summary</h4>
            <p style="margin: 8px 0; font-size: 18px;"><strong>Total Cost:</strong> <span style="color: #059669;">Rs. ${(record.totalCost || 0).toLocaleString()}</span></p>
          </div>
        </div>
      `,
      showCloseButton: true,
      showConfirmButton: false,
      width: 800,
    });
  };

  const handlePrintInvoice = (_record: POSTransaction) => {
    message.info('Print functionality will be implemented');
  };

  const handleExcelExport = () => {
    message.info('Excel export functionality will be implemented');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
      <Breadcrumb pageName="Pharmacy Reports & History" />

      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <h4 className="text-xl font-semibold text-black dark:text-white">
            Pharmacy Transaction History
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
          </div>
        </div>
      </div>

      {/* Tab Buttons */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setActiveTab('pos-sales')}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
            activeTab === 'pos-sales'
              ? 'bg-primary text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <ShoppingCartOutlined />
          POS Sales History
        </button>
        <button
          onClick={() => setActiveTab('stock-purchases')}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
            activeTab === 'stock-purchases'
              ? 'bg-primary text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <DollarOutlined />
          Stock Purchases
        </button>
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
            placeholder={['From Date (Optional)', 'To Date (Optional)']}
            className="w-80"
            allowClear
          />
          <Search
            placeholder="Search by patient, invoice, or document number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onSearch={() => {
              setCurrentPage(1);
              if (activeTab === 'pos-sales') {
                fetchPOSTransactions();
              } else {
                fetchStockTransactions();
              }
            }}
            allowClear
            className="w-80"
            enterButton={<SearchOutlined />}
          />
        </div>
      </div>

      {/* POS Sales Tab Content */}
      {activeTab === 'pos-sales' && (
        <div>
          {/* Summary Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">POS Sales Summary</h3>
            
          </div>

          {/* Summary Section - Modern UI (Similar to Financial Reports) */}
          <div className="mb-4">
            {/* Main Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Sales */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-green-600 font-medium mb-1">Total Sales</p>
                    <p className="text-2xl font-bold text-green-700">
                      Rs. {totalSales.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-green-200 p-3 rounded-full">
                    <svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Total Paid */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-blue-600 font-medium mb-1">Total Paid</p>
                    <p className="text-2xl font-bold text-blue-700">
                      Rs. {totalPaid.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-blue-200 p-3 rounded-full">
                    <svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Total Due */}
              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-red-600 font-medium mb-1">Total Due</p>
                    <p className="text-2xl font-bold text-red-700">
                      Rs. {totalDue.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-red-200 p-3 rounded-full">
                    <svg className="w-6 h-6 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Transactions */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-purple-600 font-medium mb-1">Transactions</p>
                    <p className="text-2xl font-bold text-purple-700">
                      {totalTransactions.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-purple-200 p-3 rounded-full">
                    <svg className="w-6 h-6 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
              columns={posColumns}
              dataSource={posTransactions}
              rowKey="_id"
              loading={loading}
              locale={{
                emptyText: (
                  <div className="py-12">
                    <div className="text-center">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No POS transactions found</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {dateRange[0] || dateRange[1] ? 'Try adjusting your date range or clearing filters.' : 'Create your first POS transaction to see data here.'}
                      </p>
                    </div>
                  </div>
                ),
              }}
              pagination={{
                current: currentPage,
                total: totalTransactions,
                pageSize: 20,
                onChange: (page) => setCurrentPage(page),
                showSizeChanger: false,
                showQuickJumper: true,
                showTotal: (total, range) =>
                  `Showing ${range[0]}-${range[1]} of ${total} transactions`,
              }}
              scroll={{ x: 1600 }}
            />
          </div>
        </div>
      )}

      {/* Stock Purchases Tab Content */}
      {activeTab === 'stock-purchases' && (
        <div>
          {/* Summary Section - Modern UI (Similar to Financial Reports) */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Stock Purchase Summary</h3>
            </div>

            {/* Main Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Total Purchases */}
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-orange-600 font-medium mb-1">Total Purchase Value</p>
                    <p className="text-2xl font-bold text-orange-700">
                      Rs. {totalPurchases.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-orange-200 p-3 rounded-full">
                    <svg className="w-6 h-6 text-orange-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Total Stock Documents */}
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4 border border-indigo-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-indigo-600 font-medium mb-1">Purchase Transactions</p>
                    <p className="text-2xl font-bold text-indigo-700">
                      {totalStockTransactions.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-indigo-200 p-3 rounded-full">
                    <svg className="w-6 h-6 text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
              columns={stockColumns}
              dataSource={stockTransactions}
              rowKey="_id"
              loading={loading}
              locale={{
                emptyText: (
                  <div className="py-12">
                    <div className="text-center">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No stock purchases found</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {dateRange[0] || dateRange[1] ? 'Try adjusting your date range or clearing filters.' : 'Add stock to see purchase records here.'}
                      </p>
                    </div>
                  </div>
                ),
              }}
              pagination={{
                current: currentPage,
                total: totalStockTransactions,
                pageSize: 20,
                onChange: (page) => setCurrentPage(page),
                showSizeChanger: false,
                showQuickJumper: true,
                showTotal: (total, range) =>
                  `Showing ${range[0]}-${range[1]} of ${total} transactions`,
              }}
              scroll={{ x: 1400 }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PharmacyReports;

