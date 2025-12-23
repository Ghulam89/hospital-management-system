import React, { useEffect, useState } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Base_url } from '../../../utils/Base_url';
import Header from '../../../components/Header';
import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';

import { MdClose } from 'react-icons/md';

const localizer = momentLocalizer(moment);

interface User {
  _id: string;
  name: string;
  role: string;
}

interface InDoorDuty {
  _id: string;
  userId: User;
  dutyDate: string;
  startTime: string;
  endTime: string;
  dutyDay: string;
  createdAt: string;
  updatedAt: string;
}

interface Event {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resourceId: string;
  type: 'duty';
  doctorName?: string;
}

const IndoorDutyRoster: React.FC = () => {
  const [doctors, setDoctors] = useState<User[]>([]);
  const [nurses, setNurses] = useState<User[]>([]);
  const [duties, setDuties] = useState<InDoorDuty[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [openDutyModal, setOpenDutyModal] = useState(false);
  const [newDuty, setNewDuty] = useState({
    userId: '',
    dutyDate: moment().format('YYYY-MM-DD'),
    startTime: '09:00',
    endTime: '17:00',
    dutyDay: moment().format('dddd') // Changed to full day name (e.g., "Monday")
  });
  const [selectedSlot, setSelectedSlot] = useState<{
    start: Date;
    end: Date;
    resourceId?: string;
  } | null>(null);
  const [selectedRole, setSelectedRole] = useState<'doctor' | 'nurse'>('doctor');
  const [currentDate, setCurrentDate] = useState(moment());

  const fetchStaff = async () => {
    try {
      const [doctorsRes, nursesRes] = await Promise.all([
        axios.get(`${Base_url}/apis/user/get?role=doctor`),
        axios.get(`${Base_url}/apis/user/get?role=doctor`)
      ]);
      setDoctors(doctorsRes?.data?.data);
      setNurses(nursesRes?.data?.data);
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast.error('Failed to load staff data');
    }
  };

  const fetchDuties = async () => {
    try {
      const response = await axios.get(`${Base_url}/apis/inDoorDuty/get`);
      const dutyData = response.data.data;
      setDuties(dutyData);

      // Convert duties to calendar events
      const dutyEvents = dutyData.map((duty: InDoorDuty) => {
        const startDate = moment(duty.dutyDate).format('YYYY-MM-DD');
        const startDateTime = moment(`${startDate} ${duty.startTime}`, 'YYYY-MM-DD HH:mm').toDate();
        const endDateTime = moment(`${startDate} ${duty.endTime}`, 'YYYY-MM-DD HH:mm').toDate();

        return {
          id: duty._id,
          title: `${duty.userId.name}`,
          start: startDateTime,
          end: endDateTime,
          resourceId: duty.userId._id,
          type: 'duty',
          doctorName: duty.userId.name
        };
      });

      setEvents(dutyEvents);
    } catch (error) {
      console.error('Error fetching duties:', error);
      toast.error('Failed to load duty data');
    }
  };

  const handleCreateDuty = async () => {
    try {
      await axios.post(`${Base_url}/apis/inDoorDuty/create`, newDuty);
      toast.success('Duty created successfully');
      setOpenDutyModal(false);
      fetchDuties();
      resetNewDuty();
    } catch (error) {
      console.error('Error creating duty:', error);
      toast.error('Failed to create duty');
    }
  };

  const resetNewDuty = () => {
    setNewDuty({
      userId: '',
      dutyDate: moment().format('YYYY-MM-DD'),
      startTime: '09:00',
      endTime: '17:00',
      dutyDay: moment().format('dddd')
    });
  };

  const handleSelectSlot = (slotInfo: {
    start: Date;
    end: Date;
    resourceId?: string;
  }) => {
    setSelectedSlot(slotInfo);
    
    // Set default values based on selected slot
    const startTime = moment(slotInfo.start).format('HH:mm');
    const endTime = moment(slotInfo.end).format('HH:mm');
    const dutyDate = moment(slotInfo.start).format('YYYY-MM-DD');
    const dutyDay = moment(slotInfo.start).format('dddd');
    
    setNewDuty(prev => ({
      ...prev,
      userId: slotInfo.resourceId || '',
      dutyDate,
      startTime,
      endTime,
      dutyDay
    }));
    
    setOpenDutyModal(true);
  };

  const eventStyleGetter = () => {
    return {
      style: {
        backgroundColor: '#3b82f6',
        borderRadius: '4px',
        border: '1px solid #2563eb',
        color: 'white',
        padding: '2px 5px',
        fontSize: '0.875rem',
      },
    };
  };

  const handleNavigate = (newDate: Date) => {
    setCurrentDate(moment(newDate));
  };

  const currentStaff = selectedRole === 'doctor' ? doctors : nurses;

  useEffect(() => {
    fetchStaff();
    fetchDuties();
  }, []);

  return (
    <>
      <div className="">
        <Breadcrumb pageName="Indoor Duty Roster" />

        {/* Date and Role Filter */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
         <div className="flex items-center w-56 gap-2">

  <input
    type="date"
    value={currentDate.format('YYYY-MM-DD')}
    onChange={(e) => {
      const newDate = moment(e.target.value);
      if (newDate.isValid()) {
        setCurrentDate(newDate);
      }
    }}
                  className="w-full rounded border-[1.5px] bg-white border-stroke bg-transparent py-2 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
  />
 
  
 
</div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedRole('doctor')}
              className={`px-4 py-2 rounded-md ${selectedRole === 'doctor' ? 'bg-primary text-white' : 'bg-gray-200'}`}
            >
              Doctors
            </button>
            <button
              onClick={() => setSelectedRole('nurse')}
              className={`px-4 py-2 rounded-md ${selectedRole === 'nurse' ? 'bg-primary text-white' : 'bg-gray-200'}`}
            >
              Nurses
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="w-full lg:w-[100%]">
            <div className="bg-white p-4 shadow-sm rounded-lg border border-primary">
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: 600 }}
                views={['month', 'week', 'day']}
                step={15}
                timeslots={4}
                defaultView={'week'}
                resources={currentStaff}
                resourceIdAccessor="_id"
                resourceTitleAccessor="name"
                selectable
                onSelectSlot={handleSelectSlot}
                toolbar
                eventPropGetter={eventStyleGetter}
                formats={{
                  timeGutterFormat: 'h:mm A',
                  eventTimeRangeFormat: ({ start, end }) =>
                    `${moment(start).format('h:mm A')} - ${moment(end).format('h:mm A')}`,
                }}
                onNavigate={handleNavigate}
                date={currentDate.toDate()}
                components={{
                  event: ({ event }) => (
                    <div className="">
                      <div className="font-medium">{event.title}</div>
                      <div className="text-xs">
                        {moment(event.start).format('h:mm A')} -{' '}
                        {moment(event.end).format('h:mm A')}
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
                  noEventsInRange: 'No duties scheduled in this range.',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Duty Modal */}
      {openDutyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
           <div className=' flex mb-4 justify-between items-center'>
             <h2 className="text-xl font-bold">Add Duty Roster</h2>
               <MdClose
                        onClick={() => setOpenDutyModal(false)}
                        size={25}
                        className="cursor-pointer"
                      />
           </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {selectedRole === 'doctor' ? 'Doctor' : 'Nurse'}
              </label>
              <select
                value={newDuty.userId}
                onChange={(e) => setNewDuty({...newDuty, userId: e.target.value})}
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                required
              >
                <option value="">Select {selectedRole === 'doctor' ? 'Doctor' : 'Nurse'}</option>
                {(selectedRole === 'doctor' ? doctors : nurses).map(staff => (
                  <option key={staff._id} value={staff._id}>{staff.name}</option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={newDuty.dutyDate}
                onChange={(e) => {
                  const date = e.target.value;
                  const day = moment(date).format('dddd');
                  setNewDuty({
                    ...newDuty,
                    dutyDate: date,
                    dutyDay: day
                  });
                }}
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <input
                  type="time"
                  value={newDuty.startTime}
                  onChange={(e) => setNewDuty({...newDuty, startTime: e.target.value})}
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <input
                  type="time"
                  value={newDuty.endTime}
                  onChange={(e) => setNewDuty({...newDuty, endTime: e.target.value})}
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  required
                />
              </div>
            </div>
<div className="mb-4">
  <label className="block text-sm font-medium text-gray-700 mb-1">Days</label>
  <div className="grid grid-cols-3 gap-2">
    {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
      <label key={day} className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={newDuty.dutyDay.includes(day)}
          onChange={() => {
            const days = newDuty.dutyDay.split(',');
            if (days.includes(day)) {
             
              setNewDuty({
                ...newDuty,
                dutyDay: days.filter(d => d !== day).join(',')
              });
            } else {
           
              setNewDuty({
                ...newDuty,
                dutyDay: [...days, day].filter(d => d).join(',')
              });
            }
          }}
          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <span className="text-sm text-gray-700">{day}</span>
      </label>
    ))}
  </div>
</div>

            <div className="flex justify-center gap-3">
              
              <button
                onClick={handleCreateDuty}
          className="inline-flex items-center justify-center w-55 gap-2.5 rounded-md bg-primary py-3 px-6 text-center font-medium text-white hover:bg-opacity-90"
                disabled={!newDuty.userId}
              >
                Save Duty
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default IndoorDutyRoster;