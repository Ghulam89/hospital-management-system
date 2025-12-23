import React, { useEffect, useState } from 'react';
import { Table, Button, message, DatePicker, Space } from 'antd';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { RiDeleteBin5Line, RiFile2Line } from 'react-icons/ri';

import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import moment from 'moment';
import { pdf, Document, Page, View, Text, StyleSheet, Image } from '@react-pdf/renderer';
import logoDataUrl from '../../../images/logo-icon.png';
const { RangePicker } = DatePicker;

const columns = (handleDelete, handleDownload) => [
  {
    title: 'SERIAL#',
    key: 'serial',
    render: (_, __, index) => index + 1,
  },
  {
    title: 'MOTHERS MR',
    dataIndex: 'motherMr',
    key: 'motherMr',
  },
  {
    title: 'BABY NAME',
    dataIndex: 'babyName',
    key: 'babyName',
  },
  {
    title: 'FATHER NAME',
    dataIndex: 'fatherName',
    key: 'fatherName',
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

const BirthCertificates = () => {
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
      
      const res = await axios.get('https://api.holisticare.pk/apis/birthCertificate/get', { params });
      
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
    axios.delete(`https://api.holisticare.pk/apis/birthCertificate/delete/${id}`)
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
    setPagination(prev => ({ ...prev, current: 1 })); 
  };

  const handleTableChange = (newPagination) => {
    setPagination(newPagination);
  };

  const styles = StyleSheet.create({
    page: {
      padding: 20,
      fontFamily: 'Helvetica',
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
    title: {
      fontSize: 16,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 20,
      textDecoration: 'underline',
    },
    clinicInfo: {
      textAlign: 'center',
      marginTop: 30,
      fontSize: 10,
    },
    divider: {
      borderBottomWidth: 1,
      borderBottomColor: '#000',
      marginVertical: 20,
    },
    Mainpage:{
      borderWidth:1,
      borderColor:'#000',
      padding:20,
     },
    row: {
      flexDirection: 'row',
      marginBottom: 8,
    },
    label: {
      width: 200,
      fontWeight: 'bold',
      fontSize: 12,
    },
    label2: {
      width: 150,
      fontWeight: 'bold',
      fontSize: 14,
      flexDirection:'row'
    },
    value: {
      flex: 1,
      fontSize: 12,
    },
    clinicInfo2:{
      flexDirection:'row',
      marginTop: 20,
      fontSize: 12,
      justifyContent:'space-between'
    },
    footer: {
      marginTop: 40,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
  });

  
  const BirthCertificatePdf = ({ certificate }) => (
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
        <View style={styles.header}>
          <Text style={styles.title}>Birth Certificate</Text>
        </View>
  
        <View>
          <View style={styles.row}>
            <Text style={styles.label}>Mother's Name:</Text>
            <Text style={styles.value}>{certificate.motherId.name || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Mother's MR:</Text>
            <Text style={styles.value}>{certificate.motherMr || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Father Name:</Text>
            <Text style={styles.value}>{certificate.fatherName || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Father CNIC:</Text>
            <Text style={styles.value}>{certificate.fatherCnic || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Delivery No:</Text>
            <Text style={styles.value}>{certificate.deliveryNo || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Mode Of Delivery:</Text>
            <Text style={styles.value}>{certificate.modeOfdelivery || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Birthmark/Congenital Abnormality:</Text>
            <Text style={styles.value}>{certificate.birthMark || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Doctor:</Text>
            <Text style={styles.value}>{certificate.doctorId?.name || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Phone of Guardian/Attendant:</Text>
            <Text style={styles.value}>{certificate.phone || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Address:</Text>
            <Text style={styles.value}>{certificate.address || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Date of Birth:</Text>
            <Text style={styles.value}>{certificate.dob ? moment(certificate.dob).format('DD/MM/YYYY') : 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Time of Birth:</Text>
            <Text style={styles.value}>{certificate.timeOfBirth || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Gender:</Text>
            <Text style={styles.value}>{certificate.gender || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Weight (kg):</Text>
            <Text style={styles.value}>{certificate.weight || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Remarks:</Text>
            <Text style={styles.value}>{certificate.remarks || 'N/A'}</Text>
          </View>
        </View>
  
        <View style={styles.divider} />
  
        
  
        <View style={styles.footer}>
          <Text>Serial: {certificate._id.substring(0, 6).toUpperCase()}</Text>
          <View style={styles.clinicInfo2}>
          <Text style={styles.label2}>Doctor's Signature:</Text><Text> _________________</Text>
          </View>
        </View>
</View>
       
      </Page>
    </Document>
  );


   const handleDownload = async (certificate) => {
     console.log('Certificate data:', certificate); // Verify certificate data
     
     try {
       // 1. Generate the PDF
       const blob = await pdf(<BirthCertificatePdf certificate={certificate} />).toBlob();
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
      <Breadcrumb pageName="Birth Certificates" />
      
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-500">
          Data 
        </div>
        
        <Link
          to="/birth-reports/new"
          className="inline-flex items-center justify-center gap-2.5 rounded-md bg-primary py-3 px-6 text-center font-medium text-white hover:bg-opacity-90"
        >
          + Add Birth Certificate
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

export default BirthCertificates;