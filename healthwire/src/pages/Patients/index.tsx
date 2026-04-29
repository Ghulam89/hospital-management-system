import React, { useCallback, useEffect, useState } from 'react';
import { Table, Button, message, Input, Pagination, Modal, Tag, Tooltip, Select, Spin } from 'antd';
import { Link } from 'react-router-dom';

import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import axios from 'axios';
import { FaEye, FaRegEdit } from 'react-icons/fa';
import { RiDeleteBin5Line, RiFileExcel2Line } from 'react-icons/ri';
import AddPatients from './AddPatients';
import UpdatePatient from './UpdatePatinet';
import moment from 'moment';
import { Base_url } from '../../utils/Base_url';
import * as XLSX from 'xlsx';
import {
  BRANCH_CHANGED_EVENT,
  getSuperadminSelectedBranchId,
  getUserDataFromStorage,
  isSuperAdminRole,
  setSuperadminSelectedBranchId,
} from '../../utils/branchScope';

type BranchRow = { _id: string; name: string; code?: string };

function getUserBranchIdFromStorage(): string | null {
  const u = getUserDataFromStorage();
  if (!u) return null;
  const b = u.branchId as unknown;
  if (b == null || b === '') return null;
  if (typeof b === 'object' && b !== null && '_id' in (b as object)) {
    return String((b as { _id: string })._id);
  }
  return String(b);
}

