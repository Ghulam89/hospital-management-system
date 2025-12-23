import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, DatePicker, Button, InputNumber, Space, Table, message } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';
import { Base_url } from '../../../utils/Base_url';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

interface AddStockReturnModalProps {
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  fetchStockReturns: () => void;
  selectedStockReturn?: any;
  suppliers: any[];
}

interface ReturnItem {
  key: string;
  itemId: string;
  itemName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  batchNumber: string;
  reason: string;
}

const AddStockReturnModal: React.FC<AddStockReturnModalProps> = ({
  isModalOpen,
  setIsModalOpen,
  fetchStockReturns,
  selectedStockReturn,
  suppliers
}) => {
  const [form] = Form.useForm();
  const [pharmItems, setPharmItems] = useState<any[]>([]);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');

  useEffect(() => {
    if (isModalOpen) {
      fetchPharmItems();
      if (selectedStockReturn) {
        // Pre-populate form for editing
        form.setFieldsValue({
          supplierId: selectedStockReturn.supplierId?._id,
          returnDate: dayjs(selectedStockReturn.returnDate),
          reason: selectedStockReturn.reason,
          notes: selectedStockReturn.notes,
          status: selectedStockReturn.status,
        });
        setSelectedSupplier(selectedStockReturn.supplierId?._id);
        // Set return items
        const items = selectedStockReturn.items?.map((item: any, index: number) => ({
          key: `${index}`,
          itemId: item.itemId?._id,
          itemName: item.itemId?.name,
          quantity: item.quantity,
          unitCost: item.unitCost,
          totalCost: item.totalCost,
          batchNumber: item.batchNumber || '',
          reason: item.reason || '',
        })) || [];
        setReturnItems(items);
      } else {
        form.resetFields();
        setReturnItems([]);
        setSelectedSupplier('');
      }
    }
  }, [isModalOpen, selectedStockReturn]);

  const fetchPharmItems = async () => {
    try {
      const response = await axios.get(`${Base_url}/apis/pharmItem/get?limit=1000`);
      setPharmItems(response.data.data || []);
    } catch (error) {
      console.error('Error fetching pharmacy items:', error);
      message.error('Failed to fetch pharmacy items');
    }
  };

  const addReturnItem = () => {
    const newItem: ReturnItem = {
      key: Date.now().toString(),
      itemId: '',
      itemName: '',
      quantity: 1,
      unitCost: 0,
      totalCost: 0,
      batchNumber: '',
      reason: '',
    };
    setReturnItems([...returnItems, newItem]);
  };

  const removeReturnItem = (key: string) => {
    setReturnItems(returnItems.filter(item => item.key !== key));
  };

  const updateReturnItem = (key: string, field: string, value: any) => {
    setReturnItems(returnItems.map(item => {
      if (item.key === key) {
        const updatedItem = { ...item, [field]: value };
        
        // Update item details if item is selected
        if (field === 'itemId') {
          const selectedItem = pharmItems.find(i => i._id === value);
          if (selectedItem) {
            updatedItem.itemName = selectedItem.name;
            updatedItem.unitCost = selectedItem.unitCost || 0;
          }
        }
        
        // Recalculate total cost
        if (field === 'quantity' || field === 'unitCost') {
          updatedItem.totalCost = updatedItem.quantity * updatedItem.unitCost;
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  const columns = [
    {
      title: 'Item',
      dataIndex: 'itemId',
      key: 'itemId',
      width: 200,
      render: (value: string, record: ReturnItem) => (
        <Select
          showSearch
          value={value}
          onChange={(val) => updateReturnItem(record.key, 'itemId', val)}
          placeholder="Select item"
          style={{ width: '100%' }}
          filterOption={(input, option) =>
            (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
          }
        >
          {pharmItems.map(item => (
            <Option key={item._id} value={item._id}>
              {item.name}
            </Option>
          ))}
        </Select>
      ),
    },
    {
      title: 'Batch Number',
      dataIndex: 'batchNumber',
      key: 'batchNumber',
      width: 150,
      render: (value: string, record: ReturnItem) => (
        <Input
          value={value}
          onChange={(e) => updateReturnItem(record.key, 'batchNumber', e.target.value)}
          placeholder="Batch number"
        />
      ),
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      render: (value: number, record: ReturnItem) => (
        <InputNumber
          min={1}
          value={value}
          onChange={(val) => updateReturnItem(record.key, 'quantity', val || 1)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Unit Cost',
      dataIndex: 'unitCost',
      key: 'unitCost',
      width: 120,
      render: (value: number, record: ReturnItem) => (
        <InputNumber
          min={0}
          step={0.01}
          value={value}
          onChange={(val) => updateReturnItem(record.key, 'unitCost', val || 0)}
          style={{ width: '100%' }}
          prefix="Rs."
        />
      ),
    },
    {
      title: 'Total Cost',
      dataIndex: 'totalCost',
      key: 'totalCost',
      width: 120,
      render: (value: number) => (
        <span className="font-semibold text-red-600">Rs. {value.toFixed(2)}</span>
      ),
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      width: 150,
      render: (value: string, record: ReturnItem) => (
        <Select
          value={value}
          onChange={(val) => updateReturnItem(record.key, 'reason', val)}
          placeholder="Select reason"
          style={{ width: '100%' }}
        >
          <Option value="Damaged">Damaged</Option>
          <Option value="Expired">Expired</Option>
          <Option value="Wrong Item">Wrong Item</Option>
          <Option value="Quality Issue">Quality Issue</Option>
          <Option value="Excess Stock">Excess Stock</Option>
          <Option value="Other">Other</Option>
        </Select>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      width: 80,
      render: (_: any, record: ReturnItem) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeReturnItem(record.key)}
        />
      ),
    },
  ];

  const calculateTotalAmount = () => {
    return returnItems.reduce((sum, item) => sum + item.totalCost, 0);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (returnItems.length === 0) {
        message.error('Please add at least one item to return');
        return;
      }

      // Validate all items have required fields
      const invalidItems = returnItems.filter(item => !item.itemId || item.quantity <= 0);
      if (invalidItems.length > 0) {
        message.error('Please ensure all items have valid details');
        return;
      }

      setLoading(true);

      const payload = {
        supplierId: values.supplierId,
        returnDate: values.returnDate.toISOString(),
        reason: values.reason,
        notes: values.notes || '',
        status: values.status || 'Pending',
        items: returnItems.map(item => ({
          itemId: item.itemId,
          quantity: item.quantity,
          unitCost: item.unitCost,
          totalCost: item.totalCost,
          batchNumber: item.batchNumber,
          reason: item.reason,
        })),
        totalAmount: calculateTotalAmount(),
      };

      if (selectedStockReturn) {
        await axios.put(`${Base_url}/apis/pharmReturnStock/update/${selectedStockReturn._id}`, payload);
        message.success('Stock return updated successfully');
      } else {
        await axios.post(`${Base_url}/apis/pharmReturnStock/create`, payload);
        message.success('Stock return created successfully');
      }

      setIsModalOpen(false);
      fetchStockReturns();
      form.resetFields();
      setReturnItems([]);
    } catch (error: any) {
      console.error('Error saving stock return:', error);
      message.error(error.response?.data?.message || 'Failed to save stock return');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <div className="flex items-center">
          <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center text-white font-bold mr-3">
            <DeleteOutlined />
          </div>
          <span className="text-xl font-semibold text-gray-800">
            {selectedStockReturn ? 'Edit Stock Return' : 'Add Stock Return'}
          </span>
        </div>
      }
      open={isModalOpen}
      onCancel={() => setIsModalOpen(false)}
      width={1200}
      footer={[
        <Button key="cancel" onClick={() => setIsModalOpen(false)}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          onClick={handleSubmit}
          className="bg-red-600 hover:bg-red-700"
        >
          {selectedStockReturn ? 'Update Return' : 'Create Return'}
        </Button>,
      ]}
    >
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
        <p className="text-sm text-yellow-800">
          <strong>Note:</strong> Stock return will be recorded and stock quantities will be adjusted accordingly.
        </p>
      </div>

      <Form form={form} layout="vertical">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Form.Item
            name="supplierId"
            label={<span className="font-semibold">Supplier <span className="text-red-500">*</span></span>}
            rules={[{ required: true, message: 'Please select supplier' }]}
          >
            <Select
              placeholder="Select supplier"
              showSearch
              filterOption={(input, option) =>
                (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
              }
              onChange={(value) => setSelectedSupplier(value)}
            >
              {suppliers.map(supplier => (
                <Option key={supplier._id} value={supplier._id}>
                  {supplier.name} - {supplier.phone}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="returnDate"
            label={<span className="font-semibold">Return Date <span className="text-red-500">*</span></span>}
            rules={[{ required: true, message: 'Please select return date' }]}
            initialValue={dayjs()}
          >
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>

          <Form.Item
            name="reason"
            label={<span className="font-semibold">Overall Reason <span className="text-red-500">*</span></span>}
            rules={[{ required: true, message: 'Please select reason' }]}
          >
            <Select placeholder="Select reason">
              <Option value="Damaged Goods">Damaged Goods</Option>
              <Option value="Expired Products">Expired Products</Option>
              <Option value="Wrong Items Received">Wrong Items Received</Option>
              <Option value="Quality Issues">Quality Issues</Option>
              <Option value="Excess Stock">Excess Stock</Option>
              <Option value="Other">Other</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="status"
            label={<span className="font-semibold">Status</span>}
            initialValue="Pending"
          >
            <Select placeholder="Select status">
              <Option value="Pending">Pending</Option>
              <Option value="Approved">Approved</Option>
              <Option value="Rejected">Rejected</Option>
              <Option value="Completed">Completed</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="notes"
            label={<span className="font-semibold">Additional Notes</span>}
            className="col-span-2"
          >
            <TextArea rows={2} placeholder="Enter any additional notes or comments..." />
          </Form.Item>
        </div>
      </Form>

      <div className="mb-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold text-gray-800">Return Items</h3>
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={addReturnItem}
            className="flex items-center gap-2"
          >
            Add Item
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={returnItems}
          pagination={false}
          scroll={{ x: 1000 }}
          size="small"
          locale={{
            emptyText: (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-2">No items added yet</p>
                <Button type="primary" icon={<PlusOutlined />} onClick={addReturnItem}>
                  Add First Item
                </Button>
              </div>
            ),
          }}
        />

        {returnItems.length > 0 && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-700">Total Return Amount:</span>
              <span className="text-2xl font-bold text-red-600">
                Rs. {calculateTotalAmount().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="text-sm text-gray-600 mt-2">
              Total Items: {returnItems.length} | Total Quantity: {returnItems.reduce((sum, item) => sum + item.quantity, 0)}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default AddStockReturnModal;

