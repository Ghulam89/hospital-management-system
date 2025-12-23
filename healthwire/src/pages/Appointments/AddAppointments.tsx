import React, { useEffect, useState } from 'react';
import { MdClose } from 'react-icons/md';
import Modal from '../../components/modal';
import { FaPlus } from 'react-icons/fa';
import { AsyncPaginate } from 'react-select-async-paginate';
import axios from 'axios';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import moment from 'moment';
import { Base_url } from '../../utils/Base_url';
import AddPatients from '../Patients/AddPatients';
import { RiDeleteBin5Fill } from 'react-icons/ri';

const AddAppointments: React.FC = ({
  isModalOpen,
  setIsModalOpen,
  selectedWard,
  fetchWardData,
  fetchAppointmentData,
}) => {
  const [loading, setLoading] = useState(false);
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
   console.log(availableTimeSlots);

   const [allProcedures,setAllProcedures] = useState([]);
  const [showInvoiceFields, setShowInvoiceFields] = useState(false);
  const [procedures, setProcedures] = useState([
    {
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
    }
  ]);
  const [paymentInstallments, setPaymentInstallments] = useState([
    {
      method: 'cash',
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      reference: ''
    }
  ]);
  const [remarks, setRemarks] = useState('');
  const [invoiceDate, setInvoiceDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [usersList, setUsersList] = useState<any[]>([]);
   
  // AsyncPaginate for procedures
  const loadProcedureOptions = async (searchQuery, loadedOptions, { page }) => {
    try {
      const response = await axios.get(`${Base_url}/apis/procedure/get`, {
        params: { page, limit: 20, search: searchQuery || '' },
      });
      const { data, totalPages } = response.data;
      return {
        options: data.map((item) => ({
          label: item.name,
          value: item._id,
          procedureData: item,
        })),
        hasMore: page < totalPages,
        additional: {
          page: page + 1,
        },
      };
    } catch (error) {
      return {
        options: [],
        hasMore: false,
        additional: { page },
      };
    }
  };

  const validationSchema = Yup.object().shape({
    patientId: Yup.string().required('Patient is required'),
    doctorId: Yup.string().required('Doctor is required'),
    appointmentDate: Yup.string().required('Appointment date is required'),
    startTime: Yup.string().required('Start time is required'),
    endTime: Yup.string().required('End time is required'),
    // procedureId: Yup.string().required('Procedure is required'),
    createInvoice: Yup.boolean(),
    // consultationType: Yup.string()
    //   .oneOf(['Inperson', 'Video'], 'Invalid consultation type')
    //   .required('Consultation type is required'),
    isRecurring: Yup.boolean(),
    // repeatEvery: Yup.number().when('isRecurring', {
    //   is: true,
    //   then: Yup.number()
    //     .min(1, 'Must be at least 1')
    //     .required('Repeat interval is required'),
    // }),
    // repeatUnit: Yup.string().when('isRecurring', {
    //   is: true,
    //   then: Yup.string()
    //     .oneOf(['Day', 'Week', 'Month'], 'Invalid repeat unit')
    //     .required('Repeat unit is required'),
    // }),
    // repeatDays: Yup.array().when(['isRecurring', 'repeatUnit'], {
    //   is: (isRecurring, repeatUnit) => isRecurring && repeatUnit === 'Week',
    //   then: Yup.array()
    //     .min(1, 'Select at least one day')
    //     .required('Repeat days are required'),
    // }),
    // endsOn: Yup.date().when('isRecurring', {
    //   is: true,
    //   then: Yup.date().min(
    //     Yup.ref('appointmentDate'),
    //     'End date must be after start date',
    //   ),
    // }),
  });

  const formik = useFormik({
    initialValues: {
      patientId: '',
      doctorId: '',
      appointmentDate: new Date().toISOString().split('T')[0],
      startTime: '',
      endTime: '',
      procedureId:'',
      procedureName: '',
      consultationType: 'Inperson',
      isRecurring: false,
      repeatEvery: 1,
      repeatUnit: 'Week',
      repeatDays: [],
      endsOn: null,
      createInvoice: false,
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        setLoading(true);
        const response = await axios.post(
          'https://api.holisticare.pk/apis/appointment/create',
          {
            ...values,
            endsOn: values.isRecurring ? values.endsOn : null,
            repeatDays:
              values.isRecurring && values.repeatUnit === 'Week'
                ? values.repeatDays
                : [],
          },
        );

        if (response?.data?.status === 'ok') {
          toast.success('Appointment created successfully');
          if (values.createInvoice && procedures.length > 0) {
            const invoiceData = {
              patientId: values.patientId,
              patientMr: '',
              doctorId: procedures[0]?.performedBy || values.doctorId,
              item: procedures.map((item) => ({
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
                hospitalAmount: item.hospitalAmount || 0,
              })),
              subTotalBill: calculateSubTotal(),
              discountBill: calculateTotalDiscount(),
              taxBill: 0,
              invoiceDate: invoiceDate,
              totalBill: calculateGrandTotal(),
              duePay: calculateDue() > 0 ? calculateDue() : 0,
              advancePay: calculateDue() < 0 ? Math.abs(calculateDue()) : 0,
              totalPay: calculateTotalPaid(),
              payment: paymentInstallments.map((payment) => ({
                method: payment.method,
                payDate: new Date(payment.date).toISOString(),
                paid: payment.amount,
                reference: payment.reference,
              })),
              note: remarks,
              appointmentId: response.data?.data?._id,
            };

            try {
              await axios.post(`${Base_url}/apis/invoice/create`, invoiceData);
              toast.success('Invoice created successfully!');
            } catch (error) {
              console.error('Error creating invoice:', error);
              // @ts-ignore
              toast.error(error?.response?.data?.message || 'An error occurred while creating invoice');
            }
          }
          setIsModalOpen(false);
          formik.resetForm();
          fetchAppointmentData();
        } else {
          toast.error(response?.data?.message);
        }
      } catch (error) {
        console.error('Error creating appointment:', error);
        if (error?.response?.data?.status === 'fail') {
          toast.error(error?.response?.data?.message);
        }
      } finally {
        setLoading(false);
      }
    },
  });

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
    setProcedures([
      ...procedures,
      {
        procedureId: '',
        description: '',
        rate: 0,
        quantity: 1,
        amount: 0,
        discount: 0,
        discountType: 'value',
        tax: 0,
        performedBy: formik.values.doctorId,
      },
    ]);
  };

  const handleProcedureChange = (index, field, value) => {
    const updatedProcedures = [...procedures];
    updatedProcedures[index][field] = value;

    if (field === 'procedureId') {
      const selectedProcedure = allProcedures.find((p) => p._id === value);
      if (selectedProcedure) {
        updatedProcedures[index].description = selectedProcedure.name;
        updatedProcedures[index].rate = selectedProcedure.amount;
        updatedProcedures[index].amount =
          selectedProcedure.amount * (updatedProcedures[index].quantity || 1);
      }
    }

    if (field === 'rate' || field === 'quantity') {
      updatedProcedures[index].amount =
        (updatedProcedures[index].rate || 0) * (updatedProcedures[index].quantity || 1);
    }

    if (
      field === 'discount' ||
      field === 'discountType'
    ) {
      const rate = Number(updatedProcedures[index].rate) || 0;
      const qty = Number(updatedProcedures[index].quantity) || 0;
      const amount = rate * qty;
      const discVal = Number(updatedProcedures[index].discount) || 0;
      if (updatedProcedures[index].discountType === 'percentage') {
        updatedProcedures[index].discount = (amount * discVal) / 100;
      }
    }

    if (field === 'discountType' && value === 'percentage') {
      updatedProcedures[index].discount =
        ((updatedProcedures[index].rate || 0) * (updatedProcedures[index].quantity || 1)) *
        (updatedProcedures[index].discount || 0) / 100;
    }

    // Recalculate shares (simple split logic similar to invoice screen)
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
      default: // 'Hospital & Doctor'
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
    setPaymentInstallments([
      ...paymentInstallments,
      {
        method: 'cash',
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        reference: '',
      },
    ]);
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

  const loadOptions = async (searchQuery, { page }) => {
    try {
      const response = await axios.get(
        `https://api.holisticare.pk/apis/patient/get`,
        {
          params: { page, limit: 20, search: searchQuery || '' },
        },
      );

      const { data, totalPages } = response.data;

      return {
        options: data.map((item) => ({
          label: item.name,
          value: item._id,
          patientData: item,
        })),
        hasMore: page < totalPages,
        additional: {
          page: page + 1,
        },
      };
    } catch (error) {
      console.error('Error fetching patients:', error);
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
      const response = await axios.get(`https://api.holisticare.pk/apis/user/get?role=doctor`, {
        params: { page, limit: 20, search: searchQuery || '' },
      });

      const { data, totalPages } = response.data;

      return {
        options: data.map((item) => ({
          label: item.name,
          value: item._id,
          doctorData: item,
        })),
        hasMore: page < totalPages,
        additional: {
          page: page + 1,
        },
      };
    } catch (error) {
      console.error('Error fetching doctors:', error);
      return {
        options: [],
        hasMore: false,
        additional: {
          page: page,
        },
      };
    }
  };

  const fetchDoctorAvailability = async (doctorId, date) => {
    console.log(doctorId, date);
    
    if (!doctorId || !date) {
      console.log('Missing doctorId or date');
      setAvailableTimeSlots([]);
      return;
    }
  
    try {
      const response = await axios.get(
        `https://api.holisticare.pk/apis/user/get/${doctorId}`,
      );
      
      const doctor = response.data.data;

      console.log(doctor);
      
      if (!doctor) {
        console.log('Doctor not found');
        setAvailableTimeSlots([]);
        return;
      }

      console.log(date, 'date');
      
      
      const selectedDate = new Date(date + "T17:00:00");
      console.log(selectedDate, 'selectedDate');
      
      const dayOfWeek = selectedDate.getUTCDay();
       console.log(dayOfWeek, 'dayOfWeek');
       
      
      const dayAvailabilityMap = {
        0: {
          available: doctor.sunday,
          startTime: doctor.sundayStartTime,
          endTime: doctor.sundayEndTime,
          slotDuration: doctor.sundayDuration
        },
        1: { 
          available: doctor.monday,
          startTime: doctor.mondayStartTime,
          endTime: doctor.mondayEndTime,
          slotDuration: doctor.mondayDuration
        },
        2: { // Tuesday
          available: doctor.tuesday,
          startTime: doctor.tuesdayStartTime,
          endTime: doctor.tuesdayEndTime,
          slotDuration: doctor.tuesdayDuration
        },
        3: { // Wednesday
          available: doctor.wednesday,
          startTime: doctor.wednesdayStartTime,
          endTime: doctor.wednesdayEndTime,
          slotDuration: doctor.wednesdayDuration
        },
        4: { // Thursday
          available: doctor.thursday,
          startTime: doctor.thursdayStartTime,
          endTime: doctor.thursdayEndTime,
          slotDuration: doctor.thursdayDuration
        },
        5: { // Friday
          available: doctor.friday,
          startTime: doctor.fridayStartTime,
          endTime: doctor.fridayEndTime,
          slotDuration: doctor.fridayDuration
        },
        6: { // Saturday
          available: doctor.saturday,
          startTime: doctor.saturdayStartTime,
          endTime: doctor.saturdayEndTime,
          slotDuration: doctor.saturdayDuration
        }
      };

      console.log(dayAvailabilityMap,'dayAvailabilityMap');
      
      
      const dayInfo = dayAvailabilityMap[dayOfWeek];
        console.log(dayInfo);
        
      if (!dayInfo || dayInfo.available !== true) {
        console.log('Doctor not available this day');
        toast.error('Doctor is not available on this day. Please select another date.');
        setAvailableTimeSlots([]);
        return;
      }
  
      // Improved time parsing function that handles both 12h and 24h formats
      const parseTime = (timeStr) => {
        if (!timeStr) return null;
        
        // Try to match 12-hour format (e.g., 9:30 AM or 1:30 PM)
        let timeParts = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
        let hours, minutes, period;
        
        if (timeParts) {
          hours = parseInt(timeParts[1], 10);
          minutes = parseInt(timeParts[2], 10);
          period = timeParts[3]?.toUpperCase();
        } else {
          // Try to match 24-hour format (e.g., 09:30 or 13:30)
          timeParts = timeStr.match(/(\d{1,2}):(\d{2})/);
          if (!timeParts) return null;
          
          hours = parseInt(timeParts[1], 10);
          minutes = parseInt(timeParts[2], 10);
          period = hours >= 12 ? 'PM' : 'AM';
        }
  
        // Convert to 24-hour format
        if (period === 'PM' && hours < 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
  
        // Validate hours and minutes
        if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
          return null;
        }
  
        return hours * 60 + minutes;
      };
  
      const startMinutes = parseTime(dayInfo.startTime);
      const endMinutes = parseTime(dayInfo.endTime);
      const duration = parseInt(dayInfo.slotDuration) || 30; // default to 30 minutes if not specified
  
      // Validate times
      if (startMinutes === null || endMinutes === null || startMinutes >= endMinutes) {
        console.log('Invalid time range');
        setAvailableTimeSlots([]);
        return;
      }
  
      // Generate time slots
      const slots = [];
      let current = startMinutes;
  
      while (current + duration <= endMinutes) {
        const startHours = Math.floor(current / 60);
        const startMins = current % 60;
        const endTime = current + duration;
        const endHours = Math.floor(endTime / 60);
        const endMins = endTime % 60;
  
        const formatTime = (hours, mins) => {
          const period = hours >= 12 ? 'PM' : 'AM';
          const displayHours = hours % 12 || 12;
          return `${displayHours.toString().padStart(2, '0')}:${mins
            .toString()
            .padStart(2, '0')} ${period}`;
        };
  
        slots.push({
          start: formatTime(startHours, startMins),
          end: formatTime(endHours, endMins),
          minutes: current
        });
  
        current += duration;
      }
  
      setAvailableTimeSlots(slots);
    } catch (error) {
      console.error('Error fetching doctor availability:', error);
      setAvailableTimeSlots([]);
    }
  };

  useEffect(() => {
    if (formik.values.doctorId && formik.values.appointmentDate) {
      fetchDoctorAvailability(
        formik.values.doctorId,
        formik.values.appointmentDate,
      );
    }
  }, [formik.values.doctorId, formik.values.appointmentDate]);



  

  const weekDays = [
    { value: 'M', label: 'Monday' },
    { value: 'T', label: 'Tuesday' },
    { value: 'W', label: 'Wednesday' },
    { value: 'Th', label: 'Thursday' },
    { value: 'F', label: 'Friday' },
    { value: 'S', label: 'Saturday' },
    { value: 'Su', label: 'Sunday' },
  ];

  const fetchProcedures = async () => {
      try {
        const response = await axios.get(`${Base_url}/apis/procedure/get`);
        setAllProcedures(response?.data?.data || []);
      } catch (error) {
        console.error("Error fetching procedures:", error);
      }
    };

    useEffect(()=>{
      fetchProcedures();
    },[])

    const [openModal,setOpenModal] = useState(false); 
  const [patientsCache, setPatientsCache] = useState({ options: [], hasMore: true, page: 1 });

  return (
    <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
      <div className="p-3.5 flex justify-between items-center">
        <h1 className="capitalize text-black h4 font-semibold text-xl">
          Add Appointment
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
            <div className='w-[70%] gap-4 flex flex-row items-center'>
 <div className="  gap-2 w-full">
              <AsyncPaginate
                name="patientId"
                value={
                  formik.values.patientId
                    ? {
                        value: formik.values.patientId,
                        label: formik.values.patientName || 'Select patient',
                      }
                    : null
                }
                loadOptions={loadOptions}
                onChange={(option) => {
                  formik.setFieldValue('patientId', option?.value || '');
                  formik.setFieldValue('patientName', option?.label || '');
                }}
                onBlur={formik.handleBlur}
                getOptionLabel={(option) => option.label}
                getOptionValue={(option) => option.value}
                placeholder="Select a patient..."
                additional={{ page: 1 }}
                classNamePrefix="react-select"
                className="w-full"
              />
              {formik.touched.patientId && formik.errors.patientId && (
                <div className="text-red-500 text-xs">
                  {formik.errors.patientId}
                </div>
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
           
          </section>

          {/* Doctor Section */}
          <section className="flex justify-between items-center">
            <h2 className="font-medium text-sm mb-2">Doctor</h2>
            <div className="w-[70%] flex flex-col gap-2">
              <AsyncPaginate
                name="doctorId"
                value={
                  formik.values.doctorId
                    ? {
                        value: formik.values.doctorId,
                        label: formik.values.doctorName || 'Select doctor',
                      }
                    : null
                }
                loadOptions={loadDoctorOptions}
                onChange={(option) => {
                  formik.setFieldValue('doctorId', option?.value || '');
                  formik.setFieldValue('doctorName', option?.label || '');
                }}
                onBlur={formik.handleBlur}
                getOptionLabel={(option) => option.label}
                getOptionValue={(option) => option.value}
                placeholder="Select a doctor..."
                additional={{ page: 1 }}
                classNamePrefix="react-select"
                className="w-full"
              />
              {formik.touched.doctorId && formik.errors.doctorId && (
                <div className="text-red-500 text-xs">
                  {formik.errors.doctorId}
                </div>
              )}
            </div>
          </section>

          {/* Appointment Date */}
          <section className="flex justify-between items-center">
            <h2 className="font-medium mb-2 text-sm">Appointment Date</h2>
            <div className="w-[70%] flex flex-col gap-2">
              <input
                name="appointmentDate"
                type="date"
                className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                value={formik.values.appointmentDate}
                onChange={(e) => {
                  formik.handleChange(e);
                  if (formik.values.doctorId) {
                    fetchDoctorAvailability(
                      formik.values.doctorId,
                      e.target.value,
                    );
                  }
                }}
                onBlur={formik.handleBlur}
                // min={new Date().toISOString().split('T')[0]}
              />
              {formik.touched.appointmentDate &&
                formik.errors.appointmentDate && (
                  <div className="text-red-500 text-xs">
                    {formik.errors.appointmentDate}
                  </div>
                )}
            </div>
          </section>

          {/* Time Slots */}
          <section className="flex justify-between items-center">
            <h2 className="font-medium mb-2 text-sm">Start Time</h2>
            <div className="w-[70%] flex flex-col gap-2">
              <select
                name="startTime"
                className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                value={formik.values.startTime}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                disabled={
                  !formik.values.doctorId || !formik.values.appointmentDate
                }
              >
                <option value="">Select start time</option>
                {availableTimeSlots.map((slot, index) => (
                  <option key={index} value={slot.start}>
                    {slot.start}
                  </option>
                ))}
              </select>
              {formik.touched.startTime && formik.errors.startTime && (
                <div className="text-red-500 text-xs">
                  {formik.errors.startTime}
                </div>
              )}
            </div>
          </section>

          <section className="flex justify-between items-center">
            <h2 className="font-medium mb-2 text-sm">End Time</h2>
            <div className="w-[70%] flex flex-col gap-2">
              <select
                name="endTime"
                className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                value={formik.values.endTime}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                disabled={!formik.values.startTime}
              >
                <option value="">Select end time</option>
                {availableTimeSlots
                  .filter((slot) => slot.start === formik.values.startTime)
                  .map((slot) => (
                    <option key={slot.end} value={slot.end}>
                      {slot.end}
                    </option>
                  ))}
              </select>
              {formik.touched.endTime && formik.errors.endTime && (
                <div className="text-red-500 text-xs">
                  {formik.errors.endTime}
                </div>
              )}
            </div>
          </section>

        
        <section className="flex items-center gap-4">
          <input
            type="checkbox"
            name="createInvoice"
            id="createInvoice"
            checked={formik.values.createInvoice}
            onChange={(e) => {
              formik.handleChange(e);
              setShowInvoiceFields(e.target.checked);
            }}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <label htmlFor="createInvoice" className="font-medium text-sm">
            Create Invoice
          </label>
        </section>

        {formik.values.createInvoice && (
          <div className="space-y-6 rounded-lg">
            <h3 className="font-semibold text-lg">Invoice Details</h3>

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
                      loadOptions={loadProcedureOptions}
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
                      onChange={(e) => handleProcedureChange(index, 'quantity', Number(e.target.value))}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className='pb-2'>Rate</label>
                    <input
                      type="number"
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3"
                      value={procedure.rate}
                      onChange={(e) => handleProcedureChange(index, 'rate', Number(e.target.value))}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className='pb-2'>Discount</label>
                    <input
                      type="number"
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3"
                      value={procedure.discount}
                      onChange={(e) => handleProcedureChange(index, 'discount', Number(e.target.value))}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className='pb-2'>Disc. Type</label>
                    <select
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
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
                  <div className="col-span-2">
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
                      loadOptions={loadDoctorOptions}
                      onChange={(option) => handleProcedureChange(index, 'performedBy', option?.value || '')}
                      additional={{ page: 1 }}
                      getOptionLabel={(option) => option.label}
                      getOptionValue={(option) => option.value}
                      placeholder="Select doctor..."
                      classNamePrefix="react-select"
                      className="w-full"
                    />
                  </div>
                  <div className="col-span-3">
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
                      className="p-2 text-red-600 hover:text-red-800"
                    >
                      <RiDeleteBin5Fill size={20} />
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddProcedure}
                className="mt-2 inline-flex items-center gap-2 rounded-md bg-primary py-2 px-4 text-sm font-medium text-white hover:bg-opacity-90"
              >
                <FaPlus size={14} /> Add Procedure
              </button>
            </div>

            <div>
              <h4 className="font-medium mb-2">Payments</h4>
              {paymentInstallments.map((payment, index) => (
                <div key={index} className="grid grid-cols-5 gap-2 mb-3">
                  <div>
                    <label className='pb-2'>Method</label>
                    <select
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3"
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
                  <div>
                    <label className='pb-2'>Date</label>
                    <input
                      type="date"
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3"
                      value={payment.date}
                      onChange={(e) => handlePaymentChange(index, 'date', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className='pb-2'>Amount</label>
                    <input
                      type="number"
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3"
                      value={payment.amount}
                      onChange={(e) => handlePaymentChange(index, 'amount', Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className='pb-2'>Reference</label>
                    <input
                      type="text"
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3"
                      value={payment.reference}
                      onChange={(e) => handlePaymentChange(index, 'reference', e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => handleRemovePayment(index)}
                      className="p-2 text-red-600 hover:text-red-800"
                    >
                      <RiDeleteBin5Fill size={20} />
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddPayment}
                className="mt-2 inline-flex items-center gap-2 rounded-md bg-primary py-2 px-4 text-sm font-medium text-white hover:bg-opacity-90"
              >
                <FaPlus size={14} /> Add Payment
              </button>
            </div>

            <div className=' flex w-full gap-6'>
            <section className=' w-6/12'>
              <label className="font-medium pb-1 text-sm mb-2">Comment</label>
              <textarea
                name="remarks"
                placeholder="Add Comments"
                className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 text-sm px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </section>

            <div className="grid grid-cols-1 w-6/12  gap-4">
              
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
          </div>
        )}
          {/* <section className="flex justify-between items-center">
            <h2 className="font-medium mb-2 text-sm">Procedure</h2>
            <div className="w-[70%] flex flex-col gap-2">
              <AsyncPaginate
                name="procedureId"
                value={
                  formik.values.procedureId
                    ? {
                        value: formik.values.procedureId,
                        label: formik.values.procedureName || 'Select procedure',
                      }
                    : null
                }
                loadOptions={loadProcedureOptions}
                onChange={(option) => {
                  formik.setFieldValue('procedureId', option?.value || '');
                  formik.setFieldValue('procedureName', option?.label || '');
                }}
                onBlur={formik.handleBlur}
                getOptionLabel={(option) => option.label}
                getOptionValue={(option) => option.value}
                placeholder="Select a procedure..."
                additional={{ page: 1 }}
                classNamePrefix="react-select"
                className="w-full"
                menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                menuPosition="fixed"
                styles={{
                  menuPortal: base => ({ ...base, zIndex: 9999 }),
                }}
              />
              {formik.touched.procedureId && formik.errors.procedureId && (
                <div className="text-red-500 text-xs">
                  {formik.errors.procedureId}
                </div>
              )}
            </div>
          </section> */}

      
          <section className="flex items-center gap-4">
            <input
              type="checkbox"
              name="isRecurring"
              id="isRecurring"
              checked={formik.values.isRecurring}
              onChange={formik.handleChange}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="isRecurring" className="font-medium text-sm">
              Recurring Appointment
            </label>
          </section>

          {formik.values.isRecurring && (
            <>
              <section className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="font-medium text-sm">Repeat Every</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      name="repeatEvery"
                      min="1"
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                      value={formik.values.repeatEvery}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    />
                    <select
                      name="repeatUnit"
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                      value={formik.values.repeatUnit}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    >
                      <option value="Day">Day(s)</option>
                      <option value="Week">Week(s)</option>
                      <option value="Month">Month(s)</option>
                    </select>
                  </div>
                  {formik.touched.repeatEvery && formik.errors.repeatEvery && (
                    <div className="text-red-500 text-xs">
                      {formik.errors.repeatEvery}
                    </div>
                  )}
                  {formik.touched.repeatUnit && formik.errors.repeatUnit && (
                    <div className="text-red-500 text-xs">
                      {formik.errors.repeatUnit}
                    </div>
                  )}
                </div>

                {formik.values.repeatUnit === 'Week' && (
                  <div className="col-span-2 flex flex-col gap-2">
                    <label className="font-medium text-sm">Repeat On</label>
                    <div className="flex flex-wrap gap-2">
                      {weekDays.map((day) => (
                        <div key={day.value} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`repeatDay-${day.value}`}
                            checked={formik.values.repeatDays.includes(
                              day.value,
                            )}
                            onChange={(e) => {
                              const newRepeatDays = e.target.checked
                                ? [...formik.values.repeatDays, day.value]
                                : formik.values.repeatDays.filter(
                                    (d) => d !== day.value,
                                  );
                              formik.setFieldValue('repeatDays', newRepeatDays);
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <label
                            htmlFor={`repeatDay-${day.value}`}
                            className="ml-2 text-sm"
                          >
                            {day.label}
                          </label>
                        </div>
                      ))}
                    </div>
                    {formik.touched.repeatDays && formik.errors.repeatDays && (
                      <div className="text-red-500 text-xs">
                        {formik.errors.repeatDays}
                      </div>
                    )}
                  </div>
                )}

                <div className="col-span-3 flex flex-col gap-2">
                  <label className="font-medium text-sm">Ends</label>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="endsNever"
                        name="endsOption"
                        checked={!formik.values.endsOn}
                        onChange={() => formik.setFieldValue('endsOn', null)}
                        className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                      />
                      <label htmlFor="endsNever" className="ml-2 text-sm">
                        Never
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        id="endsOnDate"
                        name="endsOption"
                        checked={!!formik.values.endsOn}
                        onChange={() =>
                          formik.setFieldValue(
                            'endsOn',
                            moment(formik.values.appointmentDate)
                              .add(1, 'month')
                              .format('YYYY-MM-DD'),
                          )
                        }
                        className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                      />
                      <label htmlFor="endsOnDate" className="ml-2 text-sm">
                        On
                      </label>
                      <input
                        type="date"
                        name="endsOn"
                        className="rounded border-[1.5px] border-stroke bg-transparent py-2 px-3 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                        value={formik.values.endsOn || ''}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        disabled={!formik.values.endsOn}
                        min={formik.values.appointmentDate}
                      />
                    </div>
                  </div>
                  {formik.touched.endsOn && formik.errors.endsOn && (
                    <div className="text-red-500 text-xs">
                      {formik.errors.endsOn}
                    </div>
                  )}
                </div>
              </section>
            </>
          )}

          <div className="flex justify-center pb-3">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2.5 rounded-md bg-primary py-3 w-60 whitespace-nowrap text-center font-medium text-white hover:bg-opacity-90 lg:px-8 xl:px-10 disabled:opacity-50"
            >
              {loading ? 'Processing...' : <>Add Appointment</>}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default AddAppointments;
