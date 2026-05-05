import React, { useMemo, useState, useEffect } from 'react';
import { Table, Button, message, Input, DatePicker, Tag, Space, Select, Modal } from 'antd';
import { SearchOutlined, DownloadOutlined, PrinterOutlined, EyeOutlined, DollarOutlined, ShoppingCartOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import axios from 'axios';
import { Base_url } from '../../../utils/Base_url';
import dayjs, { Dayjs } from 'dayjs';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pos-sales');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [posPaymentMethod, setPosPaymentMethod] = useState<string>('');
  const [posStatus, setPosStatus] = useState<string>('');
  const [posPatientName, setPosPatientName] = useState('');
  const [posPatientMr, setPosPatientMr] = useState('');
  const [posDoctorName, setPosDoctorName] = useState('');
  const [posMinAmount, setPosMinAmount] = useState('');
  const [posMaxAmount, setPosMaxAmount] = useState('');
  const [posDiscountPercent, setPosDiscountPercent] = useState('');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([
    dayjs().startOf('month'),
    dayjs().endOf('day'),
  ]);
  const [paymentDateRange, setPaymentDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [exporting, setExporting] = useState(false);
  
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

  const dateRangePresets = useMemo(
    () => [
      {
        label: 'Today',
        value: [dayjs().startOf('day'), dayjs().endOf('day')] as [Dayjs, Dayjs],
      },
      {
        label: 'Yesterday',
        value: [
          dayjs().subtract(1, 'day').startOf('day'),
          dayjs().subtract(1, 'day').endOf('day'),
        ] as [Dayjs, Dayjs],
      },
      {
        label: 'Last Week',
        value: [
          dayjs().subtract(1, 'week').startOf('week').startOf('day'),
          dayjs().subtract(1, 'week').endOf('week').endOf('day'),
        ] as [Dayjs, Dayjs],
      },
    ],
    [],
  );

  /** Pharmacy reports only use historical data — disable selecting dates after today in the calendar. */
  const disableDatesAfterToday = (current: Dayjs | null) =>
    !!current && current.startOf('day').isAfter(dayjs().startOf('day'));

  useEffect(() => {
    setCurrentPage(1);
    setSelectedRowKeys([]);
  }, [activeTab, searchTerm, dateRange, paymentDateRange, posPaymentMethod, posStatus, posPatientName, posPatientMr, posDoctorName, posMinAmount, posMaxAmount, posDiscountPercent]);

  useEffect(() => {
    if ((!dateRange[0] || !dateRange[1]) && activeTab === 'pos-sales') {
      setDateRange([dayjs().startOf('month'), dayjs().endOf('day')]);
    }
  }, [activeTab]);

  // Fetch summary when date range or any POS list filter changes (must match fetchPOSTransactions filters)
  useEffect(() => {
    if (activeTab === 'pos-sales') {
      fetchPOSSummary();
    }
  }, [
    activeTab,
    dateRange,
    paymentDateRange,
    searchTerm,
    posPaymentMethod,
    posStatus,
    posPatientName,
    posPatientMr,
    posDoctorName,
    posMinAmount,
    posMaxAmount,
    posDiscountPercent,
  ]);

  // Fetch transactions when filters/pagination change
  useEffect(() => {
    if (activeTab === 'pos-sales') {
      fetchPOSTransactions();
    } else if (activeTab === 'stock-purchases') {
      fetchStockTransactions();
    }
  }, [activeTab, currentPage, searchTerm, dateRange, paymentDateRange, posPaymentMethod, posStatus, posPatientName, posPatientMr, posDoctorName, posMinAmount, posMaxAmount, posDiscountPercent]);

  const buildPOSListFilterParams = () => {
    const params: Record<string, string> = {};
    if (searchTerm) params.search = searchTerm;
    if (dateRange[0] && dateRange[1]) {
      params.from = dateRange[0].format('YYYY-MM-DD');
      params.to = dateRange[1].format('YYYY-MM-DD');
    }
    if (paymentDateRange[0] && paymentDateRange[1]) {
      params.paymentFrom = paymentDateRange[0].format('YYYY-MM-DD');
      params.paymentTo = paymentDateRange[1].format('YYYY-MM-DD');
    }
    if (posPaymentMethod) params.paymentMethod = posPaymentMethod;
    if (posStatus) params.status = posStatus;
    if (posPatientName.trim()) params.patientName = posPatientName.trim();
    if (posPatientMr.trim()) params.patientMr = posPatientMr.trim();
    if (posDoctorName.trim()) params.doctorName = posDoctorName.trim();
    if (posMinAmount.trim()) params.minAmount = posMinAmount.trim();
    if (posMaxAmount.trim()) params.maxAmount = posMaxAmount.trim();
    if (posDiscountPercent.trim()) params.discountPercent = posDiscountPercent.trim();
    return params;
  };

  const buildStockListFilterParams = () => {
    const params: Record<string, string> = {};
    if (searchTerm) params.search = searchTerm;
    if (dateRange[0] && dateRange[1]) {
      params.from = dateRange[0].format('YYYY-MM-DD');
      params.to = dateRange[1].format('YYYY-MM-DD');
    }
    return params;
  };

  // Fetch POS transactions - Only display, NO calculations here
  const fetchPOSTransactions = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 20,
        sort: '-createdAt',
        ...buildPOSListFilterParams(),
      };

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

  // POS summary from backend — same filter profile as transaction list (not paginated)
  const fetchPOSSummary = async () => {
    try {
      const params = buildPOSListFilterParams();

      console.log('📊 Fetching POS summary (same filters as list, all rows)');
      console.log('📊 Summary API URL:', `${Base_url}/apis/pharmPos/summary`);
      
      const response = await axios.get(`${Base_url}/apis/pharmPos/summary`, { params });
      
      console.log('📊 Summary API Full Response:', response);
      console.log('📊 Summary API Response Data:', response.data);
      
      if (response.data.status === 'ok' && response.data.summary) {
        const summary = response.data.summary;
        console.log('✅ POS summary received:', {
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
        
        console.log('✅ Summary cards updated for current filters');
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
      const params = {
        page: currentPage,
        limit: 20,
        sort: '-createdAt',
        ...buildStockListFilterParams(),
      };

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
      title: 'Discount',
      dataIndex: 'totalDiscount',
      key: 'totalDiscount',
      render: (discount: number) => (
        <span className={`font-semibold ${(discount || 0) > 0 ? 'text-green-600' : 'text-gray-500'}`}>
          Rs. {(discount || 0).toLocaleString()}
        </span>
      ),
      sorter: (a: POSTransaction, b: POSTransaction) => a.totalDiscount - b.totalDiscount,
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
          Rs. {paid?.toLocaleString() || 0}
        </span>
      ),
    },
    {
      title: 'Due',
      dataIndex: 'due',
      key: 'due',
      render: (due: number) => (
        <span className={`font-semibold ${due > 0 ? 'text-red-600' : 'text-gray-500'}`}>
          Rs. {due?.toLocaleString() || 0}
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
            icon={<EditOutlined className="text-orange-500" />}
            onClick={() => handleEditPOS(record)}
            title="Edit POS"
          />
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
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            title="Delete POS"
            onClick={() => showDeleteConfirm(record)}
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

  const handlePrintInvoice = (record: POSTransaction) => {
    const url = `/admin/pharmacy/invoices/receipt/${record._id}`;
    window.open(url, '_blank');
  };
  
  const handleEditPOS = (record: POSTransaction) => {
    navigate(`/admin/pharmacy/invoices/edit/${record._id}`);
  };

  const handleDeletePOS = async (record: POSTransaction) => {
    
      try {
        await axios.delete(`${Base_url}/apis/pharmPos/delete/${record._id}`);
        message.success('POS transaction delete successfully!');
        fetchPOSTransactions();
      } catch (err) {
        console.error('POS delete error:', err);
        message.error('Delete nahi ho saka');
      }
    
  };
  const fetchAllPosForExport = async (): Promise<POSTransaction[]> => {
    const filters = buildPOSListFilterParams();
    const limit = 500;
    let page = 1;
    const all: POSTransaction[] = [];
    for (;;) {
      const response = await axios.get(`${Base_url}/apis/pharmPos/get`, {
        params: { ...filters, page, limit, sort: '-createdAt' },
      });
      const batch: POSTransaction[] = response.data.data || [];
      all.push(...batch);
      if (batch.length < limit) break;
      page += 1;
    }
    return all;
  };

  const fetchAllStockForExport = async (): Promise<StockTransaction[]> => {
    const filters = buildStockListFilterParams();
    const limit = 500;
    let page = 1;
    const all: StockTransaction[] = [];
    for (;;) {
      const response = await axios.get(`${Base_url}/apis/pharmAddStock/get`, {
        params: { ...filters, page, limit, sort: '-createdAt' },
      });
      const batch: StockTransaction[] = response.data.data || [];
      all.push(...batch);
      if (batch.length < limit) break;
      page += 1;
    }
    return all;
  };

  const handleExcelExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      if (activeTab === 'pos-sales') {
        const rows = await fetchAllPosForExport();
        if (!rows.length) {
          message.warning('No POS data to export for the current filters');
          return;
        }
        const summaryRows = rows.map((record) => ({
          'Invoice #': record.invoiceNumber || record._id.slice(-8).toUpperCase(),
          Date: dayjs(record.createdAt).format('DD/MM/YYYY'),
          Time: dayjs(record.createdAt).format('hh:mm A'),
          Patient: record.patientName || record.patientId?.name || 'Walk-in',
          MR: record.patientId?.mr || '',
          Phone: record.patientId?.phone || '',
          Doctor: record.doctorName || record.referId?.name || 'N/A',
          'Items Count': record.allItem?.length || 0,
          'Total Discount': Number(record.totalDiscount) || 0,
          'Total Tax': Number(record.totalTax) || 0,
          'Total Amount': Number(record.paid) + Number(record.due),
          Paid: Number(record.paid) || 0,
          Due: Number(record.due) || 0,
          Advance: Number(record.advance) || 0,
          'Payment Methods': (record.payment || [])
            .map((p) => `${p.method}: ${p.paid}${p.reference ? ` (${p.reference})` : ''}`)
            .join('; '),
          Note: record.note || '',
          'Created By': record.createdBy?.name || 'System',
        }));

        const lineRows: Record<string, string | number>[] = [];
        for (const record of rows) {
          const inv = record.invoiceNumber || record._id.slice(-8).toUpperCase();
          const patient = record.patientName || record.patientId?.name || 'Walk-in';
          const doctor = record.doctorName || record.referId?.name || 'N/A';
          const dateStr = dayjs(record.createdAt).format('DD/MM/YYYY HH:mm');
          for (const item of record.allItem || []) {
            lineRows.push({
              'Invoice #': inv,
              Date: dateStr,
              Patient: patient,
              Doctor: doctor,
              'Item Name': item.pharmItemId?.name || 'N/A',
              Unit: item.unit || '',
              Qty: item.quantity,
              Rate: item.rate,
              'Line Discount': item.discount ?? 0,
              'Tax %': item.tax ?? 0,
              'Line Total': item.totalAmount,
            });
          }
        }

        const wb = XLSX.utils.book_new();
        const ws1 = XLSX.utils.json_to_sheet(summaryRows);
        XLSX.utils.book_append_sheet(wb, ws1, 'POS_Sales');
        if (lineRows.length) {
          const ws2 = XLSX.utils.json_to_sheet(lineRows);
          XLSX.utils.book_append_sheet(wb, ws2, 'Line_Items');
        }
        const part =
          dateRange[0] && dateRange[1]
            ? `${dateRange[0].format('YYYYMMDD')}_${dateRange[1].format('YYYYMMDD')}`
            : dayjs().format('YYYYMMDD');
        XLSX.writeFile(wb, `POS_Sales_Summary_${part}.xlsx`);
        message.success(`Exported ${rows.length} POS bill(s)`);
      } else {
        const rows = await fetchAllStockForExport();
        if (!rows.length) {
          message.warning('No stock purchase data to export for the current filters');
          return;
        }
        const summaryRows = rows.map((record) => ({
          'Document #': record.documentNumber || '',
          Date: dayjs(record.createdAt).format('DD/MM/YYYY HH:mm'),
          Supplier: record.supplierId?.name || 'N/A',
          'Supplier Inv #': record.supplierInvoiceNumber || '',
          'Supplier Inv Date': record.supplierInvoiceDate
            ? dayjs(record.supplierInvoiceDate).format('DD/MM/YYYY')
            : '',
          'Line Items': record.items?.length || 0,
          'Total Cost': Number(record.totalCost) || 0,
          'Created By': record.createdBy?.name || 'System',
        }));

        const lineRows: Record<string, string | number>[] = [];
        for (const record of rows) {
          for (const item of record.items || []) {
            lineRows.push({
              'Document #': record.documentNumber,
              Date: dayjs(record.createdAt).format('DD/MM/YYYY HH:mm'),
              Supplier: record.supplierId?.name || '',
              'Item Name': item.pharmItemId?.name || 'N/A',
              Qty: item.quantity,
              'Unit Cost': item.unitCost,
              'Line Total': item.totalCost,
              Batch: item.batchNumber || '',
              Expiry: item.expiryDate ? dayjs(item.expiryDate).format('DD/MM/YYYY') : '',
            });
          }
        }

        const wb = XLSX.utils.book_new();
        const ws1 = XLSX.utils.json_to_sheet(summaryRows);
        XLSX.utils.book_append_sheet(wb, ws1, 'Stock_Purchases');
        if (lineRows.length) {
          const ws2 = XLSX.utils.json_to_sheet(lineRows);
          XLSX.utils.book_append_sheet(wb, ws2, 'Line_Items');
        }
        const part =
          dateRange[0] && dateRange[1]
            ? `${dateRange[0].format('YYYYMMDD')}_${dateRange[1].format('YYYYMMDD')}`
            : dayjs().format('YYYYMMDD');
        XLSX.writeFile(wb, `Stock_Purchases_${part}.xlsx`);
        message.success(`Exported ${rows.length} stock document(s)`);
      }
    } catch (e: any) {
      console.error('Excel export error:', e);
      message.error(e?.response?.data?.message || e?.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const showDeleteConfirm = (record: POSTransaction) => {
    Modal.confirm({
      title: 'Delete Confirmation',
      content: (
        <div>
          <p>Are you sure you want to delete this POS transaction?</p>
          <p><strong>Invoice:</strong> {record.invoiceNumber || record._id.slice(-6).toUpperCase()}</p>
        </div>
      ),
      okText: 'Yes, Delete',
      cancelText: 'Cancel',
      okButtonProps: { danger: true },
      centered: true,
      onOk: async () => {
        await handleDeletePOS(record);
      },
    });
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
              loading={exporting}
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
        <div className="flex items-center justify-between mb-4">
          <svg className="w-5 h-5 text-primary mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <h4 className="text-sm font-semibold text-gray-700">Filter & Search</h4>
          <div className="flex items-center gap-2">
            <Button
              type="default"
              onClick={() => {
                setCurrentPage(1);
                if (activeTab === 'pos-sales') {
                  fetchPOSTransactions();
                } else {
                  fetchStockTransactions();
                }
              }}
            >
              Search
            </Button>
            <Button
              onClick={() => {
                setSearchTerm('');
                setPosPaymentMethod('');
                setPosStatus('');
                setPosPatientName('');
                setPosPatientMr('');
                setPosDoctorName('');
                setPosMinAmount('');
                setPosMaxAmount('');
                setPosDiscountPercent('');
                setPaymentDateRange([null, null]);
                setDateRange([dayjs().startOf('month'), dayjs().endOf('day')]);
                setCurrentPage(1);
              }}
            >
              Clear
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Date Range Filter */}
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-600 mb-1.5 flex items-center">
              <svg className="w-3.5 h-3.5 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Date Range
            </label>
            <div className="flex gap-2">
              <RangePicker
                value={dateRange}
                disabledDate={disableDatesAfterToday}
                onChange={(dates) => {
                  setDateRange(dates as [Dayjs | null, Dayjs | null]);
                  if (dates && dates[0] && dates[1]) {
                    setPaymentDateRange([null, null]);
                  }
                  setCurrentPage(1);
                }}
                placeholder={['From Date', 'To Date']}
                className="w-full"
                format="DD/MM/YYYY"
                allowClear
                presets={dateRangePresets as any}
              />
              <Button onClick={() => { setDateRange([null, null]); setCurrentPage(1); }}>Cancel</Button>
            </div>
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
              className="w-full"
              enterButton={<SearchOutlined />}
            />
          </div>

          {activeTab === 'pos-sales' && (
            <>
              <div className="flex flex-col">
                <label className="text-xs font-medium text-gray-600 mb-1.5 flex items-center">
                  Payment Date
                </label>
                <div className="flex gap-2">
                  <RangePicker
                    value={paymentDateRange}
                    disabledDate={disableDatesAfterToday}
                    onChange={(dates) => {
                      setPaymentDateRange(dates as [Dayjs | null, Dayjs | null]);
                      if (dates && dates[0] && dates[1]) {
                        setDateRange([null, null]);
                      }
                      setCurrentPage(1);
                    }}
                    placeholder={['From Date', 'To Date']}
                    className="w-full"
                    format="DD/MM/YYYY"
                    allowClear
                  />
                  <Button onClick={() => { setPaymentDateRange([null, null]); setCurrentPage(1); }}>Cancel</Button>
                </div>
              </div>

              <div className="flex flex-col">
                <label className="text-xs font-medium text-gray-600 mb-1.5 flex items-center">
                  Patient Name
                </label>
                <Input
                  placeholder="Patient name..."
                  value={posPatientName}
                  onChange={(e) => {
                    setPosPatientName(e.target.value);
                    setCurrentPage(1);
                  }}
                  allowClear
                  className="w-full"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-xs font-medium text-gray-600 mb-1.5 flex items-center">
                  MR
                </label>
                <Input
                  placeholder="MR..."
                  value={posPatientMr}
                  onChange={(e) => {
                    setPosPatientMr(e.target.value);
                    setCurrentPage(1);
                  }}
                  allowClear
                  className="w-full"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-xs font-medium text-gray-600 mb-1.5 flex items-center">
                  Doctor
                </label>
                <Input
                  placeholder="Doctor name..."
                  value={posDoctorName}
                  onChange={(e) => {
                    setPosDoctorName(e.target.value);
                    setCurrentPage(1);
                  }}
                  allowClear
                  className="w-full"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-xs font-medium text-gray-600 mb-1.5 flex items-center">
                  Payment Method
                </label>
                <Select
                  value={posPaymentMethod || undefined}
                  onChange={(value) => {
                    setPosPaymentMethod(String(value || ''));
                    setCurrentPage(1);
                  }}
                  allowClear
                  placeholder="All"
                  className="w-full"
                  options={[
                    { value: 'Cash', label: 'Cash' },
                    { value: 'Card', label: 'Card' },
                    { value: 'Bank Transfer', label: 'Bank Transfer' },
                    { value: 'Cheque', label: 'Cheque' },
                  ]}
                />
              </div>

              <div className="flex flex-col">
                <label className="text-xs font-medium text-gray-600 mb-1.5 flex items-center">
                  Status
                </label>
                <Select
                  value={posStatus || undefined}
                  onChange={(value) => {
                    setPosStatus(String(value || ''));
                    setCurrentPage(1);
                  }}
                  allowClear
                  placeholder="All"
                  className="w-full"
                  options={[
                    { value: 'Paid', label: 'Paid' },
                    { value: 'Pending', label: 'Pending' },
                    { value: 'Advance', label: 'Advance' },
                  ]}
                />
              </div>

              <div className="flex flex-col">
                <label className="text-xs font-medium text-gray-600 mb-1.5 flex items-center">
                  Min Amount
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  value={posMinAmount}
                  onChange={(e) => {
                    setPosMinAmount(e.target.value);
                    setCurrentPage(1);
                  }}
                  min={0}
                  allowClear
                  className="w-full"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-xs font-medium text-gray-600 mb-1.5 flex items-center">
                  Max Amount
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  value={posMaxAmount}
                  onChange={(e) => {
                    setPosMaxAmount(e.target.value);
                    setCurrentPage(1);
                  }}
                  min={0}
                  allowClear
                  className="w-full"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-xs font-medium text-gray-600 mb-1.5 flex items-center">
                  Discount %
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  value={posDiscountPercent}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || Number(val) <= 100) {
                      setPosDiscountPercent(val);
                      setCurrentPage(1);
                    }
                  }}
                  min={0}
                  max={100}
                  allowClear
                  className="w-full"
                />
              </div>
            </>
          )}
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

