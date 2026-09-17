import React, { useEffect, useState } from 'react';
import { Table, message, Modal } from 'antd';
import { Link } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment';
import { GiDisc } from 'react-icons/gi';
import { RiDeleteBin5Line } from 'react-icons/ri';
import { AsyncPaginate } from 'react-select-async-paginate';

import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import { Base_url } from '../../../utils/Base_url';
import { useBranchScopeEpoch } from '../../../context/BranchScopeEpochContext';

const columns = (handleDelete) => [
  {
    title: 'ADMISSION No',
    dataIndex: 'admissionNo',
    width: 130,
  },
  {
    title: 'PATIENT NAME',
    key: 'patientName',
    width: 160,
    render: (_, record) => {
      const patient = record.patientId;
      if (!patient || typeof patient !== 'object') return 'N/A';
      return (
        <Link to={`/details-patients/${patient._id}`} className="text-primary hover:underline">
          {patient.name || 'N/A'}
        </Link>
      );
    },
  },
  {
    title: 'MR#',
    key: 'patientMr',
    width: 100,
    render: (_, record) => {
      const patient = record.patientId;
      if (!patient || typeof patient !== 'object') return 'N/A';
      return patient.mr || 'N/A';
    },
  },
  {
    title: 'DOCTOR',
    key: 'doctorName',
    width: 150,
    render: (_, record) => {
      const doctor = record.doctorId;
      if (!doctor || typeof doctor !== 'object') return 'N/A';
      return doctor.name || 'N/A';
    },
  },
  {
    title: 'ADMISSION DATE',
    dataIndex: 'admissionDate',
  },
  {
    title: 'ADMISSION TIME',
    dataIndex: 'admissionTime',
  },
  {
    title: 'LAST SIGNED IN ON',
    dataIndex: 'createdAt',
    render: (value) => (value ? moment(value).format('DD/MM/YYYY HH:mm') : 'N/A'),
  },
  {
    title: 'OPERATION DATE',
    dataIndex: 'operationDate',
  },
  {
    title: 'PROCEDURE NAME',
    dataIndex: 'procedureName',
  },
  {
    title: 'ACTION',
    dataIndex: 'action',
    render: (text, record) => (
      <div className="flex items-center gap-2">
        <Link to={`/discharge-patients/${record.key}`}>
          <GiDisc color="red" size={20} />
        </Link>
        <RiDeleteBin5Line color="red" size={20} onClick={() => handleDelete(record.key)} />
      </div>
    ),
  },
];

