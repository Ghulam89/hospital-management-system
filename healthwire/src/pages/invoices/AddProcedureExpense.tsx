import React, { useEffect, useState } from 'react';
import Modal from '../../components/modal';
import { MdClose } from 'react-icons/md';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Base_url } from '../../utils/Base_url';
import { AsyncPaginate, LoadOptions } from 'react-select-async-paginate';
import { FaTrashAlt } from 'react-icons/fa';

type Category = {
  _id: string;
  name: string;
};

type Doctor = {
  _id: string;
  name: string;
  sharePrice?: string;
  shareType?: string;
};

type StaffUser = {
  _id: string;
  name: string;
};

type StaffRefRow = {
  id: number;
  userId: string;
};

type Batch = {
  batchNumber: string;
  remainingQuantity: number;
};

type PharmItem = {
  _id: string;
  name: string;
  batches?: Batch[];
};

type ExpenseRow = {
  id: number;
  description: string;
  expenseCategoryId: string;
  amount: number;
  deductBeforeDoctorShare: boolean;
  showInPrint: boolean;
};

type DoctorShareRow = {
  id: number;
  doctorId: string;
  share: number;
  shareType: 'value' | 'percentage';
};

type ConsumptionRow = {
  id: number;
  pharmItemId: string;
  itemName: string;
  qty: number;
  batchNumber: string;
  availableBatches: Batch[];
};

type DoctorOption = { value: string; label: string; doctorData: Doctor };
type StaffOption = { value: string; label: string; staffData: StaffUser };
type ItemOption = { value: string; label: string; itemData: PharmItem };
type CategoryOption = { value: string; label: string; categoryData: Category };

type AddProcedureExpenseProps = {
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  selectedExpense: any;
  categories: Category[];
  selectedProcedureId: number | null;
  onLocalExpenseAdd: (procedureRowId: number | null, expenseBundle: any) => void;
};

