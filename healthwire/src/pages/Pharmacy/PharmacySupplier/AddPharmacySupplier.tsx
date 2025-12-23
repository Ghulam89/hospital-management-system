import React, { useState, useEffect } from 'react';
import Modal from '../../../components/modal';
import { MdClose } from 'react-icons/md';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Base_url } from '../../../utils/Base_url';
import Select from 'react-select';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const AddPharmacySupplier = ({ isModalOpen, setIsModalOpen, selectedSupplier, fetchSuppliers, manufacturers }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    primaryPersonName: '',
    primaryPersonPhone: '',
    openingBalance: 0,
    slaDate: new Date(),
    ntn: '',
    stn: '',
    pharmManufacturerId: []
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [manufacturerOptions, setManufacturerOptions] = useState([]);

  useEffect(() => {
    if (manufacturers.length > 0) {
      setManufacturerOptions(manufacturers.map(mfg => ({
        value: mfg._id,
        label: mfg.name
      })));
    }
  }, [manufacturers]);

  useEffect(() => {
    if (selectedSupplier) {
      setFormData({
        name: selectedSupplier.name || '',
        phone: selectedSupplier.phone || '',
        address: selectedSupplier.address || '',
        primaryPersonName: selectedSupplier.primaryPersonName || '',
        primaryPersonPhone: selectedSupplier.primaryPersonPhone || '',
        openingBalance: selectedSupplier.openingBalance || 0,
        slaDate: selectedSupplier.slaDate ? new Date(selectedSupplier.slaDate) : new Date(),
        ntn: selectedSupplier.ntn || '',
        stn: selectedSupplier.stn || '',
        pharmManufacturerId: selectedSupplier.pharmManufacturerId || []
      });
    } else {
      setFormData({
        name: '',
        phone: '',
        address: '',
        primaryPersonName: '',
        primaryPersonPhone: '',
        openingBalance: 0,
        slaDate: new Date(),
        ntn: '',
        stn: '',
        pharmManufacturerId: []
      });
    }
  }, [selectedSupplier, isModalOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    // Allow only numbers
    if (value === '' || /^[0-9\b]+$/.test(value)) {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleManufacturerChange = (selectedOptions) => {
    setFormData(prev => ({
      ...prev,
      pharmManufacturerId: selectedOptions.map(option => option.value)
    }));
  };

  const handleDateChange = (date) => {
    setFormData(prev => ({
      ...prev,
      slaDate: date
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      toast.error('Please enter supplier name');
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        ...formData,
        slaDate: formData.slaDate.toISOString()
      };

      const request = selectedSupplier
        ? axios.put(`${Base_url}/apis/pharmSupplier/update/${selectedSupplier._id}`, payload)
        : axios.post(`${Base_url}/apis/pharmSupplier/create`, payload);

      const res = await request;

      if (res.data.status === 'ok') {
        toast.success(`Supplier ${selectedSupplier ? 'updated' : 'added'} successfully`);
        setIsModalOpen(false);
        fetchSuppliers();
      } else {
        toast.error(res.data.message || 'Operation failed');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save Supplier');
    } finally {
      setIsLoading(false);
    }
  };

  const getSelectedManufacturers = () => {
    return manufacturerOptions.filter(option => 
      formData.pharmManufacturerId.includes(option.value)
    );
  };

  return (
    <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} width="800px">
      <div className="p-4 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
          {selectedSupplier ? 'Edit Supplier' : 'Add New Supplier'}
        </h1>
        <MdClose 
          onClick={() => setIsModalOpen(false)} 
          size={24} 
          className="cursor-pointer text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        />
      </div>
      
      <hr className="border-gray dark:border-gray-700" />
      
      <form onSubmit={handleSubmit}>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Basic Information */}
          <div className="col-span-2">
            <h2 className="text-lg font-medium mb-4 text-gray-800 dark:text-white">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Supplier Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Supplier name..."
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleNumberChange}
                    placeholder="Phone number..."
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Address..."
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Contact Person */}
          <div>
            <h2 className="text-lg font-medium mb-4 text-gray-800 dark:text-white">Primary Contact</h2>
            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Contact Person Name
                </label>
                <input
                  type="text"
                  name="primaryPersonName"
                  value={formData.primaryPersonName}
                  onChange={handleChange}
                  placeholder="Contact person name..."
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Contact Person Phone
                </label>
                <input
                  type="text"
                  name="primaryPersonPhone"
                  value={formData.primaryPersonPhone}
                  onChange={handleNumberChange}
                  placeholder="Contact person phone..."
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Financial & Other Info */}
          <div>
            <h2 className="text-lg font-medium mb-4 text-gray-800 dark:text-white">Financial & Other Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Opening Balance
                </label>
                <input
                  type="number"
                  name="openingBalance"
                  value={formData.openingBalance}
                  onChange={handleChange}
                  placeholder="Opening balance..."
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  SLA Date
                </label>
                <DatePicker
                  selected={formData.slaDate}
                  onChange={handleDateChange}
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    NTN Number
                  </label>
                  <input
                    type="text"
                    name="ntn"
                    value={formData.ntn}
                    onChange={handleChange}
                    placeholder="NTN number..."
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    STN Number
                  </label>
                  <input
                    type="text"
                    name="stn"
                    value={formData.stn}
                    onChange={handleChange}
                    placeholder="STN number..."
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Manufacturer Selection */}
          <div className="col-span-2">
            <h2 className="text-lg font-medium mb-4 text-gray-800 dark:text-white">Associated Manufacturers</h2>
            <Select
              isMulti
              options={manufacturerOptions}
              value={getSelectedManufacturers()}
              onChange={handleManufacturerChange}
              placeholder="Select manufacturers..."
              className="react-select-container"
              classNamePrefix="react-select"
            />
          </div>

          <div className="col-span-2 pt-4">
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
                  {selectedSupplier ? 'Updating...' : 'Adding...'}
                </span>
              ) : (
                selectedSupplier ? 'Update Supplier' : 'Add Supplier'
              )}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default AddPharmacySupplier;