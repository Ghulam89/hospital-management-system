import React, { useEffect, useState } from 'react';
import { Table, Button, message, Input, Select } from 'antd';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { FaRegEdit } from 'react-icons/fa';
import { GiDisc } from "react-icons/gi";
import { RiDeleteBin5Line } from 'react-icons/ri';

import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';

const { Search } = Input;
const { Option } = Select;

const columns = (handleDelete, handleEdit) => [
  {
    title: 'ADMISSION No',
    dataIndex: 'admissionNo',
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
      <div className='flex items-center gap-2'>
        <Link to={`/discharge-patients/${record.key}`}>
        
        <GiDisc  color='red' size={20}  />
        </Link>
        <RiDeleteBin5Line color='red' size={20} onClick={() => handleDelete(record.key)} />
      </div>
    ),
  },
];

const AddmittedPatients = () => {
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [patientData, setPatientData] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editingPatient, setEditingPatient] = useState(null);
  const [filters, setFilters] = useState({
    searchTerm: '',
    bedId: null,
    wardId: null,
    roomId: null,
    patientId: [],
    userId: null
  });
  const [wards, setWards] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [beds, setBeds] = useState([]);
  const [patients, setPatients] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');

  useEffect(() => {
    axios.get('https://api.holisticare.pk/apis/ward/get').then(res => setWards(res.data.data));
    axios.get('https://api.holisticare.pk/apis/room/get').then(res => setRooms(res.data.data));
    axios.get('https://api.holisticare.pk/apis/user/get?role=doctor').then(res => setBeds(res.data.data));
  }, []);

  // Fetch patients based on search term
  useEffect(() => {
    if (patientSearch.trim()) {
      const timer = setTimeout(() => {
        axios.get(`https://api.holisticare.pk/apis/patient/get?search=${patientSearch}`)
          .then(res => {
            const formattedPatients = res.data.data.map(patient => ({
              ...patient,
              displayName: `${patient.firstName} ${patient.lastName} (${patient.phone})`
            }));
            setPatients(formattedPatients);
          })
          .catch(err => console.error('Error fetching patients:', err));
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setPatients([]);
    }
  }, [patientSearch]);

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
          let newSelectedRowKeys = changeableRowKeys.filter((_, index) => index % 2 !== 0);
          setSelectedRowKeys(newSelectedRowKeys);
        },
      },
      {
        key: 'even',
        text: 'Select Even Row',
        onSelect: (changeableRowKeys: any[]) => {
          let newSelectedRowKeys = changeableRowKeys.filter((_, index) => index % 2 === 0);
          setSelectedRowKeys(newSelectedRowKeys);
        },
      },
    ],
  };

  const fetchPatientData = async (page: number) => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    if (filters.patientId.length > 0) params.append('patientId', filters.patientId.join(','));
    if (filters.userId) params.append('doctorId', filters.userId);
    if (filters.wardId) params.append('wardId', filters.wardId);
    if (filters.roomId) params.append('roomId', filters.roomId);
    params.append('status',true)
    try {
      const res = await axios.get(`https://api.holisticare.pk/apis/admitPatient/get?${params.toString()}`);
      setPatientData(res.data.data.map((item: { _id: any; }) => ({ ...item, key: item._id })));
      setTotalPages(res.data.totalPages);
    } catch (error) {
      message.error('Failed to fetch patient data');
      console.error(error);
    }
  };

  useEffect(() => {
    fetchPatientData(currentPage);
  }, [currentPage, filters]);

  const handleTableChange = (pagination: { current: React.SetStateAction<number>; }) => {
    setCurrentPage(pagination.current);
  };

  const handleDelete = (key: any) => {
    axios.delete(`https://api.holisticare.pk/apis/admitPatient/delete/${key}`)
      .then((res) => {
        message.success('Patient deleted successfully');
        fetchPatientData(currentPage);
      })
      .catch(err => {
        message.error('Failed to delete patient');
      });
  };

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePatientSelect = (selectedPatientIds) => {
    setFilters(prev => ({
      ...prev,
      patientId: selectedPatientIds
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
            onClick={() => setEditingPatient(null)}
            className="inline-flex items-center justify-center gap-2.5 rounded-md bg-primary py-3 px-10 text-center font-medium text-white hover:bg-opacity-90 lg:px-8 xl:px-10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="20px" height="20px">
              <g fill="#ffffff" fillRule="nonzero" stroke="none" strokeWidth="1" strokeLinecap="butt" strokeLinejoin="miter" strokeMiterlimit="10" strokeDasharray="" strokeDashoffset="0" fontFamily="none" fontWeight="none" fontSize="none" textAnchor="none">
                <g transform="scale(5.12,5.12)">
                  <path d="M25,2c-12.6907,0 -23,10.3093 -23,23c0,12.69071 10.3093,23 23,23c12.69071,0 23,-10.30929 23,-23c0,-12.6907 -10.30929,-23 -23,-23zM25,4c11.60982,0 21,9.39018 21,21c0,11.60982 -9.39018,21 -21,21c-11.60982,0 -21,-9.39018 -21,-21c0,-11.60982 9.39018,-21 21,-21zM24,13v11h-11v2h11v11h2v-11h11v-2h-11v-11z"></path>
                </g>
              </g>
            </svg>
            Assign Bed/Room
          </Link>
        </div>
      </div>

      {/* Filter Section */}
      <div className="rounded-sm border border-stroke bg-white px-5 py-5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 pb-4 gap-4">
          <div>
            <Select
              style={{ width: '100%' }}
              placeholder="Search patients by name or phone"
              filterOption={false}
              onSearch={setPatientSearch}
              onChange={handlePatientSelect}
              value={filters.patientId}
              showSearch
              allowClear
              optionLabelProp="label"
              labelInValue
            >
              {patients.map(patient => (
                <Option 
                  key={patient._id} 
                  value={patient._id}
                  label={patient.name}
                >
                  <div className="flex justify-between">
                    <span>{patient.name}</span>
                    <span className="text-gray-500 ml-2">{patient.phone}</span>
                  </div>
                </Option>
              ))}
            </Select>
          </div>
          <div>
            <Select
              style={{ width: '100%' }}
              placeholder="Select Doctor"
              onChange={(value) => handleFilterChange('userId', value)}
              allowClear
            >
              {beds.map(bed => (
                <Option key={bed._id} value={bed._id}>{bed.name}</Option>
              ))}
            </Select>
          </div>
          <div>
            <Select
              style={{ width: '100%' }}
              placeholder="Select Ward"
              onChange={(value) => handleFilterChange('wardId', value)}
              allowClear
            >
              {wards.map(ward => (
                <Option key={ward._id} value={ward._id}>{ward.name}</Option>
              ))}
            </Select>
          </div>
          <div>
            <Select
              style={{ width: '100%' }}
              placeholder="Select Room"
              onChange={(value) => handleFilterChange('roomId', value)}
              allowClear
            >
              {rooms.map(room => (
                <Option key={room._id} value={room._id}>{room.name}</Option>
              ))}
            </Select>
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
        />
      </div>
    </>
  );
};

export default AddmittedPatients;