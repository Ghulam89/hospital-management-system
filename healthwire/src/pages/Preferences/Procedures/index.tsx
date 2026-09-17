import React, { useEffect, useState } from 'react';
import { Table, message } from 'antd';

import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';import axios from 'axios';
import { FaCloudUploadAlt, FaRegEdit } from 'react-icons/fa';
import { RiDeleteBin5Line } from 'react-icons/ri';
import Swal from 'sweetalert2';
import AddProcedure from './AddProcedure';
import UploadExcel from '../../../components/UploadExcel/AddUploadExcel';
import { Base_url } from '../../../utils/Base_url';
import { getUserDataFromStorage, isSuperAdminRole } from '../../../utils/branchScope';
import TableColumnCustomize from '../../../components/TableColumnCustomize';
import { useTableColumnPrefs } from '../../../hooks/useTableColumnPrefs';

function refId(value: unknown): string {
  if (value == null || value === '') return '';
  if (typeof value === 'object' && value !== null && '_id' in value) {
    return String((value as { _id: unknown })._id || '');
  }
  return String(value);
}

function resolveMyBranchId(user: Record<string, unknown> | null): string {
  if (!user) return '';
  const fromUser = refId(user.branchId);
  if (fromUser) return fromUser;
  const dept = user.departmentId;
  if (dept && typeof dept === 'object' && dept !== null) {
    return refId((dept as { branchId?: unknown }).branchId);
  }
  return '';
}

