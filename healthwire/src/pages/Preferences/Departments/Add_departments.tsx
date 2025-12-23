import React, { useState, useEffect } from "react";
import Modal from "../../../components/modal";
import { MdClose } from "react-icons/md";
import { RiDeleteBin6Line } from "react-icons/ri";
import { toast } from "react-toastify";
import axios from "axios";

const AddDepartment = ({ isModalOpen, setIsModalOpen, setDepartments, defaultDepartment }) => {
  const [department, setDepartment] = useState("");
  const [subDepartments, setSubDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(false); // Loading state

  // Set default values if editing an existing department
  useEffect(() => {
    if (defaultDepartment) {
      setDepartment(defaultDepartment.name);
      setSubDepartments(defaultDepartment.subDepartment || []);
    } else {
      setDepartment("");
      setSubDepartments([]);
    }
  }, [defaultDepartment]);

  const handleDepartmentChange = (e) => {
    setDepartment(e.target.value);
  };

  const handleSubDepartmentChange = (index, event) => {
    const newSubDepartments = [...subDepartments];
    newSubDepartments[index].name = event.target.value;
    setSubDepartments(newSubDepartments);
  };

  const handleAddSubDepartment = () => {
    setSubDepartments([...subDepartments, { name: "" }]);
  };

  const handleRemoveSubDepartment = (index) => {
    const newSubDepartments = subDepartments.filter((_, i) => i !== index);
    setSubDepartments(newSubDepartments);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    if (!department) {
      toast.error('Must select department');
      return;
    }
  
    setIsLoading(true); // Enable loading state
  
    const formData = {
      name: department,
      subDepartment: subDepartments,
    };
  
    try {
      let res;
      if (defaultDepartment && defaultDepartment._id) {
        // Update existing department
        res = await axios.put(`https://api.holisticare.pk/apis/department/update/${defaultDepartment._id}`, formData);
      } else {
        // Create new department
        res = await axios.post('https://api.holisticare.pk/apis/department/create', formData);
      }
  
      if (res.data.status === 'ok') {
        toast.success(defaultDepartment ? "Department updated successfully!" : "Department added successfully!");
        setIsModalOpen(false);
        setDepartments(prevDepartments => {
          if (defaultDepartment) {
           
            return prevDepartments.map(dept => 
              dept._id === defaultDepartment._id ? { ...dept, ...res.data.data } : dept
            );
          } else {
            
            return [...prevDepartments, res.data.data];
          }
        });
        setDepartment("");
        setSubDepartments([]);
      } else {
        toast.error(defaultDepartment ? "Failed to update department." : "Failed to add department.");
      }
    } catch (error) {
      console.log(error);
      toast.error(defaultDepartment ? "Failed to update department." : "Failed to add department.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        {/* Modal Content */}
        <div>
          <div className="p-3.5 flex justify-between items-center">
            <h1 className="capitalize text-black h4 font-semibold text-xl">
              {defaultDepartment ? "Edit Department" : "Add New Department"}
            </h1>
            <MdClose onClick={() => setIsModalOpen(false)} size={25} />
          </div>
          <hr className="border-gray" />
          <div>
            <form onSubmit={handleSubmit}>
              <div className="p-6.5">
                <div className="mb-4.5">
                  <label className="mb-2.5 block text-black dark:text-white">
                    Department
                  </label>
                  <input
                    value={department}
                    onChange={handleDepartmentChange}
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  />
                    
                </div>

                {subDepartments.length > 0 && (
                  <div className="mb-4.5">
                    <h1 className="capitalize text-black h4 font-semibold mb-2.5">Sub-Departments</h1>
                    {subDepartments.map((subDept, index) => (
                      <div key={index} className="flex gap-4 items-center mb-4.5">
                        <div>
                          <label className="mb-2.5 block text-black dark:text-white">
                            Sub-Department
                          </label>
                          <input
                            type="text"
                            value={subDept.name}
                            onChange={(e) => handleSubDepartmentChange(index, e)}
                            className="rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                          />
                        </div>
                        <div className="pt-7 flex justify-center items-center">
                          <RiDeleteBin6Line
                            onClick={() => handleRemoveSubDepartment(index)}
                            size={20}
                            color="black"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddSubDepartment}
                    className="inline-flex items-center justify-center gap-2.5 rounded-md bg-primary py-3 px-10 text-center font-medium text-white hover:bg-opacity-90 lg:px-3 xl:px-5"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0,0,256,256" width="20px" height="20px">
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
                    Add Sub-Department
                  </button>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={isLoading} // Disable button during loading
                    className="rounded bg-primary p-3 px-5 font-medium text-gray hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="flex items-center">
                        <svg
                          className="animate-spin h-5 w-5 mr-3 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        {defaultDepartment ? "Updating..." : "Adding..."}
                      </div>
                    ) : (
                      defaultDepartment ? "Update" : "Add"
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AddDepartment;