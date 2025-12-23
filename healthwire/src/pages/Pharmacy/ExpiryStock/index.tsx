import React, { useEffect, useState } from 'react';
import { Table, Button, message, Input, Select, DatePicker, Tag, Space } from 'antd';
import { SearchOutlined, DownloadOutlined, PrinterOutlined, EyeOutlined, WarningOutlined } from '@ant-design/icons';
import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import axios from 'axios';
import { Base_url } from '../../../utils/Base_url';
import dayjs, { Dayjs } from 'dayjs';
import Swal from 'sweetalert2';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface ExpiryStockItem {
  _id: string;
  pharmItemId: {
    _id: string;
    name: string;
    barcode: string;
    manufacturer: string;
    category: string;
  };
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  unitCost: number;
  totalValue: number;
  daysUntilExpiry: number;
  status: 'Expired' | 'Expiring Soon' | 'Near Expiry' | 'Good';
}

const ExpiryStock: React.FC = () => {
  const [expiryItems, setExpiryItems] = useState<ExpiryStockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Statistics
  const [totalExpired, setTotalExpired] = useState(0);
  const [totalExpiringSoon, setTotalExpiringSoon] = useState(0);
  const [totalNearExpiry, setTotalNearExpiry] = useState(0);
  const [totalExpiredValue, setTotalExpiredValue] = useState(0);

  useEffect(() => {
    fetchExpiryStock();
  }, [currentPage, searchTerm, statusFilter, dateRange]);

  const fetchExpiryStock = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter && { status: statusFilter }),
        ...(dateRange[0] && dateRange[1] && {
          from: dateRange[0].format('YYYY-MM-DD'),
          to: dateRange[1].format('YYYY-MM-DD')
        })
      });

      const response = await axios.get(`${Base_url}/apis/pharmExpiryStock/get?${params}`);
      
      // Calculate expiry status for each item
      const itemsWithStatus = (response.data.data || []).map((item: any) => {
        const expiryDate = dayjs(item.expiryDate);
        const today = dayjs();
        const daysUntilExpiry = expiryDate.diff(today, 'day');
        
        let status: 'Expired' | 'Expiring Soon' | 'Near Expiry' | 'Good' = 'Good';
        if (daysUntilExpiry < 0) {
          status = 'Expired';
        } else if (daysUntilExpiry <= 30) {
          status = 'Expiring Soon';
        } else if (daysUntilExpiry <= 90) {
          status = 'Near Expiry';
        }
        
        return {
          ...item,
          daysUntilExpiry,
          status,
          totalValue: item.quantity * item.unitCost
        };
      });

      setExpiryItems(itemsWithStatus);
      setTotalPages(response.data.totalPages || 1);
      
      // Calculate statistics
      const expired = itemsWithStatus.filter(item => item.status === 'Expired');
      const expiringSoon = itemsWithStatus.filter(item => item.status === 'Expiring Soon');
      const nearExpiry = itemsWithStatus.filter(item => item.status === 'Near Expiry');
      
      setTotalExpired(expired.length);
      setTotalExpiringSoon(expiringSoon.length);
      setTotalNearExpiry(nearExpiry.length);
      setTotalExpiredValue(expired.reduce((sum, item) => sum + item.totalValue, 0));
    } catch (error) {
      console.error('Error fetching expiry stock:', error);
      message.error('Failed to fetch expiry stock data');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Item Name',
      dataIndex: ['pharmItemId', 'name'],
      key: 'itemName',
      render: (text: string, record: ExpiryStockItem) => (
        <div>
          <div className="font-semibold text-gray-800">{text}</div>
          <div className="text-sm text-gray-500">
            {record.pharmItemId?.barcode && `Barcode: ${record.pharmItemId.barcode}`}
          </div>
        </div>
      ),
    },
    {
      title: 'Batch Number',
      dataIndex: 'batchNumber',
      key: 'batchNumber',
      render: (text: string) => (
        <span className="font-medium text-blue-600">{text || 'N/A'}</span>
      ),
    },
    {
      title: 'Manufacturer',
      dataIndex: ['pharmItemId', 'manufacturer'],
      key: 'manufacturer',
      render: (text: string) => text || 'N/A',
    },
    {
      title: 'Expiry Date',
      dataIndex: 'expiryDate',
      key: 'expiryDate',
      render: (text: string) => dayjs(text).format('DD/MM/YYYY'),
      sorter: (a: ExpiryStockItem, b: ExpiryStockItem) => 
        dayjs(a.expiryDate).unix() - dayjs(b.expiryDate).unix(),
    },
    {
      title: 'Days Until Expiry',
      dataIndex: 'daysUntilExpiry',
      key: 'daysUntilExpiry',
      render: (days: number) => {
        let color = 'green';
        let text = `${days} days`;
        
        if (days < 0) {
          color = 'red';
          text = `Expired ${Math.abs(days)} days ago`;
        } else if (days <= 30) {
          color = 'red';
        } else if (days <= 90) {
          color = 'orange';
        }
        
        return <Tag color={color}>{text}</Tag>;
      },
      sorter: (a: ExpiryStockItem, b: ExpiryStockItem) => a.daysUntilExpiry - b.daysUntilExpiry,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colorMap: { [key: string]: string } = {
          'Expired': 'red',
          'Expiring Soon': 'orange',
          'Near Expiry': 'gold',
          'Good': 'green',
        };
        return <Tag color={colorMap[status]}>{status}</Tag>;
      },
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (quantity: number) => (
        <span className="font-semibold">{quantity}</span>
      ),
    },
    {
      title: 'Unit Cost',
      dataIndex: 'unitCost',
      key: 'unitCost',
      render: (cost: number) => `Rs. ${cost.toFixed(2)}`,
    },
    {
      title: 'Total Value',
      dataIndex: 'totalValue',
      key: 'totalValue',
      render: (value: number) => (
        <span className="font-semibold text-red-600">Rs. {value.toFixed(2)}</span>
      ),
      sorter: (a: ExpiryStockItem, b: ExpiryStockItem) => a.totalValue - b.totalValue,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: any, record: ExpiryStockItem) => (
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

  const handleView = (record: ExpiryStockItem) => {
    Swal.fire({
      title: 'Expiry Stock Details',
      html: `
        <div class="text-left" style="font-size: 14px;">
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <p style="margin: 8px 0;"><strong>Item:</strong> ${record.pharmItemId?.name}</p>
            <p style="margin: 8px 0;"><strong>Barcode:</strong> ${record.pharmItemId?.barcode || 'N/A'}</p>
            <p style="margin: 8px 0;"><strong>Manufacturer:</strong> ${record.pharmItemId?.manufacturer || 'N/A'}</p>
            <p style="margin: 8px 0;"><strong>Batch Number:</strong> ${record.batchNumber}</p>
            <p style="margin: 8px 0;"><strong>Expiry Date:</strong> ${dayjs(record.expiryDate).format('DD/MM/YYYY')}</p>
            <p style="margin: 8px 0;"><strong>Days Until Expiry:</strong> ${record.daysUntilExpiry} days</p>
            <p style="margin: 8px 0;"><strong>Status:</strong> <span style="color: ${
              record.status === 'Expired' ? 'red' : 
              record.status === 'Expiring Soon' ? 'orange' : 
              record.status === 'Near Expiry' ? 'gold' : 'green'
            };">${record.status}</span></p>
            <p style="margin: 8px 0;"><strong>Quantity:</strong> ${record.quantity}</p>
            <p style="margin: 8px 0;"><strong>Unit Cost:</strong> Rs. ${record.unitCost.toFixed(2)}</p>
            <p style="margin: 8px 0;"><strong>Total Value:</strong> Rs. ${record.totalValue.toFixed(2)}</p>
          </div>
        </div>
      `,
      showCloseButton: true,
      width: 600,
    });
  };

  const handleExcelExport = () => {
    message.info('Excel export functionality will be implemented');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-6">
      <Breadcrumb pageName="Expiry Stock Management" />

      {/* Header Actions */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-bold text-gray-800 flex items-center">
              <WarningOutlined className="text-red-600 mr-2" style={{ fontSize: '20px' }} />
              Expiry Stock Monitor
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
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null])}
              placeholder={['From Date', 'To Date']}
              className="w-80"
            />
            <Search
              placeholder="Search by Item Name or Batch Number"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onSearch={(value) => {
                setSearchTerm(value);
                setCurrentPage(1);
              }}
              allowClear
              className="w-80"
              enterButton={<SearchOutlined />}
            />
            <Select
              placeholder="Filter by Status"
              value={statusFilter}
              onChange={setStatusFilter}
              className="w-48"
              allowClear
            >
              <Option value="Expired">Expired</Option>
              <Option value="Expiring Soon">Expiring Soon (≤30 days)</Option>
              <Option value="Near Expiry">Near Expiry (≤90 days)</Option>
              <Option value="Good">Good</Option>
            </Select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Expired Items */}
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-600 font-medium mb-1">Expired Items</p>
                <p className="text-2xl font-bold text-red-700">
                  {totalExpired.toLocaleString()}
                </p>
              </div>
              <div className="bg-red-200 p-3 rounded-full">
                <svg className="w-6 h-6 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Expiring Soon */}
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-orange-600 font-medium mb-1">Expiring Soon (≤30d)</p>
                <p className="text-2xl font-bold text-orange-700">
                  {totalExpiringSoon.toLocaleString()}
                </p>
              </div>
              <div className="bg-orange-200 p-3 rounded-full">
                <svg className="w-6 h-6 text-orange-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Near Expiry */}
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-yellow-600 font-medium mb-1">Near Expiry (≤90d)</p>
                <p className="text-2xl font-bold text-yellow-700">
                  {totalNearExpiry.toLocaleString()}
                </p>
              </div>
              <div className="bg-yellow-200 p-3 rounded-full">
                <svg className="w-6 h-6 text-yellow-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Expired Value */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-600 font-medium mb-1">Expired Value</p>
                <p className="text-2xl font-bold text-purple-700">
                  Rs. {totalExpiredValue.toLocaleString()}
                </p>
              </div>
              <div className="bg-purple-200 p-3 rounded-full">
                <svg className="w-6 h-6 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            columns={columns}
            dataSource={expiryItems}
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
            scroll={{ x: 1400 }}
            className="custom-table"
            rowClassName={(record) => {
              if (record.status === 'Expired') return 'bg-red-50';
              if (record.status === 'Expiring Soon') return 'bg-orange-50';
              if (record.status === 'Near Expiry') return 'bg-yellow-50';
              return '';
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ExpiryStock;

