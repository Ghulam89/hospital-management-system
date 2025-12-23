import { Link, useNavigate, useParams } from 'react-router-dom';
import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import SelectGroupOne from '../../../components/Forms/SelectGroup/SelectGroupOne';

import { FaTrashAlt } from 'react-icons/fa';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const Edit_accountant = () => {
  const [gender, setGender] = useState('');

  console.log(gender);
  
  const [roleRights, setRoleRights] = useState({
    accountant: '',
    editInvoice: '',
    editExpenses: '',
    viewLaboratoryReports: '',
    refundPayment: '',
    viewPharmacyReports: '',
    viewIPDReports: '',
    deleteInvoice: '',
    editChargersList: '',
    viewInventoryReports: '',
    viewFinancialReports: '',
    viewRadiologyReports: '',
  });


  const { id } = useParams();
  const [user, setUser] = useState(null);

  useEffect(() => {
    axios.get(`https://api.holisticare.pk/apis/user/get/${id}`).then((res) => {
      console.log(res.data);
      
      setUser(res.data.data);
       if (res.data.data && ['Male', 'Female', 'Other'].includes(res.data.data.gender)) {
        setGender(res.data.data.gender);
      }

      if (res.data.data.role === 'accountant') {
        setRoleRights((prevRights) => ({
          ...prevRights,
          accountant: 'accountant', 
        }));
      }


    if (res.data.data.tabs) {
      res.data.data.tabs.forEach(item => {
        if (roleRights[item] !== undefined) { 
          setRoleRights((prevRights) => ({
            ...prevRights,
            [item]: item,
          }));
        }
      });
    }
     
    }).catch(err => {
     
    });
  }, [id]);

  console.log(roleRights);
  

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

    const params={
      name:state.name,
      gender:gender,
      phone:state.phone,
      email:state.email,
      password:state.password,
      shift:state.shift,
      role:roleRights.accountant,
      tabs: [
        roleRights.editInvoice,
        roleRights.editExpenses,
        roleRights.viewLaboratoryReports,
        roleRights.refundPayment
      ].filter(tab => tab !== '' && tab !== ' '),


    }
        axios.put(`https://api.holisticare.pk/apis/user/update/${id}`,params).then((res)=>{

          console.log(res.data);


          if(res.data.status==='ok'){
            toast.success("user update successfully!");
            navigate('/admin/users')
          }else{

          }
          
    
        }).catch((error)=>{
    
        console.log(error);
        
          toast.error(error.response.data.message)
          
        })
      
   
  }
  return (
    <>
      <Breadcrumb pageName="Add Accountant" />

      <div className="">
        <div className="flex flex-col gap-9">
          {/* Contact Form */}
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">
                Add Accountant
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
                      defaultValue={user?.name}
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
                gender === g ? 'border-primary bg-gray dark:bg-transparent' : ''
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
                      defaultValue={user?.phone}
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
                      defaultValue={user?.email}
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
                      defaultValue={user?.password}
                    />
                  </div>

                  <div className="w-full">
                    <label className="mb-2.5 block text-black dark:text-white">
                      Shift
                    </label>
                    <input
                    onChange={handleInputs}
                       name='shift'
                      type="text"
                      placeholder=""
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                      defaultValue={user?.shift}
                    />
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
                            id="roleAccountant"
                            className="sr-only"
                            checked={roleRights.accountant === 'accountant'}
                            onChange={() => handleRoleRightChange('accountant')}
                          />
                          <div
            className={`mr-4 flex h-5 w-5 items-center justify-center rounded border ${
              roleRights.accountant === 'accountant' ? 'border-primary bg-gray dark:bg-transparent' : ''
            }`}
          >
                            {roleRights.accountant === 'accountant' && (
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
                        Accountant (Access to accounts and financial data)
                      </label>
                    </div>
                  </div>



               
                </div>
                <div className="w-full pt-8">
                    <label className="mb-2.5 block text-black dark:text-white">
                    Add Accountant Roles & Rights
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
                            id="editInvoice"
                            className="sr-only"
                            checked={roleRights.editInvoice}
                            onChange={() =>
                              handleRoleRightChange('editInvoice')
                            }
                          />
                          <div
                            className={`mr-4 flex h-5 w-5 items-center justify-center rounded border ${
                              roleRights.editInvoice &&
                              'border-primary bg-gray dark:bg-transparent'
                            }`}
                          >
                            {roleRights.editInvoice && (
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
                        Edit Invoice
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
                    <div>
                      <label className="flex cursor-pointer select-none items-center">
                        <div className="relative">
                          <input
                            type="checkbox"
                            id="viewLaboratoryReports"
                            className="sr-only"
                            checked={roleRights.viewLaboratoryReports}
                            onChange={() =>
                              handleRoleRightChange('viewLaboratoryReports')
                            }
                          />
                          <div
                            className={`mr-4 flex h-5 w-5 items-center justify-center rounded border ${
                              roleRights.viewLaboratoryReports &&
                              'border-primary bg-gray dark:bg-transparent'
                            }`}
                          >
                            {roleRights.viewLaboratoryReports && (
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
                        View Laboratory Reports
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
                            id="editInvoice"
                            className="sr-only"
                            checked={roleRights.refundPayment}
                            onChange={() =>
                              handleRoleRightChange('refundPayment')
                            }
                          />
                          <div
                            className={`mr-4 flex h-5 w-5 items-center justify-center rounded border ${
                              roleRights.refundPayment &&
                              'border-primary bg-gray dark:bg-transparent'
                            }`}
                          >
                            {roleRights.refundPayment && (
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
                        Refund Payment
                      </label>
                    </div>
                    <div>
                      <label className="flex cursor-pointer select-none items-center">
                        <div className="relative">
                          <input
                            type="checkbox"
                            id="editExpenses"
                            className="sr-only"
                            checked={roleRights.viewPharmacyReports}
                            onChange={() =>
                              handleRoleRightChange('viewPharmacyReports')
                            }
                          />
                          <div
                            className={`mr-4 flex h-5 w-5 items-center justify-center rounded border ${
                              roleRights.viewPharmacyReports &&
                              'border-primary bg-gray dark:bg-transparent'
                            }`}
                          >
                            {roleRights.viewPharmacyReports && (
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
                        View Pharmacy Reports
                      </label>
                    </div>
                    <div>
                      <label className="flex cursor-pointer select-none items-center">
                        <div className="relative">
                          <input
                            type="checkbox"
                            id="viewIPDReports"
                            className="sr-only"
                            checked={roleRights.viewIPDReports}
                            onChange={() =>
                              handleRoleRightChange('viewIPDReports')
                            }
                          />
                          <div
                            className={`mr-4 flex h-5 w-5 items-center justify-center rounded border ${
                              roleRights.viewIPDReports &&
                              'border-primary bg-gray dark:bg-transparent'
                            }`}
                          >
                            {roleRights.viewIPDReports && (
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
                        View IPD Reports
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
                            id="deleteInvoice"
                            className="sr-only"
                            checked={roleRights.deleteInvoice}
                            onChange={() =>
                              handleRoleRightChange('deleteInvoice')
                            }
                          />
                          <div
                            className={`mr-4 flex h-5 w-5 items-center justify-center rounded border ${
                              roleRights.deleteInvoice &&
                              'border-primary bg-gray dark:bg-transparent'
                            }`}
                          >
                            {roleRights.deleteInvoice && (
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
                        Delete Invoice
                      </label>
                    </div>
                    <div>
                      <label className="flex cursor-pointer select-none items-center">
                        <div className="relative">
                          <input
                            type="checkbox"
                            id="editChargersList"
                            className="sr-only"
                            checked={roleRights.editChargersList}
                            onChange={() =>
                              handleRoleRightChange('editChargersList')
                            }
                          />
                          <div
                            className={`mr-4 flex h-5 w-5 items-center justify-center rounded border ${
                              roleRights.editChargersList &&
                              'border-primary bg-gray dark:bg-transparent'
                            }`}
                          >
                            {roleRights.editChargersList && (
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
                        Edit Charges List
                      </label>
                    </div>
                    <div>
                      <label className="flex cursor-pointer select-none items-center">
                        <div className="relative">
                          <input
                            type="checkbox"
                            id="viewInventoryReports"
                            className="sr-only"
                            checked={roleRights.viewInventoryReports}
                            onChange={() =>
                              handleRoleRightChange('viewInventoryReports')
                            }
                          />
                          <div
                            className={`mr-4 flex h-5 w-5 items-center justify-center rounded border ${
                              roleRights.viewInventoryReports &&
                              'border-primary bg-gray dark:bg-transparent'
                            }`}
                          >
                            {roleRights.viewInventoryReports && (
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
                        View Inventory Reports
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
                            id="viewFinancialReports"
                            className="sr-only"
                            checked={roleRights.viewFinancialReports}
                            onChange={() =>
                              handleRoleRightChange('viewFinancialReports')
                            }
                          />
                          <div
                            className={`mr-4 flex h-5 w-5 items-center justify-center rounded border ${
                              roleRights.viewFinancialReports &&
                              'border-primary bg-gray dark:bg-transparent'
                            }`}
                          >
                            {roleRights.viewFinancialReports && (
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
                        View Financial Reports
                      </label>
                    </div>
                    <div>
                      <label className="flex cursor-pointer select-none items-center">
                        <div className="relative">
                          <input
                            type="checkbox"
                            id="viewRadiologyReports"
                            className="sr-only"
                            checked={roleRights.viewRadiologyReports}
                            onChange={() =>
                              handleRoleRightChange('viewRadiologyReports')
                            }
                          />
                          <div
                            className={`mr-4 flex h-5 w-5 items-center justify-center rounded border ${
                              roleRights.viewRadiologyReports &&
                              'border-primary bg-gray dark:bg-transparent'
                            }`}
                          >
                            {roleRights.viewRadiologyReports && (
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
                        View Radiology Reports
                      </label>
                    </div>
                  </div>
                  </div>
                    </div>

                <div className="mt-4.5">
                  <button
                    type="submit"
                    className="flex  justify-center rounded bg-primary p-3 font-medium text-gray"
                  >
                     Update
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

export default Edit_accountant;
