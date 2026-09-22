import { useEffect, useState } from 'react';
import { Table, Button, Input, DatePicker, Card, Statistic, Modal, Form, Space, message } from 'antd';
import { SearchOutlined, PlusOutlined, EyeOutlined, DownloadOutlined, PrinterOutlined } from '@ant-design/icons';
import { Base_url } from '../../../utils/Base_url';
import axios from 'axios';
import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import Swal from 'sweetalert2';
import dayjs, { Dayjs } from 'dayjs';
import { useBranchScopeEpoch } from '../../../context/BranchScopeEpochContext';

const { Search } = Input;
const { RangePicker } = DatePicker;

interface StoreClosing {
  _id: string;
  closingDate: string;
  openingCash: number;
  totalSales: number;
  cashSales: number;
  creditSales?: number;
  onlineCash: number;
  cardTransactions: number;
  chequePayments?: number;
  cashDeposit: number;
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

interface ClosingPrep {
  openingCash: number;
  totalSales: number;
  cashSales: number;
  creditSales: number;
  onlineCash: number;
  bankTransfer?: number;
  cardTransactions: number;
  chequePayments: number;
  totalExpenses: number;
  cashDeposit: number;
  expectedCash: number;
  alreadyClosed: boolean;
}

const renderReadOnlyAmount = () => (
  <Input type="number" min={0} step={0.01} prefix="Rs." readOnly className="bg-gray-50 cursor-not-allowed" />
);

function calcExpectedCash(
  openingCash: number,
  cashSales: number,
  totalExpenses: number,
  cashDeposit: number,
) {
  return (
    (Number(openingCash) || 0) +
    (Number(cashSales) || 0) -
    (Number(totalExpenses) || 0) -
    (Number(cashDeposit) || 0)
  );
}

function getCurrentUserId(): string | null {
  try {
    const stored = localStorage.getItem('userData');
    const user = stored ? JSON.parse(stored) : null;
    return user?._id || null;
  } catch {
    return null;
  }
}

const StoreClosings = () => {
  const branchEpoch = useBranchScopeEpoch();
  const [storeClosings, setStoreClosings] = useState<StoreClosing[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [totalSales, setTotalSales] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [prepLoading, setPrepLoading] = useState(false);

  const openingCash = Form.useWatch('openingCash', form) ?? 0;
  const cashSales = Form.useWatch('cashSales', form) ?? 0;
  const cashDeposit = Form.useWatch('cashDeposit', form) ?? 0;
  const formExpenses = Form.useWatch('totalExpenses', form) ?? 0;
  const cashInHand = Form.useWatch('cashInHand', form) ?? 0;

  const liveExpectedCash = calcExpectedCash(openingCash, cashSales, formExpenses, cashDeposit);
  const liveDifference = (Number(cashInHand) || 0) - liveExpectedCash;

  useEffect(() => {
    fetchStoreClosings();
  }, [searchTerm, dateRange, currentPage, branchEpoch]);

  const fetchStoreClosings = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(searchTerm && { search: searchTerm }),
        ...(dateRange[0] && dateRange[1] && {
          from: dateRange[0].format('YYYY-MM-DD'),
          to: dateRange[1].format('YYYY-MM-DD'),
        }),
      });

      const response = await axios.get(`${Base_url}/apis/storeClosing/get?${params}`);
      setStoreClosings(response.data.data || []);

