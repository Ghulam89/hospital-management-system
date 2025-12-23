import React, { useState, useEffect } from 'react';
import { MdClose } from 'react-icons/md';
import axios from 'axios';
import { toast } from 'react-toastify';
import Modal from '../../../components/modal';

const AddMedicalHistory = ({
  isModalOpen,
  setIsModalOpen,
  closeModal,
  fetchMedicalHistories,
  patientId,
  editData,
  setEditData,
}) => {
  const [formData, setFormData] = useState({
    message: '',
    alert: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (editData) {
      setFormData({
        message: editData.message || '',
        alert: editData.alert || false,
      });
    } else {
      setFormData({
        message: '',
        alert: false,
      });
    }
  }, [editData, isModalOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

 
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let response;
      const payload = {
        message: formData.message,
        alert: formData.alert,
        patientId: patientId?._id,
      };

      if (editData) {
        response = await axios.put(
          `https://api.holisticare.pk/apis/medicalHistory/update/${editData._id}`,
          payload,
        );
        toast.success('Medical history updated successfully!');
      } else {
        response = await axios.post(
          'https://api.holisticare.pk/apis/medicalHistory/create',
          payload,
        );
        toast.success('Medical history added successfully!');
      }

      if (response.data.status === 'ok') {
        fetchMedicalHistories();
        setIsModalOpen(false);
        setEditData(null);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.response?.data?.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEditData(null);
    closeModal();
  };
  
  return (
    <Modal isOpen={isModalOpen} onClose={handleClose}>
      <div className="">
        <div className="p-3.5 flex justify-between items-center">
          <h1 className="capitalize text-black h4 font-semibold text-xl">
            {editData ? 'Edit Medical History' : 'Add Medical History'}
          </h1>
          <MdClose onClick={handleClose} size={25} />
        </div>
        <hr className="border-gray" />
        <div className="">
          <form onSubmit={handleSubmit}>
            <div className="p-6.5">
              <div className="mb-4.5">
                <label className="mb-2.5 block text-black dark:text-white">
                  Medical History
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={8}
                  placeholder="Enter medical history here..."
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                />
              </div>

              <div className="mb-4.5 flex items-center">
                <input
                  type="checkbox"
                  name="alert"
                  id="alert"
                  checked={formData.alert}
                  onChange={handleChange}
                  className="mr-2"
                />
                <label htmlFor="alert" className="block text-black dark:text-white">
                  Alert Me
                </label>
              </div>

            

              <div className="flex justify-end gap-4.5">
                <button
                  type="button"
                  className="flex justify-center rounded bg-white border py-2 px-6 font-medium text-primary"
                  onClick={handleClose}
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
                      {editData ? 'Updating...' : 'Adding...'}
                    </div>
                  ) : editData ? (
                    'Update'
                  ) : (
                    'Add'
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  );
};

export default AddMedicalHistory;