const AddProcedureExpense: React.FC<AddProcedureExpenseProps> = ({
  isModalOpen,
  setIsModalOpen,
  selectedExpense,
  categories,
  selectedProcedureId,
  onLocalExpenseAdd,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [items, setItems] = useState<PharmItem[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [doctorShares, setDoctorShares] = useState<DoctorShareRow[]>([]);
  const [assistedByRows, setAssistedByRows] = useState<StaffRefRow[]>([]);
  const [receptionRows, setReceptionRows] = useState<StaffRefRow[]>([]);
  const [consumptions, setConsumptions] = useState<ConsumptionRow[]>([]);

  useEffect(() => {
    if (isModalOpen) {
      if (selectedExpense) {
        const normalizedExpenses: ExpenseRow[] = Array.isArray(selectedExpense.expenses)
          ? selectedExpense.expenses.map((e: any, i: number) => ({
              id: typeof e.id === 'number' ? e.id : i + 1,
              description: e.description || e.name || e.categoryName || '',
              expenseCategoryId: e.expenseCategoryId || e.categoryId || e.category?._id || e.category || '',
              amount: (() => {
                const v = e.amount ?? e.value ?? e.price;
                return typeof v === 'number' ? v : (v === '' || v == null ? NaN : Number(v));
              })(),
              deductBeforeDoctorShare: !!(e.deductBeforeDoctorShare ?? e.deductBeforeShare ?? e.beforeDoctorShare),
              showInPrint: !!(e.showInPrint ?? e.print),
            }))
          : [];
        const normalizedDoctorShares: DoctorShareRow[] = Array.isArray(selectedExpense.doctorShares)
          ? selectedExpense.doctorShares.map((d: any, i: number) => ({
              id: typeof d.id === 'number' ? d.id : i + 1,
              doctorId: d.doctorId || d.userId || d.doctor?._id || '',
              share: (() => {
                const v = d.share ?? d.shareValue ?? d.amount;
                return typeof v === 'number' ? v : (v === '' || v == null ? NaN : Number(v));
              })(),
              shareType: (d.shareType || d.type) === 'percentage' ? 'percentage' : 'value',
            }))
          : [];
        const normalizedConsumptions: ConsumptionRow[] = Array.isArray(selectedExpense.consumptions)
          ? selectedExpense.consumptions.map((c: any, i: number) => ({
              id: typeof c.id === 'number' ? c.id : i + 1,
              pharmItemId: c.pharmItemId || c.itemId || c.item?._id || '',
              itemName: c.itemName || c.item?.name || '',
              qty: (() => {
                const v = c.qty ?? c.quantity;
                return typeof v === 'number' ? v : (v === '' || v == null ? NaN : Number(v));
              })(),
              batchNumber: c.batchNumber || c.batch || '',
              availableBatches: Array.isArray(c.availableBatches) ? c.availableBatches : (Array.isArray(c.batches) ? c.batches : []),
            }))
          : [];
        const extractStaffId = (x: unknown): string => {
          if (x == null || x === '') return '';
          if (typeof x === 'string') return x;
          if (typeof x === 'object' && x !== null) {
            const o = x as Record<string, unknown>;
            if (o._id != null && o._id !== '') return String(o._id);
            if (typeof o.userId === 'string') return o.userId;
          }
          return '';
        };
        const normalizedAssisted: StaffRefRow[] = Array.isArray(selectedExpense.assistedBy)
          ? selectedExpense.assistedBy.map((row: unknown, i: number) => ({
              id: i + 1,
              userId: extractStaffId(row),
            }))
          : [];
        const normalizedReception: StaffRefRow[] = Array.isArray(selectedExpense.receptionStaff)
          ? selectedExpense.receptionStaff.map((row: unknown, i: number) => ({
              id: i + 1,
              userId: extractStaffId(row),
            }))
          : [];
        setExpenses(normalizedExpenses);
        setDoctorShares(normalizedDoctorShares);
        setAssistedByRows(normalizedAssisted);
        setReceptionRows(normalizedReception);
        setConsumptions(normalizedConsumptions);
      } else {
        setExpenses([]);
        setDoctorShares([]);
        setAssistedByRows([]);
        setReceptionRows([]);
        setConsumptions([]);
      }
    }
  }, [isModalOpen, selectedExpense]);

  const loadDoctorOptions: LoadOptions<DoctorOption, never, { page: number }> = async (
    searchQuery,
    loadedOptions,
    additional
  ) => {
    try {
      const response = await axios.get(`${Base_url}/apis/user/get`, {
        params: { 
          role: 'doctor',
          page: additional?.page || 1, 
          limit: 20, 
          search: searchQuery || '' 
        },
      });
      
      const responseData = response.data;
      const doctorsData = Array.isArray(responseData?.data) ? responseData.data : [];
      const totalPages = responseData?.totalPages || 1;
      const currentPage = responseData?.currentPage || 1;
      
      const options = doctorsData.map((doctor: Doctor) => ({
        value: doctor._id,
        label: doctor.name,
        doctorData: doctor,
      }));
      
      return {
        options,
        hasMore: currentPage < totalPages,
        additional: { page: currentPage + 1 },
      };
    } catch (error) {
      console.error('Error loading doctors:', error);
      return { options: [], hasMore: false };
    }
  };
  
  const loadDoctorById = async (doctorId: string): Promise<Doctor | null> => {
    try {
      const response = await axios.get(`${Base_url}/apis/user/get/${doctorId}`);
      const docData = response.data?.data;
      if (docData) {
        const newDoc: Doctor = { _id: docData._id, name: docData.name };
        setDoctors(prev => [...prev, newDoc]);
        return newDoc;
      }
    } catch {
    }
    return null;
  };
  
  useEffect(() => {
    const ensureDoctors = async () => {
      const ids = doctorShares.map(d => d.doctorId).filter(id => !!id);
      const missing = ids.filter(id => !doctors.some(doc => doc._id === id));
      if (missing.length > 0) {
        await Promise.all(missing.map(id => loadDoctorById(id)));
      }
    };
    if (isModalOpen && doctorShares.length > 0) {
      ensureDoctors();
    }
  }, [isModalOpen, doctorShares, doctors]);

  const loadStaffOptions: LoadOptions<StaffOption, never, { page: number }> = async (
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
        },
      });
      const responseData = response.data;
      const list = Array.isArray(responseData?.data) ? responseData.data : [];
      const totalPages = responseData?.totalPages || 1;
      const currentPage = responseData?.currentPage || 1;
      const incoming: StaffUser[] = list.map((u: { _id: string; name: string }) => ({
        _id: u._id,
        name: u.name || 'Staff',
      }));
      setStaffList((prev) => {
        const merged = [...prev];
        for (const u of incoming) {
          if (!merged.some((x) => x._id === u._id)) merged.push(u);
        }
        return merged;
      });
      const options = incoming.map((staff: StaffUser) => ({
        value: staff._id,
        label: staff.name,
        staffData: staff,
      }));
      return {
        options,
        hasMore: currentPage < totalPages,
        additional: { page: currentPage + 1 },
      };
    } catch (error) {
      console.error('Error loading staff:', error);
      return { options: [], hasMore: false };
    }
  };

  const loadStaffById = async (staffId: string): Promise<StaffUser | null> => {
    try {
      const response = await axios.get(`${Base_url}/apis/user/get/${staffId}`);
      const u = response.data?.data;
      if (u) {
        const su: StaffUser = { _id: u._id, name: u.name };
        setStaffList((prev) => (prev.some((x) => x._id === su._id) ? prev : [...prev, su]));
        return su;
      }
    } catch {
      /* skip */
    }
    return null;
  };

  useEffect(() => {
    const ids = [...assistedByRows, ...receptionRows].map((r) => r.userId).filter(Boolean);
    const missing = ids.filter((id) => !staffList.some((s) => s._id === id));
    if (!isModalOpen || missing.length === 0) return;
    Promise.all(missing.map((id) => loadStaffById(id))).catch(() => {});
  }, [isModalOpen, assistedByRows, receptionRows]);

  const loadItemOptions: LoadOptions<ItemOption, never, { page: number }> = async (
    searchQuery,
    loadedOptions,
    additional
  ) => {
    try {
      const response = await axios.get(`${Base_url}/apis/pharmItem/get`, {
        params: { 
          page: additional?.page || 1, 
          limit: 20, 
          search: searchQuery || '',
          sort: 'name'
        },
      });
      
      const responseData = response.data;
      const itemsData = Array.isArray(responseData?.data) ? responseData.data : [];
      const totalPages = responseData?.totalPages || 1;
      const currentPage = responseData?.currentPage || 1;
      
      const options = itemsData.map((item: PharmItem) => ({
        value: item._id,
        label: item.name,
        itemData: item,
      }));
      
      return {
        options,
        hasMore: currentPage < totalPages,
        additional: { page: currentPage + 1 },
      };
    } catch (error) {
      console.error('Error loading items:', error);
      return { options: [], hasMore: false };
    }
  };

  const loadCategoryOptions = (searchQuery: string = ''): CategoryOption[] => {
    const filtered = categories.filter((cat) =>
      cat.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return filtered.map((cat) => ({
      value: cat._id,
      label: cat.name,
      categoryData: cat,
    }));
  };

  const addExpenseRow = () => {
    setExpenses((prev) => [
      ...prev,
      {
        id: prev.length ? prev[prev.length - 1].id + 1 : 1,
        description: '',
        expenseCategoryId: '',
        amount: NaN,
        deductBeforeDoctorShare: false,
        showInPrint: false,
      },
    ]);
  };

  const removeExpenseRow = (id: number) => {
    setExpenses((prev) => prev.filter((r) => r.id !== id));
  };

  const updateExpenseRow = (id: number, field: keyof ExpenseRow, value: any) => {
    setExpenses((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const addDoctorShareRow = () => {
    setDoctorShares((prev) => [
      ...prev,
      { id: prev.length ? prev[prev.length - 1].id + 1 : 1, doctorId: '', share: NaN, shareType: 'value' },
    ]);
  };

  const addAssistedRow = () => {
    setAssistedByRows((prev) => [
      ...prev,
      { id: prev.length ? prev[prev.length - 1].id + 1 : 1, userId: '' },
    ]);
  };

  const removeAssistedRow = (id: number) => setAssistedByRows((prev) => prev.filter((r) => r.id !== id));
  const updateAssistedRow = (id: number, userId: string) =>
    setAssistedByRows((prev) => prev.map((r) => (r.id === id ? { ...r, userId } : r)));

  const addReceptionRow = () => {
    setReceptionRows((prev) => [
      ...prev,
      { id: prev.length ? prev[prev.length - 1].id + 1 : 1, userId: '' },
    ]);
  };

  const removeReceptionRow = (id: number) => setReceptionRows((prev) => prev.filter((r) => r.id !== id));
  const updateReceptionRow = (id: number, userId: string) =>
    setReceptionRows((prev) => prev.map((r) => (r.id === id ? { ...r, userId } : r)));

  const removeDoctorShareRow = (id: number) => {
    setDoctorShares((prev) => prev.filter((r) => r.id !== id));
  };

  const updateDoctorShareRow = (id: number, field: keyof DoctorShareRow, value: any) => {
    setDoctorShares((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };
  
  const handleDoctorSelect = async (rowId: number, option: any) => {
    const selectedId = option?.value || '';
    let doc: Doctor | null = option?.doctorData || null;
    if (!doc && selectedId) {
      doc = doctors.find(d => d._id === selectedId) || await loadDoctorById(selectedId);
    }
    const defaultShare = doc?.sharePrice ? Number(doc.sharePrice) : NaN;
    const defaultType: 'value' | 'percentage' = doc?.shareType === 'percentage' ? 'percentage' : 'value';
    setDoctorShares(prev =>
      prev.map(r =>
        r.id === rowId
          ? {
              ...r,
              doctorId: selectedId,
              share: Number.isFinite(defaultShare) ? defaultShare : r.share,
              shareType: doc?.shareType ? defaultType : r.shareType,
            }
          : r
      )
    );
  };

  const addConsumptionRow = () => {
    setConsumptions((prev) => [
      ...prev,
      { id: prev.length ? prev[prev.length - 1].id + 1 : 1, pharmItemId: '', itemName: '', qty: NaN, batchNumber: '', availableBatches: [] },
    ]);
  };

  const removeConsumptionRow = (id: number) => {
    setConsumptions((prev) => prev.filter((r) => r.id !== id));
  };

  const updateConsumptionRow = async (id: number, field: keyof ConsumptionRow, value: any) => {
    if (field === 'pharmItemId') {
      const item = items.find((i) => i._id === value) || (await loadItemById(value));
      let batches: Batch[] = [];
      try {
        const r = await axios.get(`${Base_url}/apis/pharmItem/get/${value}`);
        const d = r?.data?.data;
        batches = Array.isArray(d?.batches) ? d.batches : [];
      } catch {
        batches = [];
      }
      setConsumptions((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, pharmItemId: value, itemName: item?.name || '', availableBatches: batches, batchNumber: '' } : r,
        ),
      );
      return;
    }
    setConsumptions((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const loadItemById = async (itemId: string): Promise<PharmItem | null> => {
    try {
      const response = await axios.get(`${Base_url}/apis/pharmItem/get/${itemId}`);
      const itemData = response.data?.data;
      if (itemData) {
        const newItem: PharmItem = {
          _id: itemData._id,
          name: itemData.name,
          batches: itemData.batches || []
        };
        setItems(prev => [...prev, newItem]);
        return newItem;
      }
    } catch (error) {
      console.error('Error loading item by ID:', error);
    }
    return null;
  };

  const hexId = (id: string) => /^[0-9a-fA-F]{24}$/.test(String(id || '').trim());

  const handleSave = () => {
    const invalidExpense = expenses.some((e) => {
      const touched =
        !!(e.expenseCategoryId || String(e.description || '').trim() || (Number.isFinite(e.amount) && e.amount > 0));
      if (!touched) return false;
      return !e.expenseCategoryId || !Number.isFinite(e.amount) || e.amount <= 0;
    });
    if (invalidExpense) {
      toast.error('Each expense row needs a category and a positive amount (or leave rows empty)');
      return;
    }
    const hasDoctor = doctorShares.some((d) => hexId(String(d.doctorId || '').trim()));
    if (!hasDoctor) {
      toast.error('Add at least one doctor under Doctor (procedure share)');
      return;
    }
    // Staff (Assisted By) compulsory — invoice creation rule
    const hasAssisted = assistedByRows.some((r) => hexId(String(r.userId || '').trim()));
    if (!hasAssisted) {
      toast.error('Add at least one staff under Assisted By');
      return;
    }
    // Reception compulsory — invoice creation rule
    const hasReception = receptionRows.some((r) => hexId(String(r.userId || '').trim()));
    if (!hasReception) {
      toast.error('Add at least one staff under Reception');
      return;
    }
    const enrichedExpenses = expenses.map((e) => ({
      ...e,
      categoryName: categories.find((c) => c._id === e.expenseCategoryId)?.name || '',
    }));
    const enrichedDoctorShares = doctorShares.map((d) => ({
      ...d,
      doctorName: doctors.find((doc) => doc._id === d.doctorId)?.name || '',
    }));
    const assistedByClean = assistedByRows
      .filter((r) => hexId(r.userId))
      .map((r) => ({
        userId: r.userId.trim(),
        userName: staffList.find((s) => s._id === r.userId)?.name || '',
      }));
    const receptionClean = receptionRows
      .filter((r) => hexId(r.userId))
      .map((r) => ({
        userId: r.userId.trim(),
        userName: staffList.find((s) => s._id === r.userId)?.name || '',
      }));

    const bundle = {
      expenses: enrichedExpenses,
      doctorShares: enrichedDoctorShares,
      assistedBy: assistedByClean,
      receptionStaff: receptionClean,
      consumptions,
      _id: selectedExpense?._id || Date.now().toString(),
    };
    setIsSaving(true);
    try {
      onLocalExpenseAdd(selectedProcedureId, bundle);
      setIsModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} className="max-w-5xl w-full">
      <div className="p-4 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white">{selectedExpense ? 'Edit Expenses' : 'Add Expenses'}</h1>
        <MdClose onClick={() => setIsModalOpen(false)} size={24} className="cursor-pointer text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" />
      </div>
      <hr className="border-gray dark:border-gray-700" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 gap-4">
          {expenses.length > 0 ? expenses.map((row) => (
            <div key={row.id} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
              <div className="md:col-span-1">
                <label className="block mb-2 text-sm text-gray-700 dark:text-gray-300">Description</label>
                <input className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3 text-black outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white" value={row.description} onChange={(e) => updateExpenseRow(row.id, 'description', e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className="block mb-2 text-sm text-gray-700 dark:text-gray-300">Category</label>
                <AsyncPaginate
                  value={row.expenseCategoryId ? { value: row.expenseCategoryId, label: categories.find(c => c._id === row.expenseCategoryId)?.name || 'Select Category', categoryData: categories.find(c => c._id === row.expenseCategoryId) } : null}
                  loadOptions={async (searchQuery, loadedOptions, additional) => {
                    const filtered = categories.filter((cat) =>
                      cat.name.toLowerCase().includes(searchQuery.toLowerCase())
                    );
                    const options = filtered.map((cat) => ({
                      value: cat._id,
                      label: cat.name,
                      categoryData: cat,
                    }));
                    return {
                      options,
                      hasMore: false,
                    };
                  }}
                  onChange={(option) => updateExpenseRow(row.id, 'expenseCategoryId', option?.value || '')}
                  getOptionLabel={(option) => option.label}
                  getOptionValue={(option) => option.value}
                  placeholder="Search category..."
                  classNamePrefix="react-select"
                  className="w-full"
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  styles={{
                    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                    menu: (base) => ({ ...base, zIndex: 9999 }),
                  }}
                />
              </div>
              <div>
                <label className="block mb-2 text-sm text-gray-700 dark:text-gray-300">Amount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3 text-black outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
                  value={Number.isNaN(row.amount) ? '' : row.amount}
                  onChange={(e) => {
                    const v = e.target.value;
                    updateExpenseRow(row.id, 'amount', v === '' ? NaN : parseFloat(v));
                  }}
                />
              </div>
              <div className="flex flex-col items-start gap-2">
                 <span className="text-sm">Deduct from Price before Doctor Share</span>
                <input type="checkbox" checked={row.deductBeforeDoctorShare} onChange={(e) => updateExpenseRow(row.id, 'deductBeforeDoctorShare', e.target.checked)} />
               
              </div>
              <div className="flex flex-col items-start gap-2">
                <span className="text-sm">Show expense in print</span>
                <input type="checkbox" checked={row.showInPrint} onChange={(e) => updateExpenseRow(row.id, 'showInPrint', e.target.checked)} />
                
              </div>
              <button type="button" onClick={() => removeExpenseRow(row.id)} className="text-red-500 hover:text-red-700">
                <FaTrashAlt size={16} />
              </button>
            </div>
          )) : null}
          <button type="button" onClick={addExpenseRow} className="px-3 py-2 bg-primary text-white rounded-md w-fit">Add Expense</button>
        </div>

        <div className="grid grid-cols-1 gap-4 rounded-lg border border-stroke dark:border-strokedark p-4">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-white">Doctor (procedure share)</h2>
          {doctorShares.length > 0 ? doctorShares.map((row) => (
            <div key={row.id} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              <div className="md:col-span-2">
                <label className="block mb-2 text-sm text-gray-700 dark:text-gray-300">Doctor</label>
                <AsyncPaginate
                  value={row.doctorId ? { value: row.doctorId, label: doctors.find(d => d._id === row.doctorId)?.name || 'Select Doctor', doctorData: doctors.find(d => d._id === row.doctorId) } : null}
                  loadOptions={loadDoctorOptions}
                  onChange={(option) => handleDoctorSelect(row.id, option)}
                  getOptionLabel={(option) => option.label}
                  getOptionValue={(option) => option.value}
                  placeholder="Search doctor..."
                  additional={{ page: 1 }}
                  classNamePrefix="react-select"
                  className="w-full"
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  styles={{
                    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                    menu: (base) => ({ ...base, zIndex: 9999 }),
                  }}
                />
              </div>
              <div>
                <label className="block mb-2 text-sm text-gray-700 dark:text-gray-300">Share</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3 text-black outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
                  value={Number.isNaN(row.share) ? '' : row.share}
                  onChange={(e) => {
                    const v = e.target.value;
                    updateDoctorShareRow(row.id, 'share', v === '' ? NaN : parseFloat(v));
                  }}
                />
              </div>
              <div>
                <label className="block mb-2 text-sm text-gray-700 dark:text-gray-300">Share Type</label>
                <select className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3 text-black outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white" value={row.shareType} onChange={(e) => updateDoctorShareRow(row.id, 'shareType', e.target.value as 'value' | 'percentage')}>
                  <option value="value">value</option>
                  <option value="percentage">percentage</option>
                </select>
              </div>
              <button type="button" onClick={() => removeDoctorShareRow(row.id)} className="text-red-500 hover:text-red-700 mb-3">
                 <FaTrashAlt size={16} />
              </button>
            </div>
          )) : null}
          <button type="button" onClick={addDoctorShareRow} className="px-3 py-2 bg-primary text-white rounded-md w-fit">
            Add doctor
          </button>
          <span className="text-xs text-gray-500 mt-1">One or more doctors with share splits. Shown as &quot;Doctor&quot; on the invoice.</span>
        </div>

        <div className="grid grid-cols-1 gap-4 rounded-lg border border-stroke dark:border-strokedark p-4">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-white">Assisted By</h2>
          {assistedByRows.length > 0
            ? assistedByRows.map((row) => (
                <div key={row.id} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  <div className="md:col-span-3">
                    <label className="block mb-2 text-sm text-gray-700 dark:text-gray-300">Staff</label>
                    <AsyncPaginate
                      value={
                        row.userId
                          ? {
                              value: row.userId,
                              label:
                                staffList.find((s) => s._id === row.userId)?.name || 'Select staff',
                              staffData: staffList.find((s) => s._id === row.userId),
                            }
                          : null
                      }
                      loadOptions={loadStaffOptions}
                      onChange={(option) => updateAssistedRow(row.id, option?.value || '')}
                      getOptionLabel={(option) => option.label}
                      getOptionValue={(option) => option.value}
                      placeholder="Search staff..."
                      additional={{ page: 1 }}
                      classNamePrefix="react-select"
                      className="w-full"
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                      styles={{
                        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                        menu: (base) => ({ ...base, zIndex: 9999 }),
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAssistedRow(row.id)}
                    className="text-red-500 hover:text-red-700 mb-3"
                  >
                    <FaTrashAlt size={16} />
                  </button>
                </div>
              ))
            : null}
          <button type="button" onClick={addAssistedRow} className="px-3 py-2 bg-gray-700 bg-primary text-white rounded-md w-fit">
            Add assistant
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 rounded-lg border border-stroke dark:border-strokedark p-4">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-white">Reception</h2>
          {receptionRows.length > 0
            ? receptionRows.map((row) => (
                <div key={row.id} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  <div className="md:col-span-3">
                    <label className="block mb-2 text-sm text-gray-700 dark:text-gray-300">Reception staff</label>
                    <AsyncPaginate
                      value={
                        row.userId
                          ? {
                              value: row.userId,
                              label:
                                staffList.find((s) => s._id === row.userId)?.name || 'Select staff',
                              staffData: staffList.find((s) => s._id === row.userId),
                            }
                          : null
                      }
                      loadOptions={loadStaffOptions}
                      onChange={(option) => updateReceptionRow(row.id, option?.value || '')}
                      getOptionLabel={(option) => option.label}
                      getOptionValue={(option) => option.value}
                      placeholder="Search reception..."
                      additional={{ page: 1 }}
                      classNamePrefix="react-select"
                      className="w-full"
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                      styles={{
                        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                        menu: (base) => ({ ...base, zIndex: 9999 }),
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeReceptionRow(row.id)}
                    className="text-red-500 hover:text-red-700 mb-3"
                  >
                    <FaTrashAlt size={16} />
                  </button>
                </div>
              ))
            : null}
          <button type="button" onClick={addReceptionRow} className="px-3 py-2 bg-gray-700 text-white rounded-md bg-primary w-fit">
            Add reception
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {consumptions.length > 0 ? consumptions.map((row) => (
            <div key={row.id} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              <div className="md:col-span-2">
                <label className="block mb-2 text-sm text-gray-700 dark:text-gray-300">Items</label>
                <AsyncPaginate
                  value={row.pharmItemId ? { value: row.pharmItemId, label: items.find(i => i._id === row.pharmItemId)?.name || row.itemName || 'Select Item', itemData: items.find(i => i._id === row.pharmItemId) } : null}
                  loadOptions={loadItemOptions}
                  onChange={(option) => updateConsumptionRow(row.id, 'pharmItemId', option?.value || '')}
                  getOptionLabel={(option) => option.label}
                  getOptionValue={(option) => option.value}
                  placeholder="Search item..."
                  additional={{ page: 1 }}
                  classNamePrefix="react-select"
                  className="w-full"
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  styles={{
                    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                    menu: (base) => ({ ...base, zIndex: 9999 }),
                  }}
                />
              </div>
              <div>
                <label className="block mb-2 text-sm text-gray-700 dark:text-gray-300">Qty</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3 text-black outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
                  value={Number.isNaN(row.qty) ? '' : row.qty}
                  onChange={(e) => {
                    const v = e.target.value;
                    updateConsumptionRow(row.id, 'qty', v === '' ? NaN : parseFloat(v));
                  }}
                />
              </div>
              <div>
                <label className="block mb-2 text-sm text-gray-700 dark:text-gray-300">Batch</label>
                <select className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3 text-black outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white" value={row.batchNumber} onChange={(e) => updateConsumptionRow(row.id, 'batchNumber', e.target.value)}>
                  <option value="">Select Batch</option>
                  {row.availableBatches.map((b) => (
                    <option key={b.batchNumber} value={b.batchNumber}>{b.batchNumber}</option>
                  ))}
                </select>
              </div>
              <button type="button" onClick={() => removeConsumptionRow(row.id)} className="text-red-500 hover:text-red-700 mb-3">
                 <FaTrashAlt size={16} />
              </button>
            </div>
          )) : null}
          <button type="button" onClick={addConsumptionRow} className="px-3 py-2 bg-primary text-white rounded-md w-fit">Add Pharmacy Consumption</button>
        </div>

        <div className="pt-2">
          <button type="button" onClick={handleSave} className="flex  w-44 justify-center float-end mb-5 rounded-lg bg-primary p-3 font-medium text-white hover:bg-opacity-90 transition-colors duration-200 disabled:opacity-50" disabled={isSaving}>
            {isSaving ? 'Saving...' : (selectedExpense ? 'Update' : 'Save')}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AddProcedureExpense;
