import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AddStockReturnModal from './AddStockReturnModal';
import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import axios from 'axios';
import { Base_url } from '../../../utils/Base_url';
import { message } from 'antd';

const getAuthHeaders = () => {
  const token = localStorage.getItem('userToken') || '';
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const StockReturnAddPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const [selectedStockReturn, setSelectedStockReturn] = useState(null);

  useEffect(() => {
    if (id) {
      fetchStockReturnDetails(id);
    }
  }, [id]);

  const fetchStockReturnDetails = async (returnId: string) => {
    try {
      const response = await axios.get(`${Base_url}/apis/pharmReturnStock/get/${returnId}`, {
        headers: getAuthHeaders(),
      });
      setSelectedStockReturn(response.data.data);
    } catch (error) {
      console.error('Error fetching stock return details:', error);
      message.error('Failed to fetch stock return details');
    }
  };

  const handleSetOpen = (open: boolean) => {
    if (!open) {
      navigate('/admin/pharmacy/stock_returns');
    }
  };

  const handleAfterSave = () => {
    navigate('/admin/pharmacy/stock_returns');
  };

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-6">
      <Breadcrumb pageName={id ? "Edit Stock Return" : "Add Stock Return"} />
      <AddStockReturnModal
        isModalOpen={true}
        setIsModalOpen={handleSetOpen}
        fetchStockReturns={handleAfterSave}
        selectedStockReturn={selectedStockReturn}
        renderAsPage={true}
      />
    </div>
  );
};

export default StockReturnAddPage;
