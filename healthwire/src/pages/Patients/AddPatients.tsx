import React, { useState, useEffect, useRef } from 'react';
import Modal from '../../components/modal';
import { MdClose } from 'react-icons/md';
import axios from 'axios';
import { toast } from 'react-toastify';
import profile2 from '../../images/profile.jpg';
import { Base_url } from '../../utils/Base_url';
import {
  getSuperadminSelectedBranchId,
  getUserDataFromStorage,
  isSuperAdminRole,
} from '../../utils/branchScope';

function appendBranchIdToFormData(form: FormData) {
  try {
    const raw = localStorage.getItem('userData');
    if (!raw) return;
    const u = JSON.parse(raw) as { branchId?: string | { _id?: string } };
    const bid = u?.branchId && typeof u.branchId === 'object' ? u.branchId?._id : u?.branchId;
    if (bid) form.append('branchId', String(bid));
  } catch {
    /* ignore */
  }
}

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
  const [cnicCheckLoading, setCnicCheckLoading] = useState(false);
  const [cnicDuplicateInfo, setCnicDuplicateInfo] = useState<{
    exists: boolean;
    inThisBranch: boolean;
    unscoped?: boolean;
    patient?: { mr?: string; name?: string; _id?: string };
  } | null>(null);
  const [linkingToBranch, setLinkingToBranch] = useState(false);
  const cnicCheckAbortRef = useRef<AbortController | null>(null);
  const cnicCheckGenRef = useRef(0);

  useEffect(() => {
    if (isModalOpen) {
      generateMrNumber();
      fetchDoctors();
    }
  }, [isModalOpen]);

  const runCnicCheck = (cnicValue: string) => {
    const cleaned = cnicValue.replace(/\D/g, '');
    if (cleaned.length !== 13) {
      setCnicDuplicateInfo(null);
      setCnicCheckLoading(false);
      return;
    }
    cnicCheckAbortRef.current?.abort();
    const ac = new AbortController();
    cnicCheckAbortRef.current = ac;
    const gen = ++cnicCheckGenRef.current;
    setCnicCheckLoading(true);
    axios
      .get(`${Base_url}/apis/patient/check-cnic`, {
        params: { cnic: cnicValue },
        signal: ac.signal,
      })
      .then((r) => {
        if (gen !== cnicCheckGenRef.current) return;
        const d = r.data;
        if (d?.exists) setCnicDuplicateInfo(d);
        else setCnicDuplicateInfo(null);
      })
      .catch((err) => {
        if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError' || err?.name === 'AbortError') return;
        if (gen !== cnicCheckGenRef.current) return;
        setCnicDuplicateInfo(null);
      })
      .finally(() => {
        if (gen === cnicCheckGenRef.current) setCnicCheckLoading(false);
      });
  };

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
    const cleaned = formattedValue.replace(/\D/g, '');
    if (cleaned.length < 13) {
      cnicCheckAbortRef.current?.abort();
      setCnicDuplicateInfo(null);
      setCnicCheckLoading(false);
      return;
    }
    runCnicCheck(formattedValue);
  };

  const cnicDuplicateMessage = (info: typeof cnicDuplicateInfo) => {
    if (!info?.exists) return null;
    if (info.unscoped) {
      return 'This CNIC is already registered. Search the patient in the list instead of creating a duplicate.';
    }
    if (info.inThisBranch) {
      return 'This patient is already on file at this branch. Do not create a duplicate record.';
    }
    return 'This CNIC is already registered in another branch. You can link this patient to the current branch using the button below, or find them in the list.';
  };

  const showLinkOtherBranchButton =
    cnicDuplicateInfo &&
    cnicDuplicateInfo.exists &&
    !cnicDuplicateInfo.inThisBranch &&
    !cnicDuplicateInfo.unscoped &&
    cnicDuplicateInfo.patient?._id;

  const linkPatientToThisBranch = async () => {
    const id = cnicDuplicateInfo?.patient?._id;
    if (!id) return;
    const u = getUserDataFromStorage();
    const payload: Record<string, string> = { patientId: String(id), visitType: 'OPD' };
    if (isSuperAdminRole(u?.role)) {
      const bid = getSuperadminSelectedBranchId();
      if (!bid) {
        toast.error('Select a branch in the top bar, then try again.');
        return;
      }
      payload.branchId = bid;
    }
    setLinkingToBranch(true);
    try {
      await axios.post(`${Base_url}/apis/visits`, payload);
      toast.success('Patient linked to this branch. You can find them in the list.');
      runCnicCheck(cnic);
      fetchPatientData();
    } catch {
      toast.error('Could not link to this branch. Try again or use Open visit from the patient list.');
    } finally {
      setLinkingToBranch(false);
    }
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
    } else {
      const cleanedCnic = cnic.replace(/\D/g, '');
      if (cleanedCnic.length !== 13) {
        setCnicError('CNIC is required and must be 13 digits (with or without dashes).');
        toast.error('Enter a valid 13-digit CNIC before registering a patient.');
        return;
      }
      if (!validateCNIC(cnic)) {
        return;
      }
      try {
        const cnicRes = await axios.get(`${Base_url}/apis/patient/check-cnic`, {
          params: { cnic: cnic },
        });
        const d = cnicRes.data;
        if (d?.exists) {
          toast.error(cnicDuplicateMessage(d) || 'This CNIC is already registered.');
          return;
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

        appendBranchIdToFormData(newPatient);

        const res = await axios.post(`${Base_url}/apis/patient/create`, newPatient);
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
    setCnicDuplicateInfo(null);
    cnicCheckAbortRef.current?.abort();
    setLinkingToBranch(false);
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
                    CNIC <span className="text-red-500">*</span>
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
                  {cnicCheckLoading && !cnicError && (
                    <p className="text-body dark:text-bodydark text-sm mt-1">Checking CNIC…</p>
                  )}
                  {!cnicError && cnicDuplicateMessage(cnicDuplicateInfo) && (
                    <div
                      className={`mt-2 rounded-md border p-2.5 text-sm ${
                        cnicDuplicateInfo &&
                        cnicDuplicateInfo.exists &&
                        !cnicDuplicateInfo.inThisBranch &&
                        !cnicDuplicateInfo.unscoped
                          ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100'
                          : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200'
                      }`}
                    >
                      <p className="leading-snug">{cnicDuplicateMessage(cnicDuplicateInfo)}</p>
                      {cnicDuplicateInfo?.patient && (
                        <p className="mt-1 text-xs opacity-90">
                          MR# {cnicDuplicateInfo.patient.mr || '—'} · {cnicDuplicateInfo.patient.name || '—'}
                        </p>
                      )}
                      {showLinkOtherBranchButton && (
                        <button
                          type="button"
                          onClick={linkPatientToThisBranch}
                          disabled={linkingToBranch}
                          className="mt-2 inline-flex w-full items-center justify-center rounded-md border border-primary bg-primary px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                        >
                          {linkingToBranch ? 'Linking…' : 'Link to this branch'}
                        </button>
                      )}
                    </div>
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
                    className="flex justify-center rounded bg-primary py-2 px-6 font-medium text-white disabled:opacity-50"
                    disabled={
                      isLoading ||
                      !!(cnicDuplicateInfo && cnicDuplicateInfo.exists) ||
                      cnic.replace(/\D/g, '').length !== 13
                    }
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
