import React, { useEffect, useState } from 'react';
import { Table, message } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment';
import { RiDeleteBin5Line } from 'react-icons/ri';
import { Base_url } from '../../utils/Base_url';

const TodayAppointments = () => {
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [appointments, setAppointments] = useState([]);
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
    axios.get(`${Base_url}/apis/appointment/dashboard`)
      .then((res) => {
        setAppointments(res?.data?.data?.todayAppointments || []);
        setLoading(false);
      })
      .catch(err => {
        message.error('Failed to fetch appointments');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAppointments();
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
      render: (text, record) => {
        return (
          <Link to={`/details-patients/${record.patientId?._id}`}>
            {text}
          </Link>
        );
      },
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
    <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default sm:px-7.5 xl:pb-1">
      <div className="mb-5 flex justify-between items-center">
        <h1 className="text-xl font-semibold text-black">Today Appointments</h1>
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
  );
};

export default TodayAppointments;