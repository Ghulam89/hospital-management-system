import React, { useEffect, useState } from 'react';
import { Table, Button, message, DatePicker, Space } from 'antd';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { RiDeleteBin5Line, RiFile2Line, RiEdit2Line } from 'react-icons/ri';

import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import moment from 'moment';
import { Base_url } from '../../../utils/Base_url';
const { RangePicker } = DatePicker;

const BedPatientHistory = () => {
  const { id } = useParams();
  const [dischargeHistory, setDischargeHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [patientData, setPatientData] = useState({});

  const columns = [
    {
      title: 'S.No',
      key: 'serial',
      render: (_, __, index) => index + 1,
    },
    {
      title: 'WARD',
      dataIndex: ['admitPatientId', 'wardId', 'name'],
      key: 'ward',
    },
    {
      title: 'BED#',
      dataIndex: ['admitPatientId', 'bedDetailId', 'bedNo'],
      key: 'bedNo',
    },
    {
      title: 'ADMITTED AT',
      key: 'admission',
      render: (record) => (
        `${record.admitPatientId?.admissionDate} ${record.admitPatientId?.admissionTime}`
      ),
    },
    {
      title: 'DISCHARGE AT',
      key: 'discharge',
      render: (record) => (
        `${record.dischargeDate} ${record.dischargeTime}`
      ),
    },
    {
      title: 'DISCHARGE STATUS',
      dataIndex: 'dischargeStatus',
      key: 'dischargeStatus',
    },
    {
      title: 'DISCHARGE SUMMARY',
      dataIndex: ['admitPatientId','admissionReason'],
      key: 'admissionReason',
    //   render: (documents) => documents?.join(', '),
    },
    {
      title: 'CREATED AT',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text) => moment(text).format('DD/MM/YYYY'),
    },
    {
      title: 'ACTIONS',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          {/* <RiEdit2Line 
            color='blue' 
            size={18} 
            onClick={() => {
              setEditData(record);
              setIsModalOpen(true);
            }} 
            style={{ cursor: 'pointer' }}
          /> */}
          <RiDeleteBin5Line 
            color='red' 
            size={18} 
            onClick={() => handleDelete(record._id)} 
            style={{ cursor: 'pointer' }}
          />
        </Space>
      ),
    },
  ];

  const fetchDischargeHistory = async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pageSize,
        patientId: id
      };

      if (dateRange.length === 2) {
        params.startDate = moment(dateRange[0]).startOf('day').toISOString();
        params.endDate = moment(dateRange[1]).endOf('day').toISOString();
      }
      
      const res = await axios.get(`${Base_url}/apis/dischargePatient/get?patientId=${id}`, { params });
      
      const formattedData = res.data.data.map(item => ({
        ...item,
        key: item._id,
      }));
      
      setDischargeHistory(formattedData);
      setPagination({
        ...pagination,
        current: res.data.currentPage,
        total: res.data.count,
        pageSize: parseInt(res.data.limit),
      });
    } catch (error) {
      message.error('Failed to fetch discharge history');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientDetails = async () => {
    try {
      const response = await axios.get(`${Base_url}/apis/patient/get/${id}`);
      setPatientData(response.data.data);
    } catch (error) {
      console.error("Error fetching patient details:", error);
    }
  }

  useEffect(() => {
    fetchPatientDetails();
    fetchDischargeHistory(pagination.current, pagination.pageSize);
  }, [pagination.current, pagination.pageSize, dateRange]);

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${Base_url}/apis/dischargePatient/delete/${id}`);
      message.success('Discharge record deleted successfully');
      fetchDischargeHistory(pagination.current, pagination.pageSize);
    } catch (err) {
      message.error('Failed to delete discharge record');
      console.error(err);
    }
  };

  const handleTableChange = (newPagination) => {
    setPagination(newPagination);
  };

  return (
    <>
      <Breadcrumb pageName="Bed Patient History" />
      
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className='text-black font-medium'>
            <span className='text-primary'>
              {patientData?.mr}-{patientData?.name}-{patientData?.gender}
            </span>-Bed-History
          </p>
        </div>
        
        <RangePicker 
          onChange={(dates) => setDateRange(dates)}
          style={{ width: '250px' }}
        />
      </div>

      <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
        <Table
          columns={columns}
          dataSource={dischargeHistory}
          loading={loading}
          pagination={pagination}
          onChange={handleTableChange}
          locale={{
            emptyText: 'There is no discharge history to show.'
          }}
        />
      </div>
    </>
  );
};

export default BedPatientHistory;