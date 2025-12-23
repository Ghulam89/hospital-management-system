import React, { useEffect, useState } from 'react';
import { MdClose } from 'react-icons/md';
import Modal from '../../components/modal';
import { FaPlus } from 'react-icons/fa';
import { AsyncPaginate } from "react-select-async-paginate";
import axios from 'axios';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import { Base_url } from '../../utils/Base_url';
import { RiDeleteBin5Fill } from 'react-icons/ri';
import moment from 'moment';
interface EditTokenFormProps {
  isModalOpen: boolean;
  setIsModalOpen: (isOpen: boolean) => void;
  selectedToken: any;
  fetchToken: () => void;
  doctors: any[];
}
const EditTokenForm: React.FC<EditTokenFormProps> = ({
    isModalOpen,
    setIsModalOpen,
    selectedToken,
    fetchToken, 
    doctors
  }) => {
    console.log(selectedToken);
    
  const [allToken, setAllToken] = useState([]);
  const [loading, setLoading] = useState(false);
  const [allProcedures, setAllProcedures] = useState([]);
 
  const [patientData, setPatientData] = useState<any>(null);
  const [doctorData, setDoctorData] = useState<any>(null);
  const [status, setStatus] = useState({
    scheduled: false,
    confirmed: false,
    checkedIn: false,
    completed: false,
    noShow: false
  });
  const validationSchema = Yup.object().shape({
    patientId: Yup.string().required('Patient is required'),
    tokenNumber: Yup.string().required('Token number is required'),
    tokenDate: Yup.string().required('Token date is required'),
    doctorId: Yup.string().required('Doctor is required'),
    pulseHeartRate: Yup.string().nullable(),
    temperature: Yup.string().nullable(),
    bloodPressure: Yup.string().nullable(),
    respiratoryRate: Yup.string().nullable(),
    bloodSugar: Yup.string().nullable(),
    weight: Yup.string().nullable(),
    height: Yup.string().nullable(),
    bodyMassIndex: Yup.string().nullable(),
    bodySurfaceArea: Yup.string().nullable(),
    oxygenSaturation: Yup.string().nullable(),
    comment: Yup.string().nullable(),
    tokenSatus: Yup.string().required('Status is required'),
  })
  

  const handleStatusChange = (newStatus: string) => {
    
    setStatus({
      scheduled: false,
      confirmed: false,
      checkedIn: false,
      completed: false,
      noShow: false
    });

    // Set the new status
    switch (newStatus) {
      case 'Scheduled':
        setStatus(prev => ({ ...prev, scheduled: true }));
        formik.setFieldValue('tokenSatus', 'Scheduled');
        break;
      case 'Confirmed':
        setStatus(prev => ({ ...prev, confirmed: true }));
        formik.setFieldValue('tokenSatus', 'Confirmed');
        break;
      case 'Checked-in':
        setStatus(prev => ({ ...prev, checkedIn: true }));
        formik.setFieldValue('tokenSatus', 'Checked-in');
        break;
      case 'Completed':
        setStatus(prev => ({ ...prev, completed: true }));
        formik.setFieldValue('tokenSatus', 'Completed');
        break;
      case 'no-Show':
        setStatus(prev => ({ ...prev, noShow: true }));
        formik.setFieldValue('tokenSatus', 'No-Show');
        break;
      default:
        setStatus(prev => ({ ...prev, scheduled: true }));
        formik.setFieldValue('tokenSatus', 'Scheduled');
    }
  };


 
  const formik = useFormik({
    initialValues: {
      patientId: '',
      patientName: '',
      patientMr: '',
      tokenNumber: '',
      tokenDate:'',
      doctorId: '',
      doctorName: '',
      pulseHeartRate: '',
      temperature: '',
      bloodPressure: '',
      respiratoryRate: '',
      bloodSugar: '',
      weight: '',
      height: '',
      bodyMassIndex: '',
      bodySurfaceArea: '',
      oxygenSaturation: '',
      comment: '',
      tokenSatus: ''
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        setLoading(true);
        const tokenData = {
          ...values,
          
        };

        const response = await axios.put(`${Base_url}/apis/token/update/${selectedToken._id}`, tokenData);

        if (response?.data?.status === "ok") {
          toast.success('Token updated successfully');

          setIsModalOpen(false);
          fetchToken();
        } else {
          toast.error(response?.data?.message);
        }
      } catch (error) {
        console.error('Error updating token:', error);
        if (error?.response?.data?.status === "fail") {
          toast.error(error?.response?.data?.message);
        }
      } finally {
        setLoading(false);
      }
    },
  });

  const loadOptions = async (searchQuery: string, loadedOptions: any, { page }: any) => {
    try {
      const response = await axios.get(`${Base_url}/apis/patient/get`, {
        params: { page, limit: 20, search: searchQuery || "" },
      });

      const { data, totalPages } = response.data;

      return {
        options: data.map((item: any) => ({
          label: `${item.name} (MR: ${item.mr})`,
          value: item._id,
          patientData: item
        })),
        hasMore: page < totalPages,
        additional: {
          page: page + 1,
        },
      };
    } catch (error) {
      console.error("Error fetching patients:", error);
      return {
        options: [],
        hasMore: false,
        additional: {
          page: page,
        },
      };
    }
  };

  const fetchTokenData = () => {
    axios.get(`${Base_url}/apis/token/getToken`)
      .then((res) => {
        setAllToken(res.data.data);
      })
      .catch(err => {
        console.error("Error fetching tokens:", err);
      });
  };

  const fetchProcedures = async () => {
    try {
      const response = await axios.get(`${Base_url}/apis/procedure/get`);
      setAllProcedures(response?.data?.data || []);
    } catch (error) {
      console.error("Error fetching procedures:", error);
    }
  };

  const fetchPatientDetails = async (patientId: string) => {
    try {
      const response = await axios.get(`${Base_url}/apis/patient/get/${patientId}`);
      setPatientData(response.data.data);
    } catch (error) {
      console.error("Error fetching patient details:", error);
    }
  };

  const fetchDoctorDetails = async (doctorId: string) => {
    try {
      const response = await axios.get(`${Base_url}/apis/user/get/${doctorId}`);
      setDoctorData(response.data.data);
    } catch (error) {
      console.error("Error fetching doctor details:", error);
    }
  };

  useEffect(() => {
    if (selectedToken) {
      // Set form values from selectedToken

      const tokenDate = selectedToken.tokenDate 
            ? moment.utc(selectedToken.tokenDate).isValid() 
              ? moment.utc(selectedToken.tokenDate).format('YYYY-MM-DD') 
              : new Date().toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0];

      formik.setValues({
        patientId: selectedToken.patientId?._id || '',
        patientName: selectedToken.patientId?.name || '',
        patientMr: selectedToken.patientId?.mr || '',
        tokenNumber: selectedToken.tokenNumber || '',
        tokenDate:tokenDate,
        doctorId: selectedToken.doctorId?._id || '',
        doctorName: selectedToken.doctorId?.name || '',
        pulseHeartRate: selectedToken.pulseHeartRate || '',
        temperature: selectedToken.temperature || '',
        bloodPressure: selectedToken.bloodPressure || '',
        respiratoryRate: selectedToken.respiratoryRate || '',
        bloodSugar: selectedToken.bloodSugar || '',
        weight: selectedToken.weight || '',
        height: selectedToken.height || '',
        bodyMassIndex: selectedToken.bodyMassIndex || '',
        bodySurfaceArea: selectedToken.bodySurfaceArea || '',
        oxygenSaturation: selectedToken.oxygenSaturation || '',
        comment: selectedToken.comment || '',
        tokenSatus: selectedToken.tokenSatus || ''
      });

      if (selectedToken.tokenSatus) {
        handleStatusChange(selectedToken.tokenSatus);
      } else {
        handleStatusChange('Scheduled');
      }


      if (selectedToken.patientId?._id) {
        fetchPatientDetails(selectedToken.patientId._id);
      }
      if (selectedToken.doctorId?._id) {
        fetchDoctorDetails(selectedToken.doctorId._id);
      }
    }
  }, [selectedToken]);

  useEffect(() => {
    fetchTokenData();
    fetchProcedures();
  }, []);

  return (
    <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
      <div className="max-h-[80vh] overflow-y-auto">
        <div className="p-3.5 flex justify-between items-center">
       <div>
       <h1 className="capitalize text-black h4 font-semibold text-xl">
            {selectedToken?.patientId?.name}
          </h1>
          <p className=' text-primary'>MR <span className=' text-black'>{selectedToken?.patientId?.mr}</span></p>
       </div>
          <MdClose
            onClick={() => {
              setIsModalOpen(false);
              // formik.resetForm();
            }}
            size={25}
            className="cursor-pointer"
          />
        </div>
        <hr className="border-gray" />
        <div className="p-4 border-b border-gray">
  <div className="flex flex-wrap max-w-lg gap-2">
    <div 
      className={`flex items-center px-3 py-1 rounded-sm border ${status.scheduled ? 'bg-[#F4F6F9] border-[#11438F]' : 'bg-gray-100 border-gray-300'}`}
      onClick={() => handleStatusChange('Scheduled')}
    >
      <span className='w-2 h-2 mr-2 rounded-full bg-[#11438F]'></span>
      <label className="text-sm cursor-pointer">Scheduled</label>
    </div>
    <div 
      className={`flex items-center px-3 py-1 rounded-sm border ${status.confirmed ? 'bg-[#F0F9FF] border-[#0C7EBB]' : 'bg-gray-100 border-gray-300'}`}
      onClick={() => handleStatusChange('Confirmed')}
    >
      <span className='w-2 h-2 mr-2 rounded-full bg-[#0C7EBB]'></span>
      <label className="text-sm cursor-pointer">Confirmed</label>
    </div>
    <div 
      className={`flex items-center px-3 py-1 rounded-sm border ${status.checkedIn ? 'bg-[#F0FDF4] border-[#0D9D58]' : 'bg-gray-100 border-gray-300'}`}
      onClick={() => handleStatusChange('Checked-in')}
    >
      <span className='w-2 h-2 mr-2 rounded-full bg-[#0D9D58] bg-gray-400'></span>
      <label className="text-sm cursor-pointer">Checked In</label>
    </div>
    <div 
      className={`flex items-center px-3 py-1 rounded-sm border ${status.completed ? 'bg-[#F5F3FF] border-[#7E56DA]' : 'bg-gray-100 border-gray-300'}`}
      onClick={() => handleStatusChange('Completed')}
    >
      <span className='w-2 h-2 mr-2 rounded-full bg-[#7E56DA] bg-gray-400'></span>
      <label className="text-sm cursor-pointer">Completed</label>
    </div>
    <div 
      className={`flex items-center px-3 py-1 rounded-sm border ${status.noShow ? 'bg-[#FEF2F2] border-[#DC2626]' : 'bg-gray-100 border-gray-300'}`}
      onClick={() => handleStatusChange('no-Show')}
    >
      <span className='w-2 h-2 mr-2 rounded-full bg-[#DC2626] bg-gray-400'></span>
      <label className="text-sm cursor-pointer">No Show</label>
    </div>
  </div>
</div>
        <div>
          <form onSubmit={formik.handleSubmit} className="p-4 space-y-6">
            {/* Patient Section */}
            <section className="flex justify-between items-center">
              <h2 className="font-medium text-sm mb-2">Patient</h2>
              <div className="w-[70%] flex flex-col gap-2">
                <AsyncPaginate
                  name="patientId"
                  value={formik.values.patientId ? {
                    value: formik.values.patientId,
                    label: `${patientData?.name || ''} (MR: ${patientData?.mr || ''})`
                  } : null}
                  loadOptions={loadOptions}
                  onChange={(option) => {
                    formik.setFieldValue('patientId', option?.value || '');
                    formik.setFieldValue('patientName', option?.label || '');
                    formik.setFieldValue('patientMr', option?.patientData?.mr || '');
                    setPatientData(option?.patientData || null);
                  }}
                  onBlur={formik.handleBlur}
                  getOptionLabel={(option) => option.label}
                  getOptionValue={(option) => option.value}
                  placeholder="Select a patient..."
                  additional={{ page: 1 }}
                  classNamePrefix="react-select"
                  className='w-full'
                />
                {formik.touched.patientId && formik.errors.patientId && (
                  <div className="text-red-500 text-xs">{formik.errors.patientId}</div>
                )}
              </div>
            </section>

            {/* Token Section */}
            <section className="flex justify-between items-center">
              <h2 className="font-medium mb-2 text-sm">Token Date</h2>
              <div className="w-[70%] flex flex-col gap-2">
                <input
                  name="tokenDate"
                  type='date'
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  value={formik.values.tokenDate}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
              </div>
            </section>

            <section className="flex justify-between items-center">
              <h2 className="font-medium mb-2 text-sm">Token</h2>
              <div className="w-[70%] flex flex-col gap-2">
                <input
                  name="tokenNumber"
                  type="text"
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  value={`#${formik.values.tokenNumber}`}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  disabled={true}
                />
                {formik.touched.tokenNumber && formik.errors.tokenNumber && (
                  <div className="text-red-500 text-xs">{formik.errors.tokenNumber}</div>
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
                    setDoctorData(selectedDoctor || null);
                  }}
                  onBlur={formik.handleBlur}
                >
                  <option value="">Select a doctor</option>
                  {doctors.map((doctor) => (
                    <option key={doctor._id} value={doctor._id}>
                      Dr. {doctor.name}
                    </option>
                  ))}
                </select>
                {formik.touched.doctorId && formik.errors.doctorId && (
                  <div className="text-red-500 text-xs">{formik.errors.doctorId}</div>
                )}
              </div>
            </section>

            <section>
              <h2 className='pb-3 text-black font-semibold text-lg'>Vitals</h2>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { name: 'pulseHeartRate', label: 'Pulse Heart Rate' },
                  { name: 'temperature', label: 'Temperature' },
                  { name: 'bloodPressure', label: 'Blood Pressure' },
                  { name: 'respiratoryRate', label: 'Respiratory Rate' },
                  { name: 'bloodSugar', label: 'Blood Sugar' },
                  { name: 'weight', label: 'Weight' },
                  { name: 'height', label: 'Height' },
                  { name: 'bodyMassIndex', label: 'Body Mass Index' },
                  { name: 'bodySurfaceArea', label: 'Body Surface Area' },
                  { name: 'oxygenSaturation', label: 'Oxygen Saturation' },
                ].map((field) => (
                  <div key={field.name}>
                    <input
                      type="text"
                      name={field.name}
                      placeholder={field.label}
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 text-sm px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                      value={formik.values[field.name]}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    />
                    {formik.touched[field.name] && formik.errors[field.name] && (
                      <div className="text-red-500 text-xs">{formik.errors[field.name]}</div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Invoice Section */}
            
            <section>
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="tokenSatus"
                  name="tokenSatus"
                  checked={formik.values.tokenSatus === 'Checked-in'}
                  onChange={(e) =>
                    formik.setFieldValue(
                      'tokenSatus',
                      e.target.checked ? 'Checked-in' : ''
                    )
                  }
                  className="mr-2"
                />
                <label htmlFor="tokenSatus" className="font-medium">
                  Patient is checked-in
                </label>
              </div>
            </section>
            <section>
              <label className="font-medium pb-1 text-sm mb-2">
                Comment
              </label>
              <textarea
                name="comment"
                placeholder="Add Comments"
                className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 text-sm px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                value={formik.values.comment}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              ></textarea>
            </section>

            <div className='flex justify-center pb-3'>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2.5 rounded-md bg-primary py-3 w-60 whitespace-nowrap text-center font-medium text-white hover:bg-opacity-90 lg:px-8 xl:px-10 disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Update Token'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  );
};

export default EditTokenForm;