import React, { useEffect, useState } from 'react';
import { MdClose, MdDateRange, MdOutlineSmartphone, MdOutlineWatchLater } from 'react-icons/md';
import Modal from '../../components/modal';
import { FaPaperPlane, FaFile } from 'react-icons/fa';
import { AsyncPaginate } from 'react-select-async-paginate';
import axios from 'axios';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import moment from 'moment';
import { Base_url } from '../../utils/Base_url';
import { Link } from 'react-router-dom';
import { RiHealthBookLine } from 'react-icons/ri';

interface EditAppointmentProps {
  isModalOpen: boolean;
  setIsModalOpen: (isOpen: boolean) => void;
  selectedAppointment: any;
  fetchAppointmentData: () => void;
  doctors: any[];
}

const EditAppointment: React.FC<EditAppointmentProps> = ({
  isModalOpen,
  setIsModalOpen,
  selectedAppointment,
  fetchAppointmentData,
  doctors
}) => {
  const [loading, setLoading] = useState(false);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<{ start: string; end: string; minutes: number }[]>([]);
  const [allProcedures, setAllProcedures] = useState([]);
  const [status, setStatus] = useState<{
    scheduled: boolean;
    confirmed: boolean;
    checkedIn: boolean;
    completed: boolean;
    noShow: boolean;
  }>({
    scheduled: false,
    confirmed: false,
    checkedIn: false,
    completed: false,
    noShow: false,
  });


  console.log(selectedAppointment);
  
  const validationSchema = Yup.object().shape({
   patientId: Yup.string().required('Patient is required'),
  doctorId: Yup.string().required('Doctor is required'),
  appointmentDate: Yup.string()
    .required('Appointment date is required'),
  startTime: Yup.string()
    .required('Start time is required'),
  endTime: Yup.string().required('End time is required'),
  appointmentStatus: Yup.string().required('Status is required'),
  });

  const formik = useFormik({
    initialValues: {
      patientId: '',
      patientName: '',
      patientMr: '',
      doctorId: '',
      doctorName: '',
      appointmentDate:'',
      startTime: '',
      endTime: '',
      procedureId: '',
      procedureName: '',
      consultationType: 'Inperson',
      appointmentStatus: '',
      comment: ''
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        setLoading(true);
        
        // Determine the current status from the state
        let currentStatus = 'Scheduled';
        if (status.confirmed) currentStatus = 'confirmed';
        else if (status.checkedIn) currentStatus = 'checked-in';
        else if (status.completed) currentStatus = 'completed';
        else if (status.noShow) currentStatus = 'no-show';
        
        // Clean up the data before sending
        const updateData = {
          ...values,
          appointmentStatus: currentStatus,
          // Ensure appointment date is properly formatted
          appointmentDate: values.appointmentDate ? moment(values.appointmentDate).format('YYYY-MM-DD') : undefined,
          // Remove empty procedureId to prevent MongoDB error
          procedureId: values.procedureId && values.procedureId.trim() !== '' ? values.procedureId : undefined,
          // Remove empty fields that might cause issues
          procedureName: values.procedureName && values.procedureName.trim() !== '' ? values.procedureName : undefined,
          comment: values.comment && values.comment.trim() !== '' ? values.comment : undefined
        };
        
        const response = await axios.put(
          `${Base_url}/apis/appointment/update/${selectedAppointment._id}`,
          updateData
        );

        if (response?.data?.status === 'ok') {
          toast.success('Appointment updated successfully');
          setIsModalOpen(false);
          // Refresh the appointment data
          if (typeof fetchAppointmentData === 'function') {
            await fetchAppointmentData();
            // Add a small delay to ensure calendar updates properly
            setTimeout(() => {
              // Force a re-render if needed
            }, 100);
          }
          // Reset form and status
          formik.resetForm();
          setStatus({
            scheduled: false,
            confirmed: false,
            checkedIn: false,
            completed: false,
            noShow: false,
          });
        } else {
          toast.error(response?.data?.message || 'Failed to update appointment');
        }
      } catch (error: any) {
        console.error('Error updating appointment:', error);
        if (error?.response?.data?.status === 'fail') {
          toast.error(error?.response?.data?.message || 'Failed to update appointment');
        } else {
          toast.error('An error occurred while updating the appointment');
        }
      } finally {
        setLoading(false);
      }
    },
  });

  const loadOptions = async (searchQuery: string, { page }: { page: number }) => {
    try {
      const response = await axios.get(
        `${Base_url}/apis/patient/get`,
        {
          params: { page, limit: 20, search: searchQuery || '' },
        },
      );

      const { data, totalPages } = response.data;

      return {
        options: data.map((item: any) => ({
          label: item.name,
          value: item._id,
          patientData: item as any,
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

  const fetchDoctorAvailability = async (doctorId: string, date: string) => {
    if (!doctorId || !date) {
      setAvailableTimeSlots([]);
      return;
    }

    try {
      const response = await axios.get(
        `${Base_url}/apis/user/get/${doctorId}`,
      );
      
      const doctor = response.data.data;
      
      if (!doctor) {
        setAvailableTimeSlots([]);
        return;
      }

      const selectedDate = new Date(date);
      const dayOfWeek = selectedDate.getUTCDay();
      
      const dayAvailabilityMap: { [key: number]: { available: any; startTime: any; endTime: any; slotDuration: any; } } = {
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
        2: {
          available: doctor.tuesday,
          startTime: doctor.tuesdayStartTime,
          endTime: doctor.tuesdayEndTime,
          slotDuration: doctor.tuesdayDuration
        },
        3: {
          available: doctor.wednesday,
          startTime: doctor.wednesdayStartTime,
          endTime: doctor.wednesdayEndTime,
          slotDuration: doctor.wednesdayDuration
        },
        4: {
          available: doctor.thursday,
          startTime: doctor.thursdayStartTime,
          endTime: doctor.thursdayEndTime,
          slotDuration: doctor.thursdayDuration
        },
        5: {
          available: doctor.friday,
          startTime: doctor.fridayStartTime,
          endTime: doctor.fridayEndTime,
          slotDuration: doctor.fridayDuration
        },
        6: {
          available: doctor.saturday,
          startTime: doctor.saturdayStartTime,
          endTime: doctor.saturdayEndTime,
          slotDuration: doctor.saturdayDuration
        }
      };

      const dayInfo = dayAvailabilityMap[dayOfWeek];
        
      if (!dayInfo || dayInfo.available !== true) {
        setAvailableTimeSlots([]);
        return;
      }

      const parseTime = (timeStr: string) => {
        if (!timeStr) return null;
        
        let timeParts = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
        let hours, minutes, period;
        
        if (timeParts) {
          hours = parseInt(timeParts[1], 10);
          minutes = parseInt(timeParts[2], 10);
          period = timeParts[3]?.toUpperCase();
        } else {
          timeParts = timeStr.match(/(\d{1,2}):(\d{2})/);
          if (!timeParts) return null;
          
          hours = parseInt(timeParts[1], 10);
          minutes = parseInt(timeParts[2], 10);
          period = hours >= 12 ? 'PM' : 'AM';
        }

        if (period === 'PM' && hours < 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;

        if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
          return null;
        }

        return hours * 60 + minutes;
      };

      const startMinutes = parseTime(dayInfo.startTime);
      const endMinutes = parseTime(dayInfo.endTime);
      const duration = parseInt(dayInfo.slotDuration) || 30;

      if (startMinutes === null || endMinutes === null || startMinutes >= endMinutes) {
        setAvailableTimeSlots([]);
        return;
      }

      const slots = [];
      let current = startMinutes;

      while (current + duration <= endMinutes) {
        const startHours = Math.floor(current / 60);
        const startMins = current % 60;
        const endTime = current + duration;
        const endHours = Math.floor(endTime / 60);
        const endMins = endTime % 60;

        const formatTime = (hours: number, mins: number) => {
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

  const isPastDateTime = (date: string, time: string) => {
    if (!date || !time) return false;
    
    const selectedDate = new Date(date);
    const now = new Date();
    
    // If selected date is before today, it's definitely in the past
    if (selectedDate.toDateString() < now.toDateString()) {
      return true;
    }
    
    // If selected date is today, we need to check the time
    if (selectedDate.toDateString() === now.toDateString()) {
      const [timePart, period] = time.split(' ');
      let [hours, minutes] = timePart.split(':').map(Number);
      
      // Convert to 24-hour format
      if (period === 'PM' && hours < 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      
      const selectedDateTime = new Date();
      selectedDateTime.setHours(hours, minutes, 0, 0);
      
      // Add 30 minutes buffer to current time to allow some flexibility
      const bufferTime = new Date(now.getTime() + 30 * 60 * 1000);
      
      return selectedDateTime < bufferTime;
    }
    
    return false;
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
    if (formik.values.doctorId && formik.values.appointmentDate) {
      fetchDoctorAvailability(
        formik.values.doctorId,
        formik.values.appointmentDate,
      );
    }
  }, [formik.values.doctorId, formik.values.appointmentDate]);

  useEffect(() => {
    fetchProcedures();
  }, []);

  useEffect(() => {
    if (selectedAppointment && isModalOpen) {
      // Ensure proper date formatting for the form
      let appointmentDate = new Date().toISOString().split('T')[0];
      
      if (selectedAppointment.appointmentDate) {
        try {
          // Try different date formats
          const date = moment(selectedAppointment.appointmentDate);
          if (date.isValid()) {
            appointmentDate = date.format('YYYY-MM-DD');
          } else {
            // Fallback to UTC parsing
            const utcDate = moment.utc(selectedAppointment.appointmentDate);
            if (utcDate.isValid()) {
              appointmentDate = utcDate.format('YYYY-MM-DD');
            }
          }
        } catch (error) {
          console.error('Error parsing appointment date:', error);
        }
      }
      
      // Reset form with new values
      formik.setValues({
        patientId: selectedAppointment.patientId?._id || '',
        patientName: selectedAppointment.patientId?.name || '',
        patientMr: selectedAppointment.patientId?.mr || '',
        doctorId: selectedAppointment.doctorId?._id || '',
        doctorName: selectedAppointment.doctorId?.name || '',
        appointmentDate: appointmentDate,
        startTime: selectedAppointment.startTime || '',
        endTime: selectedAppointment.endTime || '',
        procedureId: selectedAppointment.procedureId || '',
        procedureName: selectedAppointment.procedureName || '',
        consultationType: selectedAppointment.consultationType || 'Inperson',
        appointmentStatus: selectedAppointment.appointmentStatus || 'Scheduled',
        comment: selectedAppointment.comment || ''
      });
  
      // Update status based on appointment status
      const statusValue = selectedAppointment.appointmentStatus || 'Scheduled';
      setStatus({
        scheduled: statusValue.toLowerCase() === 'scheduled',
        confirmed: statusValue.toLowerCase() === 'confirmed',
        checkedIn: statusValue.toLowerCase() === 'checked-in',
        completed: statusValue.toLowerCase() === 'completed',
        noShow: statusValue.toLowerCase() === 'no-show',
      });
  
      // If procedureId exists in the appointment, fetch procedures and set the procedureName
      if (selectedAppointment.procedureId) {
        fetchProcedures().then(() => {
          const selectedProcedure = allProcedures.find(p => p._id === selectedAppointment.procedureId);
          if (selectedProcedure) {
            formik.setFieldValue('procedureName', selectedProcedure.name);
          }
        });
      }
  
      // Fetch doctor's availability for the appointment date
      if (selectedAppointment.doctorId?._id && selectedAppointment.appointmentDate) {
        fetchDoctorAvailability(
          selectedAppointment.doctorId._id,
          moment(selectedAppointment.appointmentDate).format('YYYY-MM-DD')
        );
      }
    }
  }, [selectedAppointment, isModalOpen]);

  const handleStatusChange = (statusName: keyof typeof status) => {
    const newStatus = {
      scheduled: statusName === 'scheduled',
      confirmed: statusName === 'confirmed',
      checkedIn: statusName === 'checkedIn',
      completed: statusName === 'completed',
      noShow: statusName === 'noShow',
    };
    setStatus(newStatus);
    
    // Also update formik value
    let statusString = 'Scheduled';
    if (statusName === 'confirmed') statusString = 'Confirmed';
    else if (statusName === 'checkedIn') statusString = 'Checked-in';
    else if (statusName === 'completed') statusString = 'Completed';
    else if (statusName === 'noShow') statusString = 'No-Show';
    
    formik.setFieldValue('appointmentStatus', statusString);
  };

  // Function to clean up form data before submission
  const cleanFormData = (data: any) => {
    const cleaned = { ...data };
    
    // Remove empty strings and convert them to undefined
    Object.keys(cleaned).forEach(key => {
      if (typeof cleaned[key] === 'string' && cleaned[key].trim() === '') {
        cleaned[key] = undefined;
      }
    });
    
    return cleaned;
  };

  return (
    <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
      <div className="max-h-[80vh] overflow-y-auto w-full max-w-2xl">
        <div className="p-4 flex justify-between items-start ">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Mr {selectedAppointment?.patientId?.name}</h1>
            <div className="flex items-center space-x-4 mt-1">
              <span className="text-sm text-gray-600">MR# {selectedAppointment?.patientId?.mr}</span>
              <span className="text-sm text-gray-600">Visit# 1</span>
            </div>
          </div>
          <MdClose
            onClick={() => setIsModalOpen(false)}
            size={24}
            className="text-gray-500 cursor-pointer hover:text-gray-700"
          />
        </div>

        {/* Status Checkboxes */}
       {/* Status Checkboxes */}
<div className="p-4 border-b border-gray">
  <div className="flex max-w-lg flex-wrap gap-2">
    <div 
      className={`flex items-center px-3 py-1 rounded-sm border ${status.scheduled ? 'bg-[#F4F6F9] border-[#11438F]' : 'bg-gray-100 border-gray-300'}`}
      onClick={() => handleStatusChange('scheduled')}
    >
      <span className='w-2 h-2 mr-2 rounded-full bg-[#11438F]'></span>
      <label className="text-sm cursor-pointer">Scheduled</label>
    </div>
    <div 
      className={`flex items-center px-3 py-1 rounded-sm border ${status.confirmed ? 'bg-[#F0F9FF] border-[#0C7EBB]' : 'bg-gray-100 border-gray-300'}`}
      onClick={() => handleStatusChange('confirmed')}
    >
      <span className='w-2 h-2 mr-2 rounded-full bg-[#0C7EBB]'></span>
      <label className="text-sm cursor-pointer">Confirmed</label>
    </div>
    <div 
      className={`flex items-center px-3 py-1 rounded-sm border ${status.checkedIn ? 'bg-[#F0FDF4] border-[#0D9D58]' : 'bg-gray-100 border-gray-300'}`}
      onClick={() => handleStatusChange('checkedIn')}
    >
      <span className='w-2 h-2 mr-2 rounded-full bg-[#0D9D58] bg-gray-400'></span>
      <label className="text-sm cursor-pointer">Checked In</label>
    </div>
    <div 
      className={`flex items-center px-3 py-1 rounded-sm border ${status.completed ? 'bg-[#F5F3FF] border-[#7E56DA]' : 'bg-gray-100 border-gray-300'}`}
      onClick={() => handleStatusChange('completed')}
    >
      <span className='w-2 h-2 mr-2 rounded-full bg-[#7E56DA] bg-gray-400'></span>
      <label className="text-sm cursor-pointer">Completed</label>
    </div>
    <div 
      className={`flex items-center px-3 py-1 rounded-sm border ${status.noShow ? 'bg-[#FEF2F2] border-[#DC2626]' : 'bg-gray-100 border-gray-300'}`}
      onClick={() => handleStatusChange('noShow')}
    >
      <span className='w-2 h-2 mr-2 rounded-full bg-[#DC2626] bg-gray-400'></span>
      <label className="text-sm cursor-pointer">No Show</label>
    </div>
  </div>
</div>

        {/* Appointment Consultation Section */}
        <div className="p-4 border-b">
          <h3 className="font-semibold text-gray-700 mb-3">Appointment Consultation</h3>
          <div className="flex flex-wrap flex-col  gap-2">
            <div className="flex items-center">
             
              <label htmlFor="appointmentDate" className="text-sm flex items-center gap-2">
              <MdDateRange size={15} />              {moment(formik.values.appointmentDate).format('dddd, MMMM DD')}
              </label>
            </div>
            <div className="flex items-center">
             
             <label htmlFor="appointmentDate" className="text-sm flex items-center gap-2">
             <MdOutlineWatchLater />
  {selectedAppointment?.startTime} - {selectedAppointment?.endTime}
             </label>
           </div>
           <div className="flex items-center">
             
             <label htmlFor="appointmentDate" className="text-sm flex items-center gap-2">
             <MdOutlineSmartphone />
             {selectedAppointment?.patientId?.phone}
             </label>
           </div>
           
           <div className="flex items-center">
             
             <label htmlFor="appointmentDate" className="text-sm flex items-center gap-2">
             <RiHealthBookLine />

               <Link to={'/invoice/new'} className=' text-primary'>
                 Add Health Record
               </Link>
             </label>
           </div>


          
            {/* <button className="flex items-center text-sm text-primary hover:text-primary-dark">
              <FaPaperPlane className="mr-1" size={14} />
              Send message
            </button>
            <button className="flex items-center text-sm text-primary hover:text-primary-dark">
              <FaFile className="mr-1" size={14} />
              Add File
            </button> */}
          </div>
        </div>

        <form onSubmit={formik.handleSubmit} className="p-4 space-y-4">
          {/* Patient Section */}
          <section className="flex justify-between items-center">
            <h2 className="font-medium text-sm mb-2">Patient</h2>
            <div className="w-[70%] flex flex-col gap-2">
              <AsyncPaginate
                name="patientId"
                value={
                  formik.values.patientId
                    ? {
                        value: formik.values.patientId,
                        label: `${formik.values.patientName} (MR: ${formik.values.patientMr})`
                      }
                    : null
                }
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
                className="w-full"
              />
              {formik.touched.patientId && formik.errors.patientId && (
                <div className="text-red-500 text-xs">
                  {formik.errors.patientId}
                </div>
              )}
            </div>
          </section>

          {/* Doctor Section */}
          <section className="flex justify-between items-center">
            <h2 className="font-medium text-sm mb-2">Doctor</h2>
            <div className="w-[70%] flex flex-col gap-2">
              <select
                name="doctorId"
                className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                value={formik.values.doctorId}
                onChange={(e) => {
                  formik.handleChange(e);
                  const selectedDoctor = doctors.find(d => d._id === e.target.value);
                  formik.setFieldValue('doctorName', selectedDoctor?.name || '');
                }}
                onBlur={formik.handleBlur}
              >
                <option value="">Select a doctor</option>
                {doctors.map((doctor) => (
                  <option key={doctor._id} value={doctor._id}>
                    {doctor.name}
                  </option>
                ))}
              </select>
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
  disabled={!formik.values.doctorId || !formik.values.appointmentDate}
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

          {/* Procedure Section */}
          {/* <section className="flex justify-between items-center">
            <h2 className="font-medium mb-2 text-sm">Procedure</h2>
            <div className="w-[70%] flex flex-col gap-2">
              <select
                name="procedureId"
                className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                value={formik.values.procedureId}
                onChange={(e) => {
                  formik.handleChange(e);
                  const selectedProcedure = allProcedures.find(p => p._id === e.target.value);
                  formik.setFieldValue('procedureName', selectedProcedure?.name || '');
                }}
                onBlur={formik.handleBlur}
              >
                <option value="">Select Procedure</option>
                {allProcedures.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.name}
                  </option>
                ))}
              </select>
              {formik.touched.procedureId && formik.errors.procedureId && (
                <div className="text-red-500 text-xs">
                  {formik.errors.procedureId}
                </div>
              )}
            </div>
          </section> */}

          {/* Comment Section */}
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Comment</h3>
            <textarea
              name="comment"
              rows={3}
              className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
              value={formik.values.comment}
              onChange={formik.handleChange}
            ></textarea>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center mt-6">
            {/* <Link to={'/invoice/new'}>
            <button
              type="button"
              className="px-4 py-2 border border-primary text-primary rounded hover:bg-primary hover:text-white transition"
            >
              Print Invoice
            </button>
            </Link> */}
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-primary text-white rounded hover:bg-primary-dark transition disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Update Appointment'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default EditAppointment;