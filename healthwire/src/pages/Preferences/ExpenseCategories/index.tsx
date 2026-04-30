import React, { useEffect, useState } from 'react';
import { Table, message } from 'antd';

import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import axios from 'axios';
import { FaRegEdit } from 'react-icons/fa';
import { RiDeleteBin5Line } from 'react-icons/ri';
import Swal from 'sweetalert2';
import AddExpenseCategories from './AddExpenseCategories';
import { Base_url } from '../../../utils/Base_url';
import { canMenuAction, getStoredUserForPermissions } from '../../../utils/permissions';
import { getUserDataFromStorage, isSuperAdminRole, buildAxiosBranchScopedParams } from '../../../utils/branchScope';

const ExpenseCategories = () => {
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [editingCategory, setEditingCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const permUser = getStoredUserForPermissions();
  const canEcCreate = canMenuAction(permUser, 'expense_categories', 'create');
  const canEcUpdate = canMenuAction(permUser, 'expense_categories', 'update');
  const canEcDelete = canMenuAction(permUser, 'expense_categories', 'delete');

  const catalogUser = getUserDataFromStorage();
  const myBranchId = catalogUser?.branchId ? String(catalogUser.branchId) : '';
  const canMutateCatalogRow = (rec) => {
    if (isSuperAdminRole(catalogUser?.role)) return true;
    if (rec.branchId == null || rec.branchId === '') return false;
    return myBranchId !== '' && String(rec.branchId) === myBranchId;
  };

  const onSelectChange = (newSelectedRowKeys) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
    selections: [
      Table.SELECTION_ALL,
      Table.SELECTION_INVERT,
      Table.SELECTION_NONE,
      {
        key: 'odd',
        text: 'Select Odd Rows',
        onSelect: (changeableRowKeys) => {
          let newSelectedRowKeys = changeableRowKeys.filter((_, index) => index % 2 !== 0);
          setSelectedRowKeys(newSelectedRowKeys);
        },
      },
      {
        key: 'even',
        text: 'Select Even Rows',
        onSelect: (changeableRowKeys) => {
          let newSelectedRowKeys = changeableRowKeys.filter((_, index) => index % 2 === 0);
          setSelectedRowKeys(newSelectedRowKeys);
        },
      },
    ],
  };

  const columns = [
    {
      title: 'Expense Categories',
      dataIndex: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      render: (text) => new Date(text).toLocaleDateString(),
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    },
    {
      title: 'Actions',
      dataIndex: 'action',
      fixed: "right",
      width: 100,
      render: (text, record) => (
        <div className="flex items-center gap-4">
          {canEcUpdate && canMutateCatalogRow(record) ? (
            <FaRegEdit
              color="blue"
              size={18}
              onClick={() => handleEdit(record)}
              className="cursor-pointer hover:text-blue-600"
              title="Edit Category"
            />
          ) : null}
          {canEcDelete && canMutateCatalogRow(record) ? (
            <RiDeleteBin5Line
              color="red"
              size={18}
              onClick={() => handleDelete(record._id)}
              className="cursor-pointer hover:text-red-600"
              title="Delete Category"
            />
          ) : null}
        </div>
      ),
    },
  ];

  const fetchExpenseCategories = async (page, search = '') => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        search: search || '',
        ...buildAxiosBranchScopedParams(),
      });
      const res = await axios.get(`${Base_url}/apis/expenseCategory/get?${params.toString()}`);

      setExpenseCategories(res.data.data || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalCount(Number(res.data.count) || 0);
    } catch (error) {
      message.error('Failed to fetch expense categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenseCategories(currentPage, searchTerm);
  }, [currentPage, searchTerm]);

  const handleTableChange = (pagination) => {
    setCurrentPage(pagination.current);
  };

  const handleDelete = (id) => {
    Swal.fire({
      title: "Confirm Deletion",
      text: "Are you sure you want to delete this category? This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#4EC3BD",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        axios.delete(`${Base_url}/apis/expenseCategory/delete/${id}`)
          .then((res) => {
            if (res.data.status === 'ok') {
              Swal.fire({
                title: "Deleted!",
                text: "Category has been deleted successfully.",
                icon: "success",
                confirmButtonColor: "#4EC3BD",
              });
              fetchExpenseCategories(currentPage, searchTerm);
            }
          })
          .catch((error) => {
            Swal.fire({
              title: "Error!",
              text: error.response?.data?.message || "Failed to delete category.",
              icon: "error",
              confirmButtonColor: "#4EC3BD",
            });
          });
      }
    });
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingCategory(null);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  return (
    <>
      <Breadcrumb pageName="Expense Categories" />
      
      <AddExpenseCategories
        isModalOpen={isModalOpen}
        setIsModalOpen={handleModalClose}
        fetchExpenseCategories={() => fetchExpenseCategories(currentPage, searchTerm)}
        selectedCategory={editingCategory}
      />

      <div className="mb-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="w-full md:w-1/3">
          <input
            type="text"
            placeholder="Search expense categories..."
            value={searchTerm}
            onChange={handleSearch}
            className="w-full rounded border-[1.5px] bg-white border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
          />
        </div>
        
        {canEcCreate ? (
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
          Add Category
        </button>
        ) : null}
      </div>
      
      <div className="rounded-lg border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <Table
          rowKey="_id"
          rowSelection={rowSelection}
          columns={columns}
          dataSource={expenseCategories}
          pagination={{
            current: currentPage,
            pageSize: 10,
            total: totalCount,
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

export default ExpenseCategories;