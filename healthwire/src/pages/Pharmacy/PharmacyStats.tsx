import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Progress, Table, Tag, Button, Space } from 'antd';
import { 
  ArrowUpOutlined, 
  ArrowDownOutlined, 
  DollarOutlined, 
  ShoppingCartOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined,
  MedicineBoxOutlined,
  BarChartOutlined,
  RiseOutlined,
  AlertOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { Base_url } from '../../utils/Base_url';

interface PharmacyStats {
  totalItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalStockValue: number;
  totalSales: number;
  totalPurchaseOrders: number;
  pendingOrders: number;
  totalSuppliers: number;
  totalCategories: number;
}

interface LowStockItem {
  _id: string;
  name: string;
  availableQuantity: number;
  reOrderLevel: number;
  unitCost: number;
}

interface RecentSale {
  _id: string;
  totalAmount: number;
  createdAt: string;
  patientId?: { name: string };
}

const PharmacyStats: React.FC = () => {
  const [stats, setStats] = useState<PharmacyStats>({
    totalItems: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    totalStockValue: 0,
    totalSales: 0,
    totalPurchaseOrders: 0,
    pendingOrders: 0,
    totalSuppliers: 0,
    totalCategories: 0,
  });
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchLowStockItems();
    fetchRecentSales();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Fetch all pharmacy data
      const [itemsRes, suppliersRes, categoriesRes, posRes, purchaseOrdersRes] = await Promise.all([
        axios.get(`${Base_url}/apis/pharmItem/get?limit=1000`),
        axios.get(`${Base_url}/apis/pharmSupplier/get`),
        axios.get(`${Base_url}/apis/pharmCategory/get`),
        axios.get(`${Base_url}/apis/pharmPos/get`),
        axios.get(`${Base_url}/apis/pharmPurchaseOrder/get`)
      ]);

      const items = itemsRes.data.data || [];
      const suppliers = suppliersRes.data.data || [];
      const categories = categoriesRes.data.data || [];
      const sales = posRes.data.data || [];
      const purchaseOrders = purchaseOrdersRes.data.data || [];

      // Calculate statistics
      const totalItems = items.length;
      const lowStockItems = items.filter(item => item.availableQuantity <= item.reOrderLevel).length;
      const outOfStockItems = items.filter(item => item.availableQuantity === 0).length;
      const totalStockValue = items.reduce((sum, item) => sum + (item.availableQuantity * item.unitCost), 0);
      const totalSales = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
      const totalPurchaseOrders = purchaseOrders.length;
      const pendingOrders = purchaseOrders.filter(order => order.status === 'Pending').length;

      setStats({
        totalItems,
        lowStockItems,
        outOfStockItems,
        totalStockValue,
        totalSales,
        totalPurchaseOrders,
        pendingOrders,
        totalSuppliers: suppliers.length,
        totalCategories: categories.length,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLowStockItems = async () => {
    try {
      const response = await axios.get(`${Base_url}/apis/pharmItem/get?stock=low-stock&limit=10`);
      setLowStockItems(response.data.data || []);
    } catch (error) {
      console.error('Error fetching low stock items:', error);
    }
  };

  const fetchRecentSales = async () => {
    try {
      const response = await axios.get(`${Base_url}/apis/pharmPos/get?limit=10`);
      setRecentSales(response.data.data || []);
    } catch (error) {
      console.error('Error fetching recent sales:', error);
    }
  };

  const lowStockColumns = [
    {
      title: 'Item Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => (
        <span className="font-medium text-gray-800">{text}</span>
      ),
    },
    {
      title: 'Current Stock',
      dataIndex: 'availableQuantity',
      key: 'availableQuantity',
      render: (quantity: number) => (
        <Tag color={quantity === 0 ? 'red' : quantity <= 10 ? 'orange' : 'green'}>
          {quantity}
        </Tag>
      ),
    },
    {
      title: 'Reorder Level',
      dataIndex: 'reOrderLevel',
      key: 'reOrderLevel',
    },
    {
      title: 'Unit Cost',
      dataIndex: 'unitCost',
      key: 'unitCost',
      render: (cost: number) => (
        <span className="font-semibold text-green-600">
          Rs. {cost.toLocaleString()}
        </span>
      ),
    },
  ];

  const salesColumns = [
    {
      title: 'Sale ID',
      dataIndex: '_id',
      key: '_id',
      render: (id: string) => (
        <span className="font-mono text-blue-600">#{id.slice(-6)}</span>
      ),
    },
    {
      title: 'Patient',
      dataIndex: ['patientId', 'name'],
      key: 'patient',
      render: (name: string) => name || 'Walk-in Customer',
    },
    {
      title: 'Amount',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount: number) => (
        <span className="font-semibold text-green-600">
          Rs. {amount.toLocaleString()}
        </span>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ];

  const stockHealthPercentage = stats.totalItems > 0 ? 
    ((stats.totalItems - stats.outOfStockItems) / stats.totalItems) * 100 : 100;

  return (
    <div className="space-y-6">
      {/* Main Stats Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <Statistic
              title="Total Items"
              value={stats.totalItems}
              prefix={<MedicineBoxOutlined className="text-blue-500" />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <Statistic
              title="Stock Value"
              value={stats.totalStockValue}
              prefix={<DollarOutlined className="text-green-500" />}
              precision={2}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <Statistic
              title="Total Sales"
              value={stats.totalSales}
              prefix={<RiseOutlined className="text-purple-500" />}
              precision={2}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <Statistic
              title="Purchase Orders"
              value={stats.totalPurchaseOrders}
              prefix={<ShoppingCartOutlined className="text-orange-500" />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Alert Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={8}>
          <Card className="border-orange-200 bg-orange-50">
            <Statistic
              title="Low Stock Items"
              value={stats.lowStockItems}
              prefix={<AlertOutlined className="text-orange-500" />}
              valueStyle={{ color: '#fa8c16' }}
            />
            <div className="mt-2">
              <Button type="link" size="small" className="p-0">
                View Details →
              </Button>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card className="border-red-200 bg-red-50">
            <Statistic
              title="Out of Stock"
              value={stats.outOfStockItems}
              prefix={<AlertOutlined className="text-red-500" />}
              valueStyle={{ color: '#ff4d4f' }}
            />
            <div className="mt-2">
              <Button type="link" size="small" className="p-0">
                Reorder Now →
              </Button>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card className="border-blue-200 bg-blue-50">
            <Statistic
              title="Pending Orders"
              value={stats.pendingOrders}
              prefix={<ClockCircleOutlined className="text-blue-500" />}
              valueStyle={{ color: '#1890ff' }}
            />
            <div className="mt-2">
              <Button type="link" size="small" className="p-0">
                Review Orders →
              </Button>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Progress Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Stock Health" className="h-full">
            <div className="text-center">
              <Progress
                type="circle"
                percent={Math.round(stockHealthPercentage)}
                format={(percent) => `${percent}%`}
                strokeColor={{
                  '0%': '#ff4d4f',
                  '50%': '#fa8c16',
                  '100%': '#52c41a',
                }}
                size={120}
              />
              <div className="mt-4">
                <p className="text-gray-600">
                  {stats.totalItems - stats.outOfStockItems} of {stats.totalItems} items in stock
                </p>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Quick Actions" className="h-full">
            <Space direction="vertical" className="w-full">
              <Button type="primary" block icon={<ShoppingCartOutlined />}>
                Create Purchase Order
              </Button>
              <Button block icon={<MedicineBoxOutlined />}>
                Add New Item
              </Button>
              <Button block icon={<BarChartOutlined />}>
                View Reports
              </Button>
              <Button block icon={<CheckCircleOutlined />}>
                Process Returns
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Tables */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Low Stock Alert" className="h-full">
            <Table
              columns={lowStockColumns}
              dataSource={lowStockItems}
              rowKey="_id"
              pagination={false}
              loading={loading}
              size="small"
              scroll={{ y: 300 }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Recent Sales" className="h-full">
            <Table
              columns={salesColumns}
              dataSource={recentSales}
              rowKey="_id"
              pagination={false}
              loading={loading}
              size="small"
              scroll={{ y: 300 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Summary Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.totalSuppliers}</div>
            <div className="text-gray-600">Active Suppliers</div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.totalCategories}</div>
            <div className="text-gray-600">Item Categories</div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {stats.totalItems > 0 ? Math.round((stats.totalSales / stats.totalItems) * 100) : 0}
            </div>
            <div className="text-gray-600">Avg. Sale per Item</div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default PharmacyStats;
