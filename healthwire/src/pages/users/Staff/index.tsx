import React, { useState } from 'react';
import { Table } from 'antd';
import { FaRegEdit } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const columns = [
  {
    title: 'NAME',
    dataIndex: 'name',
    render: () => 'Ghulam Mustafa',
  },
  {
    title: 'EMAIL',
    dataIndex: 'time',
    render: () => 'gm6681328@gmail.com', 
  },
  {
    title: 'PHONE',
    dataIndex: 'doctor',
    render: () => '03090962660', 
  },
  {
    title: 'LAST SIGNED IN ON',
    dataIndex: 'doctor',
    render: () => '12/12/2024', 
  },
  {
    title: 'ACTION',
    dataIndex: 'doctor',
    render: () => <button className="hover:text-primary">
   <FaRegEdit size={20} />
  </button>, 
  },
 
];

const data = [];

const Staff = () => {
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const onSelectChange = (newSelectedRowKeys) => {
    console.log('selectedRowKeys changed: ', newSelectedRowKeys);
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
        text: 'Select Odd Row',
        onSelect: (changeableRowKeys) => {
          let newSelectedRowKeys = [];
          newSelectedRowKeys = changeableRowKeys.filter((_, index) => {
            if (index % 2 !== 0) {
              return false;
            }
            return true;
          });
          setSelectedRowKeys(newSelectedRowKeys);
        },
      },
      {
        key: 'even',
        text: 'Select Even Row',
        onSelect: (changeableRowKeys) => {
          let newSelectedRowKeys = [];
          newSelectedRowKeys = changeableRowKeys.filter((_, index) => {
            if (index % 2 !== 0) {
              return true;
            }
            return false;
          });
          setSelectedRowKeys(newSelectedRowKeys);
        },
      },
    ],
  };

  return (
    <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
      <div className=' flex  pb-5 justify-between items-center'>
      <h4 className="text-xl font-semibold text-black dark:text-white">
      Staff
      </h4>
      <Link
              to="#"
              className="inline-flex items-center justify-center gap-2.5 rounded-md bg-primary py-3 px-10 text-center font-medium text-white hover:bg-opacity-90 lg:px-8 xl:px-10"
            >
         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0,0,256,256" width="20px" height="20px"><g fill="#ffffff" fill-rule="nonzero" stroke="none" stroke-width="1" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="10" stroke-dasharray="" stroke-dashoffset="0" font-family="none" font-weight="none" font-size="none" text-anchor="none" ><g transform="scale(5.12,5.12)"><path d="M25,2c-12.6907,0 -23,10.3093 -23,23c0,12.69071 10.3093,23 23,23c12.69071,0 23,-10.30929 23,-23c0,-12.6907 -10.30929,-23 -23,-23zM25,4c11.60982,0 21,9.39018 21,21c0,11.60982 -9.39018,21 -21,21c-11.60982,0 -21,-9.39018 -21,-21c0,-11.60982 9.39018,-21 21,-21zM24,13v11h-11v2h11v11h2v-11h11v-2h-11v-11z"></path></g></g></svg>
              Add
            </Link>
      </div>
      <Table rowSelection={rowSelection} columns={columns} dataSource={data} pagination={{ pageSize: 10 }} />
    </div>
  );
};

export default Staff;
