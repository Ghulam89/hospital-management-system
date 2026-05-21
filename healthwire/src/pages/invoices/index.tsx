import React, { useEffect, useState, useRef } from 'react';
import { Table, message, Select, DatePicker, Card, Row, Col, Input, Button, Modal, Tabs } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment';
import dayjs, { Dayjs } from 'dayjs';
import { RiDeleteBin5Line, RiEdit2Fill, RiFile2Line, RiPenNibFill, RiPrinterLine } from 'react-icons/ri';
import { Base_url } from '../../utils/Base_url';
import { getInvoiceHeaderForPdf } from '../../utils/branchPdfHeader';
import { enrichInvoiceForPdf } from '../../utils/enrichInvoiceForPdf';
import logoDataUrl from '../../images/logo-icon.png';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import { AsyncPaginate, type LoadOptions } from 'react-select-async-paginate';
import { canMenuAction, getStoredUserForPermissions, hasAnyPermission } from '../../utils/permissions';
import { useBranchScopeEpoch } from '../../context/BranchScopeEpochContext';
import { sumInvoiceDoctorHospitalShare } from '../../utils/invoiceShare';
import { buildAxiosBranchScopedParams } from '../../utils/branchScope';
import { buildPatientLookupParams } from '../../utils/patientInvoiceSearch';
import {
  formatProcedureRefundMoney,
  hasProcedureRefundOnLine,
  procedureMaxRefundableFromInvoiceRow,
  refId,
} from '../../utils/procedureRefund';

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

type DoctorOption = {
  label: string;
  value: string;
  doctorData?: {
    _id: string;
    name: string;
  };
};

type DepartmentOption = {
  label: string;
  value: string;
  departmentData?: {
    _id: string;
    name: string;
  };
};

type ProcedureOption = {
  label: string;
  value: string;
  procedureData?: {
    _id: string;
    name: string;
  };
};

type PatientOption = {
  label: string;
  value: string;
  patientData?: {
    _id: string;
    mr: string;
    name: string;
    phone?: string;
  };
};

const INVOICE_FILTERS_SESSION_KEY = 'invoiceFiltersSession';

function getDefaultInvoiceFilters() {
  const defaultStartDate = moment().startOf('day');
  const defaultEndDate = moment().endOf('day');
  return {
    startDate: defaultStartDate as moment.Moment,
    endDate: defaultEndDate as moment.Moment,
    department: '',
    paymentMode: '',
    doctor: '',
    procedure: '',
    amountField: 'paid',
    patientName: '',
    patientMR: '',
    patientPhone: '',
    invoiceNumber: '',
    status: '',
    minAmount: '',
    maxAmount: '',
    paymentDateStart: '',
    paymentDateEnd: '',
    dateRange: [defaultStartDate, defaultEndDate] as moment.Moment[],
    discountPercent: '',
  };
}

/** Pehli render hi par session se hydrate — warna save wala useEffect "today" likh kar session overwrite kar deta tha. */
function loadInvoiceFiltersFromSession() {
  const base = getDefaultInvoiceFilters();
  try {
    const raw = sessionStorage.getItem(INVOICE_FILTERS_SESSION_KEY);
    if (!raw) return base;
    const saved = JSON.parse(raw);
    if (!saved || typeof saved !== 'object') return base;

    const startDate = saved.startDate ? moment(saved.startDate) : null;
    const endDate = saved.endDate ? moment(saved.endDate) : null;
    const dateRange =
      startDate && endDate ? [startDate, endDate] : base.dateRange;

    const { startDate: _s, endDate: _e, dateRange: _dr, ...rest } = saved;

    return {
      ...base,
      ...rest,
      startDate: (startDate || base.startDate) as moment.Moment,
      endDate: (endDate || base.endDate) as moment.Moment,
      dateRange: dateRange as moment.Moment[],
    };
  } catch {
    return base;
  }
}

function hasProcedureDate(value: unknown): boolean {
  return !!(value && String(value).trim());
}

function getProcedureAdvanceAmount(invoice: any): number {
  const items = Array.isArray(invoice?.item) ? invoice.item : [];
  return items.reduce((sum: number, item: any) => {
    if (hasProcedureDate(item?.procedureDate)) return sum;
    const amount = Number(item?.amount) || (Number(item?.rate) || 0) * Math.max(1, Number(item?.quantity) || 1);
    const discount = Number(item?.discount) || 0;
    const discountAmount = Number(item?.discountType) === 1 ? amount * (discount / 100) : discount;
    return sum + Math.max(0, amount - discountAmount);
  }, 0);
}

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
          <Text style={styles.clinicName}>HOLISTIC CARE CLINIC</Text>
          <Text style={styles.clinicAddress}> <Text style={styles.clinicAddress}>Branch: {invoice.branchId?.name}</Text> | Branch Code: {invoice.branchId?.code}</Text>
          {header.addressLine ? <Text style={styles.clinicAddress}>{header.addressLine}</Text> : null}
          <Text style={styles.clinicAddress}>{header.contactLine} | Email: info@holisticcare.com</Text>
         
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
          <Text>
            {moment(invoice.invoiceDate || invoice.date || invoice.createdAt).format(
              'DD/MM/YYYY',
            )}
          </Text>
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
          <Text>{invoice.doctor}</Text>
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

      <View style={styles.totalsContainer}>
        {(() => {
          const itemExpenses = (invoice.item || [])
            .flatMap((it: any) => (it.expenses || []).filter((e: any) => e?.showInPrint))
            .reduce((sum: number, e: any) => sum + (Number(e?.amount) || 0), 0);
          const invoiceLevelExpenses = (invoice.invoiceExpenses || [])
            .filter((e: any) => e?.showInPrint)
            .reduce((sum: number, e: any) => sum + (Number(e?.amount) || 0), 0);
          const expensesTotal = itemExpenses + invoiceLevelExpenses;
          return (
            <>
              <View style={styles.totalRow}>
                <Text style={{fontSize:12}}>Sub Total:</Text>
                <Text style={{fontSize:12}}>Rs. {invoice.subTotal?.toFixed?.(2)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={{fontSize:12}}>Discount:</Text>
                <Text style={{fontSize:12}}>Rs. {invoice.discount?.toFixed?.(2)}</Text>
              </View>
              {expensesTotal > 0 && (
                <View style={styles.totalRow}>
                  <Text style={{fontSize:12}}>Additional Expenses:</Text>
                  <Text style={{fontSize:12}}>Rs. {expensesTotal.toFixed(2)}</Text>
                </View>
              )}
              <View style={[styles.totalRow, styles.grandTotal]}>
                <Text style={{fontSize:12}}>Grand Total:</Text>
                <Text style={{fontSize:12}}>Rs. {Number(invoice.total || 0).toFixed(2)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={{fontSize:12}}>Amount Paid:</Text>
                <Text style={{fontSize:12}}>Rs. {Number(invoice.paid || 0).toFixed(2)}</Text>
              </View>
              <View style={[styles.totalRow, {marginTop: 5}]}>
                <Text style={{fontSize:12}}>Balance Due:</Text>
                <Text style={{fontSize:12}}>Rs. {Number(invoice.due || 0).toFixed(2)}</Text>
              </View>
              {(Number(invoice.advance || invoice.advancePay || 0) > 0) && (
                <View style={[styles.totalRow, { marginTop: 4 }]}>
                  <Text style={{ fontSize: 11, color: '#333' }}>
                    Advance / balance credited / change returned to customer:
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: 'bold' }}>
                    Rs.{' '}
                    {Number(invoice.advance ?? invoice.advancePay ?? 0).toFixed(2)}
                  </Text>
                </View>
              )}
            </>
          );
        })()}
      </View>

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