const AddmittedPatients = () => {
  const branchEpoch = useBranchScopeEpoch();
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [patientData, setPatientData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    patientId: null as string | null,
    userId: null as string | null,
    wardId: null as string | null,
    roomId: null as string | null,
  });
  const [selectedPatientFilter, setSelectedPatientFilter] = useState(null);
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState(null);
  const [selectedWardFilter, setSelectedWardFilter] = useState(null);
  const [selectedRoomFilter, setSelectedRoomFilter] = useState(null);

  const loadPatientOptions = async (searchQuery, _loadedOptions, { page }) => {
    try {
      const response = await axios.get(`${Base_url}/apis/patient/get`, {
        params: { page, limit: 20, search: searchQuery || '', sort: 'name' },
      });
      const { data, totalPages: tp } = response.data;
      return {
        options: (data || []).map((item) => ({
          label: `${item.name}${item.mr ? ` (MR: ${item.mr})` : ''}`,
          value: item._id,
        })),
        hasMore: page < tp,
        additional: { page: page + 1 },
      };
    } catch (error) {
      console.error('Error fetching patients:', error);
      return { options: [], hasMore: false, additional: { page: 1 } };
    }
  };

  const loadDoctorOptions = async (searchQuery, _loadedOptions, { page }) => {
    try {
      const response = await axios.get(`${Base_url}/apis/user/get`, {
        params: { page, limit: 20, search: searchQuery || '', role: 'doctor' },
      });
      const { data, totalPages: tp } = response.data;
      return {
        options: (data || []).map((item) => ({
          label: item.name,
          value: item._id,
        })),
        hasMore: page < tp,
        additional: { page: page + 1 },
      };
    } catch (error) {
      console.error('Error fetching doctors:', error);
      return { options: [], hasMore: false, additional: { page: 1 } };
    }
  };

  const loadWardOptions = async (searchQuery, _loadedOptions, { page }) => {
    try {
      const response = await axios.get(`${Base_url}/apis/ward/get`, {
        params: { page, limit: 20, search: searchQuery || '' },
      });
      const { data, totalPages: tp } = response.data;
      return {
        options: (data || []).map((item) => ({
          label: item.name,
          value: item._id,
        })),
        hasMore: page < tp,
        additional: { page: page + 1 },
      };
    } catch (error) {
      console.error('Error fetching wards:', error);
      return { options: [], hasMore: false, additional: { page: 1 } };
    }
  };

  const loadRoomOptions = async (searchQuery, _loadedOptions, { page }) => {
    try {
      const response = await axios.get(`${Base_url}/apis/room/get`, {
        params: { page, limit: 20, search: searchQuery || '' },
      });
      const { data, totalPages: tp } = response.data;
      return {
        options: (data || []).map((item) => ({
          label: item.name,
          value: item._id,
        })),
        hasMore: page < tp,
        additional: { page: page + 1 },
      };
    } catch (error) {
      console.error('Error fetching rooms:', error);
      return { options: [], hasMore: false, additional: { page: 1 } };
    }
  };

  const onSelectChange = (newSelectedRowKeys) => {
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
        onSelect: (changeableRowKeys: any[]) => {
          const newSelectedRowKeys = changeableRowKeys.filter((_, index) => index % 2 !== 0);
          setSelectedRowKeys(newSelectedRowKeys);
        },
      },
      {
        key: 'even',
        text: 'Select Even Row',
        onSelect: (changeableRowKeys: any[]) => {
          const newSelectedRowKeys = changeableRowKeys.filter((_, index) => index % 2 === 0);
          setSelectedRowKeys(newSelectedRowKeys);
        },
      },
    ],
  };

  const fetchPatientData = async (page: number) => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    if (filters.patientId) params.append('patientId', filters.patientId);
    if (filters.userId) params.append('doctorId', filters.userId);
    if (filters.wardId) params.append('wardId', filters.wardId);
    if (filters.roomId) params.append('roomId', filters.roomId);
    params.append('status', 'true');
    try {
      const res = await axios.get(`${Base_url}/apis/admitPatient/get?${params.toString()}`);
      setPatientData(res.data.data.map((item: { _id: any }) => ({ ...item, key: item._id })));
      setTotalPages(res.data.totalPages);
    } catch (error) {
      message.error('Failed to fetch patient data');
      console.error(error);
    }
  };

  useEffect(() => {
    fetchPatientData(currentPage);
  }, [currentPage, filters, branchEpoch]);

  const handleTableChange = (pagination: { current: React.SetStateAction<number> }) => {
    setCurrentPage(pagination.current);
  };

  const handleDelete = (key: any) => {
    Modal.confirm({
      title: 'Delete Confirmation',
      content: 'Are you sure you want to delete this admission record?',
      okText: 'Yes, Delete',
      cancelText: 'Cancel',
      okButtonProps: { danger: true },
      centered: true,
      onOk: async () => {
        try {
          await axios.delete(`${Base_url}/apis/admitPatient/delete/${key}`);
          message.success('Patient deleted successfully');
          fetchPatientData(currentPage);
        } catch (err) {
          message.error('Failed to delete patient');
        }
      },
    });
  };

  const applyFilter = (name: keyof typeof filters, option: { value: string; label: string } | null) => {
    setCurrentPage(1);
    setFilters((prev) => ({
      ...prev,
      [name]: option?.value || null,
    }));
  };

  return (
    <>
      <Breadcrumb pageName="Admitted Patients" />

      <div className="mb-5 flex justify-between items-center">
        <h1></h1>
        <div className="flex items-center gap-4">
          <Link
            to="/admin/beds/new"
            className="inline-flex items-center justify-center gap-2.5 rounded-md bg-primary py-3 px-10 text-center font-medium text-white hover:bg-opacity-90 lg:px-8 xl:px-10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="20px" height="20px">
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
            Assign Bed/Room
          </Link>
        </div>
      </div>

      <div className="rounded-sm border border-stroke bg-white px-5 py-5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 pb-4 gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-black dark:text-white">Patient</label>
            <AsyncPaginate
              value={selectedPatientFilter}
              loadOptions={loadPatientOptions}
              onChange={(option) => {
                setSelectedPatientFilter(option);
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
            <label className="mb-2 block text-sm font-medium text-black dark:text-white">Doctor</label>
            <AsyncPaginate
              value={selectedDoctorFilter}
              loadOptions={loadDoctorOptions}
              onChange={(option) => {
                setSelectedDoctorFilter(option);
                applyFilter('userId', option);
              }}
              isClearable
              placeholder="Search doctor by name..."
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
          rowSelection={rowSelection}
          columns={columns(handleDelete)}
          dataSource={patientData}
          pagination={{ current: currentPage, pageSize: 10, total: totalPages * 10 }}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
        />
      </div>
    </>
  );
};

export default AddmittedPatients;
