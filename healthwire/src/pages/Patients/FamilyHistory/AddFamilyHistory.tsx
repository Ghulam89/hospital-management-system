import React, { useState, useEffect } from 'react';
import { MdClose } from 'react-icons/md';
import axios from 'axios';
import { toast } from 'react-toastify';
import Modal from '../../../components/modal';

const AddFamilyHistory = ({
  isModalOpen,
  setIsModalOpen,
  closeModal,
  fetchFamilyHistory,
  patientId,
  editData,
  setEditData
}) => {
  const [formData, setFormData] = useState({
    age: '',
    gender: '',
    diagnosis: '',
    relationship: '',
    remarks: '',
    bloodGroup: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (editData) {
      setFormData({
        age: editData.age || '',
        gender: editData.gender || '',
        diagnosis: editData.diagnosis || '',
        relationship: editData.relationship || '',
        remarks: editData.remarks || '',
        bloodGroup: editData.bloodGroup || ''
      });
    } else {
      setFormData({
        age: '',
        gender: '',
        diagnosis: '',
        relationship: '',
        remarks: '',
        bloodGroup: ''
      });
    }
  }, [editData, isModalOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let response;
      const payload = {
        ...formData,
        patientId: patientId
      };

      if (editData) {
        // Update existing record
        response = await axios.put(
          `https://api.holisticare.pk/apis/familyHistory/update/${editData._id}`,
          payload
        );
        toast.success('Family history updated successfully!');
      } else {
        // Create new record
        response = await axios.post(
          'https://api.holisticare.pk/apis/familyHistory/create',
          payload
        );
        toast.success('Family history added successfully!');
      }

      if (response.data.status === 'ok') {
        fetchFamilyHistory();
        setIsModalOpen(false);
        setEditData(null);
      } else {
        toast.error(response.data.message || 'Operation failed');
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

  // Blood group options
  const bloodGroups = [
    'A+',
    'A-',
    'B+',
    'B-',
    'AB+',
    'AB-',
    'O+',
    'O-',
    'Unknown'
  ];

  return (
    <Modal isOpen={isModalOpen} onClose={handleClose}>
      <div className="">
        <div className="p-3.5 flex justify-between items-center">
          <h1 className="capitalize text-black h4 font-semibold text-xl">
            {editData ? 'Edit Family History' : 'Add Family History'}
          </h1>
          <MdClose onClick={handleClose} size={25} />
        </div>
        <hr className="border-gray" />
        <div className="">
          <form onSubmit={handleSubmit}>
            <div className="p-6.5">
              <div className="mb-4.5">
                <label className="mb-2.5 block text-black dark:text-white">
                  Relationship
                </label>
                <input
                  type="text"
                  name="relationship"
                  value={formData.relationship}
                  onChange={handleChange}
                  required
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                />
              </div>

              <div className="mb-4.5">
                <label className="mb-2.5 block text-black dark:text-white">
                  Age
                </label>
                <input
                  type="text"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  required
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                />
              </div>

              <div className="mb-4.5">
                <label className="mb-2.5 block text-black dark:text-white">
                  Gender
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  required
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="mb-4.5">
                <label className="mb-2.5 block text-black dark:text-white">
                  Blood Group
                </label>
                <select
                  name="bloodGroup"
                  value={formData.bloodGroup}
                  onChange={handleChange}
                  required
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                >
                  <option value="">Select Blood Group</option>
                  {bloodGroups.map(group => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4.5">
                <label className="mb-2.5 block text-black dark:text-white">
                  Diagnosis
                </label>
                <input
                  type="text"
                  name="diagnosis"
                  value={formData.diagnosis}
                  onChange={handleChange}
                  required
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                />
              </div>

              <div className="mb-4.5">
                <label className="mb-2.5 block text-black dark:text-white">
                  Remarks
                </label>
                <textarea

                required
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleChange}
                  rows={3}
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                />
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
                  ) : (
                    editData ? 'Update' : 'Add'
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

export default AddFamilyHistory;