import { useState, useEffect } from 'react';

import axios from 'axios';
import { Base_url } from '../../utils/Base_url';
import { localCalendarYmd } from '../../utils/dateLocal';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { BsFillFileEarmarkPdfFill } from 'react-icons/bs';
import AddProcedureExpense from './AddProcedureExpense';
import { expenseDeductBeforeDoctorShareTotal } from './invoiceExpenseUtils';
import { AsyncPaginate, LoadOptions } from 'react-select-async-paginate';
import AddPatients from '../Patients/AddPatients';

type Procedure = {
  _id: string;
  name: string;
  amount: number;
  cost?: number;
  departmentType: string;
};

type ProcedureItem = {
  id: number;
  procedureId: string;
  procedure: string;
  description: string;
  /** Service / procedure performed date — lines without a date count as advance-only */
  procedureDate: string;
  rate: number;
  quantity: number;
  amount: number;
  discount: number;
  discountType: number; // 0 = amount, 1 = percentage
  tax: number;
  deductDiscount: string; // 'Hospital & Doctor', 'Hospital', 'Doctor'
  performedBy: string;
  doctorAmount: number;
  hospitalAmount: number;
  cost: number; // Added cost field
};

function refId(value: unknown): string {
  if (value == null || value === '') return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && '_id' in value) {
    const idVal = (value as { _id: unknown })._id;
    if (idVal != null && idVal !== '') return String(idVal);
  }
  return '';
}

/** Avoid sending "" for ObjectId fields — Mongoose throws CastError → HTTP 500 */
function isMongoHex24(id: unknown): boolean {
  return /^[0-9a-fA-F]{24}$/i.test(String(refId(id) || '').trim());
}

