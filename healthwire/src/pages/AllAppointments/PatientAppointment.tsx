import React, { useEffect, useState } from 'react';
import { Table, message } from 'antd';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment';
import { RiDeleteBin5Line } from 'react-icons/ri';
import { Base_url } from '../../utils/Base_url';
import Header from '../../components/Header';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';


const PatientAppointments = () => {
    const {id} = useParams();
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
        onSelect: (changeableRowKeys) => {
          let newSelectedRowKeys = [];
          newSelectedRowKeys = changeableRowKeys.filter((_, index) => index % 2 !== 0);
          setSelectedRowKeys(newSelectedRowKeys);
        },
      },
      {
        key: 'even',
        text: 'Select Even Row',
        onSelect: (changeableRowKeys) => {
          let newSelectedRowKeys = [];
          newSelectedRowKeys = changeableRowKeys.filter((_, index) => index % 2 === 0);
          setSelectedRowKeys(newSelectedRowKeys);
        },
      },
    ],
  };

  const fetchAppointments = () => {
    setLoading(true);
    axios.get(`${Base_url}/apis/appointment/get?patientId=${id}`)
      .then((res) => {
        setAppointments(res?.data?.data || []);
        setLoading(false);
      })
      .catch(err => {
        message.error('Failed to fetch appointments');
        setLoading(false);
      });
  };

   const fetchPatient = () => {
    setLoading(true);
    axios.get(`${Base_url}/apis/patient/get/${id}`)
      .then((res) => {
        setPatient(res?.data?.data || []);
        setLoading(false);
      })
      .catch(err => {
        message.error('Failed to fetch appointments');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAppointments();
    fetchPatient();
  }, []);

  const handleEdit = (record) => {
    navigate(`/admin/edit_appointment/${record._id}`);
  };

  const handleDelete = (id) => {
    axios.delete(`${Base_url}/apis/appointment/delete/${id}`)
      .then((res) => {
        message.success('Appointment deleted successfully');
        fetchAppointments();
      })
      .catch(err => {
        message.error('Failed to delete appointment');
      });
  };

  const columns = [
    {
      title: 'Doctor Name',
      dataIndex: ['doctorId', 'name'],
      key: 'doctorName',
    },
    {
      title: 'Patient Name',
      dataIndex: ['patientId', 'name'],
      key: 'patientName',
    },
    {
      title: 'Phone',
      dataIndex: ['patientId', 'phone'],
      key: 'phone',
    },
    {
      title: 'Appointment Date',
      dataIndex: 'appointmentDate',
      render: (text) => moment(text).format('DD/MM/YYYY'),
      key: 'date',
    },
    {
      title: 'Time Slot',
      render: (record) => `${record.startTime} - ${record.endTime}`,
      key: 'time',
    },
    {
      title: 'Status',
      dataIndex: 'appointmentStatus',
      key: 'status',
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <div className='flex items-center gap-2'>
          {/* <FaRegEdit 
            color='blue' 
            size={20} 
            onClick={() => handleEdit(record)} 
            style={{ cursor: 'pointer' }}
          /> */}
          <RiDeleteBin5Line 
            color='red' 
            size={20} 
            onClick={() => handleDelete(record._id)} 
            style={{ cursor: 'pointer' }}
          />
        </div>
      ),
    },
  ];

  return (
   <>
    <div className="">
            <Breadcrumb pageName="Appointments" />
              <div>
          <p className='text-black  mb-3 font-medium'>
            <span className='text-primary'>
              {patient?.mr}-{patient?.name}-{patient?.gender}
            </span>-Appointments
          </p>
      </div>
            <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default sm:px-7.5 xl:pb-1">
      <div className="mb-5 flex justify-between items-center">
       
        <h1 className="text-xl font-semibold text-black"> Appointments</h1>
        
      </div>

    
     
      <Table
        rowKey="_id"
        rowSelection={rowSelection}
        columns={columns}
        dataSource={appointments}
        loading={loading}
        pagination={false}
      />
    </div>
            </div>
    
   </>
  );
};

export default PatientAppointments;