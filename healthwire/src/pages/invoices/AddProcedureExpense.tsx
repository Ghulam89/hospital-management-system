import React, { useEffect, useState } from 'react';
import Modal from '../../components/modal';
import { MdClose } from 'react-icons/md';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Base_url } from '../../utils/Base_url';
import { AsyncPaginate, LoadOptions } from 'react-select-async-paginate';
import { FaTrashAlt } from 'react-icons/fa';
import { normalizeProcedureExpenseRow } from './invoiceExpenseUtils';

/** Populated refs from API (`{ _id, name }`) — normalize for selects and save */
function refId(value: unknown): string {
  if (value == null || value === '') return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && '_id' in value) {
    const idVal = (value as { _id: unknown })._id;
    if (idVal != null && idVal !== '') return String(idVal);
  }
  return '';
}

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

/** Full doctor row from API so procedure share can default to registration sharePrice / shareType */
function doctorFromApi(raw: unknown): Doctor | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = refId(o._id);
  if (!id) return null;
  const name = String(o.name || '');
  const sp = o.sharePrice;
  const st = o.shareType;
  const doc: Doctor = { _id: id, name };
  if (sp != null && String(sp).trim() !== '') doc.sharePrice = String(sp);
  if (st != null && String(st).trim() !== '') doc.shareType = String(st);
  return doc;
}

