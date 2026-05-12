import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Base_url } from '../../../utils/Base_url';
import { toast } from 'react-toastify';
import Modal from '../../../components/modal';
import { Table, Card, Row, Col, Input, DatePicker, Select, Button, Space, Tag, Statistic, Modal as AntdModal } from 'antd';
import { DollarOutlined, RiseOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { canMenuAction, getStoredUserForPermissions } from '../../../utils/permissions';

type PosInvoice = {
  _id: string;
  invoiceNumber?: string;
  patientId?: { _id: string; name: string; mr?: string } | string | null;
  patientName?: string;
  referId?: { _id: string; name: string } | string | null;
  doctorName?: string;
  paid?: number;
  due?: number;
  advance?: number;
  totalDiscount?: number;
  totalTax?: number;
  note?: string;
  createdAt?: string;
  createdBy?: { _id: string; name?: string } | string | null;
  allItem?: Array<{
    pharmItemId?: any;
    quantity?: number;
    isReturn?: boolean;
    totalAmount?: number;
  }>;
};

type Summary = {
  totalTransactions: number;
  totalSales: number;
  totalPaid: number;
  totalDue: number;
  totalDiscount: number;
  totalAdvance: number;
};

const ZERO_POS_SUMMARY: Summary = {
  totalTransactions: 0,
  totalSales: 0,
  totalPaid: 0,
  totalDue: 0,
  totalDiscount: 0,
  totalAdvance: 0,
};

const formatDate = (iso?: string) => {
  if (!iso) return '-';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function BillsList() {
  const navigate = useNavigate();
  const permUser = getStoredUserForPermissions();
  const canPosUpdate = canMenuAction(permUser, 'pharm_pos', 'update');
  const canPosDelete = canMenuAction(permUser, 'pharm_pos', 'delete');

  const canEditPosBill = (inv: PosInvoice) => {
    if (canPosUpdate) return true;
    const u = permUser as { _id?: string } | null;
    const uid = u?._id != null ? String(u._id) : '';
    if (!uid) return false;
    const c = inv.createdBy;
    const cid =
      typeof c === 'object' && c != null && '_id' in c
        ? String((c as { _id: string })._id)
        : c != null && c !== ''
          ? String(c)
          : '';
    return Boolean(cid && cid === uid);
  };

  const [list, setList] = useState<PosInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [sort, setSort] = useState('-createdAt');

  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientMr, setPatientMr] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string | undefined>(undefined);
  const [patientOptions, setPatientOptions] = useState<any[]>([]);
  const [patientQuery, setPatientQuery] = useState('');
  const [patientPage, setPatientPage] = useState(1);
  const [patientHasMore, setPatientHasMore] = useState(true);
  const [patientLoading, setPatientLoading] = useState(false);

  const [summary, setSummary] = useState<Summary>(ZERO_POS_SUMMARY);

  const [editOpen, setEditOpen] = useState(false);
  const [editInvoice, setEditInvoice] = useState<PosInvoice | null>(null);
  const [editNote, setEditNote] = useState('');
  const [editPatientName, setEditPatientName] = useState('');
  const [editDoctorName, setEditDoctorName] = useState('');

  /** List pagination must not be sent to /summary — summary aggregates all matching bills. */
  const summaryParams = useMemo(() => {
    const p: Record<string, any> = {};
    const s = search.trim();
    if (s) p.search = s;
    const f = from.trim();
    const t = to.trim();
    if (f) p.from = f;
    if (t) p.to = t;
    const pay = paymentMethod.trim();
    if (pay) p.paymentMethod = pay;
    const minA = minAmount.trim() === '' ? null : Number(minAmount);
    if (minA !== null && !Number.isNaN(minA)) p.minAmount = minA;
    const maxA = maxAmount.trim() === '' ? null : Number(maxAmount);
    if (maxA !== null && !Number.isNaN(maxA)) p.maxAmount = maxA;
    const inv = invoiceNumber.trim();
    if (inv) p.invoiceNumber = inv;
    if (selectedPatientId) p.patientId = selectedPatientId;
    return p;
  }, [search, from, to, paymentMethod, minAmount, maxAmount, invoiceNumber, selectedPatientId]);

  const params = useMemo(() => {
    const p: Record<string, any> = {
      page,
      limit,
      sort,
    };
    const s = search.trim();
    if (s) p.search = s;
    const f = from.trim();
    const t = to.trim();
    if (f) p.from = f;
    if (t) p.to = t;
    // unified search handles invoice#, MR, patient name
    const pay = paymentMethod.trim();
    if (pay) p.paymentMethod = pay;
    const minA = minAmount.trim() === '' ? null : Number(minAmount);
    if (minA !== null && !Number.isNaN(minA)) p.minAmount = minA;
    const maxA = maxAmount.trim() === '' ? null : Number(maxAmount);
    if (maxA !== null && !Number.isNaN(maxA)) p.maxAmount = maxA;
    const inv = invoiceNumber.trim();
    if (inv) p.invoiceNumber = inv;
    if (selectedPatientId) p.patientId = selectedPatientId;
    return p;
  }, [page, limit, sort, search, from, to, paymentMethod, minAmount, maxAmount, invoiceNumber, selectedPatientId]);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${Base_url}/apis/pharmPos/get`, { params });
      const list = Array.isArray(res?.data?.data) ? res.data.data : [];
      const total =
        Number(res?.data?.total) ||
        Number(res?.data?.count) ||
        Number(res?.data?.totalRecords) ||
        0;
      setList(list);
      setTotal(total);
    } catch (err: any) {
      setList([]);
      setTotal(0);
      toast.error(err?.response?.data?.message || 'Failed to load POS bills');
    } finally {
      setLoading(false);
    }
  };

  const parseSummary = (raw: unknown): Summary => {
    const body = raw as Record<string, unknown> | null | undefined;
    const s =
      (body?.summary && typeof body.summary === 'object' ? body.summary : null) ||
      (body?.data && typeof body.data === 'object' && (body.data as any).summary
        ? (body.data as any).summary
        : null);
    if (!s || typeof s !== 'object') return ZERO_POS_SUMMARY;
    const o = s as Record<string, unknown>;
    const n = (v: unknown) => {
      const x = typeof v === 'number' ? v : Number(v);
      return Number.isFinite(x) ? x : 0;
    };
    return {
      totalTransactions: n(o.totalTransactions),
      totalSales: n(o.totalSales),
      totalPaid: n(o.totalPaid),
      totalDue: n(o.totalDue),
      totalDiscount: n(o.totalDiscount),
      totalAdvance: n(o.totalAdvance),
    };
  };

  const fetchSummary = async () => {
    try {
      const res = await axios.get(`${Base_url}/apis/pharmPos/summary`, { params: summaryParams });
      const statusOk = String(res?.data?.status ?? '').toLowerCase() === 'ok';
      setSummary(statusOk ? parseSummary(res.data) : ZERO_POS_SUMMARY);
    } catch {
      setSummary(ZERO_POS_SUMMARY);
    }
  };

  useEffect(() => {
    fetchList();
  }, [params]);

  useEffect(() => {
    fetchSummary();
  }, [summaryParams]);

  const openEdit = (inv: PosInvoice) => {
    setEditInvoice(inv);
    setEditNote(inv?.note || '');
    setEditPatientName(inv?.patientName || '');
    setEditDoctorName(inv?.doctorName || '');
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editInvoice?._id) {
      setEditOpen(false);
      return;
    }
    try {
      const body: Record<string, any> = {};
      body.note = editNote;
      body.patientName = editPatientName;
      body.doctorName = editDoctorName;
      await axios.put(`${Base_url}/apis/pharmPos/update/${editInvoice._id}`, body);
      toast.success('Bill updated');
      setEditOpen(false);
      fetchList();
      fetchSummary();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update bill');
    }
  };

  const deleteBill = async (inv: PosInvoice) => {
    if (!inv?._id) return;
    AntdModal.confirm({
      title: 'Delete Confirmation',
      centered: true,
      content: `Are you sure you want to delete bill ${inv.invoiceNumber || inv._id}?`,
      okText: 'Yes, Delete',
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await axios.delete(`${Base_url}/apis/pharmPos/delete/${inv._id}`);
          toast.success('Bill deleted');
          fetchList();
          fetchSummary();
        } catch (err: any) {
          toast.error(err?.response?.data?.message || 'Failed to delete bill');
        }
      },
    });
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const { RangePicker } = DatePicker;
  const paymentOptions = [
    { label: 'Cash', value: 'Cash' },
    { label: 'Credit', value: 'Credit' },
    { label: 'Card', value: 'Card' },
    { label: 'Bank Transfer', value: 'Bank Transfer' },
    { label: 'Cheque', value: 'Cheque' },
  ];

  const fetchPatients = async (query: string, page = 1) => {
    try {
      setPatientLoading(true);
      const res = await axios.get(`${Base_url}/apis/patient/get`, {
        params: { page, limit: 20, search: query || '', sort: 'name' },
      });
      const list = res?.data?.data || [];
      const totalPages = res?.data?.totalPages || 1;
      const opts = list.map((p: any) => ({
        label: `${p.name} (MR: ${p.mr})`,
        value: p._id,
      }));
      setPatientOptions(page === 1 ? opts : [...patientOptions, ...opts]);
      setPatientHasMore(page < totalPages);
      setPatientPage(page);
    } catch {
      setPatientOptions(page === 1 ? [] : patientOptions);
      setPatientHasMore(false);
    } finally {
      setPatientLoading(false);
    }
  };

  const columns = [
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v: string) => formatDate(v),
      sorter: true,
      sortOrder: sort === 'createdAt' ? 'ascend' : sort === '-createdAt' ? 'descend' : null,
    },
    {
      title: 'Invoice#',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      sorter: true,
      sortOrder: sort === 'invoiceNumber' ? 'ascend' : sort === '-invoiceNumber' ? 'descend' : null,
    },
    {
      title: 'Patient',
      key: 'patient',
      render: (_: any, inv: PosInvoice) => {
        const label =
          inv.patientId && typeof inv.patientId === 'object'
            ? `${inv.patientId?.name || inv.patientName || '-'} ${inv.patientId?.mr ? `(MR: ${inv.patientId.mr})` : ''}`
            : inv.patientName || '-';
        return <span className="font-medium">{label}</span>;
      },
    },
    // {
    //   title: 'Doctor',
    //   key: 'doctor',
    //   render: (_: any, inv: PosInvoice) => {
    //     const label =
    //       inv.referId && typeof inv.referId === 'object'
    //         ? inv.referId?.name || inv.doctorName || '-'
    //         : inv.doctorName || '-';
    //     return label;
    //   },
    // },
    {
      title: 'Items',
      dataIndex: 'allItem',
      key: 'items',
      render: (arr: any[]) => (Array.isArray(arr) ? arr.length : 0),
    },
    {
      title: 'Paid',
      dataIndex: 'paid',
      key: 'paid',
      render: (v: number) => <Tag color="green">{Number(v || 0)}</Tag>,
      sorter: true,
      sortOrder: sort === 'paid' ? 'ascend' : sort === '-paid' ? 'descend' : null,
    },
    {
      title: 'Due',
      dataIndex: 'due',
      key: 'due',
      render: (v: number) => <Tag color="red">{Number(v || 0)}</Tag>,
      sorter: true,
      sortOrder: sort === 'due' ? 'ascend' : sort === '-due' ? 'descend' : null,
    },
    {
      title: 'Total',
      key: 'total',
      render: (_: any, inv: PosInvoice) => Number(inv.paid || 0) + Number(inv.due || 0),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, inv: PosInvoice) => (
        <Space>
          {canEditPosBill(inv) && (
            <Button type="link" onClick={() => navigate(`/admin/pharmacy/invoices/edit/${inv._id}`)}>
              Edit
            </Button>
          )}
          {canPosDelete && (
            <Button danger type="link" onClick={() => deleteBill(inv)}>
              Delete
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xl font-semibold text-black dark:text-white">
          Pharmacy POS Bills & History
        </h4>
        <div />
      </div>
      <Card className="mb-4">
        <Row gutter={[12, 12]}>
          <Col xs={24} md={6}>
            <Input.Search
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search (invoice, MR, patient name)"
              allowClear
              onSearch={() => fetchList()}
            />
          </Col>
          <Col xs={24} md={6}>
            <RangePicker
              onChange={(values) => {
                const f = values?.[0]?.format('YYYY-MM-DD') ?? '';
                const t = values?.[1]?.format('YYYY-MM-DD') ?? '';
                setFrom(f);
                setTo(t);
              }}
            />
          </Col>
          <Col xs={24} md={6}>
            <Select
              value={paymentMethod || undefined}
              onChange={(v) => setPaymentMethod(v || '')}
              options={paymentOptions}
              allowClear
              className="w-full"
              placeholder="Payment method"
            />
          </Col>
          <Col xs={24} md={6}>
            <Input
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="Invoice number"
            />
          </Col>
          <Col xs={24} md={6}>
            <Select
              showSearch
              value={selectedPatientId}
              onChange={(v) => setSelectedPatientId(v)}
              onSearch={(q) => {
                setPatientQuery(q);
                fetchPatients(q, 1);
              }}
              options={patientOptions}
              loading={patientLoading}
              allowClear
              className="w-full"
              placeholder="Filter by patient"
            />
          </Col>
          <Col xs={24} md={3}>
            <Input value={minAmount} onChange={(e) => setMinAmount(e.target.value)} placeholder="Min total" />
          </Col>
          <Col xs={24} md={3}>
            <Input value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} placeholder="Max total" />
          </Col>
          <Col xs={24} md={4}>
            <Button onClick={() => { 
              setSearch(''); 
              setFrom(''); 
              setTo(''); 
              setPaymentMethod(''); 
              setInvoiceNumber('');
              setSelectedPatientId(undefined);
              setMinAmount(''); 
              setMaxAmount(''); 
            }}>Clear Filters</Button>
          </Col>
        </Row>
      </Card>

      <div className="mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-600 font-medium mb-1">Total Sales</p>
                  <p className="text-2xl font-bold text-green-700">
                    Rs. {Number(summary.totalSales || 0).toLocaleString()}
                  </p>
                </div>
                <div className="bg-green-200 p-3 rounded-full">
                  <svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-600 font-medium mb-1">Total Paid</p>
                  <p className="text-2xl font-bold text-blue-700">
                    Rs. {Number(summary.totalPaid || 0).toLocaleString()}
                  </p>
                </div>
                <div className="bg-blue-200 p-3 rounded-full">
                  <svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-600 font-medium mb-1">Total Due</p>
                  <p className="text-2xl font-bold text-red-700">
                    Rs. {Number(summary.totalDue || 0).toLocaleString()}
                  </p>
                </div>
                <div className="bg-red-200 p-3 rounded-full">
                  <svg className="w-6 h-6 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-600 font-medium mb-1">Transactions</p>
                  <p className="text-2xl font-bold text-purple-700">
                    {Number(summary.totalTransactions || 0).toLocaleString()}
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
        </div>

      <Card className="mb-4">
        <Table
          columns={columns as any}
          dataSource={list}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: page,
            pageSize: limit,
            total,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
          }}
          onChange={(pagination, _filters, sorter: any) => {
            const current = pagination.current || 1;
            const size = pagination.pageSize || 20;
            setPage(current);
            setLimit(size);
            if (sorter && sorter.field) {
              const field = sorter.field;
              const order = sorter.order;
              if (field === 'total') {
                setSort('-createdAt');
                return;
              }
              if (order === 'ascend') setSort(String(field));
              else if (order === 'descend') setSort(`-${String(field)}`);
              else setSort('-createdAt');
            }
          }}
          size="middle"
        />
      </Card>

      <div className="flex items-center justify-between">
        <div className="text-sm">Page {page} of {totalPages}</div>
        <Space>
          <Button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Prev</Button>
          <Button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
        </Space>
      </div>

      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)}>
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4">Edit Bill</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input value={editPatientName} onChange={(e) => setEditPatientName(e.target.value)} placeholder="Patient name (manual)" className="border px-3 py-2 rounded" />
            <input value={editDoctorName} onChange={(e) => setEditDoctorName(e.target.value)} placeholder="Doctor name (manual)" className="border px-3 py-2 rounded" />
            <textarea value={editNote} onChange={(e) => setEditNote(e.target.value)} placeholder="Note" className="border px-3 py-2 rounded md:col-span-2" />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button className="border px-4 py-2 rounded" onClick={() => setEditOpen(false)}>Cancel</button>
            <button className="bg-primary text-white px-4 py-2 rounded" onClick={saveEdit}>Save</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
