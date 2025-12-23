import React, { useEffect, useState } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { FaPlus, FaCalendarAlt, FaUserMd } from 'react-icons/fa';
import AddTokenForm from './AddTokenForm';
import AddAppointments from './AddAppointments';
import AddLeaveForm from './AddLeave';
import Header from '../../components/Header';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import axios from 'axios';
import { Base_url } from '../../utils/Base_url';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import EditTokenForm from './EditTokenForm';
import EditAppointment from './EditAppointment';


const localizer = momentLocalizer(moment);

interface Department {
  _id: string;
  name: string;
  subDepartment: string[];
}

interface Doctor {
  _id: string;
  name: string;
  gender: string;
  phone: string;
  email: string;
  departmentId: Department;
  role: string;
  qualification: string[];
  monday: boolean;
  mondayStartTime: string;
  mondayEndTime: string;
  mondayDuration: string;
  tuesday: boolean;
  tuesdayStartTime: string;
  tuesdayEndTime: string;
  tuesdayDuration: string;
  wednesday: boolean;
  wednesdayStartTime: string;
  wednesdayEndTime: string;
  wednesdayDuration: string;
  thursday: boolean;
  thursdayStartTime: string;
  thursdayEndTime: string;
  thursdayDuration: string;
  friday: boolean;
  fridayStartTime: string;
  fridayEndTime: string;
  fridayDuration: string;
  saturday: boolean;
  saturdayStartTime: string;
  saturdayEndTime: string;
  saturdayDuration: string;
  sunday: boolean;
  sundayStartTime: string;
  sundayEndTime: string;
  sundayDuration: string;
}

interface Appointment {
  _id: string;
  patientId: {
    _id: string;
    mr: string;
    name: string;
    gender: string;
    phone: string;
    cnic: string;
    image: string;
    dob: string;
    doctorId: string;
  };
  doctorId: Doctor;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  consultationType: string;
  status: string;
}

interface Token {
  _id: string;
  tokenNumber: string;
  tokenDate: string;
  comment: string;
  patientId: {
    _id: string;
    mr: string;
    name: string;
    gender: string;
    phone: string;
    cnic: string;
    image: string;
    dob: string;
    doctorId: string;
  };
  doctorId: Doctor;
  createdAt: string;
  updatedAt: string;
  __v: number;
  tokenStatus: string;
}

interface Event {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resourceId: string;
  type: 'appointment' | 'token';
  patientName?: string;
  patientId?: string;
  status?: 'scheduled' | 'checked-in' | 'completed' | 'no-show' | 'cancelled';
  tokenNumber?: string;
  doctorName?: string;
  appointmentStatus?: string;
}

