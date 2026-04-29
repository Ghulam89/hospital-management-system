import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, DatePicker, Button, InputNumber, Space, Table, message } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';
import { Base_url } from '../../../utils/Base_url';
import dayjs from 'dayjs';
import { AsyncPaginate } from 'react-select-async-paginate';
import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';

interface ReturnItem {
  key: string;
  itemId: string;
  itemName: string;
  batchNumber: string;
  quantity: number;
  availableQuantity: number;
  unitCost: number;
  totalCost: number;
  reason: string;
}

const { Option } = Select;
const { TextArea } = Input;

const getAuthHeaders = () => {
  const token = localStorage.getItem('userToken') || '';
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const AddStockReturnModal = ({
  isModalOpen,
  setIsModalOpen,
  fetchStockReturns,
  selectedStockReturn,
  renderAsPage = false
}) => {
  const [form] = Form.useForm();
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [nextReturnNumber, setNextReturnNumber] = useState<string>('');

  useEffect(() => {
    if ((isModalOpen || renderAsPage) && !selectedStockReturn) {
      fetchNextReturnNumber();
    }
  }, [isModalOpen, renderAsPage, selectedStockReturn]);

  const fetchNextReturnNumber = async () => {
    try {
      const response = await axios.get(`${Base_url}/apis/pharmReturnStock/next-number`, {
         headers: getAuthHeaders()
      });
      if (response.data.status === 'ok') {
        setNextReturnNumber(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching next return number:', error);
    }
  };

  // Load Invoices for the selected Supplier
  const loadInvoiceOptions = React.useCallback(async (search: string, loadedOptions: any, { page }: any) => {
    if (!selectedSupplier?.value) return { options: [], hasMore: false };

    try {
      const response = await axios.get(`${Base_url}/apis/pharmReturnStock/invoices/${selectedSupplier.value}`, {
        params: { search, page, limit: 10 },
        headers: getAuthHeaders(),
      });
      return {
        options: response.data.data.map((inv: any) => ({
          value: inv._id,
          label: `${inv.documentNumber || 'N/A'} - ${inv.supplierInvoiceNumber || 'N/A'} (${new Date(inv.date).toLocaleDateString()})`,
          invoice: inv
        })),
        hasMore: response.data.totalPages > page,
        additional: { page: page + 1 },
      };
    } catch (error) {
      console.error('Error loading invoices:', error);
      return { options: [], hasMore: false };
    }
  }, [selectedSupplier]);

  const loadSupplierOptions = React.useCallback(async (search: string, loadedOptions: any, { page }: any) => {
    try {
      const response = await axios.get(`${Base_url}/apis/pharmSupplier/get`, {
        params: { search, page, limit: 10 },
        headers: getAuthHeaders(),
      });
      return {
        options: response.data.data.map((s: any) => ({
          value: s._id,
          label: s.name,
          supplier: s,
        })),
        hasMore: response.data.totalPages > page,
        additional: { page: page + 1 },
      };
    } catch (error) {
      console.error('Error loading suppliers:', error);
      return { options: [], hasMore: false };
    }
  }, []);

  const loadItemOptions = React.useCallback(async (search: string, loadedOptions: any, { page }: any) => {
    try {
      const response = await axios.get(`${Base_url}/apis/pharmItem/get`, {
        params: { search, page, limit: 20 },
        headers: getAuthHeaders(),
      });
      return {
        options: response.data.data.map((item: any) => ({
          value: item._id,
          label: `${item.name} (${item.availableQuantity} in stock)`,
          item: item // Store full item object
        })),
        hasMore: response.data.totalPages > page,
        additional: { page: page + 1 },
      };
    } catch (error) {
      return { options: [], hasMore: false };
    }
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      if (selectedStockReturn) {
        // Pre-populate form for editing
        form.setFieldsValue({
          supplierId: selectedStockReturn.supplierId?._id,
          returnDate: dayjs(selectedStockReturn.returnDate),
          reason: selectedStockReturn.reason,
          notes: selectedStockReturn.notes,
          status: selectedStockReturn.status,
        });
        setSelectedSupplier({ 
          value: selectedStockReturn.supplierId?._id, 
          label: selectedStockReturn.supplierId?.name 
        });
        
        // Set return items
        const items = selectedStockReturn.items?.map((item: any, index: number) => ({
          key: `${index}`,
          itemId: item.itemId?._id,
          itemName: item.itemId?.name,
          quantity: item.quantity,
          availableQuantity: item.itemId?.availableQuantity || 0,
          unitCost: item.unitCost,
          totalCost: item.totalCost,
          batchNumber: item.batchNumber || '',
          reason: item.reason || '',
        })) || [];
        setReturnItems(items);
      } else {
        form.resetFields();
        setReturnItems([]);
        setSelectedSupplier(null);
        setSelectedInvoice(null);
      }
    }
  }, [isModalOpen, selectedStockReturn, form]);

  const addReturnItem = () => {
    const newItem: ReturnItem = {
      key: Date.now().toString(),
      itemId: '',
      itemName: '',
      quantity: 0,
      availableQuantity: 0,
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
    setReturnItems(prevItems => prevItems.map(item => {
      if (item.key === key) {
        const updatedItem = { ...item, [field]: value };
        
        // Recalculate total cost
        if (field === 'quantity' || field === 'unitCost') {
          updatedItem.totalCost = (updatedItem.quantity || 0) * (updatedItem.unitCost || 0);
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  const handleItemSelect = (key: string, selectedOption: any) => {
    if (selectedOption) {
      const itemData = selectedOption.item;
      setReturnItems(prevItems => prevItems.map(item => {
        if (item.key === key) {
          return {
            ...item,
            itemId: itemData._id,
            itemName: itemData.name,
            availableQuantity: itemData.availableQuantity || 0,
            unitCost: itemData.unitCost || 0,
            totalCost: (item.quantity || 0) * (itemData.unitCost || 0)
          };
        }
        return item;
      }));
    }
  };

  const columns = [
    {
      title: 'Item',
      dataIndex: 'itemId',
      key: 'itemId',
      width: 300,
      render: (value: string, record: ReturnItem) => (
        <div className="flex flex-col gap-1">
          <AsyncPaginate
            value={value ? { value: value, label: record.itemName } : null}
            loadOptions={loadItemOptions as any}
            onChange={(selected) => handleItemSelect(record.key, selected)}
            additional={{ page: 1 }}
            placeholder="Search item..."
            debounceTimeout={400}
            isClearable
            styles={{
              control: (provided) => ({
                ...provided,
                minHeight: '32px',
                fontSize: '14px',
              }),
              menuPortal: (provided) => ({ ...provided, zIndex: 999999 }),
            }}
            menuPortalTarget={document.body}
          />
        </div>
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
      title: 'Available Qty',
      dataIndex: 'availableQuantity',
      key: 'availableQuantity',
      width: 120,
      render: (value: number) => (
        <Input
          value={value || 0}
          disabled
          className="bg-gray-100 text-gray-500 cursor-not-allowed"
        />
      ),
    },
    {
      title: 'Return Qty',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 120,
      render: (value: number, record: ReturnItem) => (
        <InputNumber
          min={0}
          max={record.availableQuantity}
          value={value === 0 ? undefined : value}
          onChange={(val) => {
            const newValue = val === null ? 0 : Number(val);
            if (newValue > record.availableQuantity) {
               return; 
            }
            updateReturnItem(record.key, 'quantity', newValue);
          }}
          placeholder="0"
          style={{ width: '100%' }}
          status={value > record.availableQuantity ? 'error' : ''}
          onFocus={(e) => e.target.select()}
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
      
      // Filter out items with 0 quantity (ignore them)
      const itemsToReturn = returnItems.filter(item => item.quantity > 0);

      if (itemsToReturn.length === 0) {
        message.error('Please add at least one item with quantity greater than 0');
        return;
      }

      // Validate all items to be returned have required fields
      const invalidItems = itemsToReturn.filter(item => !item.itemId);
      if (invalidItems.length > 0) {
        message.error(`Please select an item for the rows with entered quantity. (Rows: ${invalidItems.map((_, i) => i + 1).join(', ')})`);
        return;
      }

      // Validate quantity against available stock
      const stockExceededItems = itemsToReturn.filter(item => item.quantity > item.availableQuantity);
      if (stockExceededItems.length > 0) {
        message.error(`Quantity cannot exceed available stock for: ${stockExceededItems.map(i => i.itemName).join(', ')}`);
        return;
      }

      setLoading(true);

      const payload = {
        supplierId: values.supplierId,
        returnDate: values.returnDate.toISOString(),
        reason: values.reason,
        notes: values.notes || '',
        status: values.status || 'Pending',
        items: itemsToReturn.map(item => ({
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
        await axios.put(`${Base_url}/apis/pharmReturnStock/update/${selectedStockReturn._id}`, payload, {
          headers: getAuthHeaders(),
        });
        message.success('Stock return updated successfully');
      } else {
        await axios.post(`${Base_url}/apis/pharmReturnStock/create`, payload, {
          headers: getAuthHeaders(),
        });
        message.success('Stock return created successfully');
      }

      setIsModalOpen(false);
      fetchStockReturns();
      form.resetFields();
      setReturnItems([]);
    } catch (error: any) {
      if (error.errorFields) {
        message.error('Please fill in all required fields correctly.');
        return;
      }
      console.error('Error saving stock return:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to save stock return';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <>
      
<div className="mb-6 bg-white p-5 rounded-lg">
  
      <Form form={form} layout="vertical">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Display Return Number if Editing or show placeholder for new */}
          <Form.Item label={<span className="font-semibold">Return Invoice No</span>}>
            <Input 
              value={selectedStockReturn ? selectedStockReturn.returnNumber : nextReturnNumber || "Auto Generated"} 
              disabled 
              className="bg-gray-100 text-gray-500"
            />
          </Form.Item>

          <Form.Item name="supplierId" hidden rules={[{ required: true, message: 'Please select supplier' }]}>
            <Input />
          </Form.Item>

          <Form.Item
            shouldUpdate={(prev, curr) => prev.supplierId !== curr.supplierId}
            noStyle
          >
            {() => (
              <Form.Item
                label={<span className="font-semibold">Supplier <span className="text-red-500">*</span></span>}
                validateStatus={form.getFieldError('supplierId').length > 0 ? 'error' : ''}
                help={form.getFieldError('supplierId')[0]}
              >
                <AsyncPaginate
                  value={selectedSupplier}
                  loadOptions={loadSupplierOptions as any}
                  onChange={(value: any) => {
                    if (value) {
                      setSelectedSupplier(value); 
                      form.setFieldsValue({ supplierId: value.value });
                      form.validateFields(['supplierId']); // Validate to clear error
                      
                      // Clear dependent fields
                      setSelectedInvoice(null);
                      form.setFieldsValue({ invoiceId: null });
                      setReturnItems([]);
                    } else {
                      setSelectedSupplier(null);
                      form.setFieldsValue({ supplierId: null });
                      
                      setSelectedInvoice(null);
                      form.setFieldsValue({ invoiceId: null });
                      setReturnItems([]);
                    }
                  }}
                  placeholder="Search supplier"
                  additional={{ page: 1 }}
                  debounceTimeout={400}
                  isClearable
                  styles={{
                    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                    control: (base) => ({ ...base, minHeight: '40px' })
                  }}
                  menuPortalTarget={document.body}
                />
              </Form.Item>
            )}
          </Form.Item>

          {/* Invoice Selection */}
          <Form.Item
            shouldUpdate={(prev, curr) => prev.supplierId !== curr.supplierId}
            noStyle
          >
            {() => (
              <Form.Item
                label={<span className="font-semibold">Invoice (Optional)</span>}
              >
                <AsyncPaginate
                  key={selectedSupplier?.value} // Force re-render when supplier changes
                  value={selectedInvoice}
                  loadOptions={loadInvoiceOptions as any}
                  onChange={(value: any) => {
                    if (value) {
                      setSelectedInvoice(value);
                      form.setFieldsValue({ invoiceId: value.value });
                      
                      // Auto-populate items from invoice
                      if (value.invoice && value.invoice.items) {
                        const newItems = value.invoice.items.map((item: any, index: number) => ({
                          key: Date.now().toString() + index,
                          itemId: item.pharmItemId?._id,
                          itemName: item.pharmItemId?.name,
                          quantity: 0, // Default to 0 so user can enter return qty
                          availableQuantity: item.pharmItemId?.availableQuantity || 0,
                          unitCost: item.unitCost || item.pharmItemId?.unitCost || 0,
                          totalCost: 0,
                          batchNumber: item.batchNumber || '',
                          reason: '',
                        }));
                        setReturnItems(newItems);
                        message.info('Items loaded from invoice');
                      }
                    } else {
                      setSelectedInvoice(null);
                      form.setFieldsValue({ invoiceId: null });
                      setReturnItems([]);
                    }
                  }}
                  isDisabled={!selectedSupplier}
                  placeholder={selectedSupplier ? "Search invoice..." : "Select a supplier first"}
                  additional={{ page: 1 }}
                  debounceTimeout={400}
                  isClearable
                  styles={{
                    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                    control: (base) => ({ ...base, minHeight: '40px' })
                  }}
                  menuPortalTarget={document.body}
                />
              </Form.Item>
            )}
          </Form.Item>

          <Form.Item name="invoiceId" hidden>
            <Input />
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
            rules={[{ required: true, message: 'Please select a reason for the return' }]}
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
          pagination={{
            defaultPageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            position: ['bottomRight'],
          }}
          scroll={{ x: 1000 }}
          size="small"
          locale={{
            emptyText: (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-2">No items added yet</p>
                <Button type="default" icon={<PlusOutlined />} onClick={addReturnItem}>
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
</div>
    </>
  );

 

  if (renderAsPage) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {selectedStockReturn ? "Edit Stock Return" : "Create Stock Return"}
          </h2>
        </div>
        {content}
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
            <Button onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="primary" 
              loading={loading}
              onClick={handleSubmit}
              className="bg-primary text-white"
            >
              {selectedStockReturn ? "Update Return" : "Create Return"}
            </Button>
        </div>
      </div>
    );
  }

  return (
    <Modal
      title={selectedStockReturn ? "Edit Stock Return" : "Create Stock Return"}
      open={isModalOpen}
      onCancel={() => setIsModalOpen(false)}
      width={1000}
      footer={[
        <Button key="back" onClick={() => setIsModalOpen(false)}>
          Cancel
        </Button>,
        <Button 
          key="submit" 
          type="primary" 
          loading={loading} // Add loading state
          onClick={handleSubmit}
          className="bg-primary text-white"
        >
          {selectedStockReturn ? "Update Return" : "Create Return"}
        </Button>,
      ]}
      className="stock-return-modal"
    >
      <div className="py-4">
        {content}
      </div>
    </Modal>
  );
};

export default AddStockReturnModal;

