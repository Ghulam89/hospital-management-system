import { Link, useNavigate } from 'react-router-dom';
import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import Select from 'react-select';

const AddBirthCertificate = () => {
  const [state, setState] = useState({
    babyName: '',
    motherId: '',
    motherMr: '',
    motherNic: '',
    fatherName: '',
    fatherCnic: '',
    deliveryNo: '',
    modeOfdelivery: '',
    birthMark: '',
    phone: '',
    address: '',
    dob: '',
    gender: '',
    weight: '',
    height: '',
    headCircumference: '',
    remarks: '',
    doctorId: '',
  });
  console.log(state);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputs = (e) => {
    if (e.target.name === 'fatherCnic') {
      
      const value = e.target.value.replace(/\D/g, '');
      setState({ ...state, [e.target.name]: value });
    } else {
      setState({ ...state, [e.target.name]: e.target.value });
    }
  };
  const navigate = useNavigate();
  const validateCNIC = (cnic) => {
    // Remove any non-digit characters
    const cleanedCNIC = cnic.replace(/\D/g, '');
    // CNIC should be exactly 13 digits
    return cleanedCNIC.length === 13;
  };
  const SubmitFun = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    if (!state.babyName) {
      toast.error('Baby name is required');
      return;
    }
    if (!state.motherId) {
      toast.error('Mother information is required');
      return;
    }
    if (!state.doctorId) {
      toast.error('Doctor is required');
      return;
    }
    if (!state.dob) {
      toast.error('Date of birth is required');
      return;
    }
    
    // Add CNIC validation if CNIC is provided
    if (state.fatherCnic && !validateCNIC(state.fatherCnic)) {
      toast.error('Father CNIC must be exactly 13 digits');
      return;
    }
  
    axios
      .post('https://api.holisticare.pk/apis/birthCertificate/create', state)
      .then((res) => {
        if (res.data.status === 'ok') {
          toast.success('Birth certificate created successfully!');
          navigate('/birth-reports');
          setIsSubmitting(false);
        } else {
          toast.error(res.data.message || 'Failed to create birth certificate');
          setIsSubmitting(false);
        }
      })
      .catch((error) => {
        console.error(error);
        toast.error(error.response?.data?.message || 'An error occurred');
        setIsSubmitting(false);
      });
  };
  const [allMothers, setAllMothers] = useState([]);
  const [allDoctors, setAllDoctors] = useState([]);
  const [motherOptions, setMotherOptions] = useState([]);

  useEffect(() => {
    // Fetch mothers (female patients)
    axios
      .get(`https://api.holisticare.pk/apis/patient/get?gender=Female`)
      .then((res) => {
        setAllMothers(res.data.data);
       
        const options = res.data.data.map(mother => ({
          value: mother._id,
          label: mother.name,
          mrNumber: mother.mr || '',
          nic: mother.cnic || ''
        }));
        setMotherOptions(options);
      })
      .catch((error) => {
        console.error('Error fetching mothers:', error);
      });

    // Fetch doctors
    axios
      .get(`https://api.holisticare.pk/apis/user/get?role=doctor`)
      .then((res) => {
        setAllDoctors(res.data.data);
      })
      .catch((error) => {
        console.error('Error fetching doctors:', error);
      });
  }, []);

  const handleMotherChange = (selectedOption) => {
    console.log(selectedOption);
    
    if (selectedOption) {
      setState({
        ...state,
        motherId: selectedOption.value,
        motherMr: selectedOption.mrNumber,
        motherNic: selectedOption.nic
      });
    } else {
      setState({
        ...state,
        motherId: '',
        motherMr: '',
        motherNic: ''
      });
    }
  };

  return (
    <>
      <Breadcrumb pageName="Add New Birth Certificate" />

      <div className="">
        <div className="flex flex-col gap-9">
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">
                Add New Birth Certificate
              </h3>
            </div>
            <form onSubmit={SubmitFun} action="#">
              <div className="p-6.5">
                <div className="mb-4.5 grid grid-cols-2 gap-6 xl:flex-row">
                  <div className="w-full">
                    <label className="mb-2.5 block text-black dark:text-white">
                      Baby Name <span className="text-red">*</span>
                    </label>
                    <input
                      onChange={handleInputs}
                      name="babyName"
                      type="text"
                      required
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    />
                  </div>
                  
                  <div className="w-full">
                    <label className="mb-2.5 block text-black dark:text-white">
                      Mother <span className="text-red">*</span>
                    </label>
                    <Select
                      options={motherOptions}
                      onChange={handleMotherChange}
                      placeholder="Search and select mother..."
                      isSearchable
                      required
                      className="react-select-container"
                      classNamePrefix="react-select"
                      styles={{
                        control: (provided) => ({
                          ...provided,
                          minHeight: '56px',
                          border: '1.5px solid #e0e0e0',
                          borderRadius: '4px',
                          backgroundColor: 'transparent',
                          '&:hover': {
                            borderColor: '#3b82f6',
                          },
                        }),
                        input: (provided) => ({
                          ...provided,
                          color: '#000',
                        }),
                        singleValue: (provided) => ({
                          ...provided,
                          color: '#000',
                        }),
                        placeholder: (provided) => ({
                          ...provided,
                          color: '#9ca3af',
                        }),
                      }}
                    />
                    <input
                      type="hidden"
                      name="motherId"
                      value={state.motherId}
                      required
                    />
                  </div>
                  
                  <div className="w-full">
                    <label className="mb-2.5 block text-black dark:text-white">
                      Mother MR#
                    </label>
                    <input
                      name="motherMr"
                      type="text"
                      value={state.motherMr}
                      disabled
                      className="w-full rounded border-[1.5px] border-stroke bg-gray-100 py-3 px-5 text-black outline-none transition dark:border-form-strokedark dark:bg-form-input dark:text-white"
                    />
                  </div>
                  
                  <div className="w-full">
                    <label className="mb-2.5 block text-black dark:text-white">
                      Mother CNIC#
                    </label>
                    <input
                      name="motherNic"
                      type="text"
                      value={state.motherNic}
                      disabled
                      className="w-full rounded border-[1.5px] border-stroke bg-gray-100 py-3 px-5 text-black outline-none transition dark:border-form-strokedark dark:bg-form-input dark:text-white"
                    />
                  </div>
                  
                  <div className="w-full">
                    <label className="mb-2.5 block text-black dark:text-white">
                      Father Name
                    </label>
                    <input
                      onChange={handleInputs}
                      name="fatherName"
                      type="text"
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    />
                  </div>
                  
                  <div className="w-full">
  <label className="mb-2.5 block text-black dark:text-white">
    Father CNIC#
  </label>
  <input
    onChange={handleInputs}
    name="fatherCnic"
    type="text"
    value={state.fatherCnic}
    maxLength={13}
    placeholder="1234512345671"
    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
    onBlur={(e) => {
     
      const cleaned = e.target.value.replace(/\D/g, '');
      if (cleaned.length === 13) {
        const formatted = `${cleaned.substring(0, 5)}-${cleaned.substring(5, 12)}-${cleaned.substring(12)}`;
        setState({...state, fatherCnic: formatted});
      }
    }}
  />
  {state.fatherCnic && !validateCNIC(state.fatherCnic) && (
    <p className="mt-1 text-sm text-red-500">CNIC must be exactly 13 digits</p>
  )}
</div>
                  <div className="w-full">
  <label className="mb-2.5 block text-black dark:text-white">
    Doctor <span className="text-red">*</span>
  </label>
  <Select
    options={allDoctors?.map(doctor => ({
      value: doctor._id,
      label: doctor.name
    }))}
    onChange={(selectedOption) => {
      setState({...state, doctorId: selectedOption?.value || ''});
    }}
    placeholder="Search and select doctor..."
    isSearchable
    required
    className="react-select-container"
    classNamePrefix="react-select"
    styles={{
      control: (provided) => ({
        ...provided,
        minHeight: '56px',
        border: '1.5px solid #e0e0e0',
        borderRadius: '4px',
        backgroundColor: 'transparent',
        '&:hover': {
          borderColor: '#3b82f6',
        },
      }),
      input: (provided) => ({
        ...provided,
        color: '#000',
      }),
      singleValue: (provided) => ({
        ...provided,
        color: '#000',
      }),
      placeholder: (provided) => ({
        ...provided,
        color: '#9ca3af',
      }),
    }}
  />
  <input
    type="hidden"
    name="doctorId"
    value={state.doctorId}
    required
  />
</div>
                  <div className="w-full">
                    <label className="mb-2.5 block text-black dark:text-white">
                      Delivery No
                    </label>
                    <input
                      onChange={handleInputs}
                      name="deliveryNo"
                      type="text"
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    />
                  </div>
                  
                  <div className="w-full">
                    <label className="mb-2.5 block text-black dark:text-white">
                      Mode of Delivery
                    </label>
                    <select
                      name="modeOfdelivery"
                      onChange={handleInputs}
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    >
                      <option value="">Select Mode</option>
                      <option value="Normal">Normal</option>
                      <option value="C-Section">C-Section</option>
                      <option value="Assisted">Assisted</option>
                    </select>
                  </div>
                  
                  <div className="w-full">
                    <label className="mb-2.5 block text-black dark:text-white">
                      Birth Mark
                    </label>
                    <input
                      onChange={handleInputs}
                      name="birthMark"
                      type="text"
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    />
                  </div>
                  
                  <div className="w-full">
                    <label className="mb-2.5 block text-black dark:text-white">
                      Phone
                    </label>
                    <input
                      onChange={handleInputs}
                      name="phone"
                      type="text"
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    />
                  </div>
                  
               
                  
                  <div className="w-full">
                    <label className="mb-2.5 block text-black dark:text-white">
                      Date of Birth <span className="text-red">*</span>
                    </label>
                    <input
                      onChange={handleInputs}
                      name="dob"
                      type="date"
                      required
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    />
                  </div>
                  
                  <div className="w-full">
                    <label className="mb-2.5 block text-black dark:text-white">
                      Gender
                    </label>
                    <select
                      name="gender"
                      onChange={handleInputs}
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  
                  <div className="w-full">
                    <label className="mb-2.5 block text-black dark:text-white">
                      Weight (kg)
                    </label>
                    <input
                      onChange={handleInputs}
                      name="weight"
                      type="number"
                      step="0.01"
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    />
                  </div>
                  
                  <div className="w-full">
                    <label className="mb-2.5 block text-black dark:text-white">
                      Height (cm)
                    </label>
                    <input
                      onChange={handleInputs}
                      name="height"
                      type="number"
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    />
                  </div>
                  
                  <div className="w-full">
                    <label className="mb-2.5 block text-black dark:text-white">
                      Head Circumference (cm)
                    </label>
                    <input
                      onChange={handleInputs}
                      name="headCircumference"
                      type="number"
                      step="0.1"
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    />
                  </div>
             
                  <div className="w-full">
                    <label className="mb-2.5 block text-black dark:text-white">
                      Address
                    </label>
                    <textarea
                      rows={3}
                      name="address"
                      onChange={handleInputs}
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    />
                  </div>
                  <div className="w-full">
                    <label className="mb-2.5 block text-black dark:text-white">
                      Remarks
                    </label>
                    <textarea
                      rows={3}
                      name="remarks"
                      onChange={handleInputs}
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    />
                  </div>
                </div>
              
                <div className="mt-4.5">
        <button
          type="submit"
          disabled={isSubmitting}
          className={`flex justify-center rounded bg-primary p-3 font-medium text-gray hover:bg-opacity-90 ${
            isSubmitting ? 'opacity-75 cursor-not-allowed' : ''
          }`}
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : (
            'Add Birth Certificate'
          )}
        </button>
      </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddBirthCertificate;