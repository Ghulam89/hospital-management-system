import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../../../components/modal';
import { MdClose } from 'react-icons/md';
import { FaTrashAlt } from 'react-icons/fa';
import axios from 'axios';
import { toast } from 'react-toastify';
import { AsyncPaginate, LoadOptions } from 'react-select-async-paginate';
import { Base_url } from '../../../utils/Base_url';
import {
  buildProcedureMasterPayload,
  mapProcedureApiToForm,
  type ConsumptionRow,
  type DoctorShareRow,
  type ExpenseRow,
} from './procedureMasterUtils';

interface Department {
  _id: string;
  name: string;
  subDepartment?: Array<{ name?: string } | string>;
}

type Category = { _id: string; name: string };
type Doctor = { _id: string; name: string; sharePrice?: string; shareType?: string };
type PharmItem = { _id: string; name: string; batches?: Array<{ batchNumber: string }> };

type DoctorOption = { value: string; label: string; doctorData?: Doctor };
type ItemOption = { value: string; label: string; itemData?: PharmItem };

const emptyForm = () => ({
  name: '',
  amount: '',
  departmentId: '',
  subDepartment: '',
  description: '',
  cost: '',
  discount: '',
  discountType: 0 as 0 | 1,
  taxRate: '',
});

const inputCls =
  'w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white';

