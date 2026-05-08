import { useState, useEffect } from 'react';

import axios from 'axios';
import { Base_url } from '../../utils/Base_url';
import { localCalendarYmd } from '../../utils/dateLocal';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { BsFillFileEarmarkPdfFill } from 'react-icons/bs';
import AddProcedureExpense from './AddProcedureExpense';
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

  // Auto-update payment when grand total changes
  useEffect(() => {
    const grandTotal = calculateGrandTotal();
    if (paymentInstallments.length > 0) {
      setPaymentInstallments(prev => prev.map((payment, index) => 
        index === 0 ? { ...payment, amount: grandTotal } : payment
      ));
    }
  }, [procedures]);

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

  const calculateDoctorShareBase = () => {
    const procedureTotal = calculateSubTotal() - calculateTotalDiscount();
    const preDoctorShareDeductExpenses = localExpenses
      .filter((expense) => {
        if (expense.procedureRowId == null) return false;
        const proc = procedures.find((p) => p.id === expense.procedureRowId);
        return proc ? isProcDated(proc) : false;
      })
      .reduce((sum, expense) => {
      const deductSum = expense.expenses
        ?.filter((exp: any) => exp.deductBeforeDoctorShare)
        .reduce((expSum: number, exp: any) => expSum + (exp.amount || 0), 0) || 0;
      return sum + deductSum;
    }, 0);
    return Math.max(0, procedureTotal - preDoctorShareDeductExpenses);
  };

  const calculateDoctorSharesTotal = () => {
    const base = calculateDoctorShareBase();
    return localExpenses
      .filter((expense) => {
        if (expense.procedureRowId == null) return false;
        const proc = procedures.find((p) => p.id === expense.procedureRowId);
        return proc ? isProcDated(proc) : false;
      })
      .reduce((sum, expense) => {
      const sharesTotal =
        expense.doctorShares
          ?.reduce((shareSum: number, share: any) => {
            const val = share.share || 0;
            const amt = share.shareType === 'percentage' ? base * (val / 100) : val;
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

  const calculateShares = (item: ProcedureItem) => {
  const totalAmount = item.rate * item.quantity;
  let discountAmount = item.discount;

  if (item.discountType === 1) { 
    discountAmount = totalAmount * (item.discount / 100);
  }

  const remainingAmount = totalAmount - discountAmount;

  const selectedDoctor = usersList.find(user => user._id === item.performedBy);
    
  let doctorShare = 0;
  let hospitalShare = remainingAmount; 

  if (selectedDoctor && selectedDoctor.sharePrice && selectedDoctor.shareType) {
    const sharePrice = parseFloat(selectedDoctor.sharePrice);
    
    if (selectedDoctor.shareType === 'percentage') {
      doctorShare = totalAmount * (sharePrice / 100);
    } else {
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
      const payload = { procedureRowId, procedureId: proc?.procedureId || '', ...bundle };
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = payload;
        return next;
      }
      return [...prev, payload];
    });
    if (procedureRowId != null) {
      const firstDoc = bundle?.doctorShares?.find(
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
          field === 'discount' ||
          field === 'discountType' ||
          field === 'deductDiscount'
        ) {
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

  const calculateTotalDiscount = () => {
    return procedures.filter(isProcDated).reduce((sum, item) => {
      if (item.discountType === 0) {
        return sum + item.discount;
      } else {
        return sum + item.amount * (item.discount / 100);
      }
    }, 0);
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

   // Validate procedures
    for (const item of procedures) {
      if (!item.procedureId) {
        toast.error(`Please select a procedure for item ${item.id}`);
        setIsSubmitting(false);
        return;
      }
      const costing = localExpenses.find((b) => b.procedureRowId === item.id);
      const hasDoctor = costing?.doctorShares?.some(
        (s: any) => s.doctorId && /^[0-9a-fA-F]{24}$/i.test(String(s.doctorId)),
      );
      if (!hasDoctor) {
        toast.error(
          `Procedure "${item.procedure || item.id}": open costing (document icon) and add at least one doctor`,
        );
        setIsSubmitting(false);
        return;
      }
      // Staff (Assisted By) compulsory
      const hasAssisted = (costing?.assistedBy || []).some(
        (s: any) => s?.userId && /^[0-9a-fA-F]{24}$/i.test(String(s.userId)),
      );
      if (!hasAssisted) {
        toast.error(
          `Procedure "${item.procedure || item.id}": open costing (document icon) and add at least one staff (Assisted By)`,
        );
        setIsSubmitting(false);
        return;
      }
      // Reception staff compulsory
      const hasReception = (costing?.receptionStaff || []).some(
        (s: any) => s?.userId && /^[0-9a-fA-F]{24}$/i.test(String(s.userId)),
      );
      if (!hasReception) {
        toast.error(
          `Procedure "${item.procedure || item.id}": open costing (document icon) and add at least one Reception staff`,
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

    const firstProc = procedures[0];
    const firstBundle = localExpenses.find((b) => b.procedureRowId === firstProc?.id) || {};
    const doctorId =
      firstBundle.doctorShares?.find(
        (s: any) => s.doctorId && /^[0-9a-fA-F]{24}$/i.test(String(s.doctorId)),
      )?.doctorId || procedures[0]?.performedBy;
    if (!doctorId || String(doctorId).trim() === '') {
      toast.error('Add at least one doctor in costing for the first procedure');
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
      
      doctorId: doctorId,
      item: procedures.map((item) => {
        const bundle = localExpenses.find((b) => b.procedureRowId === item.id) || {};
        const shownExpenses = bundle.expenses || [];
        const shares = (bundle.doctorShares || [])
          .filter((share: any) => {
            const id = String(share.doctorId || '');
            const isHex24 = /^[0-9a-fA-F]{24}$/.test(id);
            const val = Number(share.share);
            return isHex24 && Number.isFinite(val) && val > 0;
          })
          .map((share: any) => {
            const base = calculateDoctorShareBase();
            const val = Number(share.share) || 0;
            const amount = share.shareType === 'percentage' ? base * (val / 100) : val;
            return {
              doctorId: String(share.doctorId),
              shareType: share.shareType,
              shareValue: val,
              amount,
            };
          });
        const primaryDoc =
          (bundle.doctorShares || []).find((s: any) =>
            s.doctorId && /^[0-9a-fA-F]{24}$/i.test(String(s.doctorId)),
          )?.doctorId || item.performedBy;
        return ({
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
        tax: item.tax,
        total:
          item.amount -
          (item.discountType === 0
            ? item.discount
            : item.amount * (item.discount / 100)),
        performedBy: primaryDoc,
        assistedBy: (bundle.assistedBy || [])
          .map((x: { userId?: string }) => x?.userId)
          .filter(Boolean),
        receptionStaff: (bundle.receptionStaff || [])
          .map((x: { userId?: string }) => x?.userId)
          .filter(Boolean),
        doctorAmount: item.doctorAmount,
        hospitalAmount: item.hospitalAmount,
         expenses: shownExpenses,
         doctorShares: shares,
         consumptions: bundle.consumptions || [],
        });
      }),
      invoiceExpenses: (localExpenses.find(e => e.procedureRowId == null)?.expenses || []).filter((exp: any) => exp.showInPrint),
      invoiceConsumptions: localExpenses.find(e => e.procedureRowId == null)?.consumptions || [],
      subTotalBill: calculateSubTotal(),
      discountBill: calculateTotalDiscount(),
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
    } catch (error) {
      console.error('Detailed error:', error.response?.data || error.message);
      toast.error(
        error.response?.data?.message ||
          'An error occurred while creating invoice',
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

        {localExpenses.some(expense => expense.doctorShares?.length > 0) && (
          <div className="mb-8 bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">Doctor Shares</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 tracking-wider">Procedure</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 tracking-wider">Doctor</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 tracking-wider">Share</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 tracking-wider">Type</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {localExpenses.flatMap((expense, expenseIndex) =>
                    (expense.doctorShares || []).map((share: any, shareIndex: number) => {
                      const procedure = procedures.find(p => p.id === expense.procedureRowId);
                      return (
                        <tr key={`doc-${expenseIndex}-${shareIndex}`} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{procedure?.procedure || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{share.doctorId || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{Number.isFinite(share.share) ? share.share : 0}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{share.shareType || 'value'}</td>
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
                        className="rounded border-[1.5px] border-stroke bg-transparent py-2 px-1 w-40 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                        value={item.amount}
                        onChange={(e) =>
                          updatePaymentInstallment(
                            item.id,
                            'amount',
                            parseFloat(e.target.value),
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
                        className="text-red-500 hover:text-red-700"
                        title="Remove"
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
        {localExpenses.some(expense => (expense.doctorShares?.length || 0) > 0) && (
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
                      const base = calculateDoctorShareBase();
                      const val = share.share || 0;
                      const amount = share.shareType === 'percentage' ? base * (val / 100) : val;
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
        )}

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
                <span>Discount:</span>
                <span className="font-medium text-red-500">
                  - Rs. {calculateTotalDiscount().toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Tax:</span>
                <span className="font-medium">Rs. 0.00</span>
              </div>
              {localExpenses.some(expense => expense.expenses?.some(exp => exp.showInPrint)) && (
                <div className="flex justify-between">
                  <span>Additional Expenses:</span>
                  <span className="font-medium text-green-600">
                    + Rs. {localExpenses
                      .reduce((sum, expense) => 
                        sum + (expense.expenses?.filter(exp => exp.showInPrint).reduce((expSum, exp) => expSum + (exp.amount || 0), 0) || 0), 0
                      ).toFixed(2)
                    }
                  </span>
                </div>
              )}
              {localExpenses.some(expense => (expense.doctorShares?.length || 0) > 0) && (
                <div className="flex justify-between">
                  <span>Doctor Shares Deduction:</span>
                  <span className="font-medium text-red-600">
                    - Rs. {calculateDoctorSharesTotal().toFixed(2)}
                  </span>
                </div>
              )}
              <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
                <span>Grand Total:</span>
                <span>Rs. {calculateGrandTotal().toFixed(2)}</span>
              </div>
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
