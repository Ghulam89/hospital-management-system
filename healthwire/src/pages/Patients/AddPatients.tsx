import React, { useState, useEffect } from 'react';
import Modal from '../../components/modal';
import { MdClose } from 'react-icons/md';
import axios from 'axios';
import { toast } from 'react-toastify';
import profile2 from '../../images/profile.jpg';

const AddPatients = ({
  isModalOpen,
  setIsModalOpen,
  closeModal,
  fetchPatientData,
}) => {
  const [mrNumber, setMrNumber] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [doctor, setDoctor] = useState('');
  const [cnic, setCnic] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [cnicError, setCnicError] = useState('');
  const [phoneExists, setPhoneExists] = useState(false);
  const [allowDuplicatePhone, setAllowDuplicatePhone] = useState(false);

  useEffect(() => {
    if (isModalOpen) {
      generateMrNumber();
      fetchDoctors();
    }
  }, [isModalOpen]);

  const generateMrNumber = () => {
    const newMrNumber = Math.floor(Math.random() * 1000000).toString();
    setMrNumber(newMrNumber);
  };

  const fetchDoctors = async () => {
    try {
      const response = await axios.get(
        'https://api.holisticare.pk/apis/user/get',
      );
      if (response.data.status === 'ok') {
        const doctors = response.data.data.filter(
          (user) => user.role === 'doctor',
        );
        setDoctors(doctors);
      } else {
        toast.error('Failed to fetch doctors');
      }
    } catch (error) {
      toast.error('Failed to fetch doctors');
    }
  };

  const handleGenderChange = (gender) => {
    setGender(gender);
  };

  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImages, setSelectedImages] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];

    setSelectedImages(file);
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const formatCNIC = (value) => {
    // Remove all non-digit characters
    const cleaned = value.replace(/\D/g, '');
    
    // Limit to 13 digits
    const limited = cleaned.slice(0, 13);
    
    // Format as 12345-1234567-1 if length > 5
    if (limited.length > 5) {
      const part1 = limited.slice(0, 5);
      const part2 = limited.slice(5, 12);
      const part3 = limited.slice(12);
      
      let formatted = part1;
      if (part2) formatted += '-' + part2;
      if (part3) formatted += '-' + part3;
      
      return formatted;
    }
    
    return limited;
  };

  const validateCNIC = (cnic) => {
    // Remove all non-digit characters for validation
    const cleanedCNIC = cnic.replace(/\D/g, '');
    
    // Check if length is 13 digits
    if (cleanedCNIC.length !== 13 && cleanedCNIC.length > 0) {
      setCnicError('CNIC must be 13 digits (with or without dashes)');
      return false;
    }
    
    setCnicError('');
    return true;
  };

  const handleCnicChange = (e) => {
    const value = e.target.value;
    const formattedValue = formatCNIC(value);
    setCnic(formattedValue);
    validateCNIC(formattedValue);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name) {
      toast.error('Must enter name');
    } else if (!phone) {
      toast.error('Must enter phone');
    } else if (!gender) {
      toast.error('Must checked gender');
    } else if (!mrNumber) {
      toast.error('Must enter MR number');
    } else if (cnic && !validateCNIC(cnic)) {
      return;
    } else {
      try {
        // Check for existing phone when duplicate has not been explicitly allowed
        if (!allowDuplicatePhone && phone) {
          const checkRes = await axios.get(
            'https://api.holisticare.pk/apis/patient/get',
            {
              params: { phone, limit: 1 },
            },
          );
          const existing = checkRes?.data?.data || [];
          if (Array.isArray(existing) && existing.length > 0) {
            setPhoneExists(true);
            toast.warn(
              'This phone number already exists. Tick the checkbox below if you still want to use it.',
            );
            return;
          }
        }

        setIsLoading(true);
        const newPatient = new FormData();
        newPatient.append('mr', mrNumber);
        newPatient.append('name', name);
        newPatient.append('phone', phone);
        newPatient.append('gender', gender);
        newPatient.append('dob', dob);
        // newPatient.append('doctorId', doctor);
        newPatient.append('cnic', cnic.replace(/\D/g, ''));
        if (selectedImages) {
          newPatient.append('image', selectedImages);
        }

        const res = await axios.post(
          'https://api.holisticare.pk/apis/patient/create',
          newPatient,
        );
        if (res.data.status === 'ok') {
          setIsLoading(false);
          toast.success('Patient added successfully!');
          clearForm();
          setIsModalOpen(false);
          fetchPatientData();
        } else {
          setIsLoading(false);
          toast.error('Failed to add patient');
        }
      } catch (error) {
        setIsLoading(false);
        console.log(error);
        toast.error(error.response?.data?.message || 'Error adding patient');
      }
    }
  };

  const clearForm = () => {
    setMrNumber('');
    setName('');
    setPhone('');
    setGender('');
    setDob('');
    setDoctor('');
    setCnic('');
    setCnicError('');
    setPhoneExists(false);
    setAllowDuplicatePhone(false);
    setTimeout(() => {
      setSuccessMessage('');
      setIsModalOpen(false);
    }, 3000);
  };

  return (
    <div>
      <Modal isOpen={isModalOpen} onClose={closeModal}>
        <div className="">
          <div className="p-3.5 flex justify-between items-center">
            <h1 className="capitalize text-black h4 font-semibold text-xl">
              Add Patient
            </h1>
            <MdClose onClick={() => setIsModalOpen(false)} size={25} />
          </div>
          <hr className="border-gray" />
          <div className="">
            <form onSubmit={handleSubmit}>
              <div className="p-6.5">
                <div className="flex justify-end">
                  <div className="mb-4.5 flex items-center gap-2">
                    <label className="mb-2.5 block text-black dark:text-white">
                      MR#
                    </label>
                    <input
                      type="text"
                      value={mrNumber}
                      onChange={(e) => setMrNumber(e.target.value)}
                      className="rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    />
                  </div>
                </div>

                <div className=" text-center my-2">
                  {selectedImage ? (
                    <img
                      src={selectedImage}
                      className="mx-auto  w-28  h-28  rounded-xl"
                      alt=""
                    />
                  ) : (
                    <>
                      <div className="mx-auto flex justify-center items-center  bg-gray-100 w-28  h-28  rounded-xl">
                        <img
                          src={profile2}
                          className="mx-auto  w-28  h-28  rounded-full"
                          alt=""
                        />
                      </div>
                    </>
                  )}

                  <div className="  my-5">
                    <label
                      htmlFor="fileInput"
                      className="px-12 py-2 bg-white  font-semibold text-primary border   border-gray-200 rounded-lg cursor-pointer"
                    >
                      Browse File
                    </label>
                    <input
                      accept="image/*"
                      onChange={handleFileChange}
                      name="profileImage"
                      type="file"
                      id="fileInput"
                      className="hidden"
                    />
                  </div>
                </div>
                <div className="mb-4.5">
                  <label className="mb-2.5 block text-black dark:text-white">
                    Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder=""
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  />
                </div>
                <div className="mb-4.5">
                  <label className="mb-2.5 block text-black dark:text-white">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder=""
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  />
                  {phoneExists && (
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <span className="text-gray-700">
                        This phone number already exists. Allow duplicate?
                      </span>
                      <label className="inline-flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={allowDuplicatePhone}
                          onChange={(e) =>
                            setAllowDuplicatePhone(e.target.checked)
                          }
                        />
                        <span>Yes</span>
                      </label>
                    </div>
                  )}
                </div>

                <div>
                  <h1 className="capitalize text-black h4 font-semibold mb-5">
                    Additional Information
                  </h1>
                </div>

                <div className="w-full mb-4.5">
                  <label className="mb-2 block text-black dark:text-white">
                    Gender
                  </label>
                  <div className="flex gap-12 items-center">
                    {['Male', 'Female', 'Other'].map((g) => (
                      <div key={g}>
                        <label className="flex cursor-pointer select-none items-center">
                          <div className="relative">
                            <input
                              type="radio"
                              name="gender"
                              className="sr-only"
                              checked={gender === g}
                              onChange={() => handleGenderChange(g)}
                            />
                            <div
                              className={`mr-4 flex h-5 w-5 items-center justify-center rounded border ${
                                gender === g &&
                                'border-primary bg-gray dark:bg-transparent'
                              }`}
                            >
                              {gender === g && (
                                <svg
                                  width="11"
                                  height="8"
                                  viewBox="0 0 11 8"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    d="M10.0915 0.951972L10.0867 0.946075L10.0813 0.940568C9.90076 0.753564 9.61034 0.753146 9.42927 0.939309L4.16201 6.22962L1.58507 3.63469C1.40401 3.44841 1.11351 3.44879 0.932892 3.63584C0.755703 3.81933 0.755703 4.10875 0.932892 4.29224L0.932878 4.29225L0.934851 4.29424L3.58046 6.95832C3.73676 7.11955 3.94983 7.2 4.1473 7.2C4.36196 7.2 4.55963 7.11773 4.71406 6.9584L10.0468 1.60234C10.2436 1.4199 10.2421 1.1339 10.0915 0.951972Z"
                                    fill="#3056D3"
                                    stroke="#3056D3"
                                    strokeWidth="0.4"
                                  />
                                </svg>
                              )}
                            </div>
                          </div>
                          {g}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-4.5">
                  <label className="mb-2.5 block text-black dark:text-white">
                    DOB
                  </label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    placeholder=""
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  />
                </div>

                {/* <div className="mb-4.5">
                  <label className="mb-2.5 block text-black dark:text-white">
                    Doctor
                  </label>
                  <select
                    value={doctor}
                    onChange={(e) => setDoctor(e.target.value)}
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  >
                    <option value="" disabled>
                      Select Doctor
                    </option>
                    {doctors.map((doc) => (
                      <option key={doc._id} value={doc._id}>
                        {doc.name}
                      </option>
                    ))}
                  </select>
                </div> */}

                <div className="mb-4.5">
                  <label className="mb-2.5 block text-black dark:text-white">
                    CNIC
                  </label>
                  <input
                    type="text"
                    value={cnic}
                    onChange={handleCnicChange}
                    placeholder="1234512345671 or 12345-1234567-1"
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  />
                  {cnicError && (
                    <p className="text-red-500 text-sm mt-1">{cnicError}</p>
                  )}
                </div>

                <div className="flex justify-end gap-4.5">
                  <button
                    type="button"
                    className="flex justify-center rounded bg-white border py-2 px-6 font-medium text-primary"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex justify-center rounded bg-primary py-2 px-6 font-medium text-gray"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <svg
                          className="animate-spin h-5 w-5 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Adding...
                      </div>
                    ) : (
                      'Add'
                    )}
                  </button>
                </div>
                {successMessage && (
                  <div className="mt-4 text-center text-green-500">
                    {successMessage}
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AddPatients;