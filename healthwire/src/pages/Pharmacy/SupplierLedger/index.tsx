import React, { useMemo, useState, useCallback } from 'react';
import axios from 'axios';
import { Base_url } from '../../../utils/Base_url';
import { toast } from 'react-toastify';
import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import { AsyncPaginate, LoadOptions } from 'react-select-async-paginate';
import * as XLSX from 'xlsx';

type SupplierOption = {
  label: string;
  value: string;
  supplierData: { _id: string; name: string; phone?: string };
};

type LedgerEntry = {
  date: string;
  description: string;
  reference?: string;
  type: string;
  debit: number;
  credit: number;
  balance: number;
  source?: 'purchase' | 'supplier';
  purchaseId?: string;
  paymentId?: string;
  method?: string;
  payDate?: string;
  paid?: number;
  chequeNo?: string;
  bankName?: string;
  chequeDate?: string | null;
  notes?: string;
  adjustmentId?: string;
  direction?: string;
  amount?: number;
};

type LedgerData = {
  supplier: { _id: string; name: string; phone?: string; openingBalance?: number };
  entries: LedgerEntry[];
  closingBalance: number;
};

type PaymentRow = {
  method: string;
  paid: string;
  payDate: string;
  reference: string;
  chequeNo: string;
  bankName: string;
  chequeDate: string;
  notes: string;
};

