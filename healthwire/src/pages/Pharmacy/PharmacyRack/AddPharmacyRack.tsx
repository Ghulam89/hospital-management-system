import React, { useState, useEffect } from 'react';
import Modal from '../../../components/modal';
import { MdClose } from 'react-icons/md';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Base_url } from '../../../utils/Base_url';
import Select from 'react-select';

const AddPharmacyRack = ({ 
  isModalOpen, 
  setIsModalOpen, 
  selectedRack, 
  fetchRacks
}) => {
  const [formData, setFormData] = useState({
    name: '',
    pharmItemId: []
  });
  const [pharmItemOptions, setPharmItemOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isItemsLoading, setIsItemsLoading] = useState(false);

  // Fetch pharmaceutical items when modal opens
  useEffect(() => {
    if (isModalOpen) {
      fetchPharmItems();
    }
  }, [isModalOpen]);

  const fetchPharmItems = async () => {
    setIsItemsLoading(true);
    try {
      const res = await axios.get(`${Base_url}/apis/pharmItem/get`);
      if (res.data.data) {
        setPharmItemOptions(res.data.data.map(item => ({
          value: item._id,
          label: item.name
        })));
      }
    } catch (error) {
      toast.error('Failed to fetch pharmaceutical items');
    } finally {
      setIsItemsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedRack) {
      setFormData({
        name: selectedRack.name || '',
        pharmItemId: selectedRack.pharmItemId || []
      });
    } else {
      setFormData({
        name: '',
        pharmItemId: []
      });
    }
  }, [selectedRack, isModalOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePharmItemChange = (selectedOptions) => {
    setFormData(prev => ({
      ...prev,
      pharmItemId: selectedOptions ? selectedOptions.map(opt => opt.value) : []
    }));
  };

  const getSelectedPharmItems = () => {
    return pharmItemOptions.filter(opt => 
      formData.pharmItemId.includes(opt.value)
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Please enter rack name');
      return;
    }

    setIsLoading(true);

    try {
      const endpoint = selectedRack 
        ? `${Base_url}/apis/pharmRack/update/${selectedRack._id}`
        : `${Base_url}/apis/pharmRack/create`;
      
      const method = selectedRack ? 'put' : 'post';
      
      const res = await axios[method](endpoint, formData);

      if (res.data.status === 'ok') {
        toast.success(`Rack ${selectedRack ? 'updated' : 'added'} successfully`);
        setIsModalOpen(false);
        fetchRacks();
      } else {
        toast.error(res.data.message || 'Operation failed');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save rack');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} width="600px">
      <div className="p-4 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
          {selectedRack ? 'Edit Pharmacy Rack' : 'Add New Pharmacy Rack'}
        </h1>
        <MdClose 
          onClick={() => setIsModalOpen(false)} 
          size={24} 
          className="cursor-pointer text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        />
      </div>
      
      <hr className="border-gray dark:border-gray-700" />
      
      <form onSubmit={handleSubmit}>
        <div className="p-6">
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Rack Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter rack name"
              className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Pharmaceutical Items
            </label>
            <Select
              isMulti
              isLoading={isItemsLoading}
              options={pharmItemOptions}
              value={getSelectedPharmItems()}
              onChange={handlePharmItemChange}
              placeholder={isItemsLoading ? "Loading items..." : "Select pharmaceutical items..."}
              className="react-select-container"
              classNamePrefix="react-select"
              isDisabled={isItemsLoading}
            />
          </div>

          <div className="pt-4">
            <button 
              type="submit" 
              className="flex w-full justify-center rounded-lg bg-primary p-3 font-medium text-white hover:bg-opacity-90 transition-colors duration-200 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {selectedRack ? 'Updating...' : 'Adding...'}
                </span>
              ) : (
                selectedRack ? 'Update Rack' : 'Add Rack'
              )}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default AddPharmacyRack;