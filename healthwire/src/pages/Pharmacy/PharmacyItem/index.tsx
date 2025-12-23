import React, { useEffect, useState } from 'react';
import { Table, Button, message, TablePaginationConfig } from 'antd';
import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import axios from 'axios';
import { FaCloudUploadAlt, FaRegEdit } from 'react-icons/fa';
import { RiDeleteBin5Line } from 'react-icons/ri';
import Swal from 'sweetalert2';
import { Base_url } from '../../../utils/Base_url';
import AddPharmacyItems from './AddPharmacyItems';
import UploadPharmacyItem from './UploadPharmacyItem';

// Types for pharmacy item and reference data
interface PharmacyItem {
  _id: string;
  name: string;
  pharmRackId?: { _id: string; name: string } | string | null;
  barcode: string;
  pharmManufacturerId?: { _id: string; name: string } | string | null;
  pharmSupplierId?: { _id: string; name: string } | string | null;
  pharmCategoryId?: { _id: string; name: string } | string | null;
  unit: string;
  conversionUnit: number;
  reOrderLevel: number;
  retailPrice: number;
  openingStock: number;
  drugInteraction: string[];
  genericName: string;
  unitCost: number;
  pieceCost?: number;
  availableQuantity: number;
  expiredQuantity?: number;
  narcotic: boolean;
  active: boolean;
}

