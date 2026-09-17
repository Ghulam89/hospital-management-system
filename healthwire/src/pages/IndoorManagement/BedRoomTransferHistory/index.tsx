import React, { useEffect, useState } from 'react';
import { Input, Table, message } from 'antd';
import axios from 'axios';
import moment from 'moment';
import { Link } from 'react-router-dom';
import { AsyncPaginate } from 'react-select-async-paginate';
import { RiEdit2Line } from 'react-icons/ri';

import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import { Base_url } from '../../../utils/Base_url';
import { useBranchScopeEpoch } from '../../../context/BranchScopeEpochContext';

function formatLocation(
  allocationType: string | undefined,
  ward?: { name?: string } | null,
  bed?: { bedNo?: string } | null,
  room?: { name?: string } | null,
  roomDetail?: { roomNo?: string } | null,
) {
  if (allocationType === 'ward') {
    const wardName = ward?.name || '';
    const bedNo = bed?.bedNo != null ? `Bed ${bed.bedNo}` : '';
    return [wardName, bedNo].filter(Boolean).join(' / ') || '—';
  }
  if (allocationType === 'room') {
    const roomName = room?.name || '';
    const roomNo = roomDetail?.roomNo != null ? `Room ${roomDetail.roomNo}` : '';
    return [roomName, roomNo].filter(Boolean).join(' / ') || '—';
  }
  return '—';
}

