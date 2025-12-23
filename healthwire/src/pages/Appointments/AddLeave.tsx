import React, { useState } from 'react';
import { MdClose } from 'react-icons/md';
import Modal from '../../components/modal';
import { FaPlus } from 'react-icons/fa';

const AddLeaveForm: React.FC<{
  isModalOpen: boolean;
  setIsModalOpen: (isOpen: boolean) => void;
  selectedWard: any;
  fetchWardData: () => void;
}> = ({ isModalOpen, setIsModalOpen, selectedWard, fetchWardData }) => {
  const [doctor, setDoctor] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [comments, setComments] = useState('');

  const handleSubmit = () => {
    // Logic to handle form submission
    console.log('Form submitted', { doctor, dateRange, comments });
    setIsModalOpen(false); // Close the modal after submission
  };

  return (
    <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
      <div className="p-3.5 flex justify-between items-center">
        <h1 className="capitalize text-black h4 font-semibold text-xl">
          Add Leave
        </h1>
        <MdClose
          onClick={() => setIsModalOpen(false)}
          size={25}
          className="cursor-pointer"
        />
      </div>
      <hr className="border-gray" />
      <div className="p-4 space-y-6">
        {/* Doctor Name Section */}
        <section className="flex flex-col space-y-2">
          <label className="font-medium text-sm">Doctor Name*</label>
          <input
            type="text"
            placeholder="Enter doctor's name"
            className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
            value={doctor}
            onChange={(e) => setDoctor(e.target.value)}
            required
          />
        </section>

        {/* Date Range Section */}
        <section className="flex flex-col space-y-2">
          <label className="font-medium text-sm">Date Range*</label>
          <div className="flex gap-2">
            <input
              type="date"
              placeholder="Start Date"
              className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
              value={dateRange.start}
              onChange={(e) =>
                setDateRange({ ...dateRange, start: e.target.value })
              }
              required
            />
            <input
              type="date"
              placeholder="End Date"
              className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
              value={dateRange.end}
              onChange={(e) =>
                setDateRange({ ...dateRange, end: e.target.value })
              }
              required
            />
          </div>
        </section>

        {/* Comments Section */}
        <section className="flex flex-col space-y-2">
          <label className="font-medium text-sm">Comments</label>
          <textarea
            placeholder="Any comments"
            className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
          />
        </section>

        {/* Submit Button */}
        <button
          className="inline-flex items-center justify-center gap-2.5 rounded-md bg-primary py-3 px-10 text-center font-medium text-white hover:bg-opacity-90 lg:px-8 xl:px-10"
          onClick={handleSubmit}
        >
          <FaPlus /> Add Leave
        </button>
      </div>
    </Modal>
  );
};

export default AddLeaveForm;