const Invoice = () => {
  const branchEpoch = useBranchScopeEpoch();
 const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
  });
  const [paymentModes, setPaymentModes] = useState([
    'Cash',
    'Card',
    'Bank Transfer',
    'Cheque',
    'Insurance',
  ]);
  const navigate = useNavigate();
  const permUser = getStoredUserForPermissions();
  const canInvCreate = canMenuAction(permUser, 'invoices', 'create');
  const canInvUpdate =
    canMenuAction(permUser, 'invoices', 'update') || hasAnyPermission(permUser, 'editInvoice');
  const canInvDelete = canMenuAction(permUser, 'invoices', 'delete');
  const tableRef = useRef();
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorOption | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentOption | null>(null);
  const [selectedProcedure, setSelectedProcedure] = useState<ProcedureOption | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(null);
  const [activeListTab, setActiveListTab] = useState<'all' | 'procedureAdvance'>('all');

  const [filters, setFilters] = useState(() => loadInvoiceFiltersFromSession());

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<any>(null);
  const [paymentRows, setPaymentRows] = useState([
    {
      method: 'Cash',
      paid: '',
      payDate: dayjs().format('YYYY-MM-DDTHH:mm'),
      reference: '',
      chequeNo: '',
      bankName: '',
      chequeDate: '',
      notes: '',
    },
  ]);

  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [savingRefund, setSavingRefund] = useState(false);
  const [refundInvoice, setRefundInvoice] = useState<any>(null);
  const [refundType, setRefundType] = useState<'invoice' | 'procedure'>('invoice');
  const [refundForm, setRefundForm] = useState({
    method: 'Cash',
    paid: '',
    payDate: dayjs().format('YYYY-MM-DD'),
    reference: '',
    notes: '',
    procedureId: '',
  });
  const [refundProcedureItemIndex, setRefundProcedureItemIndex] = useState(-1);
  const [loadingRefundInvoice, setLoadingRefundInvoice] = useState(false);

  console.log(filters, 'filters');

  const dateRangePresets = [
    {
      label: 'Today',
      value: [dayjs().startOf('day'), dayjs().endOf('day')],
    },
    {
      label: 'Yesterday',
      value: [
        dayjs().subtract(1, 'day').startOf('day'),
        dayjs().subtract(1, 'day').endOf('day'),
      ],
    },
    {
      label: 'This Week',
      value: [dayjs().startOf('week').startOf('day'), dayjs().endOf('week').endOf('day')],
    },
    {
      label: 'Last Week',
      value: [
        dayjs().subtract(1, 'week').startOf('week').startOf('day'),
        dayjs().subtract(1, 'week').endOf('week').endOf('day'),
      ],
    },
    {
      label: 'This Month',
      value: [dayjs().startOf('month').startOf('day'), dayjs().endOf('month').endOf('day')],
    },
    {
      label: 'Last Month',
      value: [
        dayjs().subtract(1, 'month').startOf('month').startOf('day'),
        dayjs().subtract(1, 'month').endOf('month').endOf('day'),
      ],
    },
  ] satisfies Array<{ label: string; value: [Dayjs, Dayjs] }>;

  const disabledDate = (current: Dayjs) => current && current > dayjs().endOf('day');

  useEffect(() => {
    try {
      const payload = {
        ...filters,
        startDate: filters.startDate ? filters.startDate.toISOString() : '',
        endDate: filters.endDate ? filters.endDate.toISOString() : '',
        paymentDateStart: filters.paymentDateStart || '',
        paymentDateEnd: filters.paymentDateEnd || '',
      };
      sessionStorage.setItem(INVOICE_FILTERS_SESSION_KEY, JSON.stringify(payload));
    } catch {}
  }, [filters]);

  const openPaymentModal = (record: any) => {
    setPaymentInvoice(record);
    setPaymentRows([
      {
        method: 'Cash',
        paid: '',
        payDate: dayjs().format('YYYY-MM-DDTHH:mm'),
        reference: '',
        chequeNo: '',
        bankName: '',
        chequeDate: '',
        notes: '',
      },
    ]);
    setPaymentModalOpen(true);
  };

  const openRefundModal = (record: any) => {
    setRefundInvoice(record);
    setRefundType('invoice');
    setRefundProcedureItemIndex(-1);
    setRefundForm({
      method: 'Cash',
      paid: '',
      payDate: dayjs().format('YYYY-MM-DD'),
      reference: '',
      notes: '',
      procedureId: '',
    });
    setRefundModalOpen(true);
    if (!record?._id) return;
    setLoadingRefundInvoice(true);
    axios
      .get(`${Base_url}/apis/invoice/get/${record._id}`)
      .then((res) => {
        const data = res.data?.data ?? res.data;
        if (data && typeof data === 'object') {
          setRefundInvoice(data);
        }
      })
      .catch((err) => {
        console.error('Could not load invoice for refund:', err);
        message.warning('Could not refresh invoice details; refund limits may be inaccurate');
      })
      .finally(() => setLoadingRefundInvoice(false));
  };

  const selectedProcedureRefundMax = (): number => {
    const items = Array.isArray(refundInvoice?.item) ? refundInvoice.item : [];
    const idx =
      refundProcedureItemIndex >= 0 && refundProcedureItemIndex < items.length
        ? refundProcedureItemIndex
        : items.findIndex(
            (it: any) =>
              refId(it?.procedureId?._id || it?.procedureId) === refundForm.procedureId,
          );
    if (idx < 0) return 0;
    if (hasProcedureRefundOnLine(refundInvoice?.payment, refundForm.procedureId, idx)) {
      return 0;
    }
    return procedureMaxRefundableFromInvoiceRow(items[idx], refundInvoice?.payment, idx);
  };

  const submitInvoiceRefund = async () => {
    if (!refundInvoice?._id) {
      message.error('Invoice not selected');
      return;
    }
    const amount = Number(refundForm.paid) || 0;
    if (amount <= 0) {
      message.error('Enter refund amount');
      return;
    }
    if (refundType === 'procedure') {
      if (!refundForm.procedureId) {
        message.error('Select a procedure');
        return;
      }
      const itemIdx =
        refundProcedureItemIndex >= 0
          ? refundProcedureItemIndex
          : (Array.isArray(refundInvoice?.item) ? refundInvoice.item : []).findIndex(
              (it: any) =>
                refId(it?.procedureId?._id || it?.procedureId) === refundForm.procedureId,
            );
      if (
        itemIdx >= 0 &&
        hasProcedureRefundOnLine(refundInvoice?.payment, refundForm.procedureId, itemIdx)
      ) {
        message.error('Refund already recorded for this procedure line');
        return;
      }
      const maxProc = selectedProcedureRefundMax();
      if (maxProc <= 0) {
        message.error('Nothing left to refund for this procedure');
        return;
      }
      if (amount > maxProc + 0.001) {
        message.error(`Refund cannot exceed Rs. ${formatProcedureRefundMoney(maxProc)}`);
        return;
      }
    }
    setSavingRefund(true);
    try {
      let res;
      if (refundType === 'procedure' && refundForm.procedureId) {
        const itemIdx =
          refundProcedureItemIndex >= 0
            ? refundProcedureItemIndex
            : (Array.isArray(refundInvoice?.item) ? refundInvoice.item : []).findIndex(
                (it: any) =>
                  refId(it?.procedureId?._id || it?.procedureId) === refundForm.procedureId,
              );
        const payload = {
          procedureId: refundForm.procedureId,
          itemIndex: itemIdx >= 0 ? itemIdx : 0,
          method: refundForm.method,
          paid: amount,
          payDate: (() => {
            const v = refundForm.payDate;
            if (!v) return v;
            if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
              const [y, m, d] = v.split('-').map((x) => Number(x));
              const now = new Date();
              return new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds()).toISOString();
            }
            return v;
          })(),
          reference: refundForm.reference,
          notes: refundForm.notes || '',
        };
        res = await axios.post(`${Base_url}/apis/invoice/procedure-refund/${refundInvoice._id}`, payload);
      } else {
        const payload = {
          refunds: [
            {
              method: refundForm.method,
              paid: amount,
              payDate: (() => {
                const v = refundForm.payDate;
                if (!v) return v;
                if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
                  const [y, m, d] = v.split('-').map((x) => Number(x));
                  const now = new Date();
                  return new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds()).toISOString();
                }
                return v;
              })(),
              reference: refundForm.reference,
              notes: refundForm.notes || '',
            },
          ],
        };
        res = await axios.post(`${Base_url}/apis/invoice/add-refund/${refundInvoice._id}`, payload);
      }
      if (res.data?.status === 'ok') {
        message.success('Refund recorded');
        setRefundModalOpen(false);
        fetchInvoices(pagination.current, pagination.pageSize);
      } else {
        message.error(res.data?.message || 'Failed to record refund');
      }
    } catch (err: any) {
      console.error(err);
      message.error(err?.response?.data?.message || err?.response?.data?.error || 'Failed to record refund');
    } finally {
      setSavingRefund(false);
    }
  };

  const parsePayDateToTs = (payDate: any) => {
    if (!payDate) return null;
    if (typeof payDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(payDate)) {
      const [y, m, d] = payDate.split('-').map((v) => Number(v));
      if (!y || !m || !d) return null;
      const local = new Date(y, m - 1, d);
      return Number.isFinite(local.getTime()) ? local.getTime() : null;
    }
    const d = dayjs(payDate);
    return d.isValid() ? d.valueOf() : null;
  };

  const parsePayDateToTsWithFallback = (payDate: any, _fallbackDateTime: any) => {
    if (!payDate) return null;
    const s = String(payDate);
    if (/^\d{4}-\d{2}-\d{2}T/.test(s) || /^\d{4}-\d{2}-\d{2} /.test(s)) {
      const t = dayjs(payDate);
      return t.isValid() ? t.valueOf() : null;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [y, m, d] = s.split('-').map((v) => Number(v));
      if (!y || !m || !d) return null;
      return new Date(y, m - 1, d, 12, 0, 0, 0).getTime();
    }
    const t = dayjs(payDate);
    return t.isValid() ? t.valueOf() : null;
  };

  const formatPayDate = (payDate: any) => {
    if (!payDate) return 'N/A';
    if (typeof payDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(payDate)) {
      const [y, m, d] = payDate.split('-').map((v) => Number(v));
      if (!y || !m || !d) return 'N/A';
      return dayjs(new Date(y, m - 1, d)).format('DD/MM/YYYY - hh:mm A');
    }
    const d = dayjs(payDate);
    return d.isValid() ? d.format('DD/MM/YYYY - hh:mm A') : 'N/A';
  };

  const loadDoctorOptions: LoadOptions<DoctorOption, any, { page: number }> = async (
    searchQuery,
    _loadedOptions,
    additional,
  ) => {
    const page = additional?.page ?? 1;
    const limit = 20;

    const res = await axios.get(`${Base_url}/apis/user/get`, {
      params: {
        role: 'doctor',
        page,
        limit,
        ...(searchQuery ? { search: searchQuery } : {}),
        ...buildAxiosBranchScopedParams(),
      },
    });

    const list = res?.data?.data || [];
    const options: DoctorOption[] = (list || []).map((d: any) => ({
      label: d?.name || 'Doctor',
      value: d?._id,
      doctorData: d,
    }));

    const totalPages = Number(res?.data?.totalPages) || 0;
    const hasMore = totalPages ? page < totalPages : options.length === limit;

    return {
      options,
      hasMore,
      additional: { page: page + 1 },
    };
  };

  const loadDepartmentOptions: LoadOptions<DepartmentOption, any, { page: number }> = async (
    searchQuery,
    _loadedOptions,
    additional,
  ) => {
    const page = additional?.page ?? 1;
    const limit = 20;

    const res = await axios.get(`${Base_url}/apis/department/get`, {
      params: {
        page,
        limit,
        ...(searchQuery ? { search: searchQuery } : {}),
        ...buildAxiosBranchScopedParams(),
      },
    });

    const responseData = res?.data;
    const list = responseData?.data || responseData || [];
    const options: DepartmentOption[] = (list || []).map((d: any) => ({
      label: d?.name || 'Department',
      value: d?._id,
      departmentData: d,
    }));

    const totalPages = Number(responseData?.totalPages) || 0;
    const currentPage = Number(responseData?.currentPage || responseData?.page) || page;
    const hasMore = totalPages ? currentPage < totalPages : options.length === limit;

    return {
      options,
      hasMore,
      additional: { page: page + 1 },
    };
  };

  const loadProcedureOptions: LoadOptions<ProcedureOption, any, { page: number }> = async (
    searchQuery,
    _loadedOptions,
    additional,
  ) => {
    const page = additional?.page ?? 1;
    const limit = 20;

    const res = await axios.get(`${Base_url}/apis/procedure/get`, {
      params: {
        page,
        limit,
        ...(searchQuery ? { search: searchQuery } : {}),
        ...buildAxiosBranchScopedParams(),
      },
    });

    const responseData = res?.data;
    const list = responseData?.data || responseData || [];
    const options: ProcedureOption[] = (list || []).map((p: any) => ({
      label: p?.name || 'Procedure',
      value: p?._id,
      procedureData: p,
    }));

    const totalPages = Number(responseData?.totalPages) || 0;
    const currentPage = Number(responseData?.currentPage || responseData?.page) || page;
    const hasMore = totalPages ? currentPage < totalPages : options.length === limit;

    return {
      options,
      hasMore,
      additional: { page: page + 1 },
    };
  };

  const loadPatientOptions: LoadOptions<PatientOption, any, { page: number }> = async (
    searchQuery,
    _loadedOptions,
    additional,
  ) => {
    const page = additional?.page ?? 1;
    const limit = 20;

    const res = await axios.get(`${Base_url}/apis/patient/get`, {
      params: buildPatientLookupParams(searchQuery || '', page, limit),
    });

    const responseData = res?.data;
    const list = responseData?.data || responseData || [];

    const options: PatientOption[] = (list || []).map((p: any) => ({
      value: p?._id,
      label: p?.name || 'Patient',
      patientData: p,
    }));

    const totalPages = Number(responseData?.totalPages) || 0;
    const currentPage = Number(responseData?.currentPage || responseData?.page) || page;
    const hasMore = totalPages ? currentPage < totalPages : options.length === limit;

    return {
      options,
      hasMore,
      additional: { page: currentPage + 1 },
    };
  };

  const submitInvoicePayments = async () => {
    if (!paymentInvoice?._id) {
      message.error('Invoice not selected');
      return;
    }

    const payments = paymentRows
      .map((p) => ({
        method: p.method,
        paid: Number(p.paid) || 0,
        payDate: (() => {
          const v = p.payDate;
          if (!v) return v;
          const s = String(v);
          if (s.includes('T')) {
            const parsed = dayjs(s);
            return parsed.isValid() ? parsed.toISOString() : v;
          }
          if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
            const parsed = dayjs(s + 'T12:00');
            return parsed.isValid() ? parsed.toISOString() : v;
          }
          const parsed = dayjs(v);
          return parsed.isValid() ? parsed.toISOString() : v;
        })(),
        reference: p.reference,
        chequeNo: p.chequeNo,
        bankName: p.bankName,
        chequeDate: p.chequeDate || undefined,
        notes: p.notes,
      }))
      .filter((p) => p.paid > 0);

    if (payments.length === 0) {
      message.error('Enter at least one payment amount');
      return;
    }

    setSavingPayment(true);
    try {
      const res = await axios.post(`${Base_url}/apis/invoice/add-payments/${paymentInvoice._id}`, { payments });
      if (res.data?.status === 'ok') {
        message.success('Payment added');
        setPaymentModalOpen(false);
        fetchInvoices(pagination.current, pagination.pageSize);
      } else {
        message.error(res.data?.message || 'Failed to add payment');
      }
    } catch (err: any) {
      console.error(err);
      message.error(err?.response?.data?.message || err?.response?.data?.error || 'Failed to add payment');
    } finally {
      setSavingPayment(false);
    }
  };


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

  const fetchInvoices = async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};

      if (filters.doctor) params.doctorId = filters.doctor;
      if (filters.department) params.departmentId = filters.department;

      if (filters.startDate && filters.endDate) {
        const startDate = filters.startDate.clone();
        const endDate = filters.endDate.clone();
        if (startDate.isSame(endDate, 'day')) {
          const sameDayStart = startDate.clone().startOf('day');
          const sameDayEnd = startDate.clone().endOf('day');
          params.startDate = sameDayStart.toISOString();
          params.endDate = sameDayEnd.toISOString();
          console.log('Same date selected:', {
            date: startDate.format('YYYY-MM-DD'),
            startTime: sameDayStart.format('YYYY-MM-DD HH:mm:ss'),
            endTime: sameDayEnd.format('YYYY-MM-DD HH:mm:ss'),
          });
        } else {
          params.startDate = startDate.clone().startOf('day').toISOString();
          params.endDate = endDate.clone().endOf('day').toISOString();
          console.log('Different dates selected:', {
            startDate: startDate.format('YYYY-MM-DD'),
            endDate: endDate.format('YYYY-MM-DD'),
          });
        }
      }

      if (filters.patientMR) params.patientMR = filters.patientMR;
      if (filters.status) params.status = filters.status;
      if (filters.patientName) params.patientName = filters.patientName;
      if (filters.patientPhone) params.patientPhone = filters.patientPhone;
      if (filters.invoiceNumber) params.invoiceNo = filters.invoiceNumber;
      if (filters.paymentDateStart) params.paymentDateStart = filters.paymentDateStart;
      if (filters.paymentDateEnd) params.paymentDateEnd = filters.paymentDateEnd;
      if (filters.procedure) params.procedureId = filters.procedure;

      const amountField = filters.amountField || 'paid';
      if (filters.minAmount) {
        const min = Number(filters.minAmount);
        if (Number.isFinite(min)) {
          if (amountField === 'total') params.minTotalBill = String(min);
          else if (amountField === 'discount') params.minDiscountBill = String(min);
          else if (amountField === 'due') params.minDue = String(min);
          else if (amountField === 'advance') params.minAdvance = String(min);
          else params.minPaid = String(min);
        }
      }
      if (filters.maxAmount) {
        const max = Number(filters.maxAmount);
        if (Number.isFinite(max)) {
          if (amountField === 'total') params.maxTotalBill = String(max);
          else if (amountField === 'discount') params.maxDiscountBill = String(max);
          else if (amountField === 'due') params.maxDue = String(max);
          else if (amountField === 'advance') params.maxAdvance = String(max);
          else params.maxPaid = String(max);
        }
      }
      if (filters.paymentMode) params.paymentMode = filters.paymentMode;
      if (activeListTab === 'procedureAdvance') params.listMode = 'procedureAdvance';

      params.page = String(page);
      params.limit = String(pageSize);

      const response = await axios.get(`${Base_url}/apis/invoice/get`, {
        params: {
          ...params,
          ...buildAxiosBranchScopedParams(),
        },
      });

      const data = response?.data?.data || [];
      const paginationData = response?.data || {};
      
      // Debug: Log the filter dates and data received
      console.log('Filter dates:', {
        startDate:
          (filters.startDate && typeof (filters.startDate as any).format === 'function')
            ? (filters.startDate as any).format('YYYY-MM-DD')
            : undefined,
        endDate:
          (filters.endDate && typeof (filters.endDate as any).format === 'function')
            ? (filters.endDate as any).format('YYYY-MM-DD')
            : undefined,
        isSameDay:
          (filters.startDate &&
           filters.endDate &&
           typeof (filters.startDate as any).isSame === 'function')
            ? (filters.startDate as any).isSame(filters.endDate, 'day')
            : false
      });
        console.log('Raw data from API:', data.map(item => ({
        invoiceNo: item.invoiceNo,
        invoiceDate: item.invoiceDate,
        createdAt: item.createdAt,
        formattedDate: moment(item.invoiceDate || item.createdAt).format('YYYY-MM-DD')
      })));
      
      // Additional frontend filtering for exact date match when same date is selected
      let filteredData = data;
      let shouldShowNoDataMessage = false;
      
      if (filters.startDate && filters.endDate && filters.startDate.isSame(filters.endDate, 'day')) {
        const selectedDate = filters.startDate.format('YYYY-MM-DD');
        filteredData = data.filter((invoice) => {
          const eff = invoice.invoiceDate || invoice.createdAt;
          const invoiceDateStr = eff ? moment(eff).format('YYYY-MM-DD') : '';
          return invoiceDateStr === selectedDate;
        });
        
        console.log('Filtered data for same day:', filteredData.map(item => ({
          invoiceNo: item.invoiceNo,
          date: item.createdAt,
          formattedDate: moment(item.createdAt).format('YYYY-MM-DD')
        })));
        
        // If no data matches the exact date, just clear the table silently
        // (toast/notice messages disabled per request — empty table is enough feedback)
        if (filteredData.length === 0) {
          shouldShowNoDataMessage = true;
        }
      } else if (filters.startDate && filters.endDate) {
        // For date ranges, also apply frontend filtering to ensure data is within range
        const startDate = filters.startDate.format('YYYY-MM-DD');
        const endDate = filters.endDate.format('YYYY-MM-DD');
        
        filteredData = data.filter((invoice) => {
          const eff = invoice.invoiceDate || invoice.createdAt;
          const invoiceDateStr = eff ? moment(eff).format('YYYY-MM-DD') : '';
          return invoiceDateStr >= startDate && invoiceDateStr <= endDate;
        });
        
        console.log('Filtered data for date range:', filteredData.map(item => ({
          invoiceNo: item.invoiceNo,
          date: item.createdAt,
          formattedDate: moment(item.createdAt).format('YYYY-MM-DD')
        })));
        
        // Backend mismatch warning suppressed per request (table itself shows the in-range data).
      }

      // Apply payment date filter if provided
      if (filters.paymentDateStart || filters.paymentDateEnd) {
        filteredData = filteredData.filter((invoice) => {
          const paymentTimestamps =
            invoice.payment?.map((p) => parsePayDateToTs(p?.payDate)).filter((v) => typeof v === 'number') || [];
          if (paymentTimestamps.length === 0) return false;

          const paymentDateStrs = paymentTimestamps.map((ts) => dayjs(ts).format('YYYY-MM-DD'));
          const start = filters.paymentDateStart || null;
          const end = filters.paymentDateEnd || null;

          if (start && end) {
            return paymentDateStrs.some((d) => d >= start && d <= end);
          } else if (start) {
            return paymentDateStrs.some((d) => d >= start);
          } else if (end) {
            return paymentDateStrs.some((d) => d <= end);
          }
          return true;
        });
      }
      
      if (filters.discountPercent) {
        const threshold = Number(filters.discountPercent);
        if (Number.isFinite(threshold)) {
          filteredData = filteredData.filter((invoice) => {
            const total = Number(invoice.totalBill) || Number(invoice.total) || 0;
            const discount = Number(invoice.discountBill) || Number(invoice.discount) || 0;
            const pct = total > 0 ? (discount / total) * 100 : 0;
            return pct >= threshold;
          });
        }
      }

      const transformedData = filteredData.map((invoice) => {
        const { doctorShare, hospitalShare } = sumInvoiceDoctorHospitalShare(invoice);
        const procedureAdvanceAmount = getProcedureAdvanceAmount(invoice);

        // Get payment date (latest payment date from payment array)
        const paymentEntries = Array.isArray(invoice.payment) ? invoice.payment : [];
        const paymentEntriesWithTs = paymentEntries
          .map((p) => ({
            payDate: p?.payDate,
            ts: parsePayDateToTsWithFallback(
              p?.payDate,
              p?.createdAt || p?.updatedAt || invoice.updatedAt || invoice.createdAt,
            ),
          }))
          .filter((p) => typeof p.ts === 'number');

        const latestPayment = paymentEntriesWithTs.length
          ? paymentEntriesWithTs.reduce((acc, cur) => (cur.ts > acc.ts ? cur : acc))
          : null;

        // If user selected a payment date range, pick the payment that falls within the range
        let selectedPayment = latestPayment;
        const start = filters.paymentDateStart || null;
        const end = filters.paymentDateEnd || null;
        if (start || end) {
          const inRange = (ts: number) => {
            const d = dayjs(ts).format('YYYY-MM-DD');
            if (start && end) return d >= start && d <= end;
            if (start) return d >= start;
            if (end) return d <= end;
            return true;
          };
          const matched = paymentEntriesWithTs.filter((p) => inRange(p.ts));
          if (matched.length > 0) {
            // Choose the latest payment within the selected range
            selectedPayment = matched.reduce((acc, cur) => (cur.ts > acc.ts ? cur : acc));
          }
        }

        // Listing par advance/due ko hamesha live recompute karte hain (totalBill aur totalPay se).
        // Pehle stored `advancePay` / `duePay` use ho raha tha, lekin purani buggy data
        // (e.g. 50k paid pe 100k advance) wahi galat values dikhati thi. Live recompute = always sahi.
        const totalBillNum = Number(invoice.totalBill) || 0;
        const totalPayNum = Number(invoice.totalPay) || 0;
        const advance = Math.max(0, totalPayNum - totalBillNum);
        const due = Math.max(0, totalBillNum - totalPayNum);

        const createdByName =
          invoice.createdByData?.name ||
          invoice.createdById?.name ||
          invoice.createdBy?.name ||
          invoice.createdBy?.user?.name ||
          'N/A';
        const updatedByName =
          invoice.updatedByData?.name ||
          invoice.updatedById?.name ||
          invoice.updatedBy?.name ||
          invoice.updatedBy?.user?.name ||
          'N/A';

        return {
          key: invoice._id,
          
          _id: invoice._id,
          invoiceNo: invoice.invoiceNo,
          date: invoice.invoiceDate || invoice.createdAt,
          invoiceDate: invoice.invoiceDate || null,
          createdAt: invoice.createdAt,
          updatedAt: invoice.updatedAt,
          patientId: invoice.patientId,
          branchId: invoice.branchId,
          patientMR: invoice.patientId?.mr || invoice.patientData?.mr || 'N/A',
          patientName: invoice.patientId?.name || invoice.patientData?.name || 'N/A',
          patientPhone: invoice.patientId?.phone || invoice.patientData?.phone || 'N/A',
          // Store doctor and department IDs separately for reliable client-side filtering
          doctorId:
            invoice.doctorId?._id ||
            invoice.doctorData?._id ||
            invoice.doctorId ||
            null,
          departmentId:
            (invoice.doctorId?.departmentId &&
              (invoice.doctorId.departmentId._id || invoice.doctorId.departmentId)) ||
            invoice.departmentData?._id ||
            invoice.departmentId?._id ||
            invoice.departmentId ||
            null,
          doctor: invoice.doctorId?.name || invoice.doctorData?.name || 'N/A',
          department: invoice.doctorId?.departmentId?.name || invoice.departmentData?.name || 'N/A',
          items: invoice.item.map(i => i.description).join(', '),
          item: invoice.item,
          invoiceExpenses: invoice.invoiceExpenses || [],
          // Keep a list of procedure IDs for client-side filtering
          procedureIds: (invoice.item || [])
            .map(i => (i.procedureId && (i.procedureId._id || i.procedureId)) || null)
            .filter(Boolean),
          subTotal: invoice.subTotalBill || 0,
          discount: invoice.discountBill || 0,
          tax: invoice.taxBill || 0,
          total: invoice.totalBill || 0,
          paid: invoice.totalPay || 0,
          due,
          advance,
          procedureAdvanceAmount,
          hasProcedureAdvance: procedureAdvanceAmount > 0,
          doctorShare,
          hospitalShare,
          paymentMode: invoice.payment?.[0]?.method || 'N/A',
          status: advance > 0 ? 'Advance' : due === 0 ? 'Paid' : 'Pending',
          createdBy: createdByName,
          updatedBy: updatedByName,
          paymentDate: selectedPayment?.payDate || latestPayment?.payDate || null,
          paymentDateTs: selectedPayment?.ts || latestPayment?.ts || null,
        };
      });

      // Extra safety: apply client-side filters for doctor, department, procedure and amount
      // so that filters always work even if backend casting/lookup behaves unexpectedly.
      let finalData = transformedData;

      if (activeListTab === 'procedureAdvance') {
        finalData = finalData.filter((inv) => Number(inv.procedureAdvanceAmount) > 0);
      }

      if (filters.doctor) {
        finalData = finalData.filter((inv) => {
          const idMatch = inv.doctorId && String(inv.doctorId) === String(filters.doctor);
          const nameMatch =
            inv.doctor &&
            selectedDoctor?.label &&
            inv.doctor.toLowerCase() === selectedDoctor.label.toLowerCase();
          return idMatch || nameMatch;
        });
      }

      if (filters.department) {
        finalData = finalData.filter((inv) => String(inv.departmentId) === String(filters.department));
      }

      if (filters.procedure) {
        finalData = finalData.filter(
          (inv) =>
            Array.isArray(inv.procedureIds) &&
            inv.procedureIds.some((id) => String(id) === String(filters.procedure)),
        );
      }

      if (filters.minAmount) {
        const min = Number(filters.minAmount);
        if (Number.isFinite(min)) {
          finalData = finalData.filter((inv) => {
            const value =
              amountField === 'total'
                ? inv.total
                : amountField === 'discount'
                ? inv.discount
                : amountField === 'due'
                ? inv.due
                : amountField === 'advance'
                ? inv.advance
                : inv.paid; // default = paid
            return Number(value) >= min;
          });
        }
      }

      if (filters.maxAmount) {
        const max = Number(filters.maxAmount);
        if (Number.isFinite(max)) {
          finalData = finalData.filter((inv) => {
            const value =
              amountField === 'total'
                ? inv.total
                : amountField === 'discount'
                ? inv.discount
                : amountField === 'due'
                ? inv.due
                : amountField === 'advance'
                ? inv.advance
                : inv.paid; // default = paid
            return Number(value) <= max;
          });
        }
      }

      // Invoice date range: chronological order (range start → end; oldest first)
      if (filters.startDate && filters.endDate) {
        finalData = [...finalData].sort(
          (a, b) => moment(a.date || a.createdAt).valueOf() - moment(b.date || b.createdAt).valueOf(),
        );
      } else if (filters.minAmount || filters.maxAmount) {
        // Sort results ascending by the selected amount field (only when no invoice date range)
        finalData = [...finalData].sort((a, b) => {
          const getValue = (inv: any) =>
            amountField === 'total'
              ? inv.total
              : amountField === 'discount'
              ? inv.discount
              : amountField === 'due'
              ? inv.due
              : amountField === 'advance'
              ? inv.advance
              : inv.paid; // default = paid

          return Number(getValue(a)) - Number(getValue(b));
        });
      }

      setInvoices(finalData);
      setFilteredInvoices(finalData);
      
      // Update pagination state
      setPagination({
        current: paginationData.currentPage || 1,
        pageSize: paginationData.limit || 20,
        // Use filtered length when we forcibly clear data for an exact-date mismatch
        total: shouldShowNoDataMessage ? 0 : (paginationData.count || finalData.length || 0),
        totalPages: shouldShowNoDataMessage ? 0 : (paginationData.totalPages || 0)
      });
    } catch (err) {
      message.error('Failed to fetch invoices');
      console.error('Invoice fetch error:', err);
    } finally {
      setLoading(false);
    }
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

   const generatePdf = async (invoice) => {
    console.log(invoice);
    
        try {
          const inv = await enrichInvoiceForPdf(invoice);
          // Create the PDF blob
          const blob = await pdf(<InvoicePdf invoice={inv} patient={inv?.patientId} />).toBlob();
          
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
    // When page size changes, reset to first page
    const newCurrent = (pageSize !== pagination.pageSize) ? 1 : (current || 1);
    setPagination(prev => ({
      ...prev,
      current: newCurrent,
      pageSize: pageSize || prev.pageSize
    }));
    fetchInvoices(newCurrent, pageSize || pagination.pageSize);
  };

  useEffect(() => {
    fetchInvoices(1, pagination.pageSize);
  }, [filters, branchEpoch, activeListTab]);

  // Reset to first page when filters change
  useEffect(() => {
    if (pagination.current !== 1) {
      setPagination(prev => ({ ...prev, current: 1 }));
    }
  }, [filters]);

  const columns = [
    {
      title: 'INVOICE #',
      dataIndex: 'invoiceNo',
      key: 'invoiceNo',
      width: 120,
      fixed: 'left',
      sorter: (a, b) => String(a.invoiceNo || '').localeCompare(String(b.invoiceNo || '')),
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: 'INVOICE DATE',
      dataIndex: 'date',
      key: 'invoiceEffectiveDate',
      width: 125,
      render: (value) =>
        value ? moment(value).format('DD/MM/YYYY') : 'N/A',
      sorter: (a, b) =>
        moment(a.date || a.createdAt).valueOf() - moment(b.date || b.createdAt).valueOf(),
      sortDirections: ['ascend', 'descend'],
      ...(filters.startDate && filters.endDate ? { defaultSortOrder: 'ascend' as const } : {}),
    },
    {
      title: 'MR#',
      dataIndex: 'patientMR',
      key: 'patientMR',
      width: 100,
      sorter: (a, b) => String(a.patientMR || '').localeCompare(String(b.patientMR || '')),
      sortDirections: ['ascend', 'descend'],
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
      sorter: (a, b) => String(a.patientName || '').localeCompare(String(b.patientName || '')),
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: 'PHONE',
      dataIndex: 'patientPhone',
      key: 'patientPhone',
      width: 120,
      sorter: (a, b) => String(a.patientPhone || '').localeCompare(String(b.patientPhone || '')),
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: 'DOCTOR',
      dataIndex: 'doctor',
      key: 'doctor',
      width: 150,
      sorter: (a, b) => String(a.doctor || '').localeCompare(String(b.doctor || '')),
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: 'DEPARTMENT',
      dataIndex: 'department',
      key: 'department',
      width: 150,
      sorter: (a, b) => String(a.department || '').localeCompare(String(b.department || '')),
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: 'PROCEDURE NAME',
      dataIndex: 'items',
      key: 'items',
      ellipsis: true,
      width: 200,
      sorter: (a, b) => String(a.items || '').localeCompare(String(b.items || '')),
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: 'SUBTOTAL',
      dataIndex: 'subTotal',
      key: 'subTotal',
      width: 100,
      render: (value) => value.toLocaleString(),
      sorter: (a, b) => Number(a.subTotal) - Number(b.subTotal),
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: 'DISCOUNT',
      dataIndex: 'discount',
      key: 'discount',
      width: 100,
      render: (value) => value.toLocaleString(),
      sorter: (a, b) => Number(a.discount) - Number(b.discount),
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: 'TAX',
      dataIndex: 'tax',
      key: 'tax',
      width: 100,
      render: (value) => value.toLocaleString(),
      sorter: (a, b) => Number(a.tax) - Number(b.tax),
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: 'TOTAL',
      dataIndex: 'total',
      key: 'total',
      width: 100,
      render: (value) => value.toLocaleString(),
      sorter: (a, b) => Number(a.total) - Number(b.total),
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: 'PAID',
      dataIndex: 'paid',
      key: 'paid',
      width: 100,
      render: (value) => value.toLocaleString(),
      sorter: (a, b) => Number(a.paid) - Number(b.paid),
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: 'DUE',
      dataIndex: 'due',
      key: 'due',
      width: 100,
      render: (value) => value.toLocaleString(),
      sorter: (a, b) => Number(a.due) - Number(b.due),
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: 'ADVANCE',
      dataIndex: 'advance',
      key: 'advance',
      width: 110,
      render: (value) => (Number(value) > 0 ? Number(value).toLocaleString() : '-'),
      sorter: (a, b) => Number(a.advance) - Number(b.advance),
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: 'PROCEDURE ADVANCE',
      dataIndex: 'procedureAdvanceAmount',
      key: 'procedureAdvanceAmount',
      width: 180,
      render: (value) => (Number(value) > 0 ? Number(value).toLocaleString() : '-'),
      sorter: (a, b) => Number(a.procedureAdvanceAmount || 0) - Number(b.procedureAdvanceAmount || 0),
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: 'PAYMENT MODE',
      dataIndex: 'paymentMode',
      key: 'paymentMode',
      width: 120,
      sorter: (a, b) => String(a.paymentMode || '').localeCompare(String(b.paymentMode || '')),
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (_, record) => {
        // Use the status from record which is calculated based on duePay
        const status = record.status || (record.due < 0 ? 'Credit' : record.due === 0 ? 'Paid' : 'Pending');
        return (
          <span 
            style={{
              color: status === 'Paid' ? '#52c41a' : status === 'Credit' ? '#1890ff' : '#f5222d',
              backgroundColor: status === 'Paid' ? '#f6ffed' : status === 'Credit' ? '#e6f7ff' : '#fff1f0',
              padding: '4px 8px',
              borderRadius: '4px',
              display: 'inline-block',
              border: `1px solid ${status === 'Paid' ? '#b7eb8f' : status === 'Credit' ? '#91d5ff' : '#ffa39e'}`
            }}
          >
            {status}
          </span>
        );
      },
      width: 120,
      sorter: (a, b) => String(a.status || '').localeCompare(String(b.status || '')),
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: 'CREATED AT',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (value) => (value ? moment(value).format('DD/MM/YYYY HH:mm') : 'N/A'),
      sorter: (a, b) => dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf(),
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: 'UPDATED AT',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 170,
      render: (value) => (value ? moment(value).format('DD/MM/YYYY HH:mm') : 'N/A'),
      sorter: (a, b) => dayjs(a.updatedAt).valueOf() - dayjs(b.updatedAt).valueOf(),
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: 'PAYMENT DATE',
      dataIndex: 'paymentDateTs',
      key: 'paymentDate',
      width: 180,
      sorter: (a, b) => {
        if (!a.paymentDateTs && !b.paymentDateTs) return 0;
        if (!a.paymentDateTs) return 1;
        if (!b.paymentDateTs) return -1;
        return a.paymentDateTs - b.paymentDateTs;
      },
      render: (ts) => {
        if (!ts) return 'N/A';
        return dayjs(ts).format('DD/MM/YYYY - hh:mm A');
      },
    },
    {
      title: 'Action',
      key: 'action',
      fixed: 'right',
      render: (_, record) => (
        <div className='flex items-center gap-2' style={{ whiteSpace: 'nowrap' }}>
          <RiFile2Line 
            className="text-red-500 text-xl cursor-pointer" 
            onClick={() => generatePdf(record)} 
          />
          {canInvUpdate ? (
            <>
              <RiPenNibFill
                className="text-green-600 text-xl cursor-pointer"
                onClick={() => openPaymentModal(record)}
              />
              <Button size="small" onClick={() => openRefundModal(record)}>
                Refund
              </Button>
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
            </>
          ) : null}
          {canInvDelete ? (
            <RiDeleteBin5Line 
              color='red' 
              size={20} 
              onClick={() => handleDelete(record._id)} 
              style={{ cursor: 'pointer' }}
            />
          ) : null}
        </div>
      ),
      width: 240,
    },
  ];

  const visibleColumns = columns.filter((column) => {
    const key = String(column?.key || '');
    if (activeListTab === 'all') {
      return key !== 'advance' && key !== 'procedureAdvanceAmount';
    }
    if (activeListTab === 'procedureAdvance') {
      return [
        'invoiceNo',
        'invoiceEffectiveDate',
        'patientMR',
        'patientName',
        'patientPhone',
        'doctor',
        'items',
        'procedureAdvanceAmount',
        'paymentMode',
        'status',
        'action',
      ].includes(key);
    }
    return true;
  });

  
   

    
    

  return (
     <>
      <div className="">
        <Breadcrumb pageName="Invoice" />
        
      

    
        <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default sm:px-7.5 xl:pb-1">
         <div className=' flex mb-5 justify-between items-center'>
           <div className="">
            <h1 className="text-xl font-semibold text-black">Invoices List</h1>
          </div>

           {canInvCreate ? (
           <Link
            to="/invoice/new"
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
           ) : null}
         </div>
          <Row gutter={[16, 16]} style={{ marginBottom: '20px' }}>
            <Col xs={24} sm={12} md={8} lg={6}>
              <AsyncPaginate
                value={selectedDepartment}
                loadOptions={loadDepartmentOptions}
                onChange={(opt) => {
                  const option = (opt as DepartmentOption | null) || null;
                  setSelectedDepartment(option);
                  setFilters((prev) => ({ ...prev, department: option?.value || '' }));
                }}
                additional={{ page: 1 }}
                placeholder="Select Departments"
                classNamePrefix="react-select"
                className="w-full"
                debounceTimeout={400}
                menuPortalTarget={document.body}
                menuPosition="fixed"
                styles={{
                  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                  control: (base) => ({ ...base, minHeight: '40px' }),
                }}
                isClearable
              />
            </Col>

            <Col xs={24} sm={12} md={8} lg={6}>
              <AsyncPaginate
                value={selectedDoctor}
                loadOptions={loadDoctorOptions}
                onChange={(opt) => {
                  const option = (opt as DoctorOption | null) || null;
                  setSelectedDoctor(option);
                  // Use functional update to avoid stale filters
                  setFilters((prev) => ({
                    ...prev,
                    doctor: option?.value || '',
                  }));
                }}
                additional={{ page: 1 }}
                placeholder="Select Doctor"
                classNamePrefix="react-select"
                className="w-full"
                debounceTimeout={400}
                menuPortalTarget={document.body}
                menuPosition="fixed"
                styles={{
                  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                  control: (base) => ({ ...base, minHeight: '40px' }),
                }}
                isClearable
              />
            </Col>

            <Col xs={24} sm={12} md={8} lg={6}>
              <AsyncPaginate
                value={selectedProcedure}
                loadOptions={loadProcedureOptions}
                onChange={(opt) => {
                  const option = (opt as ProcedureOption | null) || null;
                  setSelectedProcedure(option);
                  setFilters((prev) => ({ ...prev, procedure: option?.value || '' }));
                }}
                additional={{ page: 1 }}
                placeholder="Select Procedure"
                classNamePrefix="react-select"
                className="w-full"
                debounceTimeout={400}
                menuPortalTarget={document.body}
                menuPosition="fixed"
                styles={{
                  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                  control: (base) => ({ ...base, minHeight: '40px' }),
                }}
                isClearable
              />
            </Col>

            <Col xs={24} sm={12} md={8} lg={6}>
              <Select
                placeholder="Select Payment Mode"
                style={{ width: '100%' }}
                value={filters.paymentMode}
                onChange={(value) => setFilters((prev) => ({ ...prev, paymentMode: value }))}
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
                onChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
                allowClear
              >
                <Option value="" disabled>
                        Select Status
                      </Option>
                <Option value="Paid">Paid</Option>
                <Option value="Pending">Pending</Option>
                <Option value="Advance">Advance</Option>
              </Select>
            </Col>

            <Col xs={24} sm={12} md={8} lg={12}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ whiteSpace: 'nowrap' }}>Invoice Date:</span>
                <RangePicker
                  style={{ flex: 1 }}
                  value={
                    filters.startDate && filters.endDate
                      ? [dayjs(filters.startDate.toDate()), dayjs(filters.endDate.toDate())]
                      : null
                  }
                  presets={dateRangePresets}
                  disabledDate={disabledDate}
                  format="DD/MM/YYYY"
                  allowClear
                  onChange={(dates: [Dayjs, Dayjs] | null) => {
                    if (!dates) {
                      setFilters((prev) => ({
                        ...prev,
                        dateRange: [],
                        startDate: '' as any,
                        endDate: '' as any,
                      }));
                      return;
                    }
                    const start = moment(dates[0].toDate()).startOf('day');
                    const end = moment(dates[1].toDate()).endOf('day');
                    setFilters((prev) => ({
                      ...prev,
                      dateRange: [start, end],
                      startDate: start,
                      endDate: end,
                    }));
                  }}
                />
              </div>
            </Col>

            <Col xs={24} sm={12} md={8} lg={10}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ whiteSpace: 'nowrap' }}>Payment Date:</span>
                <RangePicker
                  style={{ flex: 1 }}
                  value={
                    filters.paymentDateStart && filters.paymentDateEnd
                      ? [
                          dayjs(filters.paymentDateStart),
                          dayjs(filters.paymentDateEnd),
                        ]
                      : null
                  }
                  presets={dateRangePresets}
                  disabledDate={disabledDate}
                  format="DD/MM/YYYY"
                  allowClear
                  onChange={(dates: [Dayjs, Dayjs] | null) => {
                    if (!dates) {
                      setFilters((prev) => ({
                        ...prev,
                        paymentDateStart: '',
                        paymentDateEnd: '',
                      }));
                      return;
                    }

                    setFilters((prev) => ({
                      ...prev,
                      paymentDateStart: dates[0].format('YYYY-MM-DD'),
                      paymentDateEnd: dates[1].format('YYYY-MM-DD'),
                    }));
                  }}
                />
                
              </div>
            </Col>

            <Col xs={24} sm={12} md={8} lg={6}>
              <Input
                 placeholder="Search by Patient Name"
                 value={filters.patientName}
                 onChange={(e) => setFilters((prev) => ({ ...prev, patientName: e.target.value }))}
                 allowClear
                 style={{ color: '#000' }}
              />
            </Col>

            <Col xs={24} sm={12} md={8} lg={7}>
              <AsyncPaginate
                value={selectedPatient}
                loadOptions={loadPatientOptions}
                onChange={(opt) => {
                  const option = (opt as PatientOption | null) || null;
                  setSelectedPatient(option);
                  const p = option?.patientData;
                  setFilters((prev) => ({
                    ...prev,
                    patientMR: p?.mr || '',
                    patientName: p?.name || '',
                    patientPhone: p?.phone || '',
                  }));
                }}
                additional={{ page: 1 }}
                placeholder="Search by MR Number / Name / Phone"
                classNamePrefix="react-select"
                className="w-full"
                debounceTimeout={400}
                menuPortalTarget={document.body}
                menuPosition="fixed"
                styles={{
                  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                  control: (base) => ({ ...base, minHeight: '40px' }),
                }}
                isClearable
                getOptionLabel={(option) => {
                  const p = (option as PatientOption).patientData;
                  if (!p) return option.label;
                  return `${p.name} (MR# ${p.mr || ''})${p.phone ? ` - ${p.phone}` : ''}`;
                }}
              />
            </Col>

            <Col xs={24} sm={12} md={8} lg={6}>
              <Input
                 placeholder="Search by Phone Number"
                 value={filters.patientPhone}
                 onChange={(e) => setFilters((prev) => ({ ...prev, patientPhone: e.target.value }))}
                 allowClear
                 style={{ color: '#000' }}
              />
            </Col>

            <Col xs={24} sm={12} md={8} lg={6}>
              <Input
                 placeholder="Search by Invoice Number"
                 value={filters.invoiceNumber}
                 onChange={(e) => setFilters((prev) => ({ ...prev, invoiceNumber: e.target.value }))}
                 allowClear
                 style={{ color: '#000' }}
              />
            </Col>

            <Col xs={24} sm={12} md={8} lg={6}>
              <Select
                placeholder="Amount Type"
                style={{ width: '100%' }}
                value={filters.amountField}
                onChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    amountField: value || 'paid',
                  }))
                }
              >
                <Option value="paid">Paid Amount</Option>
                <Option value="total">Total Amount</Option>
                <Option value="discount">Discount Amount</Option>
                <Option value="due">Due Amount</Option>
                <Option value="advance">Advance Amount</Option>
              </Select>
            </Col>

            <Col xs={24} sm={12} md={8} lg={6}>
              <Input
                placeholder="Min Amount"
                value={filters.minAmount}
                onChange={(e) => setFilters((prev) => ({ ...prev, minAmount: e.target.value }))}
                type="number"
              />
            </Col>

            <Col xs={24} sm={12} md={8} lg={6}>
              <Input
                placeholder="Max Amount"
                value={filters.maxAmount}
                onChange={(e) => setFilters((prev) => ({ ...prev, maxAmount: e.target.value }))}
                type="number"
              />
            </Col>
            
            <Col xs={24} sm={12} md={8} lg={6}>
              <Input
                placeholder="Discount %"
                value={filters.discountPercent}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || Number(val) <= 100) {
                    setFilters((prev) => ({ ...prev, discountPercent: val }));
                  }
                }}
                type="number"
                min={0}
                max={100}
              />
            </Col>

            <Col xs={24} className="flex justify-end gap-2">
                    <Button
                      type="default"
                      onClick={() => fetchInvoices(1, pagination.pageSize)}
                      loading={loading}
                    >
                      Search
                    </Button>
                    <Button
                      onClick={() => {
                        const todayStart = moment().startOf('day');
                        const todayEnd = moment().endOf('day');
                        setFilters({
                          dateRange: [todayStart, todayEnd],
                          startDate: todayStart,
                          endDate: todayEnd,
                          department: '',
                          paymentMode: '',
                          doctor: '',
                          procedure: '',
                          amountField: 'paid',
                          patientName: '',
                          patientMR: '',
                          patientPhone: '',
                          invoiceNumber: '',
                          status: '',
                          minAmount: '',
                          maxAmount: '',
                          paymentDateStart: '',
                          paymentDateEnd: '',
                          discountPercent: '',
                        });
                        setSelectedDoctor(null);
                        setSelectedDepartment(null);
                        setSelectedProcedure(null);
                        setSelectedPatient(null);
                        setPagination({
                          current: 1,
                          pageSize: 20,
                          total: 0,
                          totalPages: 0
                        });
                      }}
                    >
                      Reset
                    </Button>
                  </Col>
            
          </Row>

          <div className="mb-4">
            <Tabs
              activeKey={activeListTab}
              onChange={(key) => {
                setActiveListTab(key as 'all' | 'procedureAdvance');
                setPagination((prev) => ({ ...prev, current: 1 }));
              }}
              items={[
                { key: 'all', label: 'All Invoices' },
                { key: 'procedureAdvance', label: 'Procedure Advance' },
              ]}
            />
          </div>
          
          <div className="overflow-x-auto">
            <Table
              ref={tableRef}
              rowKey="_id"
              rowSelection={rowSelection}
              columns={visibleColumns}
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
        </div>
      </div>

      <Modal
        open={paymentModalOpen}
        onCancel={() => setPaymentModalOpen(false)}
        onOk={submitInvoicePayments}
        okText={savingPayment ? 'Saving...' : 'Save Payment'}
        okButtonProps={{ disabled: savingPayment, className: 'bg-primary text-white hover:bg-opacity-90' }}
        title={`Add Payment${paymentInvoice?.invoiceNo ? ` - ${paymentInvoice.invoiceNo}` : ''}`}
        width={800}
      >
        <div className="space-y-3">
          {paymentRows.map((row, index) => (
            <div key={index} className="rounded-lg border border-stroke p-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <div className="mb-1 text-xs font-medium text-bodydark">Method</div>
                  <select
                    value={row.method}
                    onChange={(e) => {
                      const v = e.target.value;
                      setPaymentRows((prev) => prev.map((p, i) => (i === index ? { ...p, method: v } : p)));
                    }}
                    className="w-full rounded-lg border border-stroke bg-transparent py-2 px-3 text-sm outline-none focus:border-primary"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Advance">Advance</option>
                    <option value="Card">Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <div className="mb-1 text-xs font-medium text-bodydark">Amount</div>
                  <input
                    type="number"
                    value={row.paid}
                    onChange={(e) => {
                      const v = e.target.value;
                      setPaymentRows((prev) => prev.map((p, i) => (i === index ? { ...p, paid: v } : p)));
                    }}
                    className="w-full rounded-lg border border-stroke bg-transparent py-2 px-3 text-sm outline-none focus:border-primary"
                    placeholder="0"
                    min={0}
                  />
                </div>

                <div>
                  <div className="mb-1 text-xs font-medium text-bodydark">
                    Payment date &amp; time
                  </div>
                  <input
                    type="datetime-local"
                    value={row.payDate}
                    onChange={(e) => {
                      const v = e.target.value;
                      setPaymentRows((prev) => prev.map((p, i) => (i === index ? { ...p, payDate: v } : p)));
                    }}
                    className="w-full rounded-lg border border-stroke bg-transparent py-2 px-3 text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div className="md:col-span-2">
                  <div className="mb-1 text-xs font-medium text-bodydark">Reference</div>
                  <input
                    type="text"
                    value={row.reference}
                    onChange={(e) => {
                      const v = e.target.value;
                      setPaymentRows((prev) => prev.map((p, i) => (i === index ? { ...p, reference: v } : p)));
                    }}
                    className="w-full rounded-lg border border-stroke bg-transparent py-2 px-3 text-sm outline-none focus:border-primary"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <div className="mb-1 text-xs font-medium text-bodydark">Notes</div>
                  <input
                    type="text"
                    value={row.notes}
                    onChange={(e) => {
                      const v = e.target.value;
                      setPaymentRows((prev) => prev.map((p, i) => (i === index ? { ...p, notes: v } : p)));
                    }}
                    className="w-full rounded-lg border border-stroke bg-transparent py-2 px-3 text-sm outline-none focus:border-primary"
                    placeholder="Optional"
                  />
                </div>
              </div>

              {row.method === 'Cheque' && (
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div>
                    <div className="mb-1 text-xs font-medium text-bodydark">Cheque No</div>
                    <input
                      type="text"
                      value={row.chequeNo}
                      onChange={(e) => {
                        const v = e.target.value;
                        setPaymentRows((prev) => prev.map((p, i) => (i === index ? { ...p, chequeNo: v } : p)));
                      }}
                      className="w-full rounded-lg border border-stroke bg-transparent py-2 px-3 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-medium text-bodydark">Bank</div>
                    <input
                      type="text"
                      value={row.bankName}
                      onChange={(e) => {
                        const v = e.target.value;
                        setPaymentRows((prev) => prev.map((p, i) => (i === index ? { ...p, bankName: v } : p)));
                      }}
                      className="w-full rounded-lg border border-stroke bg-transparent py-2 px-3 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-medium text-bodydark">Cheque Date</div>
                    <input
                      type="date"
                      value={row.chequeDate}
                      onChange={(e) => {
                        const v = e.target.value;
                        setPaymentRows((prev) => prev.map((p, i) => (i === index ? { ...p, chequeDate: v } : p)));
                      }}
                      className="w-full rounded-lg border border-stroke bg-transparent py-2 px-3 text-sm outline-none focus:border-primary"
                    />
                  </div>
                </div>
              )}

              <div className="mt-3 flex justify-end gap-2">
                <Button onClick={() => setPaymentRows((prev) => prev.filter((_, i) => i !== index))} disabled={paymentRows.length === 1}>
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3">
          <Button
            onClick={() =>
              setPaymentRows((prev) => [
                ...prev,
                {
                  method: 'Cash',
                  paid: '',
                  payDate: dayjs().format('YYYY-MM-DDTHH:mm'),
                  reference: '',
                  chequeNo: '',
                  bankName: '',
                  chequeDate: '',
                  notes: '',
                },
              ])
            }
          >
            + Add More
          </Button>
        </div>
      </Modal>

      <Modal
        open={refundModalOpen}
        onCancel={() => setRefundModalOpen(false)}
        onOk={submitInvoiceRefund}
        okText={savingRefund ? 'Saving...' : 'Record Refund'}
        okButtonProps={{ disabled: savingRefund, className: 'bg-primary text-white hover:bg-opacity-90' }}
        title={`Refund${refundInvoice?.invoiceNo ? ` - ${refundInvoice.invoiceNo}` : ''}`}
        width={700}
      >
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="mb-1 text-xs font-medium text-bodydark">Refund Type</div>
              <select
                value={refundType}
                onChange={(e) => {
                  const newType = e.target.value as 'invoice' | 'procedure';
                  setRefundType(newType);
                  
                  // Clear procedure-specific fields when switching types
                  if (newType === 'invoice') {
                    setRefundProcedureItemIndex(-1);
                    setRefundForm((prev) => ({
                      ...prev,
                      procedureId: '',
                      paid: '',
                    }));
                  } else {
                    setRefundProcedureItemIndex(-1);
                    setRefundForm((prev) => ({
                      ...prev,
                      procedureId: '',
                      paid: '',
                    }));
                  }
                }}
                className="w-full rounded-lg border border-stroke bg-transparent py-2 px-3 text-sm outline-none focus:border-primary"
              >
                <option value="invoice">Invoice Refund</option>
                <option value="procedure">Procedure Refund</option>
              </select>
            </div>
            <div>
              <div className="mb-1 text-xs font-medium text-bodydark">Method</div>
              <select
                value={refundForm.method}
                onChange={(e) => setRefundForm((prev) => ({ ...prev, method: e.target.value }))}
                className="w-full rounded-lg border border-stroke bg-transparent py-2 px-3 text-sm outline-none focus:border-primary"
              >
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Credit Note">Credit Note</option>
                <option value="Card Refund">Card Refund</option>
              </select>
            </div>
          </div>

          {refundType === 'procedure' && (
            <div>
              <div className="mb-1 text-xs font-medium text-bodydark">
                Procedure {loadingRefundInvoice ? '(loading…)' : ''}
              </div>
              <select
                value={
                  refundProcedureItemIndex >= 0 && refundForm.procedureId
                    ? `${refundProcedureItemIndex}:${refundForm.procedureId}`
                    : ''
                }
                onChange={(e) => {
                  const raw = e.target.value;
                  if (!raw) {
                    setRefundProcedureItemIndex(-1);
                    setRefundForm((prev) => ({ ...prev, procedureId: '', paid: '' }));
                    return;
                  }
                  const [idxStr, selectedProcedureId] = raw.split(':');
                  const itemIdx = parseInt(idxStr, 10);
                  const items = Array.isArray(refundInvoice?.item) ? refundInvoice.item : [];
                  const selectedItem =
                    Number.isFinite(itemIdx) && itemIdx >= 0 ? items[itemIdx] : null;
                  const maxRef =
                    selectedItem != null &&
                    Number.isFinite(itemIdx) &&
                    itemIdx >= 0 &&
                    !hasProcedureRefundOnLine(
                      refundInvoice?.payment,
                      selectedProcedureId,
                      itemIdx,
                    )
                      ? procedureMaxRefundableFromInvoiceRow(
                          selectedItem,
                          refundInvoice?.payment,
                          itemIdx,
                        )
                      : 0;
                  setRefundProcedureItemIndex(Number.isFinite(itemIdx) ? itemIdx : -1);
                  setRefundForm((prev) => ({
                    ...prev,
                    procedureId: selectedProcedureId || '',
                    paid: maxRef > 0 ? formatProcedureRefundMoney(maxRef) : '',
                  }));
                }}
                className="w-full rounded-lg border border-stroke bg-transparent py-2 px-3 text-sm outline-none focus:border-primary"
              >
                <option value="">Select</option>
                {(refundInvoice?.item || []).map((it: any, idx: number) => {
                  const pid = refId(it?.procedureId?._id || it?.procedureId);
                  const maxRef = hasProcedureRefundOnLine(refundInvoice?.payment, pid, idx)
                    ? 0
                    : procedureMaxRefundableFromInvoiceRow(it, refundInvoice?.payment, idx);
                  const label =
                    it?.description || it?.procedureId?.name || `Item ${idx + 1}`;
                  return (
                    <option
                      key={`${idx}-${pid}`}
                      value={`${idx}:${pid}`}
                      disabled={maxRef <= 0}
                    >
                      {label}
                      {maxRef > 0 ? ` (max Rs. ${formatProcedureRefundMoney(maxRef)})` : ' (fully refunded)'}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <div className="mb-1 text-xs font-medium text-bodydark">Amount</div>
              <input
                type="number"
                value={refundForm.paid}
                onChange={(e) => setRefundForm((prev) => ({ ...prev, paid: e.target.value }))}
                className="w-full rounded-lg border border-stroke bg-transparent py-2 px-3 text-sm outline-none focus:border-primary"
                placeholder="0"
                min={0}
              />
            </div>
            <div>
              <div className="mb-1 text-xs font-medium text-bodydark">Date</div>
              <input
                type="date"
                value={refundForm.payDate}
                onChange={(e) => setRefundForm((prev) => ({ ...prev, payDate: e.target.value }))}
                className="w-full rounded-lg border border-stroke bg-transparent py-2 px-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <div className="mb-1 text-xs font-medium text-bodydark">Reference</div>
              <input
                type="text"
                value={refundForm.reference}
                onChange={(e) => setRefundForm((prev) => ({ ...prev, reference: e.target.value }))}
                className="w-full rounded-lg border border-stroke bg-transparent py-2 px-3 text-sm outline-none focus:border-primary"
                placeholder="Optional"
              />
            </div>
          </div>

          <div>
            <div className="mb-1 text-xs font-medium text-bodydark">Notes</div>
            <input
              type="text"
              value={refundForm.notes}
              onChange={(e) => setRefundForm((prev) => ({ ...prev, notes: e.target.value }))}
              className="w-full rounded-lg border border-stroke bg-transparent py-2 px-3 text-sm outline-none focus:border-primary"
              placeholder="Reason / comments"
            />
          </div>
        </div>
      </Modal>

      {/* Add custom CSS for table scrolling and placeholder colors */}
      <style jsx global>{`
        .ant-table-container {
          overflow-x: auto !important;
        }
        .ant-table {
          min-width: 100% !important;
          width: max-content !important;
        }
        .ant-input::placeholder {
          color: #000 !important;
          opacity: 0.6;
        }
        .ant-input::-webkit-input-placeholder {
          color: #000 !important;
          opacity: 0.6;
        }
        .ant-input::-moz-placeholder {
          color: #000 !important;
          opacity: 0.6;
        }
        .ant-input:-ms-input-placeholder {
          color: #000 !important;
          opacity: 0.6;
        }
      `}</style>
    </>
  );
};

export default Invoice;
