import React, { useState, useEffect } from 'react';
import Modal from '../../../components/modal';
import { MdClose } from 'react-icons/md';
import axios from 'axios';
import { toast } from 'react-toastify';

// Add a type for Department
interface Department {
  _id: string;
  name: string;
}

const AddProcedure = ({ isModalOpen, setIsModalOpen, selectedProcedure, fetchProcedureData }) => {
 const [formData, setFormData] = useState({
    name: '',
    amount: '',
    departmentId: '',
    description: '',
    cost: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    if (selectedProcedure) {
      setFormData({
        name: selectedProcedure.name || '',
        amount: selectedProcedure.amount || '',
        departmentId: selectedProcedure.departmentId || '',
        description: selectedProcedure.description || '',
        cost: selectedProcedure.cost || ''
      });
    } else {
      setFormData({
        name: '',
        amount: '',
        departmentId: '',
        description: '',
        cost: ''
      });
    }
  }, [selectedProcedure, isModalOpen]);

  const fetchDepartments = async () => {
    try {
      const response = await axios.get('https://api.holisticare.pk/apis/department/get');
      setDepartments(response?.data?.data || []);
    } catch (error) {
      toast.error('Failed to fetch departments');
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      toast.error('Please enter procedure name');
      return;
    }
    if (!formData.amount || isNaN(Number(formData.amount))) {
      toast.error('Please enter a valid base amount');
      return;
    }
    if (!formData.departmentId) {
      toast.error('Please select department');
      return;
    }
    if (!formData.cost || isNaN(Number(formData.cost))) {
      toast.error('Please enter a valid cost');
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
      name: formData.name,
      amount: parseFloat(String(formData.amount)),
      departmentId: formData.departmentId,
      description: formData.description,
      cost: parseFloat(String(formData.cost))
    };

      const request = selectedProcedure
        ? axios.put(`https://api.holisticare.pk/apis/procedure/update/${selectedProcedure._id}`, payload)
        : axios.post('https://api.holisticare.pk/apis/procedure/create', payload);

      const res = await request;

      if (res.data.status === 'ok') {
        toast.success(`Procedure ${selectedProcedure ? 'updated' : 'added'} successfully`);
        setIsModalOpen(false);
        fetchProcedureData();
      } else {
        toast.error(res.data.message || 'Operation failed');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save procedure');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} className="">
      <div className="p-4 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
          {selectedProcedure ? 'Edit Medical Procedure' : 'Add New Medical Procedure'}
        </h1>
        <MdClose 
          onClick={() => setIsModalOpen(false)} 
          size={24} 
          className="cursor-pointer text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        />
      </div>
      
      <hr className="border-gray dark:border-gray-700" />
      
      <form onSubmit={handleSubmit}>
        <div className="p-6 space-y-4">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Procedure Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter procedure name"
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
              required
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Amount (PKR) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount !== '' ? Number(formData.amount) : ''}
                onChange={handleChange}
                placeholder="Enter amount in PKR"
                min="0"
                step="0.01"
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                required
              />
            </div>
            
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Department <span className="text-red-500">*</span>
              </label>
              <select
                name="departmentId"
                value={formData.departmentId}
                onChange={handleChange}
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept._id} value={dept._id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter procedure description (optional)"
              rows="3"
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
            />
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
             Expense Cost (PKR) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="cost"
              value={formData.cost !== '' ? Number(formData.cost) : ('' as unknown as number)}
              onChange={handleChange}
              placeholder="Enter cost in PKR"
              min="0"
              step="0.01"
              className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
              required
            />
          </div>
          <div className="pt-2">
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
                  {selectedProcedure ? 'Updating...' : 'Adding...'}
                </span>
              ) : (
                selectedProcedure ? 'Update Procedure' : 'Add Procedure'
              )}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default AddProcedure;