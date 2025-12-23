import React, { useEffect, useState } from 'react';
import { Table, Button, message, Input, Select, DatePicker, Tag, Space } from 'antd';
import { EyeOutlined, DownloadOutlined, PrinterOutlined, SearchOutlined } from '@ant-design/icons';
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
    totalAmount: number;
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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalDue, setTotalDue] = useState(0);

  useEffect(() => {
    fetchSales();
  }, [searchTerm, paymentMethodFilter, dateRange, currentPage]);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(searchTerm && { search: searchTerm }),
        ...(paymentMethodFilter && { paymentMethod: paymentMethodFilter }),
        ...(dateRange[0] && dateRange[1] && {
          from: dateRange[0].format('YYYY-MM-DD'),
          to: dateRange[1].format('YYYY-MM-DD')
        })
      });

      const response = await axios.get(`${Base_url}/apis/pharmPos/get?${params}`);
      setSales(response.data.data || []);
      setTotalPages(response.data.totalPages || 1);
      setTotalCount(response.data.count || 0);
      
      // Calculate totals
      const revenue = response.data.data?.reduce((sum: number, sale: POSSale) => sum + sale.paid, 0) || 0;
      const due = response.data.data?.reduce((sum: number, sale: POSSale) => sum + sale.due, 0) || 0;
      setTotalRevenue(revenue);
      setTotalDue(due);
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
        </Space>
      ),
    },
  ];

  const handleView = (record: POSSale) => {
    const patientName = record.patientId?.name || record.patientName || 'Walk-in Customer';
    const doctorName = record.referId?.name || record.doctorName || 'N/A';
    const total = record.paid + record.due;

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
            ${record.allItem?.map((item, index) => `
              <div style="border-bottom: 1px solid #e5e7eb; padding: 8px 0;">
                <p style="margin: 4px 0;"><strong>${index + 1}. ${item.pharmItemId?.name || 'Item'}</strong></p>
                <p style="margin: 4px 0;">Quantity: ${item.quantity} ${item.unit} @ Rs. ${item.rate}</p>
                <p style="margin: 4px 0;">Amount: Rs. ${item.totalAmount?.toFixed(2)}</p>
              </div>
            `).join('') || '<p>No items found</p>'}
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
              <p style="margin: 0;"><strong>Notes:</strong> ${record.note}</p>
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

  const handleTableChange = (pagination: any) => {
    setCurrentPage(pagination.current);
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
              placeholder={['From Date', 'To Date']}
              className="w-80"
              format="DD/MM/YYYY"
            />
            <Search
              placeholder="Search by Patient Name or MR Number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onSearch={(value) => setSearchTerm(value)}
              allowClear
              className="w-60"
              enterButton={<SearchOutlined />}
            />
            <Select
              placeholder="Filter by Payment Method"
              value={paymentMethodFilter}
              onChange={setPaymentMethodFilter}
              className="w-48"
              allowClear
            >
              <Option value="Cash">Cash</Option>
              <Option value="Card">Card</Option>
              <Option value="Credit">Credit</Option>
              <Option value="Bank Transfer">Bank Transfer</Option>
              <Option value="Cheque">Cheque</Option>
            </Select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            pageSize: 20,
            total: totalCount,
            showSizeChanger: true,
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






