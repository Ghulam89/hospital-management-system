import { Link, useNavigate } from 'react-router-dom';
import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import Select from 'react-select';

const AddDeathCertificate = () => {
  const [state, setState] = useState({
    patientId: '',
    patientNic: '',
    fatherName: '',
    address: '',
    dob: '',
    dateofAdmission: '',
    guardName: '',
    guardNic: '',
    phone: '',
    ageYears: '',
    ageMonths: '',
    ageDays: '',
    dod: '',
    gender: '',
    causeOfDeath: '',
    doctorId: '',
  });


  console.log(state);
  

  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleInputs = (e) => {
    setState({ ...state, [e.target.name]: e.target.value });
  };

  const SubmitFun = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Basic validation
    if (!state.patientId) {
      toast.error('Patient is required');
      setIsSubmitting(false);
      return;
    }
    if (!state.dod) {
      toast.error('Date of death is required');
      setIsSubmitting(false);
      return;
    }

    axios
      .post('https://api.holisticare.pk/apis/deathCertificate/create', state)
      .then((res) => {
        if (res.data.status === 'ok') {
          toast.success('Death certificate created successfully!');
          navigate('/death-reports');
        } else {
          toast.error(res.data.message || 'Failed to create death certificate');
        }
        setIsSubmitting(false);
      })
      .catch((error) => {
        console.error(error);
        toast.error(error.response?.data?.message || 'An error occurred');
        setIsSubmitting(false);
      });
  };

  const [patientOptions, setPatientOptions] = useState([]);
  const [allDoctors, setAllDoctors] = useState([]);

  useEffect(() => {
    // Fetch patients
    axios
      .get(`https://api.holisticare.pk/apis/patient/get`)
      .then((res) => {
        const options = res.data.data.map(patient => ({
          value: patient._id,
          label: patient.name,
          nic: patient.cnic || '',
          fatherName: patient.fatherName || '',
          address: patient.address || '',
          dob: patient.dob || '',
          phone: patient.phone || '',
          gender: patient.gender || ''
        }));
        setPatientOptions(options);
      })
      .catch((error) => {
        console.error('Error fetching patients:', error);
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

  const handlePatientChange = (selectedOption) => {
    if (selectedOption) {
      setState({
        ...state,
        patientId: selectedOption.value,
        patientNic: selectedOption.nic,
        fatherName: selectedOption.fatherName,
        address: selectedOption.address,
        dob: selectedOption.dob,
        gender: selectedOption.gender
      });
    } else {
      setState({
        ...state,
        patientId: '',
        patientNic: '',
        fatherName: '',
        address: '',
        dob: '',
        gender: ''
      });
    }
  };

  return (
    <>
      <Breadcrumb pageName="Add New Death Certificate" />

      <div className="">
        <div className="flex flex-col gap-9">
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">
                Add New Death Certificate
              </h3>
            </div>
            <form onSubmit={SubmitFun} action="#">
              <div className="p-6.5">
                <div className="mb-4.5 grid grid-cols-2 gap-6 xl:flex-row">
                  <div className="w-full">
                    <label className="mb-2.5 block text-black dark:text-white">
                      Patient <span className="text-red">*</span>
                    </label>
                    <Select
                      options={patientOptions}
                      onChange={handlePatientChange}
                      placeholder="Search By Name, MR# or Phone"
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
                  </div>

                  <div className="w-full">
                    <label className="mb-2.5 block text-black dark:text-white">
                      Patient/NSC
                    </label>
                    <input
                      name="patientNic"
                      type="text"
                      value={state.patientNic}
                      onChange={handleInputs}
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    />
                  </div>

                  <div className="w-full">
                    <label className="mb-2.5 block text-black dark:text-white">
                      Name of father
                    </label>
                    <input
                      name="fatherName"
                      type="text"
                      value={state.fatherName}
                      onChange={handleInputs}
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    />
                  </div>

                  <div className="w-full">
                    <label className="mb-2.5 block text-black dark:text-white">
                      Address
                    </label>
                    <input
                      name="address"
                      type="text"
                      value={state.address}
                      onChange={handleInputs}
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    />
                  </div>

                  <div className="w-full">
                    <label className="mb-2.5 block text-black dark:text-white">
                      Date of birth
                    </label>
                    <input
                      name="dob"
                      type="date"
                      value={state.dob}
                      onChange={handleInputs}
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    />
                  </div>

                  <div className="w-full">
                    <label className="mb-2.5 block text-black dark:text-white">
                      Date of admission
                    </label>
                    <input
                      name="dateofAdmission"
                      type="date"
                      value={state.dateofAdmission}
                      onChange={handleInputs}
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    />
                  </div>

                  <div className="w-full">
                    <label className="mb-2.5 block text-black dark:text-white">
                    Guardian/ Attendant/ Spouse
                    </label>
                    <input
                      name="guardName"
                      type="text"
                      value={state.guardName}
                      onChange={handleInputs}
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    />
                  </div>

                 
                  <div className="w-full">
                    <label className="mb-2.5 block text-black dark:text-white">
                    NIC of Guardian/ Attendant/ Spouse
                    </label>
                    <input
                      name="guardNic"
                      type="text"
                      value={state.guardNic}
                      onChange={handleInputs}
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    />
                  </div>

                  <div className="w-full">
                    <label className="mb-2.5 block text-black dark:text-white">
                    Phone# of spouse/ guardian/ attendant
                    </label>
                    <input
                      name="phone"
                      type="text"
                      value={state.phone}
                      onChange={handleInputs}
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    />
                  </div>

                 

                  <div className="w-full">
                    <label className="mb-2.5 block text-black dark:text-white">
                      Age
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <input
                          name="ageYears"
                          type="number"
                          placeholder="Years"
                          value={state.ageYears}
                          onChange={handleInputs}
                          className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                        />
                      </div>
                      <div>
                        <input
                          name="ageMonths"
                          type="number"
                          placeholder="Months"
                          value={state.ageMonths}
                          onChange={handleInputs}
                          className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                        />
                      </div>
                      <div>
                        <input
                          name="ageDays"
                          type="number"
                          placeholder="Days"
                          value={state.ageDays}
                          onChange={handleInputs}
                          className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="w-full">
                    <label className="mb-2.5 block text-black dark:text-white">
                      Date of death <span className="text-red">*</span>
                    </label>
                    <input
                      name="dod"
                      type="date"
                      value={state.dod}
                      onChange={handleInputs}
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
                      value={state.gender}
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
                      Cause of death
                    </label>
                    <textarea
                      name="causeOfDeath"
                      rows={3}
                      value={state.causeOfDeath}
                      onChange={handleInputs}
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    />
                  </div>

                  <div className="w-full">
                    <label className="mb-2.5 block text-black dark:text-white">
                      Doctor on duty
                    </label>
                    <Select
                      options={allDoctors?.map(doctor => ({
                        value: doctor._id,
                        label: doctor.name
                      }))}
                      onChange={(selectedOption) => {
                        setState({...state, doctorId: selectedOption?.value || ''});
                      }}
                      placeholder="Select doctor..."
                      isSearchable
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
                      'Add Death Certificate'
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

export default AddDeathCertificate;