const BedRoomTransferHistory = () => {
  const branchEpoch = useBranchScopeEpoch();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState({
    search: '',
    patientId: null as string | null,
    wardId: null as string | null,
    roomId: null as string | null,
  });
  const [searchInput, setSearchInput] = useState('');
  const [selectedPatientFilter, setSelectedPatientFilter] = useState(null);
  const [selectedWardFilter, setSelectedWardFilter] = useState(null);
  const [selectedRoomFilter, setSelectedRoomFilter] = useState(null);
  const getTransferPath = (record: any) => {
    const admit = record?.admitPatientId;
    const admitId =
      typeof admit === 'object' && admit !== null ? admit._id : admit;
    return admitId ? `/bed-room-transfer-history/transfer/${admitId}` : '';
  };

  const loadPatientOptions = async (searchQuery, _loadedOptions, { page }) => {
    try {
      const response = await axios.get(`${Base_url}/apis/patient/get`, {
        params: { page, limit: 20, search: searchQuery || '', sort: 'name' },
      });
      const { data, totalPages } = response.data;
      return {
        options: (data || []).map((item) => ({
          label: `${item.name}${item.mr ? ` (MR: ${item.mr})` : ''}`,
          value: item._id,
        })),
        hasMore: page < totalPages,
        additional: { page: page + 1 },
      };
    } catch {
      return { options: [], hasMore: false, additional: { page: 1 } };
    }
  };

  const loadWardOptions = async (searchQuery, _loadedOptions, { page }) => {
    try {
      const response = await axios.get(`${Base_url}/apis/ward/get`, {
        params: { page, limit: 20, search: searchQuery || '' },
      });
      const { data, totalPages } = response.data;
      return {
        options: (data || []).map((item) => ({ label: item.name, value: item._id })),
        hasMore: page < totalPages,
        additional: { page: page + 1 },
      };
    } catch {
      return { options: [], hasMore: false, additional: { page: 1 } };
    }
  };

  const loadRoomOptions = async (searchQuery, _loadedOptions, { page }) => {
    try {
      const response = await axios.get(`${Base_url}/apis/room/get`, {
        params: { page, limit: 20, search: searchQuery || '' },
      });
      const { data, totalPages } = response.data;
      return {
        options: (data || []).map((item) => ({ label: item.name, value: item._id })),
        hasMore: page < totalPages,
        additional: { page: page + 1 },
      };
    } catch {
      return { options: [], hasMore: false, additional: { page: 1 } };
    }
  };

  const fetchHistory = async (page = 1) => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (filters.search.trim()) params.search = filters.search.trim();
      if (filters.patientId) params.patientId = filters.patientId;
      if (filters.wardId) params.wardId = filters.wardId;
      if (filters.roomId) params.roomId = filters.roomId;

      const res = await axios.get(`${Base_url}/apis/bedRoomTransferHistory/get`, { params });
      setRows((res.data?.data || []).map((item) => ({ ...item, key: item._id })));
      setTotalCount(res.data?.count || 0);
    } catch (error) {
      message.error('Failed to load transfer history');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchInput }));
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    fetchHistory(currentPage);
  }, [currentPage, filters, branchEpoch]);

  const applyFilter = (name: keyof typeof filters, option: { value: string } | null) => {
    setCurrentPage(1);
    setFilters((prev) => ({ ...prev, [name]: option?.value || null }));
  };

  const columns = [
    {
      title: 'DATE',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (value) => (value ? moment(value).format('DD/MM/YYYY HH:mm') : '—'),
    },
    {
      title: 'TYPE',
      dataIndex: 'transferType',
      key: 'transferType',
      width: 110,
      render: (value) => (value === 'admission' ? 'Admission' : 'Transfer'),
    },
    {
      title: 'PATIENT',
      key: 'patient',
      width: 180,
      render: (_, record) => {
        const p = record.patientId;
        if (!p || typeof p !== 'object') return '—';
        return `${p.name || '—'}${p.mr ? ` (${p.mr})` : ''}`;
      },
    },
    {
      title: 'ADMISSION NO',
      key: 'admissionNo',
      width: 130,
      render: (_, record) => record.admitPatientId?.admissionNo || '—',
    },
    {
      title: 'FROM',
      key: 'from',
      ellipsis: true,
      render: (_, record) =>
        formatLocation(
          record.fromAllocationType,
          record.fromWardId,
          record.fromBedDetailId,
          record.fromRoomId,
          record.fromRoomDetailId,
        ),
    },
    {
      title: 'TO',
      key: 'to',
      ellipsis: true,
      render: (_, record) =>
        formatLocation(
          record.toAllocationType,
          record.toWardId,
          record.toBedDetailId,
          record.toRoomId,
          record.toRoomDetailId,
        ),
    },
    {
      title: 'BY',
      key: 'by',
      width: 140,
      render: (_, record) => record.transferredById?.name || '—',
    },
    {
      title: 'ACTION',
      key: 'action',
      fixed: 'right' as const,
      width: 90,
      render: (_, record) => {
        const admit = record?.admitPatientId;
        const isDischarged =
          admit && typeof admit === 'object' && admit.status === false;
        if (isDischarged) return '—';
        const transferPath = getTransferPath(record);
        if (!transferPath) return '—';
        return (
          <Link
            to={transferPath}
            title="Transfer bed/room"
            className="inline-flex items-center text-primary hover:opacity-80"
          >
            <RiEdit2Line size={20} />
          </Link>
        );
      },
    },
  ];

  return (
    <>
      <Breadcrumb pageName="Bed/Room Transfer History" />

      <div className="rounded-sm border border-stroke bg-white px-5 py-5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1 mb-4">
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-black dark:text-white">
            Search (MR, patient name, admission no)
          </label>
          <Input
            allowClear
            placeholder="e.g. 34075 or ADM000001"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-black dark:text-white">Patient</label>
            <AsyncPaginate
              value={selectedPatientFilter}
              loadOptions={loadPatientOptions}
              onChange={(option) => {
                setSelectedPatientFilter(option);
                setSearchInput('');
                setFilters((prev) => ({ ...prev, search: '' }));
                applyFilter('patientId', option);
              }}
              isClearable
              placeholder="Search patient by name or MR..."
              additional={{ page: 1 }}
              debounceTimeout={300}
              classNamePrefix="react-select"
              className="w-full"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-black dark:text-white">Ward</label>
            <AsyncPaginate
              value={selectedWardFilter}
              loadOptions={loadWardOptions}
              onChange={(option) => {
                setSelectedWardFilter(option);
                applyFilter('wardId', option);
              }}
              isClearable
              placeholder="Search ward..."
              additional={{ page: 1 }}
              debounceTimeout={300}
              classNamePrefix="react-select"
              className="w-full"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-black dark:text-white">Room</label>
            <AsyncPaginate
              value={selectedRoomFilter}
              loadOptions={loadRoomOptions}
              onChange={(option) => {
                setSelectedRoomFilter(option);
                applyFilter('roomId', option);
              }}
              isClearable
              placeholder="Search room..."
              additional={{ page: 1 }}
              debounceTimeout={300}
              classNamePrefix="react-select"
              className="w-full"
            />
          </div>
        </div>
      </div>

      <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
        <Table
          columns={columns}
          dataSource={rows}
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize: 20,
            total: totalCount,
            onChange: (page) => setCurrentPage(page),
          }}
          locale={{ emptyText: 'No bed/room transfer history found.' }}
          scroll={{ x: 1200 }}
        />
      </div>

    </>
  );
};

export default BedRoomTransferHistory;
