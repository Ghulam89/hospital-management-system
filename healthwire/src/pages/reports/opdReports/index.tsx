import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Table, DatePicker, Select, Input, Button, message, Card, Row, Col, Tag, Spin, Pagination } from 'antd';
// const { RangePicker } = DatePicker;
import axios from 'axios';
import moment from 'moment';
import { RiFileExcel2Line, RiPrinterLine } from 'react-icons/ri';
import { Base_url } from '../../../utils/Base_url';
import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import * as XLSX from 'xlsx';
import { useReactToPrint } from 'react-to-print';
import { Link } from 'react-router-dom';
const { RangePicker } = DatePicker;

const { Option } = Select;

const OpdReports = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 25,
    total: 0,
    totalPages: 0
  });
  const tableRef = useRef();
  
  const [filters, setFilters] = useState({
    dateRange: [moment().startOf('day'), moment().endOf('day')],
    status: '',
    doctorId: '',
    searchMR: '',
    consultationType: ''
  });

  // Fetch doctors list
  const fetchDoctors = async () => {
    try {
      const response = await axios.get(`${Base_url}/apis/user/get?role=doctor`);
      setDoctors(response.data.data || []);
    } catch (error) {
      message.error('Failed to fetch doctors list');
    }
  };

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      const response = await axios.get(`${Base_url}/apis/department/get`);
      setDepartments(response.data.data || []);
    } catch (error) {
      message.error('Failed to fetch departments');
    }
  };

  const fetchAppointments = useCallback(async (page = 1, pageSize = pagination.pageSize) => {
    setLoading(true);
    try {
      // Build query parameters like AllAppointments does
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      });

      // Add search parameters
      if (filters.searchMR) {
        params.append('mr', filters.searchMR);
      }
      if (filters.status) {
        params.append('status', filters.status);
      }
      if (filters.doctorId) {
        params.append('doctorId', filters.doctorId);
      }
      if (filters.consultationType) {
        params.append('consultationType', filters.consultationType);
      }
      
      // Add date range params using the same format as AllAppointments
      if (filters.dateRange && filters.dateRange[0] && filters.dateRange[1]) {
        params.append('startDate', filters.dateRange[0].format('YYYY-MM-DD'));
        params.append('endDate', filters.dateRange[1].format('YYYY-MM-DD'));
      }

      // Debug: Log all parameters being sent
      console.log('API Parameters being sent:', params.toString());
      
      const response = await axios.get(`${Base_url}/apis/appointment/get?${params.toString()}`);
      const data = response?.data?.data || [];
      const responseData = response?.data || {};

      // Debug logging to see what we're getting from backend
      console.log('Backend Response:', {
        status: responseData.status,
        total: responseData.total,
        page: responseData.page,
        totalPages: responseData.totalPages,
        dataLength: data.length,
        data: data.slice(0, 3) // Show first 3 records for debugging
      });

      // Update pagination state with backend data
      setPagination(prev => ({
        ...prev,
        current: responseData.page || 1,
        total: responseData.total || 0,
        totalPages: responseData.totalPages || 0,
        pageSize: pageSize
      }));

      // Check if data is empty but total is not zero
      if (data.length === 0 && responseData.total > 0) {
        console.warn('Warning: Backend returned total:', responseData.total, 'but data array is empty');
        message.warning('No data found for the selected filters. Please check your date range or filters.');
      }

      const transformedData = data.map((appointment: any, index: number) => ({
        key: appointment._id,
        srNumber: ((responseData.page || 1) - 1) * pageSize + index + 1,
        mr: appointment.patientId?.mr || 'N/A',
        patientId: appointment.patientId?._id || 'N/A',
        patientName: appointment.patientId?.name || 'N/A',
        patientPhone: appointment.patientId?.phone || 'N/A',
        patientDob:moment(appointment.patientId.dob) ? moment(appointment.patientId.dob).format('DD/MM/YYYY') : 'N/A' ,
        patientGender: appointment.patientId?.gender || 'N/A',
        doctorName: appointment.doctorId?.name || 'N/A',
        department: departments.find(d => d._id === appointment.doctorId?.departmentId)?.name || 'N/A',
        procedure: appointment.consultationType || 'Consultation',
        date: appointment.appointmentDate,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        status: appointment.appointmentStatus,
        isRecurring: appointment.isRecurring ? 'Yes' : 'No',
        originalData: appointment
      }));
      
      console.log('Transformed data length:', transformedData.length);
      setAppointments(transformedData);
    } catch (err) {
      message.error('Failed to fetch appointments');
      console.error('Appointment fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, departments]);

  useEffect(() => {
    fetchDoctors();
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (doctors.length > 0 && departments.length > 0) {
      fetchAppointments();
    }
  }, [fetchAppointments, doctors, departments]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

     const handleDateChange = (date, index) => {
    const newDateRange = [...filters.dateRange];
    
    // Convert string date to moment object if it's a string
    if (typeof date === 'string') {
      newDateRange[index] = moment(date);
    } else {
      newDateRange[index] = date;
    }
    
    // Ensure we always have valid dates
    if (!newDateRange[0] || !newDateRange[1]) {
      setFilters(prev => ({
        ...prev,
        dateRange: newDateRange
      }));
      return;
    }

    // Swap dates if end date is before start date
    if (moment(newDateRange[0]).isAfter(moment(newDateRange[1]))) {
      if (index === 0) {
        newDateRange[1] = newDateRange[0];
      } else {
        newDateRange[0] = newDateRange[1];
      }
    }

    setFilters(prev => ({
      ...prev,
      dateRange: [
        moment(newDateRange[0]).startOf('day'),
        moment(newDateRange[1]).endOf('day')
      ]
    }));
  };

  const handleApplyFilters = () => {
    fetchAppointments(1, pagination.pageSize);
  };

  const handleTableChange = (paginationInfo) => {
    const { current, pageSize } = paginationInfo;
    fetchAppointments(current, pageSize);
  };

  const handleResetFilters = () => {
    setFilters({
      dateRange: [moment().startOf('day'), moment().endOf('day')],
      status: '',
      doctorId: '',
      searchMR: '',
      consultationType: ''
    });
    setPagination({
      current: 1,
      pageSize: 25,
      total: 0,
      totalPages: 0
    });
    fetchAppointments(1, 25);
  };

  const getStatusColor = (status) => {
    if (!status) return 'gray';
    switch (status.toLowerCase()) {
      case 'scheduled': return 'blue';
      case 'checked-in': return 'orange';
      case 'confirmed': return 'purple';
      case 'checked-out': return 'green';
      case 'cancelled': return 'red';
      default: return 'gray';
    }
  };

  const columns = [
    {
      title: 'SR#',
      dataIndex: 'srNumber',
      key: 'srNumber',
      width: 70,
      fixed: 'left'
    },
    {
      title: 'MR#',
      dataIndex: 'mr',
      key: 'mr',
      width: 90
    },
    {
      title: 'PATIENT NAME',
      dataIndex: 'patientName',
      key: 'patientName',
      width: 150,
      render: (text, record) => {
        return (
          <Link to={`/details-patients/${record?.patientId}`}>
            {text}
          </Link>
        );
      },
    },
    
    {
      title: 'PHONE',
      dataIndex: 'patientPhone',
      key: 'patientPhone',
      width: 120
    },
    {
      title: 'GENDER',
      dataIndex: 'patientGender',
      key: 'patientGender',
      width: 80
    },
    //  {
    //   title: 'DATE OF BIRTH',
    //   dataIndex: 'patientDob',
    //   key: 'patientDob',
    //   width: 120
    // },
    {
      title: 'DOCTOR',
      dataIndex: 'doctorName',
      key: 'doctor',
      width: 150
    },
    {
      title: 'DEPARTMENT',
      dataIndex: 'department',
      key: 'department',
      width: 150
    },
    {
      title: 'TYPE',
      dataIndex: 'procedure',
      key: 'procedure',
      width: 120
    },
    {
      title: 'DATE',
      dataIndex: 'date',
      key: 'date',
      render: (date) => date ? moment(date).format('DD/MM/YYYY') : 'N/A',
      width: 120
    },
    {
      title: 'TIME SLOT',
      key: 'timeSlot',
      render: (_, record) => `${record.startTime || 'N/A'} - ${record.endTime || 'N/A'}`,
      width: 150
    },
    {
      title: 'STATUS',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {status ? status.toUpperCase() : 'N/A'}
        </Tag>
      ),
      width: 120
    }
  ];

  // Calculate summary data
  const totalOPD = appointments.length;
  const doctorWithMostOPD = doctors.length > 0 
    ? doctors.reduce((prev, current) => {
        const prevCount = appointments.filter(a => a.originalData.doctorId === prev._id).length;
        const currentCount = appointments.filter(a => a.originalData.doctorId === current._id).length;
        return prevCount > currentCount ? prev : current;
      }, doctors[0])
    : null;

  return (
    <>
      <div className="">
        <Breadcrumb pageName="OPD Report" />
        <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default sm:px-7.5 xl:pb-1">
          <Spin spinning={loading}>
            <div className="mb-5">
              <div className="flex justify-between items-center mb-4">
                <h1 className="text-xl font-semibold text-black">OPD Report</h1>
                <div className="flex gap-2">
                  <Button 
                    type="default" 
                    icon={<RiFileExcel2Line />} 
                    onClick={() => {
                      const ws = XLSX.utils.json_to_sheet(appointments);
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, "OPD Appointments");
                      XLSX.writeFile(wb, `OPD_Report_${moment().format('YYYYMMDD_HHmmss')}.xlsx`);
                    }}
                    className="flex items-center"
                  >
                    Export Excel
                  </Button>
                  <Button 
                    type="default" 
                    icon={<RiPrinterLine />} 
                    onClick={useReactToPrint({
                      content: () => tableRef.current,
                      pageStyle: `
                        @page { size: auto; margin: 10mm; }
                        @media print {
                          body { -webkit-print-color-adjust: exact; }
                          table { width: 100%; border-collapse: collapse; }
                          th { background-color: #f0f0f0 !important; }
                          td, th { border: 1px solid #ddd; padding: 8px; }
                        }
                      `,
                      documentTitle: `OPD_Report_${moment().format('YYYYMMDD_HHmmss')}`
                    })}
                    className="flex items-center"
                  >
                    Print
                  </Button>
                </div>
              </div>
              
              {/* Summary Section */}
              <div className="flex gap-4 mb-4">
                <Card title="Summary" className="flex-1">
                  <div className="flex justify-between">
                    <div>
                      <p className="text-gray-500">Total Appointments</p>
                      <p className="text-2xl font-bold">{pagination?.total}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Busiest Doctor</p>
                      <p className="text-2xl font-bold">
                        {doctorWithMostOPD ? `Dr. ${doctorWithMostOPD.name}` : 'N/A'}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
              
              {/* Filters Section */}
              <Card title="Filters" className="mb-4">
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12} md={8} lg={6}>
                    <Input 
                      placeholder="Search by Patient MR#" 
                      value={filters.searchMR}
                      onChange={(e) => handleFilterChange('searchMR', e.target.value)}
                      allowClear
                    />
                  </Col>
                  <Col xs={24} sm={12} md={8} lg={6}>
                    <Select
  placeholder="Search for a doctor..."
                      style={{ width: '100%' }}
                      value={filters.doctorId}
                      onChange={(value) => handleFilterChange('doctorId', value)}
                      showSearch
                      optionFilterProp="children"
                      filterOption={(input, option) =>
                        option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                      }
                      allowClear
                    >
                       <Option 
    value="" 
    disabled
    style={{ 
      color: 'gray',
      fontStyle: 'italic',
      padding: '8px 12px',
      backgroundColor: '#fafafa'
    }}
  >
    Type to search for a doctor...
  </Option>
                      {doctors.map(doctor => (
                        <Option key={doctor._id} value={doctor._id}>
                          {doctor.name}
                        </Option>
                      ))}
                    </Select>
                  </Col>
                  
                  <Col xs={24} sm={12} md={8} lg={6}>
                    <Select
                      placeholder="Select Status"
                      style={{ width: '100%' }}
                      value={filters.status}
                      onChange={(value) => handleFilterChange('status', value)}
                      allowClear
                    >
                                          <Option 
    value="" 
    disabled
    style={{ 
      color: 'gray',
      fontStyle: 'italic',
      padding: '8px 12px',
      backgroundColor: '#fafafa'
    }}
  >
    Select Status...
  </Option>
                      <Option value="Scheduled">Scheduled</Option>
  <Option value="checked-in">Checked-in</Option>
  <Option value="confirmed">Confirmed</Option>
  <Option value="checked-out">Checked-out</Option>
  <Option value="cancelled">Cancelled</Option>
                    </Select>
                  </Col>
                  
                  <Col xs={24} sm={12} md={8} lg={6}>
                    <Select
                      placeholder="Consultation Type"
                      style={{ width: '100%' }}
                      value={filters.consultationType}
                      onChange={(value) => handleFilterChange('consultationType', value)}
                      allowClear
                    >
                                                       <Option 
    value="" 
    disabled
    style={{ 
      color: 'gray',
      fontStyle: 'italic',
      padding: '8px 12px',
      backgroundColor: '#fafafa'
    }}
  >
    Cash Type
  </Option>
                      <Option value="Inperson">In-person</Option>
                      <Option value="Online">Online</Option>
                      <Option value="Phone">Phone</Option>
                    </Select>
                  </Col>
                  
                  <Col xs={24} sm={12} md={8} lg={12}>
    <div style={{ display: 'flex', gap: '8px' }}>
      <Input
        type="date"
        value={filters.dateRange[0]?.format('YYYY-MM-DD') || ''}
        onChange={(e) => handleDateChange(e.target.value, 0)}
        style={{ flex: 1 }}
        max={moment().format('YYYY-MM-DD')}
      />
      <span style={{ alignSelf: 'center' }}>to</span>
      <Input
        type="date"
        value={filters.dateRange[1]?.format('YYYY-MM-DD') || ''}
        onChange={(e) => handleDateChange(e.target.value, 1)}
        style={{ flex: 1 }}
        min={filters.dateRange[0]?.format('YYYY-MM-DD')}
        max={moment().format('YYYY-MM-DD')}
      />
    </div>
  </Col>
                  
                  
                  
                  <Col xs={24} className="flex justify-end gap-2">
                    <Button 
                      type="default" 
                      onClick={handleApplyFilters}
                      loading={loading}
                    >
                      Apply Filters
                    </Button>
                    <Button 
                      onClick={handleResetFilters}
                    >
                      Reset
                    </Button>
                  </Col>
                </Row>
              </Card>
            </div>
            
            <div ref={tableRef}>
                             <Table
                 columns={columns}
                 dataSource={appointments}
                 loading={loading}
                 scroll={{ x: 1500 }}
                 pagination={false}
                 bordered
                 size="middle"
                 locale={{
                   emptyText: 'No appointments found'
                 }}
               />
               <div className='flex justify-end py-4'>
                 <Pagination
                   current={pagination.current}
                   pageSize={pagination.pageSize}
                   total={pagination.total}
                   onChange={(page, size) => {
                     fetchAppointments(page, size || pagination.pageSize);
                   }}
                   showSizeChanger
                   showQuickJumper
                   showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} items`}
                   className="mt-4"
                 />
               </div>
            </div>
          </Spin>
        </div>
      </div>
    </>
  );
};

export default OpdReports;