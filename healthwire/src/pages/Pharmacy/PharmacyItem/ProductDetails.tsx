import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Tabs, Table, Descriptions, Tag, Spin, message, Row, Col, Statistic, DatePicker, Button, Space, Input, Form, Select, Divider } from 'antd';
import { ArrowLeftOutlined, ShoppingCartOutlined, ShopOutlined, MedicineBoxOutlined, ReloadOutlined, SearchOutlined, FilterOutlined } from '@ant-design/icons';
import axios from 'axios';
import { Base_url } from '../../../utils/Base_url';
import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import dayjs from 'dayjs';

import { AsyncPaginate } from 'react-select-async-paginate';

const { RangePicker } = DatePicker;
const { Search } = Input;
const { Option } = Select;

interface PharmacyItem {
  _id: string;
  name: string;
  pharmRackId?: { _id: string; name: string } | string | null;
  barcode: string;
  alternateBarcodes?: string[];
  pharmManufacturerId?: { _id: string; name: string } | string | null;
  pharmSupplierId?: { _id: string; name: string } | string | null;
  pharmCategoryId?: { _id: string; name: string } | string | null;
  unit: string;
  conversionUnit: number;
  reOrderLevel: number;
  retailPrice: number;
  openingStock: number;
  drugInteraction: string[];
  genericName: string;
  unitCost: number;
  pieceCost?: number;
  availableQuantity: number;
  expiredQuantity?: number;
  narcotic: boolean;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const ProductDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [item, setItem] = useState<PharmacyItem | null>(null);
  
