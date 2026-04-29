import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Descriptions,
  Input,
  Form,
  message,
  Row,
  Select,
  Spin,
  Space,
  Table,
  Tag,
} from 'antd';
import { ReloadOutlined, ArrowLeftOutlined, FilterOutlined, SearchOutlined } from '@ant-design/icons';
import axios from 'axios';
import { Base_url } from '../../../utils/Base_url';
import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import { useNavigate, useParams } from 'react-router-dom';

interface PurchaseOrder {
  _id: string;
  purchaseOrderNumber: string;
  supplierId: {
    _id: string;
    name: string;
    phone?: string;
  };
  orderDate: string;
  expectedDeliveryDate: string;
  status: string;
  totalAmount: number;
  poCategory: string;
  items: any[];
  createdBy: {
    _id: string;
    name: string;
  };

  projectDays?: number;
  zeroQuantity?: boolean;
  unit?: string;
  notes?: string;
}

const PurchaseOrderDetails: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [supplierLedgerSummary, setSupplierLedgerSummary] = useState<{
    totalOrders: number;
    totalAmount: number;
    averageOrderValue: number;
  } | null>(null);
  const [itemsFilterOpen, setItemsFilterOpen] = useState(false);
  const [itemsFiltersDraft, setItemsFiltersDraft] = useState<{
    search: string;
    manufacturer: string | null;
    b2bCategory: string | null;
  }>({ search: '', manufacturer: null, b2bCategory: null });
  const [itemsFiltersApplied, setItemsFiltersApplied] = useState<{
    search: string;
    manufacturer: string | null;
    b2bCategory: string | null;
  }>({ search: '', manufacturer: null, b2bCategory: null });

  const statusColorMap = useMemo(
    () => ({
      Draft: 'default',
      Pending: 'processing',
      Approved: 'success',
      Ordered: 'warning',
      Delivered: 'success',
      Cancelled: 'error',
    }),
    [],
  );

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      setOrder(null);
      setSupplierLedgerSummary(null);
      try {
        const res = await axios.get(`${Base_url}/apis/pharmPurchaseOrder/get/${id}`);
        const orderData: PurchaseOrder = res?.data?.data || null;

        if (!orderData) {
          message.error('Purchase order not found');
          return;
        }

        setOrder(orderData);

        const supplierId = (orderData.supplierId as any)?._id || (orderData.supplierId as any);
        if (supplierId) {
          const ledgerRes = await axios.get(`${Base_url}/apis/pharmSupplier/ledger/${supplierId}`);
          const entries = ledgerRes.data?.data?.entries || [];
          const purchases = entries.filter((e: any) => e.type === 'purchase');
          const totalOrders = purchases.length;
          const totalAmount = purchases.reduce((sum: number, e: any) => sum + (Number(e.debit) || 0), 0);
          const averageOrderValue = totalOrders ? totalAmount / totalOrders : 0;
          setSupplierLedgerSummary({ totalOrders, totalAmount, averageOrderValue });
        }
      } catch (error) {
        console.error('Error fetching purchase order details:', error);
        message.error('Failed to load purchase order details');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const getItemId = (item: any) => {
    const v = item?.pharmItemId;
    if (!v) return null;
    if (typeof v === 'string') return v;
    if (typeof v === 'object') return v?._id || v?.id || null;
    return null;
  };

  const getManufacturerName = (item: any) =>
    item?.manufacturerName ||
    item?.pharmItemId?.pharmManufacturerId?.name ||
    item?.pharmItemId?.manufacturerId?.name ||
    item?.pharmManufacturerId?.name ||
    '-';

  const getB2bCategory = (item: any) => item?.b2bCategory || '-';

  const handleItemClick = (item: any) => {
    const itemId = getItemId(item);
    if (!itemId) return;
    navigate(`/admin/items/pharmacy/details/${itemId}`);
  };

  const itemsData = Array.isArray(order?.items) ? order!.items : [];

  const manufacturers = useMemo(() => {
    const set = new Set<string>();
    itemsData.forEach((it: any) => {
      const m = getManufacturerName(it);
      if (m && m !== '-') set.add(String(m));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsData]);

  const b2bCategories = useMemo(() => {
    const set = new Set<string>();
    itemsData.forEach((it: any) => {
      const c = getB2bCategory(it);
      if (c && c !== '-') set.add(String(c));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsData]);

  const filteredItems = useMemo(() => {
    const q = (itemsFiltersApplied.search || '').trim().toLowerCase();
    return itemsData.filter((it: any) => {
      const manufacturer = getManufacturerName(it);
      const b2bCategory = getB2bCategory(it);
      const itemName = (it?.itemName || it?.pharmItemId?.name || '').toString();

      if (itemsFiltersApplied.manufacturer && manufacturer !== itemsFiltersApplied.manufacturer) return false;
      if (itemsFiltersApplied.b2bCategory && b2bCategory !== itemsFiltersApplied.b2bCategory) return false;

      if (!q) return true;
      const haystack = [itemName, manufacturer, b2bCategory].join(' ').toLowerCase();
      return haystack.includes(q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsData, itemsFiltersApplied]);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-black dark:text-white flex items-center gap-3">
          <span>Purchase Order {order?.purchaseOrderNumber || ''}</span>
          {order?.status && <Tag color={statusColorMap[order.status] || 'default'}>{order.status}</Tag>}
        </h2>
        <p className="text-sm text-gray-500">
          {order?.supplierId?.name ? `Supplier: ${order.supplierId.name}` : ''}
        </p>
      </div>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/pharmacy/purchase-orders')}>
          Back to Orders
        </Button>
      </div>

      

      <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-5 shadow-default dark:border-strokedark dark:bg-boxdark">
        {loading ? (
          <div className="flex items-center justify-center py-14">
            <Spin size="large" />
          </div>
        ) : !order ? (
          <div className="py-10 text-center text-gray-600">No data found.</div>
        ) : (
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-green-600 font-medium mb-1">Total Orders</p>
                    <p className="text-2xl font-bold text-green-700">
                      {supplierLedgerSummary?.totalOrders?.toLocaleString?.() || '0'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-blue-600 font-medium mb-1">Total Business</p>
                    <p className="text-2xl font-bold text-blue-700">
                      Rs. {Number(supplierLedgerSummary?.totalAmount || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-orange-600 font-medium mb-1">Average Order</p>
                    <p className="text-2xl font-bold text-orange-700">
                      Rs. {Number(supplierLedgerSummary?.averageOrderValue || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-green-600 font-medium mb-1">PO Total</p>
                    <p className="text-2xl font-bold text-green-700">
                      Rs. {Number(order.totalAmount || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-blue-600 font-medium mb-1">Items</p>
                    <p className="text-2xl font-bold text-blue-700">{itemsData.length.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card size="small" className="shadow-sm">
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-gray-800">Supplier</h3>
                </div>
                <Descriptions bordered column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}>
                  <Descriptions.Item label="Name">{order.supplierId?.name || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Phone">{order.supplierId?.phone || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Created By">{order.createdBy?.name || '-'}</Descriptions.Item>
                </Descriptions>
              </Card>

              <Card size="small" className="shadow-sm">
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-gray-800">Order Details</h3>
                </div>
                <Descriptions bordered column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}>
                  <Descriptions.Item label="Order Date">
                    {order.orderDate ? new Date(order.orderDate).toLocaleDateString() : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Expected Delivery">
                    {order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toLocaleDateString() : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Category">{order.poCategory || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Project Days">{order.projectDays ?? '-'}</Descriptions.Item>
                  <Descriptions.Item label="Zero Quantity">
                    {order.zeroQuantity ? 'Yes' : 'No'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Unit">{order.unit || '-'}</Descriptions.Item>
                  {order.notes ? <Descriptions.Item label="Notes">{order.notes}</Descriptions.Item> : null}
                </Descriptions>
              </Card>
            </div>

            <Card size="small" className="shadow-sm">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Items</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Showing {filteredItems.length} / {itemsData.length}
                  </p>
                </div>
                <Space>
                  <Button
                    icon={<FilterOutlined />}
                    type={itemsFilterOpen ? 'primary' : 'default'}
                    className={itemsFilterOpen ? 'bg-primary text-white' : ''}
                    onClick={() => setItemsFilterOpen((v) => !v)}
                  >
                    Filters
                  </Button>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() => {
                      const empty = { search: '', manufacturer: null, b2bCategory: null };
                      setItemsFiltersDraft(empty);
                      setItemsFiltersApplied(empty);
                    }}
                  >
                    Refresh
                  </Button>
                </Space>
              </div>

              {itemsFilterOpen && (
                <Card
                  size="small"
                  className="mb-4 bg-gray-50 border-gray-200"
                  bodyStyle={{ padding: 16 }}
                >
                  <Form layout="vertical">
                    <Row gutter={16}>
                      <Col xs={24} md={8}>
                        <Form.Item label="Search">
                          <Input
                            placeholder="Item / Manufacturer / B2B"
                            prefix={<SearchOutlined />}
                            value={itemsFiltersDraft.search}
                            onChange={(e) => setItemsFiltersDraft((p) => ({ ...p, search: e.target.value }))}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item label="Manufacturer">
                          <Select
                            allowClear
                            placeholder="All"
                            value={itemsFiltersDraft.manufacturer || undefined}
                            onChange={(val) => setItemsFiltersDraft((p) => ({ ...p, manufacturer: val || null }))}
                            options={manufacturers.map((m) => ({ label: m, value: m }))}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item label="B2B Category">
                          <Select
                            allowClear
                            placeholder="All"
                            value={itemsFiltersDraft.b2bCategory || undefined}
                            onChange={(val) => setItemsFiltersDraft((p) => ({ ...p, b2bCategory: val || null }))}
                            options={b2bCategories.map((c) => ({ label: c, value: c }))}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row justify="end">
                      <Button
                        type="primary"
                        className="bg-primary text-white"
                        onClick={() => setItemsFiltersApplied(itemsFiltersDraft)}
                      >
                        Apply Filters
                      </Button>
                    </Row>
                  </Form>
                </Card>
              )}

              <Table
                rowKey={(row: any, idx?: number) => getItemId(row) || row?.id || idx}
                size="small"
                pagination={{ pageSize: 10 }}
                dataSource={filteredItems}
                columns={[
                  {
                    title: 'Item',
                    key: 'item',
                    render: (_: any, item: any) => {
                      const itemId = getItemId(item);
                      const name = item?.itemName || item?.pharmItemId?.name || '-';
                      return itemId ? (
                        <button
                          type="button"
                          className="text-blue-600 hover:text-blue-800 font-medium"
                          onClick={() => handleItemClick(item)}
                        >
                          {name}
                        </button>
                      ) : (
                        <span>{name}</span>
                      );
                    },
                  },
                  {
                    title: 'Manufacturer',
                    key: 'manufacturer',
                    render: (_: any, item: any) => getManufacturerName(item),
                  },
                  {
                    title: 'B2B Category',
                    key: 'b2b',
                    render: (_: any, item: any) => getB2bCategory(item),
                  },
                  {
                    title: 'Conversion Unit',
                    key: 'conv',
                    render: (_: any, item: any) => item?.conversionUnit ?? 1,
                  },
                  {
                    title: 'Current Stock',
                    key: 'stock',
                    render: (_: any, item: any) => Number(item?.currentStock ?? 0),
                  },
                  {
                    title: 'Units Required',
                    key: 'req',
                    render: (_: any, item: any) => Number(item?.unitsRequired ?? 0),
                  },
                  {
                    title: 'Unit Cost',
                    key: 'uc',
                    render: (_: any, item: any) => `Rs. ${Number(item?.unitCost ?? 0).toFixed(2)}`,
                  },
                  {
                    title: 'Total Cost',
                    key: 'tc',
                    render: (_: any, item: any) => (
                      <span className="font-semibold text-green-700">
                        Rs. {Number(item?.totalCost ?? 0).toLocaleString()}
                      </span>
                    ),
                  },
                ]}
              />
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default PurchaseOrderDetails;

