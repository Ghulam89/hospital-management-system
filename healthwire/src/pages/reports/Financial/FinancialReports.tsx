import React, { useEffect, useState, useRef } from 'react';
import {
  Table,
  DatePicker,
  Select,
  Input,
  Button,
  message,
  Modal,
  Card,
  Row,
  Col,
  Statistic,
  Spin,
} from 'antd';
import axios from 'axios';
import dayjs, { type Dayjs } from 'dayjs';
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
import { AsyncPaginate, type LoadOptions } from 'react-select-async-paginate';

import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import * as XLSX from 'xlsx';
import { useReactToPrint } from 'react-to-print';
import { Link } from 'react-router-dom';
import { getInvoiceHeaderForPdf } from '../../../utils/branchPdfHeader';
import { enrichInvoiceForPdf } from '../../../utils/enrichInvoiceForPdf';
import { Document, Image, Page, pdf, StyleSheet, Text, View } from '@react-pdf/renderer';
import { useBranchScopeEpoch } from '../../../context/BranchScopeEpochContext';
import { sumInvoiceDoctorHospitalShare } from '../../../utils/invoiceShare';

// TypeScript interfaces
interface TransactionItem {
  description: string;
  rate: number;
  quantity: number;
  amount: number;
  discount: number;
  doctorAmount: number;
  hospitalAmount: number;
}

interface Patient {
  _id: string;
  name: string;
  mr: string;
  phone: string;
}

interface Doctor {
  _id: string;
  name: string;
  departmentId: {
    name: string;
  };
}

interface Department {
  _id: string;
  name: string;
}

interface Procedure {
  _id: string;
  name: string;
}

type DoctorOption = {
  value: string;
  label: string;
  doctorData?: any;
};

type DepartmentOption = {
  value: string;
  label: string;
  departmentData?: any;
};

type ProcedureOption = {
  value: string;
  label: string;
  procedureData?: any;
};

interface PatientOption {
  label: string;
  value: string;
  patientData?: {
    _id: string;
    mr: string;
    name: string;
    phone?: string;
  };
}

interface Payment {
  method: string;
}

interface RawTransaction {
  _id: string;
  invoiceNo: string;
  createdAt: string;
  invoiceDate?: string;
  date?: string;
  patientId: Patient;
  doctorId: Doctor;
  departmentData?: Department;
  item: TransactionItem[];
  subTotalBill: number;
  discountBill: number;
  taxBill: number;
  totalBill: number;
  totalPay: number;
  duePay: number;
  payment: Payment[];
  branchId?: unknown;
}

interface TransformedTransaction {
  key: string;
  _id: string;
  invoiceNo: string;
  date: string;
  patientId: Patient;
  patientMR: string;
  patientName: string;
  patientPhone: string;
  doctor: string;
  department: string;
  items: string;
  item: TransactionItem[];
  subTotal: number;
  discount: number;
  tax: number;
  total: number;
  paid: number;
  due: number;
  advance: number;
  doctorShare: number;
  hospitalShare: number;
  paymentMode: string;
  status: string;
  branchId?: unknown;
}

