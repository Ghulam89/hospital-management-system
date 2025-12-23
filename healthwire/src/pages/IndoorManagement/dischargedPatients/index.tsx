import React, { useEffect, useState } from 'react';
import { Table, Button, message } from 'antd';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { FaRegEdit } from 'react-icons/fa';
import { RiDeleteBin5Line } from 'react-icons/ri';

import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import Swal from 'sweetalert2';

const columns = [
  {
    title: 'ADMISSION No',
    dataIndex: ['admitPatientId', 'admissionNo'],
  },
  {
    title: 'ADMISSION DATE',
    dataIndex: ['admitPatientId', 'admissionDate'],
  },
  {
    title: 'ADMISSION TIME',
    dataIndex: ['admitPatientId', 'admissionTime'],
  },
  {
    title: 'DISCHARGE DATE',
    dataIndex: 'dischargeDate',
  },
  {
    title: 'DISCHARGE TIME',
    dataIndex: 'dischargeTime',
  },
  {
    title: 'DISCHARGE STATUS',
    dataIndex: 'dischargeStatus',
  },
  {
    title: 'PROCEDURE NAME',
    dataIndex: ['admitPatientId', 'procedureName'],
  },
  {
    title: 'ACTION',
    dataIndex: 'action',
    render: (text, record) => (
      <div className='flex items-center gap-2'>
        <Button type="primary" onClick={() => handleViewDetails(record)} className=' bg-primary text-white rounded-md px-4 py-2 text-sm'>
          View Details
        </Button>
      </div>
    ),
  },
];


const handleViewDetails = (record) => {
  // Implement view details functionality
  Swal.fire({
    title: 'Patient Details',
    html: `
      <div>
        <p><strong>Admission No:</strong> ${record.admitPatientId?.admissionNo || 'N/A'}</p>
        <p><strong>Admission Date:</strong> ${record.admitPatientId?.admissionDate || 'N/A'}</p>
        <p><strong>Discharge Status:</strong> ${record.dischargeStatus || 'N/A'}</p>
        <p><strong>Procedure:</strong> ${record.admitPatientId?.procedureName || 'N/A'}</p>
      </div>
    `,
    confirmButtonColor: '#4EC3BD',
  });
};


const DischargedPatients = () => {
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [patientData, setPatientData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchDischargedPatients = (page: number) => {
    setLoading(true);
    axios.get(`https://api.holisticare.pk/apis/dischargePatient/get?page=${page}`)
      .then((res) => {
        setPatientData(res.data.data.map(item => ({ ...item, key: item._id })));
        setTotalPages(res.data.totalPages);
        setLoading(false);
      })
      .catch(err => {
        message.error('Failed to fetch discharged patients');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDischargedPatients(currentPage);
  }, [currentPage]);

  const handleTableChange = (pagination: { current: React.SetStateAction<number>; }) => {
    setCurrentPage(pagination.current);
  };


  return (
    <>
      <Breadcrumb pageName="Discharged Patients" />
     
      <div className="mb-5 flex justify-between items-center">
        <h1></h1>
        <div className="flex items-center gap-4">
          <Button 
            type="primary" 
            className=" bg-primary text-white"
            onClick={() => fetchDischargedPatients(currentPage)}
          >
            Refresh
          </Button>
        </div>
      </div>
      <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
        <Table
          loading={loading}
          columns={columns}
          dataSource={patientData}
          pagination={{ 
            current: currentPage, 
            pageSize: 10, 
            total: totalPages * 10,
            showSizeChanger: false 
          }}
          onChange={handleTableChange}
          scroll={{ x: true }}
        />
      </div>
    </>
  );
};

export default DischargedPatients;