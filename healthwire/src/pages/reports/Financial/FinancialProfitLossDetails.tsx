import React, { useEffect, useState, useRef } from 'react';
import {
  Table,
  DatePicker,
  Select,
  Input,
  Button,
  message,
  Card,
  Row,
  Col,
  Statistic,
  Spin,
  Tabs,
} from 'antd';
import axios from 'axios';
import moment from 'moment';
import {
  RiDeleteBin5Line,
  RiEdit2Fill,
  RiFile2Line,
  RiFileExcel2Line,
  RiPrinterLine,
} from 'react-icons/ri';
import logoDataUrl from '../../../images/logo-icon.png';
import { Base_url } from '../../../utils/Base_url';

import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import * as XLSX from 'xlsx';
import { useReactToPrint } from 'react-to-print';
import { Link } from 'react-router-dom';
import { Document, Image, Page, pdf, StyleSheet, Text, View } from '@react-pdf/renderer';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { TabPane } = Tabs;

const FinancialProfitLossDetails = () => {
  const [expenses, setExpenses] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filteredData, setFilteredData] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [paymentModes, setPaymentModes] = useState([
    'Cash',
    'Credit Card',
    'Debit Card',
    'Bank Transfer',
    'Cheque',
  ]);
  const [activeTab, setActiveTab] = useState('profitLoss');
  const tableRef = useRef();

  const [filters, setFilters] = useState({
    dateRange: ['', ''],
    category: '',
    paymentMode: '',
    description: '',
    minAmount: '',
    maxAmount: '',
  });

  // Fetch expense categories
  const fetchExpenseCategories = async () => {
    try {
      const response = await axios.get(`${Base_url}/apis/expenseCategory/get`);
      setExpenseCategories(response.data.data || []);
    } catch (error) {
      message.error('Failed to fetch expense categories');
    }
  };

  const fetchExpenses = async () => {
    try {
         const params = {
      fromDate: filters.dateRange?.[0] && moment.isMoment(filters.dateRange[0])
        ? filters.dateRange[0].format('YYYY-MM-DD')
        : '',
      toDate: filters.dateRange?.[1] && moment.isMoment(filters.dateRange[1])
        ? filters.dateRange[1].format('YYYY-MM-DD')
        : '',
      expenseCategoryId: filters.category || '',
      paymentMode: filters.paymentMode || '',
      description: filters.description || '',
      minAmount: filters.minAmount || '',
      maxAmount: filters.maxAmount || '',
    };

    
    
    const response = await axios.get(`${Base_url}/apis/expense/get?expenseCategoryId=${params?.expenseCategoryId}&paymentMode=${params?.paymentMode}&fromDate=${params?.fromDate}&toDate=${params?.toDate}`);
      const data = response?.data?.data || [];

      const transformedData = data.map((expense) => ({
        key: expense._id,
        _id: expense._id,
        type: 'expense',
        voucherNo: expense._id.substring(0, 6).toUpperCase(),
        date: expense.createdAt,
        description: expense.description,
        category: expense.expenseCategoryId?.name || 'N/A',
        paymentMode: expense.paymentMode || 'N/A',
        amount: expense.amount || 0,
        image: expense.image,
      }));

      setExpenses(transformedData);
      return transformedData;
    } catch (err) {
      // message.error('Failed to fetch expenses');
      // console.error('Expense fetch error:', err);
      return [];
    }
  };

  const fetchInvoices = async () => {
    try {
     

      const response = await axios.get(`${Base_url}/apis/invoice/get`);

      const data = response?.data?.data || [];

      const transformedData = data.map((invoice) => ({
        key: invoice._id,
        _id: invoice._id,
        type: 'revenue',
        voucherNo: invoice.invoiceNo,
        date: invoice.createdAt,
        description: 'Treatment Invoice',
        category: 'Revenue',
        paymentMode: invoice.payment?.[0]?.method || 'Multiple',
        amount: invoice.totalPay || 0,
        patientName: invoice.patientId?.name || 'N/A',
      }));

      setInvoices(transformedData);
      return transformedData;
    } catch (err) {
      message.error('Failed to fetch invoices');
      console.error('Invoice fetch error:', err);
      return [];
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [expensesData, invoicesData] = await Promise.all([
        fetchExpenses(),
        fetchInvoices()
      ]);
      
      // Combine and sort by date
      const combinedData = [...expensesData, ...invoicesData].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
      );
      
      setFilteredData(combinedData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => {
    axios
      .delete(`${Base_url}/apis/expense/delete/${id}`)
      .then((res) => {
        message.success('Expense deleted successfully');
        fetchData();
      })
      .catch((err) => {
        message.error('Failed to delete expense');
      });
  };

  useEffect(() => {
    fetchExpenseCategories();
  }, []);

  useEffect(() => {
    if (expenseCategories.length > 0) {
      fetchData();
    }
  }, [filters, expenseCategories]);

  const calculateSummary = () => {
    const totalRevenue = invoices.reduce((sum, i) => sum + i.amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalRevenue - totalExpenses;
    
    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      transactionCount: filteredData.length,
    };
  };

  const summary = calculateSummary();

   const ExpenseVoucherPdf = ({ expense }) => {
    const styles = StyleSheet.create({
      page: {
        padding: 30,
        fontFamily: 'Helvetica',
      },
      header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
      },
      clinicInfo: {
        textAlign: 'center',
        marginBottom: 10,
      },
      clinicName: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 2,
      },
      clinicAddress: {
        fontSize: 10,
        marginBottom: 2,
      },
      voucherTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 10,
        textDecoration: 'underline',
      },
      voucherNumber: {
        textAlign: 'right',
        fontSize: 10,
        marginBottom: 15,
      },
      table: {
        width: '100%',
        marginBottom: 20,
      },
      tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#000',
        paddingVertical: 5,
      },
      tableHeader: {
        fontWeight: 'bold',
        fontSize: 10,
      },
      tableCell: {
        fontSize: 10,
        padding: 2,
      },
      descriptionCell: {
        width: '40%',
      },
      categoryCell: {
        width: '30%',
      },
      amountCell: {
        width: '30%',
        textAlign: 'right',
      },
      totalRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 10,
      },
      totalLabel: {
        fontWeight: 'bold',
        fontSize: 10,
        marginRight: 10,
      },
      totalAmount: {
        fontWeight: 'bold',
        fontSize: 10,
      },
      footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 30,
      },
      signature: {
        fontSize: 10,
        textAlign: 'center',
      },
    });

    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <Image src={logoDataUrl} style={{ width: 50, height: 50 }} />
            <View style={styles.clinicInfo}>
              <Text style={styles.clinicName}>HOLISTIC CARE CLINIC</Text>
              <Text style={styles.clinicAddress}>Punjab, Pakistan</Text>
              <Text style={styles.clinicAddress}>0342-4211888</Text>
            </View>
          </View>

          <View style={styles.voucherNumber}>
            <Text>Voucher # {expense.voucherNo}</Text>
          </View>

          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[styles.tableCell, styles.descriptionCell]}>Description</Text>
              <Text style={[styles.tableCell, styles.categoryCell]}>Category</Text>
              <Text style={[styles.tableCell, styles.amountCell]}>Amount</Text>
            </View>

            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.descriptionCell]}>{expense.description}</Text>
              <Text style={[styles.tableCell, styles.categoryCell]}>{expense.category}</Text>
              <Text style={[styles.tableCell, styles.amountCell]}>{expense.amount.toFixed(2)}</Text>
            </View>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalAmount}>{expense.amount.toFixed(2)}</Text>
          </View>

          <View style={styles.footer}>
            <View>
              <Text style={styles.signature}>Created By</Text>
            </View>
            <View>
              <Text style={styles.signature}>Checked By</Text>
            </View>
            <View>
              <Text style={styles.signature}>Received By</Text>
            </View>
          </View>
        </Page>
      </Document>
    );
  };

  const generatePdf = async (expense) => {
    try {
      const blob = await pdf(
        <ExpenseVoucherPdf expense={expense} />
      ).toBlob();
      
      const pdfUrl = URL.createObjectURL(blob);
      window.open(pdfUrl, '_blank');
      
      setTimeout(() => {
        URL.revokeObjectURL(pdfUrl);
      }, 1000);
    } catch (error) { 
      message.error('Failed to generate PDF');
      console.error('PDF generation error:', error);
    }
  };

  const columns = [
    {
      title: 'TYPE',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type) => (
        <span style={{ 
          color: type === 'revenue' ? 'green' : 'red',
          fontWeight: 'bold'
        }}>
          {type === 'revenue' ? 'Revenue' : 'Expense'}
        </span>
      ),
    },
    {
      title: 'VOUCHER #',
      dataIndex: 'voucherNo',
      key: 'voucherNo',
      width: 120,
    },
    {
      title: 'DATE',
      dataIndex: 'date',
      key: 'date',
      render: (date) => moment(date).format('DD/MM/YYYY'),
      width: 120,
    },
    {
      title: 'DESCRIPTION',
      dataIndex: 'description',
      key: 'description',
      width: 200,
    },
    {
      title: 'CATEGORY/PAYER',
      dataIndex: 'category',
      key: 'category',
      width: 150,
      render: (text, record) => (
        record.type === 'revenue' ? record.patientName : text
      ),
    },
    {
      title: 'PAYMENT MODE',
      dataIndex: 'paymentMode',
      key: 'paymentMode',
      width: 150,
    },
    {
      title: 'AMOUNT',
      dataIndex: 'amount',
      key: 'amount',
      width: 100,
      render: (value, record) => (
        <span style={{ 
          color: record.type === 'revenue' ? 'green' : 'red',
          fontWeight: 'bold'
        }}>
          {value}
        </span>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <div className='flex items-center gap-2'>
          {record.type === 'expense' && (
            <>
              <RiFile2Line
                className="text-red-500 text-xl cursor-pointer" 
                onClick={() => generatePdf(record)} 
              />
            
             {/* <Link to={`/expenses/edit/${record._id}`}>              
                <RiEdit2Fill
                  className='text-primary' 
                  size={20} 
                  style={{ cursor: 'pointer' }}
                />
              </Link> */}
                    
              <RiDeleteBin5Line
                color='red' 
                size={20} 
                onClick={() => handleDelete(record._id)} 
                style={{ cursor: 'pointer' }}
              />
            </>
          )}
        </div>
      ),
    }
  ];

  return (
    <>
      <div className="">
        <Breadcrumb pageName="Financial Report" />
        <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default sm:px-7.5 xl:pb-1">
          <Spin spinning={loading}>
            <div className="mb-5">
              <div className="flex justify-between items-center mb-4">
                <h1 className="text-xl font-semibold text-black">
                  Financial Report
                </h1>

                <div className="flex gap-2">
                  <Button
                    type="default"
                    icon={<RiFileExcel2Line />}
                    onClick={() => {
                      const ws = XLSX.utils.json_to_sheet(filteredData);
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(
                        wb,
                        ws,
                        'Financial_Transactions',
                      );
                      XLSX.writeFile(
                        wb,
                        `Financial_Report_${moment().format(
                          'YYYYMMDD_HHmmss',
                        )}.xlsx`,
                      );
                    }}
                    className="flex items-center"
                  >
                    Export Excel
                  </Button>
                  <Button
                    type="default"
                    icon={<RiPrinterLine />}
                    onClick={useReactToPrint({
                      content: () => tableRef.current,
                      pageStyle: `
                        @page { size: auto; margin: 10mm; }
                        @media print {
                          body { -webkit-print-color-adjust: exact; }
                          table { width: 100%; border-collapse: collapse; }
                          th { background-color: #f0f0f0 !important; }
                          td, th { border: 1px solid #ddd; padding: 8px; }
                        }
                      `,
                      documentTitle: `Financial_Report_${moment().format(
                        'YYYYMMDD_HHmmss',
                      )}`,
                    })}
                    className="flex items-center"
                  >
                    Print
                  </Button>
                </div>
              </div>
            
              <div className='flex gap-2 mb-4'>
                <Link to={'/financial/financial-report'} className='px-2 py-1 text-black rounded hover:bg-gray-100 transition-colors'>
                  Transaction
                </Link>
                <Link to={'/financial/profit-loss-details'} className='px-2 py-1 border-b-2 border-primary text-primary hover:bg-gray transition-colors'>
                  Profit/Loss Details
                </Link>
              </div>

              {/* Summary Section */}
              <div className="flex gap-4 mb-4 flex-wrap">
                <Card title="Financial Summary" className="flex-1 min-w-[300px]">
                  <Row gutter={16}>
                    <Col span={8}>
                      <Statistic
                        title="Total Revenue"
                        value={summary.totalRevenue}
                        // precision={2}
                        prefix="PKR"
                        valueStyle={{ color: 'green' }}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="Total Expenses"
                        value={summary.totalExpenses}
                        // precision={2}
                        prefix="PKR"
                        valueStyle={{ color: 'red' }}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="Net Profit/Loss"
                        value={summary.netProfit}
                        // precision={2}
                        prefix="PKR"
                        valueStyle={{ 
                          color: summary.netProfit >= 0 ? 'green' : 'red'
                        }}
                      />
                    </Col>
                  </Row>
                </Card>
              </div>

              {/* Filters Section */}
              <Card title="Filters" className="mb-4">
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12} md={8} lg={6}>
                    <Select
                      placeholder="Select Category"
                      style={{ width: '100%' }}
                      value={filters.category}
                      onChange={(value) =>
                        setFilters({ ...filters, category: value })
                      }
                      allowClear
                      showSearch
                      optionFilterProp="children"
                    >
                      <Option value="">All Categories</Option>
                      {expenseCategories.map((category) => (
                        <Option key={category._id} value={category._id}>
                          {category.name}
                        </Option>
                      ))}
                    </Select>
                  </Col>

                  <Col xs={24} sm={12} md={8} lg={6}>
                    <Select
                      placeholder="Select Payment Mode"
                      style={{ width: '100%' }}
                      value={filters.paymentMode}
                      onChange={(value) =>
                        setFilters({ ...filters, paymentMode: value })
                      }
                      allowClear
                    >
                      <Option value="">All Payment Modes</Option>
                      {paymentModes.map((mode) => (
                        <Option key={mode} value={mode}>
                          {mode}
                        </Option>
                      ))}
                    </Select>
                  </Col>

                  <Col xs={24} sm={12} md={8} lg={6}>
                    <Input
                      placeholder="Search by description"
                      value={filters.description}
                      onChange={(e) =>
                        setFilters({ ...filters, description: e.target.value })
                      }
                    />
                  </Col>

                  <Col xs={24} sm={12} md={8} lg={6}>
                    <RangePicker
                      style={{ width: '100%' }}
                      value={filters.dateRange}
                      onChange={(dates) =>
                        setFilters({ ...filters, dateRange: dates })
                      }
                      format="DD/MM/YYYY"
                      allowClear
                    />
                  </Col>

                  <Col xs={24} className="flex justify-end gap-2">
                    <Button
                      type="default"
                      onClick={() => fetchData()}
                      loading={loading}
                    >
                      Search
                    </Button>
                    <Button
                      onClick={() => {
                        setFilters({
                          dateRange: [
                            moment().startOf('month'),
                            moment().endOf('day'),
                          ],
                          category: '',
                          paymentMode: '',
                          description: '',
                          minAmount: '',
                          maxAmount: '',
                        });
                      }}
                    >
                      Reset
                    </Button>
                  </Col>
                </Row>
              </Card>
            </div>

            <div ref={tableRef}>
              <Table
                columns={columns}
                dataSource={filteredData}
                loading={loading}
                scroll={{ x: 1000 }}
                pagination={{
                  pageSize: 25,
                  showSizeChanger: true,
                  showTotal: (total) => `Showing ${total} transactions`,
                  pageSizeOptions: ['10', '25', '50', '100'],
                }}
                bordered
                size="middle"
                locale={{
                  emptyText: 'No transactions found',
                }}
                summary={() => (
                  <Table.Summary fixed>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={6} align="right">
                        <strong>Net Profit/Loss</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1}>
                        <strong style={{
                          color: summary.netProfit >= 0 ? 'green' : 'red'
                        }}>
                          {summary.netProfit.toFixed(2)}
                        </strong>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                )}
              />
            </div>
          </Spin>
        </div>
      </div>
    </>
  );
};

export default FinancialProfitLossDetails;