interface PaginationState {
  current: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface Filters {
  startDate: moment.Moment;
  endDate: moment.Moment;
  department: string;
  paymentMode: string;
  doctor: string;
  procedure: string;
  search: string;
  patientName: string;
  patientMR: string;
  patientPhone: string;
  invoiceNumber: string;
  status: string;
  minAmount: string;
  maxAmount: string;
  // which amount field min/max applies to
  amountField: 'paid' | 'total' | 'discount' | 'due' | 'advance';
  dateRange: [moment.Moment, moment.Moment];
  paymentDateStart?: string;
  paymentDateEnd?: string;
  quickPayment?: '' | 'paid' | 'due' | 'advance';
  discountPercent?: string;
}

interface ApiResponse {
  status: string;
  data: RawTransaction[];
  search: string;
  page: number;
  count: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

const effectiveInvoiceDate = (t: RawTransaction): string =>
  (t.invoiceDate as string) || (t.date as string) || t.createdAt;

const { RangePicker } = DatePicker;
const { Option } = Select;

const FinancialReports = () => {
  const branchEpoch = useBranchScopeEpoch();
  const [transactions, setTransactions] = useState<TransformedTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [filteredTransactions, setFilteredTransactions] = useState<TransformedTransaction[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [pagination, setPagination] = useState<PaginationState>({
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
  const tableRef = useRef<HTMLDivElement>(null);
  const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorOption | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentOption | null>(null);
  const [selectedProcedure, setSelectedProcedure] = useState<ProcedureOption | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TransformedTransaction | null>(null);

const [filters, setFilters] = useState<Filters>({
    startDate: moment().startOf('month'),
    endDate: moment().endOf('day'),
  department: '',
  paymentMode: '',
  doctor: '',
  procedure: '',
  search:'',
  patientName: '',
  patientMR: '',
  patientPhone: '',
  invoiceNumber: '',
  status: '',
  minAmount: '',
  maxAmount: '',
  amountField: 'paid',
  dateRange: [moment().startOf('month'), moment().endOf('day')],
  paymentDateStart: '',
  paymentDateEnd: '',
  quickPayment: '',
  discountPercent: '',
});

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      const response = await axios.get(`${Base_url}/apis/department/get`);
      setDepartments(response.data.data || []);
    } catch (error) {
      message.error('Failed to fetch departments');
    }
  };

  const exportAllToExcel = async () => {
    try {
      setExporting(true);
      // Build base query params (same filters, we'll paginate manually)
      const baseParams = new URLSearchParams();
      if (filters.doctor) baseParams.append('doctorId', filters.doctor);
      if (filters.department) baseParams.append('departmentId', filters.department);
      if (filters.patientMR) baseParams.append('patientMR', filters.patientMR);
      if (filters.status) baseParams.append('status', filters.status);
      if (filters.patientName) baseParams.append('patientName', filters.patientName);
      if (filters.patientPhone) baseParams.append('patientPhone', filters.patientPhone);
      if (filters.invoiceNumber) baseParams.append('invoiceNo', filters.invoiceNumber);
      if (filters.search) baseParams.append('search', filters.search);
      // Amount range (export) – mirror same mapping as filters
      const amountField = filters.amountField || 'paid';
      if (filters.minAmount) {
        const min = Number(filters.minAmount);
        if (Number.isFinite(min)) {
          if (amountField === 'total') baseParams.append('minTotalBill', String(min));
          else if (amountField === 'discount') baseParams.append('minDiscountBill', String(min));
          else if (amountField === 'due') baseParams.append('minDue', String(min));
          else if (amountField === 'advance') baseParams.append('minAdvance', String(min));
          else if (amountField === 'refund') { /* frontend filter only */ }
          else baseParams.append('minPaid', String(min));
        }
      }
      if (filters.maxAmount) {
        const max = Number(filters.maxAmount);
        if (Number.isFinite(max)) {
          if (amountField === 'total') baseParams.append('maxTotalBill', String(max));
          else if (amountField === 'discount') baseParams.append('maxDiscountBill', String(max));
          else if (amountField === 'due') baseParams.append('maxDue', String(max));
          else if (amountField === 'advance') baseParams.append('maxAdvance', String(max));
          else if (amountField === 'refund') { /* frontend filter only */ }
          else baseParams.append('maxPaid', String(max));
        }
      }
      if (filters.procedure) baseParams.append('procedureId', filters.procedure);
      if (filters.paymentMode) baseParams.append('paymentMode', filters.paymentMode);
      // Date filtering same as fetchTransactions
      if (filters.startDate && filters.endDate) {
        const startDate = filters.startDate.clone();
        const endDate = filters.endDate.clone();
        if (startDate.isSame(endDate, 'day')) {
          baseParams.append('startDate', startDate.clone().startOf('day').toISOString());
          baseParams.append('endDate', startDate.clone().endOf('day').toISOString());
        } else {
          baseParams.append('startDate', startDate.clone().startOf('day').toISOString());
          baseParams.append('endDate', endDate.clone().endOf('day').toISOString());
        }
      }

      // First request to know total pages
      const firstParams = new URLSearchParams(baseParams.toString());
      firstParams.append('page', '1');
      // Use a large page size to reduce number of requests while being safe
      firstParams.append('limit', '200');

      const firstResp = await axios.get(`${Base_url}/apis/invoice/get?${firstParams.toString()}`);
      const firstData: RawTransaction[] = firstResp?.data?.data || [];
      const meta = firstResp?.data || {};
      const totalPages: number = meta.totalPages || 1;
      const limit: number = meta.limit || 200;

      const allRaw: RawTransaction[] = [...firstData];

      // Fetch remaining pages if any
      const requests: Promise<any>[] = [];
      for (let page = 2; page <= totalPages; page++) {
        const pageParams = new URLSearchParams(baseParams.toString());
        pageParams.append('page', String(page));
        pageParams.append('limit', String(limit));
        requests.push(axios.get(`${Base_url}/apis/invoice/get?${pageParams.toString()}`));
      }
      const responses = await Promise.all(requests);
      for (const res of responses) {
        const dataChunk: RawTransaction[] = res?.data?.data || [];
        allRaw.push(...dataChunk);
      }

      // Apply same frontend date filtering safeguards
      let filteredData: RawTransaction[] = allRaw;
      if (filters.startDate && filters.endDate && filters.startDate.isSame(filters.endDate, 'day')) {
        const selectedDate = filters.startDate.format('YYYY-MM-DD');
        filteredData = allRaw.filter((t) => moment(effectiveInvoiceDate(t)).format('YYYY-MM-DD') === selectedDate);
      } else if (filters.startDate && filters.endDate) {
        const startDate = filters.startDate.format('YYYY-MM-DD');
        const endDate = filters.endDate.format('YYYY-MM-DD');
        filteredData = allRaw.filter((t) => {
          const txDate = moment(effectiveInvoiceDate(t)).format('YYYY-MM-DD');
          return txDate >= startDate && txDate <= endDate;
        });
      }

      // Transform for export similar to table
      const transformed = filteredData.map((transaction: RawTransaction) => {
        const { doctorShare, hospitalShare } = sumInvoiceDoctorHospitalShare(transaction);
        const refund = Array.isArray(transaction.payment)
          ? transaction.payment.reduce((sum: number, p: any) => {
              const v = Number(p?.paid) || 0;
              return v < 0 ? sum + Math.abs(v) : sum;
            }, 0)
          : 0;
        return {
          invoiceNo: transaction.invoiceNo,
          date: effectiveInvoiceDate(transaction),
          patientMR: transaction.patientId?.mr || 'N/A',
          patientName: transaction.patientId?.name || 'N/A',
          patientPhone: transaction.patientId?.phone || 'N/A',
          doctor: transaction.doctorId?.name || 'N/A',
          department: transaction.doctorId?.departmentId?.name || transaction.departmentData?.name || 'N/A',
          items: (transaction.item || []).map((i) => i.description).join(', '),
          subTotal: transaction.subTotalBill || 0,
          discount: transaction.discountBill || 0,
          tax: transaction.taxBill || 0,
          total: transaction.totalBill || 0,
          paid: transaction.totalPay || 0,
          due: transaction.duePay || 0,
          refund,
          doctorShare,
          hospitalShare,
          paymentMode: transaction.payment?.[0]?.method || 'N/A',
        };
      });

      const exportData = transformed.map((t) => ({
        'INVOICE #': t.invoiceNo,
        'DATE': moment(t.date).format('DD/MM/YYYY HH:mm'),
        'MR#': t.patientMR,
        'PATIENT NAME': t.patientName,
        'PHONE': t.patientPhone,
        'DOCTOR': t.doctor,
        'DEPARTMENT': t.department,
        'ITEMS': t.items,
        'SUBTOTAL': t.subTotal.toLocaleString(),
        'DISCOUNT': t.discount.toLocaleString(),
        'TAX': t.tax.toLocaleString(),
        'TOTAL': t.total.toLocaleString(),
        'PAID': t.paid.toLocaleString(),
        'REFUND': t.refund.toLocaleString(),
        'DUE': t.due.toLocaleString(),
        'DOCTOR SHARE': t.doctorShare.toLocaleString(),
        'HOSPITAL SHARE': t.hospitalShare.toLocaleString(),
        'PAYMENT MODE': t.paymentMode,
        'Status': t.paid >= t.total ? 'Paid' : 'Pending',
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Financial Transactions');
      const wscols = columns.map((col) => ({ width: (col.width || 100) / 5 }));
      (ws as any)['!cols'] = wscols;

      // Append totals row at the bottom
      const totals = transformed.reduce(
        (acc, t) => {
          acc.subTotal += t.subTotal;
          acc.discount += t.discount;
          acc.tax += t.tax;
          acc.total += t.total;
          acc.paid += t.paid;
          acc.refund += t.refund;
          acc.due += t.due;
          acc.doctorShare += t.doctorShare;
          acc.hospitalShare += t.hospitalShare;
          return acc;
        },
        {
          subTotal: 0,
          discount: 0,
          tax: 0,
          total: 0,
          paid: 0,
          refund: 0,
          due: 0,
          doctorShare: 0,
          hospitalShare: 0,
        }
      );

      // Add an empty row then the totals row
      XLSX.utils.sheet_add_json(ws, [{} as any], { skipHeader: true, origin: -1 });
      XLSX.utils.sheet_add_json(
        ws,
        [
          {
            'INVOICE #': 'TOTAL',
            'DATE': '',
            'MR#': '',
            'PATIENT NAME': '',
            'PHONE': '',
            'DOCTOR': '',
            'DEPARTMENT': '',
            'ITEMS': '',
            'SUBTOTAL': totals.subTotal.toLocaleString(),
            'DISCOUNT': totals.discount.toLocaleString(),
            'TAX': totals.tax.toLocaleString(),
            'TOTAL': totals.total.toLocaleString(),
            'PAID': totals.paid.toLocaleString(),
            'REFUND': totals.refund.toLocaleString(),
            'DUE': totals.due.toLocaleString(),
            'DOCTOR SHARE': totals.doctorShare.toLocaleString(),
            'HOSPITAL SHARE': totals.hospitalShare.toLocaleString(),
            'PAYMENT MODE': '',
            'Status': '',
          },
        ],
        { skipHeader: true, origin: -1 }
      );
      XLSX.writeFile(wb, `Financial_Report_${moment().format('YYYYMMDD_HHmmss')}.xlsx`);
      message.success(`Exported ${exportData.length} records to Excel`);
    } catch (e) {
      console.error('Export error:', e);
      message.error('Failed to export all records');
    } finally {
      setExporting(false);
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

  // Async patient search (MR / name / phone) – same behaviour as invoices list
  const loadPatientOptions: LoadOptions<PatientOption, any, { page: number }> = async (
    searchQuery,
    _loadedOptions,
    additional,
  ) => {
    const page = additional?.page ?? 1;
    const limit = 20;

    const res = await axios.get(`${Base_url}/apis/patient/get`, {
      params: {
        page,
        limit,
        ...(searchQuery ? { search: searchQuery } : {}),
      },
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
  const parsePayDateToTsWithFallback = (payDate: any, fallbackDateTime: any) => {
    if (!payDate) return null;
    if (
      typeof payDate === 'string' &&
      /^\d{4}-\d{2}-\d{2}T00:00:00(\.000)?Z$/.test(payDate)
    ) {
      return parsePayDateToTsWithFallback(payDate.slice(0, 10), fallbackDateTime);
    }
    if (typeof payDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(payDate)) {
      const baseTs = parsePayDateToTs(payDate);
      if (!baseTs) return baseTs;
      const fb = dayjs(fallbackDateTime);
      if (!fb.isValid()) return baseTs;
      const base = dayjs(baseTs);
      return base
        .hour(fb.hour())
        .minute(fb.minute())
        .second(fb.second())
        .millisecond(fb.millisecond())
        .valueOf();
    }
    return parsePayDateToTs(payDate);
  };
  const fetchTransactions = async (page = 1, pageSize = 20, retryCount = 0) => {
    setLoading(true);
    try {
      // Add validation
      if (filters.minAmount && filters.maxAmount) {
        if (parseFloat(filters.minAmount) > parseFloat(filters.maxAmount)) {
          message.error('Min amount cannot be greater than Max amount');
          setLoading(false);
          return;
        }
      }
  
      // Build query parameters properly
      const queryParams = new URLSearchParams();
      
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
      if (filters.patientName) queryParams.append('patientName', filters.patientName);
      if (filters.patientPhone) queryParams.append('patientPhone', filters.patientPhone);
      if (filters.invoiceNumber) queryParams.append('invoiceNo', filters.invoiceNumber);
      if (filters.search) queryParams.append('search', filters.search);

      // Amount range: decide which field to filter (default = Paid)
      const amountField = filters.amountField || 'paid';
      if (filters.minAmount) {
        const min = Number(filters.minAmount);
        if (Number.isFinite(min)) {
          if (amountField === 'total') queryParams.append('minTotalBill', String(min));
          else if (amountField === 'discount') queryParams.append('minDiscountBill', String(min));
          else if (amountField === 'due') queryParams.append('minDue', String(min));
          else if (amountField === 'advance') queryParams.append('minAdvance', String(min));
          else if (amountField === 'refund') { /* frontend filter only */ }
          else queryParams.append('minPaid', String(min));
        }
      }
      if (filters.maxAmount) {
        const max = Number(filters.maxAmount);
        if (Number.isFinite(max)) {
          if (amountField === 'total') queryParams.append('maxTotalBill', String(max));
          else if (amountField === 'discount') queryParams.append('maxDiscountBill', String(max));
          else if (amountField === 'due') queryParams.append('maxDue', String(max));
          else if (amountField === 'advance') queryParams.append('maxAdvance', String(max));
          else if (amountField === 'refund') { /* frontend filter only */ }
          else queryParams.append('maxPaid', String(max));
        }
      }
      if (filters.procedure) queryParams.append('procedureId', filters.procedure);
      if (filters.paymentMode) queryParams.append('paymentMode', filters.paymentMode);
      if (filters.paymentDateStart) queryParams.append('paymentDateStart', filters.paymentDateStart);
      if (filters.paymentDateEnd) queryParams.append('paymentDateEnd', filters.paymentDateEnd);
      
      // Add pagination parameters
      queryParams.append('page', page.toString());
      queryParams.append('limit', pageSize.toString());
  
      // Add debug logs
      console.log('Frontend Filters:', filters);
      console.log('API URL:', `${Base_url}/apis/invoice/get?${queryParams.toString()}`);
  
      const response = await axios.get(
        `${Base_url}/apis/invoice/get?${queryParams.toString()}`,
      );
  
      const data = response?.data?.data || [];
      const paginationData = response?.data || {};
      console.log('API Response Data:', data);
      console.log('Full API Response:', response.data);
      
      // Check if same date was selected and no data found
      if (filters.startDate && filters.endDate && filters.startDate.isSame(filters.endDate, 'day') && data.length === 0) {
        message.info(`No transactions found for ${filters.startDate.format('DD/MM/YYYY')}`);
      }

      // Additional frontend filtering for exact date match when same date is selected
      let filteredData = data;
      let shouldShowNoDataMessage = false;
      
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
        date: effectiveInvoiceDate(item),
        formattedDate: moment(effectiveInvoiceDate(item)).format('YYYY-MM-DD')
      })));
      
      if (filters.startDate && filters.endDate && filters.startDate.isSame(filters.endDate, 'day')) {
        const selectedDate = filters.startDate.format('YYYY-MM-DD');
        filteredData = data.filter((transaction: RawTransaction) => {
          const transactionDate = moment(effectiveInvoiceDate(transaction)).format('YYYY-MM-DD');
          return transactionDate === selectedDate;
        });
        
        console.log('Filtered data for same day:', filteredData.map(item => ({
          invoiceNo: item.invoiceNo,
          date: effectiveInvoiceDate(item),
          formattedDate: moment(effectiveInvoiceDate(item)).format('YYYY-MM-DD')
        })));
        
        // If no data matches the exact date, show message and set empty data
        if (filteredData.length === 0) {
          shouldShowNoDataMessage = true;
          if (data.length > 0) {
            message.warning(`No transactions found for ${filters.startDate.format('DD/MM/YYYY')}. Backend returned data from other dates.`);
          } else {
            message.info(`No transactions found for ${filters.startDate.format('DD/MM/YYYY')}`);
          }
        }
      } else if (filters.startDate && filters.endDate) {
        // For date ranges, also apply frontend filtering to ensure data is within range
        const startDate = filters.startDate.format('YYYY-MM-DD');
        const endDate = filters.endDate.format('YYYY-MM-DD');
        
        filteredData = data.filter((transaction: RawTransaction) => {
          const transactionDate = moment(effectiveInvoiceDate(transaction)).format('YYYY-MM-DD');
          return transactionDate >= startDate && transactionDate <= endDate;
        });
        
        console.log('Filtered data for date range:', filteredData.map(item => ({
          invoiceNo: item.invoiceNo,
          date: effectiveInvoiceDate(item),
          formattedDate: moment(effectiveInvoiceDate(item)).format('YYYY-MM-DD')
        })));
        
        // If filtered data is different from original data, show warning
        if (filteredData.length !== data.length) {
          message.warning(`Backend returned ${data.length} records but only ${filteredData.length} are within the selected date range.`);
        }
      }

      if (filters.paymentDateStart || filters.paymentDateEnd) {
        filteredData = filteredData.filter((t: RawTransaction) => {
          const paymentTimestamps =
            t.payment?.map((p: any) => parsePayDateToTs(p?.payDate)).filter((v: any) => typeof v === 'number') || [];
          if (paymentTimestamps.length === 0) return false;

          const paymentDateStrs = paymentTimestamps.map((ts: number) => dayjs(ts).format('YYYY-MM-DD'));
          const start = filters.paymentDateStart || null;
          const end = filters.paymentDateEnd || null;

          if (start && end) {
            return paymentDateStrs.some((d: string) => d >= start && d <= end);
          } else if (start) {
            return paymentDateStrs.some((d: string) => d >= start);
          } else if (end) {
            return paymentDateStrs.some((d: string) => d <= end);
          }
          return true;
        });
      }
      
      if (filters.discountPercent) {
        const threshold = Number(filters.discountPercent);
        if (Number.isFinite(threshold)) {
          filteredData = filteredData.filter((t: RawTransaction) => {
            const total = Number(t.totalBill) || 0;
            const discount = Number(t.discountBill) || 0;
            const pct = total > 0 ? (discount / total) * 100 : 0;
            return pct >= threshold;
          });
        }
      }

      const transformedData = filteredData.map((transaction: RawTransaction) => {
        // Add debug log
        console.log('Transaction department data:', {
          doctorDept: transaction.doctorId?.departmentId?.name,
          directDept: transaction.departmentData?.name,
          fullTransaction: transaction
        });
        
        const { doctorShare, hospitalShare } = sumInvoiceDoctorHospitalShare(transaction);
        const paymentEntries = Array.isArray(transaction.payment) ? transaction.payment : [];
        const paymentEntriesWithTs = paymentEntries
          .map((p: any) => ({
            payDate: p?.payDate,
            ts: parsePayDateToTsWithFallback(
              p?.payDate,
              p?.createdAt || p?.updatedAt || (transaction as any).updatedAt || (transaction as any).createdAt
            ),
          }))
          .filter((p: any) => typeof p.ts === 'number');
        const latestPayment = paymentEntriesWithTs.length
          ? paymentEntriesWithTs.reduce((acc: any, cur: any) => (cur.ts > acc.ts ? cur : acc))
          : null;
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
          const matched = paymentEntriesWithTs.filter((p: any) => inRange(p.ts));
          if (matched.length > 0) {
            selectedPayment = matched.reduce((acc: any, cur: any) => (cur.ts > acc.ts ? cur : acc));
          }
        }
  
        return {
          key: transaction._id,
          _id: transaction._id,
          invoiceNo: transaction.invoiceNo,
          date: effectiveInvoiceDate(transaction),
          patientId: transaction.patientId,
          patientMR: transaction.patientId?.mr || 'N/A',
          patientName: transaction.patientId?.name || 'N/A',
          patientPhone: transaction.patientId?.phone || 'N/A',
          doctor: transaction.doctorId?.name || 'N/A',
          department: transaction.doctorId?.departmentId?.name || transaction.departmentData?.name || 'N/A',
          items: transaction.item.map((i) => i.description).join(', '),
          item: transaction.item,
          branchId: transaction.branchId,
          subTotal: transaction.subTotalBill || 0,
          discount: transaction.discountBill || 0,
          tax: transaction.taxBill || 0,
          total: transaction.totalBill || 0,
          paid: transaction.totalPay || 0,
          due: transaction.duePay || 0,
          refund: (Array.isArray(transaction.payment)
            ? transaction.payment.reduce((sum: number, p: any) => {
                const v = Number(p?.paid) || 0;
                return v < 0 ? sum + Math.abs(v) : sum;
              }, 0)
            : 0),
          advance: (() => {
            const rawDue = Number(transaction.duePay) || 0;
            const adv = Number((transaction as any).advancePay) || 0;
            return adv > 0 ? adv : rawDue < 0 ? Math.abs(rawDue) : 0;
          })(),
          doctorShare,
          hospitalShare,
          paymentMode: transaction.payment?.[0]?.method || 'N/A',
          paymentDate: selectedPayment?.payDate || latestPayment?.payDate || null,
          paymentDateTs: selectedPayment?.ts || latestPayment?.ts || null,
          status: (() => {
            const adv = Number((transaction as any).advancePay) || 0;
            const due = Number(transaction.duePay) || 0;
            if (adv > 0 || due < 0) return 'Advance';
            if (due === 0) return 'Paid';
            return 'Pending';
          })(),
        };
      });
  
      let finalData = transformedData;
      if (filters.minAmount) {
        const min = Number(filters.minAmount);
        if (Number.isFinite(min)) {
          finalData = finalData.filter((t) => {
            const value =
              amountField === 'total'
                ? t.total
                : amountField === 'discount'
                ? t.discount
                : amountField === 'due'
                ? t.due
                : amountField === 'advance'
                ? t.advance
                : amountField === 'refund'
                ? t.refund
                : t.paid;
            return Number(value) >= min;
          });
        }
      }
      if (filters.maxAmount) {
        const max = Number(filters.maxAmount);
        if (Number.isFinite(max)) {
          finalData = finalData.filter((t) => {
            const value =
              amountField === 'total'
                ? t.total
                : amountField === 'discount'
                ? t.discount
                : amountField === 'due'
                ? t.due
                : amountField === 'advance'
                ? t.advance
                : amountField === 'refund'
                ? t.refund
                : t.paid;
            return Number(value) <= max;
          });
        }
      }
      if (filters.minAmount || filters.maxAmount) {
        finalData = [...finalData].sort((a, b) => {
          const getValue = (x: any) =>
            amountField === 'total'
              ? x.total
              : amountField === 'discount'
              ? x.discount
              : amountField === 'due'
              ? x.due
              : amountField === 'advance'
              ? x.advance
              : amountField === 'refund'
              ? x.refund
              : x.paid;
          return Number(getValue(a)) - Number(getValue(b));
        });
      }
      if (filters.quickPayment === 'paid') {
        finalData = finalData.filter((t) => Number(t.paid) > 0);
      } else if (filters.quickPayment === 'due') {
        finalData = finalData.filter((t) => Number(t.due) > 0);
      } else if (filters.quickPayment === 'advance') {
        finalData = finalData.filter((t) => Number(t.advance) > 0);
      }
  
      setTransactions(finalData);
      setFilteredTransactions(finalData);
      
      // Update pagination state with debug logging
      console.log('Pagination data from API:', paginationData);
      
      // Handle the case where API returns empty data but has pagination info
      const totalCount = paginationData.count || 0;
      const totalPages = paginationData.totalPages || 0;
      const currentPage = paginationData.currentPage || 1;
      const limit = paginationData.limit || 20;
      
      // If we have pagination info but no data, it might be a backend issue
      if (totalCount > 0 && data.length === 0) {
        console.warn('API returned pagination info but no data. This might indicate a backend issue.');
        console.log('Debug info:', {
          totalCount,
          dataLength: data.length,
          currentPage,
          totalPages,
          limit,
          queryParams: queryParams.toString()
        });
        
        // Try to fetch the first page if we're not already on it and haven't retried too many times
        if (currentPage > 1 && retryCount < 2) {
          console.log('Attempting to fetch first page as fallback...');
          message.warning('No data found on current page. Trying first page...');
          // Retry with page 1
          setTimeout(() => {
            fetchTransactions(1, pageSize, retryCount + 1);
          }, 1000);
          return;
        } else if (retryCount >= 2) {
          message.error('Unable to fetch data after multiple attempts. Please refresh the page.');
        } else {
          message.warning('Data not available for the current page. Please try refreshing or contact support.');
        }
      }
      
      const newPagination = {
        current: currentPage,
        pageSize: limit,
        total: shouldShowNoDataMessage ? 0 : totalCount,
        totalPages: shouldShowNoDataMessage ? 0 : totalPages
      };
      console.log('Setting pagination state to:', newPagination);
      setPagination(newPagination);
    } catch (err) {
      message.error('Failed to fetch transactions');
      console.error('Transaction fetch error:', err);
    } finally {
      setLoading(false);
    }
  };
  const openDeleteModal = (record: TransformedTransaction) => {
    setDeleteTarget(record);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await axios.delete(`${Base_url}/apis/invoice/delete/${deleteTarget._id}`);
      message.success('Invoice deleted successfully');
      setDeleteModalOpen(false);
      setDeleteTarget(null);
      fetchTransactions(pagination.current, pagination.pageSize, 0);
    } catch (err) {
      const anyErr = err as { response?: { data?: { message?: string; error?: string } } };
      const detail =
        anyErr?.response?.data?.message ||
        anyErr?.response?.data?.error ||
        (err instanceof Error ? err.message : null);
      message.error(detail ? `Failed to delete invoice: ${detail}` : 'Failed to delete invoice');
    }
  };
  useEffect(() => {
    fetchDepartments();
    fetchDoctors();
    fetchProcedures();
  }, [branchEpoch]);

  // Fetch transactions + summary when filters change
  useEffect(() => {
    if (departments.length > 0 && doctors.length > 0 && procedures.length > 0) {
      fetchTransactions(1, pagination.pageSize, 0);
      fetchSummaryData();
    }
  }, [filters, departments, doctors, procedures, branchEpoch]);

  // Reset to first page when filters change
  useEffect(() => {
    if (pagination.current !== 1) {
      setPagination(prev => ({ ...prev, current: 1 }));
    }
  }, [filters]);

  // Handle empty data with pagination info
  useEffect(() => {
    if (pagination.total > 0 && filteredTransactions.length === 0 && pagination.current > 1) {
      console.log('Empty data detected on page > 1, resetting to page 1');
      setPagination(prev => ({ ...prev, current: 1 }));
      fetchTransactions(1, pagination.pageSize);
    }
  }, [filteredTransactions.length, pagination.total, pagination.current]);

  // State for summary data - ALL calculated on BACKEND, not frontend!
  const [summaryData, setSummaryData] = useState({
    totalRevenue: 0,
    totalTax: 0,
    totalDiscount: 0,
    totalPaid: 0,
    totalDue: 0,
    totalDoctorShare: 0,
    totalHospitalShare: 0,
    transactionCount: 0,
  });

  const buildSummaryQueryParams = () => {
    const queryParams = new URLSearchParams();

    if (filters.doctor) queryParams.append('doctorId', filters.doctor);
    if (filters.department) queryParams.append('departmentId', filters.department);

    if (filters.startDate && filters.endDate) {
      const startDate = filters.startDate.clone();
      const endDate = filters.endDate.clone();

      if (startDate.isSame(endDate, 'day')) {
        queryParams.append('startDate', startDate.clone().startOf('day').toISOString());
        queryParams.append('endDate', startDate.clone().endOf('day').toISOString());
      } else {
        queryParams.append('startDate', startDate.clone().startOf('day').toISOString());
        queryParams.append('endDate', endDate.clone().endOf('day').toISOString());
      }
    }

    if (filters.patientMR) queryParams.append('patientMR', filters.patientMR);
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.patientName) queryParams.append('patientName', filters.patientName);
    if (filters.patientPhone) queryParams.append('patientPhone', filters.patientPhone);
    if (filters.invoiceNumber) queryParams.append('invoiceNo', filters.invoiceNumber);
    if (filters.search) queryParams.append('search', filters.search);

    // Amount range for summary – same mapping as in fetchTransactions
    const amountField = filters.amountField || 'paid';
    if (filters.minAmount) {
      const min = Number(filters.minAmount);
      if (Number.isFinite(min)) {
        if (amountField === 'total') queryParams.append('minTotalBill', String(min));
        else if (amountField === 'discount') queryParams.append('minDiscountBill', String(min));
        else if (amountField === 'due') queryParams.append('minDue', String(min));
        else if (amountField === 'advance') queryParams.append('minAdvance', String(min));
        else queryParams.append('minPaid', String(min)); // default = paid
      }
    }
    if (filters.maxAmount) {
      const max = Number(filters.maxAmount);
      if (Number.isFinite(max)) {
        if (amountField === 'total') queryParams.append('maxTotalBill', String(max));
        else if (amountField === 'discount') queryParams.append('maxDiscountBill', String(max));
        else if (amountField === 'due') queryParams.append('maxDue', String(max));
        else if (amountField === 'advance') queryParams.append('maxAdvance', String(max));
        else queryParams.append('maxPaid', String(max)); // default = paid
      }
    }

    if (filters.procedure) queryParams.append('procedureId', filters.procedure);
    if (filters.paymentMode) queryParams.append('paymentMode', filters.paymentMode);
    if (filters.paymentDateStart) queryParams.append('paymentDateStart', filters.paymentDateStart);
    if (filters.paymentDateEnd) queryParams.append('paymentDateEnd', filters.paymentDateEnd);

    return queryParams;
  };

  // Fetch summary from invoice list (frontend computed) so it always matches invoiceDate filtering.
  const fetchSummaryData = async () => {
    try {
      const queryParams = buildSummaryQueryParams();
      // IMPORTANT: remove start/end from backend query because backend may apply createdAt.
      // We apply invoiceDate/date/createdAt date filtering on frontend for exact parity.
      const baseFetchParams = new URLSearchParams(queryParams.toString());
      baseFetchParams.delete('startDate');
      baseFetchParams.delete('endDate');

      const firstParams = new URLSearchParams(baseFetchParams.toString());
      firstParams.set('page', '1');
      firstParams.set('limit', '200');
      const firstResp = await axios.get(`${Base_url}/apis/invoice/get?${firstParams.toString()}`);
      const firstData: RawTransaction[] = firstResp?.data?.data || [];
      const totalPages: number = firstResp?.data?.totalPages || 1;
      const limit: number = firstResp?.data?.limit || 200;

      const allRaw: RawTransaction[] = [...firstData];
      const requests: Promise<any>[] = [];
      for (let page = 2; page <= totalPages; page++) {
        const p = new URLSearchParams(baseFetchParams.toString());
        p.set('page', String(page));
        p.set('limit', String(limit));
        requests.push(axios.get(`${Base_url}/apis/invoice/get?${p.toString()}`));
      }
      const responses = await Promise.all(requests);
      for (const res of responses) {
        const dataChunk: RawTransaction[] = res?.data?.data || [];
        allRaw.push(...dataChunk);
      }

      let filtered = allRaw;
      if (filters.startDate && filters.endDate && filters.startDate.isSame(filters.endDate, 'day')) {
        const selectedDate = filters.startDate.format('YYYY-MM-DD');
        filtered = allRaw.filter((t) => moment(effectiveInvoiceDate(t)).format('YYYY-MM-DD') === selectedDate);
      } else if (filters.startDate && filters.endDate) {
        const start = filters.startDate.format('YYYY-MM-DD');
        const end = filters.endDate.format('YYYY-MM-DD');
        filtered = allRaw.filter((t) => {
          const txDate = moment(effectiveInvoiceDate(t)).format('YYYY-MM-DD');
          return txDate >= start && txDate <= end;
        });
      }

      const computed = filtered.reduce(
        (acc, t) => {
          const { doctorShare, hospitalShare } = sumInvoiceDoctorHospitalShare(t);
          acc.totalRevenue += Number(t.totalBill) || 0;
          acc.totalTax += Number(t.taxBill) || 0;
          acc.totalDiscount += Number(t.discountBill) || 0;
          acc.totalPaid += Number(t.totalPay) || 0;
          acc.totalDue += Number(t.duePay) || 0;
          acc.totalDoctorShare += doctorShare;
          acc.totalHospitalShare += hospitalShare;
          acc.transactionCount += 1;
          return acc;
        },
        {
          totalRevenue: 0,
          totalTax: 0,
          totalDiscount: 0,
          totalPaid: 0,
          totalDue: 0,
          totalDoctorShare: 0,
          totalHospitalShare: 0,
          transactionCount: 0,
        },
      );
      setSummaryData(computed);
    } catch (error: any) {
      console.error('❌ Error fetching summary from backend:', error);
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // Set empty summary on error
      setSummaryData({
        totalRevenue: 0,
        totalTax: 0,
        totalDiscount: 0,
        totalPaid: 0,
        totalDue: 0,
        totalDoctorShare: 0,
        totalHospitalShare: 0,
        transactionCount: 0,
      });
      
      if (error.response?.status === 404) {
        message.error('Summary API not found. Please restart the backend server.');
      }
    }
  };

  // Summary must represent full filtered dataset (all pages), not current table page.
  const summary = summaryData;

  // Handle pagination change
  const handleTableChange = (paginationInfo: any) => {
    const { current, pageSize } = paginationInfo;
    console.log('Pagination change requested:', { current, pageSize, currentPagination: pagination });
    
    // Update pagination state first
    setPagination(prev => ({
      ...prev,
      current,
      pageSize
    }));
    
    // Fetch data for the new page
    fetchTransactions(current, pageSize, 0);
  };

 // Then when you want to generate the PDF, use:


 const InvoicePdf = ({ invoice }) => {
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

  const patient = invoice.patientId || {};
  const doctor = invoice.doctorId || {};
  const items = invoice.item || [];
  const header = getInvoiceHeaderForPdf(invoice);

  console.log(invoice);
  

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
            <Text>{invoice.invoiceNo || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date:</Text>
            <Text>{moment(invoice.date || invoice.createdAt).format('DD/MM/YYYY h:mm A')}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Patient:</Text>
            <Text>{patient.name || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>MR #:</Text>
            <Text>{patient.mr || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Doctor:</Text>
            <Text>{doctor.name || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={styles.descriptionColumn}>Description</Text>
          <Text style={styles.rateColumn}>Rate</Text>
          <Text style={styles.quantityColumn}>Qty</Text>
          <Text style={styles.amountColumn}>Amount</Text>
          <Text style={styles.discountColumn}>Discount</Text>
        </View>

        {items.map((item, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={styles.descriptionColumn}>{item.description || 'N/A'}</Text>
            <Text style={styles.rateColumn}>{item.rate?.toFixed(2) || '0.00'}</Text>
            <Text style={styles.quantityColumn}>{item.quantity || '0'}</Text>
            <Text style={styles.amountColumn}>{item.amount?.toFixed(2) || '0.00'}</Text>
            <Text style={styles.discountColumn}>{item.discount?.toFixed(2) || '0.00'}</Text>
          </View>
        ))}

        <View style={styles.totalsContainer}>
          <View style={styles.totalRow}>
            <Text style={{fontSize:12}}>Sub Total:</Text>
            <Text style={{fontSize:12}}>Rs. {invoice.subTotal?.toFixed(2) || '0.00'}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={{fontSize:12}}>Discount:</Text>
            <Text style={{fontSize:12}}>Rs. {invoice.discountBill?.toFixed(2) || '0.00'}</Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text style={{fontSize:12}}>Grand Total:</Text>
            <Text style={{fontSize:12}}>Rs. {invoice.totalBill?.toFixed(2) || '0.00'}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={{fontSize:12}}>Amount Paid:</Text>
            <Text style={{fontSize:12}}>Rs. {invoice.totalPay?.toFixed(2) || '0.00'}</Text>
          </View>
          <View style={[styles.totalRow, {marginTop: 5}]}>
            <Text style={{fontSize:12}}>Balance Due:</Text>
            <Text style={{fontSize:12}}>Rs. {invoice.duePay?.toFixed(2) || '0.00'}</Text>
          </View>
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
 


  const dateRangePresets = [
    {
      label: 'Today',
      value: [dayjs().startOf('day'), dayjs().endOf('day')],
    },
    {
      label: 'Yesterday',
      value: [dayjs().subtract(1, 'day').startOf('day'), dayjs().subtract(1, 'day').endOf('day')],
    },
    {
      label: 'This Week',
      value: [dayjs().startOf('week').startOf('day'), dayjs().endOf('week').endOf('day')],
    },
    {
      label: 'Last Week',
      value: [dayjs().subtract(1, 'week').startOf('week').startOf('day'), dayjs().subtract(1, 'week').endOf('week').endOf('day')],
    },
    {
      label: 'This Month',
      value: [dayjs().startOf('month').startOf('day'), dayjs().endOf('month').endOf('day')],
    },
    {
      label: 'Last Month',
      value: [dayjs().subtract(1, 'month').startOf('month').startOf('day'), dayjs().subtract(1, 'month').endOf('month').endOf('day')],
    },
  ] satisfies Array<{ label: string; value: [Dayjs, Dayjs] }>;

  const disabledDate = (current: Dayjs) => current && current > dayjs().endOf('day');
  useEffect(() => {
    try {
      const raw = localStorage.getItem('financialReportFilters');
      if (!raw) return;
      const saved = JSON.parse(raw);
      const startDate = saved.startDate ? moment(saved.startDate) : undefined;
      const endDate = saved.endDate ? moment(saved.endDate) : undefined;
      const dateRange = startDate && endDate ? [startDate, endDate] : undefined;
      setFilters((prev) => ({
        ...prev,
        ...saved,
        startDate: startDate || prev.startDate,
        endDate: endDate || prev.endDate,
        dateRange: dateRange || prev.dateRange,
      }));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const payload = {
        ...filters,
        startDate: filters.startDate ? filters.startDate.toISOString() : '',
        endDate: filters.endDate ? filters.endDate.toISOString() : '',
        paymentDateStart: filters.paymentDateStart || '',
        paymentDateEnd: filters.paymentDateEnd || '',
      };
      localStorage.setItem('financialReportFilters', JSON.stringify(payload));
    } catch {}
  }, [filters]);

const generatePdf = async (invoice) => {

  console.log(invoice?.item,'dfdfdfdfdfdfdfdfdfd');
  
  try {
    const completeInvoice = {
      ...invoice,
       patientId: invoice.patientId || {
        mr: invoice.patientMR,
        name: invoice.patientName,
        phone: invoice.patientPhone
      },
      doctorId: invoice.doctorId || {
        name: invoice.doctor,
        departmentId: invoice.departmentId
      },
      subTotalBill: invoice.subTotalBill || invoice.subTotal,
      discountBill: invoice.discountBill || invoice.discount,
      taxBill: invoice.taxBill || invoice.tax,
      totalBill: invoice.totalBill || invoice.total,
      totalPay: invoice.totalPay || invoice.paid,
      duePay: invoice.duePay || invoice.due,
      item: invoice.item,
      payment: invoice.payment || [{ method: invoice.paymentMode }]
    
    };

    const forPdf = await enrichInvoiceForPdf(completeInvoice);

    // Create a new blob with the PDF
    const blob = await pdf(<InvoicePdf invoice={forPdf} />).toBlob();
    
    // Create a URL for the blob
    const pdfUrl = URL.createObjectURL(blob);
    
    // Open the PDF in a new tab
    const newWindow = window.open(pdfUrl, '_blank');
    
    // Ensure the window is not blocked by popup blockers
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      // If popup is blocked, offer download instead
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `Invoice_${invoice.invoiceNo || invoice._id.substring(0, 6)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    
    // Clean up the URL after 1 second
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
      title: 'INVOICE #',
      dataIndex: 'invoiceNo',
      key: 'invoiceNo',
      width: 120,
      fixed: 'left',
      sorter: (a, b) => String(a.invoiceNo || '').localeCompare(String(b.invoiceNo || '')),
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: 'DATE',
      dataIndex: 'date',
      key: 'date',
      render: (date) => moment(date).utc().format('DD/MM/YYYY HH:mm'),
          exportRender: (record) => moment(record.date).format('DD/MM/YYYY HH:mm'),

      width: 150,
      sorter: (a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf(),
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
      title: 'ITEMS',
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
      title: 'REFUND',
      dataIndex: 'refund',
      key: 'refund',
      width: 100,
      render: (value) => value.toLocaleString(),
      sorter: (a, b) => Number(a.refund) - Number(b.refund),
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
      title: 'DOCTOR SHARE',
      dataIndex: 'doctorShare',
      key: 'doctorShare',
      width: 120,
      render: (value) => value.toLocaleString(),
      sorter: (a, b) => Number(a.doctorShare) - Number(b.doctorShare),
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: 'HOSPITAL SHARE',
      dataIndex: 'hospitalShare',
      key: 'hospitalShare',
      width: 120,
      render: (value) => value.toLocaleString(),
      sorter: (a, b) => Number(a.hospitalShare) - Number(b.hospitalShare),
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
    // Calculate status based on duePay and totalPay
    const status = record.status || (record.paid >= record.total ? 'Paid' : 'Pending');
    return (
      <span 
        style={{
          color: status === 'Paid' ? '#52c41a' : status === 'Advance' ? '#1890ff' : '#f5222d',
          backgroundColor: status === 'Paid' ? '#f6ffed' : status === 'Advance' ? '#e6f7ff' : '#fff1f0',
          padding: '4px 8px',
          borderRadius: '4px',
          display: 'inline-block',
          border: `1px solid ${status === 'Paid' ? '#b7eb8f' : status === 'Advance' ? '#91d5ff' : '#ffa39e'}`
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
        onClick={() => openDeleteModal(record)} 
        style={{ cursor: 'pointer' }}
      />
    </div>
  ),
  width: 120,
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
            onClick={exportAllToExcel}
            loading={exporting}
            className="flex items-center"
          >
            {exporting ? 'Exporting…' : 'Export Excel'}
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
                  <Button
                    type="default"
                    onClick={() => {
                      console.log('Debug Info:', {
                        pagination,
                        transactionsCount: transactions.length,
                        filteredTransactionsCount: filteredTransactions.length,
                        filters,
                        loading
                      });
                      message.info('Check console for debug info');
                    }}
                    className="flex items-center"
                  >
                    Debug
                  </Button>
                </div>

              
              </div>
  <div className='flex gap-2 mb-4'>
                  <Link to={'/financial/financial-report'} className=' px-2 py-1 border-b-2 border-primary    text-primary   hover:bg-gray transition-colors'>
                    Transaction

                  </Link>
                  <Link to={'/financial/profit-loss-details'} className=' px-2 py-1    text-black rounded hover:bg-gray-100 transition-colors'>
                    Profit/Loss Details
                    
                  </Link>
                </div>
              {/* Summary Section - Modern UI */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {(() => {
                      const hasStart = Boolean(filters.startDate) && typeof (filters.startDate as any).format === 'function';
                      const hasEnd = Boolean(filters.endDate) && typeof (filters.endDate as any).format === 'function';
                      const startLabel = hasStart ? (filters.startDate as any).format('DD/MM/YYYY') : 'All';
                      const endLabel = hasEnd ? (filters.endDate as any).format('DD/MM/YYYY') : 'All';
                      return `Overall Summary (${startLabel} - ${endLabel})`;
                    })()}
                  </h3>
                  
                </div>

                {/* Main Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  {/* Total Revenue */}
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-green-600 font-medium mb-1">Total Revenue</p>
                        <p className="text-2xl font-bold text-green-700">
                          Rs. {summary.totalRevenue.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-green-200 p-3 rounded-full">
                        <svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>

      <Modal
        open={deleteModalOpen}
        onCancel={() => setDeleteModalOpen(false)}
        onOk={confirmDelete}
        okText="Delete"
        okButtonProps={{ danger: true }}
        cancelText="Cancel"
        title="Delete Invoice?"
      >
        <div style={{ display: 'grid', gap: 8 }}>
          <div>Are you sure you want to delete this invoice? This action cannot be undone.</div>
          {/* {deleteTarget && (
            <div style={{ fontSize: 12, color: '#555' }}>
              <div>Invoice No: {deleteTarget.invoiceNo}</div>
              <div>Total: {Number(deleteTarget.total).toFixed(2)}</div>
              <div>Paid: {Number(deleteTarget.paid).toFixed(2)}</div>
              <div>Due: {Number(deleteTarget.due).toFixed(2)}</div>
              <div>Advance: {Number(deleteTarget.advance || 0).toFixed(2)}</div>
            </div>
          )} */}
        </div>
      </Modal>
                  {/* Total Paid */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-blue-600 font-medium mb-1">Total Paid</p>
                        <p className="text-2xl font-bold text-blue-700">
                          Rs. {summary.totalPaid.toLocaleString()}
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
                          Rs. {summary.totalDue.toLocaleString()}
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
                          {summary.transactionCount.toLocaleString()}
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

                {/* Secondary Stats - Beautiful Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Total Tax Card */}
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-5 border border-orange-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-orange-600 mb-2">Total Tax</p>
                        <p className="text-xl font-bold text-orange-700">
                          Rs. {summary.totalTax.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-orange-200 p-2 rounded-full">
                        <svg className="w-5 h-5 text-orange-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Total Discount Card */}
                  <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-5 border border-yellow-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-yellow-600 mb-2">Total Discount</p>
                        <p className="text-xl font-bold text-yellow-700">
                          Rs. {summary.totalDiscount.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-yellow-200 p-2 rounded-full">
                        <svg className="w-5 h-5 text-yellow-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Doctor Share Card */}
                  <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg p-5 border border-teal-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-teal-600 mb-2">Doctor Share</p>
                        <p className="text-xl font-bold text-teal-700">
                          Rs. {summary.totalDoctorShare.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-teal-200 p-2 rounded-full">
                        <svg className="w-5 h-5 text-teal-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Hospital Share Card */}
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-5 border border-indigo-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-indigo-600 mb-2">Hospital Share</p>
                        <p className="text-xl font-bold text-indigo-700">
                          Rs. {summary.totalHospitalShare.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-indigo-200 p-2 rounded-full">
                        <svg className="w-5 h-5 text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Filters Section */}
              <Card title="Filters" className="mb-4">
                <Row gutter={[16, 16]}>
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
                        setFilters((prev) => ({ ...prev, doctor: option?.value || '' }));
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
                      onChange={(value) =>
                        setFilters({ ...filters, paymentMode: value })
                      }
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
                      onChange={(value) =>
                        setFilters({ ...filters, status: value })
                      }
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
                              dateRange: [] as any,
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
                            paymentDateStart: '',
                            paymentDateEnd: '',
                          }));
                        }}
                      />
                    
                    </div>
                  </Col>
   

                  <Col xs={24} sm={12} md={8} lg={6}>
                    <Select
                      placeholder="Amount Type"
                      style={{ width: '100%' }}
                      value={filters.amountField}
                      onChange={(value) =>
                        setFilters((prev) => ({
                          ...prev,
                          amountField: (value as Filters['amountField']) || 'paid',
                        }))
                      }
                    >
                      <Option value="paid">Paid Amount</Option>
                      <Option value="total">Total Amount</Option>
                      <Option value="discount">Discount Amount</Option>
                      <Option value="due">Due Amount</Option>
                      <Option value="advance">Advance Amount</Option>
                      <Option value="refund">Refund Amount</Option>
                    </Select>
                  </Col>

                  {/* <Col xs={24} sm={12} md={8} lg={6}>
                    <Select
                      placeholder="Payment Filter"
                      style={{ width: '100%' }}
                      value={filters.quickPayment}
                      onChange={(value) =>
                        setFilters((prev) => ({
                          ...prev,
                          quickPayment: (value as Filters['quickPayment']) || '',
                        }))
                      }
                      allowClear
                    >
                      <Option value="paid">Paid &gt; 0</Option>
                      <Option value="due">Due &gt; 0</Option>
                      <Option value="advance">Advance &gt; 0</Option>
                    </Select>
                  </Col> */}

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
                            startDate: '' as any,
                            endDate: '' as any,
                            dateRange: [] as any,
                          }));
                        }}
                      />
                      {/* <Button
                        onClick={() =>
                          setFilters((prev) => ({
                            ...prev,
                            paymentDateStart: '',
                            paymentDateEnd: '',
                          }))
                        }
                      >
                        Cancel
                      </Button> */}
                    </div>
                  </Col>


                  <Col xs={24} sm={12} md={8} lg={6}>
                    <Input
                      placeholder="Search by Patient Name"
                      value={filters.patientName}
                      onChange={(e) =>
                        setFilters({ ...filters, patientName: e.target.value })
                      }
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
                        const mr = option?.patientData?.mr || '';
                        setFilters((prev) => ({
                          ...prev,
                          patientMR: mr,
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
                      onChange={(e) => setFilters({ ...filters, patientPhone: e.target.value })}
                      allowClear
                      style={{ color: '#000' }}
                    />
                  </Col>

                  <Col xs={24} sm={12} md={8} lg={6}>
                    <Input
                      placeholder="Search by Invoice Number"
                      value={filters.invoiceNumber}
                      onChange={(e) =>
                        setFilters({ ...filters, invoiceNumber: e.target.value })
                      }
                      allowClear
                      style={{ color: '#000' }}
                    />
                  </Col>

                  <Col xs={24} sm={12} md={8} lg={6}>
                    <Input
                      placeholder="Min Amount"
                      value={filters.minAmount}
                      onChange={(e) =>
                        setFilters({ ...filters, minAmount: e.target.value })
                      }
                      type="number"
                    />
                  </Col>

                  <Col xs={24} sm={12} md={8} lg={6}>
                    <Input
                      placeholder="Max Amount"
                      value={filters.maxAmount}
                      onChange={(e) =>
                        setFilters({ ...filters, maxAmount: e.target.value })
                      }
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
                      onClick={() => fetchTransactions(1, pagination.pageSize)}
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
                          startDate: moment().startOf('month'),
                          endDate: moment().endOf('day'),
                          department: '',
                          paymentMode: '',
                          doctor: '',
                          procedure: '',
                          patientName: '',
                          patientMR: '',
                          patientPhone: '',
                          invoiceNumber: '',
                          status: '',
                          minAmount: '',
                          maxAmount: '',
                          search: '',
                          amountField: 'paid',
                          paymentDateStart: '',
                          paymentDateEnd: '',
                          quickPayment: '',
                          discountPercent: '',
                        });
                        setPagination({
                          current: 1,
                          pageSize: 20,
                          total: 0,
                          totalPages: 0
                        });
                        setSelectedDoctor(null);
                        setSelectedDepartment(null);
                        setSelectedProcedure(null);
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
                dataSource={filteredTransactions}
                loading={loading}
                scroll={{ x: 2000 }}
                pagination={{
                  current: pagination.current,
                  pageSize: pagination.pageSize,
                  total: pagination.total,
                  showSizeChanger: true,
                  showTotal: (total, range) => {
                    console.log('Table pagination info:', { total, range, paginationState: pagination });
                    return `${range[0]}-${range[1]} of ${total} items`;
                  },
                  pageSizeOptions: ['10', '20', '50', '100'],
                  showQuickJumper: true,
                  hideOnSinglePage: false,
                  responsive: true,
                }}
                onChange={handleTableChange}
                bordered
                size="middle"
                locale={{
                  emptyText: 'No transactions found',
                }}
                summary={() => (
                  <Table.Summary fixed>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={8} align="right">
                        <strong>Total</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1}>
                        <strong>{summary.totalRevenue.toLocaleString()}</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2}>
                        <strong>
                          {summary.totalDiscount.toLocaleString()}
                        </strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={3}>
                        <strong>{summary.totalTax.toLocaleString()}</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={4}>
                        <strong>{summary.totalRevenue.toLocaleString()}</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={5}>
                        <strong>{summary.totalPaid.toLocaleString()}</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={6}>
                        <strong>{summary.totalDue.toLocaleString()}</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={7}>
                        <strong>
                          {summary.totalDoctorShare.toLocaleString()}
                        </strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={8}>
                        <strong>
                          {summary.totalHospitalShare.toLocaleString()}
                        </strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell
                        index={9}
                        colSpan={2}
                      ></Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                )}
              />
            </div>
          </Spin>
        </div>
      </div>

      {/* Add custom CSS for placeholder colors */}
      <style jsx global>{`
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

export default FinancialReports;