  // Sales Tab State
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [salesPagination, setSalesPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [salesFilters, setSalesFilters] = useState({
    search: '',
    dateRange: [] as any[],
    patient: null as any,
    minAmount: '',
    maxAmount: ''
  });
  
  // Purchase Tab State
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseData, setPurchaseData] = useState<any[]>([]);
  const [purchasePagination, setPurchasePagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [purchaseFilters, setPurchaseFilters] = useState({
    search: '',
    dateRange: [] as any[],
    supplier: null as any,
    minAmount: '',
    maxAmount: ''
  });

  const [flowSummary, setFlowSummary] = useState<any | null>(null);
  const [showSalesFilters, setShowSalesFilters] = useState(false);
  const [showPurchaseFilters, setShowPurchaseFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('1');

  useEffect(() => {
    if (id) {
      fetchItemDetails();
      fetchFlowSummary();
      fetchSalesHistory(1);
      fetchPurchaseHistory(1);
    }
  }, [id]);

  const fetchItemDetails = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${Base_url}/apis/pharmItem/get/${id}`);
      if (res.data && res.data.data) {
        setItem(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching item details:', error);
      message.error('Failed to load product details');
    } finally {
      setLoading(false);
    }
  };

  const fetchFlowSummary = async () => {
    try {
      const res = await axios.get(`${Base_url}/apis/pharmItem/flow-summary`, { params: { itemId: id } });
      if (res.data && res.data.data && res.data.data[id as string]) {
        setFlowSummary(res.data.data[id as string]);
      }
    } catch (error) {
      console.error('Error fetching flow summary:', error);
    }
  };

  const fetchSalesHistory = async (page: number = 1) => {
    try {
      setSalesLoading(true);
      const params: any = {
        page,
        limit: salesPagination.pageSize,
        search: salesFilters.search,
        patient: salesFilters.patient?.value || '',
        minAmount: salesFilters.minAmount,
        maxAmount: salesFilters.maxAmount
      };

      if (salesFilters.dateRange && salesFilters.dateRange.length === 2) {
        params.startDate = salesFilters.dateRange[0].format('YYYY-MM-DD');
        params.endDate = salesFilters.dateRange[1].format('YYYY-MM-DD');
      }

      const res = await axios.get(`${Base_url}/apis/pharmPos/get-by-item/${id}`, {
        params
      });
      if (res.data && res.data.data) {
        setSalesData(res.data.data);
        setSalesPagination({
          ...salesPagination,
          current: page,
          total: res.data.total || 0
        });
      }
    } catch (error) {
      console.error('Error fetching sales history:', error);
    } finally {
      setSalesLoading(false);
    }
  };

  const fetchPurchaseHistory = async (page: number = 1) => {
    try {
      setPurchaseLoading(true);
      const params: any = {
        page,
        limit: purchasePagination.pageSize,
        search: purchaseFilters.search,
        supplier: purchaseFilters.supplier?.value || '',
        minAmount: purchaseFilters.minAmount,
        maxAmount: purchaseFilters.maxAmount
      };

      if (purchaseFilters.dateRange && purchaseFilters.dateRange.length === 2) {
        params.startDate = purchaseFilters.dateRange[0].format('YYYY-MM-DD');
        params.endDate = purchaseFilters.dateRange[1].format('YYYY-MM-DD');
      }

      const res = await axios.get(`${Base_url}/apis/pharmAddStock/get-by-item/${id}`, {
        params
      });
      if (res.data && res.data.data) {
        setPurchaseData(res.data.data);
        setPurchasePagination({
          ...purchasePagination,
          current: page,
          total: res.data.total || 0
        });
      }
    } catch (error) {
      console.error('Error fetching purchase history:', error);
    } finally {
      setPurchaseLoading(false);
    }
  };

  const salesColumns = [
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => dayjs(text).format('DD/MM/YYYY HH:mm'),
      sorter: (a: any, b: any) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
    },
    {
      title: 'Invoice #',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: 'Patient',
      key: 'patient',
      render: (_: any, record: any) => (
        <div className="flex flex-col">
           <span className="font-medium">{record.patientName || record.patientId?.name || 'Walk-in'}</span>
           {record.patientId?.mr && <span className="text-xs text-gray-500">MR: {record.patientId.mr}</span>}
        </div>
      ),
    },
    {
      title: 'Qty',
      key: 'quantity',
      render: (_: any, record: any) => {
        const itemDetail = record.allItem?.find((i: any) => i.pharmItemId === id);
        return <span>{itemDetail?.quantity || 0}</span>;
      },
      sorter: (a: any, b: any) => {
        const qtyA = a.allItem?.find((i: any) => i.pharmItemId === id)?.quantity || 0;
        const qtyB = b.allItem?.find((i: any) => i.pharmItemId === id)?.quantity || 0;
        return qtyA - qtyB;
      }
    },
    {
      title: 'Unit Price',
      key: 'price',
      render: (_: any, record: any) => {
        const itemDetail = record.allItem?.find((i: any) => i.pharmItemId === id);
        return <span>Rs. {itemDetail?.rate?.toFixed(2) || '0.00'}</span>;
      },
    },
    {
      title: 'Total',
      key: 'total',
      render: (_: any, record: any) => {
        const itemDetail = record.allItem?.find((i: any) => i.pharmItemId === id);
        return <span className="font-semibold text-green-600">Rs. {itemDetail?.totalAmount?.toFixed(2) || '0.00'}</span>;
      },
    }
  ];

  const purchaseColumns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (text: string) => dayjs(text).format('DD/MM/YYYY'),
      sorter: (a: any, b: any) => dayjs(a.date).unix() - dayjs(b.date).unix(),
    },
    {
      title: 'Doc #',
      dataIndex: 'documentNumber',
      key: 'documentNumber',
      render: (text: string) => <Tag color="orange">{text || 'N/A'}</Tag>,
    },
    {
      title: 'Supplier',
      dataIndex: 'supplierId',
      key: 'supplier',
      render: (supplier: any) => supplier?.name || '-',
    },
    {
      title: 'Qty',
      key: 'quantity',
      render: (_: any, record: any) => {
        const itemDetail = record.items?.find((i: any) => i.pharmItemId?._id === id || i.pharmItemId === id);
        return <span>{itemDetail?.quantity || 0}</span>;
      },
      sorter: (a: any, b: any) => {
        const qtyA = a.items?.find((i: any) => i.pharmItemId?._id === id || i.pharmItemId === id)?.quantity || 0;
        const qtyB = b.items?.find((i: any) => i.pharmItemId?._id === id || i.pharmItemId === id)?.quantity || 0;
        return qtyA - qtyB;
      }
    },
    {
      title: 'Unit Cost',
      key: 'unitCost',
      render: (_: any, record: any) => {
        const itemDetail = record.items?.find((i: any) => i.pharmItemId?._id === id || i.pharmItemId === id);
        return <span>Rs. {itemDetail?.unitCost?.toFixed(2) || '0.00'}</span>;
      },
    },
    {
      title: 'Total Cost',
      key: 'totalCost',
      render: (_: any, record: any) => {
        const itemDetail = record.items?.find((i: any) => i.pharmItemId?._id === id || i.pharmItemId === id);
        return <span className="font-semibold text-red-600">Rs. {itemDetail?.totalCost?.toFixed(2) || '0.00'}</span>;
      },
    },
    {
      title: 'Expiry',
      key: 'expiry',
      render: (_: any, record: any) => {
        const itemDetail = record.items?.find((i: any) => i.pharmItemId?._id === id || i.pharmItemId === id);
        return itemDetail?.expiryDate ? dayjs(itemDetail.expiryDate).format('DD/MM/YYYY') : '-';
      },
    }
  ];

  const loadPatientOptions = async (search: string, loadedOptions: any, { page }: any) => {
    try {
      const response = await axios.get(`${Base_url}/apis/patient/get`, {
        params: { search, page, limit: 10 }
      });
      return {
        options: response.data.data.map((p: any) => ({
          value: p._id,
          label: `${p.name} (${p.mr})`
        })),
        hasMore: response.data.totalPages > page,
        additional: { page: page + 1 },
      };
    } catch (error) {
      return { options: [], hasMore: false };
    }
  };

  const loadSupplierOptions = async (search: string, loadedOptions: any, { page }: any) => {
    try {
      const response = await axios.get(`${Base_url}/apis/pharmSupplier/get`, {
        params: { search, page, limit: 10 }
      });
      return {
        options: response.data.data.map((s: any) => ({
          value: s._id,
          label: s.name
        })),
        hasMore: response.data.totalPages > page,
        additional: { page: page + 1 },
      };
    } catch (error) {
      console.error('Error loading suppliers:', error);
      return { options: [], hasMore: false };
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spin size="large" tip="Loading product details..." />
      </div>
    );
  }

  const items = [
    {
      key: '1',
      label: (
        <span className="flex items-center gap-2">
          <MedicineBoxOutlined />
          Product Info
        </span>
      ),
      children: (
        <Card className="shadow-sm">
          <Descriptions title="Product Information" bordered column={{ xxl: 3, xl: 3, lg: 3, md: 2, sm: 1, xs: 1 }}>
            <Descriptions.Item label="Name">{item?.name}</Descriptions.Item>
            <Descriptions.Item label="Generic Name">{item?.genericName || '-'}</Descriptions.Item>
            <Descriptions.Item label="Barcode">{item?.barcode}</Descriptions.Item>
            <Descriptions.Item label="Manufacturer">
              {typeof item?.pharmManufacturerId === 'object' ? item?.pharmManufacturerId?.name : item?.pharmManufacturerId || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Supplier">
              {typeof item?.pharmSupplierId === 'object' ? item?.pharmSupplierId?.name : item?.pharmSupplierId || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Category">
              {typeof item?.pharmCategoryId === 'object' ? item?.pharmCategoryId?.name : item?.pharmCategoryId || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Rack">
              {typeof item?.pharmRackId === 'object' ? item?.pharmRackId?.name : item?.pharmRackId || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Unit">{item?.unit}</Descriptions.Item>
            <Descriptions.Item label="Conversion Unit">{item?.conversionUnit}</Descriptions.Item>
            <Descriptions.Item label="Unit Cost">Rs. {item?.unitCost?.toFixed(2)}</Descriptions.Item>
            <Descriptions.Item label="Retail Price">Rs. {item?.retailPrice?.toFixed(2)}</Descriptions.Item>
            <Descriptions.Item label="Piece Cost">Rs. {item?.pieceCost?.toFixed(2) || '-'}</Descriptions.Item>
            <Descriptions.Item label="Available Quantity">
              <Tag color={item?.availableQuantity && item.availableQuantity > 0 ? 'green' : 'red'}>
                {item?.availableQuantity}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Re-Order Level">{item?.reOrderLevel}</Descriptions.Item>
            <Descriptions.Item label="Expired Quantity">{item?.expiredQuantity || 0}</Descriptions.Item>
            <Descriptions.Item label="Narcotic">
              <Tag color={item?.narcotic ? 'red' : 'green'}>{item?.narcotic ? 'Yes' : 'No'}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Active">
              <Tag color={item?.active ? 'green' : 'red'}>{item?.active ? 'Yes' : 'No'}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Drug Interactions">
              {item?.drugInteraction?.length ? item.drugInteraction.join(', ') : 'None'}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      ),
    },
    {
      key: '2',
      label: (
        <span className="flex items-center gap-2">
          <ShoppingCartOutlined />
          Sales Details
        </span>
      ),
      children: (
        <Card className="shadow-sm">
          {/* Sales Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {(() => {
              const conv = Number((item as any)?.conversionUnit) || 1;
              const transactions = salesData.length;
              // Note: salesData from API is paginated, so these totals are only for the current page. 
              // Ideally, the backend should provide summary stats. For now, we calculate based on loaded data 
              // or we might need another API call for "Sales Stats" if we want total across all pages.
              // However, the user asked for "100% same UI", so we'll structure it like the modal.
              // In the modal, it calculated from `salesDetails` which was limited to 50 items.
              // Here we should probably show stats based on the *current view* or fetch stats separately.
              // Given the previous implementation, let's use the data we have, but be aware of pagination limits.
              
              const qtyPack = salesData.filter(r => String(r.allItem?.find((i:any) => i.pharmItemId === id)?.unit).toLowerCase() === 'pack').reduce((s, r) => s + (Number(r.allItem?.find((i:any) => i.pharmItemId === id)?.quantity) || 0), 0);
              const qtyUnits = salesData.filter(r => String(r.allItem?.find((i:any) => i.pharmItemId === id)?.unit).toLowerCase() !== 'pack').reduce((s, r) => s + (Number(r.allItem?.find((i:any) => i.pharmItemId === id)?.quantity) || 0), 0);
              const units = qtyPack * conv + qtyUnits;
              const returns = salesData.filter(r => r.allItem?.find((i:any) => i.pharmItemId === id)?.isReturn).length;
              const netAmount = salesData.reduce((s, r) => {
                 const detail = r.allItem?.find((i:any) => i.pharmItemId === id);
                 return s + (Number(detail?.totalAmount) || 0) * (detail?.isReturn ? -1 : 1);
              }, 0);

              return (
                <>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-green-600 font-medium mb-1">Sales Transactions</p>
                        <p className="text-2xl font-bold text-green-700">{salesPagination.total}</p>
                      </div>
                      <div className="bg-green-200 p-3 rounded-full">
                        <ShoppingCartOutlined className="text-green-700 text-lg" />
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-blue-600 font-medium mb-1">Sold Units (Page)</p>
                        <p className="text-2xl font-bold text-blue-700">{units.toLocaleString()}</p>
                        <p className="text-xs text-blue-600 mt-1">Packs: {qtyPack} | Loose: {qtyUnits}</p>
                      </div>
                      <div className="bg-blue-200 p-3 rounded-full">
                        <MedicineBoxOutlined className="text-blue-700 text-lg" />
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4 border border-indigo-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-indigo-600 font-medium mb-1">Sales Amount (Page)</p>
                        <p className="text-2xl font-bold text-indigo-700">Rs. {netAmount.toLocaleString()}</p>
                      </div>
                      <div className="bg-indigo-200 p-3 rounded-full">
                        <ShopOutlined className="text-indigo-700 text-lg" />
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-red-600 font-medium mb-1">Returns (Page)</p>
                        <p className="text-2xl font-bold text-red-700">{returns}</p>
                      </div>
                      <div className="bg-red-200 p-3 rounded-full">
                        <ReloadOutlined className="text-red-700 text-lg" />
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>

          <div className="mb-4">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-lg font-semibold">Sales History</h3>
               <Space>
                 <Button 
                   icon={<FilterOutlined />} 
                   type={showSalesFilters ? 'primary' : 'default'}
                   className={showSalesFilters ? 'bg-primary text-white' : ''}
                   onClick={() => setShowSalesFilters(!showSalesFilters)}
                 >
                   Filters
                 </Button>
                 <Button icon={<ReloadOutlined />} onClick={() => {
                   setSalesFilters({ search: '', dateRange: [], doctor: '', patient: '' });
                   setTimeout(() => fetchSalesHistory(1), 0);
                 }}>Refresh</Button>
               </Space>
             </div>

             {showSalesFilters && (
               <Card size="small" className="mb-4 bg-gray-50 border-gray-200">
                 <Form layout="vertical">
                   <Row gutter={16}>
                     <Col xs={24} md={6}>
                       <Form.Item label="Date Range">
                         <RangePicker 
                           style={{ width: '100%' }}
                           value={salesFilters.dateRange as any}
                           onChange={(dates) => setSalesFilters({ ...salesFilters, dateRange: dates || [] })}
                         />
                       </Form.Item>
                     </Col>
                     <Col xs={24} md={6}>
                       <Form.Item label="Search">
                         <Input 
                           placeholder="Invoice #" 
                           prefix={<SearchOutlined />}
                           value={salesFilters.search}
                           onChange={(e) => setSalesFilters({ ...salesFilters, search: e.target.value })}
                         />
                       </Form.Item>
                     </Col>
                     <Col xs={24} md={6}>
                       <Form.Item label="Patient Name">
                         <AsyncPaginate
                           value={salesFilters.patient}
                           loadOptions={loadPatientOptions as any}
                           onChange={(value) => setSalesFilters({ ...salesFilters, patient: value })}
                           additional={{ page: 1 }}
                           placeholder="Search Patient (Name/MR)"
                           debounceTimeout={400}
                           isClearable
                         />
                       </Form.Item>
                     </Col>
                     <Col xs={24} md={6}>
                       <Form.Item label="Amount Range">
                         <div className="flex gap-2">
                           <Input 
                             placeholder="Min" 
                             type="number"
                             value={salesFilters.minAmount}
                             onChange={(e) => setSalesFilters({ ...salesFilters, minAmount: e.target.value })}
                           />
                           <span className="self-center">-</span>
                           <Input 
                             placeholder="Max" 
                             type="number"
                             value={salesFilters.maxAmount}
                             onChange={(e) => setSalesFilters({ ...salesFilters, maxAmount: e.target.value })}
                           />
                         </div>
                       </Form.Item>
                     </Col>
                   </Row>
                   <Row justify="end">
                     <Button type="primary" className="bg-primary text-white" onClick={() => fetchSalesHistory(1)}>Apply Filters</Button>
                   </Row>
                 </Form>
               </Card>
             )}
          </div>
          <Table 
            columns={salesColumns} 
            dataSource={salesData} 
            rowKey="_id" 
            loading={salesLoading}
            pagination={{
              ...salesPagination,
              onChange: (page) => fetchSalesHistory(page)
            }}
          />
        </Card>
      ),
    },
    {
      key: '3',
      label: (
        <span className="flex items-center gap-2">
          <ShopOutlined />
          Purchase Details
        </span>
      ),
      children: (
        <Card className="shadow-sm">
          {/* Purchase Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {(() => {
              const conv = Number((item as any)?.conversionUnit) || 1;
              const docs = purchaseData.length;
              
              const qtyPack = purchaseData.reduce((s, r) => s + (Number(r.items?.find((i:any) => i.pharmItemId === id || i.pharmItemId?._id === id)?.quantity) || 0), 0);
              const loose = purchaseData.reduce((s, r) => s + (Number(r.items?.find((i:any) => i.pharmItemId === id || i.pharmItemId?._id === id)?.looseUnitQty) || 0), 0);
              const units = qtyPack * conv + loose;
              const totalCost = purchaseData.reduce((s, r) => s + (Number(r.items?.find((i:any) => i.pharmItemId === id || i.pharmItemId?._id === id)?.totalCost) || 0), 0);
              return (
                <>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-green-600 font-medium mb-1">Purchase Documents</p>
                        <p className="text-2xl font-bold text-green-700">{purchasePagination.total}</p>
                      </div>
                      <div className="bg-green-200 p-3 rounded-full">
                        <ShoppingCartOutlined className="text-green-700 text-lg" />
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-blue-600 font-medium mb-1">Purchased Units (Page)</p>
                        <p className="text-2xl font-bold text-blue-700">{units.toLocaleString()}</p>
                        <p className="text-xs text-blue-600 mt-1">Packs: {qtyPack} | Loose: {loose}</p>
                      </div>
                      <div className="bg-blue-200 p-3 rounded-full">
                        <MedicineBoxOutlined className="text-blue-700 text-lg" />
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4 border border-indigo-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-indigo-600 font-medium mb-1">Total Cost (Page)</p>
                        <p className="text-2xl font-bold text-indigo-700">Rs. {totalCost.toLocaleString()}</p>
                      </div>
                      <div className="bg-indigo-200 p-3 rounded-full">
                        <ShopOutlined className="text-indigo-700 text-lg" />
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-orange-600 font-medium mb-1">Current Stock</p>
                        <p className="text-2xl font-bold text-orange-700">{item?.availableQuantity?.toLocaleString() ?? '0'}</p>
                      </div>
                      <div className="bg-orange-200 p-3 rounded-full">
                        <ReloadOutlined className="text-orange-700 text-lg" />
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>

          <div className="mb-4">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-lg font-semibold">Purchase/Inbound History</h3>
               <Space>
                 <Button 
                   icon={<FilterOutlined />} 
                   type={showPurchaseFilters ? 'primary' : 'default'}
                   className={showPurchaseFilters ? 'bg-primary text-white' : ''}
                   onClick={() => setShowPurchaseFilters(!showPurchaseFilters)}
                 >
                   Filters
                 </Button>
                 <Button icon={<ReloadOutlined />} onClick={() => {
                   setPurchaseFilters({ search: '', dateRange: [], supplier: '' });
                   setTimeout(() => fetchPurchaseHistory(1), 0);
                 }}>Refresh</Button>
               </Space>
             </div>

             {showPurchaseFilters && (
               <Card size="small" className="mb-4 bg-gray-50 border-gray-200">
                 <Form layout="vertical">
                   <Row gutter={16}>
                     <Col xs={24} md={6}>
                       <Form.Item label="Date Range">
                         <RangePicker 
                           style={{ width: '100%' }}
                           value={purchaseFilters.dateRange as any}
                           onChange={(dates) => setPurchaseFilters({ ...purchaseFilters, dateRange: dates || [] })}
                         />
                       </Form.Item>
                     </Col>
                     <Col xs={24} md={6}>
                       <Form.Item label="Search">
                         <Input 
                           placeholder="Doc # / Invoice #" 
                           prefix={<SearchOutlined />}
                           value={purchaseFilters.search}
                           onChange={(e) => setPurchaseFilters({ ...purchaseFilters, search: e.target.value })}
                         />
                       </Form.Item>
                     </Col>
                     <Col xs={24} md={6}>
                       <Form.Item label="Supplier Name">
                         <AsyncPaginate
                           value={purchaseFilters.supplier}
                           loadOptions={loadSupplierOptions as any}
                           onChange={(value) => setPurchaseFilters({ ...purchaseFilters, supplier: value })}
                           additional={{ page: 1 }}
                           placeholder="Search Supplier"
                           debounceTimeout={400}
                           isClearable
                         />
                       </Form.Item>
                     </Col>
                     <Col xs={24} md={6}>
                       <Form.Item label="Amount Range">
                         <div className="flex gap-2">
                           <Input 
                             placeholder="Min" 
                             type="number"
                             value={purchaseFilters.minAmount}
                             onChange={(e) => setPurchaseFilters({ ...purchaseFilters, minAmount: e.target.value })}
                           />
                           <span className="self-center">-</span>
                           <Input 
                             placeholder="Max" 
                             type="number"
                             value={purchaseFilters.maxAmount}
                             onChange={(e) => setPurchaseFilters({ ...purchaseFilters, maxAmount: e.target.value })}
                           />
                         </div>
                       </Form.Item>
                     </Col>
                   </Row>
                   <Row justify="end">
                     <Button type="primary" className="bg-primary text-white" onClick={() => fetchPurchaseHistory(1)}>Apply Filters</Button>
                   </Row>
                 </Form>
               </Card>
             )}
          </div>
          <Table 
            columns={purchaseColumns} 
            dataSource={purchaseData} 
            rowKey="_id" 
            loading={purchaseLoading}
            pagination={{
              ...purchasePagination,
              onChange: (page) => fetchPurchaseHistory(page)
            }}
          />
        </Card>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Breadcrumb pageName="Product Details" />
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate('/pharmacy/items')}
        >
          Back to List
        </Button>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-black dark:text-white flex items-center gap-2">
          {item?.name}
          {item?.active ? <Tag color="green">Active</Tag> : <Tag color="red">Inactive</Tag>}
        </h2>
        <p className="text-sm text-gray-500">{item?.genericName}</p>
      </div>

      {/* Top Cards: Stock & Pricing + Flow Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Basic Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-blue-50 dark:bg-boxdark rounded-lg p-4 border border-blue-100 flex flex-col justify-center">
            <p className="text-xs text-blue-600 font-medium mb-1">Available Stock</p>
            <p className="text-2xl font-bold text-blue-600">{item?.availableQuantity}</p>
          </div>
          <div className="bg-green-50 dark:bg-boxdark rounded-lg p-4 border border-green-100 flex flex-col justify-center">
            <p className="text-xs text-green-600 font-medium mb-1">Retail Price</p>
            <p className="text-2xl font-bold text-green-600">Rs. {item?.retailPrice?.toFixed(2)}</p>
          </div>
          <div className="bg-orange-50 dark:bg-boxdark rounded-lg p-4 border border-orange-100 flex flex-col justify-center">
            <p className="text-xs text-orange-600 font-medium mb-1">Unit Cost</p>
            <p className="text-2xl font-bold text-orange-600">Rs. {item?.unitCost?.toFixed(2)}</p>
          </div>
        </div>

        {/* Flow Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600 font-medium mb-1">Purchased</p>
                <p className="text-xl font-bold text-blue-700">{(flowSummary?.purchasedUnits ?? 0).toLocaleString()}</p>
              </div>
              <div className="bg-blue-200 p-2 rounded-full">
                <ShoppingCartOutlined className="text-blue-700 text-lg" />
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-600 font-medium mb-1">Net Sold</p>
                <p className="text-xl font-bold text-green-700">{(flowSummary?.netSoldUnits ?? 0).toLocaleString()}</p>
              </div>
              <div className="bg-green-200 p-2 rounded-full">
                <ShopOutlined className="text-green-700 text-lg" />
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-600 font-medium mb-1">Returned</p>
                <p className="text-xl font-bold text-red-700">{(flowSummary?.returnedUnits ?? 0).toLocaleString()}</p>
              </div>
              <div className="bg-red-200 p-2 rounded-full">
                <ReloadOutlined className="text-red-700 text-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-boxdark p-4 rounded-lg shadow-sm">
        <div className="flex flex-wrap gap-2 mb-4 border-b border-gray-200 pb-2">
          {items.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-meta-4 dark:text-white dark:hover:bg-opacity-90'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        <div>
          {items.find((item) => item.key === activeTab)?.children}
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;