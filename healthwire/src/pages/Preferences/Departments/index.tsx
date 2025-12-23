import React, { useEffect, useState } from 'react';

import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import { FaRegEdit } from 'react-icons/fa';
import { RiDeleteBin6Line } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import AddDepartment from './Add_departments';

const Department = () => {
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [singleData, setSingleData] = useState(null);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = () => {
    axios.get('https://api.holisticare.pk/apis/department/get')
      .then((res) => {
        setDepartments(res.data.data);
      })
      .catch((error) => {
        console.log(error);
      });
  };

  const removeFunction = (id) => {
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
        axios.delete(`https://api.holisticare.pk/apis/department/delete/${id}`)
          .then((res) => {
            if (res.data.status === 'ok') {
              Swal.fire("Deleted!", "Your file has been deleted.", "success");
              fetchDepartments(); // Update departments after successful delete
            }
          })
          .catch((error) => {
            console.log(error);
          });
      }
    });
  };

 
  const openUpdateModal = (department = null) => {
    setSingleData(department);
    setIsUpdateOpen(true);
  };

  const closeUpdateModal = () => {
    setSingleData(null);
    setIsUpdateOpen(false);
  };
  
  return (
    <>
      
      <AddDepartment
        isModalOpen={isUpdateOpen}
        setIsModalOpen={setIsUpdateOpen}
        setDepartments={setDepartments}
        defaultDepartment={singleData}
      />

      <Breadcrumb pageName="Departments" />

      <div className="flex justify-end pb-6">
        <button
           onClick={() => openUpdateModal()}
          className="inline-flex items-center justify-center gap-2.5 rounded-md bg-primary py-3 px-10 text-center font-medium text-white hover:bg-opacity-90 lg:px-8 xl:px-10"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0,0,256,256"
            width="20px"
            height="20px"
          >
            <g
              fill="#ffffff"
              fillRule="nonzero"
              stroke="none"
              strokeWidth="1"
              strokeLinecap="butt"
              strokeLinejoin="miter"
              strokeMiterlimit="10"
              strokeDasharray=""
              strokeDashoffset="0"
              fontFamily="none"
              fontWeight="none"
              fontSize="none"
              textAnchor="none"
            >
              <g transform="scale(5.12,5.12)">
                <path d="M25,2c-12.6907,0 -23,10.3093 -23,23c0,12.69071 10.3093,23 23,23c12.69071,0 23,-10.30929 23,-23c0,-12.6907 -10.30929,-23 -23,-23zM25,4c11.60982,0 21,9.39018 21,21c0,11.60982 -9.39018,21 -21,21c-11.60982,0 -21,-9.39018 -21,-21c0,-11.60982 9.39018,-21 21,-21zM24,13v11h-11v2h11v11h2v-11h11v-2h-11v-11z"></path>
              </g>
            </g>
          </svg>
          Add Department
        </button>
      </div>

      <div className="">
        <ul className="flex flex-col gap-5 p-0">
          {departments.map((item, index) => (
            <li key={index} className="bg-[#1C2434] shadow-lg rounded-xl">
              <div className="p-4 flex justify-between items-center">
                <p className="text-white font-semibold m-0">{item.name}</p>
                <p className="m-0 text-sm text-white">{item.createdAt}</p>
                <div className="flex items-center gap-3">
                  <FaRegEdit className=' cursor-pointer' onClick={() => openUpdateModal(item)}  color="white" />
                  <RiDeleteBin6Line className=' cursor-pointer' onClick={() => removeFunction(item._id)} color="white" />
                </div>
              </div>
              {item.subDepartment.length > 0 && (
                <div className="border border-white rounded-xl">
                  <p className="text-white px-4 m-0 border-b py-4">
                    SUB-DEPARTMENT
                  </p>
                  <ul className="p-0 flex flex-col">
                    {item.subDepartment.map((subDept, subIndex) => (
                      <React.Fragment key={subIndex}>
                        <li className="px-4 py-2">
                          <p className="m-0 text-white">{subDept.name}</p>
                        </li>
                        <hr className="border-white m-0" />
                      </React.Fragment>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
};

export default Department;
