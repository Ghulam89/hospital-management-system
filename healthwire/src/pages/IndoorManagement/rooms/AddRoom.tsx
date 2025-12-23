import React, { useState, useEffect } from 'react';
import Modal from '../../../components/modal';
import { MdClose } from 'react-icons/md';
import axios from 'axios';
import { toast } from 'react-toastify';

const AddRoom = ({ isModalOpen, setIsModalOpen, selectedWard, fetchWardData }) => {
  const [name, setName] = useState('');
  const [departments, setDepartments] = useState([]);
  const [selectDepartment, setSelectDepartment] = useState('');

  useEffect(() => {
    if (selectedWard) {
      setName(selectedWard.name);
      setSelectDepartment(selectedWard.departmentId);
    } else {
      setName('');
      setSelectDepartment('');
    }
  }, [selectedWard, isModalOpen]);

  useEffect(() => {
    axios.get('https://api.holisticare.pk/apis/department/get')
      .then((res) => {
        if (res.data.status === 'ok') {
          setDepartments(res.data.data);
        } else {
          toast.error('Failed to fetch departments');
        }
      })
      .catch(() => {
        toast.error('Failed to fetch departments');
      });
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!name) {
      toast.error('Please enter ward name');
      return;
    }
    if (!selectDepartment) {
      toast.error('Please select department');
      return;
    }

    const formData = {
      name: name,
      departmentId: selectDepartment,
    };

    const request = selectedWard
      ? axios.put(`https://api.holisticare.pk/apis/room/update/${selectedWard._id}`, formData)
      : axios.post('https://api.holisticare.pk/apis/room/create', formData);

    request
      .then((res) => {
        if (res.data.status === 'ok') {
          toast.success(`Ward ${selectedWard ? 'updated' : 'added'} successfully`);
          setIsModalOpen(false);
          fetchWardData();
        } else {
          toast.error(`Failed to ${selectedWard ? 'update' : 'add'} ward`);
        }
      })
      .catch(() => {
        toast.error(`Failed to ${selectedWard ? 'update' : 'add'} ward`);
      });
  };

  return (
    <div>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="p-3.5 flex justify-between items-center">
          <h1 className="capitalize text-black h4 font-semibold text-xl">{selectedWard ? 'Edit  Room Type' : 'Add Room Type'}</h1>
          <MdClose onClick={() => setIsModalOpen(false)} size={25} />
        </div>
        <hr className="border-gray" />
        <div>
          <form onSubmit={handleSubmit}>
            <div className="p-6.5">
              <div className="mb-4.5">
                <label className="mb-2.5 block text-black dark:text-white">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                />
              </div>
              <div className="mb-4.5">
                <label className="mb-2.5 block text-black dark:text-white">Department</label>
                <select
                  value={selectDepartment}
                  onChange={(e) => setSelectDepartment(e.target.value)}
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                >
                  <option value="">Select Department</option>
                  {departments.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="flex w-full justify-center rounded bg-primary p-3 font-medium text-gray hover:bg-opacity-90">
                {selectedWard ? 'Update' : 'Add'}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};

export default AddRoom;
