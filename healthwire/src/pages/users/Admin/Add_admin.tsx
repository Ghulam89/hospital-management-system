import { Link, useNavigate } from 'react-router-dom';
import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';

import { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const AddAdmin = () => {
  const [gender, setGender] = useState('');

  const [loading, setLoading] = useState(false);
  const [roleRights, setRoleRights] = useState({
    
    createUsers: '',
    viewFinanicalReports:'',
    editUsers:'',
    administrator: ''
  });

 
  const handleRoleRightChange = (right) => {
    setRoleRights((prevRights) => ({
      ...prevRights,
      [right]: prevRights[right] ? '' : right,
    }));
  };
  

  const handleGenderChange = (gender) => {
    setGender(gender);
  };





  const [state,setState] = useState({
   name:"",
   phone:"",
   email:"",
   password:"",
   shift:"" 
  })

  const handleInputs = (e) => {
    setState({ ...state, [e.target.name]: e.target.value });
  };
  console.log(state);

  const navigate = useNavigate();

  const SubmitFun =(e)=>{

    e.preventDefault();

      if(!state.name){
        toast("Must enter name!") 
      }
     
      else if(!gender){
        toast("Please checked your gender") 
      }
      else if(!state.phone){
        toast("Must enter phone!") 
      }
      else if(!state.email){
        toast("Must enter email!") 
      }
      else if(!state.password){
        toast("Must enter password!") 
      }
      else if(!state.shift){
        toast("Must enter shift!") 
      }
      
      else if (!roleRights.administrator){
        toast("Please checked role") 
      }
      
      else {

        setLoading(true)
        const params={
          name:state.name,
          gender:gender,
          phone:state.phone,
          email:state.email,
          password:state.password,
          shift:state.shift,
          role:roleRights.administrator,
          tabs: [
            roleRights.createUsers,
            roleRights.viewFinanicalReports,
            roleRights.editUsers,
            roleRights.editUsers
          ].filter(tab => tab !== '' && tab !== ' '),
    
    
        }
        axios.post('https://api.holisticare.pk/apis/user/create',params).then((res)=>{

          console.log(res.data);
                                 
             if(res.data.status==='ok'){
              setLoading(false)
            toast.success("Admin registration successfully!");
            navigate('/admin/users')
          }else{
            setLoading(false)
          }
          
    
        }).catch((error)=>{
    
        console.log(error);
        setLoading(false)

          toast.error(error.response.data.message)
          
        })
      }
   
  }


  return (
    <>
      <Breadcrumb pageName="Add Admin" />

      <div className="">
        <div className="flex flex-col gap-9">
          {/* Contact Form */}
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">
                Add Admin
              </h3>
            </div>
            <form onSubmit={SubmitFun} action="#">
              <div className="p-6.5">
                <div className="mb-4.5 grid grid-cols-2 gap-6 xl:flex-row">
                  <div className="w-full">
                    <label className="mb-2.5 block text-black dark:text-white">
                      Name
                    </label>
                    <input
                      onChange={handleInputs}
                       name='name'
                      type="text"
                      placeholder=""
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    />
                  </div>
                  <div className="w-full">
                    <label className="mb-2.5 block text-black dark:text-white">
                      Gender
                    </label>
                    <div className="flex pt-4 gap-12 items-center">
                      {['Male', 'Female', 'Other'].map((g) => (
                        <div key={g}>
                          <label className="flex cursor-pointer select-none items-center">
                            <div className="relative">
                              <input
                                type="radio"
                                name="gender"
                                className="sr-only"
                                checked={gender === g}
                                onChange={() => handleGenderChange(g)}
                              />
                              <div
                                className={`mr-4 flex h-5 w-5 items-center justify-center rounded border ${
                                  gender === g &&
                                  'border-primary bg-gray dark:bg-transparent'
                                }`}
                              >
                                {gender === g && (
                                  <svg
                                    width="11"
                                    height="8"
                                    viewBox="0 0 11 8"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      d="M10.0915 0.951972L10.0867 0.946075L10.0813 0.940568C9.90076 0.753564 9.61034 0.753146 9.42927 0.939309L4.16201 6.22962L1.58507 3.63469C1.40401 3.44841 1.11351 3.44879 0.932892 3.63584C0.755703 3.81933 0.755703 4.10875 0.932892 4.29224L0.932878 4.29225L0.934851 4.29424L3.58046 6.95832C3.73676 7.11955 3.94983 7.2 4.1473 7.2C4.36196 7.2 4.55963 7.11773 4.71406 6.9584L10.0468 1.60234C10.2436 1.4199 10.2421 1.1339 10.0915 0.951972Z"
                                      fill="#3056D3"
                                      stroke="#3056D3"
                                      strokeWidth="0.4"
                                    />
                                  </svg>
                                )}
                              </div>
                            </div>
                            {g}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="w-full">
                    <label className="mb-2.5 block text-black dark:text-white">
                      Phone
                    </label>
                    <input
                     onChange={handleInputs}
                       name='phone'
                      type="text"
                      placeholder=""
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    />
                  </div>
                  <div className="w-full">
                    <label className="mb-2.5 block text-black dark:text-white">
                      Email
                    </label>
                    <input
                      onChange={handleInputs}
                       name='email'
                      type="text"
                      placeholder=""
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    />
                  </div>

                  <div className="w-full">
                    <label className="mb-2.5 block text-black dark:text-white">
                      Password
                    </label>
                    <input
                      onChange={handleInputs}
                       name='password'
                      type="text"
                      placeholder=""
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    />
                  </div>

                  <div className="w-full">
                    <label className="mb-2.5 block text-black dark:text-white">
                      Shift
                    </label>
                    <select onChange={handleInputs}
                       name='shift'
                       className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary">
                      <option> Select Shift</option>
                      <option>Morning</option>
                      <option> Evening</option>
                    </select>
                  </div>

                  <div className="w-full">
                    <label className="mb-2.5 block text-black dark:text-white">
                      Roles
                    </label>
                    <div>
                      <label className="flex cursor-pointer select-none items-center">
                        <div className="relative">
                          <input
                            type="checkbox"
                            id="roleAdministrator"
                            className="sr-only"
                            checked={roleRights.administrator === 'administrator'}
                            onChange={() => handleRoleRightChange('administrator')}
                          />
                          <div
            className={`mr-4 flex h-5 w-5 items-center justify-center rounded border ${
              roleRights.administrator === 'administrator' ? 'border-primary bg-gray dark:bg-transparent' : ''
            }`}
          >
                            {roleRights.administrator === 'administrator' && (
                              <svg
                                width="11"
                                height="8"
                                viewBox="0 0 11 8"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M10.0915 0.951972L10.0867 0.946075L10.0813 0.940568C9.90076 0.753564 9.61034 0.753146 9.42927 0.939309L4.16201 6.22962L1.58507 3.63469C1.40401 3.44841 1.11351 3.44879 0.932892 3.63584C0.755703 3.81933 0.755703 4.10875 0.932892 4.29224L0.932878 4.29225L0.934851 4.29424L3.58046 6.95832C3.73676 7.11955 3.94983 7.2 4.1473 7.2C4.36196 7.2 4.55963 7.11773 4.71406 6.9584L10.0468 1.60234C10.2436 1.4199 10.2421 1.1339 10.0915 0.951972Z"
                                  fill="#3056D3"
                                  stroke="#3056D3"
                                  strokeWidth="0.4"
                                />
                              </svg>
                            )}
                          </div>
                        </div>
                        Administrator (Complete Access)
                      </label>
                    </div>
                  </div>



               
                </div>
                <div className="w-full pt-8">
                    <label className="mb-2.5 block text-black dark:text-white">
                    Admin Role User  Rights
                    </label>
                  
                  </div>

                  <div className=' grid grid-cols-4'>
                  
                  <div>
                  <div className="flex flex-col pt-4 gap-5">
                    <div>
                      <label className="flex cursor-pointer select-none items-center">
                        <div className="relative">
                          <input
                            type="checkbox"
                            id="createUsers"
                            className="sr-only"
                            checked={roleRights.createUsers}
                            onChange={() =>
                              handleRoleRightChange('createUsers')
                            }
                          />
                          <div
                            className={`mr-4 flex h-5 w-5 items-center justify-center rounded border ${
                              roleRights.createUsers &&
                              'border-primary bg-gray dark:bg-transparent'
                            }`}
                          >
                            {roleRights.createUsers && (
                              <svg
                                width="11"
                                height="8"
                                viewBox="0 0 11 8"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M10.0915 0.951972L10.0867 0.946075L10.0813 0.940568C9.90076 0.753564 9.61034 0.753146 9.42927 0.939309L4.16201 6.22962L1.58507 3.63469C1.40401 3.44841 1.11351 3.44879 0.932892 3.63584C0.755703 3.81933 0.755703 4.10875 0.932892 4.29224L0.932878 4.29225L0.934851 4.29424L3.58046 6.95832C3.73676 7.11955 3.94983 7.2 4.1473 7.2C4.36196 7.2 4.55963 7.11773 4.71406 6.9584L10.0468 1.60234C10.2436 1.4199 10.2421 1.1339 10.0915 0.951972Z"
                                  fill="#3056D3"
                                  stroke="#3056D3"
                                  strokeWidth="0.4"
                                />
                              </svg>
                            )}
                          </div>
                        </div>
                        Create Users
                      </label>
                    </div>
                    <div>
                      <label className="flex cursor-pointer select-none items-center">
                        <div className="relative">
                          <input
                            type="checkbox"
                            id="viewFinanicalReports"
                            className="sr-only"
                            checked={roleRights.viewFinanicalReports}
                            onChange={() =>
                              handleRoleRightChange('viewFinanicalReports')
                            }
                          />
                          <div
                            className={`mr-4 flex h-5 w-5 items-center justify-center rounded border ${
                              roleRights.viewFinanicalReports &&
                              'border-primary bg-gray dark:bg-transparent'
                            }`}
                          >
                            {roleRights.viewFinanicalReports && (
                              <svg
                                width="11"
                                height="8"
                                viewBox="0 0 11 8"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M10.0915 0.951972L10.0867 0.946075L10.0813 0.940568C9.90076 0.753564 9.61034 0.753146 9.42927 0.939309L4.16201 6.22962L1.58507 3.63469C1.40401 3.44841 1.11351 3.44879 0.932892 3.63584C0.755703 3.81933 0.755703 4.10875 0.932892 4.29224L0.932878 4.29225L0.934851 4.29424L3.58046 6.95832C3.73676 7.11955 3.94983 7.2 4.1473 7.2C4.36196 7.2 4.55963 7.11773 4.71406 6.9584L10.0468 1.60234C10.2436 1.4199 10.2421 1.1339 10.0915 0.951972Z"
                                  fill="#3056D3"
                                  stroke="#3056D3"
                                  strokeWidth="0.4"
                                />
                              </svg>
                            )}
                          </div>
                        </div>
                        View Finanical Reports
                      </label>
                    </div>
                  
                  </div>


               
                  </div>
                  <div>
                  <div className="flex flex-col pt-4 gap-5">
                    <div>
                      <label className="flex cursor-pointer select-none items-center">
                        <div className="relative">
                          <input
                            type="checkbox"
                            id="editUsers"
                            className="sr-only"
                            checked={roleRights.editUsers}
                            onChange={() =>
                              handleRoleRightChange('editUsers')
                            }
                          />
                          <div
                            className={`mr-4 flex h-5 w-5 items-center justify-center rounded border ${
                              roleRights.editUsers &&
                              'border-primary bg-gray dark:bg-transparent'
                            }`}
                          >
                            {roleRights.editUsers && (
                              <svg
                                width="11"
                                height="8"
                                viewBox="0 0 11 8"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M10.0915 0.951972L10.0867 0.946075L10.0813 0.940568C9.90076 0.753564 9.61034 0.753146 9.42927 0.939309L4.16201 6.22962L1.58507 3.63469C1.40401 3.44841 1.11351 3.44879 0.932892 3.63584C0.755703 3.81933 0.755703 4.10875 0.932892 4.29224L0.932878 4.29225L0.934851 4.29424L3.58046 6.95832C3.73676 7.11955 3.94983 7.2 4.1473 7.2C4.36196 7.2 4.55963 7.11773 4.71406 6.9584L10.0468 1.60234C10.2436 1.4199 10.2421 1.1339 10.0915 0.951972Z"
                                  fill="#3056D3"
                                  stroke="#3056D3"
                                  strokeWidth="0.4"
                                />
                              </svg>
                            )}
                          </div>
                        </div>
                        Edit Users
                      </label>
                    </div>
                    <div>
                      <label className="flex cursor-pointer select-none items-center">
                        <div className="relative">
                          <input
                            type="checkbox"
                            id="viewOtherReports"
                            className="sr-only"
                            checked={roleRights.viewOtherReports}
                            onChange={() =>
                              handleRoleRightChange('viewOtherReports')
                            }
                          />
                          <div
                            className={`mr-4 flex h-5 w-5 items-center justify-center rounded border ${
                              roleRights.viewOtherReports &&
                              'border-primary bg-gray dark:bg-transparent'
                            }`}
                          >
                            {roleRights.viewOtherReports && (
                              <svg
                                width="11"
                                height="8"
                                viewBox="0 0 11 8"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M10.0915 0.951972L10.0867 0.946075L10.0813 0.940568C9.90076 0.753564 9.61034 0.753146 9.42927 0.939309L4.16201 6.22962L1.58507 3.63469C1.40401 3.44841 1.11351 3.44879 0.932892 3.63584C0.755703 3.81933 0.755703 4.10875 0.932892 4.29224L0.932878 4.29225L0.934851 4.29424L3.58046 6.95832C3.73676 7.11955 3.94983 7.2 4.1473 7.2C4.36196 7.2 4.55963 7.11773 4.71406 6.9584L10.0468 1.60234C10.2436 1.4199 10.2421 1.1339 10.0915 0.951972Z"
                                  fill="#3056D3"
                                  stroke="#3056D3"
                                  strokeWidth="0.4"
                                />
                              </svg>
                            )}
                          </div>
                        </div>
                        View Other Reports
                      </label>
                    </div>
                   
                  </div>
                  </div>
                  <div>
                  <div className="flex flex-col pt-4 gap-5">
                    <div>
                      <label className="flex cursor-pointer select-none items-center">
                        <div className="relative">
                          <input
                            type="checkbox"
                            id="deleteUsers"
                            className="sr-only"
                            checked={roleRights.deleteUsers}
                            onChange={() =>
                              handleRoleRightChange('deleteUsers')
                            }
                          />
                          <div
                            className={`mr-4 flex h-5 w-5 items-center justify-center rounded border ${
                              roleRights.deleteUsers &&
                              'border-primary bg-gray dark:bg-transparent'
                            }`}
                          >
                            {roleRights.deleteUsers && (
                              <svg
                                width="11"
                                height="8"
                                viewBox="0 0 11 8"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M10.0915 0.951972L10.0867 0.946075L10.0813 0.940568C9.90076 0.753564 9.61034 0.753146 9.42927 0.939309L4.16201 6.22962L1.58507 3.63469C1.40401 3.44841 1.11351 3.44879 0.932892 3.63584C0.755703 3.81933 0.755703 4.10875 0.932892 4.29224L0.932878 4.29225L0.934851 4.29424L3.58046 6.95832C3.73676 7.11955 3.94983 7.2 4.1473 7.2C4.36196 7.2 4.55963 7.11773 4.71406 6.9584L10.0468 1.60234C10.2436 1.4199 10.2421 1.1339 10.0915 0.951972Z"
                                  fill="#3056D3"
                                  stroke="#3056D3"
                                  strokeWidth="0.4"
                                />
                              </svg>
                            )}
                          </div>
                        </div>
                        Delete Users
                      </label>
                    </div>
                    <div>
                      <label className="flex cursor-pointer select-none items-center">
                        <div className="relative">
                          <input
                            type="checkbox"
                            id="deletePatient"
                            className="sr-only"
                            checked={roleRights.deletePatient}
                            onChange={() =>
                              handleRoleRightChange('deletePatient')
                            }
                          />
                          <div
                            className={`mr-4 flex h-5 w-5 items-center justify-center rounded border ${
                              roleRights.deletePatient &&
                              'border-primary bg-gray dark:bg-transparent'
                            }`}
                          >
                            {roleRights.deletePatient && (
                              <svg
                                width="11"
                                height="8"
                                viewBox="0 0 11 8"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M10.0915 0.951972L10.0867 0.946075L10.0813 0.940568C9.90076 0.753564 9.61034 0.753146 9.42927 0.939309L4.16201 6.22962L1.58507 3.63469C1.40401 3.44841 1.11351 3.44879 0.932892 3.63584C0.755703 3.81933 0.755703 4.10875 0.932892 4.29224L0.932878 4.29225L0.934851 4.29424L3.58046 6.95832C3.73676 7.11955 3.94983 7.2 4.1473 7.2C4.36196 7.2 4.55963 7.11773 4.71406 6.9584L10.0468 1.60234C10.2436 1.4199 10.2421 1.1339 10.0915 0.951972Z"
                                  fill="#3056D3"
                                  stroke="#3056D3"
                                  strokeWidth="0.4"
                                />
                              </svg>
                            )}
                          </div>
                        </div>
                        Delete Patient
                      </label>
                    </div>
                
                  </div>
                  </div>
                  <div>
                  <div className="flex flex-col pt-4 gap-5">
                   
                    <div>
                      <label className="flex cursor-pointer select-none items-center">
                        <div className="relative">
                          <input
                            type="checkbox"
                            id="editPaymentInvoiceDate"
                            className="sr-only"
                            checked={roleRights.editPaymentInvoiceDate}
                            onChange={() =>
                              handleRoleRightChange('editPaymentInvoiceDate')
                            }
                          />
                          <div
                            className={`mr-4 flex h-5 w-5 items-center justify-center rounded border ${
                              roleRights.editPaymentInvoiceDate &&
                              'border-primary bg-gray dark:bg-transparent'
                            }`}
                          >
                            {roleRights.editPaymentInvoiceDate && (
                              <svg
                                width="11"
                                height="8"
                                viewBox="0 0 11 8"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M10.0915 0.951972L10.0867 0.946075L10.0813 0.940568C9.90076 0.753564 9.61034 0.753146 9.42927 0.939309L4.16201 6.22962L1.58507 3.63469C1.40401 3.44841 1.11351 3.44879 0.932892 3.63584C0.755703 3.81933 0.755703 4.10875 0.932892 4.29224L0.932878 4.29225L0.934851 4.29424L3.58046 6.95832C3.73676 7.11955 3.94983 7.2 4.1473 7.2C4.36196 7.2 4.55963 7.11773 4.71406 6.9584L10.0468 1.60234C10.2436 1.4199 10.2421 1.1339 10.0915 0.951972Z"
                                  fill="#3056D3"
                                  stroke="#3056D3"
                                  strokeWidth="0.4"
                                />
                              </svg>
                            )}
                          </div>
                        </div>
                        Edit Payment/Invoice Date
                      </label>
                    </div>
                    <div>
                      <label className="flex cursor-pointer select-none items-center">
                        <div className="relative">
                          <input
                            type="checkbox"
                            id="editExpenses"
                            className="sr-only"
                            checked={roleRights.editExpenses}
                            onChange={() =>
                              handleRoleRightChange('editExpenses')
                            }
                          />
                          <div
                            className={`mr-4 flex h-5 w-5 items-center justify-center rounded border ${
                              roleRights.editExpenses &&
                              'border-primary bg-gray dark:bg-transparent'
                            }`}
                          >
                            {roleRights.editExpenses && (
                              <svg
                                width="11"
                                height="8"
                                viewBox="0 0 11 8"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M10.0915 0.951972L10.0867 0.946075L10.0813 0.940568C9.90076 0.753564 9.61034 0.753146 9.42927 0.939309L4.16201 6.22962L1.58507 3.63469C1.40401 3.44841 1.11351 3.44879 0.932892 3.63584C0.755703 3.81933 0.755703 4.10875 0.932892 4.29224L0.932878 4.29225L0.934851 4.29424L3.58046 6.95832C3.73676 7.11955 3.94983 7.2 4.1473 7.2C4.36196 7.2 4.55963 7.11773 4.71406 6.9584L10.0468 1.60234C10.2436 1.4199 10.2421 1.1339 10.0915 0.951972Z"
                                  fill="#3056D3"
                                  stroke="#3056D3"
                                  strokeWidth="0.4"
                                />
                              </svg>
                            )}
                          </div>
                        </div>
                        Edit Expenses
                      </label>
                    </div>
                  </div>
                  </div>
                    </div>

                <div className="mt-4.5">
                  <button
          type="submit"
          disabled={loading}
          className={`flex justify-center rounded bg-primary p-3 font-medium text-gray ${
            loading ? 'opacity-75 cursor-not-allowed' : ''
          }`}
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : (
            'Add Admin'
          )}
        </button>
                </div>
              </div>
            </form>
          </div>

         
        </div>
      </div>
    </>
  );
};

export default AddAdmin;