const GeneralConsultations: React.FC = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [statusScheduled, setStatusScheduled] = useState<string>('');
  const [statusCheckedIn, setStatusCheckedIn] = useState<string>('');
  const [statusEngaged, setStatusEngaged] = useState<string>('');
  const [statusCheckOut, setStatusCheckOut] = useState<string>('');
  const [statusNoShow, setStatusNoShow] = useState<string>('');
  const [statusConfirmed, setStatusConfirmed] = useState<string>('');
  const [totalAppointment, setTotalAppointment] = useState<Appointment[]>([]);
  const [totalTokens, setTotalTokens] = useState<Token[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [currentView, setCurrentView] = useState<'doctor' | 'calendar'>(
    'calendar',
  );
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);
  const [consultationType, setConsultationType] = useState<'token' | 'general'>(
    'general',
  );

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);

  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [openTokenModal, setOpenTokenModal] = useState(false);
  const [openLeaveModal, setOpenLeaveModal] = useState(false);
  const [openAppointmentModal, setOpenAppointmentModal] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [openEditTokenModal, setOpenEditTokenModal] = useState(false);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);

  const [view, setView] = useState('week');
  const [tokenStatusCounts, setTokenStatusCounts] = useState({
    scheduled: 0,
    completed: 0,
    cancelled: 0,
  });

  const fetchTokenData = async () => {
    try {
      const response = await axios.get(`${Base_url}/apis/token/get`);
      const tokens = response.data.data;
      setTotalTokens(tokens);

      // Calculate token status counts
      const counts = {
        scheduled: tokens.filter((t: Token) => t.tokenSatus === 'Scheduled')
          .length,
        CheckIn: tokens.filter((t: Token) => t.tokenSatus === 'Checked-in')
          .length,
        completed: tokens.filter((t: Token) => t.tokenSatus === 'Completed')
          .length,
        cancelled: tokens.filter((t: Token) => t.tokenSatus === 'Cancelled')
          .length,
      };
      setTokenStatusCounts(counts);

      const tokenData = tokens?.map((token: Token) => {
        // Use UTC for the token date
        const startDateTime = moment
          .utc(token.tokenDate)
          .set({
            hour: moment.utc(token.createdAt).hour(),
            minute: moment.utc(token.createdAt).minute(),
            second: moment.utc(token.createdAt).second(),
          })
          .toDate();

        const endDateTime = moment
          .utc(startDateTime)
          .add(15, 'minutes')
          .toDate();

        return {
          id: token._id,
          title: `Token ${token?.tokenNumber} - ${token?.patientId?.name}`,
          start: startDateTime,
          end: endDateTime,
          resourceId: token.doctorId?._id,
          type: 'token',
          patientName: token.patientId?.name,
          patientId: token.patientId?.mr,
          status: token.tokenSatus || 'Scheduled',
          tokenNumber: token?.tokenNumber,
          doctorName: token.doctorId?.name,
          appointmentStatus: token?.tokenSatus,
        };
      });
      setEvents((prev) => [
        ...prev.filter((e) => e.type !== 'token'),
        ...tokenData,
      ]);
    } catch (error) {
      console.error('Error fetching token data:', error);
      // toast.error('Failed to load token data');
    }
  };

  const fetchDoctorData = async () => {
    try {
      const response = await axios.get(`${Base_url}/apis/user/get?role=doctor`);
      const doctorData = response?.data?.data;
      setDoctors(doctorData);
    } catch (error) {
      console.error('Error fetching doctor data:', error);
    }
  };

  const fetchDepartmentData = async () => {
    try {
      const response = await axios.get(`${Base_url}/apis/department/get`);
      const departmentData = response?.data?.data;
      setDepartments(departmentData);
    } catch (error) {
      console.error('Error fetching department data:', error);
    }
  };

  const fetchDoctorAppointmentData = async () => {
    try {
      const response = await axios.get(`${Base_url}/apis/appointment/get`);
      const appointmentData = response?.data?.data;
      setTotalAppointment(appointmentData);

      const appointmentEvents = appointmentData.map(
        (appointment: Appointment) => {
          const start = moment(
            `${appointment.appointmentDate} ${appointment.startTime}`,
            'YYYY-MM-DD h:mm A'
          ).toDate();

          const end = moment(
            `${appointment.appointmentDate} ${appointment.endTime}`,
            'YYYY-MM-DD h:mm A'
          ).toDate();

          return {
            id: appointment._id,
            title: `${appointment.patientId.name}`,
            start,
            end,
            resourceId: appointment.doctorId._id,
            type: 'appointment',
            patientName: appointment.patientId.name,
            patientId: appointment.patientId.mr,
            status: appointment.status?.toLowerCase(),
            doctorName: appointment.doctorId.name,
            appointmentStatus: appointment.status,
          };
        },
      );

      setEvents((prev) => [
        ...prev.filter((e) => e.type !== 'appointment'),
        ...appointmentEvents,
      ]);
    } catch (error) {
      console.error('Error fetching appointment data:', error);
    }
  };

  const fetchStatusCounts = async () => {
    try {
      const responses = await Promise.all([
        axios.get(
          `${Base_url}/apis/appointment/countStatus?appointmentStatus=Scheduled`,
        ),
        axios.get(
          `${Base_url}/apis/appointment/countStatus?appointmentStatus=checked-in`,
        ),
        axios.get(
          `${Base_url}/apis/appointment/countStatus?appointmentStatus=confirmed`,
        ),
        axios.get(
          `${Base_url}/apis/appointment/countStatus?appointmentStatus=cancelled`,
        ),
        axios.get(
          `${Base_url}/apis/appointment/countStatus?appointmentStatus=no-show`,
        ),
        axios.get(
          `${Base_url}/apis/appointment/countStatus?appointmentStatus=engaged`,
        ),
        axios.get(
          `${Base_url}/apis/appointment/countStatus?appointmentStatus=checked-out`,
        ),
      ]);

      setStatusScheduled(responses[0]?.data?.data || 0);
      setStatusCheckedIn(responses[1]?.data?.data || 0);
      setStatusConfirmed(responses[2]?.data?.data || 0);
      setStatusNoShow(responses[4]?.data?.data || 0);
      setStatusEngaged(responses[5]?.data?.data || 0);
      setStatusCheckOut(responses[6]?.data?.data || 0);
    } catch (error) {
      console.error('Error fetching status counts:', error);
    }
  };

  useEffect(() => {
    fetchTokenData();
    fetchDoctorData();
    fetchDoctorAppointmentData();
    fetchDepartmentData();
    fetchStatusCounts();
  }, []);

  const handleStatusUpdate = async (status: string, id: string) => {
    try {
      // Prevent dropdown from closing immediately
      const currentShowMenu = showMenu;
      
      await axios.put(`${Base_url}/apis/appointment/update/${id}`, {
        appointmentStatus: status,
      });
      
      toast.success('Status updated successfully!');
      
      // Refresh data
      await fetchDoctorAppointmentData();
      await fetchStatusCounts();
      
      // Keep dropdown open for a moment to show the update
      setTimeout(() => {
        setShowMenu(null);
      }, 1000);
      
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Error updating status!');
      setShowMenu(null);
    }
  };

  const handleTokenStatusUpdate = async (status: string, id: string) => {
    try {
      // Prevent dropdown from closing immediately
      const currentShowMenu = showMenu;
      
      await axios.put(`${Base_url}/apis/token/update/${id}`, {
        tokenStatus: status,
      });
      
      toast.success('Token status updated successfully!');
      
      // Refresh data
      await fetchTokenData();
      
      // Keep dropdown open for a moment to show the update
      setTimeout(() => {
        setShowMenu(null);
      }, 1000);
      
    } catch (error) {
      console.error('Error updating token status:', error);
      toast.error('Error updating token status!');
      setShowMenu(null);
    }
  };

  const getDoctorAvailability = (doctor: Doctor, date: Date) => {
    const day = moment(date).format('dddd').toLowerCase();
    const dayKey = day as keyof Doctor;

    if (doctor[dayKey] === true) {
      const startTimeKey = `${dayKey}StartTime` as keyof Doctor;
      const endTimeKey = `${dayKey}EndTime` as keyof Doctor;
      const durationKey = `${dayKey}Duration` as keyof Doctor;

      return {
        available: true,
        startTime: doctor[startTimeKey] as string,
        endTime: doctor[endTimeKey] as string,
        duration: parseInt(doctor[durationKey] as string) || 30,
      };
    }

    return { available: false };
  };

  const handleDoctorViewClick = (doctorId: string) => {
    setCurrentView('doctor');
    setSelectedDoctor(doctorId);
  };

  const handleCalendarViewClick = () => {
    setCurrentView('calendar');
    setSelectedDoctor(null);
  };

  const handleSelectEvent = (event: Event) => {
    console.log(event);

    setSelectedEvent(event);
    if (event.type === 'token') {
      const token = totalTokens.find((t) => t._id === event.id);
      if (token) {
        setSelectedToken(token);
        setOpenEditTokenModal(true);
      }
    } else if (event.type === 'appointment') {
      const appointment = totalAppointment.find((a) => a._id === event.id);
      if (appointment) {
        setSelectedAppointment(appointment);
        setEditModalOpen(true);
      }
    }
  };
  const handleSelectSlot = (slotInfo: {
    start: Date;
    end: Date;
    resourceId?: string;
  }) => {
    console.log(slotInfo);

    if (!slotInfo.resourceId) return;

    const doctor = doctors.find((d) => d._id === slotInfo.resourceId);
    if (!doctor) return;

    const availability = getDoctorAvailability(doctor, slotInfo.start);
    if (!availability.available) {
      toast.error('Doctor is not available at this time');
      return;
    }

    const overlappingEvent = events.find((event) => {
      return (
        event.resourceId === slotInfo.resourceId &&
        ((slotInfo.start >= event.start && slotInfo.start < event.end) ||
          (slotInfo.end > event.start && slotInfo.end <= event.end) ||
          (slotInfo.start <= event.start && slotInfo.end >= event.end))
      );
    });

    if (overlappingEvent) {
      alert('This time slot is already booked');
      return;
    }

    if (consultationType === 'token') {
      setOpenTokenModal(true);
    } else {
      setOpenAppointmentModal(true);
    }
  };

  const filteredEvents = events.filter((event) => {
    // Filter by consultation type
    if (consultationType === 'token' && event.type !== 'token') return false;
    if (consultationType === 'general' && event.type === 'token') return false;

    // Filter by selected doctor
    if (
      currentView === 'doctor' &&
      selectedDoctor &&
      event.resourceId !== selectedDoctor
    ) {
      return false;
    }

    // Filter by search term
    if (
      searchTerm &&
      !event.patientName?.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }

    // Filter by department
    if (selectedDepartment) {
      const doctor = doctors.find((d) => d._id === event.resourceId);
      if (doctor && doctor.departmentId._id !== selectedDepartment) {
        return false;
      }
    }

    // Filter by status
    if (selectedStatus && event.status !== selectedStatus) {
      return false;
    }

    return true;
  });

  
 const eventStyleGetter = (event: Event) => {
  let backgroundColor = '';
  let borderColor = '';
  let color = 'white';

  // Dark mode adjustments
  const isDarkMode = document.documentElement.classList.contains('dark');

  if (event.type === 'token') {
    backgroundColor = isDarkMode ? '#1e40af' : '#3b82f6';
    borderColor = isDarkMode ? '#1e3a8a' : '#2563eb';
  } else {
    switch (event.status) {
      case 'scheduled':
        backgroundColor = isDarkMode ? '#1e3a8a' : '#60a5fa';
        borderColor = isDarkMode ? '#1e40af' : '#3b82f6';
        break;
      case 'checked-in':
        backgroundColor = isDarkMode ? '#166534' : '#4ade80';
        borderColor = isDarkMode ? '#14532d' : '#22c55e';
        break;
      case 'completed':
        backgroundColor = isDarkMode ? '#9a3412' : '#f97316';
        borderColor = isDarkMode ? '#7c2d12' : '#ea580c';
        break;
      case 'no-show':
      case 'cancelled':
        backgroundColor = isDarkMode ? '#991b1b' : '#ef4444';
        borderColor = isDarkMode ? '#7f1d1d' : '#dc2626';
        break;
      default:
        backgroundColor = isDarkMode ? '#065f46' : '#10b981';
        borderColor = isDarkMode ? '#064e3b' : '#059669';
    }
  }

  return {
    style: {
      backgroundColor,
      borderRadius: '4px',
      border: `1px solid ${borderColor}`,
      color,
      padding: '2px 5px',
      fontSize: '0.875rem',
      height: 'auto',
      minHeight: '60px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
    },
  };
};

  const handleAddEvent = (newEvent: Event) => {
    if (selectedEvent) {
      setEvents(
        events.map((event) =>
          event.id === selectedEvent.id ? newEvent : event,
        ),
      );
    } else {
      setEvents([
        ...events,
        {
          ...newEvent,
          id: Math.max(...events.map((e) => Number(e.id)), 0) + 1,
        },
      ]);
    }
    setSelectedEvent(null);
  };

  const CustomToolbar = (toolbar: any) => {
    const goToBack = () => toolbar.onNavigate('PREV');
    const goToNext = () => toolbar.onNavigate('NEXT');
    const goToToday = () => toolbar.onNavigate('TODAY');

    return (
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-lg">
            {moment(toolbar.date).format('MMMM YYYY')}
          </span>
        </div>
        <div className="flex space-x-2">
          <button
            className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100"
            onClick={goToBack}
          >
            &lt;
          </button>
          <button
            className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100"
            onClick={goToToday}
          >
            Today
          </button>
          <button
            className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100"
            onClick={goToNext}
          >
            &gt;
          </button>
        </div>
      </div>
    );
  };

  const getDoctorCalendarView = () => {
    const currentDoctor = doctors.find((d) => d._id === selectedDoctor);

    if (!currentDoctor) {
      return <div className="p-4 text-center">No doctor selected</div>;
    }

    const doctorEvents = events.filter(
      (event) => event.resourceId === selectedDoctor,
    );

    return (
      <div  className="bg-white dark:bg-boxdark p-4 shadow-sm rounded-lg border border-stroke dark:border-strokedark">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg  font-semibold">Dr. {currentDoctor?.name}</h2>
          <div className="flex space-x-2">
            <button
              className={`px-3 py-1 text-sm rounded ${
                view === 'day' ? 'bg-primary text-white' : 'bg-gray-100'
              }`}
              onClick={() => setView('day')}
            >
              Day
            </button>
            <button
              className={`px-3 py-1 text-sm rounded ${
                view === 'week' ? 'bg-primary text-white' : 'bg-gray-100'
              }`}
              onClick={() => setView('week')}
            >
              Week
            </button>
            <button
              className={`px-3 py-1 text-sm rounded ${
                view === 'month' ? 'bg-primary text-white' : 'bg-gray-100'
              }`}
              onClick={() => setView('month')}
            >
              Month
            </button>
          </div>
        </div>

        <Calendar
          localizer={localizer}
          events={doctorEvents}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 600 }}
          view={view}
          onView={setView}
          defaultView={view}
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          selectable
          components={{
            event: ({ event }) => (
              <div className="p-1">
                <div className="font-medium truncate dark:text-white">{event.patientName}</div>
                <div className="text-xs dark:text-gray-300">
                  {moment(event.start).format('h:mm A')} -{' '}
                  {moment(event.end).format('h:mm A')}
                </div>
                 {event.tokenNumber && (
          <div className="text-xs font-semibold dark:text-gray-300">
            Token #{event.tokenNumber}
          </div>
        )}
              </div>
            ),
            toolbar: (props) => (
              <div className="mb-4">
                <CustomToolbar {...props} />
                <div className="flex justify-between dark:text-white items-center mt-2">
                  <span className="font-medium dark:text-white">
                    {view === 'day'
                      ? moment(props.date).format('dddd, MMMM D, YYYY')
                      : view === 'week'
                      ? `Week of ${moment(props.date)
                          .startOf('week')
                          .format('MMM D')} - ${moment(props.date)
                          .endOf('week')
                          .format('MMM D, YYYY')}`
                      : moment(props.date).format('MMMM YYYY')}
                  </span>
                </div>
              </div>
            ),
          }}
          eventPropGetter={eventStyleGetter}
        />
      </div>
    );
  };

  return (
    <>
      <>
      <div className="  py-4 ">
        <Breadcrumb pageName="OPD Management" />

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <select
              onChange={(e) => {
                if (e.target.value === 'general') {
                  setConsultationType('general');
                  setCurrentView('calendar');
                } else if (e.target.value === 'token') {
                  setConsultationType('token');
                  setCurrentView('calendar');
                } else {
                  setSelectedDoctor(e.target.value);
                  setCurrentView('doctor');
                }
              }}
              className="border border-primary  dark:bg-black dark:text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              value={
                currentView === 'doctor' ? selectedDoctor : consultationType
              }
            >
              <option value="general">All Doctors (General)</option>
              <option value="token">All Doctors (Token)</option>
              {doctors.map((doctor) => (
                <option key={doctor._id} value={doctor._id}>
                 {doctor.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto justify-start md:justify-end">
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="border border-primary rounded-md px-3 py-2 dark:bg-black dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">Select Department...</option>
              {departments.map((dept) => (
                <option key={dept._id} value={dept._id}>
                  {dept.name}
                </option>
              ))}
            </select>

            {consultationType === 'token' ? (
              <button
                onClick={() => {
                  setSelectedEvent(null);
                  setOpenTokenModal(true);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-primary py-2 px-4 text-sm font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
              >
                <FaPlus size={14} /> Create Token
              </button>
            ) : (
              <button
                onClick={() => {
                  setSelectedEvent(null);
                  setOpenAppointmentModal(true);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-primary py-2 px-4 text-sm font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
              >
                <FaPlus size={14} /> Create Appointment
              </button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Sidebar */}
          <div className="w-full lg:w-[35%] flex flex-col gap-4">
            {/* View Toggle and Stats */}
            <div className="bg-white dark:bg-black p-4 shadow-sm rounded-lg border border-primary">
              <div className="flex  justify-between gap-2 mb-4">
                <button
                  className={`inline-flex items-center dark:text-white justify-center gap-2 w-full rounded-md py-2 px-4 text-sm font-medium transition-colors ${
                    currentView === 'doctor'
                      ? 'bg-primary text-white hover:bg-primary/90'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  onClick={() =>
                    doctors.length > 0 && handleDoctorViewClick(doctors[0]._id)
                  }
                >
                  <FaUserMd size={14} /> Doctor View
                </button>
                <button
                  className={`inline-flex items-center justify-center gap-2 w-full rounded-md py-2 px-4 text-sm font-medium transition-colors ${
                    currentView === 'calendar'
                      ? 'bg-primary text-white hover:bg-primary/90'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  onClick={handleCalendarViewClick}
                >
                  <FaCalendarAlt size={14} /> Calendar View
                </button>
              </div>

              {consultationType === 'token' ? (
                <div className="grid grid-cols-3 gap-3 text-sm mb-4">
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-center">
                    <div className="text-blue-600 font-bold text-lg">
                      {tokenStatusCounts.scheduled}
                    </div>
                    <div className="text-gray-600 text-sm">Scheduled</div>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-center">
                    <div className="text-blue-600 font-bold text-lg">
                      {tokenStatusCounts.checkedIn || 0}
                    </div>
                    <div className="text-gray-600 text-sm">Checked In</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg border border-green-100 text-center">
                    <div className="text-green-600 font-bold text-lg">
                      {tokenStatusCounts.completed}
                    </div>
                    <div className="text-gray-600 text-sm">Completed</div>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg border border-red-100 text-center">
                    <div className="text-red-600 font-bold text-lg">
                      {tokenStatusCounts.cancelled}
                    </div>
                    <div className="text-gray-600 text-sm">Cancelled</div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3 text-sm mb-4">
                  <div className="bg-blue-50  dark:bg-black p-3 rounded-lg border border-blue-100 dark:border-blue-600 text-center">
                    <div className="text-blue-600 font-bold text-lg">
                      {statusScheduled}
                    </div>
                    <div className="text-gray-600 text-sm dark:text-white">Scheduled</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg  dark:bg-black border border-green-100 dark:border-green-600 text-center">
                    <div className="text-green-600  font-bold text-lg">
                      {statusCheckedIn}
                    </div>
                    <div className="text-gray-600 text-sm dark:text-white">Checked In</div>
                  </div>
                  <div className="bg-green-50 dark:bg-black p-3 rounded-lg border dark:border-green-600 border-green-100 text-center">
                    <div className="text-green-600 font-bold text-lg">
                      {statusEngaged}
                    </div>
                    <div className="text-gray-600 text-sm dark:text-white">Engaged</div>
                  </div>
                  <div className="bg-orange-50 p-3 dark:bg-black rounded-lg border border-orange-100  dark:border-orange-600 text-center">
                    <div className="text-orange-600 font-bold text-lg">
                      {statusCheckOut}
                    </div>
                    <div className="text-gray-600 text-sm dark:text-white">Checked Out</div>
                  </div>
                  <div className="bg-red-50 p-3 dark:bg-black dark:border-red-600 rounded-lg border border-red-100 text-center">
                    <div className="text-red-600 font-bold text-lg">
                      {statusNoShow}
                    </div>
                    <div className="text-gray-600 text-sm dark:text-white">No Show</div>
                  </div>
                  <div className="bg-red-50 p-3 dark:bg-black rounded-lg border dark:border-red-600  border-red-100 text-center">
                    <div className="text-red-600 font-bold text-lg">
                      {statusConfirmed}
                    </div>
                    <div className="text-gray-600 text-sm dark:text-white">Confirmed</div>
                  </div>
                </div>
              )}

              <div className="text-center dark:text-white font-bold text-lg mb-2">
                Total {consultationType === 'token' ? 'Tokens' : 'Appointments'}
                :{' '}
                {consultationType === 'token'
                  ? totalTokens.length
                  : totalAppointment.length}
              </div>

              {selectedDoctor && (
                <div className="text-center text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  Viewing: {doctors.find((d) => d._id === selectedDoctor)?.name}
                </div>
              )}
            </div>

            {/* Token/Appointment List */}
            <div className="bg-white dark:bg-black dark:text-white p-4 shadow-sm rounded-lg border border-primary">
              <h3 className="font-medium dark:text-white text-lg mb-4">
                {consultationType === 'token'
                  ? 'Recent Tokens'
                  : 'Recent Appointments'}
              </h3>
              <div className="space-y-3 overflow-y-auto h-72 pr-2">
                {(
                  consultationType === 'token'
                    ? (currentView === 'doctor' && selectedDoctor
                        ? totalTokens.filter((item) => item.doctorId?._id === selectedDoctor)
                        : totalTokens)
                    : (currentView === 'doctor' && selectedDoctor
                        ? totalAppointment.filter((item) => item.doctorId?._id === selectedDoctor)
                        : totalAppointment)
                )?.map((item) => (
                  <div
                    key={item._id}
                    className="flex justify-between items-center p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-100"
                  >
                    <div>
                      <Link
                        to={`/details-patients/${item?.patientId?._id}`}
                        className="font-semibold dark:text-white uppercase text-black pb-2"
                      >
                        {consultationType === 'token'
                          ? `Token ${(item as Token)?.tokenNumber} - ${item
                              ?.patientId?.name}`
                          : (item as Appointment)?.patientId?.name}
                      </Link>
                      <div className="text-xs text-black dark:text-white font-semibold">
                        {moment.utc(
                          consultationType === 'token'
                            ? (item as Token).tokenDate
                            : (item as Appointment).appointmentDate,
                        ).format('DD-MM-YYYY')}
                        {consultationType === 'general' &&
                          ` • ${(item as Appointment).startTime} - ${
                            (item as Appointment).endTime
                          }`}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Dr. {item?.doctorId?.name} •
                        {consultationType === 'token'
                          ? ' Token'
                          : ` ${(item as Appointment).consultationType}`}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className={`rounded-full px-2 py-1 text-xs whitespace-nowrap font-medium ${
  consultationType === 'token'
    ? (item as Token).tokenStatus === 'Scheduled'
      ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100'
      : (item as Token).tokenStatus === 'Completed'
      ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100'
      : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100'
    : (item as Appointment).status === 'Scheduled'
    ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100'
    : (item as Appointment).status === 'completed'
    ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100'
    : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100'
}`}>
                        {consultationType === 'token'
                          ? (item as Token).tokenStatus
                          : (item as Appointment).appointmentStatus}
                      </div>
                      <div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowMenu(
                              showMenu === item._id ? null : item._id,
                            );
                          }}
                          className="p-1 rounded-full relative hover:bg-gray-200"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                          </svg>

                          {showMenu === item._id && (
                            <div
                              className="absolute right-0 top-10 z-10 w-48 rounded-md bg-white dark:bg-black border py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {consultationType === 'token' ? (
                                <>
                                  <button
                                    onClick={() =>
                                      handleTokenStatusUpdate(
                                        'Scheduled',
                                        item._id,
                                      )
                                    }
                                    className="block px-4 py-1 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                  >
                                    Scheduled
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleTokenStatusUpdate(
                                        'Checked-in',
                                        item._id,
                                      )
                                    }
                                    className="block px-4 py-1 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                  >
                                    Checked In
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleTokenStatusUpdate(
                                        'Completed',
                                        item._id,
                                      )
                                    }
                                    className="block px-4 py-1 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                  >
                                    Completed
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleTokenStatusUpdate(
                                        'Cancelled',
                                        item._id,
                                      )
                                    }
                                    className="block px-4 py-1 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                  >
                                    Cancelled
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() =>
                                      handleStatusUpdate('Scheduled', item._id)
                                    }
                                    className="block px-4 py-1 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                  >
                                    Scheduled
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleStatusUpdate('checked-in', item._id)
                                    }
                                    className="block px-4 py-1 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                  >
                                    Checked In
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleStatusUpdate('engaged', item._id)
                                    }
                                    className="block px-4 py-1 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                  >
                                    Confirmed
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleStatusUpdate(
                                        'checked-out',
                                        item._id,
                                      )
                                    }
                                    className="block px-4 py-1 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                  >
                                    Checked Out
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleStatusUpdate('cancelled', item._id)
                                    }
                                    className="block px-4 py-1 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                  >
                                    Cancelled
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleStatusUpdate('no-show', item._id)
                                    }
                                    className="block px-4 py-1 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                  >
                                    No Show
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Calendar/Doctor View */}
          <div className="w-full lg:w-[65%]">
            {currentView === 'doctor' ? (
              getDoctorCalendarView()
            ) : (
              <div className="bg-white dark:bg-black dark:text-white p-4 shadow-sm rounded-lg border border-primary">
                <div className="mb-4">
                  <div className="text-lg font-semibold dark:text-white mb-2">
                    {consultationType === 'token' ? 'Token' : 'Appointment'}{' '}
                    Calendar
                  </div>
                  <div className="text-sm text-gray-600 dark:text-white">
                    {moment().format('ddd, D MMMM, YYYY')}
                  </div>
                </div>

                <Calendar
                  localizer={localizer}
                  events={filteredEvents}
                  startAccessor="start"
                  minRows={0}
                  
                  endAccessor="end"
                  style={{ height: 600 }}
                  views={['month', 'week', 'day']}
                  step={15}
                  timeslots={4}
                  
                  defaultView={'month'}
                  resources={doctors}
                  resourceIdAccessor="_id"
                  resourceTitleAccessor="name"
                  onSelectEvent={handleSelectEvent}
                  onSelectSlot={handleSelectSlot}
                  selectable
                  toolbar
                  eventPropGetter={eventStyleGetter}
                  formats={{
                    timeGutterFormat: 'h:mm A',
                    eventTimeRangeFormat: ({ start, end }) =>
                      `${moment(start).format('h:mm A')} - ${moment(end).format(
                        'h:mm A',
                      )}`,
                  }}
                 components={{
  event: ({ event }) => (
    <div className="event-item">
      <div className="event-title">{event.patientName}</div>
      <div className="event-time">
        {moment(event.start).format('h:mm A')} - {moment(event.end).format('h:mm A')}
      </div>
      {event.tokenNumber && (
        <div className="event-token">Token #{event.tokenNumber}</div>
      )}
      <div className={`event-status ${event.status?.toLowerCase()}`}>
        {event.appointmentStatus || event.status}
      </div>
    </div>
  ),
}}
                  messages={{
                    today: 'Today',
                    previous: 'Back',
                    next: 'Next',
                    month: 'Month',
                    week: 'Week',
                    day: 'Day',
                    date: 'Date',
                    time: 'Time',
                    event: 'Event',
                    noEventsInRange: 'No events in this range.',
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddTokenForm
        isModalOpen={openTokenModal}
        setIsModalOpen={setOpenTokenModal}
        selectedEvent={selectedEvent}
        doctors={doctors}
        onSave={handleAddEvent}
        fetchToken={fetchTokenData}
      />

      <EditAppointment
        isModalOpen={editModalOpen}
        setIsModalOpen={setEditModalOpen}
        selectedAppointment={selectedAppointment}
        fetchAppointmentData={fetchDoctorAppointmentData}
        doctors={doctors}
      />

      <EditTokenForm
        isModalOpen={openEditTokenModal}
        setIsModalOpen={setOpenEditTokenModal}
        selectedToken={selectedToken}
        fetchToken={fetchTokenData}
        doctors={doctors}
      />
      <AddAppointments
        isModalOpen={openAppointmentModal}
        setIsModalOpen={setOpenAppointmentModal}
        selectedEvent={selectedEvent}
        doctors={doctors}
        onSave={handleAddEvent}
        fetchAppointmentData={fetchDoctorAppointmentData}
      />

      <AddLeaveForm
        isModalOpen={openLeaveModal}
        setIsModalOpen={setOpenLeaveModal}
        doctors={doctors}
        onSave={handleAddEvent}
      />
      </>
     
    </>
  );
};

export default GeneralConsultations;
