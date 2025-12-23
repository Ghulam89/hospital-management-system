import React, { useEffect, useState } from 'react';
import { Table, Button, message, Input, Pagination } from 'antd';
import { Link } from 'react-router-dom';

import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import axios from 'axios';
import { FaEye, FaRegEdit } from 'react-icons/fa';
import { RiDeleteBin5Line } from 'react-icons/ri';
import AddPatients from './AddPatients';
import UpdatePatient from './UpdatePatinet';
import moment from 'moment';
import { Base_url } from '../../utils/Base_url';

const Patients = () => {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [patientData, setPatientData] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [editingPatient, setEditingPatient] = useState<any>(null);
  const [searchFilters, setSearchFilters] = useState({
    name: '',
    mr: '',
    phone: '',
    cnic: '',
  });
  // Date range filter state
  const [dateRange, setDateRange] = useState<[moment.Moment | null, moment.Moment | null]>([
    moment().subtract(1, 'month'),
    moment()
  ]);

  const columns = [
    {
      title: 'MR#',
      dataIndex: 'mr',
    },
    {
      title: 'NAME',
      dataIndex: 'name',
    },
    {
      title: 'CNIC',
      dataIndex: 'cnic',
    },
    {
      title: 'PHONE',
      dataIndex: 'phone',
    },
    {
      title: 'LAST SIGNED IN ON',
      dataIndex: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'ACTION',
      dataIndex: 'action',
      render: (_: unknown, record: any) => (
        <div className='flex items-center gap-2'>
          <Link to={`/details-patients/${record?._id}`}>
            <FaEye className='text-primary' size={22} />
          </Link>
          <FaRegEdit 
            color='blue' 
            size={20} 
            onClick={() => handleEdit(record)} 
            className="cursor-pointer"
          />
          <RiDeleteBin5Line 
            color='red' 
            size={20} 
            onClick={() => handleDelete(record._id)} 
            className="cursor-pointer"
          />
        </div>
      ),
    },
  ];

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

  const fetchPatientData = () => {
    setLoading(true);
    
    // Build query parameters for server-side pagination and filtering
    const params = new URLSearchParams({
      page: currentPage.toString(),
      limit: pageSize.toString(),
    });

    // Add separate search parameters if provided
    if (searchFilters.name.trim()) {
      params.append('name', searchFilters.name.trim());
    }
    if (searchFilters.mr.trim()) {
      params.append('mr', searchFilters.mr.trim());
    }
    if (searchFilters.phone.trim()) {
      params.append('phone', searchFilters.phone.trim());
    }
    if (searchFilters.cnic.trim()) {
      params.append('cnic', searchFilters.cnic.trim());
    }

    // Add date range parameters if provided
    if (dateRange[0]) {
      params.append('fromDate', dateRange[0].format('YYYY-MM-DD'));
    }
    if (dateRange[1]) {
      params.append('toDate', dateRange[1].format('YYYY-MM-DD'));
    }

    axios.get(`${Base_url}/apis/patient/get?${params.toString()}`)
      .then((res) => {
        const responseData = res?.data?.data || [];
        const responseTotal = res?.data?.total || res?.data?.count || responseData.length;
        
        setPatientData(responseData.map((item: any) => ({ ...item, key: item._id })));
        setTotal(responseTotal);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching patient data:', err);
        message.error('Failed to fetch patient data');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPatientData();
  }, [currentPage, pageSize, searchFilters, dateRange]);

  const handleDelete = (id: string) => {
    axios.delete(`${Base_url}/apis/patient/delete/${id}`)
      .then((res) => {
        message.success('Patient deleted successfully');
        fetchPatientData();
      })
      .catch(err => {
        message.error('Failed to delete patient');
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
              placeholder="Search by MR Number"
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
        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={patientData}
          loading={loading}
          pagination={false}
        />
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