const AddProcedure = ({
  isModalOpen,
  setIsModalOpen,
  selectedProcedure,
  fetchProcedureData,
}: {
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  selectedProcedure: { _id?: string } | null;
  fetchProcedureData: () => void;
}) => {
  const [formData, setFormData] = useState(emptyForm());
  const [doctorShares, setDoctorShares] = useState<DoctorShareRow[]>([]);
  const [defaultExpenses, setDefaultExpenses] = useState<ExpenseRow[]>([]);
  const [consumptions, setConsumptions] = useState<ConsumptionRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [items, setItems] = useState<PharmItem[]>([]);

  const selectedDept = departments.find((d) => d._id === formData.departmentId);
  const subDeptOptions = useMemo(() => {
    const raw = selectedDept?.subDepartment;
    if (!Array.isArray(raw)) return [];
    return raw
      .map((s) => (typeof s === 'string' ? s : String(s?.name || '').trim()))
      .filter(Boolean);
  }, [selectedDept]);

  const totalTaxPreview = useMemo(() => {
    const base = parseFloat(String(formData.amount)) || 0;
    const rate = parseFloat(String(formData.taxRate)) || 0;
    return Math.round(base * (rate / 100) * 100) / 100;
  }, [formData.amount, formData.taxRate]);

  const resetAll = () => {
    setFormData(emptyForm());
    setDoctorShares([]);
    setDefaultExpenses([]);
    setConsumptions([]);
  };

  const hydrate = (proc: Record<string, unknown>) => {
    const mapped = mapProcedureApiToForm(proc);
    setFormData({
      name: mapped.name,
      amount: mapped.amount,
      departmentId: mapped.departmentId,
      subDepartment: mapped.subDepartment,
      description: mapped.description,
      cost: mapped.cost,
      discount: mapped.discount,
      discountType: mapped.discountType as 0 | 1,
      taxRate: mapped.taxRate,
    });
    setDoctorShares(mapped.doctorShares);
    setDefaultExpenses(mapped.defaultExpenses);
    setConsumptions(mapped.consumptions);
  };

  useEffect(() => {
    if (!isModalOpen) return;
    if (selectedProcedure?._id) {
      setLoadingDetail(true);
      axios
        .get(`${Base_url}/apis/procedure/get/${selectedProcedure._id}`)
        .then((res) => {
          if (res?.data?.data) hydrate(res.data.data as Record<string, unknown>);
        })
        .catch(() => toast.error('Failed to load procedure details'))
        .finally(() => setLoadingDetail(false));
    } else {
      resetAll();
    }
  }, [selectedProcedure?._id, isModalOpen]);

  useEffect(() => {
    if (!isModalOpen) return;
    axios.get(`${Base_url}/apis/department/get`).then((res) => {
      setDepartments(res?.data?.data || []);
    });
    axios
      .get(`${Base_url}/apis/expenseCategory/get`, { params: { limit: 500 } })
      .then((res) => setCategories(res?.data?.data || []))
      .catch(() => setCategories([]));
  }, [isModalOpen]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'departmentId') next.subDepartment = '';
      return next;
    });
  };

  const loadDoctorOptions: LoadOptions<DoctorOption, never, { page: number }> = async (
    searchQuery,
    _loaded,
    additional,
  ) => {
    const page = additional?.page || 1;
    const res = await axios.get(`${Base_url}/apis/user/get`, {
      params: { role: 'doctor', page, limit: 20, search: searchQuery || '' },
    });
    const list: Doctor[] = res?.data?.data || [];
    list.forEach((d) => {
      setDoctors((prev) => (prev.some((x) => x._id === d._id) ? prev : [...prev, d]));
    });
    return {
      options: list.map((d) => ({ value: d._id, label: d.name, doctorData: d })),
      hasMore: page < (res?.data?.totalPages || 1),
      additional: { page: page + 1 },
    };
  };

  const loadItemOptions: LoadOptions<ItemOption, never, { page: number }> = async (
    searchQuery,
    _loaded,
    additional,
  ) => {
    const page = additional?.page || 1;
    const res = await axios.get(`${Base_url}/apis/pharmItem/get`, {
      params: { page, limit: 20, search: searchQuery || '' },
    });
    const list: PharmItem[] = res?.data?.data || [];
    list.forEach((it) => {
      setItems((prev) => (prev.some((x) => x._id === it._id) ? prev : [...prev, it]));
    });
    return {
      options: list.map((it) => ({ value: it._id, label: it.name, itemData: it })),
      hasMore: page < (res?.data?.totalPages || 1),
      additional: { page: page + 1 },
    };
  };

  const addDoctorShare = () => {
    setDoctorShares((prev) => [
      ...prev,
      {
        id: prev.length ? Math.max(...prev.map((r) => r.id)) + 1 : 1,
        doctorId: '',
        share: 0,
        shareType: 'percentage',
      },
    ]);
  };

  const updateDoctorShare = (id: number, field: keyof DoctorShareRow, value: unknown) => {
    setDoctorShares((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );
  };

  const removeDoctorShare = (id: number) => {
    setDoctorShares((prev) => prev.filter((r) => r.id !== id));
  };

  const addExpense = () => {
    setDefaultExpenses((prev) => [
      ...prev,
      {
        id: prev.length ? Math.max(...prev.map((r) => r.id)) + 1 : 1,
        description: '',
        expenseCategoryId: '',
        amount: 0,
        deductBeforeDoctorShare: false,
        showInPrint: false,
      },
    ]);
  };

  const updateExpense = (id: number, field: keyof ExpenseRow, value: unknown) => {
    setDefaultExpenses((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );
  };

  const removeExpense = (id: number) => {
    setDefaultExpenses((prev) => prev.filter((r) => r.id !== id));
  };

  const addConsumption = () => {
    setConsumptions((prev) => [
      ...prev,
      {
        id: prev.length ? Math.max(...prev.map((r) => r.id)) + 1 : 1,
        pharmItemId: '',
        itemName: '',
        qty: 1,
        batchNumber: '',
      },
    ]);
  };

  const updateConsumption = (id: number, field: keyof ConsumptionRow, value: unknown) => {
    setConsumptions((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        if (field === 'pharmItemId') {
          const item = items.find((i) => i._id === value);
          return {
            ...r,
            pharmItemId: String(value || ''),
            itemName: item?.name || r.itemName,
            batchNumber: '',
          };
        }
        return { ...r, [field]: value };
      }),
    );
  };

  const removeConsumption = (id: number) => {
    setConsumptions((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Please enter procedure name');
      return;
    }
    if (!formData.amount || Number.isNaN(Number(formData.amount))) {
      toast.error('Please enter a valid procedure price');
      return;
    }
    if (!formData.departmentId) {
      toast.error('Please select department');
      return;
    }
    if (!formData.cost || Number.isNaN(Number(formData.cost))) {
      toast.error('Please enter a valid expense cost');
      return;
    }

    const payload = buildProcedureMasterPayload({
      ...formData,
      doctorShares,
      defaultExpenses,
      consumptions,
    });

    setIsLoading(true);
    try {
      const request = selectedProcedure?._id
        ? axios.put(`${Base_url}/apis/procedure/update/${selectedProcedure._id}`, payload)
        : axios.post(`${Base_url}/apis/procedure/create`, payload);

      const res = await request;
      if (res.data.status === 'ok') {
        toast.success(`Procedure ${selectedProcedure?._id ? 'updated' : 'added'} successfully`);
        setIsModalOpen(false);
        fetchProcedureData();
      } else {
        toast.error(res.data.message || 'Operation failed');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to save procedure');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} className="max-w-5xl w-full">
      <div className="p-4 flex justify-between items-center bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
          {selectedProcedure?._id ? 'Edit Medical Procedure' : 'Add New Medical Procedure'}
        </h1>
        <MdClose
          onClick={() => setIsModalOpen(false)}
          size={24}
          className="cursor-pointer text-gray-500 hover:text-gray-700"
        />
      </div>
      <hr />
      {loadingDetail ? (
        <div className="p-8 text-center text-gray-500">Loading procedure…</div>
      ) : (
        <form onSubmit={handleSubmit} className="max-h-[75vh] overflow-y-auto">
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 text-sm font-medium">
                  Procedure Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={inputCls}
                  required
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium">
                  Procedure Price (PKR) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className={inputCls}
                  required
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium">
                  Department <span className="text-red-500">*</span>
                </label>
                <select
                  name="departmentId"
                  value={formData.departmentId}
                  onChange={handleChange}
                  className={inputCls}
                  required
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept._id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium">Sub-Department</label>
                <select
                  name="subDepartment"
                  value={formData.subDepartment}
                  onChange={handleChange}
                  className={inputCls}
                  disabled={!formData.departmentId}
                >
                  <option value="">Select Sub-Department</option>
                  {subDeptOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block mb-2 text-sm font-medium">Discount</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    name="discount"
                    value={formData.discount}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    className={inputCls}
                  />
                  <select
                    name="discountType"
                    value={formData.discountType}
                    onChange={handleChange}
                    className={`${inputCls} w-32`}
                  >
                    <option value={0}>Amount</option>
                    <option value={1}>%</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium">
                  Expense Cost (PKR) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="cost"
                  value={formData.cost}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className={inputCls}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 text-sm font-medium">Exclusive Tax (%)</label>
                <input
                  type="number"
                  name="taxRate"
                  value={formData.taxRate}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium">Total Tax (preview)</label>
                <input
                  type="text"
                  readOnly
                  value={`Rs. ${totalTaxPreview.toFixed(2)}`}
                  className={`${inputCls} bg-gray-50 cursor-not-allowed`}
                />
              </div>
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={2}
                className={inputCls}
              />
            </div>

            <div className="rounded-lg border border-stroke p-4 space-y-3">
              <h2 className="text-sm font-semibold">Doctor Share</h2>
              {doctorShares.map((row) => (
                <div key={row.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                  <div className="md:col-span-5">
                    <AsyncPaginate
                      value={
                        row.doctorId
                          ? {
                              value: row.doctorId,
                              label: doctors.find((d) => d._id === row.doctorId)?.name || 'Doctor',
                            }
                          : null
                      }
                      loadOptions={loadDoctorOptions}
                      onChange={(opt) => updateDoctorShare(row.id, 'doctorId', opt?.value || '')}
                      additional={{ page: 1 }}
                      classNamePrefix="react-select"
                      placeholder="Select Doctor"
                      menuPortalTarget={document.body}
                      styles={{ menuPortal: (b) => ({ ...b, zIndex: 9999 }) }}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className={inputCls}
                      placeholder="Share"
                      value={row.share || ''}
                      onChange={(e) =>
                        updateDoctorShare(row.id, 'share', parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div className="md:col-span-3">
                    <select
                      className={inputCls}
                      value={row.shareType}
                      onChange={(e) =>
                        updateDoctorShare(
                          row.id,
                          'shareType',
                          e.target.value as 'value' | 'percentage',
                        )
                      }
                    >
                      <option value="percentage">percentage</option>
                      <option value="value">value</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDoctorShare(row.id)}
                    className="md:col-span-1 text-red-500 pb-3"
                  >
                    <FaTrashAlt />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addDoctorShare}
                className="px-3 py-2 bg-primary text-white rounded-md text-sm"
              >
                Add Doctor Share +
              </button>
            </div>

            <div className="rounded-lg border border-stroke p-4 space-y-3">
              <h2 className="text-sm font-semibold">Default Expenses</h2>
              {defaultExpenses.map((row) => (
                <div key={row.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                  <div className="md:col-span-3">
                    <input
                      className={inputCls}
                      placeholder="Description"
                      value={row.description}
                      onChange={(e) => updateExpense(row.id, 'description', e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <select
                      className={inputCls}
                      value={row.expenseCategoryId}
                      onChange={(e) =>
                        updateExpense(row.id, 'expenseCategoryId', e.target.value)
                      }
                    >
                      <option value="">Category</option>
                      {categories.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <input
                      type="number"
                      min="0"
                      className={inputCls}
                      placeholder="Amount"
                      value={row.amount || ''}
                      onChange={(e) =>
                        updateExpense(row.id, 'amount', parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                  <label className="md:col-span-2 flex items-center gap-1 text-xs pb-3">
                    <input
                      type="checkbox"
                      checked={row.deductBeforeDoctorShare}
                      onChange={(e) =>
                        updateExpense(row.id, 'deductBeforeDoctorShare', e.target.checked)
                      }
                    />
                    Deduct before doctor share
                  </label>
                  <button
                    type="button"
                    onClick={() => removeExpense(row.id)}
                    className="md:col-span-1 text-red-500 pb-3"
                  >
                    <FaTrashAlt />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addExpense}
                className="px-3 py-2 bg-primary text-white rounded-md text-sm"
              >
                Add Expense +
              </button>
            </div>

            <div className="rounded-lg border border-stroke p-4 space-y-3">
              <h2 className="text-sm font-semibold">Pharmacy Consumptions</h2>
              {consumptions.map((row) => (
                <div key={row.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                  <div className="md:col-span-6">
                    <AsyncPaginate
                      value={
                        row.pharmItemId
                          ? {
                              value: row.pharmItemId,
                              label:
                                items.find((i) => i._id === row.pharmItemId)?.name ||
                                row.itemName ||
                                'Item',
                            }
                          : null
                      }
                      loadOptions={loadItemOptions}
                      onChange={(opt) => {
                        if (opt?.itemData) {
                          setItems((prev) =>
                            prev.some((x) => x._id === opt.itemData!._id)
                              ? prev
                              : [...prev, opt.itemData!],
                          );
                        }
                        updateConsumption(row.id, 'pharmItemId', opt?.value || '');
                      }}
                      additional={{ page: 1 }}
                      classNamePrefix="react-select"
                      placeholder="Search item"
                      menuPortalTarget={document.body}
                      styles={{ menuPortal: (b) => ({ ...b, zIndex: 9999 }) }}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <input
                      type="number"
                      min="1"
                      className={inputCls}
                      placeholder="Qty"
                      value={row.qty}
                      onChange={(e) =>
                        updateConsumption(row.id, 'qty', parseInt(e.target.value, 10) || 1)
                      }
                    />
                  </div>
                  <div className="md:col-span-3">
                    <select
                      className={inputCls}
                      value={row.batchNumber}
                      onChange={(e) => updateConsumption(row.id, 'batchNumber', e.target.value)}
                      disabled={!row.pharmItemId}
                    >
                      <option value="">No Batch</option>
                      {(items.find((i) => i._id === row.pharmItemId)?.batches || []).map(
                        (b) => (
                          <option key={b.batchNumber} value={b.batchNumber}>
                            {b.batchNumber}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeConsumption(row.id)}
                    className="md:col-span-1 text-red-500 pb-3"
                  >
                    <FaTrashAlt />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addConsumption}
                className="px-3 py-2 bg-primary text-white rounded-md text-sm"
              >
                Add Pharmacy Consumptions +
              </button>
            </div>

            <button
              type="submit"
              className="flex w-full justify-center rounded-lg bg-primary p-3 font-medium text-white disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading
                ? 'Saving…'
                : selectedProcedure?._id
                  ? 'Update Procedure'
                  : 'Add Procedure'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default AddProcedure;
