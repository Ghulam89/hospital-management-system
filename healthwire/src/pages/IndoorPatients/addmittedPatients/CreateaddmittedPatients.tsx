import { Link, useNavigate } from 'react-router-dom';
import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const CreateAddmittedPatients = () => {
  const [gender, setGender] = useState('ward');

  console.log(gender);

  const handleGenderChange = (gender) => {
    setGender(gender);
  };

  const [state, setState] = useState({
    patientId: '',
    wardId: '',
    bedDetailId: '',
    roomId: '',
    roomDetailId: '',
    allocationType: '',
    admissionDate: '',
    admissionTime: '',
    admissionReason: '',
    emergencyContact: '',
    admissionNo: '',
    diagnosis: '',
    consultant: '',
    anesthetist: '',
    doctorId: '',
    operationDate: '',
    procedureName: '',
  });

  console.log(state);
  

  const handleInputs = (e) => {
    setState({ ...state, [e.target.name]: e.target.value });
  };
  console.log(state);

  const navigate = useNavigate();

  const SubmitFun = (e) => {
    e.preventDefault();
    console.log(state);
    
    if (!state.patientId) {
      toast('Must select  patient!');
    } else if (!gender) {
      toast('Please checked your  type');
    } else if (!state.doctorId) {
      toast('Must select  doctor!');
    } else {
      const data = {
        patientId: state.patientId,
        doctorId: state.doctorId,
        allocationType:gender,
        admissionDate: state.admissionDate,
        admissionTime: state.admissionTime,
        admissionReason: state.admissionReason,
        emergencyContact: state.emergencyContact,
        admissionNo: state.admissionNo,
        diagnosis: state.diagnosis,
        consultant: state.consultant,
        anesthetist: state.anesthetist,
        operationDate: state.operationDate,
        procedureName: state.procedureName,
        status:true
      };

      if (gender === 'ward') {
        if (!state.wardId || !state.bedDetailId) {
          toast.error('Ward and Bed details are required');
          setLoading(false);
          return;
        }
        data.wardId = state.wardId;
        data.bedDetailId = state.bedDetailId;
      } else {
        if (!state.roomId || !state.roomDetailId) {
          toast.error('Room and Room details are required');
          setLoading(false);
          return;
        }
        data.roomId = state.roomId;
        data.roomDetailId = state.roomDetailId;
      }
      console.log(data);
      
      axios
        .post('https://api.holisticare.pk/apis/admitPatient/create', data)
        .then((res) => {
          console.log(res.data);

          if (res.data.status === 'ok') {
            toast.success('Patients addmitted successfully!');
            navigate('/admin/beds');
          } else {
          }
        })
        .catch((error) => {
          console.log(error);

          toast.error(error.response.data.message);
        });
    }
  };

  const [allpatients, setAllPatients] = useState([]);
  const [alldoctor, setAllDoctor] = useState([]);
  const [allWard, setAllWard] = useState([]);
  const [allBeds, setAllBeds] = useState([]);
  const [allRoom, setAllRoom] = useState([]);
  const [allRoomsDetail, setAllRoomsDetail] = useState([]);
  useEffect(() => {
    axios
      .get(`https://api.holisticare.pk/apis/patient/get`)
      .then((res) => {
        console.log(res);
        setAllPatients(res.data.data);
      })
      .catch((error) => {});



      axios
      .get(`https://api.holisticare.pk/apis/user/get`)
      .then((res) => {
        console.log(res);
        
        const doctors = res.data.data.filter(user => user.role === 'doctor');
        setAllDoctor(doctors);
      })
      .catch((error) => {});


      axios
      .get(`https://api.holisticare.pk/apis/ward/get`)
      .then((res) => {
        console.log(res);
        setAllWard(res.data.data);
      })
      .catch((error) => {});

      axios
      .get(`https://api.holisticare.pk/apis/bedDetail/get?status=available&wardId=${state?.wardId}`)
      .then((res) => {
        console.log(res);
        setAllBeds(res.data.data);
      })
      .catch((error) => {});

      axios
      .get(`https://api.holisticare.pk/apis/room/get`)
      .then((res) => {
        console.log(res);
        setAllRoom(res.data.data);
      })
      .catch((error) => {});



      axios
      .get(`https://api.holisticare.pk/apis/roomDetail/get?status=available&roomId=${state?.roomId}`)
      .then((res) => {
        console.log(res.data,'adfdflkaja');
        setAllRoomsDetail(res.data.data);
      })
      .catch((error) => {});

  },[state?.wardId,state?.roomId]);

 

  
  return (
    <>
      <Breadcrumb pageName="Assign Bed/Room" />

      <div className="">
        <div className="flex flex-col gap-9">
          {/* Contact Form */}
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">
                Assign Bed/Room
              </h3>
            </div>
            <form onSubmit={SubmitFun} action="#">
              <div className="p-6.5">
                <div className="mb-4.5 grid grid-cols-2 gap-6 xl:flex-row">
                  <div className="w-full">
                    <label className="mb-2.5 block text-black dark:text-white">
                      Patient
                    </label>

                    <select
                    name="patientId"
                    
                      onChange={handleInputs}
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    >
                      <option>Select patient</option>
                      {allpatients?.map((item, index) => {
                        return (
                          <option value={item?._id} >
                            {item?.name}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="w-full">
                    <label className="mb-2.5 block text-black dark:text-white">
                      Doctor
                    </label>

                    <select
                      onChange={handleInputs}
                      name="doctorId"
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    >
                      <option>Select doctor</option>
                      {alldoctor?.map((item, index) => {
                        return (
                          <option value={item?._id} key={index}>
                            {item?.name}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="w-full">
                    <label className="mb-2.5 block text-black dark:text-white">
                      Allocation Type
                    </label>
                    <div className="flex pt-4 gap-12 items-center">
                      {['ward', 'room'].map((g) => (
                        <div key={g}>
                          <label className="flex cursor-pointer capitalize select-none items-center">
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
                                      d="M10.0915 0.951972L10.0867 0.946075L10.0813 0.940568C9.90076 0.753564 9.61034 0.753146 9.42927 0.939309L4.16201 6.22962L1.58507 3.63469C1.40401 3.44841 1.11351 3.44879 0.932892 3.63584C0.755703 3.81933 0.755703 4.10875 0.932892 4.29225L3.76857 7.14668L3.77343 7.15263C3.95387 7.33963 4.24434 7.33921 4.42541 7.15304L10.0867 1.33393L10.0915 1.32804C10.2668 1.14564 10.2668 0.858505 10.0915 0.676105Z"
                                      fill="#3056D3"
                                      stroke="#3056D3"
                                      strokeWidth="0.4"
                                    ></path>
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

                  <div className="mb-4.5 grid grid-cols-2 gap-6 xl:flex-row">
                  {gender === 'ward' && (
                    <>
                      <div className="w-full">
                        <label className="mb-2.5 block text-black dark:text-white">
                          Ward Type
                        </label>
                        <select
                          onChange={handleInputs}
                          name="wardId"
                          className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                        >
                          <option>Select Ward</option>
                          {allWard?.map((item, index) => (
                            <option value={item?._id} key={index}>
                              {item?.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="w-full">
                        <label className="mb-2.5 block text-black dark:text-white">
                          Bed #
                        </label>
                        <select
                          onChange={handleInputs}
                          name="bedDetailId"
                          className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                        >
                          <option>Select Bed #</option>
                          {allBeds?.map((item, index) => (
                            <option value={item?._id} key={index}>
                              {item?.bedNo}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  {gender === 'room' && (
                    <>
                      <div className="w-full">
                        <label className="mb-2.5 block text-black dark:text-white">
                          Room Type
                        </label>
                        <select
                          onChange={handleInputs}
                          name="roomId"
                          className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                        >
                          <option>Select Room</option>
                          {allRoom?.map((item, index) => (
                            <option value={item?._id} key={index}>
                              {item?.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="w-full">
                        <label className="mb-2.5 block text-black dark:text-white">
                          Room #
                        </label>
                        <select
                          onChange={handleInputs}
                          name="roomDetailId"
                          className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                        >
                          <option>Select Room #</option>
                          {allRoomsDetail?.map((item, index) => (
                            <option value={item?._id} key={index}>
                              {item?.roomNo}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                </div>

                  <div className="w-full">
                    <label className="mb-2.5 block text-black dark:text-white">
                      Admission Date*
                    </label>
                    <input
                      onChange={handleInputs}
                      name="admissionDate"
                      type="Date"
                      placeholder=""
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    />
                  </div>
                  <div className="w-full">
                    <label className="mb-2.5 block text-black dark:text-white">
                      Admission Time*
                    </label>
                    <input
                      onChange={handleInputs}
                      name="admissionTime"
                      type='time'
                      placeholder=""
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    />
                  </div>

                  <div className="w-full">
                    <label className="mb-2.5 block text-black dark:text-white">
                      Reason for admission
                    </label>
                    <input
                      onChange={handleInputs}
                      name="admissionReason"
                      type="text"
                      placeholder=""
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    />
                  </div>

                  <div className="w-full">
                    <label className="mb-2.5 block text-black dark:text-white">
                      Emergency contact
                    </label>
                    <input
                      onChange={handleInputs}
                      name="emergencyContact"
                      type="text"
                      placeholder=""
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    />
                  </div>
                  <div className="w-full">
                    <label className="mb-2.5 block text-black dark:text-white">
                      Admission no
                    </label>
                    <input
                      onChange={handleInputs}
                      name="admissionNo"
                      type="number"
                      placeholder=""
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    />
                  </div>
                  <div className="w-full">
                    <label className="mb-2.5 block text-black dark:text-white">
                      Diagnosis
                    </label>
                    <input
                      onChange={handleInputs}
                      name="diagnosis"
                      type="text"
                      placeholder=""
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    />
                  </div>
                  <div className="w-full">
                    <label className="mb-2.5 block text-black dark:text-white">
                      Consultant
                    </label>
                    <input
                      onChange={handleInputs}
                      name="consultant"
                      type="text"
                      placeholder=""
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    />
                  </div>
                  <div className="w-full">
                    <label className="mb-2.5 block text-black dark:text-white">
                      Anesthetist
                    </label>
                    <input
                      onChange={handleInputs}
                      name="anesthetist"
                      type="text"
                      placeholder=""
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    />
                  </div>
                  <div className="w-full">
                    <label className="mb-2.5 block text-black dark:text-white">
                      Operation date
                    </label>
                    <input
                      onChange={handleInputs}
                      name="operationDate"
                      type="time"
                      placeholder=""
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    />
                  </div>
                  <div className="w-full">
                    <label className="mb-2.5 block text-black dark:text-white">
                      Procedure name
                    </label>
                    <input
                      onChange={handleInputs}
                      name="procedureName"
                      type="text"
                      placeholder=""
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    />
                  </div>
                </div>

                <div className="mt-4.5">
                  <button
                    type="submit"
                    className="flex  justify-center rounded bg-primary p-3 font-medium text-gray"
                  >
                    Assign
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

export default CreateAddmittedPatients;