const Procedure = () => {
  const user = getUserDataFromStorage();
  const isSuperAdmin = isSuperAdminRole(user?.role);
  const canDeleteProcedure = isSuperAdmin;
  const myBranchId = resolveMyBranchId(user);

  /** Branch user: edit only rows this branch added (procedure.branchId set on create). */
  const canEditProcedureRow = (record: { branchId?: unknown }) => {
    if (isSuperAdmin) return true;
    const rowBranch = refId(record?.branchId);
    if (!rowBranch) return false;
    if (!myBranchId) return false;
    return rowBranch === myBranchId;
  };
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [procedureData, setProcedureData] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalExcelOpen, setIsModalExcelOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editingProcedure, setEditingProcedure] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusTab, setStatusTab] = useState('active'); // all | active | inactive

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


 const columns = (handleDelete, handleEdit, handleToggleActive, canEditRow, showDelete) => {
  const base = [
  {
    title: 'Procedure Name',
    dataIndex: 'name',
    sorter: (a, b) => a.name.localeCompare(b.name),
  },
  {
    title: 'Base Amount (PKR)',
    dataIndex: 'amount',
    sorter: (a, b) => a.amount - b.amount,
    render: (amount) => `PKR ${amount}`,
  },
  {
    title: 'Cost Amount (PKR)',
    dataIndex: 'cost',
   
  },
  {
    title: 'Total Amount (PKR)',
    render: (_, record) => {
      const baseAmount = parseFloat(record.amount) || 0;
      const costValue = record?.cost ? parseFloat(record.cost) : 0;
      const total = baseAmount 
      return `PKR ${Number(total)}`;
    },
    sorter: (a, b) => {
      const getTotal = (item) => {
        const base = parseFloat(item.amount) || 0;
        const cost = item.cost?.cost ? parseFloat(item.cost.cost) : 0;
        return base + cost;
      };
      return getTotal(a) - getTotal(b);
    },
  },
  {
    title: 'Department',
    dataIndex: 'departmentId',
    render: (department) => department?.name || '-',
    sorter: (a, b) => (a.departmentId?.name || '').localeCompare(b.departmentId?.name || ''),
  },
 
  {
    title: 'Description',
    dataIndex: 'description',
    ellipsis: true,
  },
  {
    title: 'Status',
    dataIndex: 'isActive',
    width: 100,
    render: (v) => (
      <span className={`px-2 py-1 rounded-full text-xs ${v !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
        {v !== false ? 'Active' : 'Inactive'}
      </span>
    ),
  },
];
  return [
    ...base,
  {
    title: 'Actions',
    dataIndex: 'action',
    fixed: "right",
    width: 180,
    render: (text, record) => (
      <div className='flex items-center gap-3'>
        {canEditRow(record) ? (
          <button
            type="button"
            onClick={() => handleToggleActive(record)}
            title={record.isActive === false ? 'Activate' : 'Deactivate'}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              record.isActive === false
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-red-100 text-red-700 hover:bg-red-200'
            }`}
          >
            {record.isActive === false ? 'Activate' : 'Deactivate'}
          </button>
        ) : null}
        {canEditRow(record) ? (
          <FaRegEdit
            color='blue'
            size={18}
            onClick={() => handleEdit(record)}
            className="cursor-pointer hover:text-blue-600"
            title="Edit Procedure"
          />
        ) : null}
        {showDelete ? (
          <RiDeleteBin5Line
            color='red'
            size={18}
            onClick={() => handleDelete(record._id)}
            className="cursor-pointer hover:text-red-600"
            title="Delete Procedure"
          />
        ) : null}
      </div>
    ),
  },
];
 };

  const fetchProcedureData = async (page, search = '', statusFilter = statusTab) => {
  try {
    setLoading(true);
    const isActive =
      statusFilter === 'all' ? 'all' : statusFilter === 'inactive' ? 'false' : 'true';
    const url = `${Base_url}/apis/procedure/get?page=${page}&search=${encodeURIComponent(search)}&isActive=${isActive}`;
    const res = await axios.get(url);
    
    const raw = Array.isArray(res?.data?.data) ? res.data.data : [];
    const transformedData = raw.map(item => ({ 
      ...item, 
      key: item._id,
      amount: parseFloat(item.amount),
      cost: item.cost || null, // Map 'cost' directly
      department: item.departmentId?.name + (item.subDepartmentId ? ` / ${item.subDepartmentId.name}` : '')
    }));
    
    setProcedureData(transformedData);
    // Set the total number of items, not total pages
    setTotalPages(res.data.count); // Changed from res.data.totalPages to res.data.count
  } catch (error) {
    message.error('Failed to fetch procedures');
  } finally {
    setLoading(false);
  }
};



  useEffect(() => {
    fetchProcedureData(currentPage, searchTerm, statusTab);
  }, [currentPage, searchTerm, statusTab]);

  const handleTableChange = (pagination, filters, sorter) => {
    setCurrentPage(pagination.current);
  };

  const handleToggleActive = async (record) => {
    if (!canEditProcedureRow(record)) {
      message.error('You can only edit procedures your branch added');
      return;
    }
    const nextActive = record.isActive === false;
    try {
      await axios.put(`${Base_url}/apis/procedure/update/${record._id}`, {
        isActive: nextActive,
      });
      message.success(`Procedure ${nextActive ? 'activated' : 'deactivated'} successfully`);
      fetchProcedureData(currentPage, searchTerm, statusTab);
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to update procedure status');
    }
  };

  const handleDelete = (id) => {
    if (!canDeleteProcedure) {
      message.error('Only Super Admin can delete procedures');
      return;
    }
    Swal.fire({
      title: "Confirm Deletion",
      text: "Are you sure you want to delete this procedure? This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#4EC3BD",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        axios.delete(`${Base_url}/apis/procedure/delete/${id}`)
          .then((res) => {
            if (res.data.status === 'ok') {
              Swal.fire({
                title: "Deleted!",
                text: "Procedure has been deleted successfully.",
                icon: "success",
                confirmButtonColor: "#4EC3BD",
              });
              fetchProcedureData(currentPage, searchTerm, statusTab);
            }
          })
          .catch((error) => {
            Swal.fire({
              title: "Error!",
              text: error.response?.data?.message || "Failed to delete procedure.",
              icon: "error",
              confirmButtonColor: "#4EC3BD",
            });
          });
      }
    });
  };

  const handleEdit = (procedure) => {
    if (!canEditProcedureRow(procedure)) {
      message.error('You can only edit procedures your branch added');
      return;
    }
    setEditingProcedure(procedure);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingProcedure(null);
    setIsModalOpen(true);
  };


  const handleAddExcel = () => {
    setEditingProcedure(null);
    setIsModalExcelOpen(true);
  };


  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingProcedure(null);
  };

   const handleModalExcelClose = () => {
    setIsModalExcelOpen(false);
    setEditingProcedure(null);
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const procedureColumns = columns(
    handleDelete,
    handleEdit,
    handleToggleActive,
    canEditProcedureRow,
    canDeleteProcedure,
  );
  const {
    visibleColumns,
    columnOptions,
    setColumnVisible,
    setAllVisible,
    resetColumns,
  } = useTableColumnPrefs('procedures.list', procedureColumns, {
    lockedKeys: ['action'],
  });

  return (
    <>
      <Breadcrumb pageName="Medical Procedures Management" />

      <AddProcedure
        isModalOpen={isModalOpen}
        setIsModalOpen={handleModalClose}
        fetchProcedureData={() => fetchProcedureData(currentPage, searchTerm, statusTab)}
        selectedProcedure={editingProcedure}
      />



       <UploadExcel
        isModalOpen={isModalExcelOpen}
        setIsModalOpen={handleModalExcelClose}
        fetchProcedureData={() => fetchProcedureData(currentPage, searchTerm, statusTab)}
        selectedProcedure={editingProcedure}
      />

      <div className="mb-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-start sm:items-center">
          <div className="flex p-1 bg-white rounded-lg shadow-sm overflow-hidden border border-stroke">
            {['all', 'active', 'inactive'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setStatusTab(tab);
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 text-sm font-medium transition-colors capitalize ${
                  statusTab === tab
                    ? 'bg-primary text-white rounded-lg'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="w-full md:w-72">
            <input
              type="text"
              placeholder="Search procedures..."
              value={searchTerm}
              onChange={handleSearch}
              className="w-full rounded border-[1.5px] bg-white border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
            />
          </div>
        </div>

        <div className=' flex flex-wrap items-center gap-4'>
          <TableColumnCustomize
            options={columnOptions}
            onToggle={setColumnVisible}
            onShowAll={() => setAllVisible(true)}
            onHideAll={() => setAllVisible(false)}
            onReset={resetColumns}
          />
          <button
          onClick={handleAddExcel}
          className="inline-flex items-center justify-center gap-2.5 rounded-md bg-primary py-3 px-6 text-center font-medium text-white hover:bg-opacity-90 transition-colors duration-200"
        >
          <FaCloudUploadAlt className=' text-white' />

          Upload Excel
        </button>
        
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
          Add New Procedure
        </button>
        </div>
      </div>
      
      <div className="rounded-lg border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <Table
          rowSelection={isSuperAdmin || myBranchId ? rowSelection : undefined}
          columns={visibleColumns}
          dataSource={procedureData}
          pagination={{ 
  current: currentPage, // currentPage is already a number
  pageSize: 20, // Should match your API's page size
  total: totalPages, // This should be the total count of all items
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

export default Procedure;