const SupplierLedger: React.FC = () => {
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierOption | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [entryTypeFilter, setEntryTypeFilter] = useState<'all' | 'opening' | 'purchase' | 'payment' | 'adjustment'>('all');
  const [entrySearch, setEntrySearch] = useState('');
  const [ledger, setLedger] = useState<LedgerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentTargetPurchaseId, setPaymentTargetPurchaseId] = useState<string | null>(null);
  const [savingPayment, setSavingPayment] = useState(false);
  const [editPaymentModalOpen, setEditPaymentModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null);
  const [savingEditPayment, setSavingEditPayment] = useState(false);
  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false);
  const [savingAdjustment, setSavingAdjustment] = useState(false);
  const [editAdjustmentModalOpen, setEditAdjustmentModalOpen] = useState(false);
  const [savingEditAdjustment, setSavingEditAdjustment] = useState(false);
  const [paymentRows, setPaymentRows] = useState<PaymentRow[]>([
    {
      method: 'Cash',
      paid: '',
      payDate: new Date().toISOString().slice(0, 10),
      reference: '',
      chequeNo: '',
      bankName: '',
      chequeDate: '',
      notes: '',
    },
  ]);
  const [editPaymentRow, setEditPaymentRow] = useState<PaymentRow>({
    method: 'Cash',
    paid: '',
    payDate: new Date().toISOString().slice(0, 10),
    reference: '',
    chequeNo: '',
    bankName: '',
    chequeDate: '',
    notes: '',
  });
  const [adjustmentRow, setAdjustmentRow] = useState({
    direction: 'Debit',
    amount: '',
    adjDate: new Date().toISOString().slice(0, 10),
    reference: '',
    notes: '',
  } as { direction: string; amount: string; adjDate: string; reference: string; notes: string });
  const [editAdjustmentRow, setEditAdjustmentRow] = useState({
    direction: 'Debit',
    amount: '',
    adjDate: new Date().toISOString().slice(0, 10),
    reference: '',
    notes: '',
  } as { direction: string; amount: string; adjDate: string; reference: string; notes: string });

  const loadSupplierOptions: LoadOptions<SupplierOption, never, { page: number }> = async (
    searchQuery,
    _loadedOptions,
    additional
  ) => {
    const page = (additional && (additional as { page?: number }).page) ?? 1;
    try {
      const response = await axios.get(`${Base_url}/apis/pharmSupplier/get`, {
        params: {
          page,
          limit: 20,
          search: searchQuery || '',
        },
      });
      const { data, totalPages } = response.data;
      return {
        options: (data || []).map((item: { _id: string; name: string; phone?: string }) => ({
          label: item.name + (item.phone ? ` (${item.phone})` : ''),
          value: item._id,
          supplierData: item,
        })),
        hasMore: page < (totalPages || 1),
        additional: { page: page + 1 },
      };
    } catch {
      toast.error('Failed to search suppliers');
      return { options: [], hasMore: false, additional: { page: 1 } };
    }
  };

  const fetchLedger = useCallback(async () => {
    if (!selectedSupplier?.value) {
      toast.error('Please select a supplier');
      return;
    }
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      const res = await axios.get(
        `${Base_url}/apis/pharmSupplier/ledger/${selectedSupplier.value}`,
        { params }
      );
      if (res.data?.status === 'ok' && res.data?.data) {
        setLedger(res.data.data);
      } else {
        setLedger(null);
        toast.error('No ledger data found');
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error('Failed to load supplier ledger');
      setLedger(null);
    } finally {
      setLoading(false);
    }
  }, [selectedSupplier?.value, fromDate, toDate]);

  const filteredEntries = useMemo(() => {
    const entries = ledger?.entries || [];
    const q = entrySearch.trim().toLowerCase();
    return entries.filter((e) => {
      if (entryTypeFilter !== 'all' && String(e.type || '').toLowerCase() !== entryTypeFilter) {
        return false;
      }
      if (!q) return true;
      const ref = String(e.reference || '').toLowerCase();
      const desc = String(e.description || '').toLowerCase();
      return ref.includes(q) || desc.includes(q);
    });
  }, [ledger?.entries, entrySearch, entryTypeFilter]);

  const summary = useMemo(() => {
    const totalDebit = filteredEntries.reduce((sum, e) => sum + (Number(e.debit) || 0), 0);
    const totalCredit = filteredEntries.reduce((sum, e) => sum + (Number(e.credit) || 0), 0);
    const netBalance = totalDebit - totalCredit;
    const count = filteredEntries.length;

    const debitLabel =
      entryTypeFilter === 'purchase'
        ? 'Total Purchase'
        : entryTypeFilter === 'opening'
          ? 'Opening'
          : 'Total Debit';

    const countLabel =
      entryTypeFilter === 'purchase'
        ? 'Purchases'
        : entryTypeFilter === 'payment'
          ? 'Payments'
          : entryTypeFilter === 'opening'
            ? 'Openings'
            : entryTypeFilter === 'adjustment'
              ? 'Adjustments'
              : 'Entries';

    return { totalDebit, totalCredit, netBalance, count, debitLabel, countLabel };
  }, [filteredEntries, entryTypeFilter]);

  const exportLedgerToExcel = () => {
    if (!filteredEntries.length) {
      toast.error('No ledger data to export');
      return;
    }

    const exportData = filteredEntries.map((row) => ({
      Date: new Date(row.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      'Invoice No': row.reference || '',
      Desc: row.description || '',
      Debt: Number(row.debit || 0),
      Cred: Number(row.credit || 0),
      Bal: Number(row.balance || 0),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    ws['!cols'] = [{ wch: 12 }, { wch: 14 }, { wch: 40 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Supplier_Ledger');
    const fileName = `Supplier_Ledger_${ledger.supplier._id}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success('Excel exported');
  };

  const openPaymentModal = (purchaseId: string | null) => {
    setPaymentTargetPurchaseId(purchaseId);
    setPaymentRows([
      {
        method: 'Cash',
        paid: '',
        payDate: new Date().toISOString().slice(0, 10),
        reference: '',
        chequeNo: '',
        bankName: '',
        chequeDate: '',
        notes: '',
      },
    ]);
    setPaymentModalOpen(true);
  };

  const submitLedgerPayment = async () => {
    if (!selectedSupplier?.value) {
      toast.error('Please select a supplier');
      return;
    }

    for (const row of paymentRows) {
      const amount = Number(row.paid) || 0;
      if (amount <= 0) continue;
      if (row.method === 'Cheque') {
        if (!row.chequeNo?.trim() || !row.bankName?.trim() || !row.chequeDate) {
          toast.error('Cheque payments require cheque no, bank name, and cheque date');
          return;
        }
      }
    }

    const payments = paymentRows
      .map((p) => ({
        method: p.method,
        paid: Number(p.paid) || 0,
        payDate: p.payDate,
        reference: p.reference,
        chequeNo: p.chequeNo,
        bankName: p.bankName,
        chequeDate: p.chequeDate || undefined,
        notes: p.notes,
      }))
      .filter((p) => p.paid > 0);

    if (payments.length === 0) {
      toast.error('Please enter at least one payment amount');
      return;
    }

    setSavingPayment(true);
    try {
      const endpoint = paymentTargetPurchaseId
        ? `${Base_url}/apis/pharmSupplier/purchase-ledger-payment/${selectedSupplier.value}/${paymentTargetPurchaseId}`
        : `${Base_url}/apis/pharmSupplier/ledger-payment/${selectedSupplier.value}`;
      const res = await axios.post(endpoint, { payments });
      if (res.data?.status === 'ok') {
        toast.success('Payment added');
        setPaymentModalOpen(false);
        setPaymentTargetPurchaseId(null);
        await fetchLedger();
      } else {
        toast.error(res.data?.message || 'Failed to add payment');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || err?.response?.data?.error || 'Failed to add payment');
    } finally {
      setSavingPayment(false);
    }
  };

  const openEditPayment = (row: LedgerEntry) => {
    setEditingEntry(row);
    setEditPaymentRow({
      method: row.method || 'Cash',
      paid: String(row.paid ?? row.credit ?? ''),
      payDate: (row.payDate ? String(row.payDate) : String(row.date)).slice(0, 10),
      reference: row.reference || '',
      chequeNo: row.chequeNo || '',
      bankName: row.bankName || '',
      chequeDate: (row.chequeDate ? String(row.chequeDate) : '').slice(0, 10),
      notes: row.notes || '',
    });
    setEditPaymentModalOpen(true);
  };
  const openAdjustmentModal = () => {
    setAdjustmentRow({
      direction: 'Debit',
      amount: '',
      adjDate: new Date().toISOString().slice(0, 10),
      reference: '',
      notes: '',
    });
    setAdjustmentModalOpen(true);
  };
  const openEditAdjustment = (row: LedgerEntry) => {
    setEditingEntry(row);
    setEditAdjustmentRow({
      direction: row.direction || 'Debit',
      amount: String(row.amount ?? (row.debit ? row.debit : row.credit ? row.credit : '')),
      adjDate: String(row.date).slice(0, 10),
      reference: row.reference || '',
      notes: row.notes || '',
    });
    setEditAdjustmentModalOpen(true);
  };

  const submitEditPayment = async () => {
    if (!selectedSupplier?.value || !editingEntry?.paymentId) {
      toast.error('Invalid payment selected');
      return;
    }

    const amount = Number(editPaymentRow.paid) || 0;
    if (amount < 0) {
      toast.error('Invalid payment amount');
      return;
    }

    if (editPaymentRow.method === 'Cheque') {
      if (!editPaymentRow.chequeNo?.trim() || !editPaymentRow.bankName?.trim() || !editPaymentRow.chequeDate) {
        toast.error('Cheque payments require cheque no, bank name, and cheque date');
        return;
      }
    }

    setSavingEditPayment(true);
    try {
      const endpoint =
        editingEntry.source === 'purchase' && editingEntry.purchaseId
          ? `${Base_url}/apis/pharmSupplier/purchase-ledger-payment/${selectedSupplier.value}/${editingEntry.purchaseId}/${editingEntry.paymentId}`
          : `${Base_url}/apis/pharmSupplier/ledger-payment/${selectedSupplier.value}/${editingEntry.paymentId}`;

      const res = await axios.put(endpoint, {
        payment: {
          method: editPaymentRow.method,
          paid: amount,
          payDate: editPaymentRow.payDate,
          reference: editPaymentRow.reference,
          chequeNo: editPaymentRow.chequeNo,
          bankName: editPaymentRow.bankName,
          chequeDate: editPaymentRow.chequeDate || undefined,
          notes: editPaymentRow.notes,
        },
      });
      if (res.data?.status === 'ok') {
        toast.success('Payment updated');
        setEditPaymentModalOpen(false);
        setEditingEntry(null);
        await fetchLedger();
      } else {
        toast.error(res.data?.message || 'Failed to update payment');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || err?.response?.data?.error || 'Failed to update payment');
    } finally {
      setSavingEditPayment(false);
    }
  };
  const submitLedgerAdjustment = async () => {
    if (!selectedSupplier?.value) {
      toast.error('Please select a supplier');
      return;
    }
    const amount = Number(adjustmentRow.amount) || 0;
    if (amount <= 0) {
      toast.error('Invalid adjustment amount');
      return;
    }
    const direction = adjustmentRow.direction;
    if (!(direction === 'Debit' || direction === 'Credit')) {
      toast.error('Direction must be Debit or Credit');
      return;
    }
    setSavingAdjustment(true);
    try {
      const res = await axios.post(
        `${Base_url}/apis/pharmSupplier/ledger-adjustment/${selectedSupplier.value}`,
        {
          adjustment: {
            direction,
            amount,
            adjDate: adjustmentRow.adjDate,
            reference: adjustmentRow.reference,
            notes: adjustmentRow.notes,
          },
        }
      );
      if (res.data?.status === 'ok') {
        toast.success('Adjustment added');
        setAdjustmentModalOpen(false);
        await fetchLedger();
      } else {
        toast.error(res.data?.message || 'Failed to add adjustment');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || err?.response?.data?.error || 'Failed to add adjustment');
    } finally {
      setSavingAdjustment(false);
    }
  };
  const submitEditAdjustment = async () => {
    if (!selectedSupplier?.value || !editingEntry?.adjustmentId) {
      toast.error('Invalid adjustment selected');
      return;
    }
    const amount = Number(editAdjustmentRow.amount) || 0;
    if (amount <= 0) {
      toast.error('Invalid adjustment amount');
      return;
    }
    const direction = editAdjustmentRow.direction;
    if (!(direction === 'Debit' || direction === 'Credit')) {
      toast.error('Direction must be Debit or Credit');
      return;
    }
    setSavingEditAdjustment(true);
    try {
      const res = await axios.put(
        `${Base_url}/apis/pharmSupplier/ledger-adjustment/${selectedSupplier.value}/${editingEntry.adjustmentId}`,
        {
          adjustment: {
            direction,
            amount,
            adjDate: editAdjustmentRow.adjDate,
            reference: editAdjustmentRow.reference,
            notes: editAdjustmentRow.notes,
          },
        }
      );
      if (res.data?.status === 'ok') {
        toast.success('Adjustment updated');
        setEditAdjustmentModalOpen(false);
        setEditingEntry(null);
        await fetchLedger();
      } else {
        toast.error(res.data?.message || 'Failed to update adjustment');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || err?.response?.data?.error || 'Failed to update adjustment');
    } finally {
      setSavingEditAdjustment(false);
    }
  };
  const deleteAdjustment = async (row: LedgerEntry) => {
    if (!selectedSupplier?.value || !row.adjustmentId) {
      toast.error('Invalid adjustment selected');
      return;
    }
    const ok = window.confirm('Delete this adjustment?');
    if (!ok) return;
    try {
      const endpoint =
        row.source === 'purchase' && row.purchaseId
          ? `${Base_url}/apis/pharmSupplier/purchase-ledger-adjustment/${selectedSupplier.value}/${row.purchaseId}/${row.adjustmentId}`
          : `${Base_url}/apis/pharmSupplier/ledger-adjustment/${selectedSupplier.value}/${row.adjustmentId}`;
      const res = await axios.delete(endpoint);
      if (res.data?.status === 'ok') {
        toast.success('Adjustment deleted');
        await fetchLedger();
      } else {
        toast.error(res.data?.message || 'Failed to delete adjustment');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || err?.response?.data?.error || 'Failed to delete adjustment');
    }
  };

  const deletePayment = async (row: LedgerEntry) => {
    if (!selectedSupplier?.value || !row.paymentId) {
      toast.error('Invalid payment selected');
      return;
    }

    const ok = window.confirm('Delete this payment?');
    if (!ok) return;

    try {
      const endpoint =
        row.source === 'purchase' && row.purchaseId
          ? `${Base_url}/apis/pharmSupplier/purchase-ledger-payment/${selectedSupplier.value}/${row.purchaseId}/${row.paymentId}`
          : `${Base_url}/apis/pharmSupplier/ledger-payment/${selectedSupplier.value}/${row.paymentId}`;

      const res = await axios.delete(endpoint);
      if (res.data?.status === 'ok') {
        toast.success('Payment deleted');
        await fetchLedger();
      } else {
        toast.error(res.data?.message || 'Failed to delete payment');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || err?.response?.data?.error || 'Failed to delete payment');
    }
  };

  const handleSupplierChange = (option: SupplierOption | null) => {
    setSelectedSupplier(option);
    setLedger(null);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Breadcrumb pageName="Supplier Ledger" />

      {/* Search Card */}
      <div className="mb-6 rounded-xl border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="mb-5 flex items-center gap-2 border-b border-stroke pb-4 dark:border-strokedark">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <h2 className="text-lg font-semibold text-black dark:text-white">Select Supplier</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-6">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-black dark:text-white">
              Supplier <span className="text-red-500">*</span>
            </label>
            <AsyncPaginate
              value={selectedSupplier}
              onChange={handleSupplierChange}
              loadOptions={loadSupplierOptions}
              getOptionLabel={(o) => o.label}
              getOptionValue={(o) => o.value}
              placeholder="Search by name or phone..."
              additional={{ page: 1 }}
              classNamePrefix="react-select"
              styles={{
                control: (base) => ({
                  ...base,
                  borderColor: 'hsl(var(--border))',
                  borderRadius: '0.5rem',
                  minHeight: '42px',
                  backgroundColor: 'hsl(var(--background))',
                }),
              }}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-black dark:text-white">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full rounded-lg border border-stroke bg-transparent py-2.5 px-4 text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-black dark:text-white">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full rounded-lg border border-stroke bg-transparent py-2.5 px-4 text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-black dark:text-white">Type</label>
            <select
              value={entryTypeFilter}
              onChange={(e) => setEntryTypeFilter(e.target.value as any)}
              className="w-full rounded-lg border border-stroke bg-transparent py-2.5 px-4 text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
            >
              <option value="all">All</option>
              <option value="opening">Opening</option>
              <option value="purchase">Purchase</option>
              <option value="payment">Payment</option>
              <option value="adjustment">Adjustment</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-black dark:text-white">Search</label>
            <input
              value={entrySearch}
              onChange={(e) => setEntrySearch(e.target.value)}
              placeholder="Invoice no or description"
              className="w-full rounded-lg border border-stroke bg-transparent py-2.5 px-4 text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
            />
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={fetchLedger}
            disabled={!selectedSupplier || loading}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Loading...
              </>
            ) : (
              <>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Load Ledger
              </>
            )}
          </button>

          <button
            type="button"
            onClick={exportLedgerToExcel}
            disabled={!ledger || filteredEntries.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-stroke bg-white px-6 py-2.5 font-medium text-black transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-strokedark dark:bg-meta-4 dark:text-white"
          >
            Excel
          </button>
        </div>
      </div>

      {ledger && (
        <div className="overflow-hidden rounded-xl border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="border-b border-stroke px-6 py-5 dark:border-strokedark">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {(['all', 'opening', 'purchase', 'payment', 'adjustment'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setEntryTypeFilter(t)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                      entryTypeFilter === t
                        ? 'bg-primary text-white'
                        : 'border border-stroke bg-white text-black hover:bg-gray-50 dark:border-strokedark dark:bg-meta-4 dark:text-white dark:hover:bg-meta-4/60'
                    }`}
                  >
                    {t === 'all'
                      ? 'All'
                      : t === 'opening'
                        ? 'Opening'
                        : t === 'purchase'
                          ? 'Purchase'
                          : t === 'payment'
                            ? 'Payment'
                            : 'Adjustment'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-stroke bg-white p-4 shadow-sm dark:border-strokedark dark:bg-meta-4">
                <p className="mb-1 text-xs font-medium text-bodydark">{summary.debitLabel}</p>
                <p className="text-2xl font-bold text-black dark:text-white">
                  Rs. {Number(summary.totalDebit || 0).toLocaleString()}
                </p>
              </div>

              <div className="rounded-lg border border-stroke bg-white p-4 shadow-sm dark:border-strokedark dark:bg-meta-4">
                <p className="mb-1 text-xs font-medium text-bodydark">Total Paid</p>
                <p className="text-2xl font-bold text-black dark:text-white">
                  Rs. {Number(summary.totalCredit || 0).toLocaleString()}
                </p>
              </div>

              <div className="rounded-lg border border-stroke bg-white p-4 shadow-sm dark:border-strokedark dark:bg-meta-4">
                <p className="mb-1 text-xs font-medium text-bodydark">
                  {summary.netBalance > 0 ? 'Net Payable' : summary.netBalance < 0 ? 'Net Advance' : 'Net Balance'}
                </p>
                <p
                  className={`text-2xl font-bold ${
                    summary.netBalance > 0
                      ? 'text-red-600 dark:text-red-400'
                      : summary.netBalance < 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-black dark:text-white'
                  }`}
                >
                  Rs. {Number(Math.abs(summary.netBalance) || 0).toLocaleString()}
                </p>
              </div>

              <div className="rounded-lg border border-stroke bg-white p-4 shadow-sm dark:border-strokedark dark:bg-meta-4">
                <p className="mb-1 text-xs font-medium text-bodydark">{summary.countLabel}</p>
                <p className="text-2xl font-bold text-black dark:text-white">
                  {Number(summary.count || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Ledger Header */}
          <div className="border-b border-stroke bg-gradient-to-r from-gray-50 to-white px-6 py-5 dark:border-strokedark dark:from-meta-4 dark:to-boxdark">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-black dark:text-white">{ledger.supplier.name}</h3>
                <p className="mt-1 text-sm text-bodydark">
                  {ledger.supplier.phone && <span>Phone: {ledger.supplier.phone}</span>}
                  {ledger.supplier.openingBalance != null && (
                    <span className="ml-2">
                      • Opening: Rs. {Number(ledger.supplier.openingBalance).toFixed(2)}
                    </span>
                  )}
                </p>
              </div>
              <div className="rounded-lg border-2 border-stroke bg-white px-5 py-3 dark:border-strokedark dark:bg-meta-4">
                <p className="text-xs font-medium uppercase tracking-wide text-bodydark">Balance</p>
                <p
                  className={`mt-1 text-2xl font-bold ${
                    summary.netBalance > 0
                      ? 'text-red-600 dark:text-red-400'
                      : summary.netBalance < 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-black dark:text-white'
                  }`}
                >
                  Rs. {Number(summary.netBalance).toFixed(2)}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => openPaymentModal(null)}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90"
              >
                Add Payment
              </button>
              <button
                type="button"
                onClick={openAdjustmentModal}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90"
              >
                Add Adjustment
              </button>
              <button
                type="button"
                onClick={exportLedgerToExcel}
                className="inline-flex items-center gap-2 rounded-lg border border-stroke bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-50 dark:border-strokedark dark:bg-meta-4 dark:text-white"
              >
                Excel
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-stroke dark:border-strokedark dark:bg-meta-4">
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-black dark:text-white">
                    Date
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-black dark:text-white">
                    Invoice No
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-black dark:text-white">
                    Desc
                  </th>
                  <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-black dark:text-white">
                    Debt
                  </th>
                  <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-black dark:text-white">
                    Cred
                  </th>
                  <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-black dark:text-white">
                    Bal
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-black dark:text-white">
                    Payment
                  </th>
                  <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-black dark:text-white">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stroke dark:divide-strokedark">
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-bodydark">
                      No transactions in this period.
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((row, idx) => (
                    <tr
                      key={idx}
                      className="transition-colors hover:bg-meta-4/50 dark:hover:bg-meta-4/30"
                    >
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-black dark:text-white">
                        {new Date(row.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-black dark:text-white">
                        {row.reference || '—'}
                      </td>
                      <td className="px-5 py-4 text-sm font-medium text-black dark:text-white">
                        {row.description}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-medium text-red-600 dark:text-red-400">
                        {row.debit ? `Rs. ${Number(row.debit).toFixed(2)}` : '—'}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-medium text-green-600 dark:text-green-400">
                        {row.credit ? `Rs. ${Number(row.credit).toFixed(2)}` : '—'}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-bold text-black dark:text-white">
                        Rs. {Number(row.balance).toFixed(2)}
                      </td>
                      <td className="px-5 py-4 text-sm text-black dark:text-white">
                        {row.type === 'payment' ? (
                          <div className="space-y-0.5">
                            <div className="text-sm font-medium">{row.method || '—'}</div>
                            {row.method === 'Cheque' && (
                              <div className="text-xs text-bodydark">
                                {row.chequeNo ? `Cheque: ${row.chequeNo}` : ''}
                                {(row.chequeNo && row.bankName) ? ' • ' : ''}
                                {row.bankName ? `Bank: ${row.bankName}` : ''}
                                {row.chequeDate ? ` • Date: ${new Date(row.chequeDate).toLocaleDateString('en-GB')}` : ''}
                              </div>
                            )}
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-right text-sm">
                        {row.type === 'payment' && row.paymentId ? (
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEditPayment(row)}
                              className="rounded-md border border-stroke px-3 py-1 text-xs font-medium text-black hover:bg-gray-50 dark:border-strokedark dark:text-white dark:hover:bg-meta-4"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => deletePayment(row)}
                              className="rounded-md bg-danger px-3 py-1 text-xs font-medium text-white hover:bg-opacity-90"
                            >
                              Delete
                            </button>
                          </div>
                        ) : row.type === 'purchase' && row.purchaseId ? (
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => openPaymentModal(row.purchaseId || null)}
                              className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-white hover:bg-opacity-90"
                            >
                              Add Payment
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPaymentTargetPurchaseId(row.purchaseId || null);
                                setAdjustmentRow({
                                  direction: 'Credit',
                                  amount: '',
                                  adjDate: new Date().toISOString().slice(0, 10),
                                  reference: '',
                                  notes: '',
                                });
                                setAdjustmentModalOpen(true);
                              }}
                              className="ml-2 rounded-md bg-primary px-3 py-1 text-xs font-medium text-white hover:bg-opacity-90"
                            >
                              Add Adjustment
                            </button>
                          </div>
                        ) : row.type === 'adjustment' && row.adjustmentId ? (
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEditAdjustment(row)}
                              className="rounded-md border border-stroke px-3 py-1 text-xs font-medium text-black hover:bg-gray-50 dark:border-strokedark dark:text-white dark:hover:bg-meta-4"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteAdjustment(row)}
                              className="rounded-md bg-danger px-3 py-1 text-xs font-medium text-white hover:bg-opacity-90"
                            >
                              Delete
                            </button>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-3xl rounded-xl bg-white p-5 shadow-lg dark:bg-boxdark">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-black dark:text-white">Edit Payment</h3>
              <button
                type="button"
                onClick={() => {
                  setEditPaymentModalOpen(false);
                  setEditingEntry(null);
                }}
                className="rounded-md px-2 py-1 text-sm text-bodydark hover:bg-gray-100 dark:hover:bg-meta-4"
              >
                Close
              </button>
            </div>

            <div className="rounded-lg border border-stroke p-4 dark:border-strokedark">
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-bodydark">Method</label>
                  <select
                    value={editPaymentRow.method}
                    onChange={(e) => setEditPaymentRow((prev) => ({ ...prev, method: e.target.value }))}
                    className="w-full rounded-lg border border-stroke bg-transparent py-2 px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:text-white"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-bodydark">Amount</label>
                  <input
                    type="number"
                    value={editPaymentRow.paid}
                    onChange={(e) => setEditPaymentRow((prev) => ({ ...prev, paid: e.target.value }))}
                    className="w-full rounded-lg border border-stroke bg-transparent py-2 px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:text-white"
                    placeholder="0"
                    min={0}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-bodydark">Pay Date</label>
                  <input
                    type="date"
                    value={editPaymentRow.payDate}
                    onChange={(e) => setEditPaymentRow((prev) => ({ ...prev, payDate: e.target.value }))}
                    className="w-full rounded-lg border border-stroke bg-transparent py-2 px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:text-white"
                  />
                </div>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-bodydark">Reference</label>
                  <input
                    type="text"
                    value={editPaymentRow.reference}
                    onChange={(e) => setEditPaymentRow((prev) => ({ ...prev, reference: e.target.value }))}
                    className="w-full rounded-lg border border-stroke bg-transparent py-2 px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:text-white"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-bodydark">Notes</label>
                  <input
                    type="text"
                    value={editPaymentRow.notes}
                    onChange={(e) => setEditPaymentRow((prev) => ({ ...prev, notes: e.target.value }))}
                    className="w-full rounded-lg border border-stroke bg-transparent py-2 px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:text-white"
                    placeholder="Optional"
                  />
                </div>
              </div>

              {editPaymentRow.method === 'Cheque' && (
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-bodydark">Cheque No</label>
                    <input
                      type="text"
                      value={editPaymentRow.chequeNo}
                      onChange={(e) => setEditPaymentRow((prev) => ({ ...prev, chequeNo: e.target.value }))}
                      className="w-full rounded-lg border border-stroke bg-transparent py-2 px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-bodydark">Bank</label>
                    <input
                      type="text"
                      value={editPaymentRow.bankName}
                      onChange={(e) => setEditPaymentRow((prev) => ({ ...prev, bankName: e.target.value }))}
                      className="w-full rounded-lg border border-stroke bg-transparent py-2 px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-bodydark">Cheque Date</label>
                    <input
                      type="date"
                      value={editPaymentRow.chequeDate}
                      onChange={(e) => setEditPaymentRow((prev) => ({ ...prev, chequeDate: e.target.value }))}
                      className="w-full rounded-lg border border-stroke bg-transparent py-2 px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={submitEditPayment}
                disabled={savingEditPayment}
                className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
              >
                {savingEditPayment ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-3xl rounded-xl bg-white p-5 shadow-lg dark:bg-boxdark">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-black dark:text-white">Add Payment</h3>
              <button
                type="button"
                onClick={() => {
                  setPaymentModalOpen(false);
                  setPaymentTargetPurchaseId(null);
                }}
                className="rounded-md px-2 py-1 text-sm text-bodydark hover:bg-gray-100 dark:hover:bg-meta-4"
              >
                Close
              </button>
            </div>

            <div className="space-y-3">
              {paymentRows.map((row, index) => (
                <div key={index} className="rounded-lg border border-stroke p-4 dark:border-strokedark">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-bodydark">Method</label>
                      <select
                        value={row.method}
                        onChange={(e) => {
                          const v = e.target.value;
                          setPaymentRows((prev) =>
                            prev.map((p, i) => (i === index ? { ...p, method: v } : p))
                          );
                        }}
                        className="w-full rounded-lg border border-stroke bg-transparent py-2 px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:text-white"
                      >
                        <option value="Cash">Cash</option>
                        <option value="Card">Card</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-bodydark">Amount</label>
                      <input
                        type="number"
                        value={row.paid}
                        onChange={(e) => {
                          const v = e.target.value;
                          setPaymentRows((prev) =>
                            prev.map((p, i) => (i === index ? { ...p, paid: v } : p))
                          );
                        }}
                        className="w-full rounded-lg border border-stroke bg-transparent py-2 px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:text-white"
                        placeholder="0"
                        min={0}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-bodydark">Pay Date</label>
                      <input
                        type="date"
                        value={row.payDate}
                        onChange={(e) => {
                          const v = e.target.value;
                          setPaymentRows((prev) =>
                            prev.map((p, i) => (i === index ? { ...p, payDate: v } : p))
                          );
                        }}
                        className="w-full rounded-lg border border-stroke bg-transparent py-2 px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-xs font-medium text-bodydark">Reference</label>
                      <input
                        type="text"
                        value={row.reference}
                        onChange={(e) => {
                          const v = e.target.value;
                          setPaymentRows((prev) =>
                            prev.map((p, i) => (i === index ? { ...p, reference: v } : p))
                          );
                        }}
                        className="w-full rounded-lg border border-stroke bg-transparent py-2 px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:text-white"
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-bodydark">Notes</label>
                      <input
                        type="text"
                        value={row.notes}
                        onChange={(e) => {
                          const v = e.target.value;
                          setPaymentRows((prev) =>
                            prev.map((p, i) => (i === index ? { ...p, notes: v } : p))
                          );
                        }}
                        className="w-full rounded-lg border border-stroke bg-transparent py-2 px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:text-white"
                        placeholder="Optional"
                      />
                    </div>
                  </div>

                  {row.method === 'Cheque' && (
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-bodydark">Cheque No</label>
                        <input
                          type="text"
                          value={row.chequeNo}
                          onChange={(e) => {
                            const v = e.target.value;
                            setPaymentRows((prev) =>
                              prev.map((p, i) => (i === index ? { ...p, chequeNo: v } : p))
                            );
                          }}
                          className="w-full rounded-lg border border-stroke bg-transparent py-2 px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-bodydark">Bank</label>
                        <input
                          type="text"
                          value={row.bankName}
                          onChange={(e) => {
                            const v = e.target.value;
                            setPaymentRows((prev) =>
                              prev.map((p, i) => (i === index ? { ...p, bankName: v } : p))
                            );
                          }}
                          className="w-full rounded-lg border border-stroke bg-transparent py-2 px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-bodydark">Cheque Date</label>
                        <input
                          type="date"
                          value={row.chequeDate}
                          onChange={(e) => {
                            const v = e.target.value;
                            setPaymentRows((prev) =>
                              prev.map((p, i) => (i === index ? { ...p, chequeDate: v } : p))
                            );
                          }}
                          className="w-full rounded-lg border border-stroke bg-transparent py-2 px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:text-white"
                        />
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setPaymentRows((prev) => prev.filter((_, i) => i !== index))
                      }
                      className="rounded-lg border border-stroke px-3 py-1.5 text-sm text-black hover:bg-gray-50 dark:border-strokedark dark:text-white dark:hover:bg-meta-4"
                      disabled={paymentRows.length === 1}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap justify-between gap-2">
              <button
                type="button"
                onClick={() =>
                  setPaymentRows((prev) => [
                    ...prev,
                    {
                      method: 'Cash',
                      paid: '',
                      payDate: new Date().toISOString().slice(0, 10),
                      reference: '',
                      chequeNo: '',
                      bankName: '',
                      chequeDate: '',
                      notes: '',
                    },
                  ])
                }
                className="rounded-lg border border-stroke bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-50 dark:border-strokedark dark:bg-meta-4 dark:text-white"
              >
                + Add More
              </button>

              <button
                type="button"
                onClick={submitLedgerPayment}
                disabled={savingPayment}
                className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
              >
                {savingPayment ? 'Saving...' : 'Save Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
      {adjustmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-5 shadow-lg dark:bg-boxdark">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-black dark:text-white">Add Adjustment</h3>
              <button
                type="button"
                onClick={() => {
                  setAdjustmentModalOpen(false);
                }}
                className="rounded-md px-2 py-1 text-sm text-bodydark hover:bg-gray-100 dark:hover:bg-meta-4"
              >
                Close
              </button>
            </div>
            <div className="rounded-lg border border-stroke p-4 dark:border-strokedark">
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-bodydark">Type</label>
                  <select
                    value={adjustmentRow.direction}
                    onChange={(e) => setAdjustmentRow((prev) => ({ ...prev, direction: e.target.value }))}
                    className="w-full rounded-lg border border-stroke bg-transparent py-2 px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:text-white"
                  >
                    <option value="Debit">Debit</option>
                    <option value="Credit">Credit</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-bodydark">Amount</label>
                  <input
                    type="number"
                    value={adjustmentRow.amount}
                    onChange={(e) => setAdjustmentRow((prev) => ({ ...prev, amount: e.target.value }))}
                    className="w-full rounded-lg border border-stroke bg-transparent py-2 px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:text-white"
                    placeholder="0"
                    min={0}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-bodydark">Date</label>
                  <input
                    type="date"
                    value={adjustmentRow.adjDate}
                    onChange={(e) => setAdjustmentRow((prev) => ({ ...prev, adjDate: e.target.value }))}
                    className="w-full rounded-lg border border-stroke bg-transparent py-2 px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:text-white"
                  />
                </div>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-bodydark">Reference</label>
                  <input
                    type="text"
                    value={adjustmentRow.reference}
                    onChange={(e) => setAdjustmentRow((prev) => ({ ...prev, reference: e.target.value }))}
                    className="w-full rounded-lg border border-stroke bg-transparent py-2 px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:text-white"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-bodydark">Notes</label>
                  <input
                    type="text"
                    value={adjustmentRow.notes}
                    onChange={(e) => setAdjustmentRow((prev) => ({ ...prev, notes: e.target.value }))}
                    className="w-full rounded-lg border border-stroke bg-transparent py-2 px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:text-white"
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (!selectedSupplier?.value) {
                    toast.error('Please select a supplier');
                    return;
                  }
                  const amount = Number(adjustmentRow.amount) || 0;
                  if (amount <= 0) {
                    toast.error('Invalid adjustment amount');
                    return;
                  }
                  const direction = adjustmentRow.direction;
                  if (!(direction === 'Debit' || direction === 'Credit')) {
                    toast.error('Direction must be Debit or Credit');
                    return;
                  }
                  setSavingAdjustment(true);
                  try {
                    const endpoint = paymentTargetPurchaseId
                      ? `${Base_url}/apis/pharmSupplier/purchase-ledger-adjustment/${selectedSupplier.value}/${paymentTargetPurchaseId}`
                      : `${Base_url}/apis/pharmSupplier/ledger-adjustment/${selectedSupplier.value}`;
                    const res = await axios.post(endpoint, {
                      adjustment: {
                        direction,
                        amount,
                        adjDate: adjustmentRow.adjDate,
                        reference: adjustmentRow.reference,
                        notes: adjustmentRow.notes,
                      },
                    });
                    if (res.data?.status === 'ok') {
                      toast.success('Adjustment added');
                      setAdjustmentModalOpen(false);
                      setPaymentTargetPurchaseId(null);
                      await fetchLedger();
                    } else {
                      toast.error(res.data?.message || 'Failed to add adjustment');
                    }
                  } catch (err: any) {
                    console.error(err);
                    toast.error(err?.response?.data?.message || err?.response?.data?.error || 'Failed to add adjustment');
                  } finally {
                    setSavingAdjustment(false);
                  }
                }}
                disabled={savingAdjustment}
                className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
              >
                {savingAdjustment ? 'Saving...' : 'Save Adjustment'}
              </button>
            </div>
          </div>
        </div>
      )}
      {editAdjustmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-5 shadow-lg dark:bg-boxdark">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-black dark:text-white">Edit Adjustment</h3>
              <button
                type="button"
                onClick={() => {
                  setEditAdjustmentModalOpen(false);
                  setEditingEntry(null);
                }}
                className="rounded-md px-2 py-1 text-sm text-bodydark hover:bg-gray-100 dark:hover:bg-meta-4"
              >
                Close
              </button>
            </div>
            <div className="rounded-lg border border-stroke p-4 dark:border-strokedark">
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-bodydark">Type</label>
                  <select
                    value={editAdjustmentRow.direction}
                    onChange={(e) => setEditAdjustmentRow((prev) => ({ ...prev, direction: e.target.value }))}
                    className="w-full rounded-lg border border-stroke bg-transparent py-2 px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:text-white"
                  >
                    <option value="Debit">Debit</option>
                    <option value="Credit">Credit</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-bodydark">Amount</label>
                  <input
                    type="number"
                    value={editAdjustmentRow.amount}
                    onChange={(e) => setEditAdjustmentRow((prev) => ({ ...prev, amount: e.target.value }))}
                    className="w-full rounded-lg border border-stroke bg-transparent py-2 px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:text-white"
                    placeholder="0"
                    min={0}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-bodydark">Date</label>
                  <input
                    type="date"
                    value={editAdjustmentRow.adjDate}
                    onChange={(e) => setEditAdjustmentRow((prev) => ({ ...prev, adjDate: e.target.value }))}
                    className="w-full rounded-lg border border-stroke bg-transparent py-2 px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:text-white"
                  />
                </div>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-bodydark">Reference</label>
                  <input
                    type="text"
                    value={editAdjustmentRow.reference}
                    onChange={(e) => setEditAdjustmentRow((prev) => ({ ...prev, reference: e.target.value }))}
                    className="w-full rounded-lg border border-stroke bg-transparent py-2 px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:text-white"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-bodydark">Notes</label>
                  <input
                    type="text"
                    value={editAdjustmentRow.notes}
                    onChange={(e) => setEditAdjustmentRow((prev) => ({ ...prev, notes: e.target.value }))}
                    className="w-full rounded-lg border border-stroke bg-transparent py-2 px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:text-white"
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (!selectedSupplier?.value || !editingEntry?.adjustmentId) {
                    toast.error('Invalid adjustment selected');
                    return;
                  }
                  const amount = Number(editAdjustmentRow.amount) || 0;
                  if (amount <= 0) {
                    toast.error('Invalid adjustment amount');
                    return;
                  }
                  const direction = editAdjustmentRow.direction;
                  if (!(direction === 'Debit' || direction === 'Credit')) {
                    toast.error('Direction must be Debit or Credit');
                    return;
                  }
                  setSavingEditAdjustment(true);
                  try {
                    const endpoint =
                      editingEntry.source === 'purchase' && editingEntry.purchaseId
                        ? `${Base_url}/apis/pharmSupplier/purchase-ledger-adjustment/${selectedSupplier.value}/${editingEntry.purchaseId}/${editingEntry.adjustmentId}`
                        : `${Base_url}/apis/pharmSupplier/ledger-adjustment/${selectedSupplier.value}/${editingEntry.adjustmentId}`;
                    const res = await axios.put(endpoint, {
                      adjustment: {
                        direction,
                        amount,
                        adjDate: editAdjustmentRow.adjDate,
                        reference: editAdjustmentRow.reference,
                        notes: editAdjustmentRow.notes,
                      },
                    });
                    if (res.data?.status === 'ok') {
                      toast.success('Adjustment updated');
                      setEditAdjustmentModalOpen(false);
                      setEditingEntry(null);
                      await fetchLedger();
                    } else {
                      toast.error(res.data?.message || 'Failed to update adjustment');
                    }
                  } catch (err: any) {
                    console.error(err);
                    toast.error(err?.response?.data?.message || err?.response?.data?.error || 'Failed to update adjustment');
                  } finally {
                    setSavingEditAdjustment(false);
                  }
                }}
                disabled={savingEditAdjustment}
                className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
              >
                {savingEditAdjustment ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierLedger;