function numField(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

type PaymentInstallment = {
  id: number;
  date: string;
  method: string;
  amount: number;
  reference: string;
  installmentPlan: string; // New field for installment plan
};

type User = {
  _id: string;
  name: string;
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
type ExpenseCategory = {
  _id: string;
  name: string;
};

export default function InvoiceCreation() {
    const [invoiceDate, setInvoiceDate] = useState<string>(() => localCalendarYmd());
  const [dateFormat, setDateFormat] = useState<string>('YYYY-MM-DD'); // Default format

  const [patientInfo, setPatientInfo] = useState<Patient | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [proceduresList, setProceduresList] = useState<Procedure[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [remarks, setRemarks] = useState('');
  const [invoiceDiscount, setInvoiceDiscount] = useState(0);
  const [invoiceDiscountType, setInvoiceDiscountType] = useState(0);
  const [searchError, setSearchError] = useState('');
   const navigate = useNavigate()
   const [isSubmitting, setIsSubmitting] = useState(false);
   
  const [procedures, setProcedures] = useState<ProcedureItem[]>(() => {
    const d = localCalendarYmd();
    return [
      {
        id: 1,
        procedureId: '',
        procedure: '',
        description: '',
        procedureDate: d,
        rate: 0,
        quantity: 1,
        amount: 0,
        discount: 0,
        discountType: 0,
        tax: 0,
        deductDiscount: 'Hospital & Doctor',
        performedBy: '',
        doctorAmount: 0,
        hospitalAmount: 0,
        cost: 0, // Initialize cost
      },
    ];
  });

  const [paymentInstallments, setPaymentInstallments] = useState<
    PaymentInstallment[]
  >([
    {
      id: 1,
      date: localCalendarYmd(),
      method: 'Cash',
      amount: 0,
      reference: '',
      installmentPlan: '', // New field
    },
  ]);

  const [localExpenses, setLocalExpenses] = useState<any[]>([]);
  const [selectedProcedureRowId, setSelectedProcedureRowId] = useState<number | null>(null);
  const [isAddPatientModalOpen, setIsAddPatientModalOpen] = useState(false);
  const [isProcedureExpenseModalOpen, setIsProcedureExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any | null>(null);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);

  const [invoiceNotes] = useState([
    'Procedures & Medicines once purchased are non-refundable.',
    'Purchased Packages Are Valid For 06 Months Only.',
  ]);
  const handleNumberInputWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.currentTarget.blur();
  };

  const normalizeInstallmentAmount = (value: string) => {
    if (value === '') return 0;
    return Math.max(0, Number(value) || 0);
  };

  const validateFirstInstallment = () => {
    if (!paymentInstallments.length) {
      toast.error('First payment installment is required');
      return false;
    }

    if ((Number(paymentInstallments[0]?.amount) || 0) <= 0) {
      toast.error('Please enter the first payment installment amount');
      return false;
    }

    return true;
  };

  const isProcDated = (item: ProcedureItem) =>
    !!(item.procedureDate && String(item.procedureDate).trim());

  /** Doctor / assisted / reception compulsory only when procedure date is today or earlier (not future / unconfirmed). */
  const isProcCostingRequired = (item: ProcedureItem): boolean => {
    if (!isProcDated(item)) return false;
    const ymd = String(item.procedureDate).trim().slice(0, 10);
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
    if (!m) return false;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const day = Number(m[3]);
    if (!y || !mo || !day) return false;
    const procStart = new Date(y, mo - 1, day);
    procStart.setHours(0, 0, 0, 0);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return procStart.getTime() <= todayStart.getTime();
  };

  const lineNetAfterDiscount = (item: ProcedureItem) => {
    const disc =
      item.discountType === 0 ? item.discount : item.amount * (item.discount / 100);
    return Math.max(0, item.amount - disc);
  };

  /** Same gross as `calculateShares` / `calculateDoctorGrossShareFromBundle` — % shares use this, not net. */
  const procedureLineGrossForSharePct = (item: ProcedureItem) =>
    numField(item.rate) * numField(item.quantity, 1);

  const undatedProcedureAdvance = () =>
    procedures.filter((p) => !isProcDated(p)).reduce((sum, p) => sum + lineNetAfterDiscount(p), 0);

  const calculateDoctorSharesTotal = () => {
    return localExpenses
      .filter((expense) => expense.procedureRowId != null)
      .reduce((sum, expense) => {
        const proc = procedures.find((p) => p.id === expense.procedureRowId);
        if (!proc) return sum;
        const pctBase = procedureLineGrossForSharePct(proc);
        const sharesTotal =
          expense.doctorShares?.reduce((shareSum: number, share: any) => {
            const val = Number(share.share ?? share.shareValue) || 0;
            const st = String(share.shareType || '').toLowerCase();
            const amt = st === 'percentage' ? pctBase * (val / 100) : val;
            return shareSum + amt;
          }, 0) || 0;
        return sum + sharesTotal;
      }, 0);
  };

  // Fetch procedures and users
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [proceduresRes, usersRes] = await Promise.all([
          axios.get(`${Base_url}/apis/procedure/get`),
          axios.get(`${Base_url}/apis/user/get?role=doctor`),
        ]);

        setProceduresList(proceduresRes?.data?.data || []);
        setUsersList(usersRes?.data?.data || []);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Patient search functionality
  useEffect(() => {
    const fetchPatients = async () => {
      if (searchTerm.trim() === '') {
        setSearchResults([]);
        setSearchError('');
        return;
      }

      try {
        const response = await axios.get(`${Base_url}/apis/patient/get`, {
          params: {
            search: searchTerm,
            page: 1,
            limit: 20,
          },
        });

        if (response.data.data && response.data.data.length > 0) {
          setSearchResults(response.data.data);
          setSearchError('');
        } else {
          setSearchResults([]);
          setSearchError('Patient not found');
        }
      } catch (error) {
        console.error('Error searching patients:', error);
        setSearchResults([]);
        setSearchError('Error searching patients');
      }
    };

    const debounceTimer = setTimeout(() => {
      fetchPatients();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  // Click outside to close search results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest('.patient-search-container')) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
  const getBundleForProcedureRow = (procedureRowId: number) =>
    localExpenses.find((b) => b?.procedureRowId === procedureRowId) || null;

  const getPrimaryDoctorProfile = (bundle: any) => {
    const raw = bundle?.primaryDoctorProfile;
    if (!raw || typeof raw !== 'object') return null;
    const doc = raw as Record<string, unknown>;
    const id = refId(doc._id);
    if (!id) return null;
    return {
      _id: id,
      name: String(doc.name || ''),
      sharePrice: doc.sharePrice != null ? String(doc.sharePrice) : undefined,
      shareType: doc.shareType != null ? String(doc.shareType) : undefined,
    };
  };

  const calculateDoctorGrossShareFromBundle = (bundle: any, gross: number) => {
    const validRows = (bundle?.doctorShares || []).filter((s: any) => {
      const id = refId(s?.doctorId ?? s?.userId ?? s?.doctor);
      const rawShare = Number(s?.share ?? s?.shareValue);
      return id && /^[0-9a-fA-F]{24}$/i.test(id) && Number.isFinite(rawShare) && rawShare > 0;
    });
    if (validRows.length === 0) return null;
    const total = validRows.reduce((sum: number, s: any) => {
      const rawShare = Number(s?.share ?? s?.shareValue) || 0;
      const isPct = String(s?.shareType || '').toLowerCase() === 'percentage';
      return sum + (isPct ? gross * (rawShare / 100) : rawShare);
    }, 0);
    return Math.min(total, gross);
  };
  const addProcedure = () => {
    setProcedures([
      ...procedures,
      {
        id: procedures.length + 1,
        procedureId: '',
        procedure: '',
        description: '',
        procedureDate: invoiceDate,
        rate: 0,
        quantity: 1,
        amount: 0,
        discount: 0,
        discountType: 0,
        tax: 0,
        deductDiscount: 'Hospital & Doctor',
        performedBy: '',
        doctorAmount: 0,
        hospitalAmount: 0,
        cost: 0, // Initialize cost
      },
    ]);
  };

  const removeProcedure = (id: number) => {
    setProcedures(procedures.filter((item) => item.id !== id));
  };
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await axios.get(`${Base_url}/apis/expenseCategory/get`, {
          params: { page: 1, limit: 1000 },
        });
        setCategories(res.data.data || []);
      } catch {
        setCategories([]);
      }
    };
    fetchCategories();
  }, []);

  const calculateShares = (item: ProcedureItem, bundle?: any) => {
    const gross = numField(item.rate) * numField(item.quantity, 1);
    const expenseDeduct = expenseDeductBeforeDoctorShareTotal(bundle?.expenses);
    const shareBaseGross = Math.max(0, gross - expenseDeduct);
    let discountAmount = numField(item.discount);

    if (item.discountType === 1) {
      discountAmount = gross * (numField(item.discount) / 100);
    }

    const net = Math.max(0, gross - discountAmount);

    const selectedDoctor = usersList.find((user) => user._id === item.performedBy);
    const primaryDoctorProfile = getPrimaryDoctorProfile(bundle);

    let doctorShareGross = 0;
    let hospitalShareGross = shareBaseGross;

    const manualDoctorShare = calculateDoctorGrossShareFromBundle(bundle, shareBaseGross);
    if (manualDoctorShare != null) {
      doctorShareGross = manualDoctorShare;
      hospitalShareGross = shareBaseGross - doctorShareGross;
    } else {
      const sharePrice =
        primaryDoctorProfile?.sharePrice != null && String(primaryDoctorProfile.sharePrice).trim() !== ''
          ? parseFloat(String(primaryDoctorProfile.sharePrice).replace(/,/g, ''))
          : selectedDoctor?.sharePrice != null && String(selectedDoctor.sharePrice).trim() !== ''
            ? parseFloat(String(selectedDoctor.sharePrice).replace(/,/g, ''))
            : NaN;
      if (Number.isFinite(sharePrice)) {
        const isPct =
          String(primaryDoctorProfile?.shareType || '').toLowerCase().includes('percent') ||
          String(selectedDoctor?.shareType || '')
            .toLowerCase()
            .includes('percent');
        doctorShareGross = isPct ? shareBaseGross * (sharePrice / 100) : sharePrice;
        doctorShareGross = Math.min(doctorShareGross, shareBaseGross);
        hospitalShareGross = shareBaseGross - doctorShareGross;
      }
    }

    let doctorShare = doctorShareGross;
    let hospitalShare = hospitalShareGross;

    switch (item.deductDiscount) {
      case 'Hospital & Doctor':
        doctorShare = Math.max(0, doctorShareGross - discountAmount / 2);
        hospitalShare = Math.max(0, hospitalShareGross - discountAmount / 2);
        break;
      case 'Hospital':
        hospitalShare = Math.max(0, hospitalShareGross - discountAmount);
        doctorShare = doctorShareGross;
        break;
      case 'Doctor':
        doctorShare = Math.max(0, doctorShareGross - discountAmount);
        hospitalShare = hospitalShareGross;
        break;
      default:
        break;
    }

    const sumAfter = doctorShare + hospitalShare;
    if (net <= 0) {
      doctorShare = 0;
      hospitalShare = 0;
    } else if (Math.abs(sumAfter - net) > 0.0001) {
      hospitalShare = Math.max(0, net - doctorShare);
      doctorShare = Math.max(0, net - hospitalShare);
    }

    return {
      doctorAmount: parseFloat(doctorShare.toFixed(2)),
      hospitalAmount: parseFloat(hospitalShare.toFixed(2)),
    };
  };

  const calculateShareBreakdown = (item: ProcedureItem, bundle?: any) => {
    const gross = numField(item.rate) * numField(item.quantity, 1);
    const selectedDoctor = usersList.find((user) => user._id === item.performedBy);
    const primaryDoctorProfile = getPrimaryDoctorProfile(bundle);

    let doctorShareGross = 0;
    let hospitalShareGross = gross;
    const manualDoctorShare = calculateDoctorGrossShareFromBundle(bundle, gross);
    if (manualDoctorShare != null) {
      doctorShareGross = manualDoctorShare;
      hospitalShareGross = gross - doctorShareGross;
    } else {
      const sharePrice =
        primaryDoctorProfile?.sharePrice != null && String(primaryDoctorProfile.sharePrice).trim() !== ''
          ? parseFloat(String(primaryDoctorProfile.sharePrice).replace(/,/g, ''))
          : selectedDoctor?.sharePrice != null && String(selectedDoctor.sharePrice).trim() !== ''
            ? parseFloat(String(selectedDoctor.sharePrice).replace(/,/g, ''))
            : NaN;
      if (Number.isFinite(sharePrice)) {
        const isPct =
          String(primaryDoctorProfile?.shareType || '').toLowerCase().includes('percent') ||
          String(selectedDoctor?.shareType || '').toLowerCase().includes('percent');
        doctorShareGross = Math.min(isPct ? gross * (sharePrice / 100) : sharePrice, gross);
        hospitalShareGross = gross - doctorShareGross;
      }
    }

    const finalShares = calculateShares(item, bundle);
    return {
      doctorShare: finalShares.doctorAmount,
      hospitalShare: finalShares.hospitalAmount,
      doctorDiscountBurden: Math.max(0, doctorShareGross - finalShares.doctorAmount),
      hospitalDiscountBurden: Math.max(0, hospitalShareGross - finalShares.hospitalAmount),
    };
  };

  const handleLocalExpenseAdd = (procedureRowId: number | null, bundle: any) => {
    const proc = procedureRowId != null ? procedures.find((p) => p.id === procedureRowId) : null;
    const payload = { procedureRowId, procedureId: proc?.procedureId || '', ...bundle };
    const primaryDoctorProfile = getPrimaryDoctorProfile(payload);
    if (primaryDoctorProfile) {
      setUsersList((prev) => {
        const idx = prev.findIndex((u) => u._id === primaryDoctorProfile._id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...primaryDoctorProfile };
          return next;
        }
        return [...prev, primaryDoctorProfile];
      });
    }
    setLocalExpenses((prev) => {
      const idx = prev.findIndex((e) => e.procedureRowId === procedureRowId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = payload;
        return next;
      }
      return [...prev, payload];
    });
    if (procedureRowId != null) {
      const firstDoc = bundle?.doctorShares?.find((s: any) => {
        const id = refId(s?.doctorId ?? s?.userId ?? s?.doctor);
        return id && /^[0-9a-fA-F]{24}$/i.test(id);
      });
      const docId = firstDoc ? refId(firstDoc.doctorId ?? firstDoc.userId ?? firstDoc.doctor) : '';
      setProcedures((prev) =>
        prev.map((p) => {
          if (p.id !== procedureRowId) return p;
          const next = docId ? { ...p, performedBy: docId } : p;
          const sh = calculateShares(next, payload);
          return { ...next, doctorAmount: sh.doctorAmount, hospitalAmount: sh.hospitalAmount };
        }),
      );
    }
    setIsProcedureExpenseModalOpen(false);
    setEditingExpense(null);
  };

  const updateProcedure = (
    id: number,
    field: keyof ProcedureItem,
    value: any,
  ) => {
    const updatedProcedures = procedures.map((item) => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };

        if (field === 'procedureId') {
          const selectedProcedure = proceduresList.find((p) => p._id === value);
          if (selectedProcedure) {
            updatedItem.procedure = selectedProcedure.name;
            updatedItem.description = selectedProcedure.name;
            updatedItem.rate = selectedProcedure.amount;
            updatedItem.amount =
              selectedProcedure.amount * updatedItem.quantity;
            // Set cost from procedure, but not shown in UI
            updatedItem.cost = selectedProcedure.cost || 0;
          }
        }

        // Validate and cap discount
        if (field === 'discount') {
          const maxDiscount = updatedItem.discountType === 0 ? updatedItem.amount : 100;
          if (value > maxDiscount) {
            toast.error(`Discount cannot exceed ${updatedItem.discountType === 0 ? 'the amount' : '100%'}`);
            updatedItem.discount = maxDiscount;
          }
        }

        if (field === 'rate') {
          // Update cost in proceduresList for this procedureId
          if (item.procedureId) {
            setProceduresList((prev) => prev.map((proc) =>
              proc._id === item.procedureId ? { ...proc, cost: value } : proc
            ));
            // API call to update cost in backend
            axios.put(`${Base_url}/apis/procedure/update/${item.procedureId}`, { cost: value })
              .then(() => {/* Optionally show success */})
              .catch(() => {/* Optionally show error */});
          }
          updatedItem.amount = Number(value) * Number(updatedItem.quantity);
        }

        if (field === 'quantity') {
          const oldQuantity = item.quantity;
          const newQuantity = Number(value);
          
          updatedItem.amount = Number(updatedItem.rate) * newQuantity;
          
          // Adjust discount proportionally when quantity changes and discount type is Amount (0)
          if (oldQuantity > 0 && updatedItem.discountType === 0 && item.discount > 0) {
            // Calculate discount ratio based on quantity change
            const quantityRatio = newQuantity / oldQuantity;
            updatedItem.discount = item.discount * quantityRatio;
            
            // Ensure discount doesn't exceed new amount
            if (updatedItem.discount > updatedItem.amount) {
              updatedItem.discount = updatedItem.amount;
            }
          }
        }

        if (
          field === 'procedureId' ||
          field === 'rate' ||
          field === 'quantity' ||
          field === 'discount' ||
          field === 'discountType' ||
          field === 'deductDiscount'
        ) {
          const shares = calculateShares(updatedItem, getBundleForProcedureRow(id));
          updatedItem.doctorAmount = shares.doctorAmount;
          updatedItem.hospitalAmount = shares.hospitalAmount;
        }

        if (field === 'performedBy') {
  const shares = calculateShares(updatedItem, getBundleForProcedureRow(id));
  updatedItem.doctorAmount = shares.doctorAmount;
  updatedItem.hospitalAmount = shares.hospitalAmount;
}

        if (field === 'procedureDate') {
          const shares = calculateShares(updatedItem, getBundleForProcedureRow(id));
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
    setPaymentInstallments([
      ...paymentInstallments,
      {
        id: paymentInstallments.length + 1,
        date: localCalendarYmd(),
        method: 'Cash',
        amount: 0,
        reference: '',
        installmentPlan: '', // New field
      },
    ]);
  };

  const removePaymentInstallment = (id: number) => {
    setPaymentInstallments(
      paymentInstallments.filter((item) => item.id !== id),
    );
  };

  const updatePaymentInstallment = (
    id: number,
    field: keyof PaymentInstallment,
    value: any,
  ) => {
    const updatedPayments = paymentInstallments.map((item) => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setPaymentInstallments(updatedPayments);
  };

  const calculateSubTotal = () => {
    return procedures.filter(isProcDated).reduce((sum, item) => sum + item.amount, 0);
  };

  const calculateProcedureDiscountTotal = () => {
    return procedures.filter(isProcDated).reduce((sum, item) => {
      if (item.discountType === 0) {
        return sum + item.discount;
      } else {
        return sum + item.amount * (item.discount / 100);
      }
    }, 0);
  };

  /** Patient bill: dated procedure lines only. Popup (costing) expenses are not added to grand total. */
  const calculateBillBeforeInvoiceDiscount = () => {
    let procedureNet = 0;
    for (const p of procedures) {
      if (!isProcDated(p)) continue;
      procedureNet += lineNetAfterDiscount(p);
    }
    return procedureNet;
  };

  const calculateInvoiceLevelDiscount = () => {
    const base = calculateBillBeforeInvoiceDiscount();
    if (base <= 0) return 0;
    if (invoiceDiscountType === 1) {
      return Math.min(base, Math.max(0, base * (numField(invoiceDiscount) / 100)));
    }
    return Math.min(base, Math.max(0, numField(invoiceDiscount)));
  };

  const calculateTotalDiscount = () =>
    calculateProcedureDiscountTotal() + calculateInvoiceLevelDiscount();

  const calculateGrandTotal = () =>
    Math.max(0, calculateBillBeforeInvoiceDiscount() - calculateInvoiceLevelDiscount());

  const calculateTotalPaid = () => {
    return paymentInstallments.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  };

  const calculateDue = () => {
    return calculateGrandTotal() - calculateTotalPaid();
  };

  const calculateTotalDoctorDiscountBurden = () =>
    procedures.reduce((sum, item) => {
      const breakdown = calculateShareBreakdown(item, getBundleForProcedureRow(item.id));
      return sum + breakdown.doctorDiscountBurden;
    }, 0);

  const calculateTotalHospitalDiscountBurden = () =>
    procedures.reduce((sum, item) => {
      const breakdown = calculateShareBreakdown(item, getBundleForProcedureRow(item.id));
      return sum + breakdown.hospitalDiscountBurden;
    }, 0);

  const calculateTotalDoctorShare = () =>
    procedures.reduce((sum, item) => {
      const breakdown = calculateShareBreakdown(item, getBundleForProcedureRow(item.id));
      return sum + breakdown.doctorShare;
    }, 0);

  const calculateTotalHospitalShare = () =>
    procedures.reduce((sum, item) => {
      const breakdown = calculateShareBreakdown(item, getBundleForProcedureRow(item.id));
      return sum + breakdown.hospitalShare;
    }, 0);

  const handleSaveDraft = async () => {
    setIsSubmitting(true);
    
    // Save to localStorage as draft
    const draftData = {
      patientInfo,
      invoiceDate,
      procedures,
      paymentInstallments,
      remarks,
      savedAt: new Date().toISOString(),
    };
    
    try {
      localStorage.setItem('invoiceDraft', JSON.stringify(draftData));
      toast.success('Draft saved successfully!');
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('Failed to save draft');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!patientInfo) {
      toast.error('Please select a patient');
      setIsSubmitting(false); // Add this line
      return;
    }

    const procedureDateToIso = (ds: string) => {
      const t = String(ds || '').trim();
      if (!t) return undefined;
      const [y, m, d] = t.split('-').map(Number);
      if (!y || !m || !d) return undefined;
      return new Date(y, m - 1, d, 12, 0, 0, 0).toISOString();
    };

   // Validate procedures (doctor / assisted / reception only for dates today or earlier — not future or blank)
    for (const item of procedures) {
      if (!item.procedureId) {
        toast.error(`Please select a procedure for item ${item.id}`);
        setIsSubmitting(false);
        return;
      }
      if (!isProcCostingRequired(item)) {
        // Validate discount doesn't exceed amount (all rows)
        const maxDiscount = item.discountType === 0 ? item.amount : 100;
        if (item.discount > maxDiscount) {
          toast.error(`Discount cannot exceed ${item.discountType === 0 ? 'amount' : '100%'} for procedure ${item.id}`);
          setIsSubmitting(false);
          return;
        }
        continue;
      }
      const costing = localExpenses.find((b) => b.procedureRowId === item.id);
      const hasDoctor = costing?.doctorShares?.some((s: any) => {
        const id = refId(s?.doctorId ?? s?.userId ?? s?.doctor);
        return id && /^[0-9a-fA-F]{24}$/i.test(id);
      });
      const hasPerformedBy =
        !!refId(item.performedBy) && /^[0-9a-fA-F]{24}$/i.test(String(refId(item.performedBy)));
      if (!hasDoctor && !hasPerformedBy) {
        toast.error(
          `Procedure "${item.procedure || item.id}" (${item.procedureDate}): open costing and add at least one doctor, or set Performed By.`,
        );
        setIsSubmitting(false);
        return;
      }
      const hasAssisted = (costing?.assistedBy || []).some(
        (s: any) => s?.userId && /^[0-9a-fA-F]{24}$/i.test(String(s.userId)),
      );
      if (!hasAssisted) {
        toast.error(
          `Procedure "${item.procedure || item.id}" (${item.procedureDate}): open costing and add at least one staff (Assisted By)`,
        );
        setIsSubmitting(false);
        return;
      }
      const hasReception = (costing?.receptionStaff || []).some(
        (s: any) => s?.userId && /^[0-9a-fA-F]{24}$/i.test(String(s.userId)),
      );
      if (!hasReception) {
        toast.error(
          `Procedure "${item.procedure || item.id}" (${item.procedureDate}): open costing and add at least one Reception staff`,
        );
        setIsSubmitting(false);
        return;
      }
      // Validate discount doesn't exceed amount
      const maxDiscount = item.discountType === 0 ? item.amount : 100;
      if (item.discount > maxDiscount) {
        toast.error(`Discount cannot exceed ${item.discountType === 0 ? 'amount' : '100%'} for procedure ${item.id}`);
        setIsSubmitting(false);
        return;
      }
    }

    const anyProcRequiringCosting = procedures.some((p) => isProcCostingRequired(p));

    let doctorId: string | undefined;
    if (anyProcRequiringCosting) {
      const headerProc = procedures.find((p) => isProcCostingRequired(p)) ?? procedures[0];
      const firstBundle = localExpenses.find((b) => b.procedureRowId === headerProc?.id) || {};
      const firstShareDoc = firstBundle.doctorShares?.find((s: any) => {
        const id = refId(s?.doctorId ?? s?.userId ?? s?.doctor);
        return id && /^[0-9a-fA-F]{24}$/i.test(id);
      });
      doctorId =
        (firstShareDoc ? refId(firstShareDoc.doctorId ?? firstShareDoc.userId ?? firstShareDoc.doctor) : '') ||
        refId(headerProc?.performedBy);
      if (!doctorId || String(doctorId).trim() === '') {
        toast.error(
          'Invoice needs a doctor: add doctor shares or Performed By on a procedure dated today or earlier.',
        );
        setIsSubmitting(false);
        return;
      }
    } else {
      const headerProc = procedures[0];
      const firstBundle = localExpenses.find((b) => b.procedureRowId === headerProc?.id) || {};
      const firstShareDoc = firstBundle.doctorShares?.find((s: any) => {
        const id = refId(s?.doctorId ?? s?.userId ?? s?.doctor);
        return id && /^[0-9a-fA-F]{24}$/i.test(id);
      });
      doctorId =
        (firstShareDoc ? refId(firstShareDoc.doctorId ?? firstShareDoc.userId ?? firstShareDoc.doctor) : '') ||
        refId(headerProc?.performedBy) ||
        undefined;
    }

    if (!validateFirstInstallment()) {
      setIsSubmitting(false);
      return;
    }

    const billingTotal = calculateGrandTotal();
    const paidSum = calculateTotalPaid();
    const rawDue = billingTotal - paidSum;
    
    // Require at least one payment installment
    // if (!paymentInstallments || paymentInstallments.length === 0) {
    //   toast.error('At least one payment installment is required');
    //   return;
    // }

    // New validation: At least one installment must have amount > 0
    // const hasValidInstallment = paymentInstallments.some((item) => item.amount > 0);
    // if (!hasValidInstallment) {
    //   toast.error('At least one payment installment must have an amount greater than 0');
    //   return;
    // }

 

    const invoiceData = {
      patientId: patientInfo._id,
      patientMr: patientInfo.mr,
      ...(isMongoHex24(doctorId) ? { doctorId } : {}),
      item: procedures.map((item) => {
        const bundle = localExpenses.find((b) => b.procedureRowId === item.id) || {};
        const resolvedShares = calculateShares(item, bundle);
        const shownExpenses = (bundle.expenses || []).filter((e: any) =>
          isMongoHex24(e?.expenseCategoryId ?? e?.categoryId ?? e?.category),
        );
        const shares = (bundle.doctorShares || [])
          .filter((share: any) => {
            const id = refId(share?.doctorId ?? share?.userId ?? share?.doctor);
            const isHex24 = /^[0-9a-fA-F]{24}$/i.test(id);
            const val = Number(share.share ?? share.shareValue);
            return isHex24 && Number.isFinite(val);
          })
          .map((share: any) => {
            const val = Number(share.share ?? share.shareValue) || 0;
            const st = String(share.shareType || '').toLowerCase();
            const grossLine = numField(item.rate) * numField(item.quantity, 1);
            const amount = st === 'percentage' ? grossLine * (val / 100) : val;
            return {
              doctorId: refId(share.doctorId ?? share.userId ?? share.doctor),
              shareType: st === 'percentage' ? 'percentage' : 'value',
              shareValue: val,
              amount,
            };
          });
        const primaryRow = (bundle.doctorShares || []).find((s: any) => {
          const id = refId(s?.doctorId ?? s?.userId ?? s?.doctor);
          return id && /^[0-9a-fA-F]{24}$/i.test(id);
        });
        const primaryDoc =
          (primaryRow ? refId(primaryRow.doctorId ?? primaryRow.userId ?? primaryRow.doctor) : '') ||
          item.performedBy;
        const performedBySave = refId(primaryDoc);
        const amt = numField(item.amount);
        const disc = numField(item.discount);
        const qty = numField(item.quantity, 1);
        const lineTotal =
          amt - (item.discountType === 0 ? disc : amt * (disc / 100));
        return {
        procedureId: item.procedureId,
        description:
          [item.procedure, item.procedureDate].filter(Boolean).join(' — ') ||
          item.description ||
          item.procedure,
        procedureDate: procedureDateToIso(item.procedureDate),
        rate: numField(item.rate),
        quantity: qty,
        amount: amt,
        discount: disc,
        discountType: numField(item.discountType),
        tax: numField(item.tax),
        total: lineTotal,
        deductDiscount: item.deductDiscount,
        ...(isMongoHex24(performedBySave) ? { performedBy: performedBySave } : {}),
        assistedBy: (bundle.assistedBy || [])
          .map((x: { userId?: string }) => x?.userId)
          .filter((uid: string | undefined): uid is string => !!uid && isMongoHex24(uid)),
        receptionStaff: (bundle.receptionStaff || [])
          .map((x: { userId?: string }) => x?.userId)
          .filter((uid: string | undefined): uid is string => !!uid && isMongoHex24(uid)),
        doctorAmount: numField(resolvedShares.doctorAmount),
        hospitalAmount: numField(resolvedShares.hospitalAmount),
         expenses: shownExpenses,
         doctorShares: shares,
         consumptions: (bundle.consumptions || []).filter((c: any) => isMongoHex24(c?.pharmItemId)),
        };
      }),
      invoiceExpenses: (localExpenses.find(e => e.procedureRowId == null)?.expenses || []).filter(
        (exp: any) => isMongoHex24(exp?.expenseCategoryId ?? exp?.categoryId),
      ),
      invoiceConsumptions: (localExpenses.find(e => e.procedureRowId == null)?.consumptions || []).filter((c: any) =>
        isMongoHex24(c?.pharmItemId),
      ),
      subTotalBill: calculateSubTotal(),
      discountBill: calculateTotalDiscount(),
      invoiceDiscount: numField(invoiceDiscount),
      invoiceDiscountType: numField(invoiceDiscountType),
      taxBill: 0,
       invoiceDate: invoiceDate,
      totalBill: billingTotal,
      duePay: rawDue > 0 ? rawDue : 0,
      // Advance = sirf wahi paid amount jo billed (dated procedures) se zyada hai.
      // Pehle `undatedAdv` ko bhi add kiya ja raha tha jo same paisa double count karta tha
      // (e.g. 50k paid for an undated procedure → 50k + 50k = 100k advance shown). Fixed.
      advancePay: rawDue < 0 ? Math.abs(rawDue) : 0,
      totalPay: calculateTotalPaid(),
      payment: paymentInstallments.map((payment) => ({
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
        reference: payment.reference,
      })),
      note: remarks,
    };

    try {
      const response = await axios.post(
        `${Base_url}/apis/invoice/create`,
        invoiceData,
      );
      console.log('Invoice created successfully:', response.data);
      toast.success('Invoice created successfully!'); 
       navigate('/invoice');
    } catch (error: unknown) {
      const ax = error as { response?: { data?: { error?: string; message?: string } } };
      const data = ax.response?.data;
      console.error('Detailed error:', data ?? (error instanceof Error ? error.message : error));
      toast.error(
        data?.error ||
          data?.message ||
          (error instanceof Error ? error.message : 'An error occurred while creating invoice'),
      );
    }finally {
    setIsSubmitting(false); 
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

  if (isLoading) {
    return (
      <>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="">
        <h1 className="text-lg font-bold mb-6 text-primary">Create Invoice</h1>

        {/* Procedures Section */}
        <div className="mb-8 bg-white p-4 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-700">Procedures</h2>
          </div>
          <div>
               <label className="mb-2 block text-black dark:text-white">
              Date
            </label>
            <input
              type="date"
              className="rounded border-[1.5px] border-stroke bg-transparent py-2 px-3 w-56 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
              value={invoiceDate}
              onChange={(e) => {
                const v = e.target.value;
                const prevTop = invoiceDate;
                setInvoiceDate(v);
                setProcedures((prev) => {
                  const allEmptyOrSameAsTop = prev.every(
                    (p) => !String(p.procedureDate || '').trim() || p.procedureDate === prevTop,
                  );
                  if (!allEmptyOrSameAsTop) return prev;
                  return prev.map((p) => ({ ...p, procedureDate: v }));
                });
              }}
            />
          </div>
          <div className="mb-4 relative patient-search-container">
            <div className="flex justify-between items-center mb-2.5">
              <label className="block text-black dark:text-white">
                Patient
              </label>
              <button
                type="button"
                onClick={() => setIsAddPatientModalOpen(true)}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-opacity-90 transition"
              >
                + Add Patient
              </button>
            </div>
            <input
              placeholder="Search By Name, MR# or Phone"
              className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
            />

            {showSearchResults && (
              <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md max-h-60 overflow-auto">
                {searchResults.length > 0
                  ? searchResults.map((patient) => (
                      <div
                        key={patient._id}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100"
                        onClick={() => {
                          setPatientInfo({
                            _id: patient._id,
                            mr: patient.mr,
                            name: patient.name,
                            gender: patient.gender,
                            phone: patient.phone,
                          });
                          setSearchTerm(`${patient.name} (MR# ${patient.mr})`);
                          setShowSearchResults(false);
                          setSearchError('');
                        }}
                      >
                        {patient.name} (MR# {patient.mr}) - {patient.phone}
                      </div>
                    ))
                  : searchError && (
                      <div className="px-4 py-2 text-red-500">
                        {searchError}
                      </div>
                    )}
              </div>
            )}
          </div>

          {patientInfo && (
            <div className="mb-4 bg-gray-50 p-3 rounded-md">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">
                    Patient Name
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {patientInfo.name}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">
                    MR Number
                  </label>
                  <p className="mt-1 text-sm text-gray-900">{patientInfo.mr}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">
                    Phone
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {patientInfo.phone}
                  </p>
                </div>
              </div>
            </div>
          )}

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
                        title="Procedure date bills this row; rows without date count toward advance only"
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
                   
                      <button className={`text-primary ${!item.procedureId ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={!item.procedureId} onClick={() => { 
                        const existing =
                          localExpenses.find((e) => e.procedureRowId === item.id) || null;
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
            <p className="text-sm text-gray-600 mt-2">
              Rows with a procedure date count toward this invoice&apos;s bill. Rows without a date are treated as
              advance-only until you add a date.
            </p>
          </div>
          <div className="py-3 flex justify-end gap-3">
            <button
              onClick={addProcedure}
              className="bg-primary text-white px-4 py-2 rounded-md flex items-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-1"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                  clipRule="evenodd"
                />
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-1"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
              Add Invoice Expense
            </button> */}
          </div>
        </div>

        {/* Pharmacy Consumption Section */}
        {localExpenses.some(expense => expense.consumptions?.length > 0) && (
          <div className="mb-8 bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">Pharmacy Consumption</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 tracking-wider">Procedure</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 tracking-wider">Item</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 tracking-wider">Quantity</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 tracking-wider">Batch</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {localExpenses.flatMap((expense, expenseIndex) =>
                    (expense.consumptions || []).map((consumption: any, consIndex: number) => {
                      const procedure = procedures.find(p => p.id === expense.procedureRowId);
                      return (
                        <tr key={`cons-${expenseIndex}-${consIndex}`} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{procedure?.procedure || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{consumption.itemName || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{consumption.qty || 0}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{consumption.batchNumber || 'N/A'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

       
        {/* Payment Section */}
        <div className="mb-8 bg-white p-4 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-700">
              Payment Installments
            </h2>
            <button
              onClick={addPaymentInstallment}
              className="bg-primary text-white px-4 py-2 rounded-md flex items-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-1"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
              Add Payment
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500  tracking-wider">
                    <div className="flex items-center gap-2">
                      <span>Date</span>
                      <select
                        value={dateFormat}
                        onChange={(e) => setDateFormat(e.target.value)}
                        className="text-xs border rounded px-2 py-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="DD-MM-YYYY">DD-MM-YYYY</option>
                      </select>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500  tracking-wider">
                    Method
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500  tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500  tracking-wider">
                    Reference
                  </th>
                  
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500  tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paymentInstallments.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          className="rounded border-[1.5px] border-stroke bg-transparent py-2 px-1 w-40 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                          value={item.date}
                          onChange={(e) =>
                            updatePaymentInstallment(
                              item.id,
                              'date',
                              e.target.value,
                            )
                          }
                        />
                        {item.date && (
                          <span className="text-sm text-gray-600 min-w-[100px]">
                            {(() => {
                              const date = new Date(item.date);
                              const day = String(date.getDate()).padStart(2, '0');
                              const month = String(date.getMonth() + 1).padStart(2, '0');
                              const year = date.getFullYear();
                              
                              switch(dateFormat) {
                                case 'DD/MM/YYYY':
                                  return `${day}/${month}/${year}`;
                                case 'MM/DD/YYYY':
                                  return `${month}/${day}/${year}`;
                                case 'DD-MM-YYYY':
                                  return `${day}-${month}-${year}`;
                                default:
                                  return `${year}-${month}-${day}`;
                              }
                            })()}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <select
                        className="rounded border-[1.5px] border-stroke bg-transparent py-2 px-1 w-40 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                        value={item.method}
                        onChange={(e) =>
                          updatePaymentInstallment(
                            item.id,
                            'method',
                            e.target.value,
                          )
                        }
                      >
                        <option value="Cash">Cash</option>
                        <option value="Advance">Advance</option>
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
                        min={0}
                        className="rounded border-[1.5px] border-stroke bg-transparent py-2 px-1 w-40 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                        value={(Number(item.amount) || 0) === 0 ? '' : item.amount}
                        placeholder="Enter amount"
                        onChange={(e) =>
                          updatePaymentInstallment(
                            item.id,
                            'amount',
                            normalizeInstallmentAmount(e.target.value),
                          )
                        }
                        onWheel={handleNumberInputWheel}
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <input
                        type="text"
                        className="rounded border-[1.5px] border-stroke bg-transparent py-2 px-1 w-40 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                        value={item.reference}
                        onChange={(e) =>
                          updatePaymentInstallment(
                            item.id,
                            'reference',
                            e.target.value,
                          )
                        }
                        placeholder="Reference No."
                      />
                    </td>
                   
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => removePaymentInstallment(item.id)}
                        disabled={paymentInstallments.length === 1}
                        className={`text-red-500 hover:text-red-700 ${
                          paymentInstallments.length === 1
                            ? 'cursor-not-allowed opacity-50'
                            : ''
                        }`}
                        title={
                          paymentInstallments.length === 1
                            ? 'First installment is required'
                            : 'Remove'
                        }
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Expenses Section - Only show if there are expenses with showInPrint */}
        {localExpenses.some(expense => expense.expenses?.some(exp => exp.showInPrint)) && (
          <div className="mb-8 bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">Additional Expenses</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 tracking-wider">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 tracking-wider">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 tracking-wider">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {localExpenses.map((expense, expenseIndex) =>
                    expense.expenses
                      ?.filter(exp => exp.showInPrint)
                      .map((exp, expIndex) => (
                        <tr key={`${expenseIndex}-${expIndex}`} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {exp.categoryName || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {exp.description || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            Rs. {(exp.amount || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Doctor Shares Section - shows deductions applied */}
        {/* {localExpenses.some(expense => (expense.doctorShares?.length || 0) > 0) && (
          <div className="mb-8 bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">Doctor Shares</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 tracking-wider">
                      Doctor
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 tracking-wider">
                      Deduction
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {localExpenses.flatMap((expense, expenseIndex) =>
                    (expense.doctorShares || []).map((share: any, shareIndex: number) => {
                      const doctor = usersList.find(u => u._id === share.doctorId);
                      const procRow = procedures.find((p) => p.id === expense.procedureRowId);
                      const pctBase = procRow ? procedureLineGrossForSharePct(procRow) : 0;
                      const val = share.share || 0;
                      const amount = share.shareType === 'percentage' ? pctBase * (val / 100) : val;
                      return (
                        <tr key={`ds-${expenseIndex}-${shareIndex}`} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {doctor?.name || 'Doctor'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {share.shareType === 'percentage' ? `${val}%` : 'Value'}
                          </td>
                          <td className="px-4 py-3 text-sm text-red-600">
                            - Rs. {amount.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )} */}

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
            <h3 className="text-lg font-semibold mb-4 text-gray-700">
              Invoice Summary
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Sub Total:</span>
                <span className="font-medium">
                  Rs. {calculateSubTotal().toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Procedure Discount:</span>
                <span className="font-medium text-red-500">
                  - Rs. {calculateProcedureDiscountTotal().toFixed(2)}
                </span>
              </div>
              <div className="rounded border border-stroke p-2">
                <div className="flex items-center justify-between gap-3">
                  <span>Total Invoice Discount:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={invoiceDiscountType === 1 ? 100 : undefined}
                      value={invoiceDiscount === 0 ? '' : invoiceDiscount}
                      placeholder="0"
                      onWheel={handleNumberInputWheel}
                      onChange={(e) =>
                        setInvoiceDiscount(
                          Math.max(
                            0,
                            invoiceDiscountType === 1
                              ? Math.min(100, Number(e.target.value) || 0)
                              : Number(e.target.value) || 0,
                          ),
                        )
                      }
                      className="w-28 rounded border border-stroke px-2 py-1"
                    />
                    <select
                      value={invoiceDiscountType}
                      onChange={(e) => {
                        const nextType = Number(e.target.value) || 0;
                        setInvoiceDiscountType(nextType);
                        if (nextType === 1 && invoiceDiscount > 100) setInvoiceDiscount(100);
                      }}
                      className="rounded border border-stroke px-2 py-1"
                    >
                      <option value={0}>Amount</option>
                      <option value={1}>%</option>
                    </select>
                  </div>
                </div>
                <div className="mt-2 flex justify-between text-sm">
                  <span>Applied Invoice Discount:</span>
                  <span className="font-medium text-red-500">
                    - Rs. {calculateInvoiceLevelDiscount().toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="flex justify-between">
                <span>Total Discount:</span>
                <span className="font-medium text-red-500">
                  - Rs. {calculateTotalDiscount().toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Tax:</span>
                <span className="font-medium">Rs. 0.00</span>
              </div>
              {undatedProcedureAdvance() > 0 && (
                <div className="flex justify-between">
                  <span>Procedure Advance:</span>
                  <span className="font-medium text-amber-600">
                    Rs. {undatedProcedureAdvance().toFixed(2)}
                  </span>
                </div>
              )}
              {localExpenses.some(expense => expense.expenses?.some(exp => exp.showInPrint)) && (
                <div className="flex flex-col gap-0.5">
                  <div className="flex justify-between">
                    <span>Additional Expenses (print / costing):</span>
                    <span className="font-medium text-green-600">
                      Rs.{' '}
                      {localExpenses
                        .reduce(
                          (sum, expense) =>
                            sum +
                            (expense.expenses
                              ?.filter((exp) => exp.showInPrint)
                              .reduce((expSum, exp) => expSum + (exp.amount || 0), 0) || 0),
                          0,
                        )
                        .toFixed(2)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">Not included in grand total.</span>
                </div>
              )}
              {localExpenses.some(expense => (expense.doctorShares?.length || 0) > 0) && (
                <div className="flex justify-between">
                  <span className="text-gray-700">Doctor shares (costing reference):</span>
                  <span className="font-medium text-gray-700">
                    Rs. {calculateDoctorSharesTotal().toFixed(2)}
                  </span>
                </div>
              )}
              <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
                <span>Grand Total:</span>
                <span>Rs. {calculateGrandTotal().toFixed(2)}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Expenses from the costing popup are not added to grand total or due amount.
              </p>
              
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">
              Payment Summary
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total Paid:</span>
                <span className="font-medium text-green-500">
                  Rs. {calculateTotalPaid().toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Due Amount:</span>
                <span
                  className={`font-medium ${
                    calculateDue() > 0 ? 'text-red-500' : 'text-green-500'
                  }`}
                >
                  Rs. {Math.abs(calculateDue()).toFixed(2)}{' '}
                  {calculateDue() < 0 && '(Credit)'}
                </span>
              </div>
              <div className="border-t pt-2 mt-2 flex justify-between">
                <span className="text-gray-700">Doctor Share:</span>
                <span className="font-medium text-red-600">
                  - Rs. {calculateTotalDoctorDiscountBurden().toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Hospital Share:</span>
                <span className="font-medium text-red-600">
                  - Rs. {calculateTotalHospitalDiscountBurden().toFixed(2)}
                </span>
              </div>
             
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <button 
            onClick={handleSaveDraft}
            disabled={isSubmitting}
            className="bg-primary hover:bg-gray-600 text-white px-6 py-2 rounded-md flex items-center disabled:opacity-75"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-1"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0v12h8V4H6z"
                clipRule="evenodd"
              />
            </svg>
            Save Draft
          </button>
          <button
  onClick={handleSubmit}
  disabled={isSubmitting}
  className="bg-primary text-white px-6 py-2 rounded-md flex items-center disabled:opacity-75"
>
  {isSubmitting ? (
    <>
      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Processing...
    </>
  ) : (
    <>
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
      </svg>
      Create Invoice
    </>
  )}
</button>
        </div>
      </div>


      <AddProcedureExpense
        isModalOpen={isProcedureExpenseModalOpen}
        setIsModalOpen={setIsProcedureExpenseModalOpen}
        selectedExpense={editingExpense}
        categories={categories}
        selectedProcedureId={selectedProcedureRowId}
        procedureDate={procedures.find((p) => p.id === selectedProcedureRowId)?.procedureDate}
        performedBy={procedures.find((p) => p.id === selectedProcedureRowId)?.performedBy}
        onLocalExpenseAdd={handleLocalExpenseAdd}
      />

      {/* Add Patient Modal */}
      <AddPatients
        isModalOpen={isAddPatientModalOpen}
        setIsModalOpen={setIsAddPatientModalOpen}
        closeModal={() => setIsAddPatientModalOpen(false)}
        fetchPatientData={() => {
          // Refresh patient search after adding new patient
          setSearchTerm('');
          setSearchResults([]);
        }}
      />

    </>
  );
}
