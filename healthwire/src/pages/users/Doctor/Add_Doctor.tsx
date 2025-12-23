import { useNavigate } from 'react-router-dom';
import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';

import { FaTrashAlt } from 'react-icons/fa';
import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const AddDoctor = () => {
  // Form state management
  const [activeTab, setActiveTab] = useState('Biography Data');
  const [gender, setGender] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [allDepartment, setAllDepartment] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Main form state
  const [state, setState] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    shift: "",
    OPD: false,
    IPD: false,
    awards: "",
    experties: "",
    registrations: "",
    memberShip: "",
    language: "",
    experience: "",
    degreeCompletionDate: "",
    PMDC: "",
    consultationFee: "0.0",
    followUpCharges: "0.0",
    sharePrice: "0.0",
    shareType: "Rupees"  
  });

  // Role rights state
  const [roleRights, setRoleRights] = useState({
    doctor: '',
    patientCareOrder: '',
    reports: '',
    pharmacyOrders: '',
    files: '',
    bloodBank: '',
    doctorRecommendation: '',
    vitals: '',
    labOrder: '',
    IntakeOutput: '',
    operationRequests: '',
    doctorConsultationRequest: '',
    admissionForm: '',
    proceduresadmissionForm: '',
    radiologyOrder: '',
    laboratory: '',
    healthRecords: '',
    healthandPhysical: '',
    nutrition: '',
    nursingForms: '',
    radiology: '',
    rehabilation: '',
    nursingNotes: '',
  });

  // Qualification state
  const [qualifications, setQualifications] = useState([
    { degree: '', institute: '', year: '' }
  ]);

  // Service state
  const [services, setServices] = useState([
    { name: '', description: '' }
  ]);

  // Availability state with proper time validation
  const [availability, setAvailability] = useState({
    monday: true,
    mondayStartTime: '09:00',
    mondayEndTime: '17:00',
    mondayDuration: '30',
    tuesday: true,
    tuesdayStartTime: '09:00',
    tuesdayEndTime: '17:00',
    tuesdayDuration: '30',
    wednesday: true,
    wednesdayStartTime: '09:00',
    wednesdayEndTime: '17:00',
    wednesdayDuration: '30',
    thursday: true,
    thursdayStartTime: '09:00',
    thursdayEndTime: '17:00',
    thursdayDuration: '30',
    friday: true,
    fridayStartTime: '09:00',
    fridayEndTime: '17:00',
    fridayDuration: '30',
    saturday: false,
    saturdayStartTime: '09:00',
    saturdayEndTime: '17:00',
    saturdayDuration: '30',
    sunday: false,
    sundayStartTime: '09:00',
    sundayEndTime: '17:00',
    sundayDuration: '30'
  });

  const navigate = useNavigate();

  // Days configuration
  const days = [
    { name: 'monday', label: 'Monday' },
    { name: 'tuesday', label: 'Tuesday' },
    { name: 'wednesday', label: 'Wednesday' },
    { name: 'thursday', label: 'Thursday' },
    { name: 'friday', label: 'Friday' },
    { name: 'saturday', label: 'Saturday' },
    { name: 'sunday', label: 'Sunday' }
  ];

  // Input handlers
  const handleInputs = (e) => {
    const { name, value, type, checked } = e.target;
    setState(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox' && name in availability) {
      const dayPrefix = name;
      const newAvailability = { 
        ...availability,
        [name]: checked,
        [`${dayPrefix}StartTime`]: checked ? '09:00' : availability[`${dayPrefix}StartTime`],
        [`${dayPrefix}EndTime`]: checked ? '17:00' : availability[`${dayPrefix}EndTime`],
        [`${dayPrefix}Duration`]: checked ? '30' : availability[`${dayPrefix}Duration`]
      };
      setAvailability(newAvailability);
      return;
    }

    if (name.endsWith('EndTime')) {
      const dayPrefix = name.replace('EndTime', '');
      const startTime = availability[`${dayPrefix}StartTime`];
      if (value <= startTime) {
        toast.error('End time must be after start time');
        return;
      }
    }

    setAvailability(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Toggle all days availability
  const toggleAllDays = useCallback((e) => {
    const isChecked = e.target.checked;
    const newAvailability = { ...availability };
    
    days.forEach(day => {
      newAvailability[day.name] = isChecked;
      if (isChecked) {
        newAvailability[`${day.name}StartTime`] = '09:00';
        newAvailability[`${day.name}EndTime`] = '17:00';
        newAvailability[`${day.name}Duration`] = '30';
      }
    });
    
    setAvailability(newAvailability);
  }, [availability]);

  const allDaysSelected = days.every(day => availability[day.name]);

  // Qualification handlers
  const handleQualificationChange = useCallback((index, field, value) => {
    setQualifications(prev => {
      const newQualifications = [...prev];
      newQualifications[index][field] = value;
      return newQualifications;
    });
  }, []);

  const addQualification = useCallback(() => {
    setQualifications(prev => [...prev, { degree: '', institute: '', year: '' }]);
  }, []);

  const removeQualification = useCallback((index) => {
    if (qualifications.length > 1) {
      setQualifications(prev => prev.filter((_, i) => i !== index));
    }
  }, [qualifications.length]);

  // Service handlers
  const handleServiceChange = useCallback((index, field, value) => {
    setServices(prev => {
      const newServices = [...prev];
      newServices[index][field] = value;
      return newServices;
    });
  }, []);

  const addService = useCallback(() => {
    setServices(prev => [...prev, { name: '', description: '' }]);
  }, []);

  const removeService = useCallback((index) => {
    if (services.length > 1) {
      setServices(prev => prev.filter((_, i) => i !== index));
    }
  }, [services.length]);

  // Role rights handler
  const handleRoleRightChange = useCallback((right) => {
    setRoleRights(prev => ({
      ...prev,
      [right]: prev[right] ? '' : right,
    }));
  }, []);

  // Gender handler
  const handleGenderChange = useCallback((selectedGender) => {
    setGender(selectedGender);
  }, []);

  // Fetch departments
  const fetchDepartments = useCallback(() => {
    axios.get('https://api.holisticare.pk/apis/department/get')
      .then((res) => {
        setAllDepartment(res.data.data);
      })
      .catch((error) => {
        console.error("Error fetching departments:", error);
        toast.error("Failed to load departments");
      });
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  // Form submission with validation
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    if (!state.name) {
      toast.error("Must enter name!"); 
      return;
    } else if (!gender) {
      toast.error("Please select your gender");
      return;
    } else if (!state.phone) {
      toast.error("Must enter phone!");
      return;
    } else if (!state.email) {
      toast.error("Must enter email!");
      return;
    } else if (!state.password) {
      toast.error("Must enter password!");
      return;
    } else if (!state.shift) {
      toast.error("Must select shift!");
      return;
    } else if (!roleRights.doctor) {
      toast.error("Please select doctor role");
      return;
    }

    // Validate availability times
    for (const day of days) {
      if (availability[day.name]) {
        const startTime = availability[`${day.name}StartTime`];
        const endTime = availability[`${day.name}EndTime`];
        const duration = availability[`${day.name}Duration`];
        
        if (!startTime || !endTime || !duration) {
          toast.error(`Please complete ${day.label} timing information`);
          return;
        }
        
        if (endTime <= startTime) {
          toast.error(`${day.label} end time must be after start time`);
          return;
        }
        
        if (isNaN(duration) || duration < 1) {
          toast.error(`${day.label} duration must be at least 1 minute`);
          return;
        }
      }
    }

    // Prepare data for submission
    const params = {
      name: state.name,
      gender: gender,
      phone: state.phone,
      email: state.email,
      password: state.password,
      shift: state.shift,
      departmentId: departmentId,
      role: roleRights.doctor,
       consultationFee: state.consultationFee,
    followUpCharges: state.followUpCharges,
    sharePrice: state.sharePrice,
    shareType: state.shareType,
      tabs: Object.entries(roleRights)
        .filter(([key, value]) => key !== 'doctor' && value)
        .map(([key]) => key),
      OPD: state.OPD,
      IPD: state.IPD,
      awards: state.awards,
      experties: state.experties,
      registrations: state.registrations,
      memberShip: state.memberShip,
      language: state.language,
      experience: state.experience,
      degreeCompletionDate: state.degreeCompletionDate,
      PMDC: state.PMDC,
      qualification: qualifications.filter(q => q.degree && q.institute && q.year),
      services: services.filter(s => s.name && s.description),
      ...availability
    };
    
    try {
      setIsSubmitting(true);
      const res = await axios.post('https://api.holisticare.pk/apis/user/create', params);
      if (res.data.status === 'ok') {
        setIsSubmitting(false);
        toast.success("Doctor registered successfully!");
        navigate('/admin/users');
      } else {
        setIsSubmitting(false);
        toast.error(res.data.message || "Failed to register doctor");
      }
    } catch (error) {
      setIsSubmitting(false);
      console.error("Registration error:", error);
      toast.error(error.response?.data?.message || "An error occurred during registration");
    }
  };

  // Tab navigation component
  const TabButton = ({ tabName }) => (
    <button 
      onClick={() => setActiveTab(tabName)}
      className={`border-b-4 w-full pb-4 text-black ${
        activeTab === tabName ? 'border-primary font-bold' : 'border-transparent'
      }`}
    >
      {tabName}
    </button>
  );

  // Time input component
  const TimeInput = ({ day, type }) => {
    const disabled = !availability[day.name];
    return (
      <input
        type="time"
        name={`${day.name}${type}`}
        value={availability[`${day.name}${type}`]}
        onChange={handleChange}
        disabled={disabled}
        className={`w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3 text-black outline-none transition focus:border-primary active:border-primary ${
          disabled ? 'bg-gray-100 text-gray-400' : ''
        }`}
        required={availability[day.name]}
      />
    );
  };

  return (
    <>
      <Breadcrumb pageName="Add Doctor" />
      <div className="container mx-auto mt-8">
        <form onSubmit={handleSubmit}>
          {/* Tab Navigation */}
          <div className='flex bg-white  pt-4 mb-6'>
            <TabButton tabName="Biography Data" />
            <TabButton tabName="Qualification" />
            <TabButton tabName="Service" />
            <TabButton tabName="Timing" />
          </div>

          {/* Biography Data Tab */}
          {activeTab === "Biography Data" && (
            <div className="flex flex-col gap-9">
              <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
                <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
                  <h3 className="font-medium text-black dark:text-white">
                    Add Doctor
                  </h3>
                </div>
                
                <div className="p-6.5">
                  <div className="mb-4.5 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Personal Information */}
                    <div>
                      <label className="mb-2.5 block text-black dark:text-white">
                        Name <span className="text-danger">*</span>
                      </label>
                      <input
                        name="name"
                        type="text"
                        value={state.name}
                        onChange={handleInputs}
                        placeholder="Enter doctor's name"
                        className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary"
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-2.5 block text-black dark:text-white">
                        Gender <span className="text-danger">*</span>
                      </label>
                      <div className="flex pt-4 gap-12 items-center">
                        {['Male', 'Female', 'Other'].map((g) => (
                          <div key={g} className="flex items-center">
                            <input
                              type="radio"
                              name="gender"
                              className="h-5 w-5 text-primary focus:ring-primary border-gray-300"
                              checked={gender === g}
                              onChange={() => handleGenderChange(g)}
                              required
                            />
                            <label className="ml-2 block text-sm text-gray-900 dark:text-white">
                              {g}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="mb-2.5 block text-black dark:text-white">
                        Phone <span className="text-danger">*</span>
                      </label>
                      <input
                        onChange={handleInputs}
                        name="phone"
                        type="tel"
                        value={state.phone}
                        placeholder="Enter phone number"
                        className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary"
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-2.5 block text-black dark:text-white">
                        Email <span className="text-danger">*</span>
                      </label>
                      <input
                        onChange={handleInputs}
                        name="email"
                        type="email"
                        value={state.email}
                        placeholder="Enter email address"
                        className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary"
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-2.5 block text-black dark:text-white">
                        Password <span className="text-danger">*</span>
                      </label>
                      <input
                        onChange={handleInputs}
                        name="password"
                        type="password"
                        value={state.password}
                        placeholder="Enter password"
                        className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary"
                        required
                        minLength={6}
                      />
                    </div>

                    <div>
                      <label className="mb-2.5 block text-black dark:text-white">
                        Shift <span className="text-danger">*</span>
                      </label>
                      <select 
                        onChange={handleInputs}
                        name="shift"
                        value={state.shift}
                        className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary"
                        required
                      >
                        <option value="">Select Shift</option>
                        <option value="Morning">Morning</option>
                        <option value="Evening">Evening</option>
                        <option value="Night">Night</option>
                        <option value="Full Day">Full Day</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2.5 block text-black dark:text-white">
                        Doctor Department
                      </label>
                      <select 
                        onChange={(e) => setDepartmentId(e.target.value)}
                        value={departmentId}
                        className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary"
                      >
                        <option value="">Select department</option>
                        {allDepartment?.map((item) => (
                          <option key={item._id} value={item._id}>{item.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Professional Information */}
                    <div>
                      <label className="mb-2.5 block text-black dark:text-white">
                        Awards
                      </label>
                      <input
                        name="awards"
                        value={state.awards}
                        onChange={handleInputs}
                        placeholder="Enter awards"
                        className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary"
                      />
                    </div>

                    <div>
                      <label className="mb-2.5 block text-black dark:text-white">
                        Expertise
                      </label>
                      <input
                        name="experties"
                        value={state.experties}
                        onChange={handleInputs}
                        placeholder="Enter expertise"
                        className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary"
                      />
                    </div>

                    <div>
                      <label className="mb-2.5 block text-black dark:text-white">
                        Registrations
                      </label>
                      <input
                        name="registrations"
                        value={state.registrations}
                        onChange={handleInputs}
                        placeholder="Enter registrations"
                        className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary"
                      />
                    </div>

                    <div>
                      <label className="mb-2.5 block text-black dark:text-white">
                        Membership
                      </label>
                      <input
                        name="memberShip"
                        value={state.memberShip}
                        onChange={handleInputs}
                        placeholder="Enter membership"
                        className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary"
                      />
                    </div>

                    <div>
                      <label className="mb-2.5 block text-black dark:text-white">
                        Languages
                      </label>
                      <input
                        name="language"
                        value={state.language}
                        onChange={handleInputs}
                        placeholder="Enter languages spoken"
                        className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary"
                      />
                    </div>

                    <div>
                      <label className="mb-2.5 block text-black dark:text-white">
                        Experience (years)
                      </label>
                      <input
                        name="experience"
                        value={state.experience}
                        onChange={handleInputs}
                        type="number"
                        min="0"
                        placeholder="Enter years of experience"
                        className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary"
                      />
                    </div>

                    <div>
                      <label className="mb-2.5 block text-black dark:text-white">
                        Degree Completion Date
                      </label>
                      <input
                        type="date"
                        name="degreeCompletionDate"
                        value={state.degreeCompletionDate}
                        onChange={handleInputs}
                        className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary"
                      />
                    </div>

                    <div>
                      <label className="mb-2.5 block text-black dark:text-white">
                        PMDC Number
                      </label>
                      <input
                        name="PMDC"
                        value={state.PMDC}
                        onChange={handleInputs}
                        placeholder="Enter PMDC number"
                        className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary"
                      />
                    </div>

                    {/* Service Availability */}
                    <div className="flex items-center col-span-2">
                      <input
                        type="checkbox"
                        name="OPD"
                        checked={state.OPD}
                        onChange={handleInputs}
                        className="h-5 w-5 mr-2 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                      <label className="text-black dark:text-white">
                        OPD Services Available
                      </label>
                    </div>

                    <div className="flex items-center col-span-2">
                      <input
                        type="checkbox"
                        name="IPD"
                        checked={state.IPD}
                        onChange={handleInputs}
                        className="h-5 w-5 mr-2 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                      <label className="text-black dark:text-white">
                        IPD Services Available
                      </label>
                    </div>
                  </div>


                  <div className="mb-4.5 grid grid-cols-1 md:grid-cols-2 gap-6">
    {/* Existing fields... */}
    
    {/* Consultation Fee */}
    {/* <div>
        <label className="mb-2.5 block text-black dark:text-white">
            Consultation Fee
        </label>
        <input
            name="consultationFee"
            type="number"
            value={state.consultationFee}
            onChange={handleInputs}
            placeholder="Enter consultation fee"
            className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary"
        />
    </div>

    
    <div>
        <label className="mb-2.5 block text-black dark:text-white">
            Follow Up Charges
        </label>
        <input
            name="followUpCharges"
            type="number"
            value={state.followUpCharges}
            onChange={handleInputs}
            placeholder="Enter follow up charges"
            className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary"
        />
    </div> */}

    {/* Share Price */}
    <div>
        <label className="mb-2.5 block text-black dark:text-white">
            Share Price
        </label>
        <input
            name="sharePrice"
            type="number"
            value={state.sharePrice}
            onChange={handleInputs}
            placeholder="Enter share price"
            className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary"
        />
    </div>

    {/* Share Type */}
    <div>
        <label className="mb-2.5 block text-black dark:text-white">
            Share Type
        </label>
        <select
            name="shareType"
            value={state.shareType}
            onChange={handleInputs}
            className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary"
        >
            <option value="Rupees">Rupees</option>
            <option value="Percentage">Percentage</option>
        </select>
    </div>
</div>

                  {/* Roles and Rights Section */}
                  <div className="mt-8">
                    <div className="w-full pb-4">
                      <label className="mb-2.5 block text-black dark:text-white">
                        Add Doctor Roles & Rights
                      </label>
                    </div>
                    <div className=' pb-4'>
                        <label className="flex cursor-pointer select-none ">
                          <div>
                          <input
                            type="checkbox"
                            id="roleDoctor"
                            className="h-5 w-5 text-primary focus:ring-primary border-gray-300 rounded"
                            checked={roleRights.doctor === 'doctor'}
                            onChange={() => handleRoleRightChange('doctor')}
                            required
                          />
                          </div>
                          <span className="ml-2">
                            Doctor (Access to appointments and reports of patients specific to the doctor only)
                          </span>
                        </label>
                      </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      {/* Doctor Role (required) */}
                     

                      {/* Other Rights */}
                      {Object.entries(roleRights)
                        .filter(([key]) => key !== 'doctor')
                        .map(([right]) => (
                          <div key={right}>
                            <label className="flex cursor-pointer select-none items-center">
                              <input
                                type="checkbox"
                                id={right}
                                className="h-5 w-5 text-primary focus:ring-primary border-gray-300 rounded"
                                checked={!!roleRights[right]}
                                onChange={() => handleRoleRightChange(right)}
                              />
                              <span className="ml-2 capitalize">
                                {right.split(/(?=[A-Z])/).join(' ')}
                              </span>
                            </label>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Qualification Tab */}
          {activeTab === "Qualification" && (
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
                <h3 className="font-medium text-black dark:text-white">
                  Doctor Qualifications
                </h3>
              </div>
              <div className="p-6.5">
                {qualifications.map((qual, index) => (
                  <div key={index} className="mb-6 border-b border-stroke pb-6 relative">
                    {qualifications.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQualification(index)}
                        className="absolute top-0 right-0 text-danger hover:text-red-700"
                        title="Remove qualification"
                      >
                        <FaTrashAlt />
                      </button>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="mb-2.5 block text-black dark:text-white">
                          Degree <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          value={qual.degree}
                          onChange={(e) => handleQualificationChange(index, 'degree', e.target.value)}
                          className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary"
                          required
                        />
                      </div>
                      <div>
                        <label className="mb-2.5 block text-black dark:text-white">
                          Institute <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          value={qual.institute}
                          onChange={(e) => handleQualificationChange(index, 'institute', e.target.value)}
                          className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary"
                          required
                        />
                      </div>
                      <div>
                        <label className="mb-2.5 block text-black dark:text-white">
                          Year <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          value={qual.year}
                          onChange={(e) => handleQualificationChange(index, 'year', e.target.value)}
                          className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary"
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addQualification}
                  className="flex justify-center rounded bg-primary p-3 font-medium text-gray hover:bg-primary-dark transition-colors"
                >
                  Add Another Qualification
                </button>
              </div>
            </div>
          )}

          {/* Service Tab */}
          {activeTab === "Service" && (
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
                <h3 className="font-medium text-black dark:text-white">
                  Doctor Services
                </h3>
              </div>
              <div className="p-6.5">
                {services.map((service, index) => (
                  <div key={index} className="mb-6 border-b border-stroke pb-6 relative">
                    {services.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeService(index)}
                        className="absolute top-0 right-0 text-danger hover:text-red-700"
                        title="Remove service"
                      >
                        <FaTrashAlt />
                      </button>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="mb-2.5 block text-black dark:text-white">
                          Service Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          value={service.name}
                          onChange={(e) => handleServiceChange(index, 'name', e.target.value)}
                          className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary"
                          required
                        />
                      </div>
                      <div>
                        <label className="mb-2.5 block text-black dark:text-white">
                          Description <span className="text-danger">*</span>
                        </label>
                        <textarea
                          value={service.description}
                          onChange={(e) => handleServiceChange(index, 'description', e.target.value)}
                          className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary"
                          rows={3}
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addService}
                  className="flex justify-center rounded bg-primary p-3 font-medium text-gray hover:bg-primary-dark transition-colors"
                >
                  Add Another Service
                </button>
              </div>
            </div>
          )}

          {/* Timing Tab */}
          {activeTab === "Timing" && (
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
                <h3 className="font-medium text-black dark:text-white">
                  Doctor Availability
                </h3>
              </div>
              <div className="p-6.5">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Day</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id="selectAll"
                              checked={allDaysSelected}
                              onChange={toggleAllDays}
                              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mr-2"
                            />
                            Available
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration (min)</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {days.map((day) => (
                        <tr key={day.name} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {day.label}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              name={day.name}
                              checked={availability[day.name]}
                              onChange={handleChange}
                              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <TimeInput day={day} type="StartTime" />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <TimeInput day={day} type="EndTime" />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="number"
                              name={`${day.name}Duration`}
                              value={availability[`${day.name}Duration`]}
                              onChange={handleChange}
                              disabled={!availability[day.name]}
                              className={`w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3 text-black outline-none transition focus:border-primary active:border-primary ${
                                !availability[day.name] ? 'bg-gray-100 text-gray-400' : ''
                              }`}
                              min="1"
                              max="1440" // 24 hours in minutes
                              required={availability[day.name]}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 text-sm text-gray-500">
                  <p>Note: Duration is the time allocated per patient appointment in minutes.</p>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="mt-6 flex justify-center">
          <button
  type="submit"
  className={`flex justify-center rounded bg-primary p-3 font-medium text-white hover:bg-primary-dark transition-colors w-full md:w-1/4 ${
    isSubmitting ? 'opacity-75 cursor-not-allowed' : ''
  }`}
  disabled={isSubmitting}
>
  {isSubmitting ? (
    <>
      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      {activeTab === "Timing" ? "Registering..." : "Processing..."}
    </>
  ) : (
    activeTab === "Timing" ? "Complete Registration" : "Continue"
  )}
</button>
          </div>
        </form>
      </div>
    </>
  );
};

export default AddDoctor;