import React, { useEffect, useState } from 'react';
import { Table, Button, message, Input, Select, DatePicker, Tag, Space, Popconfirm } from 'antd';
import { EyeOutlined, DownloadOutlined, PrinterOutlined, SearchOutlined, DeleteOutlined } from '@ant-design/icons';
import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import axios from 'axios';
import { Base_url } from '../../../utils/Base_url';
import { Dayjs } from 'dayjs';
import Swal from 'sweetalert2';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface POSSale {
  _id: string;
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
    returnQuantity?: number;
    totalAmount: number;
    discount?: number;
    tax?: number;
    isReturn?: boolean;
    originalInvoiceNumber?: string;
  }>;
  payment: Array<{
    method: string;
    payDate: string;
    paid: number;
  }>;
  createdAt: string;
}

const PharmacySales: React.FC = () => {
  const [sales, setSales] = useState<POSSale[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [paymentDateRange, setPaymentDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [statusFilter, setStatusFilter] = useState('');
  const [discountPercentFilter, setDiscountPercentFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalDue, setTotalDue] = useState(0);
  const [totalTax, setTotalTax] = useState(0);

  useEffect(() => {
    fetchSales();
  }, [searchTerm, paymentMethodFilter, statusFilter, discountPercentFilter, dateRange, paymentDateRange, currentPage, pageSize]);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(paymentMethodFilter && { paymentMethod: paymentMethodFilter }),
        ...(statusFilter && { status: statusFilter }),
        ...(discountPercentFilter && { discountPercent: discountPercentFilter }),
        ...(dateRange[0] && dateRange[1] && {
          from: dateRange[0].format('YYYY-MM-DD'),
          to: dateRange[1].format('YYYY-MM-DD')
        }),
        ...(paymentDateRange[0] && paymentDateRange[1] && {
          paymentFrom: paymentDateRange[0].format('YYYY-MM-DD'),
          paymentTo: paymentDateRange[1].format('YYYY-MM-DD')
        })
      });

      const response = await axios.get(`${Base_url}/apis/pharmPos/get?${params}`);
      setSales(response.data.data || []);
      setTotalPages(response.data.totalPages || 1);
      setTotalCount(response.data.count || 0);
      
      // Calculate totals
      const revenue = response.data.data?.reduce((sum: number, sale: POSSale) => sum + sale.paid, 0) || 0;
      const due = response.data.data?.reduce((sum: number, sale: POSSale) => sum + sale.due, 0) || 0;
      const tax = response.data.data?.reduce((sum: number, sale: POSSale) => sum + (Number(sale.totalTax) || 0), 0) || 0;
      setTotalRevenue(revenue);
      setTotalDue(due);
      setTotalTax(tax);
    } catch (error) {
      console.error('Error fetching POS sales:', error);
      message.error('Failed to fetch POS sales history');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Sale ID',
      dataIndex: '_id',
      key: '_id',
      width: 100,
      render: (id: string) => (
        <span className="font-mono text-blue-600">#{id.slice(-6).toUpperCase()}</span>
      ),
    },
    {
      title: 'Date & Time',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date: string) => (
        <div>
          <div className="font-medium">{new Date(date).toLocaleDateString()}</div>
          <div className="text-sm text-gray-500">{new Date(date).toLocaleTimeString()}</div>
        </div>
      ),
      sorter: (a: POSSale, b: POSSale) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: 'Patient',
      key: 'patient',
      width: 150,
      render: (record: POSSale) => {
        const patientName = record.patientId?.name || record.patientName || 'Walk-in Customer';
        const patientMR = record.patientId?.mr;
        return (
          <div>
            <div className="font-medium text-gray-800">{patientName}</div>
            {patientMR && <div className="text-sm text-gray-500">MR: {patientMR}</div>}
          </div>
        );
      },
    },
    {
      title: 'Doctor',
      key: 'doctor',
      width: 120,
      render: (record: POSSale) => {
        const doctorName = record.referId?.name || record.doctorName || 'N/A';
        return <span className="text-gray-700">{doctorName}</span>;
      },
    },
    {
      title: 'Items',
      dataIndex: 'allItem',
      key: 'items',
      width: 80,
      render: (items: any[]) => (
        <Tag color="blue" className="font-semibold">
          {items?.length || 0}
        </Tag>
      ),
    },
    {
      title: 'Total Amount',
      dataIndex: 'paid',
      key: 'totalAmount',
      width: 120,
      render: (paid: number, record: POSSale) => {
        const total = paid + record.due;
        return (
          <div>
            <div className="font-semibold text-green-600">
              Rs. {total.toLocaleString()}
            </div>
            {record.totalTax > 0 && (
              <div className="text-xs text-gray-500">Tax: Rs. {record.totalTax.toFixed(2)}</div>
            )}
          </div>
        );
      },
      sorter: (a: POSSale, b: POSSale) => (a.paid + a.due) - (b.paid + b.due),
    },
    {
      title: 'Tax',
      dataIndex: 'totalTax',
      key: 'totalTax',
      width: 110,
      render: (value: number) => (
        <span className="font-semibold text-gray-700">
          Rs. {(Number(value) || 0).toLocaleString()}
        </span>
      ),
      sorter: (a: POSSale, b: POSSale) => (Number(a.totalTax) || 0) - (Number(b.totalTax) || 0),
    },
    {
      title: 'Discount',
      dataIndex: 'totalDiscount',
      key: 'totalDiscount',
      width: 100,
      render: (discount: number) => (
        <span className={`font-semibold ${(discount || 0) > 0 ? 'text-green-600' : 'text-gray-400'}`}>
          Rs. {(discount || 0).toLocaleString()}
        </span>
      ),
      sorter: (a: POSSale, b: POSSale) => (Number(a.totalDiscount) || 0) - (Number(b.totalDiscount) || 0),
    },
    {
      title: 'Paid',
      dataIndex: 'paid',
      key: 'paid',
      width: 100,
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
      width: 100,
      render: (due: number) => (
        <span className={`font-semibold ${due > 0 ? 'text-red-600' : 'text-gray-400'}`}>
          Rs. {due.toLocaleString()}
        </span>
      ),
    },
    {
      title: 'Payment Method',
      dataIndex: 'payment',
      key: 'paymentMethod',
      width: 120,
      render: (payment: any[]) => {
        const methods = payment?.map(p => p.method).join(', ') || 'N/A';
        return <Tag color="purple">{methods}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      fixed: 'right' as const,
      render: (_: any, record: POSSale) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EyeOutlined className="text-blue-500" />}
            onClick={() => handleView(record)}
            title="View Details"
          />
          <Button
            type="text"
            icon={<PrinterOutlined className="text-green-600" />}
            onClick={() => handlePrintReceipt(record)}
            title="Receipt Print"
          />
          <Popconfirm
            title="Delete Confirmation"
            description={`Kya aap is sale ko delete karna chahte hain?\nSale #${record._id.slice(-6).toUpperCase()}`}
            okText="Yes, Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
            onConfirm={() => deleteSale(record)}
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              title="Delete Sale"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleView = (record: POSSale) => {
    const patientName = escapeHtmlSwal(
      String(record.patientId?.name || record.patientName || 'Walk-in Customer'),
    );
    const doctorName = escapeHtmlSwal(String(record.referId?.name || record.doctorName || 'N/A'));
    const total = record.paid + record.due;

    const itemQtyHtml = (item: POSSale['allItem'][number]) => {
      const Q = Number(item.quantity) || 0;
      const R = Math.max(0, Number(item.returnQuantity) || 0);
      const u = String(item.unit || '').trim() || 'units';
      const isRet = Boolean(item.isReturn);
      const net = Math.max(0, Q - R);
      if (R > 0 || isRet) {
        return `
                <p style="margin: 6px 0; font-size: 13px; color: #374151; line-height: 1.5;">
                  <span style="display:block;margin-bottom:4px;"><strong>Bought / sold:</strong> ${Q} ${escapeHtmlSwal(u)}</span>
                  <span style="display:block;margin-bottom:4px;"><strong>Returned:</strong> ${R} ${escapeHtmlSwal(u)}</span>
                  <span style="display:block;"><strong>Net (billed):</strong> ${net} ${escapeHtmlSwal(u)}</span>
                </p>
                <p style="margin: 2px 0; font-size: 12px; color: #666;">Rate: Rs. ${Number(item.rate) || 0} / ${escapeHtmlSwal(u)}</p>`;
      }
      return `
                <p style="margin: 4px 0; font-size: 13px; color: #374151;">
                  <strong>Bought / sold:</strong> ${Q} ${escapeHtmlSwal(u)}
                  <span style="color:#6b7280;font-size:12px;"> &nbsp;·&nbsp; Returned: 0</span>
                </p>
                <p style="margin: 2px 0; font-size: 12px; color: #666;">Rate: Rs. ${Number(item.rate) || 0} / ${escapeHtmlSwal(u)}</p>`;
    };

    Swal.fire({
      title: `Sale #${record._id.slice(-6).toUpperCase()}`,
      html: `
        <div class="text-left" style="font-size: 14px;">
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <p style="margin: 8px 0;"><strong>Date:</strong> ${new Date(record.createdAt).toLocaleString()}</p>
            <p style="margin: 8px 0;"><strong>Patient:</strong> ${patientName}</p>
            <p style="margin: 8px 0;"><strong>Doctor:</strong> ${doctorName}</p>
          </div>
          
          <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <h4 style="margin-top: 0; color: #1e40af;">Items (${record.allItem?.length || 0})</h4>
            ${record.allItem
              ?.map((item, index) => {
                const nm = escapeHtmlSwal(
                  String(item.pharmItemId?.name || (item as { itemName?: string }).itemName || 'Item'),
                );
                const retRef =
                  item.isReturn && item.originalInvoiceNumber
                    ? `<p style="margin:4px 0;font-size:11px;color:#92400e;"><strong>Return ref:</strong> ${escapeHtmlSwal(
                        String(item.originalInvoiceNumber),
                      )}</p>`
                    : '';
                return `
              <div style="border-bottom: 1px solid #e5e7eb; padding: 8px 0;">
                <p style="margin: 4px 0;"><strong>${index + 1}. ${nm}</strong>${
                  item.isReturn
                    ? ' <span style="background:#fee2e2;color:#991b1b;padding:2px 6px;border-radius:4px;font-size:11px;">Return</span>'
                    : ''
                }</p>
                ${itemQtyHtml(item)}
                ${(Number(item.tax) || 0) > 0 || (Number(item.discount) || 0) > 0 ? `
                  <p style="margin: 4px 0; font-size: 12px; color: #666;">
                    ${(Number(item.tax) || 0) > 0 ? `Tax: ${Number(item.tax)}%` : ''}
                    ${(Number(item.tax) || 0) > 0 && (Number(item.discount) || 0) > 0 ? ' | ' : ''}
                    ${(Number(item.discount) || 0) > 0 ? `Line discount: Rs. ${Number(item.discount).toFixed(2)}` : ''}
                  </p>
                ` : ''}
                <p style="margin: 4px 0;"><strong>Line amount:</strong> Rs. ${Number(item.totalAmount || 0).toFixed(2)}</p>
                ${retRef}
              </div>`;
              })
              .join('') || '<p>No items found</p>'}
          </div>
          
          <div style="background: #dcfce7; padding: 15px; border-radius: 8px;">
            <h4 style="margin-top: 0; color: #16a34a;">Payment Summary</h4>
            <p style="margin: 8px 0;"><strong>Subtotal:</strong> Rs. ${(total - record.totalTax + record.totalDiscount).toFixed(2)}</p>
            <p style="margin: 8px 0;"><strong>Discount:</strong> Rs. ${record.totalDiscount.toFixed(2)}</p>
            <p style="margin: 8px 0;"><strong>Tax:</strong> Rs. ${record.totalTax.toFixed(2)}</p>
            <p style="margin: 8px 0;"><strong>Total:</strong> Rs. ${total.toFixed(2)}</p>
            <p style="margin: 8px 0;"><strong>Paid:</strong> Rs. ${record.paid.toFixed(2)}</p>
            <p style="margin: 8px 0;"><strong>Due:</strong> Rs. ${record.due.toFixed(2)}</p>
            ${record.advance > 0 ? `<p style="margin: 8px 0;"><strong>Advance:</strong> Rs. ${record.advance.toFixed(2)}</p>` : ''}
          </div>

          ${record.note ? `
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-top: 15px;">
              <p style="margin: 0;"><strong>Notes:</strong> ${escapeHtmlSwal(String(record.note))}</p>
            </div>
          ` : ''}
        </div>
      `,
      showCloseButton: true,
      width: 700,
      confirmButtonColor: '#3b82f6',
    });
  };

  const handleExport = () => {
    message.info('Excel export functionality will be implemented');
  };

  const handlePrint = () => {
    window.print();
  };

  const handlePrintReceipt = (record: POSSale) => {
    const url = `/admin/pharmacy/invoices/receipt/${record._id}`;
    window.open(url, '_blank');
  };

  const deleteSale = async (record: POSSale) => {
    try {
      await axios.delete(`${Base_url}/apis/pharmPos/delete/${record._id}`);
      message.success('Sale delete hogaya');
      fetchSales();
    } catch (err) {
      console.error('POS sale delete error:', err);
      message.error('Delete nahi ho saka');
    }
  };
  const handleTableChange = (pagination: any) => {
    const newPage = pagination?.current || 1;
    const newPageSize = pagination?.pageSize || pageSize;
    if (newPageSize !== pageSize) {
      setPageSize(newPageSize);
      setCurrentPage(1);
    } else {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default sm:px-7.5 xl:pb-1">
      <Breadcrumb pageName="POS Sales History" />

      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <h4 className="text-xl font-semibold text-black">
            POS Sales History
          </h4>
          <div className="flex items-center gap-2">
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExport}
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

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-4">
          <div className="flex items-center mb-4">
            <svg className="w-5 h-5 text-primary mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <h4 className="text-sm font-semibold text-gray-700">Filter & Search</h4>
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
                  onChange={(dates) => {
                    setDateRange(dates as [Dayjs | null, Dayjs | null]);
                    if (dates && dates[0] && dates[1]) {
                      setPaymentDateRange([null, null]);
                    }
                  }}
                  placeholder={['From Date', 'To Date']}
                  className="w-full"
                  format="DD/MM/YYYY"
                  allowClear
                />
                <Button onClick={() => setDateRange([null, null])}>Cancel</Button>
              </div>
            </div>

            {/* Search Filter */}
            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-600 mb-1.5 flex items-center">
                <svg className="w-3.5 h-3.5 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search Patient
              </label>
              <Search
                placeholder="Search by Patient Name or MR Number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onSearch={(value) => setSearchTerm(value)}
                allowClear
                className="w-full"
                enterButton={<SearchOutlined />}
              />
            </div>

            {/* Payment Method Filter */}
            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-600 mb-1.5 flex items-center">
                <svg className="w-3.5 h-3.5 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Payment Method
              </label>
              <Select
                placeholder="Select Payment Method"
                value={paymentMethodFilter}
                onChange={setPaymentMethodFilter}
                className="w-full"
                allowClear
              >
                <Option value="Cash">Cash</Option>
                <Option value="Card">Card</Option>
                <Option value="Bank Transfer">Bank Transfer</Option>
                <Option value="Cheque">Cheque</Option>
              </Select>
            </div>

            {/* Payment Date Filter */}
            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-600 mb-1.5 flex items-center">
                Payment Date
              </label>
              <div className="flex gap-2">
                <RangePicker
                  value={paymentDateRange}
                  onChange={(dates) => {
                    setPaymentDateRange(dates as [Dayjs | null, Dayjs | null]);
                    if (dates && dates[0] && dates[1]) {
                      setDateRange([null, null]);
                    }
                  }}
                  placeholder={['From Date', 'To Date']}
                  className="w-full"
                  format="DD/MM/YYYY"
                  allowClear
                />
                <Button onClick={() => setPaymentDateRange([null, null])}>Cancel</Button>
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-600 mb-1.5 flex items-center">
                Status
              </label>
              <Select
                placeholder="Select Status"
                value={statusFilter}
                onChange={setStatusFilter}
                className="w-full"
                allowClear
              >
                <Option value="Paid">Paid</Option>
                <Option value="Pending">Pending</Option>
                <Option value="Advance">Advance</Option>
              </Select>
            </div>

            {/* Discount % Filter */}
            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-600 mb-1.5 flex items-center">
                Discount %
              </label>
              <Input
                type="number"
                placeholder="0"
                value={discountPercentFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || Number(val) <= 100) {
                    setDiscountPercentFilter(val);
                  }
                }}
                min={0}
                max={100}
                allowClear
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Total Sales */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600 font-medium mb-1">Total Sales</p>
                <p className="text-2xl font-bold text-blue-700">
                  {totalCount.toLocaleString()}
                </p>
              </div>
              <div className="bg-blue-200 p-3 rounded-full">
                <svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Total Revenue */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-600 font-medium mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-green-700">
                  Rs. {totalRevenue.toLocaleString()}
                </p>
              </div>
              <div className="bg-green-200 p-3 rounded-full">
                <svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Total Tax */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-600 font-medium mb-1">Total Tax</p>
                <p className="text-2xl font-bold text-purple-700">
                  Rs. {totalTax.toLocaleString()}
                </p>
              </div>
              <div className="bg-purple-200 p-3 rounded-full">
                <svg className="w-6 h-6 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v8m4-4H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
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
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table
          columns={columns}
          dataSource={sales}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: totalCount,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1400 }}
        />
      </div>
    </div>
  );
};

export default PharmacySales;






