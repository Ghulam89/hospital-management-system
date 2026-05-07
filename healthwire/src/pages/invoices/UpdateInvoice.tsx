import { useState, useEffect } from 'react';

import axios from 'axios';
import { Base_url } from '../../utils/Base_url';
import { toast } from 'react-toastify';
import { useParams, useNavigate } from 'react-router-dom';
import { AsyncPaginate, LoadOptions } from 'react-select-async-paginate';
import { BsFillFileEarmarkPdfFill } from 'react-icons/bs';
import { RiRefund2Line } from 'react-icons/ri';
import AddProcedureExpense from './AddProcedureExpense';

type Procedure = {
  _id: string;
  name: string;
  amount: number;
  departmentType: string;
};

type ProcedureItem = {
  id: number;
  procedureId: string;
  procedure: string;
  description: string;
  procedureDate: string;
  rate: number;
  quantity: number;
  amount: number;
  discount: number;
  discountType: number;
  tax: string;
  deductDiscount: string;
  performedBy: string;
  doctorAmount: number;
  hospitalAmount: number;
};

type PaymentInstallment = {
  id: number;
  date: string;
  method: string;
  amount: number;
  reference: string;
};

type User = {
  _id: string;
  name: string;
  sharePrice?: string;
  shareType?: string;
};

type Patient = {
  _id: string;
  mr: string;
  name: string;
  gender: string;
  phone: string;
};


type ProcedureOption = {
  value: string;
  label: string;
  procedureData?: Procedure;
};

/** Mongoose populated refs often come back as `{ _id, name }` — normalize for selects/API */
function refId(value: unknown): string {
  if (value == null || value === '') return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && '_id' in value) {
    const idVal = (value as { _id: unknown })._id;
    if (idVal != null && idVal !== '') return String(idVal);
  }
  return '';
}

