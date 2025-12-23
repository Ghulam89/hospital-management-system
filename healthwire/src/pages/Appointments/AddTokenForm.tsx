import React, { useEffect, useState } from 'react';
import { MdClose } from 'react-icons/md';
import Modal from '../../components/modal';
import { FaPlus } from 'react-icons/fa';
import { AsyncPaginate } from "react-select-async-paginate";
import axios from 'axios';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import { Base_url } from '../../utils/Base_url';
import { RiDeleteBin5Fill } from 'react-icons/ri';
import AddPatients from '../Patients/AddPatients';

const AddTokenForm: React.FC = ({
  isModalOpen,
  setIsModalOpen,
  selectedWard,
  fetchWardData,
  fetchToken,
}) => {
  const [allToken, setAllToken] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showInvoiceFields, setShowInvoiceFields] = useState(false);
  const [allProcedures, setAllProcedures] = useState([]);
  const [procedures, setProcedures] = useState([{
    procedureId: '',
    description: '',
    rate: 0,
    quantity: 1,
    amount: 0,
    discount: 0,
    discountType: 'value',
    tax: 0,
    performedBy: '',
    deductDiscount: 'Hospital & Doctor',
    doctorAmount: 0,
    hospitalAmount: 0
  }]);
  const [paymentInstallments, setPaymentInstallments] = useState([]);
  const [remarks, setRemarks] = useState('');
  const [invoiceDate, setInvoiceDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const validationSchema = Yup.object().shape({
    patientId: Yup.string().required('Patient is required'),
    tokenNumber: Yup.string().required('Token number is required'),
    tokenDate: Yup.string().required('Token date is required'),
    doctorId: Yup.string().required('Doctor is required'),
    pulseHeartRate: Yup.string().nullable(),
    temperature: Yup.string().nullable(),
    bloodPressure: Yup.string().nullable(),
    respiratoryRate: Yup.string().nullable(),
    bloodSugar: Yup.string().nullable(),
    weight: Yup.string().nullable(),
    height: Yup.string().nullable(),
    bodyMassIndex: Yup.string().nullable(),
    bodySurfaceArea: Yup.string().nullable(),
    oxygenSaturation: Yup.string().nullable(),
    comment: Yup.string().nullable(),
    createInvoice: Yup.boolean(),
  }).test(
    'invoice-validation',
    'Procedure details are required when creating invoice',
    function (values) {
      if (values.createInvoice) {
        if (procedures.length === 0) {
          return this.createError({
            path: 'createInvoice',
            message: 'At least one procedure is required',
          });
        }

        // for (const proc of procedures) {
        //   if (!proc.procedureId || proc.amount <= 0) {
        //     return this.createError({
        //       path: 'createInvoice',
        //       message: 'Valid procedure with amount is required',
        //     });
        //   }
        // }
      }
      return true;
    }
  );

  const calculateSubTotal = () => {
    return procedures.reduce((sum, item) => sum + (item.amount || 0), 0);
  };

  const calculateTotalDiscount = () => {
    return procedures.reduce((sum, item) => sum + (item.discount || 0), 0);
  };

  const calculateGrandTotal = () => {
    return calculateSubTotal() - calculateTotalDiscount();
  };

  const calculateTotalPaid = () => {
    return paymentInstallments.reduce((sum, item) => sum + (item.amount || 0), 0);
  };

  const calculateDue = () => {
    return calculateGrandTotal() - calculateTotalPaid();
  };

  const handleAddProcedure = () => {
    setProcedures([...procedures, {
      procedureId: '',
      description: '',
      rate: 0,
      quantity: 1,
      amount: 0,
      discount: 0,
      discountType: 'value',
      tax: 0,
      performedBy: formik.values.doctorId,
      deductDiscount: 'Hospital & Doctor',
      doctorAmount: 0,
      hospitalAmount: 0
    }]);
  };

  const handleProcedureChange = (index, field, value) => {
    const updatedProcedures = [...procedures];
    updatedProcedures[index][field] = value;

    // If procedure is selected, update description and rate
    if (field === 'procedureId') {
      const selectedProcedure = allProcedures.find(p => p._id === value);
      if (selectedProcedure) {
        updatedProcedures[index].description = selectedProcedure.name;
        updatedProcedures[index].rate = selectedProcedure.amount;
        updatedProcedures[index].amount = selectedProcedure.amount * (updatedProcedures[index].quantity || 1);
      }
    }

    // Calculate amount if rate or quantity changes
    if (field === 'rate' || field === 'quantity') {
      updatedProcedures[index].amount =
        (updatedProcedures[index].rate || 0) * (updatedProcedures[index].quantity || 1);
    }

    // Recompute discount when value/type changes
    if (field === 'discount' || field === 'discountType') {
      const rate = Number(updatedProcedures[index].rate) || 0;
      const qty = Number(updatedProcedures[index].quantity) || 0;
      const amount = rate * qty;
      const discVal = Number(updatedProcedures[index].discount) || 0;
      if (updatedProcedures[index].discountType === 'percentage') {
        updatedProcedures[index].discount = (amount * discVal) / 100;
      }
    }

    // Simple share split logic similar to appointments screen
    const procedure = updatedProcedures[index];
    const netAmount = (Number(procedure.amount) || 0) - (Number(procedure.discount) || 0);
    let doctorShare = 0;
    let hospitalShare = 0;
    switch (procedure.deductDiscount) {
      case 'Doctor':
        doctorShare = Math.max(0, netAmount);
        hospitalShare = 0;
        break;
      case 'Hospital':
        doctorShare = 0;
        hospitalShare = Math.max(0, netAmount);
        break;
      default:
        doctorShare = Math.max(0, netAmount / 2);
        hospitalShare = Math.max(0, netAmount / 2);
        break;
    }
    updatedProcedures[index].doctorAmount = Number(doctorShare.toFixed(2));
    updatedProcedures[index].hospitalAmount = Number(hospitalShare.toFixed(2));

    setProcedures(updatedProcedures);
  };

  const handleRemoveProcedure = (index) => {
    const updatedProcedures = [...procedures];
    updatedProcedures.splice(index, 1);
    setProcedures(updatedProcedures);
  };

  const handleAddPayment = () => {
    setPaymentInstallments([...paymentInstallments, {
      method: 'cash',
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      reference: ''
    }]);
  };

  const handlePaymentChange = (index, field, value) => {
    const updatedPayments = [...paymentInstallments];
    updatedPayments[index][field] = value;
    setPaymentInstallments(updatedPayments);
  };

  const handleRemovePayment = (index) => {
    const updatedPayments = [...paymentInstallments];
    updatedPayments.splice(index, 1);
    setPaymentInstallments(updatedPayments);
  };

  const formik = useFormik({
    initialValues: {
      patientId: '',
      tokenNumber: '',
      tokenDate: new Date().toISOString().split('T')[0],
      doctorId: '',
      pulseHeartRate: '',
      temperature: '',
      bloodPressure: '',
      respiratoryRate: '',
      bloodSugar: '',
      weight: '',
      height: '',
      bodyMassIndex: '',
      bodySurfaceArea: '',
      oxygenSaturation: '',
      comment: '',
      createInvoice: false,
      tokenSatus:''
    },
    validationSchema,
    onSubmit: async (values) => {

      console.log(values);
      
      try {
        setLoading(true);
        const tokenData = {
          ...values,
          wardId: selectedWard?._id,
          procedures: values.createInvoice ? procedures : []
        };

        const response = await axios.post(`${Base_url}/apis/token/create`, tokenData);

        if (response?.data?.status === "ok") {
          toast.success('Token created successfully');

          if (values.createInvoice && procedures.length > 0) {
            const patientInfo = {
              _id: values.patientId,
              mr: values.patientMr || ''
            };

            const invoiceData = {
              patientId: patientInfo._id,
              patientMr: patientInfo.mr,
              doctorId: procedures[0]?.performedBy || values.doctorId,
              item: procedures.map(item => ({
                procedureId: item.procedureId,
                description: item.description,
                rate: item.rate,
                quantity: item.quantity,
                amount: item.amount,
                discount: item.discount,
                discountType: item.discountType === 'percentage' ? 1 : 0,
                tax: item.tax,
                total: item.amount - item.discount,
                performedBy: item.performedBy || values.doctorId,
                doctorAmount: item.doctorAmount || 0,
                hospitalAmount: item.hospitalAmount || 0
              })),
              subTotalBill: calculateSubTotal(),
              discountBill: calculateTotalDiscount(),
              taxBill: 0,
              invoiceDate: invoiceDate,
              totalBill: calculateGrandTotal(),
              duePay: calculateDue() > 0 ? calculateDue() : 0,
              advancePay: calculateDue() < 0 ? Math.abs(calculateDue()) : 0,
              totalPay: calculateTotalPaid(),
              payment: paymentInstallments.map(payment => ({
                method: payment.method,
                payDate: new Date(payment.date).toISOString(),
                paid: payment.amount,
                reference: payment.reference
              })),
              note: remarks,
              tokenId: response.data.data._id
            };

            try {
              const invoiceResponse = await axios.post(`${Base_url}/apis/invoice/create`, invoiceData);
              toast.success('Invoice created successfully!');
            } catch (error) {
              console.error('Error creating invoice:', error);
              toast.error(error.response?.data?.message || 'An error occurred while creating invoice');
            }
          }

          setIsModalOpen(false);
          formik.resetForm();
          fetchToken();
        } else {
          toast.error(response?.data?.message);
        }
      } catch (error) {
        console.error('Error creating token:', error);
        if (error?.response?.data?.status === "fail") {
          toast.error(error?.response?.data?.message);
        }
      } finally {
        setLoading(false);
      }
    },
  });

  const loadOptions = async (searchQuery, loadedOptions, { page }) => {
    try {
      const response = await axios.get(`${Base_url}/apis/patient/get`, {
        params: { page, limit: 20, search: searchQuery || "" },
      });

      const { data, totalPages } = response.data;

      return {
        options: data.map((item) => ({
          label: `${item.name} (MR: ${item.mr})`,
          value: item._id,
          patientData: item
        })),
        hasMore: page < totalPages,
        additional: {
          page: page + 1,
        },
      };
    } catch (error) {
      console.error("Error fetching patients:", error);
      return {
        options: [],
        hasMore: false,
        additional: {
          page: page,
        },
      };
    }
  };

  const loadDoctorOptions = async (searchQuery, loadedOptions, { page }) => {
    try {
      const response = await axios.get(`${Base_url}/apis/user/get?role=doctor`, {
        params: { page, limit: 20, search: searchQuery || "" },
      });

      const { data, totalPages } = response.data;

      return {
        options: data.map((item) => ({
          label: item.name,
          value: item._id,
          doctorData: item
        })),
        hasMore: page < totalPages,
        additional: {
          page: page + 1,
        },
      };
    } catch (error) {
      console.error("Error fetching doctors:", error);
      return {
        options: [],
        hasMore: false,
        additional: {
          page: page,
        },
      };
    }
  };

  const fetchTokenData = () => {
    axios.get(`${Base_url}/apis/token/getToken`)
      .then((res) => {
        setAllToken(res.data.data);
      })
      .catch(err => {
        console.error("Error fetching tokens:", err);
      });
  };

  const fetchProcedures = async () => {
    try {
      const response = await axios.get(`${Base_url}/apis/procedure/get`);
      setAllProcedures(response?.data?.data || []);
    } catch (error) {
      console.error("Error fetching procedures:", error);
    }
  };

  useEffect(() => {
    fetchTokenData();
    fetchProcedures();
  }, []);

     const [openModal,setOpenModal] = useState(false); 

  return (
    <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
      <div className="max-h-[80vh] overflow-y-auto">
        <div className="p-3.5 flex justify-between items-center">
          <h1 className="capitalize text-black h4 font-semibold text-xl">
            Add Token
          </h1>
          <MdClose
            onClick={() => {
              setIsModalOpen(false);
              formik.resetForm();
            }}
            size={25}
            className="cursor-pointer"
          />
        </div>
        <hr className="border-gray" />
              <AddPatients isModalOpen={openModal} setIsModalOpen={setOpenModal} closeModal={undefined} fetchPatientData={undefined} />
        
        <div>
          <form onSubmit={formik.handleSubmit} className="p-4 space-y-6">
            {/* Patient Section */}
            <section className="flex justify-between items-center">
              <h2 className="font-medium text-sm mb-2">Patient</h2>
              <div className='w-[70%] flex flex-col gap-2'>
 <div className=' flex justify-between items-center w-full gap-2'>
<div className=" w-full">
                <AsyncPaginate
                  name="patientId"
                  value={formik.values.patientId ? {
                    value: formik.values.patientId,
                    label: formik.values.patientName || 'Select patient'
                  } : null}
                  loadOptions={loadOptions}
                  onChange={(option) => {
                    formik.setFieldValue('patientId', option?.value || '');
                    formik.setFieldValue('patientName', option?.label || '');
                    formik.setFieldValue('patientMr', option?.patientData?.mr || '');
                  }}
                  onBlur={formik.handleBlur}
                  getOptionLabel={(option) => option.label}
                  getOptionValue={(option) => option.value}
                  placeholder="Select a patient..."
                  additional={{ page: 1 }}
                  classNamePrefix="react-select"
                  className='w-full'
                />
                {formik.touched.patientId && formik.errors.patientId && (
                  <div className="text-red-500 text-xs">{formik.errors.patientId}</div>
                )}
              </div>
              <button
                               onClick={() => setOpenModal(true)}
                                         type='button'
                                          className="inline-flex items-center   whitespace-nowrap justify-center gap-2 rounded-md bg-primary py-2 px-4 text-sm font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
                                        >
                                          <FaPlus size={14} /> Add Patient
                                        </button>
              </div>
              </div>
             
              
            </section>

            {/* Token Section */}
            <section className="flex justify-between items-center">
              <h2 className="font-medium mb-2 text-sm">Token Date</h2>
              <div className="w-[70%] flex flex-col gap-2">
                <input
                  name="tokenDate"
                  type='date'
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  value={formik.values.tokenDate}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
              </div>
            </section>

            <section className="flex justify-between items-center">
              <h2 className="font-medium mb-2 text-sm">Token</h2>
              <div className="w-[70%] flex flex-col gap-2">
                <select
                  name="tokenNumber"
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  value={formik.values.tokenNumber}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                >
                  <option value="">Select a token</option>
                  {allToken?.map((item, index) => (
                    <option key={index} value={item}>{`Token #${item}`}</option>
                  ))}
                </select>
                {formik.touched.tokenNumber && formik.errors.tokenNumber && (
                  <div className="text-red-500 text-xs">{formik.errors.tokenNumber}</div>
                )}
              </div>
            </section>

            {/* Doctor Section */}
            <section className="flex justify-between items-center">
              <h2 className="font-medium text-sm mb-2">Doctor</h2>
              <div className="w-[70%] flex flex-col gap-2">
                <AsyncPaginate
                  name="doctorId"
                  value={formik.values.doctorId ? {
                    value: formik.values.doctorId,
                    label: formik.values.doctorName || 'Select doctor'
                  } : null}
                  loadOptions={loadDoctorOptions}
                  onChange={(option) => {
                    formik.setFieldValue('doctorId', option?.value || '');
                    formik.setFieldValue('doctorName', option?.label || '');

                    setProcedures(procedures.map(proc => ({
                      ...proc,
                      performedBy: option?.value || ''
                    })));
                  }}
                  onBlur={formik.handleBlur}
                  getOptionLabel={(option) => option.label}
                  getOptionValue={(option) => option.value}
                  placeholder="Select a doctor..."
                  additional={{ page: 1 }}
                  classNamePrefix="react-select"
                  className='w-full'
                />
                {formik.touched.doctorId && formik.errors.doctorId && (
                  <div className="text-red-500 text-xs">{formik.errors.doctorId}</div>
                )}
              </div>
            </section>

            <section>
              <h2 className='pb-3 text-black font-semibold text-lg'>Vitals</h2>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { name: 'pulseHeartRate', label: 'Pulse Heart Rate' },
                  { name: 'temperature', label: 'Temperature' },
                  { name: 'bloodPressure', label: 'Blood Pressure' },
                  { name: 'respiratoryRate', label: 'Respiratory Rate' },
                  { name: 'bloodSugar', label: 'Blood Sugar' },
                  { name: 'weight', label: 'Weight' },
                  { name: 'height', label: 'Height' },
                  { name: 'bodyMassIndex', label: 'Body Mass Index' },
                  { name: 'bodySurfaceArea', label: 'Body Surface Area' },
                  { name: 'oxygenSaturation', label: 'Oxygen Saturation' },
                ].map((field) => (
                  <div key={field.name}>
                    <input
                      type="text"
                      name={field.name}
                      placeholder={field.label}
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 text-sm px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                      value={formik.values[field.name]}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    />
                    {formik.touched[field.name] && formik.errors[field.name] && (
                      <div className="text-red-500 text-xs">{formik.errors[field.name]}</div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Invoice Section */}
            <section>
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="createInvoice"
                  name="createInvoice"
                  checked={formik.values.createInvoice}
                  onChange={(e) => {
                    formik.handleChange(e);
                    setShowInvoiceFields(e.target.checked);
                  }}
                  className="mr-2"
                />
                <label htmlFor="createInvoice" className="font-medium">
                  Create Invoice
                </label>
                {formik.errors.createInvoice && (
                  <div className="text-red-500 text-xs ml-2">{formik.errors.createInvoice}</div>
                )}
              </div>

              {showInvoiceFields && (
                <div className="space-y-6 rounded-lg">
                  <h3 className="font-semibold text-lg">Invoice Details</h3>

                  {/* Procedures */}
                  <div>
                    <h4 className="font-medium mb-2">Procedures</h4>
                    <div className="mb-4">
                      <label className="mb-2 block text-black dark:text-white">Date</label>
                      <input
                        type="date"
                        className="rounded border-[1.5px] border-stroke bg-transparent py-2 px-3 w-56 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                        value={invoiceDate}
                        onChange={(e) => setInvoiceDate(e.target.value)}
                      />
                    </div>
                    {procedures.map((procedure, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 mb-3">
                        <div className="col-span-4">
                          <label className='pb-2'>Procedure</label>
                          <AsyncPaginate
                            value={
                              procedure.procedureId
                                ? { value: procedure.procedureId, label: procedure.description || 'Selected procedure' }
                                : null
                            }
                            loadOptions={async (searchQuery, _loaded, { page }) => {
                              try {
                                const res = await axios.get(`${Base_url}/apis/procedure/get`, { params: { page, limit: 20, search: searchQuery || '' } });
                                const { data, totalPages } = res.data;
                                return {
                                  options: data.map((item) => ({ label: item.name, value: item._id, procedureData: item })),
                                  hasMore: page < totalPages,
                                  additional: { page: page + 1 },
                                };
                              } catch {
                                return { options: [], hasMore: false, additional: { page } };
                              }
                            }}
                            onChange={(option) => handleProcedureChange(index, 'procedureId', option?.value || '')}
                            additional={{ page: 1 }}
                            getOptionLabel={(option) => option.label}
                            getOptionValue={(option) => option.value}
                            placeholder="Select a procedure..."
                            classNamePrefix="react-select"
                            className="w-full"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className='pb-2'>Qty</label>
                          <input
                            type="number"
                            min="1"
                            className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3"
                            value={procedure.quantity}
                            onChange={(e) => handleProcedureChange(index, 'quantity', parseInt(e.target.value) || 1)}
                          />
                        </div>
                        <div className="col-span-2">
                          <label className='pb-2'>Rate</label>
                          <input
                            type="number"
                            className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3"
                            value={procedure.rate}
                            onChange={(e) => handleProcedureChange(index, 'rate', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="col-span-2">
                          <label className='pb-2'>Discount</label>
                          <input
                            type="number"
                            className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3"
                            value={procedure.discount}
                            onChange={(e) => handleProcedureChange(index, 'discount', parseFloat(e.target.value) || 0)}
                            min="0"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className='pb-2'>Disc. Type</label>
                          <select
                            className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3"
                            value={procedure.discountType}
                            onChange={(e) => handleProcedureChange(index, 'discountType', e.target.value)}
                          >
                            <option value="value">Amount</option>
                            <option value="percentage">Percentage</option>
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className='pb-2'>Amount</label>
                          <input
                            type="number"
                            className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3"
                            value={procedure.amount}
                            readOnly
                          />
                        </div>
                        <div className="col-span-3">
                          <label className='pb-2'>Deduct</label>
                          <select
                            className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3"
                            value={procedure.deductDiscount}
                            onChange={(e) => handleProcedureChange(index, 'deductDiscount', e.target.value)}
                          >
                            <option value="Hospital & Doctor">Hospital & Doctor</option>
                            <option value="Hospital">Hospital</option>
                            <option value="Doctor">Doctor</option>
                          </select>
                        </div>
                        <div className="col-span-4">
                          <label className='pb-2'>Performed By</label>
                          <AsyncPaginate
                            value={
                              procedure.performedBy
                                ? { value: procedure.performedBy, label: 'Selected doctor' }
                                : null
                            }
                            loadOptions={async (searchQuery, _loaded, { page }) => {
                              try {
                                const res = await axios.get(`https://api.holisticare.pk/apis/user/get?role=doctor`, { params: { page, limit: 20, search: searchQuery || '' } });
                                const { data, totalPages } = res.data;
                                return {
                                  options: data.map((item) => ({ label: item.name, value: item._id })),
                                  hasMore: page < totalPages,
                                  additional: { page: page + 1 },
                                };
                              } catch {
                                return { options: [], hasMore: false, additional: { page } };
                              }
                            }}
                            onChange={(option) => handleProcedureChange(index, 'performedBy', option?.value || '')}
                            additional={{ page: 1 }}
                            getOptionLabel={(option) => option.label}
                            getOptionValue={(option) => option.value}
                            placeholder="Select doctor..."
                            classNamePrefix="react-select"
                            className="w-full"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className='pb-2'>Doctor Share</label>
                          <input
                            type="number"
                            className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3"
                            value={procedure.doctorAmount}
                            readOnly
                          />
                        </div>
                        <div className="col-span-3">
                          <label className='pb-2'>Hospital Share</label>
                          <input
                            type="number"
                            className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3"
                            value={procedure.hospitalAmount}
                            readOnly
                          />
                        </div>
                        <div className="col-span-1 flex items-end justify-end">
                          <button
                            type="button"
                            onClick={() => handleRemoveProcedure(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <RiDeleteBin5Fill size={20} />
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={handleAddProcedure}
                      className="inline-flex items-center bg-primary justify-center gap-2 rounded-md bg-gray-200 py-2 px-4 text-sm font-medium text-white hover:bg-gray-300"
                    >
                      <FaPlus /> Add Procedure
                    </button>
                  </div>

                  {/* Payment Installments */}
                  <div>
                    <h4 className="font-medium mb-2">Payments</h4>
                    {paymentInstallments.map((payment, index) => (
                      <div key={index} className="grid grid-cols-4 gap-2 mb-3">
                        <div className="col-span-1">
                          <select
                            className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                            value={payment.method}
                            onChange={(e) => handlePaymentChange(index, 'method', e.target.value)}
                          >
                           <option value="Cash">Cash</option>
                        <option value="Advance">Advance</option>
                        <option value="Credit">Credit</option>
                        <option value="Card">Card</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Insurance">Insurance</option>
                          </select>
                        </div>
                        <div className="col-span-1">
                          <input
                            type="date"
                            className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                            value={payment.date}
                            onChange={(e) => handlePaymentChange(index, 'date', e.target.value)}
                          />
                        </div>
                        <div className="col-span-1">
                          <input
                            type="number"
                            placeholder="Amount"
                            className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                            value={payment.amount}
                            onChange={(e) => handlePaymentChange(index, 'amount', parseFloat(e.target.value) || 0)}
                            min="0"
                          />
                        </div>
                        <div className="col-span-1 pt-3">
                          <button
                            type="button"
                            onClick={() => handleRemovePayment(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <RiDeleteBin5Fill size={20} />
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={handleAddPayment}
                      className="inline-flex items-center bg-primary justify-center gap-2 rounded-md bg-gray-200 py-2 px-4 text-sm font-medium text-white hover:bg-gray-300"
                    >
                      <FaPlus /> Add Payment
                    </button>
                  </div>

                  {/* Summary */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="font-medium">Remarks</label>
                      <textarea
                        className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                      ></textarea>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Sub Total:</span>
                        <span>Rs. {calculateSubTotal().toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Discount:</span>
                        <span>Rs. {calculateTotalDiscount().toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tax:</span>
                        <span>Rs. 0.00</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>Grand Total:</span>
                        <span>Rs. {calculateGrandTotal().toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Paid:</span>
                        <span>Rs. {calculateTotalPaid().toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Due/Advance:</span>
                        <span>
                          {calculateDue() > 0 ? `Rs. ${calculateDue().toFixed(2)} Due` :
                            calculateDue() < 0 ? `Rs. ${Math.abs(calculateDue()).toFixed(2)} Advance` :
                              'Paid in Full'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
            <section>
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="tokenSatus"
                  name="tokenSatus"
                  checked={formik.values.tokenSatus === 'Checked-in'}
                  onChange={(e) =>
                    formik.setFieldValue(
                      'tokenSatus',
                      e.target.checked ? 'Checked-in' : ''
                    )
                  }
                  className="mr-2"
                />
                <label htmlFor="tokenSatus" className="font-medium">
                  Patient is checked-in
                </label>
              </div>

            </section>
            <section>
              <label className="font-medium pb-1 text-sm mb-2">
                Comment
              </label>
              <textarea
                name="comment"
                placeholder="Add Comments"
                className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 text-sm px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                value={formik.values.comment}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              ></textarea>
            </section>

            <div className='flex justify-center pb-3'>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2.5 rounded-md bg-primary py-3 w-60 whitespace-nowrap text-center font-medium text-white hover:bg-opacity-90 lg:px-8 xl:px-10 disabled:opacity-50"
              >
                {loading ? 'Processing...' : (
                  <>
                    <FaPlus /> Add Token
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  );
};

export default AddTokenForm;