const PharmacyItems: React.FC = () => {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [items, setItems] = useState<PharmacyItem[]>([]);
  const [racks, setRacks] = useState<any[]>([]);
  const [manufacturers, setManufacturers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editingItem, setEditingItem] = useState<PharmacyItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Table row selection
  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
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
        onSelect: (changeableRowKeys: React.Key[]) => {
          let newSelectedRowKeys = changeableRowKeys.filter((_, index: number) => index % 2 !== 0);
          setSelectedRowKeys(newSelectedRowKeys);
        },
      },
      {
        key: 'even',
        text: 'Select Even Rows',
        onSelect: (changeableRowKeys: React.Key[]) => {
          let newSelectedRowKeys = changeableRowKeys.filter((_, index: number) => index % 2 === 0);
          setSelectedRowKeys(newSelectedRowKeys);
        },
      },
    ],
  };

  // Table columns
  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      sorter: (a: PharmacyItem, b: PharmacyItem) => a.name.localeCompare(b.name),
    },
    {
      title: 'Barcode',
      dataIndex: 'barcode',
      sorter: (a: PharmacyItem, b: PharmacyItem) => a.barcode.localeCompare(b.barcode),
    },
    {
      title: 'Rack',
      dataIndex: 'pharmRackId',
      render: (rack: any) => rack?.name || 'N/A',
      sorter: (a: PharmacyItem, b: PharmacyItem) => ((a.pharmRackId as any)?.name || '').localeCompare((b.pharmRackId as any)?.name || ''),
    },
    {
      title: 'Manufacturer',
      dataIndex: 'pharmManufacturerId',
      render: (manufacturer: any) => manufacturer?.name || 'N/A',
      sorter: (a: PharmacyItem, b: PharmacyItem) => ((a.pharmManufacturerId as any)?.name || '').localeCompare((b.pharmManufacturerId as any)?.name || ''),
    },
    {
      title: 'Category',
      dataIndex: 'pharmCategoryId',
      render: (category: any) => category?.name || 'N/A',
      sorter: (a: PharmacyItem, b: PharmacyItem) => ((a.pharmCategoryId as any)?.name || '').localeCompare((b.pharmCategoryId as any)?.name || ''),
    },
    {
      title: 'Stock',
      dataIndex: 'availableQuantity',
      render: (text: number) => text || 0,
      sorter: (a: PharmacyItem, b: PharmacyItem) => a.availableQuantity - b.availableQuantity,
    },
    {
      title: 'Retail Price',
      dataIndex: 'retailPrice',
      render: (text: number) => `${text?.toLocaleString() || '0'}`,
      sorter: (a: PharmacyItem, b: PharmacyItem) => a.retailPrice - b.retailPrice,
    },
    {
      title: 'Status',
      dataIndex: 'active',
      render: (text: boolean) => (
        <span className={`px-2 py-1 rounded-full text-xs ${text ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {text ? 'Active' : 'Inactive'}
        </span>
      ),
      sorter: (a: PharmacyItem, b: PharmacyItem) => Number(a.active) - Number(b.active),
    },
    {
      title: 'Actions',
      dataIndex: 'action',
      fixed: 'right' as 'right',
      width: 100,
      render: (_: any, record: PharmacyItem) => (
        <div className='flex items-center gap-4'> 
          <FaRegEdit 
            color='blue' 
            size={18} 
            onClick={() => handleEdit(record)} 
            className="cursor-pointer hover:text-blue-600"
            title="Edit Item"
          />
          <RiDeleteBin5Line 
            color='red' 
            size={18} 
            onClick={() => handleDelete(record._id)} 
            className="cursor-pointer hover:text-red-600"
            title="Delete Item"
          />
        </div>
      ),
    },
  ];

  // Fetch items
  const fetchItems = async (page: number, search = '') => {
    try {
      setLoading(true);
      const url = `${Base_url}/apis/pharmItem/get?page=${page}&search=${search}`;
      const res = await axios.get(url);
      setItems(res.data.data);
      setTotalPages(res.data.totalPages);
    } catch (error) {
      message.error('Failed to fetch pharmacy items');
    } finally {
      setLoading(false);
    }
  };

  // Fetch reference data
  const fetchReferenceData = async () => {
    try {
      const [racksRes, manufacturersRes, suppliersRes, categoriesRes] = await Promise.all([
        axios.get(`${Base_url}/apis/pharmRack/get`),
        axios.get(`${Base_url}/apis/pharmManufacturer/get`),
        axios.get(`${Base_url}/apis/pharmSupplier/get`),
        axios.get(`${Base_url}/apis/pharmCategory/get`)
      ]);
      setRacks(racksRes.data.data);
      setManufacturers(manufacturersRes.data.data);
      setSuppliers(suppliersRes.data.data);
      setCategories(categoriesRes.data.data);
    } catch (error) {
      message.error('Failed to fetch reference data');
    }
  };

  useEffect(() => {
    fetchItems(currentPage, searchTerm);
    fetchReferenceData();
    // eslint-disable-next-line
  }, [currentPage, searchTerm]);

  // Table pagination change
  const handleTableChange = (pagination: TablePaginationConfig) => {
    setCurrentPage(pagination.current || 1);
  };

  // Delete item
  const handleDelete = (id: string) => {
    Swal.fire({
      title: "Confirm Deletion",
      text: "Are you sure you want to delete this item? This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#4EC3BD",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        axios.delete(`${Base_url}/apis/pharmItem/delete/${id}`)
          .then((res) => {
            if (res.data.status === 'ok') {
              Swal.fire({
                title: "Deleted!",
                text: "Item has been deleted successfully.",
                icon: "success",
                confirmButtonColor: "#4EC3BD",
              });
              fetchItems(currentPage, searchTerm);
            }
          })
          .catch((error) => {
            Swal.fire({
              title: "Error!",
              text: error.response?.data?.message || "Failed to delete item.",
              icon: "error",
              confirmButtonColor: "#4EC3BD",
            });
          });
      }
    });
  };

  // Edit item
  const handleEdit = (item: PharmacyItem) => {
    setEditingItem(item);
    setIsAddEditModalOpen(true);
  };

  // Add item
  const handleAdd = () => {
    setEditingItem(null);
    setIsAddEditModalOpen(true);
  };

  // Upload Excel
  const handleAddExcel = () => {
    setIsUploadModalOpen(true);
  };

  // Modal close
  const handleModalClose = () => {
    setIsAddEditModalOpen(false);
    setIsUploadModalOpen(false);
    setEditingItem(null);
  };

  // Search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  return (
    <>
      <Breadcrumb pageName="Pharmacy Items" />

      {/* Add/Edit Modal */}
      <AddPharmacyItems
        isModalOpen={isAddEditModalOpen}
        setIsModalOpen={handleModalClose}
        fetchItems={() => fetchItems(currentPage, searchTerm)}
        selectedItem={editingItem}
        racks={racks}
        manufacturers={manufacturers}
        suppliers={suppliers}
        categories={categories}
      />

      {/* Upload Excel Modal */}
      <UploadPharmacyItem
        isModalOpen={isUploadModalOpen}
        setIsModalOpen={handleModalClose}
        fetchItems={() => fetchItems(currentPage, searchTerm)}
        selectedItem={editingItem}
        racks={racks}
        manufacturers={manufacturers}
        suppliers={suppliers}
        categories={categories}
      />

      <div className="mb-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="w-full md:w-1/3">
          <input
            type="text"
            placeholder="Search Items..."
            value={searchTerm}
            onChange={handleSearch}
            className="w-full rounded border-[1.5px] bg-white border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-4">
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
            Add Item
          </button>
        </div>
      </div>

      {/* Table container with z-index/overflow fix */}
      <div className="rounded-lg border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark relative" style={{ zIndex: 1, overflow: 'visible' }}>
        {/* Table Header with Excel Upload Button */}
        <div className="p-4 border-b border-stroke dark:border-strokedark flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Pharmacy Items List</h2>
          <button
            onClick={handleAddExcel}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary py-2 px-4 text-sm font-medium text-white hover:bg-opacity-90 transition-colors duration-200"
            title="Upload Excel File"
          >
            <FaCloudUploadAlt className="text-white" size={16} />
            Upload Excel
          </button>
        </div>
        
        <Table
          rowKey="_id"
          rowSelection={rowSelection}
          columns={columns}
          dataSource={items}
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

export default PharmacyItems;