      const sales = response.data.data?.reduce((sum: number, closing: StoreClosing) => sum + closing.totalSales, 0) || 0;
      const expenses = response.data.data?.reduce((sum: number, closing: StoreClosing) => sum + closing.totalExpenses, 0) || 0;
      setTotalSales(sales);
      setTotalExpenses(expenses);
    } catch (error) {
      console.error('Error fetching store closings:', error);
      setStoreClosings([]);
    } finally {
      setLoading(false);
    }
  };

  const loadClosingPrep = async (date: Dayjs) => {
    const dateStr = date.format('YYYY-MM-DD');
    setPrepLoading(true);
    try {
      const response = await axios.get(`${Base_url}/apis/storeClosing/prep`, {
        params: { date: dateStr },
      });
      const prep: ClosingPrep = response.data?.prep || {};
      if (prep.alreadyClosed) {
        message.warning('This date already has a store closing.');
      }
      form.setFieldsValue({
        openingCash: prep.openingCash ?? 0,
        totalSales: prep.totalSales ?? 0,
        cashSales: prep.cashSales ?? 0,
        creditSales: prep.creditSales ?? 0,
        cardTransactions: prep.cardTransactions ?? 0,
        onlineCash: prep.onlineCash ?? prep.bankTransfer ?? 0,
        chequePayments: prep.chequePayments ?? 0,
        totalExpenses: prep.totalExpenses ?? 0,
        cashDeposit: prep.cashDeposit ?? 0,
      });
    } catch (error) {
      console.error('Error loading closing prep:', error);
      message.error('Failed to load POS data for this date');
    } finally {
      setPrepLoading(false);
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
            day: 'numeric',
          })}
        </span>
      ),
    },
    {
      title: 'Opening Cash',
      dataIndex: 'openingCash',
      key: 'openingCash',
      render: (amount: number) => (
        <span className="text-blue-600 font-semibold">Rs. {amount.toLocaleString()}</span>
      ),
    },
    {
      title: 'Cash',
      dataIndex: 'cashSales',
      key: 'cashSales',
      render: (amount: number) => (
        <span className="text-green-600 font-semibold">Rs. {(amount || 0).toLocaleString()}</span>
      ),
    },
    {
      title: 'Credit',
      dataIndex: 'creditSales',
      key: 'creditSales',
      render: (amount: number) => (
        <span className="text-amber-600 font-semibold">Rs. {(amount || 0).toLocaleString()}</span>
      ),
    },
    {
      title: 'Card',
      dataIndex: 'cardTransactions',
      key: 'cardTransactions',
      render: (amount: number) => (
        <span className="text-indigo-600 font-semibold">Rs. {(amount || 0).toLocaleString()}</span>
      ),
    },
    {
      title: 'Bank Transfer',
      dataIndex: 'onlineCash',
      key: 'onlineCash',
      render: (amount: number) => (
        <span className="text-cyan-600 font-semibold">Rs. {(amount || 0).toLocaleString()}</span>
      ),
    },
    {
      title: 'Cheque',
      dataIndex: 'chequePayments',
      key: 'chequePayments',
      render: (amount: number) => (
        <span className="text-teal-600 font-semibold">Rs. {(amount || 0).toLocaleString()}</span>
      ),
    },
    {
      title: 'Cash Deposit',
      dataIndex: 'cashDeposit',
      key: 'cashDeposit',
      render: (amount: number) => (
        <span className="text-orange-600 font-semibold">Rs. {(amount || 0).toLocaleString()}</span>
      ),
    },
    {
      title: 'Expenses',
      dataIndex: 'totalExpenses',
      key: 'totalExpenses',
      render: (amount: number) => (
        <span className="text-red-600 font-semibold">Rs. {amount.toLocaleString()}</span>
      ),
    },
    {
      title: 'Cash in Hand',
      dataIndex: 'cashInHand',
      key: 'cashInHand',
      render: (amount: number) => (
        <span className="text-purple-600 font-semibold">Rs. {amount.toLocaleString()}</span>
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
      render: (text: string) => <span className="text-gray-700">{text}</span>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_text: unknown, record: StoreClosing) => (
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
            <p style="margin: 8px 0;"><strong>Closed By:</strong> ${record.closedBy?.name || '—'}</p>
          </div>
          <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <h4 style="margin-top: 0; color: #1e40af;">Cash Flow</h4>
            <p style="margin: 8px 0;"><strong>Opening Cash:</strong> Rs. ${record.openingCash.toLocaleString()}</p>
            <p style="margin: 8px 0;"><strong>Cash (POS):</strong> <span style="color: #059669;">Rs. ${(record.cashSales || 0).toLocaleString()}</span></p>
            <p style="margin: 8px 0;"><strong>Credit:</strong> Rs. ${(record.creditSales || 0).toLocaleString()}</p>
            <p style="margin: 8px 0;"><strong>Card:</strong> Rs. ${(record.cardTransactions || 0).toLocaleString()}</p>
            <p style="margin: 8px 0;"><strong>Bank Transfer:</strong> Rs. ${(record.onlineCash || 0).toLocaleString()}</p>
            <p style="margin: 8px 0;"><strong>Cheque:</strong> Rs. ${(record.chequePayments || 0).toLocaleString()}</p>
            <p style="margin: 8px 0;"><strong>Total Sales:</strong> Rs. ${record.totalSales.toLocaleString()}</p>
            <p style="margin: 8px 0;"><strong>Expenses:</strong> <span style="color: #dc2626;">Rs. ${record.totalExpenses.toLocaleString()}</span></p>
            <p style="margin: 8px 0;"><strong>Cash Deposit (Bank):</strong> <span style="color: #ea580c;">Rs. ${(record.cashDeposit || 0).toLocaleString()}</span></p>
          </div>
          <div style="background: ${record.difference >= 0 ? '#dcfce7' : '#fee2e2'}; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <h4 style="margin-top: 0; color: ${record.difference >= 0 ? '#16a34a' : '#dc2626'};">Closing Summary</h4>
            <p style="margin: 8px 0;"><strong>Expected Cash:</strong> Rs. ${record.expectedCash.toLocaleString()}</p>
            <p style="margin: 8px 0;"><strong>Cash in Hand:</strong> Rs. ${record.cashInHand.toLocaleString()}</p>
            <p style="margin: 8px 0; font-size: 16px;"><strong>Difference:</strong> <span style="color: ${record.difference >= 0 ? '#16a34a' : '#dc2626'}; font-weight: bold;">${record.difference >= 0 ? '+' : ''} Rs. ${record.difference.toLocaleString()}</span></p>
            <p style="margin: 8px 0; font-size: 13px; color: #6b7280;">Next day opening cash = this cash in hand</p>
          </div>
          ${record.notes ? `<div style="background: #fef3c7; padding: 15px; border-radius: 8px;"><h4 style="margin-top: 0; color: #92400e;">Notes</h4><p style="margin: 0;">${record.notes}</p></div>` : ''}
        </div>
      `,
      showCloseButton: true,
      width: 620,
    });
  };

  const handleAddStoreClosing = async () => {
    form.resetFields();
    const today = dayjs();
    form.setFieldsValue({ closingDate: today, cashDeposit: 0 });
    setIsModalOpen(true);
    await loadClosingPrep(today);
  };

  const handleModalSubmit = async () => {
    try {
      const values = await form.validateFields();
      const userId = getCurrentUserId();
      if (!userId) {
        message.error('User not logged in');
        return;
      }

      const expectedCash = calcExpectedCash(
        values.openingCash,
        values.cashSales,
        values.totalExpenses,
        values.cashDeposit,
      );
      const difference = (Number(values.cashInHand) || 0) - expectedCash;

      const data = {
        ...values,
        closingDate: values.closingDate?.format('YYYY-MM-DD'),
        cashSales: Number(values.cashSales) || 0,
        creditSales: Number(values.creditSales) || 0,
        onlineCash: Number(values.onlineCash) || 0,
        cardTransactions: Number(values.cardTransactions) || 0,
        chequePayments: Number(values.chequePayments) || 0,
        cashDeposit: Number(values.cashDeposit) || 0,
        expectedCash,
        difference,
        closedBy: userId,
        status: 'Closed',
      };

      const response = await axios.post(`${Base_url}/apis/storeClosing/create`, data);

      if (response.data && response.data.status === 'ok') {
        message.success(response.data.message || 'Store closing recorded successfully');
        setIsModalOpen(false);
        fetchStoreClosings();
      } else {
        throw new Error(response.data.error || 'Failed to save store closing');
      }
    } catch (error: unknown) {
      console.error('Error saving store closing:', error);
      const err = error as { response?: { data?: { error?: string; message?: string } }; message?: string };
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Failed to save store closing';
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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Store Closings</h1>
          <div className="flex items-center space-x-2">
            <Button icon={<DownloadOutlined />} onClick={handleExport}>Excel</Button>
            <Button icon={<PrinterOutlined />} onClick={handlePrint}>Print</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddStoreClosing} className="bg-primary hover:bg-opacity-90">
              + Add Store Closing
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RangePicker
              value={dateRange}
              onChange={(dates) => {
                setDateRange(dates as [Dayjs | null, Dayjs | null]);
                setCurrentPage(1);
              }}
              placeholder={['From Date', 'To Date']}
              className="w-full"
            />
            <Search
              placeholder="Search by Closed By Name"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (!e.target.value) setCurrentPage(1);
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="bg-blue-50 border-blue-200">
            <Statistic title="Total Closings" value={storeClosings.length} prefix={<SearchOutlined className="text-blue-500" />} valueStyle={{ color: '#2563eb' }} />
          </Card>
          <Card className="bg-green-50 border-green-200">
            <Statistic title="Total Sales" value={totalSales} prefix="Rs." precision={2} valueStyle={{ color: '#16a34a' }} />
          </Card>
          <Card className="bg-red-50 border-red-200">
            <Statistic title="Total Expenses" value={totalExpenses} prefix="Rs." precision={2} valueStyle={{ color: '#dc2626' }} />
          </Card>
          <Card className="bg-purple-50 border-purple-200">
            <Statistic title="Net Amount" value={totalSales - totalExpenses} prefix="Rs." precision={2} valueStyle={{ color: '#9333ea' }} />
          </Card>
        </div>

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
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
            }}
            scroll={{ x: 1600 }}
          />
        </Card>

        <Modal
          title={
            <div className="flex items-center">
              <div className="w-10 h-10 bg-primary rounded flex items-center justify-center text-white font-bold mr-3">
                <PlusOutlined />
              </div>
              <span className="text-lg font-semibold text-gray-800">Add Store Closing</span>
            </div>
          }
          open={isModalOpen}
          onOk={handleModalSubmit}
          onCancel={() => setIsModalOpen(false)}
          width={820}
          okText="Save Closing"
          cancelText="Cancel"
          confirmLoading={prepLoading}
          okButtonProps={{ className: 'bg-primary hover:bg-opacity-90' }}
        >
          
          <Form form={form} layout="vertical">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item
                name="closingDate"
                label={<span className="font-semibold text-gray-700">Closing Date <span className="text-red-500">*</span></span>}
                rules={[{ required: true, message: 'Please select date' }]}
              >
                <DatePicker
                  className="w-full"
                  placeholder="Select closing date"
                  format="DD/MM/YYYY"
                  onChange={async (date) => {
                    if (date) await loadClosingPrep(date);
                  }}
                />
              </Form.Item>

              <Form.Item
                name="openingCash"
                label={
                  <span className="font-semibold text-gray-700">
                    Opening Cash <span className="text-xs text-gray-500 ml-1">(from previous closing)</span>
                  </span>
                }
                rules={[{ required: true, message: 'Opening cash is required' }]}
              >
                <Input type="number" min={0} step={0.01} prefix="Rs." readOnly className="bg-gray-50 cursor-not-allowed" />
              </Form.Item>
            </div>

            <p className="text-sm text-gray-600 mb-2 font-medium">POS Payment Methods (auto from bills)</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
              <Form.Item name="cashSales" label="Cash" className="mb-0">
                {renderReadOnlyAmount()}
              </Form.Item>
              <Form.Item name="creditSales" label="Credit" className="mb-0">
                {renderReadOnlyAmount()}
              </Form.Item>
              <Form.Item name="cardTransactions" label="Card" className="mb-0">
                {renderReadOnlyAmount()}
              </Form.Item>
              <Form.Item name="onlineCash" label="Bank Transfer" className="mb-0">
                {renderReadOnlyAmount()}
              </Form.Item>
              <Form.Item name="chequePayments" label="Cheque" className="mb-0">
                {renderReadOnlyAmount()}
              </Form.Item>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Form.Item name="totalSales" label={<span className="font-semibold text-gray-700">Total Sales <span className="text-xs text-gray-500">(POS)</span></span>}>
                {renderReadOnlyAmount()}
              </Form.Item>

              <Form.Item
                name="totalExpenses"
                label={<span className="font-semibold text-gray-700">Expenses <span className="text-xs text-gray-500">(Pharmacy)</span></span>}
                rules={[{ required: true, message: 'Expenses required' }]}
              >
                {renderReadOnlyAmount()}
              </Form.Item>

              <Form.Item
                name="cashDeposit"
                label={
                  <span className="font-semibold text-gray-700">
                    Cash Deposit <span className="text-xs text-orange-600">(bank — goes out)</span>
                  </span>
                }
                rules={[{ required: true, message: 'Enter cash deposit (0 if none)' }]}
              >
                <Input type="number" min={0} step={0.01} prefix="Rs." placeholder="Amount deposited to bank" />
              </Form.Item>
            </div>

            <Form.Item
              name="cashInHand"
              label={
                <span className="font-semibold text-gray-700">
                  Cash in Hand <span className="text-red-500">*</span>
                  <span className="text-xs text-gray-500 ml-1">(physical count — next day opening)</span>
                </span>
              }
              rules={[{ required: true, message: 'Please enter cash in hand' }]}
            >
              <Input type="number" min={0} step={0.01} placeholder="Actual cash remaining in drawer" prefix="Rs." />
            </Form.Item>

            <div className={`p-4 rounded-lg mb-4 border ${liveDifference >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 mb-1">Expected Cash</p>
                  <p className="text-lg font-bold text-gray-800">
                    Rs. {liveExpectedCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Opening + Cash − Expenses − Deposit</p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Difference</p>
                  <p className={`text-lg font-bold ${liveDifference >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {liveDifference >= 0 ? '+' : ''} Rs. {liveDifference.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            <Form.Item name="notes" label={<span className="font-semibold text-gray-700">Notes</span>}>
              <Input.TextArea rows={3} placeholder="Any notes or discrepancy explanation..." />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </>
  );
};

export default StoreClosings;
