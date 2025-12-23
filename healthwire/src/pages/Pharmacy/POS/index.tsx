import { useState, useEffect } from 'react';
import axios from 'axios';
import { Base_url } from '../../../utils/Base_url';
import { toast } from 'react-toastify';
import { useParams, useNavigate } from 'react-router-dom';
import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import { AsyncPaginate, LoadOptions } from 'react-select-async-paginate';

// Enhanced type definitions
// Custom option types for AsyncPaginate
type PatientOption = {
  label: string;
  value: string;
  patientData: Patient;
};
type DoctorOption = {
  label: string;
  value: string;
  doctorData: User;
};

type Batch = {
  batchNumber: string;
  expiryDate: string;
  purchasePrice: number;
  quantity: number;
  remainingQuantity: number;
};

type PharmItem = {
  _id: string;
  name: string;
  unit: string;
  conversionUnit: number;
  availableQuantity: number;
  costPrice: number;
  unitCost: number; // Add this line to match backend and usage
  retailPrice: number;
  batches: Batch[];
  taxRate: number;
  discountAllowed: boolean;
};

type Patient = {
  _id: string;
  mr: string;
  name: string;
};

type User = {
  _id: string;
  name: string;
  role: string;
};

type PosItem = {
  id: number;
  pharmItemId: string;
  itemName: string;
  unit: string;
  unitQuantity: number;
  conversionUnit: number;
  batchNumber: string;
  unitCost: number;
  rate: number;
  quantity: number;
  returnQuantity: number;
  discount: number;
  tax: number;
  netAmount: number;
  totalAmount: number;
  isReturn: boolean;
};

type PaymentMethod = 'Cash' | 'Credit' | 'Card' | 'Bank Transfer' | 'Cheque';

type PaymentInstallment = {
  id: number;
  date: string;
  method: PaymentMethod;
  amount: number;
  reference: string;
};

