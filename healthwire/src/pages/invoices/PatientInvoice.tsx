import React, { useEffect, useState, useRef } from 'react';
import { Table, message, Select, DatePicker, Card, Row, Col, Input, Button, Modal } from 'antd';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment';
import { RiDeleteBin5Line, RiEdit2Fill, RiFile2Line, RiPenNibFill, RiPrinterLine } from 'react-icons/ri';
import { Base_url } from '../../utils/Base_url';
import { getInvoiceHeaderForPdf } from '../../utils/branchPdfHeader';
import { enrichInvoiceForPdf } from '../../utils/enrichInvoiceForPdf';
import { sumInvoiceDoctorHospitalShare } from '../../utils/invoiceShare';
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

const InvoicePdf = ({ invoice, patient }) => {
  const header = getInvoiceHeaderForPdf(invoice);
  return (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Image src={logoDataUrl} style={styles.logo} />
        <View style={styles.clinicInfo}>
          <Text style={styles.clinicName}>{header.clinicName}</Text>
          {header.addressLine ? <Text style={styles.clinicAddress}>{header.addressLine}</Text> : null}
          <Text style={styles.clinicAddress}>{header.contactLine}</Text>
        </View>
      </View>

      <Text style={styles.invoiceTitle}>INVOICE</Text>

      <View style={styles.divider} />

      <View style={styles.patientInfo}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Invoice #:</Text>
          <Text>{invoice.invoiceNo || invoice.invoiceNumber || invoice._id?.substring?.(0, 6)?.toUpperCase?.() || 'N/A'}</Text>
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

      {invoice.item && invoice.item.map((item, index) => {
        const printableExpenses = (item.expenses || []).filter((exp: any) => exp?.showInPrint);
        if (printableExpenses.length === 0) return null;
        return (
          <View key={`exp-${index}`} style={{ marginBottom: 6 }}>
            <Text style={{ fontSize: 10, marginBottom: 2, textAlign: 'center', borderTopWidth: 1, borderTopColor: '#000', paddingTop: 3 }}>Breakdown Expense</Text>
            {printableExpenses.map((exp: any, i: number) => (
              <View key={`exp-row-${index}-${i}`} style={styles.tableRow}>
                <Text style={styles.descriptionColumn}>
                  {exp.description || exp.categoryName || 'Expense'}
                </Text>
                <Text style={styles.rateColumn}></Text>
                <Text style={styles.quantityColumn}></Text>
                <Text style={styles.amountColumn}>{(Number(exp.amount) || 0).toFixed(2)}</Text>
                <Text style={styles.discountColumn}></Text>
              </View>
            ))}
          </View>
        );
      })}

      {Array.isArray(invoice.invoiceExpenses) && invoice.invoiceExpenses.filter((e: any) => e?.showInPrint).length > 0 && (
        <View style={{ marginTop: 10, marginBottom: 6 }}>
          <Text style={{ fontSize: 10, marginBottom: 2, textAlign: 'center', borderTopWidth: 1, borderTopColor: '#000', paddingTop: 3 }}>Additional Expenses</Text>
          {invoice.invoiceExpenses.filter((e: any) => e?.showInPrint).map((exp: any, i: number) => (
            <View key={`inv-exp-${i}`} style={styles.tableRow}>
              <Text style={styles.descriptionColumn}>
                {exp.description || exp.categoryName || 'Expense'}
              </Text>
              <Text style={styles.rateColumn}></Text>
              <Text style={styles.quantityColumn}></Text>
              <Text style={styles.amountColumn}>{(Number(exp.amount) || 0).toFixed(2)}</Text>
              <Text style={styles.discountColumn}></Text>
            </View>
          ))}
        </View>
      )}

      {(() => {
        const itemExpenses = (invoice.item || [])
          .flatMap((it: any) => (it.expenses || []).filter((e: any) => e?.showInPrint))
          .reduce((sum: number, e: any) => sum + (Number(e?.amount) || 0), 0);
        const invoiceLevelExpenses = (invoice.invoiceExpenses || [])
          .filter((e: any) => e?.showInPrint)
          .reduce((sum: number, e: any) => sum + (Number(e?.amount) || 0), 0);
        const expensesTotal = itemExpenses + invoiceLevelExpenses;
        return (
          <View style={styles.totalsContainer}>
            <View style={styles.totalRow}>
              <Text style={{fontSize:12}}>Sub Total:</Text>
              <Text style={{fontSize:12}}>Rs. {Number(invoice.subTotalBill || 0).toFixed(2)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={{fontSize:12}}>Discount:</Text>
              <Text style={{fontSize:12}}>Rs. {Number(invoice.discountBill || 0).toFixed(2)}</Text>
            </View>
            {expensesTotal > 0 && (
              <View style={styles.totalRow}>
                <Text style={{fontSize:12}}>Additional Expenses:</Text>
                <Text style={{fontSize:12}}>Rs. {expensesTotal.toFixed(2)}</Text>
              </View>
            )}
            <View style={[styles.totalRow, styles.grandTotal]}>
              <Text style={{fontSize:12}}>Grand Total:</Text>
              <Text style={{fontSize:12}}>Rs. {Number(invoice.totalBill || 0).toFixed(2)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={{fontSize:12}}>Amount Paid:</Text>
              <Text style={{fontSize:12}}>Rs. {Number(invoice.totalPay || 0).toFixed(2)}</Text>
            </View>
            <View style={[styles.totalRow, {marginTop: 5}]}>
              <Text style={{fontSize:12}}>Balance Due:</Text>
              <Text style={{fontSize:12}}>Rs. {Number(invoice.duePay || 0).toFixed(2)}</Text>
            </View>
          </View>
        );
      })()}

      <View style={styles.notes}>
        <Text>* Procedures & Medicines once purchased are non-refundable.</Text>
        <Text>* Purchased Packages Are Valid For 06 Months Only.</Text>
      </View>

      <View style={styles.signature}>
        <View>
          <Text>_________________________</Text>
          <Text style={{fontSize:14}}>Authorized Signature</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text>{header.footerThanks}</Text>
        <Text>{header.footerContactLine}</Text>
      </View>
    </Page>
  </Document>
  );
};

const PatientInvoice = () => {
  const { id } = useParams();
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [pharmacyInvoices, setPharmacyInvoices] = useState([]);
  const [patient, setPatient] = useState({});
  const [loading, setLoading] = useState(false);
  const [pharmacyLoading, setPharmacyLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [procedures, setProcedures] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
  });
  const [paymentModes, setPaymentModes] = useState([
    'Cash',
    'Card',
    'Credit',
    'Bank Transfer',
    'Cheque',
    'Insurance',
  ]);
  const navigate = useNavigate();
  const tableRef = useRef();

  const [filters, setFilters] = useState({
    startDate: null as unknown as moment.Moment,
    endDate: null as unknown as moment.Moment,
    department: '',
    paymentMode: '',
    doctor: '',
    procedure: '',
    search: '',
    patientMR: '',
    status: '',
    minAmount: '',
    maxAmount: '',
    dateRange: [] as moment.Moment[],
  });

  console.log(filters, 'filters');

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

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      const response = await axios.get(`${Base_url}/apis/department/get`);
      setDepartments(response.data.data || []);
    } catch (error) {
      message.error('Failed to fetch departments');
    }
  };

  // Fetch doctors
  const fetchDoctors = async () => {
    try {
      const response = await axios.get(`${Base_url}/apis/user/get?role=doctor`);
      setDoctors(response.data.data || []);
    } catch (error) {
      message.error('Failed to fetch doctors');
    }
  };

  // Fetch procedures
  const fetchProcedures = async () => {
    try {
      const response = await axios.get(`${Base_url}/apis/procedure/get`);
      setProcedures(response.data.data || []);
    } catch (error) {
      message.error('Failed to fetch procedures');
    }
  };

  const fetchInvoices = async (page = 1, pageSize = 20) => {
    // Don't fetch if patient ID is not available
    if (!id) {
      console.warn('Patient ID is missing, cannot fetch invoices');
      return;
    }
    
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      
      // Always add patient ID filter - this is required
      queryParams.append('patientId', id);
      
      // Debug: Log the patient ID being used
      console.log('Fetching invoices for patient ID:', id);
      
      if (filters.doctor) queryParams.append('doctorId', filters.doctor);
      if (filters.department) queryParams.append('departmentId', filters.department);
      
      // Handle date filtering - if same date, use exact same time range
      if (filters.startDate && filters.endDate) {
        const startDate = filters.startDate.clone();
        const endDate = filters.endDate.clone();
        
        // If start and end dates are the same day, use exact same time range
        if (startDate.isSame(endDate, 'day')) {
          const sameDayStart = startDate.clone().startOf('day');
          const sameDayEnd = startDate.clone().endOf('day');
          queryParams.append('startDate', sameDayStart.toISOString());
          queryParams.append('endDate', sameDayEnd.toISOString());
          
          // Debug log for same date scenario
          console.log('Same date selected:', {
            date: startDate.format('YYYY-MM-DD'),
            startTime: sameDayStart.format('YYYY-MM-DD HH:mm:ss'),
            endTime: sameDayEnd.format('YYYY-MM-DD HH:mm:ss')
          });
        } else {
          queryParams.append('startDate', startDate.clone().startOf('day').toISOString());
          queryParams.append('endDate', endDate.clone().endOf('day').toISOString());
          
          // Debug log for different dates
          console.log('Different dates selected:', {
            startDate: startDate.format('YYYY-MM-DD'),
            endDate: endDate.format('YYYY-MM-DD')
          });
        }
      }
      
      if (filters.patientMR) queryParams.append('patientMR', filters.patientMR);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.minAmount) queryParams.append('minTotalBill', filters.minAmount);
      if (filters.maxAmount) queryParams.append('maxTotalBill', filters.maxAmount);
      if (filters.procedure) queryParams.append('procedureId', filters.procedure);
      if (filters.paymentMode) queryParams.append('paymentMode', filters.paymentMode);
      
      // Add pagination parameters
      queryParams.append('page', page.toString());
      queryParams.append('limit', pageSize.toString());

      const response = await axios.get(
        `${Base_url}/apis/invoice/get?${queryParams.toString()}`,
      );

      const data = response?.data?.data || [];
      const paginationData = response?.data || {};
      
      // Debug: Log the filter dates and data received
      console.log('Filter dates:', {
        startDate: filters.startDate?.format('YYYY-MM-DD'),
        endDate: filters.endDate?.format('YYYY-MM-DD'),
        isSameDay: filters.startDate?.isSame(filters.endDate, 'day')
      });
      console.log('Raw data from API:', data.map(item => ({
        invoiceNo: item.invoiceNo,
        date: item.createdAt,
        formattedDate: moment(item.createdAt).format('YYYY-MM-DD')
      })));
      
      // Additional frontend filtering - ensure only current patient's invoices are shown
      let filteredData = data;
      let shouldShowNoDataMessage = false;
      
      // First, filter by patient ID to ensure only this patient's invoices are shown
      const beforeFilterCount = data.length;
      filteredData = data.filter((invoice) => {
        // Handle different patientId formats (object with _id or string)
        const invoicePatientId = invoice.patientId?._id || invoice.patientId;
        const patientIdString = String(invoicePatientId || '').trim();
        const currentPatientId = String(id || '').trim();
        
        // Strict comparison - only show invoices for current patient
        const matches = patientIdString === currentPatientId && patientIdString !== '';
        
        if (!matches && invoicePatientId) {
          console.warn(`Filtering out invoice ${invoice.invoiceNo} - belongs to patient ${invoicePatientId}, not ${id}`);
        }
        
        return matches;
      });
      
      // Log if backend returned invoices for other patients (for debugging)
      if (beforeFilterCount > filteredData.length) {
        const filteredOut = beforeFilterCount - filteredData.length;
        console.warn(`⚠️ Backend returned ${beforeFilterCount} invoices, but only ${filteredData.length} belong to patient ${id}. ${filteredOut} invoice(s) filtered out.`);
      }
      
      console.log('✅ After patient ID filter:', {
        originalCount: beforeFilterCount,
        filteredCount: filteredData.length,
        patientId: id,
        patientName: patient?.name || 'Unknown'
      });
      
      // Then apply date filtering if dates are selected
      if (filters.startDate && filters.endDate && filters.startDate.isSame(filters.endDate, 'day')) {
        const selectedDate = filters.startDate.format('YYYY-MM-DD');
        filteredData = filteredData.filter((invoice) => {
          const invoiceDate = moment(invoice.createdAt).format('YYYY-MM-DD');
          return invoiceDate === selectedDate;
        });
        
        console.log('Filtered data for same day:', filteredData.map(item => ({
          invoiceNo: item.invoiceNo,
          date: item.createdAt,
          formattedDate: moment(item.createdAt).format('YYYY-MM-DD')
        })));
        
        // If no data matches the exact date, show message and set empty data
        if (filteredData.length === 0) {
          shouldShowNoDataMessage = true;
          if (data.length > 0) {
            message.warning(`No invoices found for ${filters.startDate.format('DD/MM/YYYY')}. Backend returned data from other dates.`);
          } else {
            message.info(`No invoices found for ${filters.startDate.format('DD/MM/YYYY')}`);
          }
        }
      } else if (filters.startDate && filters.endDate) {
        // For date ranges, also apply frontend filtering to ensure data is within range
        const startDate = filters.startDate.format('YYYY-MM-DD');
        const endDate = filters.endDate.format('YYYY-MM-DD');
        
        filteredData = filteredData.filter((invoice) => {
          const invoiceDate = moment(invoice.createdAt).format('YYYY-MM-DD');
          return invoiceDate >= startDate && invoiceDate <= endDate;
        });
        
        console.log('Filtered data for date range:', filteredData.map(item => ({
          invoiceNo: item.invoiceNo,
          date: item.createdAt,
          formattedDate: moment(item.createdAt).format('YYYY-MM-DD')
        })));
        
        // If filtered data is different from original data, show warning
        if (filteredData.length !== data.length) {
          message.warning(`Backend returned ${data.length} records but only ${filteredData.length} are within the selected date range.`);
        }
      }
      
      const transformedData = filteredData
        .map((invoice) => {
          const { doctorShare, hospitalShare } = sumInvoiceDoctorHospitalShare(invoice);

          return {
            key: invoice._id,
            _id: invoice._id,
            invoiceNo: invoice.invoiceNo,
            date: invoice.createdAt,
            patientId: invoice.patientId,
            branchId: invoice.branchId,
            patientMR: invoice.patientId?.mr || 'N/A',
            patientName: invoice.patientId?.name || 'N/A',
            patientPhone: invoice.patientId?.phone || 'N/A',
            doctor: invoice.doctorId?.name || 'N/A',
            department: invoice.doctorId?.departmentId?.name || invoice.departmentData?.name || 'N/A',
            items: invoice.item.map(i => i.description).join(', '),
            item: invoice.item,
            subTotal: invoice.subTotalBill || 0,
            discount: invoice.discountBill || 0,
            tax: invoice.taxBill || 0,
            total: invoice.totalBill || 0,
            paid: invoice.totalPay || 0,
            due: invoice.duePay || 0,
            doctorShare,
            hospitalShare,
            paymentMode: invoice.payment?.[0]?.method || 'N/A',
            status: invoice.duePay > 0 ? 'Pending' : 'Paid',
          };
        })
        // Final safety check: Ensure all invoices belong to current patient
        .filter((invoice) => {
          const invoicePatientId = invoice.patientId?._id || invoice.patientId;
          const matches = String(invoicePatientId || '').trim() === String(id || '').trim();
          if (!matches) {
            console.error(`❌ CRITICAL: Invoice ${invoice.invoiceNo} for patient ${invoicePatientId} slipped through filters! Removing it.`);
          }
          return matches;
        });

      console.log(`✅ Final result: ${transformedData.length} invoice(s) for patient ${patient?.name || id}`);

      setInvoices(transformedData);
      setFilteredInvoices(transformedData);
      
      // Update pagination state
      setPagination({
        current: paginationData.currentPage || 1,
        pageSize: paginationData.limit || 20,
        total: shouldShowNoDataMessage ? 0 : (paginationData.count || 0), // Set total to 0 if no exact date match
        totalPages: shouldShowNoDataMessage ? 0 : (paginationData.totalPages || 0)
      });
    } catch (err) {
      message.error('Failed to fetch invoices');
      console.error('Invoice fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPharmacyInvoices = async () => {
    if (!id) return;

    setPharmacyLoading(true);
    try {
      const params: Record<string, any> = {
        patientId: id,
        page: 1,
        limit: 1000,
        sort: '-createdAt',
      };

      if (filters.search) params.search = filters.search;

      if (filters.startDate && filters.endDate) {
        params.from = filters.startDate.clone().startOf('day').format('YYYY-MM-DD');
        params.to = filters.endDate.clone().endOf('day').format('YYYY-MM-DD');
      }

      const res = await axios.get(`${Base_url}/apis/pharmPos/get`, { params });
      const list = res?.data?.data || [];

      const transformed = (list || [])
        .filter((pos) => {
          const posPatientId = pos.patientId?._id || pos.patientId;
          return String(posPatientId || '').trim() === String(id || '').trim();
        })
        .map((pos) => {
          const items = Array.isArray(pos.allItem) ? pos.allItem : [];
          const soldItems = items.filter((i) => !i.isReturn);
          const itemText = soldItems
            .map((i) => i?.pharmItemId?.name || i?.pharmItemId?.itemName || i?.pharmItemId || 'Item')
            .join(', ');

          const paid = Number(pos.paid) || 0;
          const due = Number(pos.due) || 0;
          const total = paid + due;

          return {
            key: pos._id,
            _id: pos._id,
            invoiceNo: pos.invoiceNumber || pos._id,
            date: pos.createdAt,
            patientId: pos.patientId,
            patientMR: pos.patientId?.mr || 'N/A',
            patientName: pos.patientId?.name || pos.patientName || 'N/A',
            patientPhone: pos.patientId?.phone || 'N/A',
            items: itemText || 'N/A',
            subTotal: total,
            discount: Number(pos.totalDiscount) || 0,
            tax: Number(pos.totalTax) || 0,
            total,
            paid,
            due,
            paymentMode: pos.payment?.[0]?.method || 'N/A',
            status: due > 0 ? 'Pending' : 'Paid',
          };
        });

      setPharmacyInvoices(transformed);
    } catch (err) {
      console.error('Pharmacy invoice fetch error:', err);
      message.error('Failed to fetch pharmacy invoices');
      setPharmacyInvoices([]);
    } finally {
      setPharmacyLoading(false);
    }
  };

  const fetchPatients = () => {
    setLoading(true);
    axios
      .get(`${Base_url}/apis/patient/get/${id}`)
      .then((res) => {
        if (res.data && res.data.status === 'ok') {
          setPatient(res.data.data || {});
        } else {
          message.error('Failed to fetch patient');
        }
        setLoading(false);
      })
      .catch((err) => {
        message.error('Failed to fetch patient');
        setLoading(false);
      });
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Delete Invoice?',
      content: 'Are you sure you want to delete this invoice? This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await axios.delete(`${Base_url}/apis/invoice/delete/${id}`);
          message.success('Invoice deleted successfully');
          fetchInvoices(pagination.current, pagination.pageSize);
        } catch (err) {
          const anyErr = err as { response?: { data?: { message?: string; error?: string } } };
          const detail =
            anyErr?.response?.data?.message ||
            anyErr?.response?.data?.error ||
            (err instanceof Error ? err.message : null);
          message.error(detail ? `Failed to delete invoice: ${detail}` : 'Failed to delete invoice');
        }
      },
    });
  };

  const handleDateChange = (date, index) => {
    const newDateRange = [...filters.dateRange];
    newDateRange[index] = moment(date);
    setFilters(prev => ({
      ...prev,
      dateRange: newDateRange,
      startDate: newDateRange[0],
      endDate: newDateRange[1]
    }));
  };

  const generatePdf = async (invoice) => {
    console.log(invoice);
    
    try {
      const inv = await enrichInvoiceForPdf(invoice);
      // Create the PDF blob
      const blob = await pdf(<InvoicePdf invoice={inv} patient={inv?.patientId || patient} />).toBlob();
      
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

  const calculateSummary = () => {
    return {
      totalRevenue: filteredInvoices.reduce((sum, t) => sum + t.total, 0),
      totalTax: filteredInvoices.reduce((sum, t) => sum + t.tax, 0),
      totalDiscount: filteredInvoices.reduce((sum, t) => sum + t.discount, 0),
      totalPaid: filteredInvoices.reduce((sum, t) => sum + t.paid, 0),
      totalDue: filteredInvoices.reduce((sum, t) => sum + t.due, 0),
      totalDoctorShare: filteredInvoices.reduce((sum, t) => sum + t.doctorShare, 0),
      totalHospitalShare: filteredInvoices.reduce((sum, t) => sum + t.hospitalShare, 0),
      invoiceCount: filteredInvoices.length,
    };
  };

  const summary = calculateSummary();

  // Handle pagination change (Ant Design Table passes pagination as first arg)
  const handleTableChange = (paginationInfo, _filters, _sorter) => {
    const { current = 1, pageSize = 20 } = paginationInfo || {};
    const newCurrent = (pageSize !== pagination.pageSize) ? 1 : (current || 1);
    setPagination(prev => ({
      ...prev,
      current: newCurrent,
      pageSize: pageSize || prev.pageSize
    }));
    fetchInvoices(newCurrent, pageSize || pagination.pageSize);
  };

  useEffect(() => {
    fetchDepartments();
    fetchDoctors();
    fetchProcedures();
  }, []);

  useEffect(() => {
    // Only fetch invoices if patient ID exists and all required data is loaded
    if (id && departments.length > 0 && doctors.length > 0 && procedures.length > 0) {
      fetchInvoices(1, pagination.pageSize);
    }
  }, [id, filters, departments, doctors, procedures]);

  useEffect(() => {
    if (id) {
      fetchPharmacyInvoices();
    }
  }, [id, filters.startDate, filters.endDate, filters.search]);

  // Reset to first page when filters change
  useEffect(() => {
    if (pagination.current !== 1) {
      setPagination(prev => ({ ...prev, current: 1 }));
    }
  }, [filters]);

  useEffect(() => {
    fetchPatients();
  }, [id]);

  const columns = [
    {
      title: 'INVOICE #',
      dataIndex: 'invoiceNo',
      key: 'invoiceNo',
      width: 120,
      fixed: 'left',
    },
    {
      title: 'DATE',
      dataIndex: 'date',
      key: 'date',
      render: (date) => moment(date).format('DD/MM/YYYY HH:mm'),
      width: 150,
    },
    {
      title: 'MR#',
      dataIndex: 'patientMR',
      key: 'patientMR',
      width: 100,
    },
    {
      title: 'PATIENT NAME',
      dataIndex: 'patientName',
      key: 'patientName',
      width: 150,
      render: (text, record) => {
        return (
          <Link to={`/details-patients/${record.patientId?._id}`}>
            {text}
          </Link>
        );
      },
    },
    {
      title: 'PHONE',
      dataIndex: 'patientPhone',
      key: 'patientPhone',
      width: 120,
    },
    {
      title: 'DOCTOR',
      dataIndex: 'doctor',
      key: 'doctor',
      width: 150,
    },
    {
      title: 'DEPARTMENT',
      dataIndex: 'department',
      key: 'department',
      width: 150,
    },
    {
      title: 'PROCEDURE NAME',
      dataIndex: 'items',
      key: 'items',
      ellipsis: true,
      width: 200,
    },
    {
      title: 'SUBTOTAL',
      dataIndex: 'subTotal',
      key: 'subTotal',
      width: 100,
      render: (value) => value.toLocaleString(),
    },
    {
      title: 'DISCOUNT',
      dataIndex: 'discount',
      key: 'discount',
      width: 100,
      render: (value) => value.toLocaleString(),
    },
    {
      title: 'TAX',
      dataIndex: 'tax',
      key: 'tax',
      width: 100,
      render: (value) => value.toLocaleString(),
    },
    {
      title: 'TOTAL',
      dataIndex: 'total',
      key: 'total',
      width: 100,
      render: (value) => value.toLocaleString(),
    },
    {
      title: 'PAID',
      dataIndex: 'paid',
      key: 'paid',
      width: 100,
      render: (value) => value.toLocaleString(),
    },
    {
      title: 'DUE',
      dataIndex: 'due',
      key: 'due',
      width: 100,
      render: (value) => value.toLocaleString(),
    },
    {
      title: 'PAYMENT MODE',
      dataIndex: 'paymentMode',
      key: 'paymentMode',
      width: 120,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (_, record) => {
        const status = record.paid >= record.total ? 'Paid' : 'Pending';
        return (
          <span 
            style={{
              color: status === 'Paid' ? '#52c41a' : '#f5222d',
              backgroundColor: status === 'Paid' ? '#f6ffed' : '#fff1f0',
              padding: '4px 8px',
              borderRadius: '4px',
              display: 'inline-block',
              border: `1px solid ${status === 'Paid' ? '#b7eb8f' : '#ffa39e'}`
            }}
          >
            {status}
          </span>
        );
      },
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
          <Link
            to={`/invoice/edit/${record._id}/${
              record.patientId && typeof record.patientId === 'object' && record.patientId !== null
                ? (record.patientId as { _id?: string })._id ?? ''
                : String(record.patientId ?? '')
            }`}
          >
            <RiEdit2Fill 
              className='text-primary' 
              size={20} 
              style={{ cursor: 'pointer' }}
            />
          </Link>
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

  const pharmacyColumns = [
    {
      title: 'INVOICE #',
      dataIndex: 'invoiceNo',
      key: 'invoiceNo',
      width: 140,
      fixed: 'left',
    },
    {
      title: 'DATE',
      dataIndex: 'date',
      key: 'date',
      render: (date) => moment(date).format('DD/MM/YYYY HH:mm'),
      width: 170,
    },
    {
      title: 'ITEMS',
      dataIndex: 'items',
      key: 'items',
      ellipsis: true,
      width: 300,
    },
    {
      title: 'TOTAL',
      dataIndex: 'total',
      key: 'total',
      width: 120,
      render: (value) => value.toLocaleString(),
    },
    {
      title: 'PAID',
      dataIndex: 'paid',
      key: 'paid',
      width: 120,
      render: (value) => value.toLocaleString(),
    },
    {
      title: 'DUE',
      dataIndex: 'due',
      key: 'due',
      width: 120,
      render: (value) => value.toLocaleString(),
    },
    {
      title: 'PAYMENT MODE',
      dataIndex: 'paymentMode',
      key: 'paymentMode',
      width: 140,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (_, record) => {
        const status = record.due > 0 ? 'Pending' : 'Paid';
        return (
          <span
            style={{
              color: status === 'Paid' ? '#52c41a' : '#f5222d',
              backgroundColor: status === 'Paid' ? '#f6ffed' : '#fff1f0',
              padding: '4px 8px',
              borderRadius: '4px',
              display: 'inline-block',
              border: `1px solid ${status === 'Paid' ? '#b7eb8f' : '#ffa39e'}`,
            }}
          >
            {status}
          </span>
        );
      },
      width: 120,
    },
  ];

  return (
    <>
      <div className="">
        <Breadcrumb pageName="Patient Invoice" />
        
        <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default sm:px-7.5 xl:pb-1">
          <div className='flex mb-5 justify-between items-center'>
            <div className="">
              <h1 className="text-xl font-semibold text-black">Patient Invoices List</h1>
              <p className="mt-2 text-primary font-medium">
                {patient?.name}-{patient?.gender}-{patient?.mr}-{' '}
                <span className="text-black">invoice</span>
              </p>
            </div>

            <Link
              to={`/patient/invoice/new/${id}`}
              className="inline-flex items-center justify-center gap-2.5 rounded-md bg-primary py-3 px-10 text-center font-medium text-white hover:bg-opacity-90 lg:px-8 xl:px-10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="20px" height="20px">
                <g fill="#ffffff" fillRule="nonzero" stroke="none" strokeWidth="1" strokeLinecap="butt" strokeLinejoin="miter" strokeMiterlimit="10" strokeDasharray="" strokeDashoffset="0" fontFamily="none" fontWeight="none" fontSize="none" textAnchor="none">
                  <g transform="scale(5.12,5.12)">
                    <path d="M25,2c-12.6907,0 -23,10.3093 -23,23c0,12.69071 10.3093,23 23,23c12.69071,0 23,-10.30929 23,-23c0,-12.6907 -10.30929,-23 -23,-23zM25,4c11.60982,0 21,9.39018 21,21c0,11.60982 -9.39018,21 -21,21c-11.60982,0 -21,-9.39018 -21,-21c0,-11.60982 9.39018,-21 21,-21zM24,13v11h-11v2h11v11h2v-11h11v-2h-11v-11z"></path>
                  </g>
                </g>
              </svg>
              Create Invoice
            </Link>
          </div>
          
          <Row gutter={[16, 16]} style={{ marginBottom: '20px' }}>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Select
                style={{ width: '100%' }}
                value={filters.department}
                onChange={(value) => setFilters({ ...filters, department: value })}
                allowClear
                placeholder="Select Department"
              >
                <Option value="" disabled>
                  Select Departments
                </Option>
                {departments.map((dept) => (
                  <Option key={dept._id} value={dept._id}>
                    {dept.name}
                  </Option>
                ))}
              </Select>
            </Col>

            <Col xs={24} sm={12} md={8} lg={6}>
              <Select
                placeholder="Select Doctor"
                style={{ width: '100%' }}
                value={filters.doctor}
                onChange={(value) => setFilters({ ...filters, doctor: value })}
                allowClear
                showSearch
                optionFilterProp="children"
              >
                <Option value="" disabled>
                  Select Doctor
                </Option>
                {doctors.map((doctor) => (
                  <Option key={doctor._id} value={doctor._id}>
                    {doctor.name}
                  </Option>
                ))}
              </Select>
            </Col>

            <Col xs={24} sm={12} md={8} lg={6}>
              <Select
                placeholder="Select Procedure"
                style={{ width: '100%' }}
                value={filters.procedure}
                onChange={(value) => setFilters({ ...filters, procedure: value })}
                allowClear
                showSearch
                optionFilterProp="children"
              >
                <Option value="" disabled>
                  Select Procedure
                </Option>
                {procedures.map((proc) => (
                  <Option key={proc._id} value={proc._id}>
                    {proc.name}
                  </Option>
                ))}
              </Select>
            </Col>

            <Col xs={24} sm={12} md={8} lg={6}>
              <Select
                placeholder="Select Payment Mode"
                style={{ width: '100%' }}
                value={filters.paymentMode}
                onChange={(value) => setFilters({ ...filters, paymentMode: value })}
                allowClear
              >
                <Option value="" disabled>
                  Select Payment Mode
                </Option>
                {paymentModes.map((mode) => (
                  <Option key={mode} value={mode}>
                    {mode}
                  </Option>
                ))}
              </Select>
            </Col>

            <Col xs={24} sm={12} md={8} lg={6}>
              <Select
                placeholder="Select Status"
                style={{ width: '100%' }}
                value={filters.status}
                onChange={(value) => setFilters({ ...filters, status: value })}
                allowClear
              >
                <Option value="" disabled>
                  Select Status
                </Option>
                <Option value="Paid">Paid</Option>
                <Option value="Pending">Pending</Option>
              </Select>
            </Col>

            <Col xs={24} sm={12} md={8} lg={12}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Input
                  type="date"
                  value={filters.dateRange[0]?.format('YYYY-MM-DD') || ''}
                  onChange={(e) => handleDateChange(e.target.value, 0)}
                  style={{ flex: 1 }}
                  max={moment().format('YYYY-MM-DD')}
                />
                <span>to</span>
                <Input
                  type="date"
                  value={filters.dateRange[1]?.format('YYYY-MM-DD') || ''}
                  onChange={(e) => handleDateChange(e.target.value, 1)}
                  style={{ flex: 1 }}
                  min={filters.dateRange[0]?.format('YYYY-MM-DD')}
                  max={moment().format('YYYY-MM-DD')}
                />
              </div>
            </Col>

            <Col xs={24} sm={12} md={8} lg={6}>
              <Input
                placeholder="Search by Patient Name, MR, Phone & CNIC"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                allowClear
              />
            </Col>

            <Col xs={24} sm={12} md={8} lg={6}>
              <Input
                placeholder="Min Amount"
                value={filters.minAmount}
                onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
                type="number"
              />
            </Col>

            <Col xs={24} sm={12} md={8} lg={6}>
              <Input
                placeholder="Max Amount"
                value={filters.maxAmount}
                onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
                type="number"
              />
            </Col>

            <Col xs={24} className="flex justify-end gap-2">
              <Button
                type="default"
                onClick={() => {
                  fetchInvoices(1, pagination.pageSize);
                  fetchPharmacyInvoices();
                }}
                loading={loading}
              >
                Search
              </Button>
              <Button
                onClick={() => {
                  setFilters({
                    dateRange: [],
                    startDate: null as unknown as moment.Moment,
                    endDate: null as unknown as moment.Moment,
                    department: '',
                    paymentMode: '',
                    doctor: '',
                    procedure: '',
                    patientMR: '',
                    status: '',
                    minAmount: '',
                    maxAmount: '',
                    search: '',
                  });
                  setPagination({
                    current: 1,
                    pageSize: 20,
                    total: 0,
                    totalPages: 0
                  });
                  setPharmacyInvoices([]);
                }}
              >
                Reset
              </Button>
            </Col>
          </Row>
          
          <div className="overflow-x-auto">
            <Table
              ref={tableRef}
              rowKey="_id"
              rowSelection={rowSelection}
              columns={columns}
              dataSource={filteredInvoices}
              loading={loading}
              scroll={{ x: 1500 }}
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                total: pagination.total,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50', '100'],
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
                showQuickJumper: true,
              }}
              onChange={handleTableChange}
              bordered
            />
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-semibold text-black mb-3">Pharmacy Invoices</h2>
            <div className="overflow-x-auto">
              <Table
                rowKey="_id"
                columns={pharmacyColumns}
                dataSource={pharmacyInvoices}
                loading={pharmacyLoading}
                scroll={{ x: 1200 }}
                pagination={false}
                bordered
              />
            </div>
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

export default PatientInvoice;
