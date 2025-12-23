import React, { useState, useEffect } from 'react';
import Modal from '../../../components/modal';
import { MdClose } from 'react-icons/md';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Select, Input, InputNumber, Upload, Button as AntButton } from 'antd';
import { UploadOutlined } from '@ant-design/icons';

const { Option } = Select;
const { TextArea } = Input;

const AddExpense = ({ isModalOpen, setIsModalOpen, selectedExpense, fetchExpenses, categories }) => {
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    paymentMode: '',
    expenseCategoryId: '',
    image: null
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [fileList, setFileList] = useState([]);

  useEffect(() => {
    if (selectedExpense) {
      setFormData({
        amount: selectedExpense.amount || '',
        description: selectedExpense.description || '',
        paymentMode: selectedExpense.paymentMode || '',
        expenseCategoryId: selectedExpense.expenseCategoryId?._id || '',
        image: selectedExpense.image || null
      });
      
      if (selectedExpense.image) {
        setFileList([{
          uid: '-1',
          name: 'expense_image',
          status: 'done',
          url: `https://api.holisticare.pk/${selectedExpense.image}`,
        }]);
      }
    } else {
      setFormData({
        amount: '',
        description: '',
        paymentMode: '',
        expenseCategoryId: '',
        image: null
      });
      setFileList([]);
    }
  }, [selectedExpense, isModalOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = ({ fileList }) => {
    setFileList(fileList);
    if (fileList.length > 0 && fileList[0].originFileObj) {
      setFormData(prev => ({
        ...prev,
        image: fileList[0].originFileObj
      }));
    }
  };

  const beforeUpload = (file) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      toast.error('You can only upload image files!');
    }
    return isImage;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.amount || formData.amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!formData.expenseCategoryId) {
      toast.error('Please select a category');
      return;
    }

    setIsLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('amount', formData.amount);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('paymentMode', formData.paymentMode);
      formDataToSend.append('expenseCategoryId', formData.expenseCategoryId);
      if (formData.image && formData.image instanceof File) {
        formDataToSend.append('image', formData.image);
      }

      const request = selectedExpense
        ? axios.put(`https://api.holisticare.pk/apis/expense/update/${selectedExpense._id}`, formDataToSend, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          })
        : axios.post('https://api.holisticare.pk/apis/expense/create', formDataToSend, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });

      const res = await request;

      if (res.data.status === 'ok') {
        toast.success(`Expense ${selectedExpense ? 'updated' : 'added'} successfully`);
        setIsModalOpen(false);
        fetchExpenses();
      } else {
        toast.error(res.data.message || 'Operation failed');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save expense');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} width="800px">
      <div className="p-4 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
          {selectedExpense ? 'Edit Expense' : 'Add Expense'}
        </h1>
        <MdClose 
          onClick={() => setIsModalOpen(false)} 
          size={24} 
          className="cursor-pointer text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        />
      </div>
      
      <hr className="border-gray dark:border-gray-700" />
      
      <form onSubmit={handleSubmit}>
        <div className="p-6 space-y-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-1">
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Amount <span className="text-red-500">*</span>
            </label>
            <InputNumber
              name="amount"
              value={formData.amount}
              onChange={(value) => handleSelectChange('amount', value)}
              placeholder="Enter amount"
              className="w-full"
              min={0}
              step={0.01}
              required
            />
          </div>

          <div className="col-span-1">
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Category <span className="text-red-500">*</span>
            </label>
            <Select
              placeholder="Select category"
              className="w-full"
              value={formData.expenseCategoryId || undefined}
              onChange={(value) => handleSelectChange('expenseCategoryId', value)}
              required
            >
              {categories.map(category => (
                <Option key={category._id} value={category._id}>{category.name}</Option>
              ))}
            </Select>
          </div>

          <div className="col-span-1">
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Payment Mode
            </label>
            <Select
              placeholder="Select payment mode"
              className="w-full"
              value={formData.paymentMode || undefined}
              onChange={(value) => handleSelectChange('paymentMode', value)}
            >
              <Option value="Cash">Cash</Option>
              <Option value="Credit Card">Credit Card</Option>
              <Option value="Debit Card">Debit Card</Option>
              <Option value="Bank Transfer">Bank Transfer</Option>
              <Option value="Check">Check</Option>
              <Option value="Other">Other</Option>
            </Select>
          </div>

          <div className="col-span-2">
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Description
            </label>
            <TextArea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter description..."
              rows={3}
            />
          </div>

          <div className="col-span-2">
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Receipt Image
            </label>
            <Upload
              fileList={fileList}
              beforeUpload={beforeUpload}
              onChange={handleFileChange}
              maxCount={1}
              listType="picture"
            >
              <AntButton icon={<UploadOutlined />}>Upload Receipt</AntButton>
            </Upload>
          </div>
        
          <div className="col-span-2 pt-2">
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
                  {selectedExpense ? 'Updating...' : 'Adding...'}
                </span>
              ) : (
                selectedExpense ? 'Update Expense' : 'Add Expense'
              )}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default AddExpense;