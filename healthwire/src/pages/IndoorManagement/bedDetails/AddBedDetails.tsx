import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import SelectGroupOne from '../../../components/Forms/SelectGroup/SelectGroupOne';

import { FaTrashAlt } from 'react-icons/fa';
import axios from 'axios';
import { toast } from 'react-toastify';

const AddBedDetails = () => {
  const [wards, setWards] = useState([]);
  const [beds, setBeds] = useState([
    { ward: '', bedNumber: '', charges: '', chargeType: '' },
  ]);

  useEffect(() => {
    axios
      .get('https://api.holisticare.pk/apis/ward/get')
      .then((res) => {
        setWards(res.data.data);
      })
      .catch((error) => {
        console.error(error);
        toast.error('Failed to fetch wards');
      });
  }, []);

  const handleAddBed = () => {
    setBeds([
      ...beds,
      { ward: '', bedNumber: '', charges: '', chargeType: '' },
    ]);
  };

  const handleRemoveBed = (index) => {
    const newBeds = beds.filter((_, bedIndex) => bedIndex !== index);
    setBeds(newBeds);
  };

  const handleChangeBed = (index, field, value) => {
    const newBeds = [...beds];
    newBeds[index][field] = value;
    setBeds(newBeds);
  };

  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();

    beds.forEach((bed) => {
      if (!bed.ward || !bed.bedNumber || !bed.charges || !bed.chargeType) {
        toast.error('Please fill out all fields');
        return;
      }

      const formData = {
        wardId: bed.ward,
        bedNo: bed.bedNumber,
        charges: bed.charges,
        chargeType: bed.chargeType,
      };

      axios
        .post('https://api.holisticare.pk/apis/bedDetail/create', formData)
        .then((res) => {
          if (res.data.status === 'ok') {
            toast.success('Bed added successfully');
            navigate('/bed-details')
          } else {
            toast.error('Failed to add bed');
          }
        })
        .catch(() => {
          toast.error('Failed to add bed');
        });
    });
  };

  return (
    <>
      <Breadcrumb pageName="Add Bed Details" />

      <div className="">
        <div className="flex flex-col gap-9">
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">
                Add Bed Details
              </h3>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="p-6.5">
                {beds.map((bed, index) => (
                  <div
                    key={index}
                    className="mb-4.5 flex flex-col gap-6 xl:flex-row"
                  >
                    <div className="w-full xl:w-1/3">
                      <label className="mb-2.5 block text-black dark:text-white">
                        Ward<sup>*</sup>
                      </label>
                      <select
                        value={bed.ward}
                        onChange={(e) =>
                          handleChangeBed(index, 'ward', e.target.value)
                        }
                        className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                      >
                        <option value="">Select Ward</option>
                        {wards.map((ward) => (
                          <option key={ward._id} value={ward._id}>
                            {ward.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-full xl:w-1/3">
                      <label className="mb-2.5 block text-black dark:text-white">
                        Bed#<sup>*</sup>
                      </label>
                      <input
                        type="text"
                        value={bed.bedNumber}
                        onChange={(e) =>
                          handleChangeBed(index, 'bedNumber', e.target.value)
                        }
                        className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                      />
                    </div>

                    <div className="w-full xl:w-1/3">
                      <label className="mb-2.5 block text-black dark:text-white">
                        Charges
                      </label>
                      <input
                        type="text"
                        value={bed.charges}
                        onChange={(e) =>
                          handleChangeBed(index, 'charges', e.target.value)
                        }
                        className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                      />
                    </div>

                    <div className="w-full xl:w-1/3">
                      <label className="mb-2.5 block text-black dark:text-white">
                        Charges Type
                      </label>
                      <select
                        value={bed.chargeType}
                        onChange={(e) =>
                          handleChangeBed(index, 'chargeType', e.target.value)
                        }
                        className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                      >
                        <option value=""> Charges Type</option>

                        <option value={'Per Day'}>Per Day</option>
                        <option value={'Per Hour'}>Per Hour</option>
                      </select>
                    </div>

                    <div className="w-full xl:w-1/4 flex justify-center items-center">
                      <FaTrashAlt
                        onClick={() => handleRemoveBed(index)}
                        className="cursor-pointer"
                      />
                    </div>
                  </div>
                ))}

                <div className="flex justify-between mt-4">
                  <button
                    type="button"
                    onClick={handleAddBed}
                    className="inline-flex items-center justify-center gap-2.5 rounded-md bg-primary py-3 px-10 text-center font-medium text-white hover:bg-opacity-90 lg:px-8 xl:px-10"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 256 256"
                      width="20px"
                      height="20px"
                    >
                      <g fill="#ffffff">
                        <path d="M25,2c-12.6907,0 -23,10.3093 -23,23c0,12.69071 10.3093,23 23,23c12.69071,0 23,-10.30929 23,-23c0,-12.6907 -10.30929,-23 -23,-23zM25,4c11.60982,0 21,9.39018 21,21c0,11.60982 -9.39018,21 -21,21c-11.60982,0 -21,-9.39018 -21,-21c0,-11.60982 9.39018,-21 21,-21zM24,13v11h-11v2h11v11h2v-11h11v-2h-11v-11z"></path>
                      </g>
                    </svg>
                    Add Bed
                  </button>
                  <button
                    type="submit"
                    className="flex justify-center rounded bg-primary px-8 py-3 font-medium text-white hover:bg-opacity-90"
                  >
                    SAVE
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

export default AddBedDetails;
