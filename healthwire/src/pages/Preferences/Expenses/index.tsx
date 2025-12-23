import React, { useEffect, useState } from 'react';
import { Table, Button, message, Select } from 'antd';

import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import axios from 'axios';
import { FaRegEdit, FaEye } from 'react-icons/fa';
import { RiDeleteBin5Line } from 'react-icons/ri';
import Swal from 'sweetalert2';
import AddExpense from './AddExpense';
import moment from 'moment';

const { Option } = Select;

const ExpenseList = () => {
  const [expenses, setExpenses] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editingExpense, setEditingExpense] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categories, setCategories] = useState([]);
  const [filterCategory, setFilterCategory] = useState('');

  const columns = [
    {
      title: 'Amount',
      dataIndex: 'amount',
      render: (amount) => `${amount}`,
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: 'Category',
      dataIndex: ['expenseCategoryId', 'name'],
      sorter: (a, b) => a.expenseCategoryId?.name?.localeCompare(b.expenseCategoryId?.name),
    },
    {
      title: 'Description',
      dataIndex: 'description',
    },
    {
      title: 'Payment Mode',
      dataIndex: 'paymentMode',
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      render: (date) => moment(date).format('MMM D, YYYY'),
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    },
    {
      title: 'Actions',
      dataIndex: 'action',
      fixed: "right",
      width: 120,
      render: (text, record) => (
        <div className='flex items-center gap-4'> 
          {/* <FaEye 
            color='green' 
            size={18} 
            onClick={() => handleView(record)} 
            className="cursor-pointer hover:text-green-600"
            title="View Details"
          /> */}
          <FaRegEdit 
            color='blue' 
            size={18} 
            onClick={() => handleEdit(record)} 
            className="cursor-pointer hover:text-blue-600"
            title="Edit Expense"
          />
          <RiDeleteBin5Line 
            color='red' 
            size={18} 
            onClick={() => handleDelete(record._id)} 
            className="cursor-pointer hover:text-red-600"
            title="Delete Expense"
          />
        </div>
      ),
    },
  ];

  const fetchExpenses = async (page, search = '', category = '') => {
    try {
      setLoading(true);
      const url = `https://api.holisticare.pk/apis/expense/get?page=${page}&search=${search}&category=${category}`;
      const res = await axios.get(url);
      
      setExpenses(res.data.data);
      setTotalPages(res.data.totalPages);
    } catch (error) {
      message.error('Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get('https://api.holisticare.pk/apis/expenseCategory/get');
      setCategories(res.data.data);
    } catch (error) {
      message.error('Failed to fetch categories');
    }
  };

  useEffect(() => {
    fetchExpenses(currentPage, searchTerm, filterCategory);
    fetchCategories();
  }, [currentPage, searchTerm, filterCategory]);

  const handleTableChange = (pagination) => {
    setCurrentPage(pagination.current);
  };

  const handleDelete = (id) => {
    Swal.fire({
      title: "Confirm Deletion",
      text: "Are you sure you want to delete this expense? This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#4EC3BD",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        axios.delete(`https://api.holisticare.pk/apis/expense/delete/${id}`)
          .then((res) => {
            if (res.data.status === 'ok') {
              Swal.fire({
                title: "Deleted!",
                text: "Expense has been deleted successfully.",
                icon: "success",
                confirmButtonColor: "#4EC3BD",
              });
              fetchExpenses(currentPage, searchTerm, filterCategory);
            }
          })
          .catch((error) => {
            Swal.fire({
              title: "Error!",
              text: error.response?.data?.message || "Failed to delete expense.",
              icon: "error",
              confirmButtonColor: "#4EC3BD",
            });
          });
      }
    });
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setIsModalOpen(true);
  };

  const handleView = (expense) => {
    // Implement view functionality if needed
    Swal.fire({
      title: 'Expense Details',
      html: `
        <div class="text-left">
          <p><strong>Amount:</strong> $${expense.amount.toFixed(2)}</p>
          <p><strong>Category:</strong> ${expense.expenseCategoryId?.name || 'N/A'}</p>
          <p><strong>Description:</strong> ${expense.description || 'N/A'}</p>
          <p><strong>Payment Mode:</strong> ${expense.paymentMode || 'N/A'}</p>
          <p><strong>Date:</strong> ${moment(expense.createdAt).format('MMM D, YYYY')}</p>
        </div>
      `,
      confirmButtonColor: "#4EC3BD",
    });
  };

  const handleAdd = () => {
    setEditingExpense(null);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingExpense(null);
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleCategoryFilter = (value) => {
    setFilterCategory(value);
    setCurrentPage(1);
  };

  return (
    <>
      <Breadcrumb pageName="Expense Management" />

      <AddExpense
        isModalOpen={isModalOpen}
        setIsModalOpen={handleModalClose}
        fetchExpenses={() => fetchExpenses(currentPage, searchTerm, filterCategory)}
        selectedExpense={editingExpense}
        categories={categories}
      />

      <div className="mb-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="w-full md:w-1/3">
          <input
            type="text"
            placeholder="Search expenses..."
            value={searchTerm}
            onChange={handleSearch}
            className="w-full rounded border-[1.5px] bg-white border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
          />
        </div>
        
        <div className="flex gap-4 w-full md:w-2/3 justify-end">
          <Select
            placeholder="Filter by category"
            style={{ width: 200 }}
            onChange={handleCategoryFilter}
            allowClear
          >
            {categories.map(category => (
              <Option key={category._id} value={category._id}>{category.name}</Option>
            ))}
          </Select>
          
          <button
            onClick={handleAdd}
            className="inline-flex items-center justify-center gap-2.5 rounded-md bg-primary py-3 px-6 text-center font-medium text-white hover:bg-opacity-90 transition-colors duration-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="currentColor"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
            </svg>
            Add Expense
          </button>
        </div>
      </div>
      
      <div className="rounded-lg border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <Table
          rowKey="_id"
          columns={columns}
          dataSource={expenses}
          pagination={{ 
            current: currentPage, 
            pageSize: 10, 
            total: totalPages * 10,
            showSizeChanger: false,
            showQuickJumper: true,
          }}
          onChange={handleTableChange}
          loading={loading}
          scroll={{ x: true }}
          bordered
          size="middle"
          className="custom-table"
        />
      </div>
    </>
  );
};

export default ExpenseList;