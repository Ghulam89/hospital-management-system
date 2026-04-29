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

type InvoiceData = {
  _id: string;
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

  // Calculate payment status whenever payments or total changes
  useEffect(() => {
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
  }, [paymentInstallments, procedures]);

  // Fetch invoice data, procedures and users
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch invoice data if we're updating
        if (id) {
          const invoiceRes = await axios.get(`${Base_url}/apis/invoice/get/${id}`);
          const data = invoiceRes.data.data;
          setInvoiceData(data);
          
          // Set patient info
          if (data.patientId) {
            setPatientInfo(data.patientId);
            setSearchTerm(`${data.patientId.name} (MR# ${data.patientId.mr})`);
          }
          
          // Set procedures
          if (data.item && data.item.length > 0) {
            const mappedProcedures = data.item.map((item, index) => ({
              id: index + 1,
              procedureId: item.procedureId,
              procedure: item.description,
              description: item.description,
              rate: item.rate,
              quantity: item.quantity,
              amount: item.amount,
              discount: item.discount,
              discountType: item.discountType || 0,
              tax: item.tax === 0 ? 'value' : 'exempt',
              deductDiscount: 'Hospital & Doctor',
              performedBy: item.performedBy,
              doctorAmount: item.doctorAmount || 0,
              hospitalAmount: item.hospitalAmount || 0
            }));
            setProcedures(mappedProcedures);
          }
          
          const seededFromItems = Array.isArray(data.item)
            ? data.item.map((srcItem: any, index: number) => ({
                procedureRowId: index + 1,
                procedureId: srcItem?.procedureId?._id || srcItem?.procedureId || '',
                expenses: Array.isArray(srcItem?.expenses) ? srcItem.expenses : [],
                doctorShares: Array.isArray(srcItem?.doctorShares) ? srcItem.doctorShares : [],
                consumptions: Array.isArray(srcItem?.consumptions) ? srcItem.consumptions : [],
                _id: `${data._id || 'inv'}-${index + 1}`,
              }))
            : [];

          const invoiceLevelBundle = {
            procedureRowId: null,
            procedureId: '',
            expenses: Array.isArray((data as any).invoiceExpenses) ? (data as any).invoiceExpenses : [],
            doctorShares: [],
            consumptions: Array.isArray((data as any).invoiceConsumptions) ? (data as any).invoiceConsumptions : [],
            _id: `${data._id || 'inv'}-invoice`,
          };

          const legacyBundles = Array.isArray((data as any).expensesBundles)
            ? (data as any).expensesBundles.map((bundle: any) => ({
                procedureRowId: typeof bundle.procedureRowId === 'number' ? bundle.procedureRowId : null,
                procedureId: '',
                expenses: bundle.expenses || [],
                doctorShares: bundle.doctorShares || [],
                consumptions: bundle.consumptions || [],
                _id: bundle._id || Date.now().toString(),
              }))
            : [];

          const combinedSeed = [
            ...seededFromItems.filter(b => (b.expenses?.length || b.doctorShares?.length || b.consumptions?.length)),
            ...(invoiceLevelBundle.expenses.length || invoiceLevelBundle.consumptions.length ? [invoiceLevelBundle] : []),
            ...legacyBundles,
          ];
          if (combinedSeed.length > 0) {
            setLocalExpenses(combinedSeed);
          }
          
          // Set payments
          if (data.payment && data.payment.length > 0) {
            const mappedPayments = data.payment.map((payment, index) => ({
              id: index + 1,
              date: new Date(payment.payDate).toISOString().split('T')[0],
              method: payment.method,
              amount: payment.paid,
              reference: payment.reference || ''
            }));
            setPaymentInstallments(mappedPayments);
          }
          
          // Set remarks
          if (data.note) {
            setRemarks(data.note);
          }

          // Set payment status
          setPaymentStatus(data.duePay <= 0 ? 'Payment Complete' : `Due: Rs. ${data.duePay.toFixed(2)}`);
          setIsPaymentComplete(data.duePay <= 0);
        }
        
        // Fetch procedures and doctors
        const [proceduresRes, usersRes] = await Promise.all([
          axios.get(`${Base_url}/apis/procedure/get`),
          axios.get(`${Base_url}/apis/user/get?role=doctor`)
        ]);
        
        setProceduresList(proceduresRes?.data?.data || []);
        setUsersList(usersRes?.data?.data || []);
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
      .map(p => p.performedBy)
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

  // Patient search functionality
  useEffect(() => {
    const fetchPatients = async () => {
      if (searchTerm.trim() === '') {
        setSearchResults([]);
        setSearchError('');
        return;
      }
      
      try {
        const response = await axios.get(`${Base_url}/apis/patient/get/${patientId}`);
        setGetPatientData(response.data.data);
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

  const addProcedure = () => {
    setProcedures([...procedures, {
      id: procedures.length + 1,
      procedureId: '',
      procedure: '',
      description: '',
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
        // Refresh invoice data
        fetchInvoiceData();
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
  
  const handleLocalExpenseAdd = (procedureRowId: number | null, bundle: any) => {
    setLocalExpenses(prev => {
      const idx = prev.findIndex(e => e.procedureRowId === procedureRowId);
      const proc = procedureRowId != null ? procedures.find(p => p.id === procedureRowId) : null;
      const payload = { procedureRowId, procedureId: proc?.procedureId || '', invoiceId: invoiceData?._id || '', ...bundle };
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = payload;
        return next;
      }
      return [...prev, payload];
    });
    setIsProcedureExpenseModalOpen(false);
    setEditingExpense(null);
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

  const calculateSubTotal = () => {
    return procedures.reduce((sum, item) => sum + item.amount, 0);
  };

  const calculateTotalDiscount = () => {
    return procedures.reduce((sum, item) => {
      if (item.discountType === 0) {
        return sum + item.discount;
      } else {
        return sum + (item.amount * (item.discount / 100));
      }
    }, 0);
  };

  const calculateGrandTotal = () => {
    const procedureTotal = calculateSubTotal() - calculateTotalDiscount();
    const expensesTotal =
      localExpenses.reduce((sum, expense) => {
        const e = expense.expenses || [];
        return (
          sum +
          e
            .filter((row: any) => !row.deductBeforeDoctorShare)
            .reduce((s: number, row: any) => s + (Number(row.amount) || 0), 0)
        );
      }, 0);
    return procedureTotal + expensesTotal;
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
  
  const calculateAdditionalExpensesTotal = () => {
    return localExpenses.reduce((sum, expense) => {
      const e = expense.expenses || [];
      return (
        sum +
        e
          .filter((row: any) => !row.deductBeforeDoctorShare)
          .reduce((s: number, row: any) => s + (Number(row.amount) || 0), 0)
      );
    }, 0);
  };
  
  const calculateDoctorSharesDeduction = () => {
    const procedureTotal = calculateSubTotal() - calculateTotalDiscount();
    const preDoctorShareDeductExpenses = localExpenses.reduce((sum, expense) => {
      const e = expense.expenses || [];
      const deduct = e
        .filter((row: any) => row.deductBeforeDoctorShare)
        .reduce((s: number, row: any) => s + (Number(row.amount) || 0), 0);
      return sum + deduct;
    }, 0);
    const base = Math.max(0, procedureTotal - preDoctorShareDeductExpenses);
    return localExpenses.reduce((sum, expense) => {
      const shares = expense.doctorShares || [];
      const total =
        shares.reduce((s: number, share: any) => {
          const val = Number(share.share) || 0;
          const amt = share.shareType === 'percentage' ? base * (val / 100) : val;
          return s + amt;
        }, 0);
      return sum + total;
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
  
    // Validate procedures
    for (const item of procedures) {
      if (!item.performedBy || item.performedBy.trim() === '') {
        toast.error(`Doctor must be selected for procedure ${item.id}`);
        setIsSubmitting(false);
        return;
      }
      if (!item.procedureId || item.procedureId.trim() === '') {
        toast.error(`Please select a procedure for item ${item.id}`);
        setIsSubmitting(false);
        return;
      }
    }
  
    // Validate doctorId
    const doctorId = procedures[0]?.performedBy;
    if (!doctorId || doctorId.trim() === '') {
      toast.error('Doctor must be selected');
      setIsSubmitting(false);
      return;
    }
  
    const invoiceDataBase = {
      patientId: patientInfo._id,
      patientMr: patientInfo.mr,
      doctorId: doctorId,
      item: procedures.map((item, index) => {
        const bundle = localExpenses.find((b) => b.procedureRowId === item.id || b.procedureId === item.procedureId) || {};
        const shownExpenses = bundle.expenses || [];
        const shares = (bundle.doctorShares || [])
          .filter((share: any) => {
            const id = String(share.doctorId || '');
            const isHex24 = /^[0-9a-fA-F]{24}$/.test(id);
            const val = Number(share.share);
            return isHex24 && Number.isFinite(val) && val > 0;
          })
          .map((share: any) => {
            const base = calculateShares(item).doctorAmount + calculateShares(item).hospitalAmount;
            const val = Number(share.share) || 0;
            const amount = share.shareType === 'percentage' ? base * (val / 100) : val;
            return {
              doctorId: String(share.doctorId),
              shareType: share.shareType,
              shareValue: val,
              amount,
            };
          });
        return {
          procedureId: item.procedureId,
          description: item.description,
          rate: item.rate,
          quantity: item.quantity,
          amount: item.amount,
          discount: item.discount,
          discountType: item.discountType,
          tax: item.tax === 'value' ? 0 : 0,
          total: item.amount - (item.discountType === 0 ? item.discount : (item.amount * (item.discount / 100))),
          performedBy: item.performedBy,
          doctorAmount: item.doctorAmount,
          hospitalAmount: item.hospitalAmount,
          expenses: shownExpenses,
          doctorShares: shares,
          consumptions: bundle.consumptions || [],
        };
      }),
      subTotalBill: calculateSubTotal(),
      discountBill: calculateTotalDiscount(),
      taxBill: 0,
      totalBill: calculateGrandTotal(),
      note: remarks,
    };
    
    const invoiceData: any = { ...invoiceDataBase };
    {
      const due = calculateDue();
      invoiceData.duePay = due > 0 ? due : 0;
      invoiceData.advancePay = due < 0 ? Math.abs(due) : 0;
      invoiceData.totalPay = calculateTotalPaid();
      invoiceData.status = due < 0 ? 'credit' : due === 0 ? 'completed' : 'pending';
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

  return (
    <>
      <div className="">
        <div>
          <p className='text-black mb-3 font-medium'>
            <span className='text-primary'>
              {getPatinetData?.mr}-{getPatinetData?.name} - {getPatinetData?.gender}
            </span> - Edit Invoice
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
        
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                 <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 whitespace-nowrap  tracking-wider">
                    Procedure
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500  whitespace-nowrap tracking-wider">
                    Description
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
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500   tracking-wider whitespace-nowrap">
                    Performed By
                  </th>
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
                                        type="text"
                                        className="rounded border-[1.5px] border-stroke bg-transparent py-2 px-1 w-40 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                                        value={item.description}
                                        onChange={(e) =>
                                          updateProcedure(
                                            item.id,
                                            'description',
                                            e.target.value,
                                          )
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
  <div className='w-49'>
    <AsyncPaginate
      key={`doctor-select-${item.id}-${item.performedBy}`}
      name={`performedBy-${item.id}`}
      value={
        item.performedBy
          ? {
              value: item.performedBy,
              label: usersList.find(u => u._id === item.performedBy)?.name || 'Select Doctor',
            }
          : null
      }
      loadOptions={loadDoctorOptions}
      onChange={(option: any) => {
        updateProcedure(item.id, 'performedBy', option?.value || '');
      }}
      getOptionLabel={(option: any) => option.label}
      getOptionValue={(option: any) => option.value}
      placeholder="Select a doctor..."
      additional={{ page: 1 }}
      classNamePrefix="react-select"
      className="w-full"
      menuPortalTarget={document.body}
      menuPosition="fixed"
      styles={{
        menuPortal: base => ({ ...base, zIndex: 9999 }),
        control: provided => ({ ...provided, minHeight: '42px' })
      }}
      cacheUniqs={[usersList]}
      debounceTimeout={500}
      keepSelectedInList={true}
      closeMenuOnSelect={true}
      defaultOptions={usersList.map(u => ({
        value: u._id,
        label: u.name,
      }))}
      isOptionSelected={(option) => option.value === item.performedBy}
      onMenuOpen={() => {
        loadDoctorOptions('', [], { page: 1 });
      }}
    />
  </div>
</td>
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