/** API / legacy bundles sometimes store non-arrays; calling .filter/.reduce on {} throws and breaks the page */
function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function formatInvoicePaymentDate(payDate: unknown): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  if (payDate == null || payDate === '') {
    const n = new Date();
    return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
  }
  if (typeof payDate === 'string') {
    // Keep API day stable (avoid timezone shifting when value is UTC ISO midnight).
    const trimmed = payDate.trim();
    const m = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m?.[1]) return m[1];
  }
  const d = new Date(payDate as string | Date);
  if (Number.isNaN(d.getTime())) {
    const n = new Date();
    return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
  }
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function ymdFromApi(d: unknown): string {
  if (d == null || d === '') return '';
  if (typeof d === 'string') {
    const trimmed = d.trim();
    const m = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m?.[1]) return m[1];
  }
  const dt = new Date(d as string | Date);
  if (Number.isNaN(dt.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

type InvoiceData = {
  _id: string;
  invoiceNo?: string;
  patientId: Patient;
  item: {
    procedureId: string;
    description: string;
    rate: number;
    quantity: number;
    amount: number;
    discount: number;
    discountType: number;
    tax: number;
    total: number;
    performedBy: string;
    doctorAmount: number;
    hospitalAmount: number;
  }[];
  subTotalBill: number;
  discountBill: number;
  taxBill: number;
  totalBill: number;
  duePay: number;
  advancePay: number;
  totalPay: number;
  invoiceDate?: string;
  payment: {
    method: string;
    payDate: string;
    paid: number;
    reference: string;
  }[];
  note: string;
  doctorId: User;
  status: string;
};

export default function InvoiceUpdate() {
  const { id, patientId } = useParams();
  const navigate = useNavigate();
  const [patientInfo, setPatientInfo] = useState<Patient | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [proceduresList, setProceduresList] = useState<Procedure[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [remarks, setRemarks] = useState('');
  const [searchError, setSearchError] = useState('');
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [invoiceEditDate, setInvoiceEditDate] = useState<string>('');
  const [getPatinetData, setGetPatientData] = useState<Patient | null>(null);
  const [isPaymentComplete, setIsPaymentComplete] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Refund modal state
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundProcedure, setRefundProcedure] = useState<ProcedureItem | null>(null);
  const [refundForm, setRefundForm] = useState({
    method: 'Cash',
    paid: '',
    payDate: new Date().toISOString().split('T')[0],
    reference: '',
    notes: ''
  });

  const [procedures, setProcedures] = useState<ProcedureItem[]>([
    {
      id: 1,
      procedureId: '',
      procedure: '',
      description: '',
      procedureDate: '',
      rate: 0,
      quantity: 1,
      amount: 0,
      discount: 0,
      discountType: 0,
      tax: 'value',
      deductDiscount: 'Hospital & Doctor',
      performedBy: '',
      doctorAmount: 0,
      hospitalAmount: 0,
    }
  ]);

  const [paymentInstallments, setPaymentInstallments] = useState<PaymentInstallment[]>([
    {
      id: 1,
      date: new Date().toISOString().split('T')[0],
      method: 'Cash',
      amount: 0,
      reference: ''
    }
  ]);
  const [paymentsDirty, setPaymentsDirty] = useState(false);
  const [localExpenses, setLocalExpenses] = useState<any[]>([]);
  const [isProcedureExpenseModalOpen, setIsProcedureExpenseModalOpen] = useState(false);
  const [selectedProcedureRowId, setSelectedProcedureRowId] = useState<number | null>(null);
  const [editingExpense, setEditingExpense] = useState<any | null>(null);
  const [categories, setCategories] = useState<{ _id: string; name: string }[]>([]);

  const [invoiceNotes] = useState([
    'Procedures & Medicines once purchased are non-refundable.',
    'Purchased Packages Are Valid For 06 Months Only.'
  ]);
  const handleNumberInputWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.currentTarget.blur();
  };

  const applyLoadedInvoice = (data: any) => {
    try {
    setInvoiceData(data);

    const rawPatient = data.patientId;
    if (rawPatient && typeof rawPatient === 'object' && rawPatient !== null) {
      setPatientInfo(rawPatient as Patient);
      const p = rawPatient as Patient & { fullName?: string };
      const displayName = (p.name ?? p.fullName ?? '').trim();
      const mr = (p.mr ?? '').toString().trim();
      const label =
        displayName && mr
          ? `${displayName} (MR# ${mr})`
          : displayName
            ? displayName
            : mr
              ? `MR# ${mr}`
              : '';
      if (label) {
        setSearchTerm(label);
      }
    }

    const procedureLabelFromItem = (item: any): string => {
      const desc = item?.description != null ? String(item.description) : '';
      const pid = item?.procedureId;
      if (pid != null && typeof pid === 'object' && 'name' in pid && (pid as { name?: unknown }).name != null) {
        return String((pid as { name?: string }).name);
      }
      return desc;
    };

    if (data.item && Array.isArray(data.item) && data.item.length > 0) {
      setInvoiceEditDate(ymdFromApi(data.invoiceDate) || ymdFromApi(data.createdAt));

      const mappedProcedures = data.item.map((item: any, index: number) => ({
        id: index + 1,
        procedureId: refId(item.procedureId),
        procedure: procedureLabelFromItem(item),
        description: item.description ?? '',
        procedureDate: ymdFromApi(item.procedureDate),
        rate: Number(item.rate) || 0,
        quantity: Number(item.quantity) || 0,
        amount: Number(item.amount) || 0,
        discount: Number(item.discount) || 0,
        discountType: item.discountType ?? 0,
        tax: Number(item.tax) === 0 ? 'value' : 'exempt',
        deductDiscount: 'Hospital & Doctor',
        performedBy: refId(item.performedBy),
        doctorAmount: Number(item.doctorAmount) || 0,
        hospitalAmount: Number(item.hospitalAmount) || 0,
      }));
      setProcedures(mappedProcedures);
    }

    const seededFromItems = Array.isArray(data.item)
      ? data.item.map((srcItem: any, index: number) => ({
          procedureRowId: index + 1,
          procedureId: refId(srcItem?.procedureId),
          expenses: asArray(srcItem?.expenses),
          doctorShares: asArray(srcItem?.doctorShares),
          assistedBy: Array.isArray(srcItem?.assistedBy)
            ? srcItem.assistedBy.map((u: any) => ({
                userId: String(refId(u) || refId((u as any)?.userId) || ''),
                userName:
                  typeof u === 'object' && u != null && 'name' in u && (u as { name?: string }).name
                    ? String((u as { name?: string }).name)
                    : '',
              })).filter((x: { userId: string }) => x.userId)
            : [],
          receptionStaff: Array.isArray(srcItem?.receptionStaff)
            ? srcItem.receptionStaff.map((u: any) => ({
                userId: String(refId(u) || refId((u as any)?.userId) || ''),
                userName:
                  typeof u === 'object' && u != null && 'name' in u && (u as { name?: string }).name
                    ? String((u as { name?: string }).name)
                    : '',
              })).filter((x: { userId: string }) => x.userId)
            : [],
          consumptions: Array.isArray(srcItem?.consumptions) ? srcItem.consumptions : [],
          _id: `${data._id || 'inv'}-${index + 1}`,
        }))
      : [];

    const invoiceLevelBundle = {
      procedureRowId: null,
      procedureId: '',
      expenses: asArray(data.invoiceExpenses),
      doctorShares: [],
      consumptions: asArray(data.invoiceConsumptions),
      _id: `${data._id || 'inv'}-invoice`,
    };

    const legacyBundles = Array.isArray(data.expensesBundles)
      ? data.expensesBundles.map((bundle: any) => ({
          procedureRowId: typeof bundle.procedureRowId === 'number' ? bundle.procedureRowId : null,
          procedureId: '',
          expenses: asArray(bundle.expenses),
          doctorShares: asArray(bundle.doctorShares),
          consumptions: asArray(bundle.consumptions),
          _id: bundle._id || Date.now().toString(),
        }))
      : [];

    const combinedSeed = [
      ...seededFromItems.filter(
        (b: any) =>
          b.expenses?.length ||
          b.doctorShares?.length ||
          b.consumptions?.length ||
          b.assistedBy?.length ||
          b.receptionStaff?.length,
      ),
      ...(invoiceLevelBundle.expenses.length || invoiceLevelBundle.consumptions.length
        ? [invoiceLevelBundle]
        : []),
      ...legacyBundles,
    ];
    if (combinedSeed.length > 0) {
      setLocalExpenses(combinedSeed);
    }

    if (data.payment && Array.isArray(data.payment) && data.payment.length > 0) {
      const mappedPayments = data.payment.map((payment: any, index: number) => ({
        id: index + 1,
        date: formatInvoicePaymentDate(payment.payDate),
        method: payment.method ?? 'Cash',
        amount: Number(payment.paid) || 0,
        reference: payment.reference || '',
      }));
      setPaymentInstallments(mappedPayments);
    }

    if (data.note) {
      setRemarks(data.note);
    }

    const duePayNum = Number(data.duePay ?? 0);
    setPaymentStatus(duePayNum <= 0 ? 'Payment Complete' : `Due: Rs. ${duePayNum.toFixed(2)}`);
    setIsPaymentComplete(duePayNum <= 0);
    } catch (parseErr: unknown) {
      console.error('applyLoadedInvoice:', parseErr);
      const msg =
        parseErr instanceof Error ? parseErr.message : 'Could not parse invoice response';
      toast.error(msg);
    }
  };

  const reloadInvoiceFromApi = async () => {
    if (!id) return;
    try {
      const invoiceRes = await axios.get(`${Base_url}/apis/invoice/get/${id}`);
      const data = invoiceRes.data?.data;
      if (data) applyLoadedInvoice(data);
    } catch (e) {
      console.error('Error reloading invoice:', e);
      toast.error('Could not reload invoice');
    }
  };

  // Calculate payment status whenever payments or total changes
  useEffect(() => {
    try {
      const due = calculateDue();
      if (due < 0) {
        setIsPaymentComplete(true);
        setPaymentStatus(`Credit: Rs. ${Math.abs(due).toFixed(2)}`);
      } else if (due === 0) {
        setIsPaymentComplete(true);
        setPaymentStatus('Payment Complete');
      } else {
        setIsPaymentComplete(false);
        setPaymentStatus(`Due: Rs. ${due.toFixed(2)}`);
      }
    } catch (e) {
      console.error('Invoice totals:', e);
    }
  }, [paymentInstallments, procedures]);

  // Fetch invoice data, procedures and users
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        const invoiceId = String(id ?? '').trim();
        const mongoIdOk = /^[a-fA-F0-9]{24}$/.test(invoiceId);

        if (invoiceId && mongoIdOk) {
          try {
            const invoiceRes = await axios.get(`${Base_url}/apis/invoice/get/${invoiceId}`);
            const raw = invoiceRes?.data;
            const data = raw?.data ?? raw?.invoice ?? raw?.result;
            if (!data || typeof data !== 'object') {
              toast.error(
                (typeof raw?.message === 'string' && raw.message) ||
                  (typeof raw?.error === 'string' && raw.error) ||
                  'Invoice not found'
              );
              setIsLoading(false);
              return;
            }
            applyLoadedInvoice(data);
          } catch (invoiceErr: any) {
            console.error('Invoice load error:', invoiceErr);
            const msg =
              invoiceErr.response?.data?.message ||
              invoiceErr.response?.data?.error ||
              invoiceErr.message;
            toast.error(typeof msg === 'string' ? msg : 'Failed to load invoice data');
            setIsLoading(false);
            return;
          }
        } else {
          toast.error(
            !invoiceId
              ? 'Missing invoice id in URL'
              : 'Invalid invoice id — open Edit from the invoice list again',
          );
          setIsLoading(false);
          return;
        }

        const results = await Promise.allSettled([
          axios.get(`${Base_url}/apis/procedure/get`),
          axios.get(`${Base_url}/apis/user/get?role=doctor`),
        ]);

        const procResult = results[0];
        if (procResult.status === 'fulfilled') {
          const pr = procResult.value;
          const payload = pr?.data?.data ?? pr?.data;
          setProceduresList(Array.isArray(payload) ? payload : []);
        } else {
          console.error('Could not load procedures list:', procResult.reason);
          setProceduresList([]);
        }

        const userResult = results[1];
        if (userResult.status === 'fulfilled') {
          const ur = userResult.value;
          const payload = ur?.data?.data ?? ur?.data;
          setUsersList(Array.isArray(payload) ? payload : []);
        } else {
          console.error('Could not load doctors list:', userResult.reason);
          setUsersList([]);
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setIsLoading(false);
        toast.error('Failed to load invoice data');
      }
    };

    fetchData();
  }, [id]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await axios.get(`${Base_url}/apis/expenseCategory/get`);
        const arr = Array.isArray(res?.data?.data) ? res.data.data : [];
        setCategories(arr);
      } catch (e) {
        setCategories([]);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
  const fetchMissingDoctors = async () => {
    const missingDoctors = procedures
      .map(p => refId(p.performedBy))
      .filter(doctorId =>
        doctorId && !usersList.some(u => u._id === doctorId)
      );
    
    if (missingDoctors.length > 0) {
      try {
        const responses = await Promise.all(
          missingDoctors.map(id => 
            axios.get(`${Base_url}/apis/user/get/${id}`)
          )
        );
        const newDoctors = responses.map(r => r.data.data);
        setUsersList(prev => [...prev, ...newDoctors]);
      } catch (error) {
        console.error('Error fetching missing doctors:', error);
      }
    }
  };

  if (usersList.length > 0 && procedures.length > 0) {
    fetchMissingDoctors();
  }
}, [usersList, procedures]);

  /** Load patient for header when route has patientId (covers unpopulated invoice.patientId) */
  useEffect(() => {
    const pid = patientId?.trim();
    if (!pid || pid === 'undefined') return;
    let cancelled = false;
    (async () => {
      try {
        const response = await axios.get(`${Base_url}/apis/patient/get/${pid}`);
        const p = response.data?.data;
        if (!cancelled && p) {
          setGetPatientData(p);
          setPatientInfo((prev) => prev ?? p);
        }
      } catch (error) {
        console.error('Error fetching patient for header:', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  // Patient search functionality (keeps getPatinetData in sync when search term changes)
  useEffect(() => {
    const fetchPatients = async () => {
      const pid = patientId?.trim();
      if (searchTerm.trim() === '' || !pid || pid === 'undefined') {
        setSearchResults([]);
        setSearchError('');
        return;
      }

      try {
        const response = await axios.get(`${Base_url}/apis/patient/get/${pid}`);
        const p = response.data.data;
        setGetPatientData(p);
        if (p) setPatientInfo((prev) => prev ?? p);
      } catch (error) {
        console.error('Error fetching patient:', error);
      }
    };

    const debounceTimer = setTimeout(() => {
      fetchPatients();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, patientId]);

  // Calculate doctor and hospital shares
  const calculateShares = (item: ProcedureItem) => {
    const totalAmount = item.rate * item.quantity;
    let discountAmount = item.discount;

    // Calculate discount amount based on type
    if (item.discountType === 1) { // percentage
      discountAmount = totalAmount * (item.discount / 100);
    }

    const remainingAmount = totalAmount - discountAmount;

    // Find the selected doctor to get share info
    const selectedDoctor = usersList.find(user => user._id === item.performedBy);
    
    let doctorShare = 0;
    let hospitalShare = remainingAmount; // Default to hospital getting full amount

    if (selectedDoctor && selectedDoctor.sharePrice && selectedDoctor.shareType) {
      const sharePrice = parseFloat(selectedDoctor.sharePrice);
      
      if (selectedDoctor.shareType === 'percentage') {
        // Doctor gets percentage of total amount (before discount)
        doctorShare = totalAmount * (sharePrice / 100);
      } else {
        // Doctor gets fixed amount
        doctorShare = sharePrice;
      }

      // Ensure doctor doesn't get more than the remaining amount
      doctorShare = Math.min(doctorShare, remainingAmount);
      hospitalShare = remainingAmount - doctorShare;
    }

    // Apply discount distribution based on deductDiscount selection
    switch (item.deductDiscount) {
      case 'Hospital & Doctor':
        // Split discount equally between hospital and doctor
        doctorShare = doctorShare - (discountAmount / 2);
        hospitalShare = hospitalShare - (discountAmount / 2);
        break;
      case 'Hospital':
        // Apply full discount to hospital share only
        hospitalShare = hospitalShare - discountAmount;
        break;
      case 'Doctor':
        // Apply full discount to doctor share only
        doctorShare = doctorShare - discountAmount;
        break;
    }

    // Ensure shares don't go negative
    doctorShare = Math.max(0, doctorShare);
    hospitalShare = Math.max(0, hospitalShare);

    return {
      doctorAmount: parseFloat(doctorShare.toFixed(2)),
      hospitalAmount: parseFloat(hospitalShare.toFixed(2)),
    };
  };

  const handleLocalExpenseAdd = (procedureRowId: number | null, bundle: any) => {
    setLocalExpenses((prev) => {
      const idx = prev.findIndex((e) => e.procedureRowId === procedureRowId);
      const proc = procedureRowId != null ? procedures.find((p) => p.id === procedureRowId) : null;
      const payload = {
        procedureRowId,
        procedureId: proc?.procedureId || '',
        invoiceId: invoiceData?._id || '',
        ...bundle,
      };
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = payload;
        return next;
      }
      return [...prev, payload];
    });
    if (procedureRowId != null) {
      const firstDoc = asArray(bundle?.doctorShares).find(
        (s: any) =>
          s.doctorId && /^[0-9a-fA-F]{24}$/.test(String(s.doctorId).trim()),
      );
      const docId = firstDoc?.doctorId ? String(firstDoc.doctorId).trim() : '';
      if (docId) {
        setProcedures((prev) =>
          prev.map((p) => {
            if (p.id !== procedureRowId) return p;
            const next = { ...p, performedBy: docId };
            const sh = calculateShares(next);
            return { ...next, doctorAmount: sh.doctorAmount, hospitalAmount: sh.hospitalAmount };
          }),
        );
      }
    }
    setIsProcedureExpenseModalOpen(false);
    setEditingExpense(null);
  };

  const addProcedure = () => {
    setProcedures([...procedures, {
      id: procedures.length + 1,
      procedureId: '',
      procedure: '',
      description: '',
      procedureDate: '',
      rate: 0,
      quantity: 1,
      amount: 0,
      discount: 0,
      discountType: 0,
      tax: 'value',
      deductDiscount: 'Hospital & Doctor',
      performedBy: '',
      doctorAmount: 0,
      hospitalAmount: 0
    }]);
  };



    const loadDoctorOptions: LoadOptions<any, never, { page: number }> = async (
    searchQuery,
    loadedOptions,
    additional
  ) => {
    try {
      const response = await axios.get(`${Base_url}/apis/user/get`, {
        params: { 
          page: additional?.page || 1, 
          limit: 20, 
          search: searchQuery || '',
          role: 'doctor'
        },
      });
  
      const responseData = response.data;
      const data = responseData.data || responseData;
      
      // Update usersList state with new doctors
      const newDoctors = data.filter((newDoctor: User) => 
        !usersList.some(existing => existing._id === newDoctor._id)
      );
      
      if (newDoctors.length > 0) {
        setUsersList(prev => [...prev, ...newDoctors]);
      }
  
      const options = data.map((item: User) => ({
        label: item.name,
        value: item._id,
        userData: item,
      }));
  
      return {
        options,
        hasMore: data.length >= 20,
        additional: {
          page: (additional?.page || 1) + 1
        },
      };
    } catch (error) {
      console.error('Error loading doctors:', error);
      return {
        options: [],
        hasMore: false,
      };
    }
  };


  const loadProcedureOptions: LoadOptions<ProcedureOption, never, { page: number }> = async (
    searchQuery,
    loadedOptions,
    additional
  ) => {
    try {
      const response = await axios.get(`${Base_url}/apis/procedure/get`, {
        params: { 
          page: additional?.page || 1, 
          limit: 20, 
          search: searchQuery || '' 
        },
      });
      
      // Handle both possible response structures
      const responseData = response.data;
      const data = responseData.data || responseData;
      const totalPages = responseData.totalPages || 1;
      const currentPage = responseData.currentPage || responseData.page || 1;
      
      // Map options with full procedure data
      const options = data.map((item: Procedure) => ({
        label: item.name + (item.amount ? ` (Rs. ${item.amount})` : ''),
        value: item._id,
        procedureData: item, // Include full procedure data
      }));
  
      return {
        options,
        hasMore: currentPage < totalPages,
        additional: {
          page: currentPage + 1
        },
      };
    } catch (error) {
      console.error('Error loading procedures:', error);
      return {
        options: [],
        hasMore: false,
      };
    }
  };
  

  const removeProcedure = (id: number) => {
    setProcedures(procedures.filter(item => item.id !== id));
  };

  const openProcedureRefundModal = (procedure: ProcedureItem) => {
    setRefundProcedure(procedure);
    setRefundForm({
      method: 'Cash',
      paid: String(procedure.amount || 0),
      payDate: new Date().toISOString().split('T')[0],
      reference: '',
      notes: ''
    });
    setRefundModalOpen(true);
  };

  const submitProcedureRefund = async () => {
    if (!refundProcedure || !invoiceData) {
      toast.error('Procedure or invoice data not available');
      return;
    }

    const amount = Number(refundForm.paid) || 0;
    if (amount <= 0) {
      toast.error('Refund amount must be greater than 0');
      return;
    }

    try {
      const response = await axios.post(
        `${Base_url}/apis/invoice/procedure-refund/${invoiceData._id}`,
        {
          procedureId: refundProcedure.procedureId,
          method: refundForm.method,
          paid: -Math.abs(amount), // Negative for refund
          payDate: refundForm.payDate,
          reference: refundForm.reference,
          notes: refundForm.notes
        }
      );

      if (response.data.status === 'success') {
        toast.success('Procedure refund recorded successfully');
        setRefundModalOpen(false);
        setRefundProcedure(null);
        await reloadInvoiceFromApi();
      } else {
        toast.error(response.data.message || 'Failed to record refund');
      }
    } catch (error: any) {
      console.error('Procedure refund error:', error);
      toast.error(error.response?.data?.message || 'Failed to record refund');
    }
  };

  const updateProcedure = (id: number, field: keyof ProcedureItem, value: any) => {
    const updatedProcedures = procedures.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        
        if (field === 'procedureId') {
          const selectedProcedure = proceduresList.find(p => p._id === value);
          if (selectedProcedure) {
            updatedItem.procedure = selectedProcedure.name;
            updatedItem.description = selectedProcedure.name;
            updatedItem.rate = selectedProcedure.amount;
            updatedItem.amount = selectedProcedure.amount * updatedItem.quantity;
            
            // Calculate shares when procedure changes
            const shares = calculateShares(updatedItem);
            updatedItem.doctorAmount = shares.doctorAmount;
            updatedItem.hospitalAmount = shares.hospitalAmount;
          }
        }
        
        if (field === 'rate' || field === 'quantity') {
          const oldAmount = item.amount;
          const oldQuantity = field === 'quantity' ? item.quantity : updatedItem.quantity;
          const newQuantity = field === 'quantity' ? value : updatedItem.quantity;
          
          updatedItem.amount = updatedItem.rate * updatedItem.quantity;
          
          // Adjust discount proportionally when quantity changes and discount type is Amount (0)
          if (field === 'quantity' && oldQuantity > 0 && updatedItem.discountType === 0 && item.discount > 0) {
            // Calculate discount ratio based on quantity change
            const quantityRatio = newQuantity / oldQuantity;
            updatedItem.discount = item.discount * quantityRatio;
            
            // Ensure discount doesn't exceed new amount
            if (updatedItem.discount > updatedItem.amount) {
              updatedItem.discount = updatedItem.amount;
            }
          }
          
          const shares = calculateShares(updatedItem);
          updatedItem.doctorAmount = shares.doctorAmount;
          updatedItem.hospitalAmount = shares.hospitalAmount;
        }

        if (field === 'discount') {
          const maxDiscount = updatedItem.discountType === 0 ? updatedItem.amount : 100;
          if (value > maxDiscount) {
            toast.error(`Discount cannot exceed ${updatedItem.discountType === 0 ? 'the amount' : '100%'}`);
            updatedItem.discount = maxDiscount;
          }
        }

        if (field === 'discount' || field === 'discountType' || field === 'deductDiscount') {
          const shares = calculateShares(updatedItem);
          updatedItem.doctorAmount = shares.doctorAmount;
          updatedItem.hospitalAmount = shares.hospitalAmount;
        }

        if (field === 'performedBy') {
          const shares = calculateShares(updatedItem);
          updatedItem.doctorAmount = shares.doctorAmount;
          updatedItem.hospitalAmount = shares.hospitalAmount;
        }
        
        return updatedItem;
      }
      return item;
    });
    setProcedures(updatedProcedures);
  };
  
  const addPaymentInstallment = () => {
    setPaymentInstallments([...paymentInstallments, {
      id: paymentInstallments.length + 1,
      date: new Date().toISOString().split('T')[0],
      method: 'Cash',
      amount: 0,
      reference: ''
    }]);
    setPaymentsDirty(true);
  };

  const removePaymentInstallment = (id: number) => {
    setPaymentInstallments(paymentInstallments.filter(item => item.id !== id));
    setPaymentsDirty(true);
  };

  const updatePaymentInstallment = (id: number, field: keyof PaymentInstallment, value: any) => {
    const updatedPayments = paymentInstallments.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setPaymentInstallments(updatedPayments);
    setPaymentsDirty(true);
  };

  const isProcDated = (item: ProcedureItem) =>
    !!(item.procedureDate && String(item.procedureDate).trim());

  const lineNetAfterDiscount = (item: ProcedureItem) => {
    const disc =
      item.discountType === 0 ? item.discount : item.amount * (item.discount / 100);
    return Math.max(0, item.amount - disc);
  };

  const undatedProcedureAdvance = () =>
    procedures.filter((p) => !isProcDated(p)).reduce((sum, p) => sum + lineNetAfterDiscount(p), 0);

  const expenseAddOnTotal = (procedureRowId: number | null) => {
    const bundle = localExpenses.find((e) => e.procedureRowId === procedureRowId);
    if (!bundle?.expenses) return 0;
    return bundle.expenses
      .filter((row: { deductBeforeDoctorShare?: boolean }) => !row.deductBeforeDoctorShare)
      .reduce((s: number, row: { amount?: number }) => s + (Number(row.amount) || 0), 0);
  };

  const calculateSubTotal = () => {
    return procedures.filter(isProcDated).reduce((sum, item) => sum + item.amount, 0);
  };

  const calculateTotalDiscount = () => {
    return procedures.filter(isProcDated).reduce((sum, item) => {
      if (item.discountType === 0) {
        return sum + item.discount;
      } else {
        return sum + item.amount * (item.discount / 100);
      }
    }, 0);
  };

  const calculateDoctorShareBase = () => {
    const procedureTotal = calculateSubTotal() - calculateTotalDiscount();
    const preDoctorShareDeductExpenses = localExpenses
      .filter((expense) => {
        if (expense.procedureRowId == null) return false;
        const proc = procedures.find((p) => p.id === expense.procedureRowId);
        return proc ? isProcDated(proc) : false;
      })
      .reduce((sum, expense) => {
        const deductSum = asArray<{ deductBeforeDoctorShare?: boolean; amount?: number }>(
          expense.expenses,
        )
          .filter((exp) => exp.deductBeforeDoctorShare)
          .reduce((expSum, exp) => expSum + (exp.amount || 0), 0);
        return sum + deductSum;
      }, 0);
    return Math.max(0, procedureTotal - preDoctorShareDeductExpenses);
  };

  const calculateGrandTotal = () => {
    let procedureNet = 0;
    let expenseFromRows = 0;
    for (const p of procedures) {
      if (!isProcDated(p)) continue;
      procedureNet += lineNetAfterDiscount(p);
      expenseFromRows += expenseAddOnTotal(p.id);
    }
    const invBundle = localExpenses.find((e) => e.procedureRowId == null);
    const invoiceExtra = Array.isArray(invBundle?.expenses)
      ? invBundle.expenses
          .filter((row: { deductBeforeDoctorShare?: boolean }) => !row.deductBeforeDoctorShare)
          .reduce((s: number, row: { amount?: number }) => s + (Number(row.amount) || 0), 0)
      : 0;
    return procedureNet + expenseFromRows + invoiceExtra;
  };

  const calculateTotalPaid = () => {
    return paymentInstallments.reduce((sum, item) => sum + item.amount, 0);
  };

  const calculateDue = () => {
    return calculateGrandTotal() - calculateTotalPaid();
  };

  const calculateTotalDoctorShare = () => {
    return procedures.reduce((sum, item) => sum + item.doctorAmount, 0);
  };

  const calculateTotalHospitalShare = () => {
    return procedures.reduce((sum, item) => sum + item.hospitalAmount, 0);
  };
  
  const calculateAdditionalExpensesTotal = () =>
    localExpenses
      .filter((expense) => {
        if (expense.procedureRowId == null) return true;
        const proc = procedures.find((p) => p.id === expense.procedureRowId);
        return proc ? isProcDated(proc) : false;
      })
      .reduce((sum, expense) => {
        const e = expense.expenses || [];
        return (
          sum +
          e
            .filter((row: { deductBeforeDoctorShare?: boolean }) => !row.deductBeforeDoctorShare)
            .reduce((s: number, row: { amount?: number }) => s + (Number(row.amount) || 0), 0)
        );
      }, 0);

  const calculateDoctorSharesDeduction = () => {
    const base = calculateDoctorShareBase();
    return localExpenses
      .filter((expense) => {
        if (expense.procedureRowId == null) return false;
        const proc = procedures.find((p) => p.id === expense.procedureRowId);
        return proc ? isProcDated(proc) : false;
      })
      .reduce((sum, expense) => {
        const shares = asArray<{ share?: number; shareType?: string }>(expense.doctorShares);
        const sharesTotal = shares.reduce((s, share: any) => {
          const val = Number(share.share) || 0;
          const amt = share.shareType === 'percentage' ? base * (val / 100) : val;
          return s + amt;
        }, 0);
        return sum + sharesTotal;
      }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    if (!patientInfo) {
      toast.error('Please select a patient');
      setIsSubmitting(false);
      return;
    }
  
    const procedureDateToIso = (ds: string) => {
      const t = String(ds || '').trim();
      if (!t) return undefined;
      const [y, m, d] = t.split('-').map(Number);
      if (!y || !m || !d) return undefined;
      return new Date(y, m - 1, d, 12, 0, 0, 0).toISOString();
    };

    for (const item of procedures) {
      if (!item.procedureId || item.procedureId.trim() === '') {
        toast.error(`Please select a procedure for item ${item.id}`);
        setIsSubmitting(false);
        return;
      }
      const costing = localExpenses.find(
        (b) => b.procedureRowId === item.id || b.procedureId === item.procedureId,
      );
      const hasDoctor = asArray(costing?.doctorShares).some(
        (s: any) => s.doctorId && /^[0-9a-fA-F]{24}$/i.test(String(s.doctorId)),
      );
      if (!hasDoctor) {
        toast.error(
          `Procedure "${item.procedure || item.id}": open costing (document icon) and add at least one doctor`,
        );
        setIsSubmitting(false);
        return;
      }
    }

    const firstProc = procedures[0];
    const firstBundle =
      localExpenses.find((b) => b.procedureRowId === firstProc?.id || b.procedureId === firstProc?.procedureId) ||
      {};
    const doctorId =
      asArray(firstBundle.doctorShares).find(
        (s: any) => s.doctorId && /^[0-9a-fA-F]{24}$/i.test(String(s.doctorId)),
      )?.doctorId || procedures[0]?.performedBy;
    if (!doctorId || String(doctorId).trim() === '') {
      toast.error('Add at least one doctor in costing for the first procedure');
      setIsSubmitting(false);
      return;
    }

    const billingTotal = calculateGrandTotal();
    const paidSum = calculateTotalPaid();
    const undatedAdv = undatedProcedureAdvance();
    const rawDue = billingTotal - paidSum;

    const shareBaseForSave = calculateDoctorShareBase();

    const invoiceEditDateIso = (() => {
      const t = String(invoiceEditDate || '').trim();
      if (!t) return undefined;
      const [y, m, d] = t.split('-').map(Number);
      if (!y || !m || !d) return undefined;
      return new Date(y, m - 1, d, 12, 0, 0, 0).toISOString();
    })();

    const invoiceDataBase = {
      patientId: patientInfo._id,
      patientMr: patientInfo.mr,
      doctorId: doctorId,
      ...(invoiceEditDateIso ? { invoiceDate: invoiceEditDateIso } : {}),
      item: procedures.map((item) => {
        const bundle =
          localExpenses.find((b) => b.procedureRowId === item.id || b.procedureId === item.procedureId) || {};
        const shownExpenses = asArray(bundle.expenses);
        const shares = asArray(bundle.doctorShares)
          .filter((share: any) => {
            const id = String(share.doctorId || '');
            const isHex24 = /^[0-9a-fA-F]{24}$/.test(id);
            const val = Number(share.share);
            return isHex24 && Number.isFinite(val) && val > 0;
          })
          .map((share: any) => {
            const val = Number(share.share) || 0;
            const amount = share.shareType === 'percentage' ? shareBaseForSave * (val / 100) : val;
            return {
              doctorId: String(share.doctorId),
              shareType: share.shareType,
              shareValue: val,
              amount,
            };
          });
        const primaryDoc =
          asArray(bundle.doctorShares).find(
            (s: any) => s.doctorId && /^[0-9a-fA-F]{24}$/i.test(String(s.doctorId)),
          )?.doctorId || item.performedBy;
        return {
          procedureId: item.procedureId,
          description:
            [item.procedure, item.procedureDate].filter(Boolean).join(' — ') ||
            item.description ||
            item.procedure,
          procedureDate: procedureDateToIso(item.procedureDate),
          rate: item.rate,
          quantity: item.quantity,
          amount: item.amount,
          discount: item.discount,
          discountType: item.discountType,
          tax: item.tax === 'value' ? 0 : 0,
          total: item.amount - (item.discountType === 0 ? item.discount : (item.amount * (item.discount / 100))),
          performedBy: primaryDoc,
          assistedBy: asArray<{ userId?: string }>(bundle.assistedBy)
            .map((x) => x?.userId)
            .filter(Boolean),
          receptionStaff: asArray<{ userId?: string }>(bundle.receptionStaff)
            .map((x) => x?.userId)
            .filter(Boolean),
          doctorAmount: item.doctorAmount,
          hospitalAmount: item.hospitalAmount,
          expenses: shownExpenses,
          doctorShares: shares,
          consumptions: asArray(bundle.consumptions),
        };
      }),
      subTotalBill: calculateSubTotal(),
      discountBill: calculateTotalDiscount(),
      taxBill: 0,
      totalBill: billingTotal,
      note: remarks,
    };
    
    const invoiceData: any = { ...invoiceDataBase };
    {
      invoiceData.duePay = rawDue > 0 ? rawDue : 0;
      invoiceData.advancePay = undatedAdv + (rawDue < 0 ? Math.abs(rawDue) : 0);
      invoiceData.totalPay = paidSum;
      invoiceData.status = rawDue < 0 ? 'credit' : rawDue === 0 ? 'completed' : 'pending';
    }
    if (paymentsDirty) {
      invoiceData.payment = paymentInstallments.map(payment => ({
        method: payment.method,
        payDate: (() => {
          if (!payment.date) return payment.date;
          if (/^\d{4}-\d{2}-\d{2}$/.test(payment.date)) {
            const [y, m, d] = payment.date.split('-').map((v) => Number(v));
            if (!y || !m || !d) return payment.date;
            const now = new Date();
            return new Date(
              y,
              m - 1,
              d,
              now.getHours(),
              now.getMinutes(),
              now.getSeconds(),
              now.getMilliseconds(),
            ).toISOString();
          }
          const parsed = new Date(payment.date);
          return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : payment.date;
        })(),
        paid: payment.amount,
        reference: payment.reference
      }));
    }
  
    try {
      const response = await axios.put(`${Base_url}/apis/invoice/update/${id}`, invoiceData);
      if(response.data.status === "ok") {
        toast.success('Invoice updated successfully!');
        if (isPaymentComplete) {
          // toast.success('Payment completed successfully!');
        }
        navigate('/invoice');
      } else {
        toast.error(response.data.message || 'Failed to update invoice');
      }
    } catch (error) {
      console.error('Detailed error:', error.response?.data || error.message);
      toast.error(error.response?.data?.message || 'An error occurred while updating invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </>
    );
  }

  const headerPatient = getPatinetData ?? patientInfo;
  const headerName =
    (headerPatient as Patient & { fullName?: string })?.name?.trim() ||
    (headerPatient as Patient & { fullName?: string })?.fullName?.trim() ||
    '';

  return (
    <>
      <div className="">
        <div>
          <p className='text-black mb-3 font-medium'>
            <span className='text-primary'>
              {headerPatient
                ? `${headerPatient.mr ?? ''}-${headerName || '—'} - ${headerPatient.gender ?? ''}`
                : '—'}{' '}
            </span>
            - Edit Invoice
          </p>
        </div>

        {/* Procedures Section */}
        <div className="mb-8 bg-white p-4 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-700">Invoice# {invoiceData?.invoiceNo}</h2>
            <div className={`px-4 py-2 rounded-md ${isPaymentComplete ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
              {paymentStatus}
            </div>
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-black dark:text-white">Invoice date</label>
            <input
              type="date"
              className="rounded border-[1.5px] border-stroke bg-transparent py-2 px-3 w-56 text-black outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
              value={invoiceEditDate}
              onChange={(e) => setInvoiceEditDate(e.target.value)}
            />
          </div>
        
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                 <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 whitespace-nowrap  tracking-wider">
                    Procedure
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500  whitespace-nowrap tracking-wider">
                    Procedure date
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 whitespace-nowrap  tracking-wider">
                    Rate
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 whitespace-nowrap  tracking-wider">
                    {' '}
                    Quantity
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 whitespace-nowrap  tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 whitespace-nowrap  tracking-wider">
                    Discount
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 whitespace-nowrap  tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 whitespace-nowrap  tracking-wider">
                    Deduct Discount
                  </th>
                  {/* <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 whitespace-nowrap  tracking-wider">
                    Doctor Share
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 whitespace-nowrap  tracking-wider">
                    Hospital Share
                  </th> */}
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 whitespace-nowrap  tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {procedures.map((item: ProcedureItem) => (
                                  <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="px-1 py-3 whitespace-nowrap">
                                      <div className="flex w-70 items-center">
                                      <AsyncPaginate
                  key={`procedure-select-${item.id}-${item.procedureId}`} // Crucial for resetting
                  name={`procedureId-${item.id}`}
                  value={
                    item.procedureId
                      ? {
                          value: item.procedureId,
                          label: item.procedure || 
                                proceduresList.find(p => p._id === item.procedureId)?.name || 
                                'Select Procedure',
                          procedureData: proceduresList.find(p => p._id === item.procedureId)
                        }
                      : null
                  }
                  loadOptions={loadProcedureOptions}
                  onChange={(option: ProcedureOption | null) => {
                    if (option) {
                      // Immediate local update
                      const updatedItem = {
                        ...item,
                        procedureId: option.value,
                        procedure: option.procedureData?.name || '',
                        description: option.procedureData?.name || '',
                        procedureDate: item.procedureDate,
                        rate: option.procedureData?.amount || 0,
                        amount: (option.procedureData?.amount || 0) * item.quantity,
                        cost: option.procedureData?.cost || 0
                      };
                      
                      // Update the procedures array
                      setProcedures(prev => 
                        prev.map(proc => proc.id === item.id ? updatedItem : proc)
                      );
                      
                      // Update proceduresList if needed
                      if (!proceduresList.some(p => p._id === option.value)) {
                        setProceduresList(prev => [...prev, option.procedureData]);
                      }
                    } else {
                      updateProcedure(item.id, 'procedureId', '');
                    }
                  }}
                  getOptionLabel={(option: ProcedureOption) => option.label}
                  getOptionValue={(option: ProcedureOption) => option.value}
                  placeholder="Select a procedure..."
                  additional={{ page: 1 }}
                  classNamePrefix="react-select"
                  className="w-full"
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  styles={{
                    menuPortal: base => ({ ...base, zIndex: 9999 }),
                    control: provided => ({ ...provided, minHeight: '42px' })
                  }}
                  cacheUniqs={[proceduresList]}
                  debounceTimeout={500}
                  keepSelectedInList={true}
                  closeMenuOnSelect={true}
                  // Critical additional props
                  defaultOptions={proceduresList.slice(0, 20).map(p => ({
                    value: p._id,
                    label: `${p.name}${p.amount ? ` (Rs. ${p.amount})` : ''}`,
                    procedureData: p
                  }))}
                  isOptionSelected={(option) => option.value === item.procedureId}
                  onMenuOpen={() => {
                    // Force refresh of options when menu opens
                    loadProcedureOptions('', [], { page: 1 });
                  }}
                />
                                      </div>
                                    </td>
                                    <td className="px-1 py-3 whitespace-nowrap">
                                      <input
                                        type="date"
                                        title="Dated lines bill; empty date counts as advance only"
                                        className="rounded border-[1.5px] border-stroke bg-transparent py-2 px-1 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                                        value={item.procedureDate}
                                        onChange={(e) =>
                                          updateProcedure(item.id, 'procedureDate', e.target.value)
                                        }
                                      />
                                    </td>
                                    <td className="px-1 py-3 whitespace-nowrap">
                                      <input
                                        type="number"
                                        className="min-w-[80px] rounded border-[1.5px] border-stroke bg-transparent py-2 px-1 w-20 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                                        value={item.rate}
                                        onChange={(e) =>
                                          updateProcedure(
                                            item.id,
                                            'rate',
                                            parseFloat(e.target.value),
                                          )
                                        }
                                        onWheel={handleNumberInputWheel}
                                        step="0.01"
                                        min="0"
                                      />
                                    </td>
                                    <td className="px-1 py-3 whitespace-nowrap">
                                      <input
                                        type="number"
                                        min="1"
                                        className="min-w-[60px] rounded border-[1.5px] border-stroke bg-transparent py-2 w-20 px-1 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                                        value={item.quantity}
                                        onChange={(e) =>
                                          updateProcedure(
                                            item.id,
                                            'quantity',
                                            parseInt(e.target.value),
                                          )
                                        }
                                        onWheel={handleNumberInputWheel}
                                      />
                                    </td>
                                    <td className="px-1 py-3 whitespace-nowrap font-medium">
                                      <input
                                        type="number"
                                        className="rounded border-[1.5px] bg-gray-2 border-stroke bg-transparent py-2 w-24 px-1 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                                        value={item.amount.toFixed(2)}
                                        disabled
                                      />
                                    </td>
                                    <td className="px-1 py-3 whitespace-nowrap">
                                      <input
                                        type="number"
                                        min="0"
                                        max={item.discountType === 0 ? item.amount : 100}
                                        className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-1 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                                        value={item.discount}
                                        onChange={(e) =>
                                          updateProcedure(
                                            item.id,
                                            'discount',
                                            parseFloat(e.target.value),
                                          )
                                        }
                                        onWheel={handleNumberInputWheel}
                                      />
                                    </td>
                                    <td className="px-1 py-3 whitespace-nowrap">
                                      <select
                                        className="rounded border-[1.5px] border-stroke bg-transparent py-2 w-20 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                                        value={item.discountType}
                                        onChange={(e) =>
                                          updateProcedure(
                                            item.id,
                                            'discountType',
                                            parseInt(e.target.value),
                                          )
                                        }
                                      >
                                        <option value={0}>Amount</option>
                                        <option value={1}>%age</option>
                                      </select>
                                    </td>
                                    <td className="px-1 py-3 whitespace-nowrap">
                                      <select
                                        className="rounded border-[1.5px] border-stroke bg-transparent py-2 w-32 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                                        value={item.deductDiscount}
                                        onChange={(e) =>
                                          updateProcedure(
                                            item.id,
                                            'deductDiscount',
                                            e.target.value,
                                          )
                                        }
                                      >
                                        <option value="Hospital & Doctor">
                                          Hospital & Doctor
                                        </option>
                                        <option value="Hospital">Hospital</option>
                                        <option value="Doctor">Doctor</option>
                                      </select>
                                    </td>
                                    {/* <td className="px-1 py-3 whitespace-nowrap">
                                      <input
                                        type="number"
                                        className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-1 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                                        value={item.doctorAmount.toFixed(2)}
                                        disabled
                                      />
                                    </td>
                                    <td className="px-1 py-3 whitespace-nowrap">
                                      <input
                                        type="number"
                                        className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-1 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                                        value={item.hospitalAmount.toFixed(2)}
                                        disabled
                                      />
                                    </td> */}
                                    <td className="px-1 py-3 whitespace-nowrap">
                                      <div className=' flex gap-3 items-center'>
                                        <button
                                        onClick={() => removeProcedure(item.id)}
                                        className="text-red-500 float-end  hover:text-red-700"
                                        title="Remove"
                                      >
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          className="h-6 w-6"
                                          viewBox="0 0 20 20"
                                          fill="currentColor"
                                        >
                                          <path
                                            fillRule="evenodd"
                                            d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                            clipRule="evenodd"
                                          />
                                        </svg>
                                      </button>
                                      <button
                                        onClick={() => openProcedureRefundModal(item)}
                                        className="text-orange-500 hover:text-orange-700"
                                        title="Refund Procedure"
                                      >
                                        <RiRefund2Line size={20} />
                                      </button>
                                      <button className={`text-primary ${!item.procedureId ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={!item.procedureId} onClick={() => { 
                                        const existing = localExpenses.find(e => e.procedureRowId === item.id || e.procedureId === item.procedureId) || null;
                                        setSelectedProcedureRowId(item.id);
                                        setEditingExpense(existing);
                                        setIsProcedureExpenseModalOpen(true); 
                                      }}>
                                        <BsFillFileEarmarkPdfFill size={20} className=' text-primary' />
                                      </button>
                
                                      </div>
                                    </td>
                                  </tr>
                                ))}
              </tbody>
            </table>
          </div>
          <div className='py-3 flex justify-end gap-3'>
            <button
              onClick={addProcedure}
              className="bg-primary text-white px-4 py-2 rounded-md flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add Procedure
            </button>
            {/* <button
              type="button"
              onClick={() => {
                const existing = localExpenses.find(e => e.procedureRowId == null) || null;
                setSelectedProcedureRowId(null);
                setEditingExpense(existing);
                setIsProcedureExpenseModalOpen(true);
              }}
              className="bg-primary text-white px-4 py-2 rounded-md flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add Invoice Expense
            </button> */}
          </div>
        </div>

        <AddProcedureExpense
          key={`proc-exp-${selectedProcedureRowId}-${editingExpense?._id || 'new'}`}
          isModalOpen={isProcedureExpenseModalOpen}
          setIsModalOpen={setIsProcedureExpenseModalOpen}
          selectedExpense={editingExpense}
          categories={categories}
          selectedProcedureId={selectedProcedureRowId}
          onLocalExpenseAdd={handleLocalExpenseAdd}
        />

        {/* Payment Section */}
        <div className="mb-8 bg-white p-4 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-700">Payment Installments</h2>
            <button
              onClick={addPaymentInstallment}
              className="bg-primary text-white px-4 py-2 rounded-md flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add Payment
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paymentInstallments.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <input
                        type="date"
                        className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                        value={item.date}
                        onChange={(e) => updatePaymentInstallment(item.id, 'date', e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <select
                        className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                        value={item.method}
                        onChange={(e) => updatePaymentInstallment(item.id, 'method', e.target.value)}
                      >
                        <option value="Cash">Cash</option>
                        <option value="Credit">Credit</option>
                        <option value="Card">Card</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Insurance">Insurance</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <input
                        type="number"
                        className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                        value={item.amount}
                        onChange={(e) => updatePaymentInstallment(item.id, 'amount', parseFloat(e.target.value))}
                        onWheel={handleNumberInputWheel}
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <input
                        type="text"
                        className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                        value={item.reference}
                        onChange={(e) => updatePaymentInstallment(item.id, 'reference', e.target.value)}
                        placeholder="Reference No."
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => removePaymentInstallment(item.id)}
                        className="text-red-500 hover:text-red-700"
                        title="Remove"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Remarks Section */}
        <div className="mb-8 bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2 text-gray-700">Remarks</h2>
          <textarea
            className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
            rows={3}
            placeholder="Enter any additional remarks here..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
        </div>

        {/* Summary Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">Invoice Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Sub Total:</span>
                <span className="font-medium">Rs. {calculateSubTotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Discount:</span>
                <span className="font-medium text-red-500">- Rs. {calculateTotalDiscount().toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax:</span>
                <span className="font-medium">Rs. 0.00</span>
              </div>
              <div className="flex justify-between">
                <span>Additional Expenses:</span>
                <span className="font-medium text-green-600">
                  + Rs. {calculateAdditionalExpensesTotal().toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Doctor Shares Deduction:</span>
                <span className="font-medium text-red-600">
                  - Rs. {calculateDoctorSharesDeduction().toFixed(2)}
                </span>
              </div>
              <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
                <span>Grand Total:</span>
                <span>Rs. {calculateGrandTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">Payment Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total Paid:</span>
                <span className="font-medium text-green-500">Rs. {calculateTotalPaid().toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Due Amount:</span>
                <span className={`font-medium ${calculateDue() > 0 ? 'text-red-500' : 'text-green-500'}`}>
                  Rs. {Math.abs(calculateDue()).toFixed(2)} {calculateDue() < 0 && '(Credit)'}
                </span>
              </div>
              <div className="border-t pt-2 mt-2 flex justify-between">
                <span>Doctor Share:</span>
                <span className="font-medium">Rs. {calculateTotalDoctorShare().toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Hospital Share:</span>
                <span className="font-medium">Rs. {calculateTotalHospitalShare().toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <button
            onClick={() => navigate('/invoice')}
            className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-md flex items-center"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="bg-primary text-white px-6 py-2 rounded-md flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
            </svg>
            Update Invoice
          </button>
        </div>
      </div>
      {refundModalOpen && (
        <div className="fixed inset-0 z-[1000]">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setRefundModalOpen(false)}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-xl bg-white rounded-lg shadow-lg">
              <div className="px-5 py-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-gray-700">
                    Procedure Refund{refundProcedure?.description ? ` - ${refundProcedure.description}` : ''}
                  </div>
                  <button
                    className="text-gray-500 hover:text-gray-700"
                    onClick={() => setRefundModalOpen(false)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="px-5 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="mb-1 text-xs font-medium text-bodydark">Method</div>
                    <select
                      className="w-full rounded border border-stroke bg-transparent px-3 py-2 text-black outline-none transition focus:border-primary dark:border-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                      value={refundForm.method}
                      onChange={(e) => setRefundForm({ ...refundForm, method: e.target.value })}
                    >
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Credit">Credit</option>
                    </select>
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-medium text-bodydark">Refund Amount</div>
                    <input
                      type="number"
                      min={0}
                      className="w-full rounded border border-stroke bg-transparent px-3 py-2 text-black outline-none transition focus:border-primary dark:border-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                      value={refundForm.paid}
                      onChange={(e) => setRefundForm({ ...refundForm, paid: e.target.value })}
                    />
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-medium text-bodydark">Pay Date</div>
                    <input
                      type="date"
                      className="w-full rounded border border-stroke bg-transparent px-3 py-2 text-black outline-none transition focus:border-primary dark:border-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                      value={refundForm.payDate}
                      onChange={(e) => setRefundForm({ ...refundForm, payDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-medium text-bodydark">Reference</div>
                    <input
                      type="text"
                      className="w-full rounded border border-stroke bg-transparent px-3 py-2 text-black outline-none transition focus:border-primary dark:border-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                      value={refundForm.reference}
                      onChange={(e) => setRefundForm({ ...refundForm, reference: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <div className="mb-1 text-xs font-medium text-bodydark">Notes</div>
                    <textarea
                      className="w-full rounded border border-stroke bg-transparent px-3 py-2 text-black outline-none transition focus:border-primary dark:border-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                      rows={3}
                      value={refundForm.notes}
                      onChange={(e) => setRefundForm({ ...refundForm, notes: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="px-5 py-3 border-t flex justify-end gap-2">
                <button
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
                  onClick={() => setRefundModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="bg-primary text-white px-4 py-2 rounded-md"
                  onClick={submitProcedureRefund}
                >
                  Record Refund
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
