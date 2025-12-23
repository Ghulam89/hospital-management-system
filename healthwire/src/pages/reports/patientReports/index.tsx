import React, { useEffect, useState, useRef } from 'react';
import { Table, DatePicker, Select, Input, Button, message, Col } from 'antd';
import axios from 'axios';
import moment from 'moment';
import {
  RiDeleteBin5Line,
  RiFileExcel2Line,
  RiPrinterLine,
} from 'react-icons/ri';
import { Base_url } from '../../../utils/Base_url';

import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import * as XLSX from 'xlsx';
import { useReactToPrint } from 'react-to-print';
import { Link } from 'react-router-dom';

const { Option } = Select;

const PatientReports = () => {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filteredPatients, setFilteredPatients] = useState<any[]>([]);
  const tableRef = useRef<HTMLDivElement>(null);
  
  // Add pagination state
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });

 const [filters, setFilters] = useState({
  startDate: moment().subtract(1, 'month'),
  endDate: moment(),
  ageRange: '',
  name: '',
  mr: '',
  phone: '',
  cnic: '',
  searchDob: '',
  searchAge: '',
  gender: '',
  dateRange: [moment().subtract(1, 'month'), moment()],
});

  const fetchPatients = (page = 1, pageSize = 20) => {
    setLoading(true);

    const queryParams = new URLSearchParams();

    // Add pagination parameters
    queryParams.append('page', page.toString());
    queryParams.append('limit', pageSize.toString());

    // Add separate search parameters if provided
    if (filters.name.trim()) {
      queryParams.append('name', filters.name.trim());
    }
    if (filters.mr.trim()) {
      queryParams.append('mr', filters.mr.trim());
    }
    if (filters.phone.trim()) {
      queryParams.append('phone', filters.phone.trim());
    }
    if (filters.cnic.trim()) {
      queryParams.append('cnic', filters.cnic.trim());
    }

    if (filters.searchDob) queryParams.append('dob', filters.searchDob);
    if (filters.searchAge) queryParams.append('age', filters.searchAge);
    if (filters.gender) queryParams.append('gender', filters.gender);
    if (filters.startDate)
      queryParams.append('fromDate', filters.startDate.format('YYYY-MM-DD'));
    if (filters.endDate)
      queryParams.append('toDate', filters.endDate.format('YYYY-MM-DD'));

    console.log('API URL:', `${Base_url}/apis/patient/get?${queryParams.toString()}`);

    axios
      .get(`${Base_url}/apis/patient/get?${queryParams.toString()}`)
      .then((res) => {
        const responseData = res?.data;
        const data = responseData?.data || [];
        
        console.log('API Response:', responseData);
        
        // Update pagination state
        setPagination({
          current: responseData?.currentPage || 1,
          pageSize: responseData?.limit || 20,
          total: responseData?.count || 0,
          totalPages: responseData?.totalPages || 0,
        });
        
        // Apply age filter on frontend
        let filteredData = data;
        if (filters.ageRange && filters.ageRange !== '') {
          filteredData = data.filter((patient) => {
            const age = patient.dob
              ? moment().diff(moment(patient.dob), 'years')
              : 0;
            if (filters.ageRange.endsWith('+')) {
              return age >= parseInt(filters.ageRange);
            }
            const [min, max] = filters.ageRange.split('-').map(Number);
            return age >= min && age <= max;
          });
        }

        setPatients(data);
        setFilteredPatients(filteredData);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Patient fetch error:', err);
        message.error('Failed to fetch patients');
        setLoading(false);
      });
  };

  // Handle pagination change
  const handleTableChange = (paginationInfo: any) => {
    console.log('Pagination change:', paginationInfo);
    const { current, pageSize } = paginationInfo;
    setPagination(prev => ({
      ...prev,
      current,
      pageSize,
    }));
    fetchPatients(current, pageSize);
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    // Reset to first page when filters change
    setPagination(prev => ({
      ...prev,
      current: 1,
    }));
  };

  // Handle date range changes
  const handleDateChange = (date, index) => {
    const newDateRange = [...filters.dateRange];
    newDateRange[index] = moment(date);
    setFilters(prev => ({
      ...prev,
      dateRange: newDateRange,
      startDate: newDateRange[0],
      endDate: newDateRange[1]
    }));
    // Reset to first page when date changes
    setPagination(prev => ({
      ...prev,
      current: 1,
    }));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPatients(pagination.current, pagination.pageSize);
    }, 500); // Add slight delay to avoid too many requests while typing
    
    return () => clearTimeout(timer);
  }, [filters]); // Fetch whenever filters change

  // Initial fetch on component mount
  useEffect(() => {
    fetchPatients(1, 20);
  }, []); // Empty dependency array for initial load

  const handleDelete = (id) => {
    axios
      .delete(`${Base_url}/apis/patient/delete/${id}`)
      .then((res) => {
        message.success('Patient deleted successfully');
        fetchPatients();
      })
      .catch((err) => {
        message.error('Failed to delete patient');
      });
  };

  const exportToExcel = () => {
    if (filteredPatients.length === 0) {
      message.warning('No data to export. Please apply filters or check your search criteria.');
      return;
    }

    // Prepare data for export with better formatting
    const exportData = filteredPatients.map((patient: any) => ({
      'MR Number': patient.mr || '-',
      'Patient Name': patient.name || '-',
      'Phone Number': patient.phone || '-',
      'Email Address': patient.email || '-',
      'Gender': patient.gender || '-',
      'Age': patient.dob ? moment().diff(moment(patient.dob), 'years') : '-',
      'Patient Type': patient.patientType || 'General',
      'Date of Birth': patient.dob ? moment(patient.dob).format('DD/MM/YYYY') : '-',
      'Created Date': moment(patient.createdAt).format('DD/MM/YYYY'),
      'Created Time': moment(patient.createdAt).format('hh:mm A'),
      'Address': patient.address || '-',
      'Tag': patient.tag || '-',
      'Blood Group': patient.bloodGroup || '-',
      'Emergency Contact': patient.emergencyContact || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);

    // Set column widths for better readability
    const columnWidths = [
      { wch: 12 }, // MR Number
      { wch: 25 }, // Patient Name
      { wch: 15 }, // Phone Number
      { wch: 25 }, // Email Address
      { wch: 10 }, // Gender
      { wch: 8 },  // Age
      { wch: 15 }, // Patient Type
      { wch: 12 }, // Date of Birth
      { wch: 12 }, // Created Date
      { wch: 10 }, // Created Time
      { wch: 30 }, // Address
      { wch: 15 }, // Tag
      { wch: 12 }, // Blood Group
      { wch: 20 }, // Emergency Contact
    ];
    ws['!cols'] = columnWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Patient Report');
    
    // Generate filename with current date and time
    const fileName = `Patient_Report_${moment().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    message.success(`Excel file exported successfully! ${exportData.length} patients exported.`);
  };

  const handlePrint = useReactToPrint({
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
    documentTitle: `Patient_Report_${moment().format('YYYYMMDD_HHmmss')}`,
  } as any);

  const columns = [
    {
      title: 'MR#',
      dataIndex: 'mr',
      key: 'mr',
    },
   
    {
      title: 'PATIENT NAME',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (text: any, record: any) => {
        return (
          <Link to={`/details-patients/${record?._id}`}>
            {text}
          </Link>
        );
      },
    },
    {
      title: 'PHONE',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: 'EMAIL',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'GENDER',
      dataIndex: 'gender',
      key: 'gender',
    },
    {
      title: 'AGE',
      dataIndex: 'dob',
      key: 'age',
      render: (dob: any) => (dob ? moment().diff(moment(dob), 'years') : '-'),
    },
    {
      title: 'PATIENT TYPE',
      dataIndex: 'patientType',
      key: 'patientType',
      render: (text: any) => text || 'General',
    },
    {
      title: 'CREATED AT',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: any) => moment(text).format('DD/MM/YYYY - hh:mmA'),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: any) => (
        <RiDeleteBin5Line
          color="red"
          size={20}
          onClick={() => handleDelete(record._id)}
          style={{ cursor: 'pointer' }}
        />
      ),
    },
  ];

  return (
    <>
      <div className="">
        <Breadcrumb pageName="Patient Reports" />
        <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default sm:px-7.5 xl:pb-1">
          <div className="mb-5">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-xl font-semibold text-black">
                Patient Reports
              </h1>
              <div className="flex gap-2">
                <Button
                  type="default"
                  icon={<RiFileExcel2Line />}
                  onClick={exportToExcel}
                >
                  Export Excel
                </Button>
                <Button
                  type="default"
                  icon={<RiPrinterLine />}
                  onClick={handlePrint}
                >
                  Print
                </Button>
              </div>
            </div>

            {/* Filters Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div>
                <Input
                  placeholder="Search by Name"
                  value={filters.name}
                  onChange={(e) =>
                    handleFilterChange('name', e.target.value)
                  }
                  allowClear
                  style={{ width: '100%', color: '#000' }}
                />
              </div>

              <div>
                <Input
                  placeholder="Search by MR Number"
                  value={filters.mr}
                  onChange={(e) =>
                    handleFilterChange('mr', e.target.value)
                  }
                  allowClear
                  style={{ width: '100%', color: '#000' }}
                />
              </div>

              <div>
                <Input
                  placeholder="Search by Phone"
                  value={filters.phone}
                  onChange={(e) =>
                    handleFilterChange('phone', e.target.value)
                  }
                  allowClear
                  style={{ width: '100%', color: '#000' }}
                />
              </div>

              <div>
                <Input
                  placeholder="Search by CNIC"
                  value={filters.cnic}
                  onChange={(e) =>
                    handleFilterChange('cnic', e.target.value)
                  }
                  allowClear
                  style={{ width: '100%', color: '#000' }}
                />
              </div>

              <div>
                <DatePicker
                  placeholder="Date of Birth"
                  style={{ width: '100%' }}
                  value={filters.searchDob ? moment(filters.searchDob) : null}
                  onChange={(date, dateString) =>
                    handleFilterChange('searchDob', dateString)
                  }
                />
              </div>

    <div className=' col-span-2'>
  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
    <Input
      type="date"
      value={filters.dateRange[0]?.format('YYYY-MM-DD') || ''}
      onChange={(e) => handleDateChange(e.target.value, 0)}
      style={{ flex: 1 }}
      max={moment().format('YYYY-MM-DD')}
    />
    <span>to</span>
    <Input
      type="date"
      value={filters.dateRange[1]?.format('YYYY-MM-DD') || ''}
      onChange={(e) => handleDateChange(e.target.value, 1)}
      style={{ flex: 1 }}
      min={filters.dateRange[0]?.format('YYYY-MM-DD')}
      max={moment().format('YYYY-MM-DD')}
    />
  </div>
</div>

              <div>
                <Select
                  placeholder="Select Gender"
                  style={{ width: '100%' }}
                  value={filters.gender}
                  onChange={(value) => handleFilterChange('gender', value)}
                  allowClear
                >
                  <Option value="">All</Option>
                  <Option value="Male">Male</Option>
                  <Option value="Female">Female</Option>
                  <Option value="Other">Other</Option>
                </Select>
              </div>

              <div>
                <Select
                  placeholder="Select Age Range"
                  style={{ width: '100%' }}
                  value={filters.ageRange}
                  onChange={(value) => handleFilterChange('ageRange', value)}
                  allowClear
                >
                  <Option value="">All Ages</Option>
                  <Option value="0-18">0-18 years</Option>
                  <Option value="19-30">19-30 years</Option>
                  <Option value="31-45">31-45 years</Option>
                  <Option value="46-60">46-60 years</Option>
                  <Option value="60+">60+ years</Option>
                </Select>
              </div>

              <div>
                <Button
                  onClick={() => {
                    setFilters({
                      startDate: moment().subtract(1, 'month'),
                      endDate: moment(),
                      ageRange: '',
                      name: '',
                      mr: '',
                      phone: '',
                      cnic: '',
                      searchDob: '',
                      searchAge: '',
                      gender: '',
                      dateRange: [moment().subtract(1, 'month'), moment()],
                    });
                    // Reset pagination to first page
                    setPagination(prev => ({
                      ...prev,
                      current: 1,
                    }));
                  }}
                >
                  Reset Filters
                </Button>
              </div>
            </div>
          </div>

          <div ref={tableRef}>
            <Table
              rowKey="_id"
              columns={columns}
              dataSource={filteredPatients}
              loading={loading}
              scroll={{ x: true }}
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                total: pagination.total,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `Showing ${range[0]}-${range[1]} of ${total} patients`,
                pageSizeOptions: ['10', '20', '50', '100'],
                onChange: handleTableChange,
                onShowSizeChange: handleTableChange,
              }}
            />
          </div>
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

export default PatientReports;