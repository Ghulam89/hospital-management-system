import React, { useEffect, useState } from 'react';
import { Form, Input, Select, DatePicker, Button, Table, Space, message, Card, Row, Col } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import axios from 'axios';
import { Base_url } from '../../../utils/Base_url';
import dayjs from 'dayjs';
import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import { useParams } from 'react-router-dom';

const { Option } = Select;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

interface PharmItem {
  _id: string;
  name: string;
  pharmManufacturerId?: { name: string };
  pharmSupplierId?: { name: string };
  pharmCategoryId?: { name: string };
  unitCost: number;
  availableQuantity: number;
  conversionUnit: number;
}

interface Supplier {
  _id: string;
  name: string;
  phone: string;
}

interface PurchaseOrderItem {
  id: number;
  pharmItemId: string;
  itemName: string;
  manufacturerName: string;
  b2bCategory: string;
  conversionUnit: number;
  currentStock: number;
  soldQuantity: number;
  avgSaleQuantity: number;
  projectedSales: number;
  unitsRequired: number;
  unitCost: number;
  totalCost: number;
}

const AddPurchaseOrder: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  
  const [form] = Form.useForm();
  const [items, setItems] = useState<PurchaseOrderItem[]>([
    {
      id: 1,
      pharmItemId: '',
      itemName: '',
      manufacturerName: '',
      b2bCategory: '',
      conversionUnit: 1,
      currentStock: 0,
      soldQuantity: 0,
      avgSaleQuantity: 0,
      projectedSales: 0,
      unitsRequired: 0,
      unitCost: 0,
      totalCost: 0,
    }
  ]);
  const [pharmItems, setPharmItems] = useState<PharmItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [grandTotal, setGrandTotal] = useState(0);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    fetchPharmItems();
    fetchSuppliers();
    
    // Fetch purchase order data if in edit mode
    if (isEditMode && id) {
      fetchPurchaseOrder(id);
    }
  }, [isEditMode, id]);

  useEffect(() => {
    calculateGrandTotal();
  }, [items]);

  const fetchPurchaseOrder = async (purchaseOrderId: string) => {
    try {
      setLoading(true);
      const response = await axios.get(`${Base_url}/apis/pharmPurchaseOrder/get/${purchaseOrderId}`);
      
      if (response.data && response.data.status === 'ok') {
        const orderData = response.data.data;
        
        // Set form values
        form.setFieldsValue({
          supplierId: orderData.supplierId?._id,
          orderDate: dayjs(orderData.orderDate),
          expectedDeliveryDate: dayjs(orderData.expectedDeliveryDate),
          projectDays: orderData.projectDays,
          zeroQuantity: orderData.zeroQuantity ? 'Yes' : 'No',
          poCategory: orderData.poCategory,
          unit: orderData.unit,
          notes: orderData.notes,
        });
        
        // Set items
        if (orderData.items && orderData.items.length > 0) {
          const formattedItems = orderData.items.map((item: any, index: number) => ({
            id: index + 1,
            pharmItemId: item.pharmItemId?._id || item.pharmItemId,
            itemName: item.pharmItemId?.name || '',
            manufacturerName: item.manufacturerName || '',
            b2bCategory: item.b2bCategory || '',
            conversionUnit: item.conversionUnit || 1,
            currentStock: item.currentStock || 0,
            soldQuantity: item.soldQuantity || 0,
            avgSaleQuantity: item.avgSaleQuantity || 0,
            projectedSales: item.projectedSales || 0,
            unitsRequired: item.unitsRequired || 0,
            unitCost: item.unitCost || 0,
            totalCost: item.totalCost || 0,
          }));
          setItems(formattedItems);
        }
      }
    } catch (error: any) {
      console.error('Error fetching purchase order:', error);
      message.error('Failed to fetch purchase order data');
    } finally {
      setLoading(false);
    }
  };

  const fetchPharmItems = async () => {
    try {
      const response = await axios.get(`${Base_url}/apis/pharmItem/get?limit=1000`);
      if (response.data && response.data.status === 'ok') {
        setPharmItems(response.data.data || []);
        setIsDataLoaded(true);
      } else {
        console.error('Failed to fetch pharmacy items:', response.data);
        setPharmItems([]);
        setIsDataLoaded(true);
      }
    } catch (error: any) {
      console.error('Error fetching pharmacy items:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to fetch pharmacy items';
      message.error(errorMsg);
      setPharmItems([]);
      setIsDataLoaded(true);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await axios.get(`${Base_url}/apis/pharmSupplier/get`);
      if (response.data && response.data.status === 'ok') {
        setSuppliers(response.data.data || []);
      } else {
        console.error('Failed to fetch suppliers:', response.data);
        setSuppliers([]);
      }
    } catch (error: any) {
      console.error('Error fetching suppliers:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to fetch suppliers';
      message.error(errorMsg);
      setSuppliers([]);
    }
  };

  const calculateGrandTotal = () => {
    const total = items.reduce((sum, item) => sum + item.totalCost, 0);
    setGrandTotal(total);
  };

  const addItem = () => {
    const newItem: PurchaseOrderItem = {
      id: Math.max(...items.map(item => item.id)) + 1,
      pharmItemId: '',
      itemName: '',
      manufacturerName: '',
      b2bCategory: '',
      conversionUnit: 1,
      currentStock: 0,
      soldQuantity: 0,
      avgSaleQuantity: 0,
      projectedSales: 0,
      unitsRequired: 0,
      unitCost: 0,
      totalCost: 0,
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: number) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: number, field: keyof PurchaseOrderItem, value: any) => {
    const updatedItems = items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        
        // Calculate total cost when unit cost or units required changes
        if (field === 'unitCost' || field === 'unitsRequired') {
          updatedItem.totalCost = updatedItem.unitCost * updatedItem.unitsRequired;
        }
        
        return updatedItem;
      }
      return item;
    });
    setItems(updatedItems);
  };

  const handleItemSelect = async (id: number, pharmItemId: string) => {
    console.log('Item selected - ID:', id, 'PharmItemId:', pharmItemId);
    const selectedItem = pharmItems.find(item => item._id === pharmItemId);
    console.log('Selected item:', selectedItem);
    
    if (selectedItem) {
      try {
        // Fetch sales statistics for this item
        let soldQuantity = 0;
        let avgSaleQuantity = 0;
        let projectedSales = 0;
        
        try {
          // Try to fetch POS sales data for this item
          const salesResponse = await axios.get(`${Base_url}/apis/pharmPos/get`, {
            params: {
              itemId: pharmItemId,
              limit: 1000
            }
          });
          
          if (salesResponse.data && salesResponse.data.data) {
            const sales = salesResponse.data.data;
            const itemSales = sales.flatMap((sale: any) => 
              sale.allItem?.filter((item: any) => item.pharmItemId === pharmItemId) || []
            );
            
            // Calculate sold quantity (total quantity sold)
            soldQuantity = itemSales.reduce((sum: number, item: any) => 
              sum + (item.quantity || 0) - (item.returnQuantity || 0), 0
            );
            
            // Calculate average sale quantity (if we have sales data)
            if (itemSales.length > 0) {
              avgSaleQuantity = soldQuantity / itemSales.length;
            }
            
            // Projected sales (simple projection based on average)
            projectedSales = Math.ceil(avgSaleQuantity * 30); // 30 days projection
          }
        } catch (error) {
          console.log('Could not fetch sales statistics:', error);
          // Use default values if fetch fails
        }
        
        // Update all fields at once to ensure all details are set
        const updatedItems = items.map(item => {
          if (item.id === id) {
            const newItem = {
              ...item,
              pharmItemId: pharmItemId,
              itemName: selectedItem.name,
              manufacturerName: selectedItem.pharmManufacturerId?.name || '',
              b2bCategory: selectedItem.pharmCategoryId?.name || '',
              conversionUnit: selectedItem.conversionUnit || 1,
              currentStock: selectedItem.availableQuantity || 0,
              unitCost: selectedItem.unitCost || 0,
              soldQuantity: soldQuantity,
              avgSaleQuantity: Math.round(avgSaleQuantity * 100) / 100,
              projectedSales: projectedSales,
              // Keep existing values for these fields
              unitsRequired: item.unitsRequired,
              totalCost: item.totalCost,
            };
            
            // Recalculate total cost if units required is set
            if (newItem.unitsRequired > 0) {
              newItem.totalCost = newItem.unitsRequired * newItem.unitCost;
            }
            
            return newItem;
          }
          return item;
        });
        console.log('Updated items:', updatedItems);
        setItems(updatedItems);
      } catch (error) {
        console.error('Error fetching item statistics:', error);
        message.error('Failed to load item statistics');
      }
    } else {
      console.error('Item not found with ID:', pharmItemId);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const formValues = await form.validateFields();
      
      // Check if items array is empty
      if (items.length === 0) {
        message.error('Please add at least one item');
        setLoading(false);
        return;
      }
      
      // Debug log
      console.log('Items before validation:', items);
      
      // Validate items - must have item selected and quantity > 0
      const validItems = items.filter(item => {
        return item.pharmItemId && item.unitsRequired > 0;
      });
      
      console.log('Valid items after filtering:', validItems);
      
      if (validItems.length === 0) {
        message.error('Please add at least one item with quantity greater than 0. Make sure you have selected an item and entered a quantity.');
        setLoading(false);
        return;
      }
      
      // Get current user from localStorage
      const userDataString = localStorage.getItem('userData');
      const userData = userDataString ? JSON.parse(userDataString) : null;
      const currentUserId = userData?._id || userData?.id;
      
      if (!currentUserId) {
        message.error('User session expired. Please login again.');
        setLoading(false);
        return;
      }
      
      const purchaseOrderData = {
        supplierId: formValues.supplierId,
        orderDate: formValues.orderDate?.format('YYYY-MM-DD'),
        expectedDeliveryDate: formValues.expectedDeliveryDate?.format('YYYY-MM-DD'),
        projectDays: formValues.projectDays || 0,
        zeroQuantity: formValues.zeroQuantity === 'Yes' || formValues.zeroQuantity === true,
        poCategory: formValues.poCategory || 'Projection Period',
        unit: formValues.unit || 'Pack',
        notes: formValues.notes || '',
        items: validItems,
        createdBy: currentUserId,
      };

      console.log('Purchase Order Data:', purchaseOrderData);

      // Use PUT for edit mode, POST for create mode
      const response = isEditMode && id
        ? await axios.put(`${Base_url}/apis/pharmPurchaseOrder/update/${id}`, purchaseOrderData)
        : await axios.post(`${Base_url}/apis/pharmPurchaseOrder/create`, purchaseOrderData);
      
      if (response.data.status === 'ok') {
        message.success(response.data.message || (isEditMode ? 'Purchase order updated successfully!' : 'Purchase order created successfully!'));
        
        // Navigate back to list page
        setTimeout(() => {
          window.location.href = '/admin/pharmacy/purchase-orders';
        }, 1000);
      } else {
        throw new Error(response.data.error || (isEditMode ? 'Failed to update purchase order' : 'Failed to create purchase order'));
      }
    } catch (error: any) {
      console.error('Error creating purchase order:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to create purchase order. Please check all fields and try again.';
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'SERIAL NO.',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      render: (id: number) => id,
    },
    {
      title: 'ITEMS',
      key: 'items',
      width: 300,
      fixed: 'left' as const,
      render: (_: any, record: PurchaseOrderItem) => (
        <Select
          placeholder="Search for Items"
          value={record.pharmItemId}
          onChange={(value) => handleItemSelect(record.id, value)}
          showSearch
          filterOption={(input, option) =>
            String(option?.children || '').toLowerCase().includes(input.toLowerCase())
          }
          style={{ width: '100%', minWidth: '280px' }}
          dropdownStyle={{ minWidth: '300px' }}
          dropdownMatchSelectWidth={false}
          notFoundContent={pharmItems.length === 0 ? 'Loading items...' : 'No items found'}
          optionLabelProp="label"
        >
          {pharmItems.map(item => (
            <Option 
              key={item._id} 
              value={item._id} 
              title={item.name}
              label={item.name}
            >
              <div style={{ 
                whiteSpace: 'nowrap', 
                overflow: 'hidden', 
                textOverflow: 'ellipsis',
                maxWidth: '280px'
              }}>
                {item.name}
              </div>
            </Option>
          ))}
        </Select>
      ),
    },
    {
      title: 'MANUFACTURER NAME',
      dataIndex: 'manufacturerName',
      key: 'manufacturerName',
      width: 150,
    },
    {
      title: 'B2B CATEGORY',
      dataIndex: 'b2bCategory',
      key: 'b2bCategory',
      width: 120,
    },
    {
      title: 'CONVERSION UNIT',
      dataIndex: 'conversionUnit',
      key: 'conversionUnit',
      width: 120,
    },
    {
      title: 'CURRENT STOCK',
      dataIndex: 'currentStock',
      key: 'currentStock',
      width: 120,
    },
    {
      title: 'SOLD QUANTITY',
      dataIndex: 'soldQuantity',
      key: 'soldQuantity',
      width: 120,
      render: (value: number) => value || 0,
    },
    {
      title: 'AVG. SALE QTY',
      dataIndex: 'avgSaleQuantity',
      key: 'avgSaleQuantity',
      width: 120,
      render: (value: number) => value ? value.toFixed(2) : '0.00',
    },
    {
      title: 'PROJECTED SALES',
      dataIndex: 'projectedSales',
      key: 'projectedSales',
      width: 120,
      render: (value: number) => value || 0,
    },
    {
      title: 'UNITS REQ',
      key: 'unitsRequired',
      width: 100,
      render: (_: any, record: PurchaseOrderItem) => (
        <Input
          type="number"
          value={record.unitsRequired}
          onChange={(e) => updateItem(record.id, 'unitsRequired', parseInt(e.target.value) || 0)}
          min={0}
        />
      ),
    },
    {
      title: 'UNIT COST',
      key: 'unitCost',
      width: 100,
      render: (_: any, record: PurchaseOrderItem) => (
        <Input
          type="number"
          value={record.unitCost}
          onChange={(e) => updateItem(record.id, 'unitCost', parseFloat(e.target.value) || 0)}
          min={0}
          step={0.01}
        />
      ),
    },
    {
      title: 'TOTAL COST',
      dataIndex: 'totalCost',
      key: 'totalCost',
      width: 100,
      render: (totalCost: number) => (
        <span className="font-semibold text-green-600">
          Rs. {(totalCost || 0).toFixed(2)}
        </span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_: any, record: PurchaseOrderItem) => (
        <Button
          type="text"
          icon={<DeleteOutlined />}
          onClick={() => removeItem(record.id)}
          danger
        />
      ),
    },
  ];

  // Loading state
  if (!isDataLoaded) {
    return (
      <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading purchase order form...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-6">
      <Breadcrumb pageName={isEditMode ? "Edit Purchase Order" : "Add Purchase Order"} />
      
      <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
        <h4 className="text-xl font-semibold text-black dark:text-white mb-6">
          {isEditMode ? 'Edit Purchase Order' : 'Add New Purchase Order'}
        </h4>

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          poCategory: 'Projection Period',
          unit: 'Pack',
          zeroQuantity: 'Yes',
          orderDate: dayjs(),
        }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Purchase Order#"
              name="purchaseOrderNumber"
            >
              <Input placeholder="Auto-generated" disabled />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Supplier"
              name="supplierId"
              rules={[{ required: true, message: 'Please select supplier' }]}
            >
              <Select
                placeholder="Search by name or phone.."
                showSearch
                filterOption={(input, option) =>
                  String(option?.children || '').toLowerCase().includes(input.toLowerCase())
                }
              >
                {suppliers.map(supplier => (
                  <Option key={supplier._id} value={supplier._id}>
                    {supplier.name} - {supplier.phone}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label="Date Range"
              name="dateRange"
            >
              <DatePicker.RangePicker className="w-full" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="Proj. Days"
              name="projectDays"
            >
              <Input type="number" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="Zero QTY"
              name="zeroQuantity"
            >
              <Select>
                <Option value="Yes">Yes</Option>
                <Option value="No">No</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label="Order Date"
              name="orderDate"
              rules={[{ required: true, message: 'Please select order date' }]}
            >
              <DatePicker className="w-full" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="Expected Delivery Date"
              name="expectedDeliveryDate"
              rules={[{ required: true, message: 'Please select delivery date' }]}
            >
              <DatePicker className="w-full" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="P/O Category"
              name="poCategory"
            >
              <Select>
                <Option value="Projection Period">Projection Period</Option>
                <Option value="Emergency">Emergency</Option>
                <Option value="Regular">Regular</Option>
                <Option value="Bulk">Bulk</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label="Unit"
              name="unit"
            >
              <Select>
                <Option value="Pack">Pack</Option>
                <Option value="Piece">Piece</Option>
                <Option value="Box">Box</Option>
                <Option value="Bottle">Bottle</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={16}>
            <Form.Item
              label="Notes"
              name="notes"
            >
              <TextArea rows={2} placeholder="Additional notes..." />
            </Form.Item>
          </Col>
        </Row>
      </Form>

      {/* Items Table */}
      <div className="mt-6">
        <div className="mb-4">
          <Button
            type="default"
            icon={<PlusOutlined />}
            onClick={addItem}
            className="mb-4"
          >
            + Item
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={items}
          rowKey="id"
          pagination={false}
          scroll={{ x: 1500 }}
          size="small"
        />

        <div className="mt-4 pb-4 flex justify-end items-center gap-4">
          <div className="text-lg font-semibold">
            Grand Total: <span className="text-green-600">Rs. {grandTotal.toFixed(2)}</span>
          </div>
          <Button
            type="default"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={loading}
            size="large"
          >
            Save
          </Button>
        </div>
      </div>
      </div>
    </div>
  );
};

export default AddPurchaseOrder;
