import { useEffect, useState } from 'react';
import { Table, Button, Input, DatePicker, Card, Statistic, Modal, Form, Space, message } from 'antd';
import { SearchOutlined, PlusOutlined, EyeOutlined, DownloadOutlined, PrinterOutlined } from '@ant-design/icons';
import { Base_url } from '../../../utils/Base_url';
import axios from 'axios';
import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import Swal from 'sweetalert2';
import dayjs, { Dayjs } from 'dayjs';

const { Search } = Input;
const { RangePicker } = DatePicker;

interface StoreClosing {
  _id: string;
  closingDate: string;
  openingCash: number;
  totalSales: number;
  totalExpenses: number;
  cashInHand: number;
  expectedCash: number;
  difference: number;
  notes: string;
  closedBy: {
    _id: string;
    name: string;
  };
  status: string;
  createdAt: string;
}

const StoreClosings = () => {
  const [storeClosings, setStoreClosings] = useState<StoreClosing[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [totalSales, setTotalSales] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchStoreClosings();
  }, [searchTerm, dateRange, currentPage]);

  const fetchStoreClosings = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(searchTerm && { search: searchTerm }),
        ...(dateRange[0] && dateRange[1] && {
          from: dateRange[0].format('YYYY-MM-DD'),
          to: dateRange[1].format('YYYY-MM-DD')
        })
      });

      // Note: Replace with actual API endpoint when available
      const response = await axios.get(`${Base_url}/apis/storeClosing/get?${params}`);
      setStoreClosings(response.data.data || []);
      
      const sales = response.data.data?.reduce((sum: number, closing: StoreClosing) => sum + closing.totalSales, 0) || 0;
      const expenses = response.data.data?.reduce((sum: number, closing: StoreClosing) => sum + closing.totalExpenses, 0) || 0;
      setTotalSales(sales);
      setTotalExpenses(expenses);
    } catch (error) {
      console.error('Error fetching store closings:', error);
      // Don't show error if endpoint doesn't exist yet
      setStoreClosings([]);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Date',
      dataIndex: 'closingDate',
      key: 'closingDate',
      render: (text: string) => (
        <span className="font-medium text-gray-800">
          {new Date(text).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          })}
        </span>
      ),
    },
    {
      title: 'Opening Cash',
      dataIndex: 'openingCash',
      key: 'openingCash',
      render: (amount: number) => (
        <span className="text-blue-600 font-semibold">
          Rs. {amount.toLocaleString()}
        </span>
      ),
    },
    {
      title: 'Total Sales',
      dataIndex: 'totalSales',
      key: 'totalSales',
      render: (amount: number) => (
        <span className="text-green-600 font-semibold">
          Rs. {amount.toLocaleString()}
        </span>
      ),
    },
    {
      title: 'Total Expenses',
      dataIndex: 'totalExpenses',
      key: 'totalExpenses',
      render: (amount: number) => (
        <span className="text-red-600 font-semibold">
          Rs. {amount.toLocaleString()}
        </span>
      ),
    },
    {
      title: 'Expected Cash',
      dataIndex: 'expectedCash',
      key: 'expectedCash',
      render: (amount: number) => (
        <span className="text-gray-700 font-medium">
          Rs. {amount.toLocaleString()}
        </span>
      ),
    },
    {
      title: 'Cash in Hand',
      dataIndex: 'cashInHand',
      key: 'cashInHand',
      render: (amount: number) => (
        <span className="text-purple-600 font-semibold">
          Rs. {amount.toLocaleString()}
        </span>
      ),
    },
    {
      title: 'Difference',
      dataIndex: 'difference',
      key: 'difference',
      render: (amount: number) => (
        <span className={`font-bold ${amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {amount >= 0 ? '+' : ''} Rs. {amount.toLocaleString()}
        </span>
      ),
    },
    {
      title: 'Closed By',
      dataIndex: ['closedBy', 'name'],
      key: 'closedBy',
      render: (text: string) => (
        <span className="text-gray-700">{text}</span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (text: any, record: StoreClosing) => (
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

  const handleView = (record: StoreClosing) => {
    Swal.fire({
      title: 'Store Closing Details',
      html: `
        <div class="text-left" style="font-size: 14px;">
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <p style="margin: 8px 0;"><strong>Date:</strong> ${new Date(record.closingDate).toLocaleDateString()}</p>
            <p style="margin: 8px 0;"><strong>Closed By:</strong> ${record.closedBy?.name}</p>
          </div>
          
          <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <h4 style="margin-top: 0; color: #1e40af;">Cash Flow</h4>
            <p style="margin: 8px 0;"><strong>Opening Cash:</strong> Rs. ${record.openingCash.toLocaleString()}</p>
            <p style="margin: 8px 0;"><strong>Total Sales:</strong> <span style="color: #059669;">Rs. ${record.totalSales.toLocaleString()}</span></p>
            <p style="margin: 8px 0;"><strong>Total Expenses:</strong> <span style="color: #dc2626;">Rs. ${record.totalExpenses.toLocaleString()}</span></p>
          </div>
          
          <div style="background: ${record.difference >= 0 ? '#dcfce7' : '#fee2e2'}; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <h4 style="margin-top: 0; color: ${record.difference >= 0 ? '#16a34a' : '#dc2626'};">Closing Summary</h4>
            <p style="margin: 8px 0;"><strong>Expected Cash:</strong> Rs. ${record.expectedCash.toLocaleString()}</p>
            <p style="margin: 8px 0;"><strong>Cash in Hand:</strong> Rs. ${record.cashInHand.toLocaleString()}</p>
            <p style="margin: 8px 0; font-size: 16px;"><strong>Difference:</strong> <span style="color: ${record.difference >= 0 ? '#16a34a' : '#dc2626'}; font-weight: bold;">${record.difference >= 0 ? '+' : ''} Rs. ${record.difference.toLocaleString()}</span></p>
          </div>
          
          ${record.notes ? `
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px;">
              <h4 style="margin-top: 0; color: #92400e;">Notes</h4>
              <p style="margin: 0;">${record.notes}</p>
            </div>
          ` : ''}
        </div>
      `,
      showCloseButton: true,
      width: 600,
    });
  };

  const handleAddStoreClosing = () => {
    form.resetFields();
    form.setFieldsValue({
      closingDate: dayjs(),
    });
    setIsModalOpen(true);
  };

  const handleModalSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      // Calculate expected cash and difference
      const expectedCash = values.openingCash + values.totalSales - values.totalExpenses;
      const difference = values.cashInHand - expectedCash;

      const data = {
        ...values,
        closingDate: values.closingDate?.format('YYYY-MM-DD'),
        expectedCash,
        difference,
        closedBy: '65a1f1a1a1a1a1a1a1a1a1a1', // TODO: Replace with actual user ID from auth context
        status: 'Closed',
      };

      console.log('Store Closing Data:', data);
      
      const response = await axios.post(`${Base_url}/apis/storeClosing/create`, data);
      
      if (response.data && response.data.status === 'ok') {
        message.success(response.data.message || 'Store closing recorded successfully');
        setIsModalOpen(false);
        fetchStoreClosings();
      } else {
        throw new Error(response.data.error || 'Failed to save store closing');
      }
    } catch (error: any) {
      console.error('Error saving store closing:', error);
      const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to save store closing';
      message.error(errorMsg);
    }
  };

  const handleExport = () => {
    message.info('Excel export functionality will be implemented');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <Breadcrumb pageName="Store Closings" />
      
      <div className="min-h-screen bg-gray-50 p-4">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Store Closings</h1>
          <div className="flex items-center space-x-2">
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExport}
              className="flex items-center"
            >
              Excel
            </Button>
            <Button
              icon={<PrinterOutlined />}
              onClick={handlePrint}
              className="flex items-center"
            >
              Print
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddStoreClosing}
              className="flex items-center bg-primary hover:bg-opacity-90"
            >
              + Add Store Closing
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null])}
              placeholder={['From Date', 'To Date']}
              className="w-full"
            />
            <Search
              placeholder="Search by Closed By Name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="bg-blue-50 border-blue-200">
            <Statistic
              title="Total Closings"
              value={storeClosings.length}
              prefix={<SearchOutlined className="text-blue-500" />}
              valueStyle={{ color: '#2563eb' }}
            />
          </Card>
          <Card className="bg-green-50 border-green-200">
            <Statistic
              title="Total Sales"
              value={totalSales}
              prefix="Rs."
              precision={2}
              valueStyle={{ color: '#16a34a' }}
            />
          </Card>
          <Card className="bg-red-50 border-red-200">
            <Statistic
              title="Total Expenses"
              value={totalExpenses}
              prefix="Rs."
              precision={2}
              valueStyle={{ color: '#dc2626' }}
            />
          </Card>
          <Card className="bg-purple-50 border-purple-200">
            <Statistic
              title="Net Amount"
              value={totalSales - totalExpenses}
              prefix="Rs."
              precision={2}
              valueStyle={{ color: '#9333ea' }}
            />
          </Card>
        </div>

        {/* Table */}
        <Card className="shadow-sm">
          <Table
            columns={columns}
            dataSource={storeClosings}
            rowKey="_id"
            loading={loading}
            pagination={{
              current: currentPage,
              pageSize: 20,
              onChange: setCurrentPage,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} of ${total} items`,
            }}
            scroll={{ x: 1200 }}
          />
        </Card>

        {/* Add/Edit Modal */}
        <Modal
          title={
            <div className="flex items-center">
              <div className="w-10 h-10 bg-primary rounded flex items-center justify-center text-white font-bold mr-3">
                <PlusOutlined />
              </div>
              <span className="text-lg font-semibold text-gray-800">
                Add Store Closing
              </span>
            </div>
          }
          open={isModalOpen}
          onOk={handleModalSubmit}
          onCancel={() => setIsModalOpen(false)}
          width={700}
          okText="Save"
          cancelText="Cancel"
          okButtonProps={{
            className: "bg-primary hover:bg-opacity-90"
          }}
        >
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <p className="text-sm text-gray-600 mb-0">
              Fill in the details to record the daily store closing.
            </p>
          </div>
          
          <Form form={form} layout="vertical">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item
                name="closingDate"
                label={
                  <span className="font-semibold text-gray-700">
                    Closing Date <span className="text-red-500">*</span>
                  </span>
                }
                rules={[{ required: true, message: 'Please select date' }]}
              >
                <DatePicker 
                  className="w-full" 
                  placeholder="Select closing date"
                  format="DD/MM/YYYY"
                />
              </Form.Item>

              <Form.Item
                name="openingCash"
                label={
                  <span className="font-semibold text-gray-700">
                    Opening Cash <span className="text-red-500">*</span>
                  </span>
                }
                rules={[{ required: true, message: 'Please enter opening cash' }]}
              >
                <Input 
                  type="number" 
                  min={0}
                  step={0.01}
                  placeholder="Enter opening cash" 
                  prefix="Rs."
                />
              </Form.Item>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item
                name="totalSales"
                label={
                  <span className="font-semibold text-gray-700">
                    Total Sales <span className="text-red-500">*</span>
                  </span>
                }
                rules={[{ required: true, message: 'Please enter total sales' }]}
              >
                <Input 
                  type="number" 
                  min={0}
                  step={0.01}
                  placeholder="Enter total sales" 
                  prefix="Rs."
                />
              </Form.Item>

              <Form.Item
                name="totalExpenses"
                label={
                  <span className="font-semibold text-gray-700">
                    Total Expenses <span className="text-red-500">*</span>
                  </span>
                }
                rules={[{ required: true, message: 'Please enter total expenses' }]}
              >
                <Input 
                  type="number" 
                  min={0}
                  step={0.01}
                  placeholder="Enter total expenses" 
                  prefix="Rs."
                />
              </Form.Item>
            </div>

            <Form.Item
              name="cashInHand"
              label={
                <span className="font-semibold text-gray-700">
                  Cash in Hand <span className="text-red-500">*</span>
                </span>
              }
              rules={[{ required: true, message: 'Please enter cash in hand' }]}
            >
              <Input 
                type="number" 
                min={0}
                step={0.01}
                placeholder="Enter actual cash in hand" 
                prefix="Rs."
              />
            </Form.Item>

            <Form.Item
              name="notes"
              label={
                <span className="font-semibold text-gray-700">
                  Notes
                </span>
              }
            >
              <Input.TextArea 
                rows={4} 
                placeholder="Enter any additional notes or discrepancies..." 
              />
            </Form.Item>

            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center text-sm text-blue-700">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span>Expected cash and difference will be calculated automatically.</span>
              </div>
            </div>
          </Form>
        </Modal>
      </div>
    </>
  );
};

export default StoreClosings;