function defaultShareAmountFromDoctor(doc: Doctor | null | undefined): number | undefined {
  if (!doc) return undefined;
  const raw = doc.sharePrice;
  if (raw == null || String(raw).trim() === '') return undefined;
  const n = Number(String(raw).replace(/,/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

function defaultShareTypeFromDoctor(doc: Doctor | null | undefined): 'value' | 'percentage' {
  if (!doc?.shareType || String(doc.shareType).trim() === '') return 'value';
  const t = String(doc.shareType).toLowerCase();
  if (t.includes('percent')) return 'percentage';
  return 'value';
}

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

function isProcCostingRequiredFromDate(procedureDate: string | undefined): boolean {
  const trimmed = String(procedureDate ?? '').trim();
  if (!trimmed) return false;
  const ymd = trimmed.slice(0, 10);
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
}

type AddProcedureExpenseProps = {
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  selectedExpense: any;
  categories: Category[];
  selectedProcedureId: number | null;
  /** Procedure row date (YYYY-MM-DD…); doctor/staff rules apply only when today or earlier */
  procedureDate?: string;
  /** Row-level Performed By — counts as doctor for validation when costing is required */
  performedBy?: string;
  onLocalExpenseAdd: (procedureRowId: number | null, expenseBundle: any) => void;
};

const AddProcedureExpense: React.FC<AddProcedureExpenseProps> = ({
  isModalOpen,
  setIsModalOpen,
  selectedExpense,
  categories,
  selectedProcedureId,
  procedureDate,
  performedBy,
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
          ? selectedExpense.expenses.map((e: unknown, i: number) =>
              normalizeProcedureExpenseRow(e, i) as ExpenseRow,
            )
          : [];
        const normalizedDoctorShares: DoctorShareRow[] = Array.isArray(selectedExpense.doctorShares)
          ? selectedExpense.doctorShares.map((d: any, i: number) => ({
              id: typeof d.id === 'number' ? d.id : i + 1,
              doctorId: refId(d?.doctorId ?? d?.userId ?? d?.doctor),
              share: (() => {
                const v = d.share ?? d.shareValue ?? d.amount;
                return typeof v === 'number' ? v : (v === '' || v == null ? NaN : Number(v));
              })(),
              shareType:
                String(d.shareType || d.type || '').toLowerCase() === 'percentage'
                  ? 'percentage'
                  : 'value',
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

      const mergedDocs = doctorsData
        .map((d: unknown) => doctorFromApi(d))
        .filter((d): d is Doctor => d != null);
      if (mergedDocs.length > 0) {
        setDoctors((prev) => {
          const out = [...prev];
          for (const nd of mergedDocs) {
            const i = out.findIndex((x) => x._id === nd._id);
            if (i >= 0) out[i] = { ...out[i], ...nd };
            else out.push(nd);
          }
          return out;
        });
      }

      const options = mergedDocs.map((doctor) => ({
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
      const newDoc = doctorFromApi(response.data?.data);
      if (newDoc) {
        setDoctors((prev) => {
          const i = prev.findIndex((x) => x._id === newDoc._id);
          if (i >= 0) {
            const next = [...prev];
            next[i] = { ...next[i], ...newDoc };
            return next;
          }
          return [...prev, newDoc];
        });
        return newDoc;
      }
    } catch {
      /* skip */
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
  
  const handleDoctorSelect = async (rowId: number, option: DoctorOption | null) => {
    const selectedId = option?.value?.trim() || '';
    if (!selectedId) {
      setDoctorShares((prev) =>
        prev.map((r) =>
          r.id === rowId ? { ...r, doctorId: '', share: NaN, shareType: 'value' } : r,
        ),
      );
      return;
    }

    let doc: Doctor | null = option?.doctorData
      ? doctorFromApi(option.doctorData as unknown)
      : null;
    const hasProfileShare =
      !!doc &&
      (String(doc.sharePrice ?? '').trim() !== '' ||
        (!!doc.shareType && String(doc.shareType).trim() !== ''));
    if (!hasProfileShare && selectedId) {
      const cached = doctors.find((d) => d._id === selectedId);
      if (
        cached &&
        (String(cached.sharePrice ?? '').trim() !== '' ||
          String(cached.shareType ?? '').trim() !== '')
      ) {
        doc = { ...cached };
      } else {
        const enriched = await loadDoctorById(selectedId);
        if (enriched) doc = enriched;
      }
    }

    const shareFromProfile = defaultShareAmountFromDoctor(doc);
    const typeFromProfile = defaultShareTypeFromDoctor(doc);

    if (doc) {
      setDoctors((prev) => {
        if (prev.some((x) => x._id === doc._id)) {
          return prev.map((x) => (x._id === doc._id ? { ...x, ...doc } : x));
        }
        return [...prev, doc];
      });
    }

    setDoctorShares((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? {
              ...r,
              doctorId: selectedId,
              share: shareFromProfile !== undefined ? shareFromProfile : r.share,
              shareType: doc ? typeFromProfile : r.shareType,
            }
          : r,
      ),
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
    const costingRequired = isProcCostingRequiredFromDate(procedureDate);
    const hasDoctorShare = doctorShares.some((d) => hexId(String(d.doctorId || '').trim()));
    const hasPerformedByRow = hexId(String(performedBy || '').trim());
    if (costingRequired && !hasDoctorShare && !hasPerformedByRow) {
      toast.error(
        'Add at least one doctor under Doctor (procedure share), or set Performed By on the procedure row (required for dates today or earlier).',
      );
      return;
    }
    if (costingRequired) {
      const hasAssisted = assistedByRows.some((r) => hexId(String(r.userId || '').trim()));
      if (!hasAssisted) {
        toast.error('Add at least one staff under Assisted By (required when procedure date is today or earlier)');
        return;
      }
      const hasReception = receptionRows.some((r) => hexId(String(r.userId || '').trim()));
      if (!hasReception) {
        toast.error('Add at least one staff under Reception (required when procedure date is today or earlier)');
        return;
      }
    }
    const enrichedExpenses = expenses.map((e) => ({
      ...e,
      deductBeforeDoctorShare: !!e.deductBeforeDoctorShare,
      showInPrint: !!e.showInPrint,
      categoryName: categories.find((c) => c._id === e.expenseCategoryId)?.name || '',
    }));
    const enrichedDoctorShares = doctorShares.map((d) => {
      const parsed = Number(d.share);
      return {
        ...d,
        share: Number.isFinite(parsed) ? parsed : 0,
        doctorName: doctors.find((doc) => doc._id === d.doctorId)?.name || '',
      };
    });
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

    const primaryDoctorProfile =
      enrichedDoctorShares
        .map((d) => doctors.find((doc) => doc._id === d.doctorId) || null)
        .find((doc) => !!doc) || null;

    const bundle = {
      expenses: enrichedExpenses,
      doctorShares: enrichedDoctorShares,
      primaryDoctorProfile: primaryDoctorProfile
        ? {
            _id: primaryDoctorProfile._id,
            name: primaryDoctorProfile.name,
            sharePrice: primaryDoctorProfile.sharePrice,
            shareType: primaryDoctorProfile.shareType,
          }
        : null,
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
        <div className="rounded-lg border border-stroke dark:border-strokedark p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-white">Procedure expenses</h2>
          {expenses.length > 0 && (
            <div className="hidden md:grid md:grid-cols-12 gap-3 text-xs font-semibold text-gray-600 dark:text-gray-400 pb-1 border-b border-stroke dark:border-strokedark">
              <div className="md:col-span-2">Description</div>
              <div className="md:col-span-3">Category</div>
              <div className="md:col-span-2">Amount</div>
              <div className="md:col-span-3 text-center leading-tight px-1">
                Deduct from Price before Doctor Share
              </div>
              <div className="md:col-span-1 text-center leading-tight px-1">Show expense in print</div>
              <div className="md:col-span-1" />
            </div>
          )}
          {expenses.length > 0 ? expenses.map((row) => (
            <div key={row.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-2">
                <label className="block mb-2 text-sm text-gray-700 dark:text-gray-300 md:hidden">Description</label>
                <input className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3 text-black outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white" value={row.description} onChange={(e) => updateExpenseRow(row.id, 'description', e.target.value)} />
              </div>
              <div className="md:col-span-3">
                <label className="block mb-2 text-sm text-gray-700 dark:text-gray-300 md:hidden">Category</label>
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
              <div className="md:col-span-2">
                <label className="block mb-2 text-sm text-gray-700 dark:text-gray-300 md:hidden">Amount</label>
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
              <div className="md:col-span-3 flex flex-col items-center justify-end gap-1 pb-2">
                <span className="text-xs text-gray-600 dark:text-gray-400 md:hidden text-center leading-tight">
                  Deduct from Price before Doctor Share
                </span>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={row.deductBeforeDoctorShare}
                  onChange={(e) => updateExpenseRow(row.id, 'deductBeforeDoctorShare', e.target.checked)}
                />
              </div>
              <div className="md:col-span-1 flex flex-col items-center justify-end gap-1 pb-2">
                <span className="text-xs text-gray-600 dark:text-gray-400 md:hidden text-center leading-tight">
                  Show expense in print
                </span>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={row.showInPrint}
                  onChange={(e) => updateExpenseRow(row.id, 'showInPrint', e.target.checked)}
                />
              </div>
              <button type="button" onClick={() => removeExpenseRow(row.id)} className="md:col-span-1 text-red-500 hover:text-red-700 pb-2">
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
