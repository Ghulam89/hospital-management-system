import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Progress, Table, Tag } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, DollarOutlined, ShoppingCartOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import axios from 'axios';
import { Base_url } from '../../../utils/Base_url';

interface PurchaseOrderStats {
  totalOrders: number;
  pendingOrders: number;
  approvedOrders: number;
  deliveredOrders: number;
  totalAmount: number;
}

interface RecentOrder {
  _id: string;
  purchaseOrderNumber: string;
  supplierId: { name: string };
  status: string;
  totalAmount: number;
  orderDate: string;
}

const PurchaseOrderStats: React.FC = () => {
  const [stats, setStats] = useState<PurchaseOrderStats>({
    totalOrders: 0,
    pendingOrders: 0,
    approvedOrders: 0,
    deliveredOrders: 0,
    totalAmount: 0,
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchRecentOrders();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${Base_url}/apis/pharmPurchaseOrder/stats`);
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentOrders = async () => {
    try {
      const response = await axios.get(`${Base_url}/apis/pharmPurchaseOrder/get?limit=10`);
      setRecentOrders(response.data.data || []);
    } catch (error) {
      console.error('Error fetching recent orders:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colorMap: { [key: string]: string } = {
      'Draft': 'default',
      'Pending': 'processing',
      'Approved': 'success',
      'Ordered': 'warning',
      'Delivered': 'success',
      'Cancelled': 'error',
    };
    return colorMap[status] || 'default';
  };

  const columns = [
    {
      title: 'PO Number',
      dataIndex: 'purchaseOrderNumber',
      key: 'purchaseOrderNumber',
      render: (text: string) => (
        <span className="font-semibold text-blue-600">{text}</span>
      ),
    },
    {
      title: 'Supplier',
      dataIndex: ['supplierId', 'name'],
      key: 'supplier',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{status}</Tag>
      ),
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
      title: 'Order Date',
      dataIndex: 'orderDate',
      key: 'orderDate',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ];

  const completionRate = stats.totalOrders > 0 ? (stats.deliveredOrders / stats.totalOrders) * 100 : 0;

  return (
    <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
      <h4 className="text-xl font-semibold text-black dark:text-white mb-6">
        Purchase Order Statistics
      </h4>

      {/* Stats Cards */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Orders"
              value={stats.totalOrders}
              prefix={<ShoppingCartOutlined className="text-blue-500" />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Pending Orders"
              value={stats.pendingOrders}
              prefix={<ClockCircleOutlined className="text-orange-500" />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Approved Orders"
              value={stats.approvedOrders}
              prefix={<CheckCircleOutlined className="text-green-500" />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Amount"
              value={stats.totalAmount}
              prefix={<DollarOutlined className="text-green-500" />}
              precision={2}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Progress Cards */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} lg={12}>
          <Card title="Order Completion Rate">
            <Progress
              type="circle"
              percent={Math.round(completionRate)}
              format={(percent) => `${percent}%`}
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
            />
            <div className="mt-4 text-center">
              <p className="text-gray-600">
                {stats.deliveredOrders} of {stats.totalOrders} orders completed
              </p>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Order Status Distribution">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Delivered</span>
                <div className="flex items-center gap-2">
                  <Progress
                    percent={stats.totalOrders > 0 ? (stats.deliveredOrders / stats.totalOrders) * 100 : 0}
                    size="small"
                    strokeColor="#52c41a"
                    className="w-24"
                  />
                  <span className="text-sm text-gray-600">{stats.deliveredOrders}</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span>Approved</span>
                <div className="flex items-center gap-2">
                  <Progress
                    percent={stats.totalOrders > 0 ? (stats.approvedOrders / stats.totalOrders) * 100 : 0}
                    size="small"
                    strokeColor="#1890ff"
                    className="w-24"
                  />
                  <span className="text-sm text-gray-600">{stats.approvedOrders}</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span>Pending</span>
                <div className="flex items-center gap-2">
                  <Progress
                    percent={stats.totalOrders > 0 ? (stats.pendingOrders / stats.totalOrders) * 100 : 0}
                    size="small"
                    strokeColor="#fa8c16"
                    className="w-24"
                  />
                  <span className="text-sm text-gray-600">{stats.pendingOrders}</span>
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Recent Orders Table */}
      <Card title="Recent Purchase Orders">
        <Table
          columns={columns}
          dataSource={recentOrders}
          rowKey="_id"
          pagination={false}
          loading={loading}
          size="small"
        />
      </Card>
    </div>
  );
};

export default PurchaseOrderStats;
