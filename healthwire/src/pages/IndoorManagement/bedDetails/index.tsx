import React, { useEffect, useState } from 'react';
import { Table, message } from 'antd';

import { Link } from 'react-router-dom';
import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import axios from 'axios';
import { FaRegEdit } from 'react-icons/fa';
import { RiDeleteBin5Line } from 'react-icons/ri';
import Swal from 'sweetalert2';

const columns = (handleDelete, handleEdit) => [
  {
    title: 'BED#',
    dataIndex: 'bedNo',
    key: 'bed',
  },
  {
    title: 'WARD TYPE',
    dataIndex: ['wardId', 'name'], 
    key: 'ward',
  },
  {
    title: 'CHARGES',
    dataIndex: 'charges',
    key: 'charges',
  },
  {
    title: 'CHARGE TYPE',
    dataIndex: 'chargeType',
    key: 'chargeType',
  },
  {
    title: 'ACTION',
    key: 'action',
    render: (text, record) => (
      <div className="flex items-center gap-2">
        {/* <FaRegEdit color="blue" size={20} onClick={() => handleEdit(record)} /> */}
        <RiDeleteBin5Line color="red" size={20} onClick={() => handleDelete(record.key)} />
      </div>
    ),
  },
];

const BedDetails = () => {
  const [bedDetails, setBedDetails] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchBedDetails = (page) => {
    axios.get(`https://api.holisticare.pk/apis/bedDetail/get?page=${page}`)
      .then((res) => {
        console.log(res);
        setBedDetails(res.data.data.map(item => ({ ...item, key: item._id })));
        setTotalPages(res.data.totalPages);
      })
      .catch((error) => {
        console.error('Error fetching bed details:', error);
      });
  };

  useEffect(() => {
    fetchBedDetails(currentPage);
  }, [currentPage]);

 

  const handleDelete = (key) => {
    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#4EC3BD",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    }).then((result) => {
      if (result.isConfirmed) {
        axios.delete(`https://api.holisticare.pk/apis/bedDetail/delete/${key}`)
          .then((res) => {
            if (res.data.status === 'ok') {
              Swal.fire("Deleted!", "Your file has been deleted.", "success");
              fetchBedDetails(currentPage);
            }
          })
          .catch((error) => {
            console.log(error);
          });
      }
    });
  };


  
  const onSelectChange = (newSelectedRowKeys) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
  };

  const handleTableChange = (pagination) => {
    setCurrentPage(pagination.current);
  };

  return (
    <>
      <Breadcrumb pageName="Bed Details" />
      <div className="mb-5 flex justify-between items-center">
        <h1></h1>
        <Link
          to="/bed-details/new"
          className="inline-flex items-center justify-center gap-2.5 rounded-md bg-primary py-3 px-10 text-center font-medium text-white hover:bg-opacity-90 lg:px-8 xl:px-10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0,0,256,256" width="20px" height="20px">
            <g fill="#ffffff" fillRule="nonzero">
              <g transform="scale(5.12,5.12)">
                <path d="M25,2c-12.6907,0 -23,10.3093 -23,23c0,12.69071 10.3093,23 23,23c12.69071,0 23,-10.30929 23,-23c0,-12.6907 -10.30929,-23 -23,-23zM25,4c11.60982,0 21,9.39018 21,21c0,11.60982 -9.39018,21 -21,21c-11.60982,0 -21,-9.39018 -21,-21c0,-11.60982 9.39018,-21 21,-21zM24,13v11h-11v2h11v11h2v-11h11v-2h-11v-11z"></path>
              </g>
            </g>
          </svg>
          Add Bed
        </Link>
      </div>
      <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
        <Table
          rowSelection={rowSelection}
          columns={columns(handleDelete)}
          dataSource={bedDetails}
          pagination={{ current: currentPage, pageSize: 10, total: totalPages * 10 }}
          onChange={handleTableChange}
        />
      </div>
    </>
  );
};

export default BedDetails;
