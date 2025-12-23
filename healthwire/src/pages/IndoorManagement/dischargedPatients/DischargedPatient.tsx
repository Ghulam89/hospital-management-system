import { useState } from 'react';
import axios from 'axios';

import { useParams } from 'react-router-dom';
import { Base_url } from '../../../utils/Base_url';
import { toast } from 'react-toastify';

const DischargedPatient = () => {
    const {id}  = useParams()
  const [formData, setFormData] = useState({
    dischargeStatus: '',
    dischargeDate: '',
    dischargeTime: '',
    files: null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, files: e.target.files });
  };

  const handleSubmit = async (action) => {
    setIsSubmitting(true);
    setSuccessMessage('');

    const data = new FormData();
    data.append('dischargeStatus', formData.dischargeStatus);
    data.append('dischargeDate', formData.dischargeDate);
    data.append('dischargeTime', formData.dischargeTime);
    data.append('admitPatientId',id);

    if (formData.files) {
      for (let i = 0; i < formData.files.length; i++) {
        data.append('document', formData.files[i]);
      }
    }

    try {
      
      await axios.post(`${Base_url}/apis/dischargePatient/create`, data, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
       
      setSuccessMessage('Patient discharged successfully!');
    } catch (error) {
      toast.error(error?.response?.data?.message)
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
       <>
          <div className=" mx-auto p-6 bg-white rounded-sm shadow-md">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Discharge Form</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Discharge Status
          </label>
          <select
            name="dischargeStatus"
            value={formData.dischargeStatus}
            onChange={handleChange}
            className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
            required
          >
            <option value="">Select Discharge Status</option>
            <option value="Recovered">Recovered</option>
            <option value="Referred">Referred</option>
            <option value="LAMA">LAMA (Left Against Medical Advice)</option>
            <option value="Expired">Expired</option>
          </select>
        </div>

        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Discharge Date
          </label>
          <input
            type="date"
            name="dischargeDate"
            value={formData.dischargeDate}
            onChange={handleChange}
            className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
            required
          />
        </div>

        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Discharge Time
          </label>
          <input
            type="time"
            name="dischargeTime"
            value={formData.dischargeTime}
            onChange={handleChange}
            className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
            required
          />
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Attachment
        </label>
        <div className="flex items-center">
          <label className="flex flex-col items-center px-4 py-2 bg-white rounded-md border border-gray-300 cursor-pointer hover:bg-gray-50">
            <span className="text-sm font-medium text-gray-700">Choose Files</span>
            <input
              type="file"
              className="w-full hidden rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"

              multiple
              onChange={handleFileChange}
            />
          </label>
          <span className="ml-3 text-sm text-gray-500">
            {formData.files ? `${formData.files.length} file(s) selected` : 'No file chosen'}
          </span>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          You can add multiple files using Ctrl
        </p>
      </div>

      {successMessage && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
          {successMessage}
        </div>
      )}

      <div className="flex justify-end space-x-3">
       
        <button
          type="button"
          onClick={() => handleSubmit('discharge')}
          disabled={isSubmitting}
          className="px-4 py-2  bg-primary text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isSubmitting ? 'Processing...' : 'Save And Discharge'}
        </button>
      </div>

    </div>
       </>
  );
};

export default DischargedPatient;