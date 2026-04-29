import { Link, useNavigate, useParams } from 'react-router-dom';
import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import SelectGroupOne from '../../../components/Forms/SelectGroup/SelectGroupOne';

import { FaTrashAlt } from 'react-icons/fa';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Base_url } from '../../../utils/Base_url';

const Edit_admin = () => {
  const { id } = useParams();
  const [gender, setGender] = useState('');
  const [user, setUser] = useState(null);
  const [state, setState] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    shift: '',
  });

  useEffect(() => {
    axios
      .get(`${Base_url}/apis/user/get/${id}`)
      .then((res) => {
        const u = res.data.data;
        setUser(u);
        if (u && ['Male', 'Female', 'Other'].includes(u.gender)) {
          setGender(u.gender);
        }
        setState({
          name: u?.name || '',
          phone: u?.phone || '',
          email: u?.email || '',
          password: '',
          shift: u?.shift || '',
        });
      })
      .catch(() => {});
  }, [id]);

  const handleGenderChange = (g) => {
    setGender(g);
  };

  const handleInputs = (e) => {
    setState({ ...state, [e.target.name]: e.target.value });
  };

  const navigate = useNavigate();

  const SubmitFun = (e) => {
    e.preventDefault();

    const params = {
      name: String(state.name || '').trim() || String(user?.name || '').trim(),
      gender: String(gender || '').trim() || String(user?.gender || '').trim(),
      phone: String(state.phone || '').trim() || String(user?.phone || '').trim(),
      email: String(state.email || '').trim() || String(user?.email || '').trim(),
      shift: String(state.shift || '').trim() || String(user?.shift || '').trim(),
      role: String(user?.role || 'administrator').trim(),
      tabs: Array.isArray(user?.tabs) ? user.tabs : [],
    };
    const password = String(state.password || '').trim();
    if (password) params.password = password;

        axios.put(`${Base_url}/apis/user/update/${id}`,params).then((res)=>{

          console.log(res.data);


          if(res.data.status==='ok'){
            toast.success("user update successfully!");
            navigate('/admin/users')
          }else{

          }
          
    
        }).catch((error)=>{
    
        console.log(error);
        
          toast.error(
            error?.response?.data?.message || error?.message || 'Request failed',
          )
          
        })
      
   
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

export default Edit_admin;
