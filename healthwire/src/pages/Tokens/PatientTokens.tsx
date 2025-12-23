import React, { useEffect, useState } from 'react';
import { Table, message } from 'antd';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment';
import { RiDeleteBin5Line } from 'react-icons/ri';
import { Base_url } from '../../utils/Base_url';
import Header from '../../components/Header';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';


const PatientTokens = () => {
    const {id} = useParams();
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [tokens, setTokens] = useState([]);
    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const onSelectChange = (newSelectedRowKeys) => {
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
                    newSelectedRowKeys = changeableRowKeys.filter((_, index) => index % 2 !== 0);
                    setSelectedRowKeys(newSelectedRowKeys);
                },
            },
            {
                key: 'even',
                text: 'Select Even Row',
                onSelect: (changeableRowKeys) => {
                    let newSelectedRowKeys = [];
                    newSelectedRowKeys = changeableRowKeys.filter((_, index) => index % 2 === 0);
                    setSelectedRowKeys(newSelectedRowKeys);
                },
            },
        ],
    };

    const fetchTokens = () => {
        setLoading(true);
        axios.get(`${Base_url}/apis/token/get?patientId=${id}`)
            .then((res) => {
                setTokens(res?.data?.data || []);
                setLoading(false);
            })
            .catch(err => {
                message.error('Failed to fetch tokens');
                setLoading(false);
            });
    };

    const fetchPatient = () => {
        setLoading(true);
        axios.get(`${Base_url}/apis/patient/get/${id}`)
            .then((res) => {
                setPatient(res?.data?.data || []);
                setLoading(false);
            })
            .catch(err => {
                message.error('Failed to fetch patient');
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchTokens();
        fetchPatient();
    }, []);

    const handleDelete = (id) => {
        axios.delete(`${Base_url}/apis/token/delete/${id}`)
            .then((res) => {
                message.success('Token deleted successfully');
                fetchTokens();
            })
            .catch(err => {
                message.error('Failed to delete token');
            });
    };

    const columns = [
        {
            title: 'Token Number',
            dataIndex: 'tokenNumber',
            key: 'tokenNumber',
        },
        {
            title: 'Doctor Name',
            dataIndex: ['doctorId', 'name'],
            key: 'doctorName',
        },
        {
            title: 'Token Date',
            dataIndex: 'tokenDate',
            render: (text) => moment(text).format('DD/MM/YYYY'),
            key: 'date',
        },
        {
            title: 'Status',
            dataIndex: 'tokenStatus',
            key: 'status',
        },
        {
            title: 'Vitals',
            key: 'vitals',
            render: (_, record) => (
                <div>
                    {record.bloodPressure && <div>BP: {record.bloodPressure}</div>}
                    {record.pulseHeartRate && <div>Pulse: {record.pulseHeartRate}</div>}
                    {record.temperature && <div>Temp: {record.temperature}</div>}
                </div>
            ),
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <div className='flex items-center gap-2'>
                    <RiDeleteBin5Line 
                        color='red' 
                        size={20} 
                        onClick={() => handleDelete(record._id)} 
                        style={{ cursor: 'pointer' }}
                    />
                </div>
            ),
        },
    ];

    return (
        <>
            <div className="">
                <Breadcrumb pageName="Patient Tokens" />
                <div>
                    <p className='text-black mb-3 font-medium'>
                        <span className='text-primary'>
                            {patient?.mr}-{patient?.name}-{patient?.gender}
                        </span> - Tokens
                    </p>
                </div>
                <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default sm:px-7.5 xl:pb-1">
                    <div className="mb-5 flex justify-between items-center">
                        <h1 className="text-xl font-semibold text-black">Tokens</h1>
                    </div>

                    <Table
                        rowKey="_id"
                        rowSelection={rowSelection}
                        columns={columns}
                        dataSource={tokens}
                        loading={loading}
                        pagination={false}
                    />
                </div>
            </div>
        </>
    );
};

export default PatientTokens;