import {
  FaCalculator,
  FaCertificate,
  FaEdit,
  FaFile,
  FaHeadSideMask,
  FaTextHeight,
  FaTools,
  FaUser,
} from 'react-icons/fa';

import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { Base_url } from '../../utils/Base_url';
import { Link, useParams } from 'react-router-dom';
import moment from 'moment';
import UpdatePatinet from './UpdatePatinet';
import UpdatePatient from './UpdatePatinet';
import EditAppointment from '../Appointments/EditAppointment';
import EditTokenForm from '../Appointments/EditTokenForm';

const DetailsPatients = () => {
  const { id } = useParams();
  const [patientData, setPatientData] = React.useState<any>(null);
  const [myAppointment, setMyAppointment] = React.useState<any>(null);
  console.log(myAppointment);
  
  const [familyHistory, setFamilyHistory] = React.useState<any>(null);
  const [medicalHistory, setMedicalHistory] = React.useState<any>(null);
  const [dischargePatient, setDischargePatient] = React.useState<any>(null);
  const [invoice, setInvoices] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fetchPatientData, setFetchPatientData] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [tokens, setTokens] = useState([]);

  const fetchInvoices = () => {
    // Don't fetch if patient ID is not available
    if (!id) {
      console.warn('Patient ID is missing, cannot fetch invoices');
      setInvoices(null);
      return;
    }

    axios
      .get(`${Base_url}/apis/invoice/get?patientId=${id}`)
      .then((res) => {
        const list = res?.data?.data || [];
        if (!Array.isArray(list) || list.length === 0) {
          setInvoices(null);
          return;
        }

        // Filter to ensure only invoices for current patient are shown
        // This is a safety check in case backend returns invoices for other patients
        const patientInvoices = list.filter((invoice) => {
          const invoicePatientId = invoice.patientId?._id || invoice.patientId;
          const currentPatientId = String(id || '').trim();
          const matches = String(invoicePatientId || '').trim() === currentPatientId;
          
          if (!matches && invoicePatientId) {
            console.warn(`Filtering out invoice ${invoice.invoiceNo || invoice._id} - belongs to patient ${invoicePatientId}, not ${id}`);
          }
          
          return matches;
        });

        if (patientInvoices.length === 0) {
          console.log(`No invoices found for patient ${id}`);
          setInvoices(null);
          return;
        }

        // Sort by date descending (most recent first)
        const sorted = [...patientInvoices].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );

        // Get the most recent invoice (last invoice)
        const lastInvoice = sorted[0];
        
        console.log(`✅ Last invoice for patient ${id}:`, {
          invoiceNo: lastInvoice.invoiceNo,
          date: lastInvoice.createdAt,
          patientId: lastInvoice.patientId?._id || lastInvoice.patientId,
          totalInvoices: patientInvoices.length
        });

        setInvoices(lastInvoice);
      })
      .catch((error) => {
        console.error('Error fetching invoices:', error);
        setInvoices(null);
      });
  };

  const fetchPatientDetails = async () => {
    axios
      .get(`${Base_url}/apis/patient/get/${id}`)
      .then((response) => {
        console.log(response.data);
        setPatientData(response.data.data);
      })
      .catch((error) => {
        console.error('Error fetching patient details:', error);
      });
  };

  const fetchPatientAppointment = async () => {
    axios
      .get(`${Base_url}/apis/appointment/get?patientId=${id}`)
      .then((response) => {
        console.log(response.data);
        setMyAppointment(response.data.data);
      })
      .catch((error) => {
        console.error('Error fetching patient details:', error);
      });
  };

  const fetchFamilyHistory = async () => {
    axios
      .get(`${Base_url}/apis/familyHistory/get?patientId=${id}`)
      .then((response) => {
        console.log(response.data);
        setFamilyHistory(response.data.data);
      })
      .catch((error) => {
        console.error('Error fetching patient details:', error);
      });
  };

  const fetchMedicalHistory = async () => {
    axios
      .get(`${Base_url}/apis/medicalHistory/get?patientId=${id}`)
      .then((response) => {
        console.log(response.data);
        setMedicalHistory(response.data.data);
      })
      .catch((error) => {
        console.error('Error fetching patient details:', error);
      });
  };

  const fetchDischargedPatients = async () => {
    axios
      .get(`${Base_url}/apis/dischargePatient/get?patientId=${id}`)
      .then((response) => {
        console.log(response.data);
        setDischargePatient(response.data.data);
      })
      .catch((error) => {
        console.error('Error fetching patient details:', error);
      });
  };

  const fetchDoctors = async () => {
    try {
      const response = await axios.get(`${Base_url}/apis/doctor/get`);
      setDoctors(response.data.data);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  const fetchTokenData = async () => {
    try {
      const response = await axios.get(
        `${Base_url}/apis/token/get?patientId=${id}`,
      );
      setTokens(response.data.data);
    } catch (error) {
      console.error('Error fetching tokens:', error);
    }
  };

  // const fetchDoctorAppointmentData = async () => {
  //   try {
  //     const response = await axios.get(
  //       `${Base_url}/apis/appointment/get?patientId=${id}`,
  //     );
  //     setMyAppointment(response.data.data);
  //   } catch (error) {
  //     console.error('Error fetching appointments:', error);
  //   }
  // };

  useEffect(() => {
    // Only fetch if patient ID exists
    if (!id) {
      console.warn('Patient ID is missing');
      return;
    }

    fetchPatientDetails();
    fetchInvoices();
    fetchPatientAppointment();
    fetchFamilyHistory();
    fetchMedicalHistory();
    fetchDischargedPatients();
    fetchDoctors();
    fetchTokenData();
  }, [id]); // Add id as dependency so data refetches when patient changes

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  const [openEditTokenModal, setOpenEditTokenModal] = useState(false);
  const [selectedToken, setSelectedToken] = useState(null);

  const handleEditAppointment = (appointment) => {
    setSelectedAppointment(appointment);
    setEditModalOpen(true);
  };

  const handleEditToken = (token) => {
    setSelectedToken(token);
    setOpenEditTokenModal(true);
  };

  return (
    <>
      <div className="min-h-screen ">
        {/* Main Container */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-6 gap-6">
          {/* Left Sidebar */}
          <div className="lg:col-span-2">
            <div className="">
              <div className="flex flex-col items-center space-y-4 bg-white rounded-lg shadow-sm p-6">
                <div className="relative">
                  {/* <span className="absolute -top-2 whitespace-nowrap -right-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    Patient is in OPD
                  </span> */}
                  <div className="w-32 h-32 rounded-full bg-white shadow-4 flex items-center mt-8 justify-center">
                    {patientData?.image ? (
                      <img
                        src={`${Base_url}/${patientData?.image}`}
                        alt=""
                        className=" w-full h-full rounded-full"
                      />
                    ) : (
                      <FaUser className="w-12 text-primary h-14 text-gray-500" />
                    )}
                  </div>
                </div>
                <div className="text-center">
                  <h2 className="text-xl font-semibold">{patientData?.name}</h2>
                  <p className="text-gray-600 uppercase">
                    {patientData?.gender}
                  </p>
                  <p className="text-sm text-gray-500">MR# {patientData?.mr}</p>
                  <p className="text-sm text-gray-500">HW ID 000010819S794</p>
                  <p className="text-sm text-gray-500">{patientData?.phone}</p>
                </div>
              </div>

              <nav className="mt-6 space-y-2 bg-white rounded-lg shadow-sm p-6">
                <NavItem
                  onClick={() => {
                    setFetchPatientData(patientData);
                    setIsModalOpen(true);
                  }}
                  icon={<FaUser size={18} />}
                  text="Edit Profile"
                />
                <NavItem
                  url={
                    invoice?._id
                      ? `/invoice/patient/${id}`
                      : `/patient/invoice/new/${patientData?._id}`
                  }
                  icon={<FaFile size={18} />}
                  text="Add Invoice"
                />
                <NavItem
                  icon={<FaCalculator size={18} />}
                  text="Add Appointment"
                />
                <NavItem
                  icon={<FaTools size={18} />}
                  text="Add Token"
                  onClick={() => handleEditToken(null)}
                />
                <NavItem
                  url={`/family-history/${id}`}
                  icon={<FaUser size={18} />}
                  text="Patient Family History"
                />
                <NavItem
                  url={`/medical-history/${id}`}
                  icon={<FaTextHeight size={18} />}
                  text="Add Medical History"
                />
                <NavItem
                  url={`/medical-certificates/${id}`}
                  icon={<FaCertificate size={18} />}
                  text="Medical Certificates"
                />
                <NavItem
                  icon={<FaHeadSideMask size={18} />}
                  text="Add Health Record"
                />
                <NavItem
                  url={`/invoice/patient/${id}`}
                  icon={<FaCertificate size={18} />}
                  text="Invoice History"
                />
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-4 space-y-6">
            <Section
              title="MEDICAL HISTORY"
              hasAction={`/medical-history/${id}`}
              content={
                <div>
                  {medicalHistory?.map((item) => {
                    return <p className="mt-4 text-black">{item?.message}</p>;
                  })}
                </div>
              }
            />

            <Section
              title="HEALTH RECORDS"
              content="No health record has been added yet."
            />

            <Section
              title="OPD"
              count={`${myAppointment?.length} Total`}
              content={
                <div className="p-4">
                  {myAppointment?.slice(0, 3).map((item: any) => (
                    
                    <div
                      key={item._id}
                      className="flex justify-between items-center py-2"
                    >
                      <div>
                        <h3 className="">
                          Appointment with Dr. {item.doctorId.name} on
                          {moment(item?.appointmentDate).format('DD-MM-YYYY')}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm bg-primary text-white px-3 py-1 rounded-full">
                          {item?.appointmentStatus}
                        </span>
                        <button
                          onClick={() => handleEditAppointment(item)}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <FaEdit size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              }
              viewAll={`/appointment/patient/${id}`}
            />

            <Section
              title="TOKENS"
              count={`${tokens?.length} Total`}
              content={
                <div className="p-4">
                  {tokens?.slice(0, 3).map((item: any) => (
                    <div
                      key={item._id}
                      className="flex justify-between items-center py-2"
                    >
                      <div>
                        <h3 className="">
                          Token #{item?.tokenNumber} with Dr.{' '}
                          {item?.doctorId?.name} on{' '}
                          {moment(item?.date).format('DD-MM-YYYY')}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm bg-primary text-white px-3 py-1 rounded-full">
                          {item?.tokenSatus}
                        </span>
                        <button
                          onClick={() => handleEditToken(item)}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <FaEdit size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              }
              viewAll={`/tokens/patient/${id}`}
            />

            <Section
              title="PATIENT FAMILY HISTORY"
              content={
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse mt-4">
                    <thead className="bg-gray-50 bg-gray-3 dark:bg-gray-700">
                      <tr>
                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                          AGE (Y)
                        </th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                          RELATIONSHIP
                        </th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                          BLOOD GROUP
                        </th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                          DIAGNOSIS
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                      {familyHistory?.map((item) => (
                        <tr
                          key={item._id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <td className="py-2 px-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                            {item?.age || '-'}
                          </td>
                          <td className="py-2 px-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                            {item?.relationship || '-'}
                          </td>
                          <td className="py-2 px-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                            {item?.bloodGroup || '-'}
                          </td>
                          <td className="py-2 px-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                            {item?.diagnosis || '-'}
                          </td>
                        </tr>
                      ))}
                      {familyHistory?.length === 0 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="py-4 px-4 text-center text-sm text-gray-500 dark:text-gray-400"
                          >
                            No family history records found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              }
              viewAll={`/family-history/${id}`}
            />

            <Section
              title="LAST INVOICE"
              viewAll={`/invoice/patient/${id}`}
              content={
                invoice ? (
                  <div className="space-y-2 p-4">
                    <InvoiceItem
                      label={`Dr. ${invoice?.doctorId?.name || 'N/A'}: Consultation Fee`}
                      amount={invoice?.item?.[0]?.amount?.toString() || '0'}
                    />
                    <div className="border-t my-4"></div>
                    <InvoiceItem
                      label="Total Billed Amount:"
                      amount={invoice?.totalBill?.toString() || '0'}
                      bold
                    />
                    <InvoiceItem
                      label="Amount Paid:"
                      amount={invoice?.totalPay?.toString() || '0'}
                      bold
                    />
                    <InvoiceItem
                      label="Dues:"
                      amount={invoice?.duePay?.toString() || '0'}
                    />
                    <InvoiceItem
                      label="Advance:"
                      amount={invoice?.advancePay?.toString() || '0'}
                    />
                    <InvoiceItem
                      label="Total Dues:"
                      amount={invoice?.duePay?.toString() || '0'}
                      bold
                    />
                    <InvoiceItem
                      label="Date"
                      amount={
                        invoice?.createdAt
                          ? moment(invoice.createdAt).format(
                              'DD-MM-YYYY H:mm:ss',
                            )
                          : '-'
                      }
                      bold
                    />
                  </div>
                ) : (
                  <div className="p-4 text-sm text-gray-500">
                    No invoices found for this patient.
                  </div>
                )
              }
            />

            <Section
              viewAll={`/bed-patient-history/${id}`}
              title="ADMISSION HISTORY"
              content={
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse mt-4">
                    <thead className="bg-gray-50 bg-gray-3 dark:bg-gray-700">
                      <tr>
                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                          WARD TYPE
                        </th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                          BED#
                        </th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                          ADMITTED AT
                        </th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                          DISCHARGE AT
                        </th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                          DISCHARGE SUMMARY
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                      {dischargePatient?.slice(0, 1)?.map((item) => (
                        <tr
                          key={item._id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <td className="py-2 px-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                            {item?.admitPatientId?.wardId?.name || '-'}
                          </td>
                          <td className="py-2 px-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                            {item?.admitPatientId?.bedDetailId?.bedNo || '-'}
                          </td>
                          <td className="py-2 px-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                            {item?.admitPatientId?.admissionDate || '-'}
                          </td>
                          <td className="py-2 px-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                            {item?.dischargeDate || '-'}
                          </td>
                          <td className="py-2 px-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                            {item?.admitPatientId?.admissionReason || '-'}
                          </td>
                        </tr>
                      ))}
                      {dischargePatient?.length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="py-4 px-4 text-center text-sm text-gray-500 dark:text-gray-400"
                          >
                            No admission history records found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              }
            />
          </div>
        </div>
      </div>

      <UpdatePatient
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        closeModal={() => setIsModalOpen(false)}
        fetchPatientData={fetchPatientData}
        patientData={patientData}
      />

      <EditAppointment
        isModalOpen={editModalOpen}
        setIsModalOpen={setEditModalOpen}
        selectedAppointment={selectedAppointment}
        fetchAppointmentData={() => {
          fetchPatientAppointment();
          fetchTokenData();
        }}
        doctors={doctors}
      />

      <EditTokenForm
        isModalOpen={openEditTokenModal}
        setIsModalOpen={setOpenEditTokenModal}
        selectedToken={selectedToken}
        fetchToken={fetchTokenData}
        doctors={doctors}
      />
    </>
  );
};

// Helper Components
const NavItem = ({
  icon,
  text,
  url,
  onClick,
}: {
  icon: React.ReactNode;
  text: string;
  url?: string;
  onClick?: () => void;
}) => (
  <Link
    onClick={onClick}
    to={url || '#'}
    className="w-full text-left py-2 px-3 rounded-md hover:bg-gray-100 flex items-center gap-3"
  >
    {icon}
    <span>{text}</span>
  </Link>
);

const Section = ({
  title,
  content,
  hasAction,
  count,
  viewAll,
}: {
  title: string;
  content: React.ReactNode;
  hasAction?: string;
  count?: string;
  viewAll?: string;
}) => (
  <div className="bg-white rounded-lg shadow-sm">
    <div className="flex justify-between items-center p-4 bg-gray-50 border-b border-gray rounded-t-lg">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold">{title}</h3>
        {hasAction && (
          <Link to={hasAction} className="text-sm rounded hover:bg-gray-200">
            <FaEdit className="text-primary" size={22} />
          </Link>
        )}
      </div>

      {count && <span className="text-gray-500">{count}</span>}
    </div>
    <div className="px-4">{content}</div>
    <div className="flex pr-6 pb-4 justify-end">
      {viewAll && (
        <Link to={`${viewAll}`} className="text-blue-600 hover:underline">
          View all
        </Link>
      )}
    </div>
  </div>
);

const InvoiceItem = ({
  label,
  amount,
  bold,
}: {
  label: string;
  amount: string;
  bold?: boolean;
}) => (
  <div className="flex justify-between items-center">
    <span className={bold ? 'font-semibold' : 'text-gray-600'}>{label}</span>
    <span className={bold ? 'font-semibold' : ''}>{amount}</span>
  </div>
);

export default DetailsPatients;