const Patients = () => {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [patientData, setPatientData] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [editingPatient, setEditingPatient] = useState<any>(null);
  const [searchFilters, setSearchFilters] = useState({
    name: '',
    mr: '',
    phone: '',
    cnic: '',
  });
  // Date range filter state
  const [dateRange, setDateRange] = useState<[moment.Moment | null, moment.Moment | null]>([
    null,
    null
  ]);
  const [branchListScope, setBranchListScope] = useState(0);
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [branchListLoading, setBranchListLoading] = useState(false);

  const isSuper = isSuperAdminRole(getUserDataFromStorage()?.role);
  const userBranchId = getUserBranchIdFromStorage();

  const loadBranches = useCallback(() => {
    setBranchListLoading(true);
    axios
      .get(`${Base_url}/apis/branch/get`, { params: { limit: 500, page: 1 } })
      .then((res) => {
        setBranches((res.data?.data || []) as BranchRow[]);
      })
      .catch(() => setBranches([]))
      .finally(() => setBranchListLoading(false));
  }, []);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  useEffect(() => {
    const bump = () => setBranchListScope((n) => n + 1);
    window.addEventListener(BRANCH_CHANGED_EVENT, bump);
    return () => window.removeEventListener(BRANCH_CHANGED_EVENT, bump);
  }, []);

  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
    selections: [
      Table.SELECTION_ALL,
      Table.SELECTION_INVERT,
      Table.SELECTION_NONE,
      {
        key: 'odd',
        text: 'Select Odd Row',
        onSelect: (changeableRowKeys: React.Key[]) => {
          let newSelectedRowKeys = changeableRowKeys.filter((_: React.Key, index: number) => index % 2 !== 0);
          setSelectedRowKeys(newSelectedRowKeys);
        },
      },
      {
        key: 'even',
        text: 'Select Even Row',
        onSelect: (changeableRowKeys: React.Key[]) => {
          let newSelectedRowKeys = changeableRowKeys.filter((_: React.Key, index: number) => index % 2 === 0);
          setSelectedRowKeys(newSelectedRowKeys);
        },
      },
    ],
  };

  const buildPatientQueryParams = (page: number, limit: number) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (searchFilters.name.trim()) {
      params.append('name', searchFilters.name.trim());
    }
    if (searchFilters.mr.trim()) {
      const m = searchFilters.mr.trim();
      params.append('mr', m);
      params.append('exactMr', 'true');
    }
    if (searchFilters.phone.trim()) {
      params.append('phone', searchFilters.phone.trim());
    }
    if (searchFilters.cnic.trim()) {
      params.append('cnic', searchFilters.cnic.trim());
    }

    if (dateRange[0]) {
      params.append('fromDate', dateRange[0].format('YYYY-MM-DD'));
    }
    if (dateRange[1]) {
      params.append('toDate', dateRange[1].format('YYYY-MM-DD'));
    }

    const phoneQ = searchFilters.phone.trim();
    const cnicDigits = searchFilters.cnic.replace(/\D/g, '');
    const mrQ = searchFilters.mr.trim();
    if (phoneQ || cnicDigits.length >= 5 || mrQ) {
      params.append('includeIdentityMatches', 'true');
    }

    return params;
  };

  const fetchPatientData = () => {
    setLoading(true);
    const params = buildPatientQueryParams(currentPage, pageSize);
    axios
      .get(`${Base_url}/apis/patient/get?${params.toString()}`)
      .then((res) => {
        const responseData = res?.data?.data || [];
        const responseTotal = res?.data?.total || res?.data?.count || responseData.length;
        setPatientData(
          responseData.map((item: any) => ({
            ...item,
            key: `${item._id}-${item._rowSource || 'branch'}-${item.notInThisBranch ? 'ext' : 'loc'}`,
          })),
        );
        setTotal(responseTotal);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching patient data:', err);
        message.error('Failed to fetch patient data');
        setLoading(false);
      });
  };

  const openVisitThisBranch = async (patientId: string) => {
    const u = getUserDataFromStorage();
    const payload: Record<string, string> = { patientId, visitType: 'OPD' };
    if (isSuperAdminRole(u?.role)) {
      const bid = getSuperadminSelectedBranchId();
      if (!bid) {
        message.error('Superadmin: select a branch in the branch filter first.');
        return;
      }
      payload.branchId = bid;
    }
    try {
      await axios.post(`${Base_url}/apis/visits`, payload);
      message.success('Visit opened. Patient is now linked to this branch.');
      fetchPatientData();
    } catch {
      message.error('Could not open visit.');
    }
  };

  const columns = [
    {
      title: 'MR#',
      dataIndex: 'mr',
      width: 108,
      ellipsis: true,
      render: (mr: string, record: any) => {
        const names = (record.visitMeta?.branchNames as string[] | undefined) || [];
        const branchLine = names.length ? names.join(', ') : 'No branch visits/invoices yet';
        const tip = `MR# is one number per patient (whole hospital). Branches with activity: ${branchLine}.`;
        return (
          <Tooltip title={tip} placement="topLeft">
            <span className="cursor-help border-b border-dashed border-bodydark2/40 dark:border-strokedark">
              {mr || '—'}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: 'NAME',
      dataIndex: 'name',
      width: 140,
      ellipsis: true,
    },
    {
      title: 'CNIC',
      dataIndex: 'cnic',
      width: 158,
      ellipsis: true,
    },
    {
      title: 'PHONE',
      dataIndex: 'phone',
      width:150,
      ellipsis: true,
    },
    {
      title: 'BRANCH(ES)',
      key: 'branchNames',
      width: 160,
      ellipsis: true,
      render: (_: unknown, record: any) => {
        const names = record.visitMeta?.branchNames as string[] | undefined;
        if (names?.length) return names.join(', ');
        return '—';
      },
    },
    ...(!isSuper
      ? [
          {
            title: 'THIS BRANCH',
            key: 'branchScope',
            width: 148,
            render: (_: unknown, record: any) => {
              if (record.notInThisBranch) {
                return <Tag color="warning">Other branch(es) only</Tag>;
              }
              return <Tag color="success">Active here</Tag>;
            },
          },
        ]
      : []),
    {
      title: 'LAST SIGNED IN ON',
      dataIndex: 'createdAt',
      width: 128,
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'ACTION',
      key: 'action',
      width: 176,
      fixed: 'right' as const,
      align: 'center' as const,
      render: (_: unknown, record: any) => (
        <div className="flex min-w-0 w-full items-center justify-center py-0.5">
          {record.notInThisBranch ? (
            <Tooltip title="Open a visit at your current branch — patient keeps the same MR#.">
              <button
                type="button"
                onClick={() => openVisitThisBranch(String(record._id))}
                className="inline-flex h-8 min-w-[108px] items-center justify-center rounded-md border border-primary bg-primary px-3 text-xs font-medium text-white shadow-sm transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                Open visit
              </button>
            </Tooltip>
          ) : (
            <div
              className="inline-flex items-stretch justify-center overflow-hidden rounded-lg border border-stroke bg-gray-2/50 shadow-sm dark:border-strokedark dark:bg-boxdark-2/80"
              role="group"
              aria-label="Patient actions"
            >
              <Tooltip title="View details">
                <Link
                  to={`/details-patients/${record?._id}`}
                  className="inline-flex h-8 w-9 items-center justify-center text-primary transition-colors hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary dark:hover:bg-primary/20"
                  aria-label="View patient"
                >
                  <FaEye className="text-[18px]" />
                </Link>
              </Tooltip>
              <span className="w-px shrink-0 self-stretch bg-stroke dark:bg-strokedark" aria-hidden />
              <Tooltip title="Edit">
                <button
                  type="button"
                  className="inline-flex h-8 w-9 items-center justify-center text-blue-600 transition-colors hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-500 dark:text-blue-400 dark:hover:bg-blue-500/15"
                  onClick={() => handleEdit(record)}
                  aria-label="Edit patient"
                >
                  <FaRegEdit className="text-[17px]" />
                </button>
              </Tooltip>
              <span className="w-px shrink-0 self-stretch bg-stroke dark:bg-strokedark" aria-hidden />
              <Tooltip title="Delete">
                <button
                  type="button"
                  className="inline-flex h-8 w-9 items-center justify-center text-red-500 transition-colors hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-red-500 dark:text-red-400 dark:hover:bg-red-500/15"
                  onClick={() => handleDelete(record._id)}
                  aria-label="Delete patient"
                >
                  <RiDeleteBin5Line className="text-[17px]" />
                </button>
              </Tooltip>
            </div>
          )}
        </div>
      ),
    },
  ];

  useEffect(() => {
    fetchPatientData();
  }, [currentPage, pageSize, searchFilters, dateRange, branchListScope]);

  const exportToExcel = async () => {
    if (exportLoading) return;

    try {
      setExportLoading(true);

      const requestedPageSize = 1000;
      const firstParams = buildPatientQueryParams(1, requestedPageSize);
      const firstRes = await axios.get(`${Base_url}/apis/patient/get?${firstParams.toString()}`);

      const firstPageData = firstRes?.data?.data || [];
      const apiLimit = firstRes?.data?.limit || firstRes?.data?.pageSize || firstPageData.length || requestedPageSize;
      const apiCount = firstRes?.data?.total || firstRes?.data?.count || firstRes?.data?.totalCount || 0;
      const apiTotalPages =
        firstRes?.data?.totalPages ||
        (apiCount && apiLimit ? Math.ceil(apiCount / apiLimit) : 0);

      if (!firstPageData.length) {
        message.warning('No patients found for export');
        return;
      }

      const maxExport = 100000;
      const maxPagesByCount =
        apiCount && apiLimit ? Math.ceil(Math.min(apiCount, maxExport) / apiLimit) : 0;
      const totalPagesToFetch =
        apiTotalPages && maxPagesByCount
          ? Math.min(apiTotalPages, maxPagesByCount)
          : apiTotalPages || maxPagesByCount;

      const allPatients: any[] = [...firstPageData];
      const pagesToFetch = totalPagesToFetch || 0;

      if (pagesToFetch > 1) {
        message.loading({
          content: `Exporting... ${allPatients.length}${apiCount ? `/${Math.min(apiCount, maxExport)}` : ''}`,
          key: 'patients-excel-export',
          duration: 0,
        });

        for (let page = 2; page <= pagesToFetch; page += 1) {
          if (allPatients.length >= maxExport) break;

          const params = buildPatientQueryParams(page, apiLimit);
          const res = await axios.get(`${Base_url}/apis/patient/get?${params.toString()}`);
          const pageData = res?.data?.data || [];

          if (!pageData.length) break;

          allPatients.push(...pageData);

          message.loading({
            content: `Exporting... ${Math.min(allPatients.length, maxExport)}${apiCount ? `/${Math.min(apiCount, maxExport)}` : ''}`,
            key: 'patients-excel-export',
            duration: 0,
          });
        }
      }

      message.destroy('patients-excel-export');

      const exportData = allPatients.slice(0, maxExport).map((patient: any) => ({
        'MR Number': patient.mr || '-',
        'Patient Name': patient.name || '-',
        'CNIC': patient.cnic || '-',
        'Phone Number': patient.phone || '-',
        'Branches': (patient.visitMeta?.branchNames || []).join(', ') || '-',
        'Email Address': patient.email || '-',
        'Gender': patient.gender || '-',
        'Age': patient.dob ? moment().diff(moment(patient.dob), 'years') : '-',
        'Patient Type': patient.patientType || 'General',
        'Date of Birth': patient.dob ? moment(patient.dob).format('DD/MM/YYYY') : '-',
        'Created Date': patient.createdAt ? moment(patient.createdAt).format('DD/MM/YYYY') : '-',
        'Created Time': patient.createdAt ? moment(patient.createdAt).format('hh:mm A') : '-',
        'Address': patient.address || '-',
        'Tag': patient.tag || '-',
        'Blood Group': patient.bloodGroup || '-',
        'Emergency Contact': patient.emergencyContact || '-',
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      ws['!cols'] = [
        { wch: 12 },
        { wch: 25 },
        { wch: 18 },
        { wch: 15 },
        { wch: 28 },
        { wch: 25 },
        { wch: 10 },
        { wch: 8 },
        { wch: 15 },
        { wch: 12 },
        { wch: 12 },
        { wch: 10 },
        { wch: 30 },
        { wch: 15 },
        { wch: 12 },
        { wch: 20 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Patients');
      XLSX.writeFile(wb, `Patients_${moment().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`);
      message.success(`Excel exported: ${exportData.length} patients`);
    } catch (err) {
      message.destroy('patients-excel-export');
      message.error('Failed to export Excel');
    } finally {
      setExportLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: 'Delete Patient?',
      content: 'Are you sure you want to delete this patient? This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await axios.delete(`${Base_url}/apis/patient/delete/${id}`);
          message.success('Patient deleted successfully');
          fetchPatientData();
        } catch (err) {
          message.error('Failed to delete patient');
        }
      },
    });
  };

  const handleEdit = (patient: any) => {
    setEditingPatient(patient);
    setIsUpdateModalOpen(true);
  };

  const handleAdd = () => {
    setEditingPatient(null);
    setIsModalOpen(true);
  };

  const handleSearchChange = (field: string, value: string) => {
    setSearchFilters(prev => ({
      ...prev,
      [field]: value
    }));
    setCurrentPage(1); // Reset to first page on search
  };

  // Date change handler
  const handleDateChange = (value: string, idx: number) => {
    const newRange: [moment.Moment | null, moment.Moment | null] = [dateRange[0], dateRange[1]];
    newRange[idx] = value ? moment(value) : null;
    // Ensure end is not before start
    if (idx === 0 && newRange[1] && value && moment(value).isAfter(newRange[1])) {
      newRange[1] = moment(value);
    }
    if (idx === 1 && newRange[0] && value && moment(value).isBefore(newRange[0])) {
      newRange[0] = moment(value);
    }
    setDateRange(newRange);
    setCurrentPage(1); // Reset to first page on date change
  };

  return (
    <>
      <Breadcrumb pageName="Patients" />
      
      <AddPatients
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        fetchPatientData={fetchPatientData}
        closeModal={() => setIsModalOpen(false)}
      />

      <UpdatePatient
        isModalOpen={isUpdateModalOpen}
        setIsModalOpen={setIsUpdateModalOpen}
        closeModal={() => setIsUpdateModalOpen(false)}
        fetchPatientData={fetchPatientData}
        patientData={editingPatient}
      />

      <div className="mb-5 flex justify-between items-center">
        <h4 className="text-xl font-semibold text-black dark:text-white">
          Patients ({total} total)
        </h4>
        <div className="flex items-center gap-2">
          <Button
            onClick={exportToExcel}
            loading={exportLoading}
            icon={<RiFileExcel2Line size={18} />}
          >
            Export Excel
          </Button>
          <button
            onClick={handleAdd}
            className="inline-flex items-center justify-center gap-2.5 rounded-md bg-primary py-3 px-10 text-center font-medium text-white hover:bg-opacity-90 lg:px-8 xl:px-10"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 256 256"
              width="20px"
              height="20px"
            >
              <g
                fill="#ffffff"
                fillRule="nonzero"
                stroke="none"
                strokeWidth="1"
                strokeLinecap="butt"
                strokeLinejoin="miter"
                strokeMiterlimit="10"
                strokeDasharray=""
                strokeDashoffset="0"
                fontFamily="none"
                fontWeight="none"
                fontSize="none"
                textAnchor="none"
              >
                <g transform="scale(5.12,5.12)">
                  <path d="M25,2c-12.6907,0 -23,10.3093 -23,23c0,12.69071 10.3093,23 23,23c12.69071,0 23,-10.30929 23,-23c0,-12.6907 -10.30929,-23 -23,-23zM25,4c11.60982,0 21,9.39018 21,21c0,11.60982 -9.39018,21 -21,21c-11.60982,0 -21,-9.39018 -21,-21c0,-11.60982 9.39018,-21 21,-21zM24,13v11h-11v2h11v11h2v-11h11v-2h-11v-11z"></path>
                </g>
              </g>
            </svg>
            Add Patient
          </button>
        </div>
      </div>

      <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
        <div className="mb-4 flex flex-col gap-3">
          <div className="flex flex-wrap gap-2 items-center">
            <Input
              placeholder="Search by Name"
              allowClear
              value={searchFilters.name}
              onChange={(e) => handleSearchChange('name', e.target.value)}
              style={{ width: 200, color: '#000' }}
            />
            <Input
              placeholder="MR# (exact)"
              allowClear
              value={searchFilters.mr}
              onChange={(e) => handleSearchChange('mr', e.target.value)}
              style={{ width: 200, color: '#000' }}
            />
            <Input
              placeholder="Search by Phone"
              allowClear
              value={searchFilters.phone}
              onChange={(e) => handleSearchChange('phone', e.target.value)}
              style={{ width: 200, color: '#000' }}
            />
            <Input
              placeholder="Search by CNIC"
              allowClear
              value={searchFilters.cnic}
              onChange={(e) => handleSearchChange('cnic', e.target.value)}
              style={{ width: 200, color: '#000' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Input
              type="date"
              value={dateRange[0]?.format('YYYY-MM-DD') || ''}
              onChange={e => handleDateChange(e.target.value, 0)}
              style={{ flex: 1 }}
              max={dateRange[1]?.format('YYYY-MM-DD') || moment().format('YYYY-MM-DD')}
            />
            <span>to</span>
            <Input
              type="date"
              value={dateRange[1]?.format('YYYY-MM-DD') || ''}
              onChange={e => handleDateChange(e.target.value, 1)}
              style={{ flex: 1 }}
              min={dateRange[0]?.format('YYYY-MM-DD')}
              max={moment().format('YYYY-MM-DD')}
            />
          </div>
        </div>
        <div className="w-full overflow-x-auto">
          <Table
            rowSelection={rowSelection}
            columns={columns}
            dataSource={patientData}
            loading={loading}
            pagination={false}
            scroll={{ x: 1088 }}
            tableLayout="fixed"
          />
        </div>
        <div className='flex justify-end py-4'>
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={total}
            onChange={(page, size) => {
              setCurrentPage(page);
              setPageSize(size || 10);
            }}
            showSizeChanger
            showQuickJumper
            showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} patients`}
            className="mt-4"
          />
        </div>
      </div>

      {/* Add custom CSS for placeholder colors */}
      <style jsx global>{`
        .ant-input::placeholder {
          color: #000 !important;
          opacity: 0.6;
        }
        .ant-input::-webkit-input-placeholder {
          color: #000 !important;
          opacity: 0.6;
        }
        .ant-input::-moz-placeholder {
          color: #000 !important;
          opacity: 0.6;
        }
        .ant-input:-ms-input-placeholder {
          color: #000 !important;
          opacity: 0.6;
        }
      `}</style>
    </>
  );
};

export default Patients;
