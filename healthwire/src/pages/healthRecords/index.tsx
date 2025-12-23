import React, { useEffect, useState } from 'react';
import { Table, message, Select, DatePicker, Input } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment';
import { RiDeleteBin5Line, RiFile2Line, RiPrinterLine } from 'react-icons/ri';
import { Base_url } from '../../utils/Base_url';
import logoDataUrl from '../../images/logo-icon.png';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';

import {
  PDFDownloadLink,
  Document,
  Page,
  View,
  Image,
  Text,
  StyleSheet,
  pdf,
} from '@react-pdf/renderer';
const { Option } = Select;
const { RangePicker } = DatePicker;



// PDF Styles
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    alignItems: 'center',
  },
  logo: {
    width: 60,
    height: 100,
  },
  clinicInfo: {
    textAlign: 'center',
    marginBottom: 10,
    flex: 1,
  },
  clinicName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  clinicAddress: {
    fontSize: 10,
    marginBottom: 2,
  },
  invoiceTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    textDecoration: 'underline',
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    marginBottom: 15,
  },
  patientInfo: {
    marginBottom: 15,
    fontSize: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  infoLabel: {
    fontWeight: 'bold',
    width: 80,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingBottom: 5,
    marginBottom: 5,
    fontSize: 10,
  },
  tableRow: {
    flexDirection: 'row',
    marginBottom: 5,
    fontSize: 10,
  },
  descriptionColumn: {
    width: '40%',
    paddingRight: 5,
  },
  rateColumn: {
    width: '15%',
    paddingRight: 5,
    textAlign: 'right',
  },
  quantityColumn: {
    width: '10%',
    paddingRight: 5,
    textAlign: 'right',
  },
  amountColumn: {
    width: '15%',
    paddingRight: 5,
    textAlign: 'right',
  },
  discountColumn: {
    width: '15%',
    textAlign: 'right',
  },
  totalsContainer: {
    marginTop: 20,
    alignSelf: 'flex-end',
    width: '40%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  grandTotal: {
    borderTopWidth: 1,
    borderTopColor: '#000',
    paddingTop: 5,
    marginTop: 5,
    fontWeight: 'bold',
  },
  notes: {
    fontSize: 9,
    color: '#666',
    marginTop: 30,
    fontStyle: 'italic',
  },
  footer: {
    marginTop: 40,
    fontSize: 9,
    textAlign: 'center',
  },
  signature: {
    marginTop: 40,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});