export default function PharmacyPOS() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patientInfo, setPatientInfo] = useState<Patient | null>(null);
  const [manualPatientName, setManualPatientName] = useState('');
  const [useManualPatient, setUseManualPatient] = useState(false);
  const [referDoctor, setReferDoctor] = useState<User | null>(null);
  const [manualDoctorName, setManualDoctorName] = useState('');
  const [useManualDoctor, setUseManualDoctor] = useState(false);
  const [itemsList, setItemsList] = useState<PharmItem[]>([]);
  const [doctorsList, setDoctorsList] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [posItems, setPosItems] = useState<PosItem[]>([
    {
      id: 1,
      pharmItemId: '',
      itemName: '',
      unit: 'pack',
      unitQuantity: 1,
      conversionUnit: 1,
      batchNumber: '',
      unitCost: 0,
      rate: 0,
      quantity: 1,
      returnQuantity: 0,
      discount: 0,
      tax: 0,
      netAmount: 0,
      totalAmount: 0,
      isReturn: false,
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        const [itemsRes, doctorsRes] = await Promise.all([
          axios.get(`${Base_url}/apis/pharmItem/get?active=true`),
          axios.get(`${Base_url}/apis/user/get?role=doctor&active=true`)
        ]);
        
        setItemsList(itemsRes?.data?.data || []);
        setDoctorsList(doctorsRes?.data?.data || []);
      } catch (error: any) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load required data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const loadPatientOptions: LoadOptions<PatientOption, never, { page: number }> = async (
    searchQuery,
    loadedOptions,
    additional
  ) => {
    const page = (additional && (additional as { page?: number }).page) ?? 1;
    try {
      const response = await axios.get(`${Base_url}/apis/patient/get`, {
        params: {
          page,
          limit: 20,
          search: searchQuery || '',
          sort: 'name',
        },
      });
      const { data, totalPages } = response.data;
      return {
        options: data.map((item: Patient) => ({
          label: `${item.name} (MR: ${item.mr})`,
          value: item._id,
          patientData: item,
        })),
        hasMore: page < totalPages,
        additional: { page: page + 1 },
      };
    } catch (error: any) {
      toast.error('Failed to search patients');
      return { options: [], hasMore: false, additional: { page: 1 } };
    }
  };

  const loadItemOptions = async (searchQuery: string, { page }: { page: number }) => {
    try {
      const response = await axios.get(`${Base_url}/apis/pharmItem/get`, {
        params: { 
          page, 
          limit: 20, 
          search: searchQuery || '',
          searchFields: 'name,barcode,genericName', // Search in multiple fields
          sort: 'name',
          active: true // Only load active items
        }
      });

      const { data, totalPages } = response.data;

      return {
        options: data.map((item: PharmItem) => ({
          label: `${item.name} ${item.barcode ? `(${item.barcode})` : ''} (${item.availableQuantity} ${item.unit} available) - Rs.${item.retailPrice}`,
          value: item._id,
          itemData: item,
        })),
        hasMore: page < totalPages,
        additional: { page: page + 1 },
      };
    } catch (error: any) {
      console.error('Error fetching items:', error);
      toast.error('Failed to search items');
      return { options: [], hasMore: false, additional: { page: 1 } };
    }
  };

  const loadDoctorOptions: LoadOptions<DoctorOption, never, { page: number }> = async (
    searchQuery,
    loadedOptions,
    additional
  ) => {
    const page = (additional && (additional as { page?: number }).page) ?? 1;
    try {
      const response = await axios.get(`${Base_url}/apis/user/get`, {
        params: {
          role: 'doctor',
          page,
          limit: 20,
          search: searchQuery || '',
          sort: 'name',
        },
      });
      const { data, totalPages } = response.data;
      return {
        options: data.map((item: User) => ({
          label: item.name,
          value: item._id,
          doctorData: item,
        })),
        hasMore: page < totalPages,
        additional: { page: page + 1 },
      };
    } catch (error: any) {
      toast.error('Failed to search doctors');
      return { options: [], hasMore: false, additional: { page: 1 } };
    }
  };

  const addPosItem = () => {
    if (posItems.length >= 20) {
      toast.warning('Maximum 20 items allowed per transaction');
      return;
    }
    
    setPosItems([...posItems, {
      id: posItems.length > 0 ? Math.max(...posItems.map(i => i.id)) + 1 : 1,
      pharmItemId: '',
      itemName: '',
      unit: 'pack',
      unitQuantity: 1,
      conversionUnit: 1,
      batchNumber: '',
      unitCost: 0,
      rate: 0,
      quantity: 1,
      returnQuantity: 0,
      discount: 0,
      tax: 0,
      netAmount: 0,
      totalAmount: 0,
      isReturn: false,
    }]);
  };

  const removePosItem = (id: number) => {
    if (posItems.length <= 1) {
      toast.warning('At least one item is required');
      return;
    }
    setPosItems(posItems.filter(item => item.id !== id));
  };

  const updatePosItem = (id: number, field: keyof PosItem, value: any) => {
    const updatedItems = posItems.map(item => {
      if (item.id !== id) return item;

      const updatedItem = { ...item, [field]: value };
      
      if (field === 'pharmItemId') {
        const selectedItem = itemsList.find(i => i._id === value);
        if (selectedItem) {
          updatedItem.itemName = selectedItem.name;
          updatedItem.unit = selectedItem.unit || 'pack';
          updatedItem.conversionUnit = selectedItem.conversionUnit || 1;
          updatedItem.rate = selectedItem.retailPrice;
          updatedItem.unitCost = selectedItem.unitCost;
          updatedItem.tax = selectedItem.taxRate || 0;
          // Calculate unit quantity (if quantity is in packs, unitQuantity is in units)
          updatedItem.unitQuantity = updatedItem.quantity * updatedItem.conversionUnit;
          if (selectedItem.batches?.length > 0) {
            updatedItem.batchNumber = selectedItem.batches[0].batchNumber;
            updatedItem.unitCost = selectedItem.batches[0].purchasePrice;
          }
          // Always recalculate amounts after selecting item
          updatedItem.netAmount = updatedItem.rate * updatedItem.quantity;
          const taxAmount = (updatedItem.netAmount * (updatedItem.tax / 100)) || 0;
          updatedItem.totalAmount = updatedItem.netAmount + taxAmount - updatedItem.discount;
        }
      }
      
      if (field === 'batchNumber' && updatedItem.pharmItemId) {
        const selectedItem = itemsList.find(i => i._id === updatedItem.pharmItemId);
        if (selectedItem) {
          const selectedBatch = selectedItem.batches.find(b => b.batchNumber === value);
          if (selectedBatch) {
            updatedItem.unitCost = selectedBatch.purchasePrice;
          }
          // Always recalculate amounts after selecting batch
          updatedItem.netAmount = updatedItem.rate * updatedItem.quantity;
          const taxAmount = (updatedItem.netAmount * (updatedItem.tax / 100)) || 0;
          updatedItem.totalAmount = updatedItem.netAmount + taxAmount - updatedItem.discount;
        }
      }
      
      // Recalculate amounts when relevant fields change
      if (["quantity", "rate", "discount", "unit", "batchNumber", "tax"].includes(field)) {
        // Update unit quantity when quantity changes
        if (field === 'quantity') {
          updatedItem.unitQuantity = updatedItem.quantity * updatedItem.conversionUnit;
        }
        updatedItem.netAmount = updatedItem.rate * updatedItem.quantity;
        const taxAmount = (updatedItem.netAmount * (updatedItem.tax / 100)) || 0;
        updatedItem.totalAmount = updatedItem.netAmount + taxAmount - updatedItem.discount;
      }
      
      // Update quantity when unit quantity changes
      if (field === 'unitQuantity') {
        updatedItem.quantity = updatedItem.conversionUnit > 0 ? updatedItem.unitQuantity / updatedItem.conversionUnit : 0;
        updatedItem.netAmount = updatedItem.rate * updatedItem.quantity;
        const taxAmount = (updatedItem.netAmount * (updatedItem.tax / 100)) || 0;
        updatedItem.totalAmount = updatedItem.netAmount + taxAmount - updatedItem.discount;
      }
      
      if (field === 'isReturn') {
        updatedItem.returnQuantity = 0;
      }
      
      return updatedItem;
    });
    
    setPosItems(updatedItems);
  };

  const addPaymentInstallment = () => {
    if (paymentInstallments.length >= 5) {
      toast.warning('Maximum 5 payment installments allowed');
      return;
    }
    
    setPaymentInstallments([...paymentInstallments, {
      id: paymentInstallments.length > 0 ? Math.max(...paymentInstallments.map(p => p.id)) + 1 : 1,
      date: new Date().toISOString().split('T')[0],
      method: 'Cash',
      amount: 0,
      reference: ''
    }]);
  };

  const removePaymentInstallment = (id: number) => {
    if (paymentInstallments.length <= 1) {
      toast.warning('At least one payment is required');
      return;
    }
    setPaymentInstallments(paymentInstallments.filter(item => item.id !== id));
  };

  const updatePaymentInstallment = (id: number, field: keyof PaymentInstallment, value: any) => {
    const updatedPayments = paymentInstallments.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setPaymentInstallments(updatedPayments);
  };

  const calculateSubTotal = () => {
    return posItems.reduce((sum, item) => sum + item.netAmount, 0);
  };

  const calculateTotalDiscount = () => {
    return posItems.reduce((sum, item) => sum + item.discount, 0);
  };

  const calculateTotalTax = () => {
    return posItems.reduce((sum, item) => sum + (item.netAmount * (item.tax / 100)), 0);
  };

  const calculateGrandTotal = () => {
    return calculateSubTotal() + calculateTotalTax() - calculateTotalDiscount();
  };

  const calculateTotalPaid = () => {
    return paymentInstallments.reduce((sum, item) => sum + item.amount, 0);
  };

  const calculateDue = () => {
    return calculateGrandTotal() - calculateTotalPaid();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Validate patient info (either selected or manual)
      if (!useManualPatient && !patientInfo) {
        toast.error('Please select a patient or enter manual patient name');
        return;
      }
      
      if (useManualPatient && !manualPatientName.trim()) {
        toast.error('Please enter patient name');
        return;
      }
      
      for (const item of posItems) {
        if (!item.pharmItemId) {
          toast.error(`Please select an item for row ${item.id}`);
          return;
        }
        
        const selectedItem = itemsList.find(i => i._id === item.pharmItemId);
        if (!selectedItem) {
          toast.error(`Selected item not found for row ${item.id}`);
          return;
        }
        
        const conversionUnit = selectedItem.conversionUnit || 1;
        const actualQty = item.quantity;
        
        if (!item.isReturn && selectedItem.availableQuantity < actualQty) {
          toast.error(`Insufficient stock for ${selectedItem.name}. Available: ${selectedItem.availableQuantity}`);
          return;
        }
        
        if (item.isReturn && item.returnQuantity > item.quantity) {
          toast.error(`Return quantity cannot exceed sold quantity for ${selectedItem.name}`);
          return;
        }
      }
      
      const totalPaid = calculateTotalPaid();
      const grandTotal = calculateGrandTotal();
      
      // Check if this is a return-only transaction
      const hasRegularItems = posItems.some(item => !item.isReturn);
      const hasReturnItems = posItems.some(item => item.isReturn && item.returnQuantity > 0);
      
      // For return-only transactions, don't require payment
      if (hasRegularItems) {
        if (totalPaid <= 0) {
          toast.error('At least one payment with positive amount is required');
          return;
        }
        
        if (paymentInstallments.some(p => p.amount <= 0)) {
          toast.error('All payment amounts must be greater than 0');
          return;
        }
      }
      
      // Get current user from localStorage
      const storedData = localStorage.getItem('userData');
      let currentUserId = null;
      
      try {
        const userData = storedData ? JSON.parse(storedData) : null;
        currentUserId = userData?._id;
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
      
      const posPayload = {
        patientId: useManualPatient ? null : patientInfo?._id,
        patientName: useManualPatient ? manualPatientName : patientInfo?.name,
        referId: useManualDoctor ? null : (referDoctor?._id || null),
        doctorName: useManualDoctor ? manualDoctorName : (referDoctor?.name || null),
        totalDiscount: calculateTotalDiscount(),
        totalTax: calculateTotalTax(),
        due: Math.max(0, calculateDue()),
        advance: Math.max(0, -calculateDue()),
        paid: calculateTotalPaid(),
        note: remarks,
        createdBy: currentUserId, // Add the current user as creator
        allItem: posItems.map(item => ({
          pharmItemId: item.pharmItemId,
          unit: item.unit,
          batchNumber: item.batchNumber,
          unitCost: item.unitCost,
          rate: item.rate,
          quantity: item.quantity,
          returnQuantity: item.isReturn ? item.returnQuantity : 0,
          discount: item.discount,
          tax: item.tax,
          netAmount: item.netAmount,
          totalAmount: item.totalAmount,
          isReturn: item.isReturn
        })),
        payment: paymentInstallments.map(payment => ({
          method: payment.method,
          payDate: new Date(payment.date).toISOString(),
          paid: payment.amount,
          reference: payment.reference
        }))
      };
      
      const response = await axios.post(`${Base_url}/apis/pharmPos/create`, posPayload);
      
      console.log('POS response:', response.data);
      
      if (response.data.status === "ok" || response.data.status === "success") {
        toast.success('POS invoice created successfully!');
        
        // Store the created invoice ID for reference
        const invoiceId = response.data.data?._id;
        
        // Navigate back to create new invoice after a short delay
        setTimeout(() => {
          navigate('/admin/pharmacy/invoices/new');
          // Show success message with invoice details
          toast.info(`Invoice ID: ${invoiceId}`);
        }, 1500);
      } else {
        throw new Error(response.data.message || 'Transaction failed');
      }
    } catch (error: unknown) {
      console.error('Error creating POS:', error);
      
      let errorMessage = 'Failed to create POS transaction';
      
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        // Check for error message in different possible locations
        errorMessage = axiosError.response?.data?.error || 
                       axiosError.response?.data?.message || 
                       axiosError.response?.data?.errorMessage ||
                       errorMessage;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
          </div>
          <p className="mt-4 text-gray-700 font-semibold text-lg">Loading POS System...</p>
          <p className="text-gray-500 text-sm mt-1">Please wait while we prepare everything</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-6">
      <Breadcrumb pageName="Pharmacy Point of Sale" />
    
      
      {/* Patient and Doctor Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className="bg-blue-100 rounded-lg p-2 mr-3">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <label className="block text-sm font-semibold text-gray-700">
                Patient Information
              </label>
            </div>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                checked={useManualPatient}
                onChange={(e) => {
                  setUseManualPatient(e.target.checked);
                  if (e.target.checked) {
                    setPatientInfo(null);
                  } else {
                    setManualPatientName('');
                  }
                }}
              />
              <span className="ml-2 text-xs text-gray-600">Manual Entry</span>
            </label>
          </div>
          {useManualPatient ? (
            <input
              type="text"
              className="w-full rounded-lg border border-gray-300 bg-white py-3 px-4 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              placeholder="Enter patient name..."
              value={manualPatientName}
              onChange={(e) => setManualPatientName(e.target.value)}
            />
          ) : (
            <AsyncPaginate
              value={patientInfo ? {
                label: `${patientInfo.name} (MR: ${patientInfo.mr})`,
                value: patientInfo._id,
                patientData: patientInfo,
              } : null}
              onChange={(selectedOption: PatientOption | null) => setPatientInfo(selectedOption?.patientData || null)}
              loadOptions={loadPatientOptions}
              getOptionLabel={(option) => option.label}
              getOptionValue={(option) => option.value}
              placeholder="🔍 Search patient by name or MR number..."
              additional={{ page: 1 }}
              classNamePrefix="react-select"
              styles={{
                control: (base) => ({
                  ...base,
                  borderColor: '#e5e7eb',
                  borderRadius: '0.5rem',
                  padding: '0.25rem',
                  '&:hover': { borderColor: '#3b82f6' }
                })
              }}
            />
          )}
        </div>
        
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className="bg-green-100 rounded-lg p-2 mr-3">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <label className="block text-sm font-semibold text-gray-700">Referral Doctor (Optional)</label>
            </div>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                checked={useManualDoctor}
                onChange={(e) => {
                  setUseManualDoctor(e.target.checked);
                  if (e.target.checked) {
                    setReferDoctor(null);
                  } else {
                    setManualDoctorName('');
                  }
                }}
              />
              <span className="ml-2 text-xs text-gray-600">Manual Entry</span>
            </label>
          </div>
          {useManualDoctor ? (
            <input
              type="text"
              className="w-full rounded-lg border border-gray-300 bg-white py-3 px-4 text-sm text-gray-700 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-200"
              placeholder="Enter doctor name (optional)..."
              value={manualDoctorName}
              onChange={(e) => setManualDoctorName(e.target.value)}
            />
          ) : (
            <AsyncPaginate
              value={referDoctor ? {
                label: referDoctor.name,
                value: referDoctor._id,
                doctorData: referDoctor,
              } : null}
              onChange={(selectedOption: DoctorOption | null) => setReferDoctor(selectedOption?.doctorData || null)}
              loadOptions={loadDoctorOptions}
              getOptionLabel={(option) => option.label}
              getOptionValue={(option) => option.value}
              placeholder="🔍 Search doctor (Optional)..."
              additional={{ page: 1 }}
              classNamePrefix="react-select"
              isClearable
              styles={{
                control: (base) => ({
                  ...base,
                  borderColor: '#e5e7eb',
                  borderRadius: '0.5rem',
                  padding: '0.25rem',
                  '&:hover': { borderColor: '#10b981' }
                })
              }}
            />
          )}
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-6 bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="bg-purple-100 rounded-lg p-2 mr-3">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">Sale Items</h2>
                <p className="text-xs text-gray-500 mt-0.5">{posItems.length} item(s) added</p>
              </div>
            </div>
            <button
              onClick={addPosItem}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-5 py-2.5 rounded-lg flex items-center shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={posItems.length >= 20}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add New Item
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Item <span className="text-red-500">*</span></th>
                <th className="px-3 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Unit</th>
                <th className="px-3 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Batch</th>
                <th className="px-3 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Cost</th>
                <th className="px-3 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Rate <span className="text-red-500">*</span></th>
                <th className="px-3 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Qty <span className="text-red-500">*</span></th>
                <th className="px-3 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Unit Qty</th>
                <th className="px-3 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Amount</th>
                <th className="px-3 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Discount</th>
                <th className="px-3 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Tax %</th>
                <th className="px-3 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Total</th>
                <th className="px-3 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Profit</th>
                <th className="px-3 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {posItems.map((item) => (
                <tr key={item.id} className="hover:bg-blue-50 transition-colors">
                  <td className="px-2 py-3 whitespace-nowrap">
                    <AsyncPaginate
                      value={item.pharmItemId ? {
                        label: item.itemName,
                        value: item.pharmItemId
                      } : null}
                      onChange={(selectedOption) => {
                        updatePosItem(item.id, 'pharmItemId', selectedOption?.value || '');
                      }}
                      loadOptions={loadItemOptions as unknown as LoadOptions<any, never, { page: number }>}
                      getOptionLabel={(option) => option.label}
                      getOptionValue={(option) => option.value}
                      placeholder="Search by name, barcode or serial..."
                      additional={{ page: 1 }}
                      classNamePrefix="react-select"
                      className="w-64"
                      required
                      menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                      menuPosition="fixed"
                      styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                    />
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap">
                    <select
                      className="w-28 rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      value={item.unit}
                      onChange={(e) => updatePosItem(item.id, 'unit', e.target.value)}
                      disabled={!item.pharmItemId}
                    >
                      <option value="pack">Pack</option>
                      <option value="unit">Unit</option>
                      <option value="tablet">Tablet</option>
                      <option value="capsule">Capsule</option>
                      <option value="ml">ML</option>
                      <option value="g">Gram</option>
                    </select>
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap">
                    <select
                      className="w-40 rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      value={item.batchNumber}
                      onChange={(e) => updatePosItem(item.id, 'batchNumber', e.target.value)}
                      disabled={!item.pharmItemId || !itemsList.find(i => i._id === item.pharmItemId)?.batches?.length}
                    >
                      <option value="">No Batch</option>
                      {itemsList.find(i => i._id === item.pharmItemId)?.batches?.map(batch => (
                        <option key={batch.batchNumber} value={batch.batchNumber}>
                          {batch.batchNumber} (Exp: {new Date(batch.expiryDate).toLocaleDateString()})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap">
                    <input
                      type="number"
                      className="w-20 rounded-lg border border-gray-300 bg-gray-50 py-2 px-3 text-sm text-gray-600 font-medium"
                      value={item.unitCost}
                      disabled
                    />
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap">
                    <input
                      type="number"
                      className="w-24 rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm text-gray-700 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-200"
                      value={item.rate}
                      onChange={(e) => updatePosItem(item.id, 'rate', parseFloat(e.target.value))}
                      min="0"
                      step="0.01"
                      required
                    />
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap">
                    <input
                      type="number"
                      className="w-20 rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      value={item.quantity}
                      onChange={(e) => updatePosItem(item.id, 'quantity', parseInt(e.target.value))}
                      min="1"
                      disabled={item.isReturn}
                      required
                    />
                    {item.isReturn && (
                      <input
                        type="number"
                        className="w-20 rounded-lg border border-red-300 bg-red-50 py-2 px-3 text-sm text-gray-700 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-200 mt-1"
                        value={item.returnQuantity}
                        onChange={(e) => updatePosItem(item.id, 'returnQuantity', parseInt(e.target.value))}
                        min="0"
                        max={item.quantity}
                        placeholder="Return Qty"
                      />
                    )}
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap">
                    <input
                      type="number"
                      className="w-20 rounded-lg border border-gray-300 bg-blue-50 py-2 px-3 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      value={item.unitQuantity}
                      onChange={(e) => updatePosItem(item.id, 'unitQuantity', parseInt(e.target.value))}
                      min="1"
                      disabled={!item.pharmItemId || item.conversionUnit <= 1}
                      title={`Conversion: 1 ${item.unit} = ${item.conversionUnit} units`}
                    />
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap">
                    <div className="w-24 rounded-lg border border-gray-300 bg-gray-50 py-2 px-3 text-sm text-gray-700 font-semibold">
                      {item.netAmount.toFixed(2)}
                    </div>
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap">
                    <input
                      type="number"
                      className="w-24 rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm text-gray-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                      value={item.discount}
                      onChange={(e) => updatePosItem(item.id, 'discount', parseFloat(e.target.value))}
                      min="0"
                      max={item.netAmount}
                      step="0.01"
                    />
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap">
                    <input
                      type="number"
                      className="w-20 rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm text-gray-700 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                      value={item.tax}
                      onChange={(e) => updatePosItem(item.id, 'tax', parseFloat(e.target.value))}
                      min="0"
                      step="0.01"
                    />
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap">
                    <div className="w-28 rounded-lg border-2 border-blue-300 bg-blue-50 py-2 px-3 text-sm text-blue-700 font-bold">
                      Rs. {item.totalAmount.toFixed(2)}
                    </div>
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap">
                    {/* Profit/Loss column */}
                    <div className={`w-24 rounded-lg border-2 py-2 px-3 text-sm font-bold ${
                      ((item.rate - item.unitCost) * item.quantity) >= 0 
                        ? 'bg-green-50 border-green-300 text-green-700' 
                        : 'bg-red-50 border-red-300 text-red-700'
                    }`}>
                      {((item.rate - item.unitCost) * item.quantity).toFixed(2)}
                    </div>
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap">
                    <div className="flex flex-col items-center space-y-2">
                      <label className="inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                          checked={item.isReturn}
                          onChange={(e) => updatePosItem(item.id, 'isReturn', e.target.checked)}
                        />
                        <span className="ml-2 text-xs text-gray-600 font-medium">Return</span>
                      </label>
                      <button
                        onClick={() => removePosItem(item.id)}
                        className="bg-red-100 text-red-600 hover:bg-red-600 hover:text-white p-2 rounded-lg transition-all duration-200 disabled:opacity-30"
                        title="Remove Item"
                        disabled={posItems.length <= 1}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payments Section */}
      <div className="mb-6 bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="bg-green-100 rounded-lg p-2 mr-3">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">Payment Details</h2>
                <p className="text-xs text-gray-500 mt-0.5">{paymentInstallments.length} payment(s) added</p>
              </div>
            </div>
            <button
              onClick={addPaymentInstallment}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-5 py-2.5 rounded-lg flex items-center shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={paymentInstallments.length >= 5}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add Payment
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto p-4">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Date <span className="text-red-500">*</span></th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Method <span className="text-red-500">*</span></th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Amount <span className="text-red-500">*</span></th>
                <th className="px-4 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {paymentInstallments.map((item) => (
                <tr key={item.id} className="hover:bg-green-50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <input
                      type="date"
                      className="w-full rounded-lg border border-gray-300 bg-white py-2.5 px-4 text-sm text-gray-700 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-200"
                      value={item.date}
                      onChange={(e) => updatePaymentInstallment(item.id, 'date', e.target.value)}
                      required
                    />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <select
                      className="w-full rounded-lg border border-gray-300 bg-white py-2.5 px-4 text-sm text-gray-700 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-200"
                      value={item.method}
                      onChange={(e) => updatePaymentInstallment(item.id, 'method', e.target.value as PaymentMethod)}
                      required
                    >
                      <option value="Cash">💵 Cash</option>
                      <option value="Credit">💳 Credit</option>
                      <option value="Card">💳 Card</option>
                      <option value="Bank Transfer">🏦 Bank Transfer</option>
                      <option value="Cheque">📝 Cheque</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">Rs.</span>
                      <input
                        type="number"
                        className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-12 pr-4 text-sm text-gray-700 font-semibold outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-200"
                        value={item.amount}
                        onChange={(e) => updatePaymentInstallment(item.id, 'amount', parseFloat(e.target.value))}
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <button
                      onClick={() => removePaymentInstallment(item.id)}
                      className="bg-red-100 text-red-600 hover:bg-red-600 hover:text-white p-2.5 rounded-lg transition-all duration-200 disabled:opacity-30 inline-flex items-center justify-center"
                      title="Remove Payment"
                      disabled={paymentInstallments.length <= 1}
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
      <div className="mb-6 bg-white rounded-xl shadow-md border border-gray-100 p-6">
        <div className="flex items-center mb-3">
          <div className="bg-yellow-100 rounded-lg p-2 mr-3">
            <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-800">Additional Notes & Remarks</h2>
        </div>
        <textarea
          className="w-full rounded-lg border border-gray-300 bg-white py-3 px-4 text-sm text-gray-700 outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
          rows={3}
          placeholder="Enter any additional notes, special instructions, or remarks here..."
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
        />
      </div>

      {/* Summary Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-lg border border-blue-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-white mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <h3 className="text-lg font-bold text-white">Transaction Summary</h3>
            </div>
          </div>
          <div className="p-6 space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-blue-200">
              <span className="text-gray-700 font-medium">Sub Total:</span>
              <span className="text-lg font-bold text-gray-800">Rs. {calculateSubTotal().toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-blue-200">
              <span className="text-gray-700 font-medium">Discount:</span>
              <span className="text-lg font-bold text-red-600">- Rs. {calculateTotalDiscount().toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-blue-200">
              <span className="text-gray-700 font-medium">Tax:</span>
              <span className="text-lg font-bold text-orange-600">+ Rs. {calculateTotalTax().toFixed(2)}</span>
            </div>
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg px-4 py-3 mt-4">
              <div className="flex justify-between items-center">
                <span className="text-white font-bold text-base">Grand Total:</span>
                <span className="text-white font-bold text-2xl">Rs. {calculateGrandTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-lg border border-green-100 overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-white mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3 className="text-lg font-bold text-white">Payment Summary</h3>
            </div>
          </div>
          <div className="p-6 space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-green-200">
              <span className="text-gray-700 font-medium">Total Paid:</span>
              <span className="text-lg font-bold text-green-600">Rs. {calculateTotalPaid().toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-green-200">
              <span className="text-gray-700 font-medium">{calculateDue() > 0 ? 'Due Amount:' : 'Change to Return:'}</span>
              <span className={`text-lg font-bold ${calculateDue() > 0 ? 'text-red-600' : 'text-green-600'}`}>
                Rs. {Math.abs(calculateDue()).toFixed(2)}
              </span>
            </div>
            {calculateDue() < 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <span className="font-bold">💰 Return Change:</span> Please return Rs. {Math.abs(calculateDue()).toFixed(2)} to the customer
                </p>
              </div>
            )}
            <div className={`rounded-lg px-4 py-3 mt-4 ${calculateDue() > 0 ? 'bg-gradient-to-r from-red-600 to-rose-600' : 'bg-gradient-to-r from-green-600 to-emerald-600'}`}>
              <div className="flex justify-between items-center">
                <span className="text-white font-bold text-base">Payment Status:</span>
                <span className="text-white font-bold text-xl">
                  {calculateDue() === 0 ? '✓ Fully Paid' : calculateDue() > 0 ? '⚠ Pending' : '↑ Overpaid - Return Change'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Buttons */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm text-gray-600">
            <p className="font-medium">Ready to complete the transaction?</p>
            <p className="text-xs text-gray-500">Review all details before proceeding</p>
          </div>
          <div className="flex space-x-4">
            
            <button
              onClick={handleSubmit}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold px-8 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing Transaction...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Complete Transaction
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}