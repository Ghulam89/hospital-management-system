import React, { useEffect, useState } from 'react';
import { Table, Button, message, DatePicker, Space } from 'antd';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { RiDeleteBin5Line, RiFile2Line } from 'react-icons/ri';

import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import logoDataUrl from '../../../images/logo-icon.png';
import moment from 'moment';
import {
    PDFDownloadLink,
    Document,
    Page,
    View,
    Image,
    Text,
    StyleSheet,
    pdf,
  } from '@react-pdf/renderer';
const { RangePicker } = DatePicker;

const columns = (handleDelete,handleDownload) => [
    {
        title: 'SERIAL#',
        dataIndex: 'serialNumber',
        key: 'serialNumber',
        // If you don't have serialNumber in data, use index instead
        render: (text, record, index) => index + 1,
      },
      {
        title: 'PATIENT NAME',
        dataIndex: ['patientId', 'name'], // Better way to access nested property
        key: 'patientName',
      },
      {
        title: 'FATHER NAME',
        dataIndex: 'fatherName',
        key: 'fatherName',
        render: (text) => text || 'N/A', // Handle empty values
      },
      {
        title: 'CREATED AT',
        dataIndex: 'createdAt',
        key: 'createdAt',
        render: (text) => text ? moment(text).format('DD/MM/YYYY') : 'N/A',
      },
  {
    title: 'ACTIONS',
    key: 'actions',
    render: (_, record) => (
        <Space size="middle">
       
         <RiFile2Line 
                          className="text-red-500 text-xl cursor-pointer" 
                          onClick={() => handleDownload(record)} 
                        />
        <RiDeleteBin5Line 
          color='red' 
          size={20} 
          onClick={() => handleDelete(record.key)} 
          style={{ cursor: 'pointer' }}
        />
      </Space>
    ),
  },
];

