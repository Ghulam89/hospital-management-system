import React, { useEffect, useState, useCallback } from 'react';
import { Table, message, Input, Button, Pagination, Col, Row, Card, Select, Tag, Spin } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment';
import { RiDeleteBin5Line, RiEdit2Fill, RiFileExcel2Line, RiPrinterLine } from 'react-icons/ri';
import { Base_url } from '../../utils/Base_url';
import Header from '../../components/Header';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import * as XLSX from 'xlsx';
import { useReactToPrint } from 'react-to-print';
import EditAppointment from '../Appointments/EditAppointment';

const { Option } = Select;

interface Appointment {
  _id: string;
  doctorId?: {
    _id?: string;
    name?: string;
  };
  patientId?: {
    _id?: string;
    name?: string;
    phone?: string;
  };
  appointmentDate: string;
  startTime?: string;
  endTime?: string;
  appointmentStatus?: string;
  consultationType?: string;
}

const AllAppointments = () => {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  
  const [editModalOpen, setEditModalOpen] = useState(false);
const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Enhanced filter state
  const [filters, setFilters] = useState({
    dateRange: [moment().subtract(1, 'month'), moment()],
    status: '',
    doctorId: '',
    consultationType: '',
    searchText: '',
    mr:'',
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

  const fetchAppointments = useCallback(() => {
    setLoading(true);
    
    // Build query parameters for server-side pagination and filtering
    const params = new URLSearchParams({
      page: currentPage.toString(),
      limit: pageSize.toString(),
    });

    // Add search parameter if provided
   // Add search parameters if provided
  if (filters.searchText.trim()) {
    // Check if search text matches MR number pattern (e.g., MR-12345)
    if (/^\d+/i.test(filters.searchText.trim())) {
      params.append('mr', filters.searchText.trim());
    } else {
      // Otherwise search by patient name or phone
      params.append('search', filters.searchText.trim());
    }
  }


    // Add status filter
    if (filters.status) {
      params.append('status', filters.status);
    }
    

    // Add doctor filter
    if (filters.doctorId) {
      params.append('doctorId', filters.doctorId);
    }

    // Add consultation type filter
    if (filters.consultationType) {
      params.append('consultationType', filters.consultationType);
    }

    // Add date range parameters if provided
    if (filters.dateRange[0]) {
      params.append('startDate', filters.dateRange[0].format('YYYY-MM-DD'));
    }
    if (filters.dateRange[1]) {
      params.append('endDate', filters.dateRange[1].format('YYYY-MM-DD'));
    }

    axios.get(`${Base_url}/apis/appointment/get?${params.toString()}`)
      .then((res) => {
        const responseData = res?.data?.data || [];
        const responseTotal = res?.data?.total || responseData.length;
        
        setAppointments(responseData);
        setTotal(responseTotal);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching appointments:', err);
        message.error('Failed to fetch appointments');
        setLoading(false);
      });
  }, [currentPage, pageSize, filters]);

  useEffect(() => {
    fetchDoctors();
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (doctors.length > 0 && departments.length > 0) {
      fetchAppointments();
    }
  }, [fetchAppointments, doctors, departments]);

  const handleEdit = (record) => {
  setSelectedAppointment(record);
  setEditModalOpen(true);
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

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setCurrentPage(1); // Reset to first page on filter change
  };

  // Date change handler
  const handleDateChange = (value, idx) => {
    const newRange = [...filters.dateRange];
    newRange[idx] = value ? moment(value) : null;
    // Ensure end is not before start
    if (idx === 0 && newRange[1] && value && moment(value).isAfter(newRange[1])) {
      newRange[1] = moment(value);
    }
    if (idx === 1 && newRange[0] && value && moment(value).isBefore(newRange[0])) {
      newRange[0] = moment(value);
    }
    setFilters(prev => ({
      ...prev,
      dateRange: newRange
    }));
    setCurrentPage(1);
  };

  const handleApplyFilters = () => {
    fetchAppointments();
  };

  const handleResetFilters = () => {
    setFilters({
      dateRange: [moment().subtract(1, 'month'), moment()],
      status: '',
      doctorId: '',
      consultationType: '',
      searchText: ''
    });
    setCurrentPage(1);
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

  const handleExportExcel = () => {
    // For export, we need to fetch all data without pagination
    setLoading(true);
    
    const exportParams = new URLSearchParams();
    if (filters.searchText.trim()) {
      exportParams.append('search', filters.searchText.trim());
    }
    if (filters.status) {
      exportParams.append('status', filters.status);
    }
    if (filters.doctorId) {
      exportParams.append('doctorId', filters.doctorId);
    }
    if (filters.consultationType) {
      exportParams.append('consultationType', filters.consultationType);
    }
    if (filters.dateRange[0]) {
      exportParams.append('startDate', filters.dateRange[0].format('YYYY-MM-DD'));
    }
    if (filters.dateRange[1]) {
      exportParams.append('endDate', filters.dateRange[1].format('YYYY-MM-DD'));
    }

    axios.get(`${Base_url}/apis/appointment/get?${exportParams.toString()}`)
      .then((res) => {
        const allAppointments = res?.data?.data || [];
        const dataToExport = allAppointments.map((item: Appointment) => ({
          'Doctor Name': item.doctorId?.name || '',
          'Patient Name': item.patientId?.name || '',
          'Phone': item.patientId?.phone || '',
          'Appointment Date': moment(item.appointmentDate).format('DD/MM/YYYY'),
          'Time Slot': `${item.startTime} - ${item.endTime}`,
          'Status': item.appointmentStatus || '',
          'Consultation Type': item.consultationType || '',
        }));
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Appointments');
        XLSX.writeFile(wb, 'appointments.xlsx');
        setLoading(false);
      })
      .catch(err => {
        message.error('Failed to export appointments');
        setLoading(false);
      });
  };

  const columns = [
    {
      title: 'Doctor Name',
      dataIndex: ['doctorId', 'name'],
      key: 'doctorName',
      width: 150,
    },
    
    {
      title: 'Patient MR',
      dataIndex: ['patientId', 'mr'],
      key: 'PatientMR',
      width: 150,
     
    },
     {
      title: 'Patient Name',
      dataIndex: ['patientId', 'name'],
      key: 'patientName',
      width: 150,
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
      width: 120,
    },
    {
      title: 'Appointment Date',
      dataIndex: 'appointmentDate',
      render: (text) =>moment(text).utc().format('DD/MM/YYYY'),
      key: 'date',
      width: 120,
      sorter: (a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate),
    },
    {
      title: 'Time Slot',
      render: (record) => `${record.startTime} - ${record.endTime}`,
      key: 'time',
      width: 150,
    },
    {
      title: 'Status',
      dataIndex: 'appointmentStatus',
      key: 'status',
      width: 120,
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {status ? status.toUpperCase() : 'N/A'}
        </Tag>
      ),
    },
    {
      title: 'Consultation Type',
      dataIndex: 'consultationType',
      key: 'consultationType',
      width: 120,
      render: (type) => type || 'In-person',
    },
    {
      title: 'Action',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <div className='flex items-center gap-2'>
             <RiEdit2Fill 
        className=' text-primary' 
        size={20} 
        onClick={() => handleEdit(record)} 
        style={{ cursor: 'pointer' }}
      />
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
            <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default sm:px-7.5 xl:pb-1">
      <Spin spinning={loading}>
        <div className="mb-5">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-semibold text-black">Appointments</h1>
            <div className="flex gap-2">
              <Button 
                type="default" 
                icon={<RiFileExcel2Line />} 
                onClick={handleExportExcel}
                className="flex items-center"
              >
                Export Excel
              </Button>
              <Button 
                type="default" 
                icon={<RiPrinterLine />} 
                onClick={useReactToPrint({
                  content: () => document.querySelector('.appointments-table'),
                  pageStyle: `
                    @page { size: auto; margin: 10mm; }
                    @media print {
                      body { -webkit-print-color-adjust: exact; }
                      table { width: 100%; border-collapse: collapse; }
                      th { background-color: #f0f0f0 !important; }
                      td, th { border: 1px solid #ddd; padding: 8px; }
                    }
                  `,
                  documentTitle: `Appointments_${moment().format('YYYYMMDD_HHmmss')}`
                })}
                className="flex items-center"
              >
                Print
              </Button>
            </div>
          </div>
          
          {/* Filters Section */}
          <Card title="Filters" className="mb-4">
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={8} lg={6}>
                <Input 
                  placeholder="Search by MR, patient, phone" 
                  value={filters.searchText}
                  onChange={(e) => handleFilterChange('searchText', e.target.value)}
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
                    Consultation Type
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
        
        <div className="appointments-table">
          <Table 
            rowKey="_id"
            rowSelection={rowSelection}
            columns={columns}
            dataSource={appointments}
            loading={loading}
            pagination={false}
            scroll={{ x: 1200 }}
            bordered
            size="middle"
            locale={{
              emptyText: 'No appointments found'
            }}
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
              showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} items`}
              className="mt-4"
            />
          </div>
        </div>
      </Spin>
    </div>

    <EditAppointment
            isModalOpen={editModalOpen}
            setIsModalOpen={setEditModalOpen}
            selectedAppointment={selectedAppointment}
fetchAppointmentData={fetchAppointments}     

doctors={doctors}
          />
   </div>
   </>
  );
};

export default AllAppointments;