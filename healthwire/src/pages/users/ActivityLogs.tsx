import { useEffect, useState } from 'react';
import axios from 'axios';
import { Button, DatePicker, Input, Select, Space, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { Base_url } from '../../utils/Base_url';

const { RangePicker } = DatePicker;

type Branch = { _id: string; name: string; code?: string };
type ActivityLog = {
  _id: string;
  actorName?: string;
  actorEmail?: string;
  actorRole?: string;
  module?: string;
  action: string;
  path: string;
  method: string;
  statusCode: number;
  ipAddress?: string;
  createdAt: string;
  branchId?: Branch | null;
};

const actionColors: Record<string, string> = {
  'Logged in': 'green',
  Viewed: 'blue',
  Created: 'blue',
  Updated: 'orange',
  Deleted: 'red',
};

function getActionColor(action: string): string {
  const prefix = Object.keys(actionColors).find((key) => action.startsWith(key));
  return prefix ? actionColors[prefix] : 'default';
}

function getDisplayAction(record: ActivityLog): string {
  if (record.action !== 'GET') return record.action || record.method;
  if (record.path === '/apis/user/me') return 'Viewed user profile';
  if (record.path === '/apis/branch/get') return 'Viewed branches';
  const resource = record.path?.split('/').filter(Boolean).pop() || 'record';
  return `Viewed ${resource.replace(/[-_]/g, ' ')}`;
}

function getDisplayModule(record: ActivityLog): string {
  if (record.module) return record.module;
  const resource = record.path?.split('/').filter(Boolean)[1] || 'system';
  const labels: Record<string, string> = {
    user: 'Users',
    branch: 'Branches',
    invoice: 'Invoices',
    patient: 'Patients',
    patients: 'Patients',
    login: 'Authentication',
  };
  return labels[resource] || resource.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const ActivityLogs = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ user: '', branchId: '', action: '' });
  const [dates, setDates] = useState<[Dayjs | null, Dayjs | null]>([null, null]);

  const loadLogs = async (
    nextPage = page,
    nextFilters = filters,
    nextDates = dates,
  ) => {
    const token = localStorage.getItem('userToken');
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(nextPage), limit: '25' });
      Object.entries(nextFilters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
      if (nextDates[0]) params.set('from', nextDates[0].format('YYYY-MM-DD'));
      if (nextDates[1]) params.set('to', nextDates[1].format('YYYY-MM-DD'));
      const response = await axios.get(`${Base_url}/apis/activity-log/get?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLogs(response.data?.data || []);
      setTotal(Number(response.data?.count) || 0);
      setBranches(response.data?.branches || []);
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Unable to load activity logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs(1);
    // Filters are applied by the explicit Apply button to avoid noisy requests while typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns: ColumnsType<ActivityLog> = [
    {
      title: 'User',
      key: 'user',
      render: (_, record) => (
        <div>
          <Typography.Text strong>{record.actorName || 'Unknown user'}</Typography.Text>
          <div className="text-xs text-slate-500">{record.actorEmail || '—'}</div>
        </div>
      ),
    },
    {
      title: 'Branch',
      key: 'branch',
      render: (_, record) => record.branchId?.name || <Tag color="default">No branch</Tag>,
    },
    {
      title: 'Module',
      key: 'module',
      render: (_, record) => getDisplayModule(record),
    },
    {
      title: 'Action',
      dataIndex: 'action',
      render: (_action: string, record) => {
        const displayAction = getDisplayAction(record);
        return <Tag color={getActionColor(displayAction)}>{displayAction}</Tag>;
      },
    },
    {
      title: 'Date & time',
      dataIndex: 'createdAt',
      render: (value: string) => dayjs(value).format('DD MMM YYYY, hh:mm A'),
    },
  ];

  const applyFilters = () => {
    setPage(1);
    loadLogs(1);
  };

  const changeBranch = (branchId?: string) => {
    const nextFilters = { ...filters, branchId: branchId || '' };
    setFilters(nextFilters);
    setPage(1);
    loadLogs(1, nextFilters);
  };

  const clearFilters = () => {
    const emptyFilters = { user: '', branchId: '', action: '' };
    const emptyDates: [Dayjs | null, Dayjs | null] = [null, null];
    setFilters(emptyFilters);
    setDates(emptyDates);
    setPage(1);
    loadLogs(1, emptyFilters, emptyDates);
  };

  return (
    <div className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Typography.Title level={4} className="!mb-1">User Activity</Typography.Title>
          <Typography.Text type="secondary">Review sign-ins and system actions across every branch.</Typography.Text>
        </div>
        <Button onClick={() => loadLogs(page)} loading={loading}>Refresh</Button>
      </div>
      <Space wrap className="mb-5 w-full">
        <Input
          allowClear
          placeholder="Search user or email"
          value={filters.user}
          onChange={(event) => setFilters((current) => ({ ...current, user: event.target.value }))}
          onPressEnter={applyFilters}
          style={{ width: 220 }}
        />
        <Select
          allowClear
          placeholder="All branches"
          value={filters.branchId || undefined}
          onChange={changeBranch}
          options={branches.map((branch) => ({ value: branch._id, label: branch.code ? `${branch.name} (${branch.code})` : branch.name }))}
          style={{ width: 210 }}
        />
        <RangePicker
          value={dates}
          onChange={(values) => setDates((values as [Dayjs | null, Dayjs | null]) || [null, null])}
        />
        <Button type="default" onClick={applyFilters}>Apply</Button>
        <Button onClick={clearFilters}>Clear</Button>
      </Space>
      <Table
        rowKey="_id"
        loading={loading}
        columns={columns}
        dataSource={logs}
        scroll={{ x: 900 }}
        pagination={{
          current: page,
          pageSize: 25,
          total,
          showSizeChanger: false,
          onChange: (nextPage) => {
            setPage(nextPage);
            loadLogs(nextPage);
          },
        }}
      />
    </div>
  );
};

export default ActivityLogs;