const InvoicePdf = ({ invoice, patient }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Image src={logoDataUrl} style={styles.logo} />
        <View style={styles.clinicInfo}>
          <Text style={styles.clinicName}>HOLISTIC CARE CLINIC</Text>
          <Text style={styles.clinicAddress}>188-Y Block Phase III, DHA, Lahore, Punjab, Pakistan</Text>
          <Text style={styles.clinicAddress}>Phone: 0342-4211888 | Email: info@holisticcare.com</Text>
        </View>
      </View>

      <Text style={styles.invoiceTitle}>INVOICE</Text>

      <View style={styles.divider} />

      <View style={styles.patientInfo}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Invoice #:</Text>
          <Text>{invoice._id.substring(0, 6).toUpperCase()}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Date:</Text>
          <Text>{moment(invoice.createdAt).format('DD/MM/YYYY h:mm A')}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Patient:</Text>
          <Text>{patient?.name}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>MR #:</Text>
          <Text>{patient?.mr}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Doctor:</Text>
          <Text>{invoice.doctorId?.name}</Text>
        </View>
      </View>

      <View style={styles.tableHeader}>
        <Text style={styles.descriptionColumn}>Description</Text>
        <Text style={styles.rateColumn}>Rate</Text>
        <Text style={styles.quantityColumn}>Qty</Text>
        <Text style={styles.amountColumn}>Amount</Text>
        <Text style={styles.discountColumn}>Discount</Text>
      </View>

      {invoice.item && invoice.item.map((item, index) => (
        <View key={index} style={styles.tableRow}>
          <Text style={styles.descriptionColumn}>{item.description}</Text>
          <Text style={styles.rateColumn}>{item.rate?.toFixed(2)}</Text>
          <Text style={styles.quantityColumn}>{item.quantity}</Text>
          <Text style={styles.amountColumn}>{item.amount?.toFixed(2)}</Text>
          <Text style={styles.discountColumn}>{item.discount?.toFixed(2)}</Text>
        </View>
      ))}

      <View style={styles.totalsContainer}>
        <View style={styles.totalRow}>
          <Text style={{fontSize:12}}>Sub Total:</Text>
          <Text style={{fontSize:12}}>Rs. {invoice.subTotalBill?.toFixed(2)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={{fontSize:12}}>Discount:</Text>
          <Text style={{fontSize:12}}>Rs. {invoice.discountBill?.toFixed(2)}</Text>
        </View>
        <View style={[styles.totalRow, styles.grandTotal]}>
          <Text style={{fontSize:12}}>Grand Total:</Text>
          <Text style={{fontSize:12}}>Rs. {invoice.totalBill?.toFixed(2)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={{fontSize:12}}>Amount Paid:</Text>
          <Text style={{fontSize:12}}>Rs. {invoice.totalPay?.toFixed(2)}</Text>
        </View>
        <View style={[styles.totalRow, {marginTop: 5}]}>
          <Text style={{fontSize:12}}>Balance Due:</Text>
          <Text style={{fontSize:12}}>Rs. {invoice.duePay?.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.notes}>
        <Text>* Procedures & Medicines once purchased are non-refundable.</Text>
        <Text>* Purchased Packages Are Valid for 80m (CW).</Text>
      </View>

      <View style={styles.signature}>
        <View>
          <Text>_________________________</Text>
          <Text style={{fontSize:14}}>Authorized Signature</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text>Thank you for choosing Holistic Care Clinic</Text>
        <Text>For any queries, please contact: 0342-4211888</Text>
      </View>
    </Page>
  </Document>
);

const HealthRecords = () => {
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const navigate = useNavigate();

  const onSelectChange = (newSelectedRowKeys) => {
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
        text: 'Select Odd Row',
        onSelect: (changeableRowKeys) => {
          let newSelectedRowKeys = [];
          newSelectedRowKeys = changeableRowKeys.filter((_, index) => index % 2 !== 0);
          setSelectedRowKeys(newSelectedRowKeys);
        },
      },
      {
        key: 'even',
        text: 'Select Even Row',
        onSelect: (changeableRowKeys) => {
          let newSelectedRowKeys = [];
          newSelectedRowKeys = changeableRowKeys.filter((_, index) => index % 2 === 0);
          setSelectedRowKeys(newSelectedRowKeys);
        },
      },
    ],
  };

  const fetchInvoices = () => {
    setLoading(true);
    axios.get(`${Base_url}/apis/invoice/get`)
      .then((res) => {
        if (res.data && res.data.status === "ok") {
          setInvoices(res.data.data || []);
        } else {
          message.error('Failed to fetch invoices');
        }
        setLoading(false);
      })
      .catch(err => {
        
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleDelete = (id) => {
    axios.delete(`${Base_url}/apis/invoice/delete/${id}`)
      .then((res) => {
        message.success('Invoice deleted successfully');
        fetchInvoices();
      })
      .catch(err => {
        message.error('Failed to delete invoice');
      });
  };

  const formatDate = (dateString) => {
    return moment(dateString).format('DD/MM/YYYY');
  };

  const getPaymentMethod = (payments) => {
    if (!payments || payments.length === 0) return 'N/A';
    return payments[0].method;
  };

  const columns = [
    {
      title: 'SR #',
      dataIndex: '_id',
      key: '_id',
      render: (text, record, index) => index + 1,
      fixed: 'left',
      width: 80,
    },
    {
      title: 'INVOICE #',
      dataIndex: '_id',
      key: 'invoiceNumber',
      render: (text) => text.substring(0, 6).toUpperCase(),
      width: 120,
    },
    
    {
      title: 'DESCRIPTION',
      dataIndex: 'item',
      key: 'description',
      render: (items) => items.length > 0 ? 'Items purchased' : 'No items',
      width: 200,
    },
    {
      title: 'DEPARTMENT',
      dataIndex: 'payment',
      key: 'department',
      render: (payments) => getPaymentMethod(payments),
      width: 150,
    },
    {
      title: 'TOTAL',
      dataIndex: 'totalBill',
      key: 'total',
      render: (text) => `${text?.toFixed(2) || '0.00'}`,
      width: 120,
    },
    {
      title: 'DISCOUNT',
      dataIndex: 'discountBill',
      key: 'discount',
      render: (text) => `${text?.toFixed(2) || '0.00'}`,
      width: 120,
    },
    {
      title: 'PAID',
      dataIndex: 'totalPay',
      key: 'paid',
      render: (text) => `${text?.toFixed(2) || '0.00'}`,
      width: 120,
    },
    {
      title: 'DUES',
      dataIndex: 'duePay',
      key: 'dues',
      render: (text) => `${text?.toFixed(2) || '0.00'}`,
      width: 120,
    },
    {
      title: 'PAYMENT METHOD',
      dataIndex: 'payment',
      key: 'payMethod',
      render: (payments) => (
        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
          {getPaymentMethod(payments)}
        </span>
      ),
      width: 150,
    },
    {
      title: 'DATE',
      dataIndex: 'createdAt',
      key: 'date',
      render: (text) => formatDate(text),
      width: 120,
    },
    {
      title: 'Action',
      key: 'action',
      fixed: 'right',
      render: (_, record) => (
        <div className='flex items-center gap-2'>
            <RiFile2Line 
                  className="text-red-500 text-xl cursor-pointer" 
                  onClick={() => generatePdf(record)} 
                />
                   
          {/* <RiPrinterLine 
            color='blue' 
            size={20} 
            onClick={() => window.print()} 
            style={{ cursor: 'pointer' }}
          /> */}
          <RiDeleteBin5Line 
            color='red' 
            size={20} 
            onClick={() => handleDelete(record._id)} 
            style={{ cursor: 'pointer' }}
          />
        </div>
      ),
      width: 120,
    },
  ];

  
   

     const generatePdf = async (invoice) => {
        try {
          // Create the PDF blob
          const blob = await pdf(<InvoicePdf invoice={invoice} patient={invoice?.patientId} />).toBlob();
          
          // Create object URL
          const pdfUrl = URL.createObjectURL(blob);
          
          // Open in new tab
          window.open(pdfUrl, '_blank');
          
          // Clean up after some time (optional)
          setTimeout(() => {
            URL.revokeObjectURL(pdfUrl);
          }, 1000);
          
        } catch (error) {
          message.error('Failed to generate PDF');
          console.error('PDF generation error:', error);
        }
      };
    

  return (
    <>
      <div className="">
        <Breadcrumb pageName="Health Records" />
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
           <div className=' flex items-center gap-2'>
             <label className=' text-black'>Date:</label>
            <div className=' w-64'>
               <RangePicker 
              defaultValue={[
                moment().startOf('month'),
                moment().endOf('month')
              ]} 
              format="DD/MM/YYYY"
            />
            </div>
           </div>
            <div className=' flex items-center gap-2'>
              <label className=' whitespace-nowrap text-black'>Search Patient:</label>
            <Input placeholder='Name, MR# or Phone' />
            </div>
          </div>
          <Link
            to="/admin/health-records/new"
            className="inline-flex items-center justify-center gap-2.5 rounded-md bg-primary py-2 text-center font-medium text-white hover:bg-opacity-90 px-7"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="20px" height="20px">
              <g fill="#ffffff" fillRule="nonzero" stroke="none" strokeWidth="1" strokeLinecap="butt" strokeLinejoin="miter" strokeMiterlimit="10" strokeDasharray="" strokeDashoffset="0" fontFamily="none" fontWeight="none" fontSize="none" textAnchor="none">
                <g transform="scale(5.12,5.12)">
                  <path d="M25,2c-12.6907,0 -23,10.3093 -23,23c0,12.69071 10.3093,23 23,23c12.69071,0 23,-10.30929 23,-23c0,-12.6907 -10.30929,-23 -23,-23zM25,4c11.60982,0 21,9.39018 21,21c0,11.60982 -9.39018,21 -21,21c-11.60982,0 -21,-9.39018 -21,-21c0,-11.60982 9.39018,-21 21,-21zM24,13v11h-11v2h11v11h2v-11h11v-2h-11v-11z"></path>
                </g>
              </g>
            </svg>
            Create Health Records

          </Link>
        </div>
        
        <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default sm:px-7.5 xl:pb-1">
          <div className="mb-5">
            <h1 className="text-xl font-semibold text-black">Health Records List</h1>
          </div>
          
          <div className="overflow-x-auto">
            <Table
              rowKey="_id"
              rowSelection={rowSelection}
              columns={columns}
              dataSource={invoices}
              loading={loading}
              scroll={{ x: 1500 }}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50', '100']
              }}
              bordered
            />
          </div>
        </div>
      </div>

      {/* Add custom CSS for table scrolling */}
      <style jsx global>{`
        .ant-table-container {
          overflow-x: auto !important;
        }
        .ant-table {
          min-width: 100% !important;
          width: max-content !important;
        }
      `}</style>
    </>
  );
};

export default HealthRecords;