const DeathCertificates = () => {
  const [birthCertificates, setBirthCertificates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  const fetchBirthCertificates = async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pageSize,
      };

      // Add date range if selected
      if (dateRange.length === 2) {
        params.startDate = moment(dateRange[0]).startOf('day').toISOString();
        params.endDate = moment(dateRange[1]).endOf('day').toISOString();
      }
      
      const res = await axios.get('https://api.holisticare.pk/apis/deathCertificate/get', { params });
      
      const formattedData = res.data.data.map(item => ({
        ...item,
        key: item._id,
      }));
      
      setBirthCertificates(formattedData);
      setPagination({
        ...pagination,
        current: res.data.currentPage,
        total: res.data.count,
        pageSize: parseInt(res.data.limit),
      });
    } catch (error) {
      message.error('Failed to fetch birth certificates');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBirthCertificates(pagination.current, pagination.pageSize);
  }, [pagination.current, pagination.pageSize, dateRange]);

  const handleDelete = (id) => {
    axios.delete(`https://api.holisticare.pk/apis/deathCertificate/delete/${id}`)
      .then(() => {
        message.success('Birth certificate deleted successfully');
        fetchBirthCertificates(pagination.current, pagination.pageSize);
      })
      .catch(err => {
        message.error('Failed to delete birth certificate');
        console.error(err);
      });
  };

  const handleDateChange = (dates) => {
    setDateRange(dates);
    setPagination(prev => ({ ...prev, current: 1 })); // Reset to first page when date changes
  };

  const handleTableChange = (newPagination) => {
    setPagination(newPagination);
  };


  const DeathCertificatePdf = ({ certificate }) => (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.Mainpage}>
        <View style={styles.header}>
            <View>
                  <Image src={logoDataUrl} style={styles.logo} />
            </View>
          <View>
          <Text style={styles.clinicName}>Health Care Clinic</Text>
          <Text style={styles.clinicAddress}>1887 Block Phase III, DHA, Lahore, Punjab, Pakistan</Text>
          <Text style={styles.clinicPhone}>0424-4211888</Text>
          </View>
        </View>
  
        <View style={styles.divider} />
  
        <Text style={styles.title}>Death Certificate</Text>
  
        <View style={styles.content}>
          <View style={styles.row}>
            <Text style={styles.label}>Patient:</Text>
            <Text style={styles.value}>{certificate.patientId?.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Father Name:</Text>
            <Text style={styles.value}>{certificate.fatherName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Date of Birth:</Text>
            <Text style={styles.value}>{certificate.dob}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Address:</Text>
            <Text style={styles.value}>{certificate.address}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Date of Admission:</Text>
            <Text style={styles.value}>{certificate.dateofAdmission}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Guardian/Attendant:</Text>
            <Text style={styles.value}>{certificate.guardName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Phone of Guardian:</Text>
            <Text style={styles.value}>{certificate.phone}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>NIC of Guardian:</Text>
            <Text style={styles.value}>{certificate.guardNic}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Doctor On Duty:</Text>
            <Text style={styles.value}>{certificate.doctorId?.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Age:</Text>
            <Text style={styles.value}>{certificate.ageDays}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Gender:</Text>
            <Text style={styles.value}>{certificate.gender}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Date of Death:</Text>
            <Text style={styles.value}>{certificate.dod}</Text>
          </View>
         
        </View>
  
        <View style={styles.footer}>
          <View style={styles.signatureRow}>
            <Text style={styles.label}>Cause of Death:</Text>
            <Text style={styles.value}>{certificate.causeOfDeath}</Text>
          </View>
          <View style={styles.signatureRow}>
            <Text style={styles.label}>Doctor's Signature:</Text>
            <Text style={styles.value}>_________________</Text>
          </View>
        </View>
        </View>
      </Page>
    </Document>
  );

  const styles = StyleSheet.create({
    page: {
      padding: 20,
      fontFamily: 'Helvetica',
      borderWidth:1,
      borderColor:'#000',

    },
    Mainpage:{
     borderWidth:1,
     borderColor:'#000',
     padding:20,
    },
    logo: {
        width: 60,
        height: 100,
      },
    header: {
      textAlign: 'center',
      marginBottom: 20,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    clinicName: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 5,
    },
    clinicAddress: {
      fontSize: 12,
      marginBottom: 5,
    },
    clinicPhone: {
      fontSize: 12,
      marginBottom: 10,
    },
    divider: {
      borderBottomWidth: 1,
      borderBottomColor: '#000',
      marginBottom: 20,
    },
    title: {
      fontSize: 16,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 20,
      textDecoration: 'underline',
    },
    content: {
      marginBottom: 40,
    },
    row: {
      flexDirection: 'row',
      marginBottom: 10,
    },
    label: {
      width: 150,
      fontWeight: 'bold',
      fontSize: 12,
    },
    value: {
      flex: 1,
      fontSize: 12,
    },
    footer: {
      marginTop: 60,
       flexDirection: 'row',
       justifyContent:'space-between',
       alignItems:'center'
    },
    signatureRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 30,
      width: '50%',
    },
  });
  



  const handleDownload = async (certificate) => {
    console.log('Certificate data:', certificate); // Verify certificate data
    
    try {
      // 1. Generate the PDF
      const blob = await pdf(<DeathCertificatePdf certificate={certificate} />).toBlob();
      const pdfUrl = URL.createObjectURL(blob);
  
      // 2. Create a more reliable download method
      const downloadPdf = () => {
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = `Death_Certificate_${certificate.patientId?.name || 'unknown'}.pdf`;
        document.body.appendChild(link);
        
        // Trigger the download
        link.click();
        
        // Clean up
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(pdfUrl);
        }, 100);
      };
  
      // 3. Try to open in new tab first, with fallback to download
      try {
        const newWindow = window.open('', '_blank');
        if (newWindow) {
          newWindow.location.href = pdfUrl;
          
          // Add a fallback in case the PDF doesn't load
          setTimeout(() => {
            if (newWindow.closed || newWindow.document.readyState === 'complete') {
              // If the window is closed or loaded, don't do anything
              return;
            }
            // If PDF didn't load properly, trigger download
            newWindow.close();
            downloadPdf();
          }, 2000);
        } else {
          // If popup was blocked, trigger download directly
          downloadPdf();
        }
      } catch (error) {
        console.error('Error opening new tab:', error);
        downloadPdf();
      }
  
    } catch (error) {
      console.error('PDF generation failed:', error);
      message.error('Failed to generate PDF. Please try again.');
      
      // Additional error handling
      if (error.message.includes('Failed to execute')) {
        message.warning('Popup was blocked. Please allow popups for this site.');
      }
    }
  };

  return (
    <>
      <Breadcrumb pageName="Death Certificates" />
      
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-500">
          Data 
        </div>
        
        <Link
          to="/death-reports/new"
          className="inline-flex items-center justify-center gap-2.5 rounded-md bg-primary py-3 px-6 text-center font-medium text-white hover:bg-opacity-90"
        >
          + Add Death Certificate
        </Link>
      </div>

      {/* Date Range Filter */}
      <div className="mb-4">
        <RangePicker 
          onChange={handleDateChange}
          style={{ width: '100%', maxWidth: '300px' }}
        />
      </div>

      <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
        <Table
  columns={columns(handleDelete, handleDownload)}
          dataSource={birthCertificates}
          loading={loading}
          pagination={pagination}
          onChange={handleTableChange}
          locale={{
            emptyText: 'There is no birth certificate to show.'
          }}
        />
      </div>
    </>
  );
};

export default DeathCertificates;