import { useState, useEffect } from 'react';
import { Form, Input, Button, Select, DatePicker, Table, Card, Row, Col, message, Upload } from 'antd';
import { PlusOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import axios from 'axios';
import { Base_url } from '../../../utils/Base_url';
import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

const { Option } = Select;

interface StockItem {
  id: string;
  pharmItemId: string;
  itemName: string;
  manufacturer: string;
  b2bCategory: string;
  rack: string;
  conversionUnit: number;
  unit: string;
  availableQty: number;
  quantity: number;
  looseUnitQty: number;
  unitCost: number;
  totalCost: number;
  batchNumber: string;
  expiryDate: string;
}

const defaultRow: StockItem = {
  id: '',
  pharmItemId: '',
  itemName: '',
  manufacturer: '',
  b2bCategory: '',
  rack: '',
  conversionUnit: 1,
  unit: 'Pack',
  availableQty: 0,
  quantity: 0,
  looseUnitQty: 0,
  unitCost: 0,
  totalCost: 0,
  batchNumber: '',
  expiryDate: '',
};

export default function AddNewStock() {
  const [form] = Form.useForm();
  const [rows, setRows] = useState<StockItem[]>([{ ...defaultRow, id: '1' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [itemsList, setItemsList] = useState<any[]>([]);
  const [suppliersList, setSuppliersList] = useState<any[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [totalTax, setTotalTax] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);
   const navigate = useNavigate();
  // Fetch reference data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [itemsRes, suppliersRes] = await Promise.all([
          axios.get(`${Base_url}/apis/pharmItem/get`),
          axios.get(`${Base_url}/apis/pharmSupplier/get`)
        ]);
        
        setItemsList(itemsRes.data.data || []);
        setSuppliersList(suppliersRes.data.data || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        message.error('Failed to fetch reference data');
      }
    };
    
    fetchData();
  }, []);

  const handleRowChange = (idx: number, field: string, value: any) => {
    const updated = [...rows];
    const currentRow = updated[idx];
    
    // Convert value to number and handle NaN
    let numValue: number;
    if (typeof value === 'string' && value.trim() === '') {
      numValue = 0;
    } else {
      numValue = Number(value);
      if (isNaN(numValue)) {
        numValue = 0;
      }
    }
    
    // Validate: If item category is "Product", loose quantity should not be allowed
    if (field === 'looseUnitQty' && numValue > 0) {
      const selectedItem = itemsList.find(item => item._id === currentRow.pharmItemId);
      if (selectedItem) {
        const categoryName = selectedItem.pharmCategoryId?.name?.toLowerCase() || '';
        if (categoryName === 'product' || categoryName.includes('product')) {
          message.warning('Loose quantity is not allowed for Product category items');
          return; // Don't update if validation fails
        }
      }
    }
    
    // Ensure numeric fields are never NaN
    if (['quantity', 'looseUnitQty', 'unitCost', 'totalCost', 'availableQty'].includes(field)) {
      updated[idx] = { ...updated[idx], [field]: numValue || 0 };
    } else {
      updated[idx] = { ...updated[idx], [field]: value };
    }
    
    // Auto-calculate totals when quantity or unit cost changes
    if (field === 'quantity' || field === 'unitCost') {
      const quantity = field === 'quantity' ? numValue : (updated[idx].quantity || 0);
      const unitCost = field === 'unitCost' ? numValue : (updated[idx].unitCost || 0);
      updated[idx].totalCost = (quantity * unitCost) || 0;
    }
    
    setRows(updated);
    calculateTotals(updated);
  };

  const handleItemSelect = (idx: number, itemId: string) => {
    const selectedItem = itemsList.find(item => item._id === itemId);
    if (selectedItem) {
      const updated = [...rows];
      updated[idx] = {
        ...updated[idx],
        pharmItemId: itemId,
        itemName: selectedItem.name,
        manufacturer: selectedItem.pharmManufacturerId?.name || '',
        b2bCategory: selectedItem.pharmCategoryId?.name || '',
        rack: selectedItem.pharmRackId?.name || '',
        conversionUnit: Number(selectedItem.conversionUnit) || 1,
        unit: selectedItem.unit || 'Pack',
        unitCost: Number(selectedItem.unitCost) || 0,
        availableQty: Number(selectedItem.availableQuantity) || 0,
      };
      setRows(updated);
      calculateTotals(updated);
    }
  };

  const calculateTotals = (updatedRows: StockItem[]) => {
    const total = updatedRows.reduce((sum, row) => {
      const cost = Number(row.totalCost) || 0;
      return sum + (isNaN(cost) ? 0 : cost);
    }, 0);
    const tax = total * 0.17; // 17% tax
    const grand = total + tax;
    
    setTotalCost(isNaN(total) ? 0 : total);
    setTotalTax(isNaN(tax) ? 0 : tax);
    setGrandTotal(isNaN(grand) ? 0 : grand);
  };

  const addRow = () => {
    const newId = (rows.length + 1).toString();
    setRows([...rows, { ...defaultRow, id: newId }]);
  };

  const removeRow = (idx: number) => {
    if (rows.length > 1) {
      const updated = rows.filter((_, i) => i !== idx);
      setRows(updated);
      calculateTotals(updated);
    }
  };

  const handleSubmit = async (values: any) => {
    // Validate items before submission
    const validItems = rows.filter(row => row.pharmItemId && row.quantity > 0);
    
    if (validItems.length === 0) {
      message.error('Please add at least one item with quantity greater than 0');
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);
    try {
      // Ensure all numeric values are valid numbers, not NaN
      const stockData = {
        documentNumber: values.documentNumber,
        date: values.date.format('YYYY-MM-DD'),
        supplierId: values.supplierId,
        supplierInvoiceDate: values.supplierInvoiceDate.format('YYYY-MM-DD'),
        supplierInvoiceNumber: values.supplierInvoiceNumber,
        items: validItems.map(row => ({
          pharmItemId: row.pharmItemId,
          quantity: Number(row.quantity) || 0,
          looseUnitQty: Number(row.looseUnitQty) || 0,
          unitCost: Number(row.unitCost) || 0,
          totalCost: Number(row.totalCost) || 0,
          batchNumber: row.batchNumber || '',
          expiryDate: row.expiryDate || '',
        })),
        totalCost: Number(totalCost) || 0,
        totalTax: Number(totalTax) || 0,
        grandTotal: Number(grandTotal) || 0,
        remarks: values.remarks || '',
      };

      await axios.post(`${Base_url}/apis/pharmAddStock/create`, stockData);
      message.success('Stock added successfully!');
      navigate('/admin/pharmacy/stocks')
      // Reset form
      form.resetFields();
      setRows([{ ...defaultRow, id: '1' }]);
      setTotalCost(0);
      setTotalTax(0);
      setGrandTotal(0);
    } catch (error: any) {
      console.error('Error adding stock:', error);
      message.error(error.response?.data?.message || 'Failed to add stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      title: 'SR #',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: 'ITEMS',
      key: 'items',
      width: 200,
      render: (_: any, record: StockItem, index: number) => (
        <Select
          showSearch
          placeholder="Search for Items"
          value={record.pharmItemId}
          onChange={(value) => handleItemSelect(index, value)}
          style={{ width: '100%' }}
          filterOption={(input, option) =>
            (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
          }
        >
          {itemsList.map(item => (
            <Option key={item._id} value={item._id}>
              {item.name}
            </Option>
          ))}
        </Select>
      ),
    },
    {
      title: 'MANUFACTURER',
      dataIndex: 'manufacturer',
      key: 'manufacturer',
      width: 150,
    },
    {
      title: 'B2B CATEGORY',
      dataIndex: 'b2bCategory',
      key: 'b2bCategory',
      width: 120,
    },
    {
      title: 'RACK',
      dataIndex: 'rack',
      key: 'rack',
      width: 100,
    },
    {
      title: 'CONVERSION UNIT',
      dataIndex: 'conversionUnit',
      key: 'conversionUnit',
      width: 120,
    },
    {
      title: 'UNIT',
      dataIndex: 'unit',
      key: 'unit',
      width: 80,
    },
    {
      title: 'AVAILABLE QTY',
      dataIndex: 'availableQty',
      key: 'availableQty',
      width: 100,
    },
    {
      title: 'QUANTITY',
      key: 'quantity',
      width: 100,
      render: (_: any, record: StockItem, index: number) => (
        <Input
          type="number"
          step="0.01"
          value={record.quantity}
          onChange={(e) => {
            const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
            handleRowChange(index, 'quantity', isNaN(val) ? 0 : val);
          }}
          min={0}
          onWheel={(e) => e.currentTarget.blur()}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'LOOSE UNIT QTY',
      key: 'looseUnitQty',
      width: 120,
      render: (_: any, record: StockItem, index: number) => {
        const selectedItem = itemsList.find(item => item._id === record.pharmItemId);
        const categoryName = selectedItem?.pharmCategoryId?.name?.toLowerCase() || '';
        const isProduct = categoryName === 'product' || categoryName.includes('product');
        
        return (
          <Input
            type="number"
            step="0.01"
            value={record.looseUnitQty}
            onChange={(e) => {
              const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
              handleRowChange(index, 'looseUnitQty', isNaN(val) ? 0 : val);
            }}
            min={0}
            disabled={isProduct}
            onWheel={(e) => e.currentTarget.blur()}
            style={{ width: '100%' }}
            title={isProduct ? 'Loose quantity not allowed for Product category' : ''}
          />
        );
      },
    },
    {
      title: 'UNIT COST',
      key: 'unitCost',
      width: 100,
      render: (_: any, record: StockItem, index: number) => (
        <Input
          type="number"
          step="0.01"
          value={record.unitCost}
          onChange={(e) => {
            const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
            handleRowChange(index, 'unitCost', isNaN(val) ? 0 : val);
          }}
          min={0}
          onWheel={(e) => e.currentTarget.blur()}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'TOTAL COST',
      dataIndex: 'totalCost',
      key: 'totalCost',
      width: 100,
      render: (amount: number) => `Rs. ${amount.toFixed(2)}`,
    },
    {
      title: 'BATCH',
      key: 'batchNumber',
      width: 100,
      render: (_: any, record: StockItem, index: number) => (
        <Input
          value={record.batchNumber}
          onChange={(e) => handleRowChange(index, 'batchNumber', e.target.value)}
          placeholder="Batch"
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'EXP',
      key: 'expiryDate',
      width: 120,
      render: (_: any, record: StockItem, index: number) => (
        <DatePicker
          value={record.expiryDate ? dayjs(record.expiryDate) : null}
          onChange={(date) => handleRowChange(index, 'expiryDate', date?.format('YYYY-MM-DD') || '')}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Action',
      key: 'action',
      width: 80,
      render: (_: any, _record: StockItem, index: number) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeRow(index)}
          disabled={rows.length <= 1}
        />
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-6">
      <Breadcrumb pageName="Add New Stock" />
      
    
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          documentNumber: `100${Date.now().toString().slice(-4)}`,
          date: dayjs(),
          supplierInvoiceDate: dayjs(),
        }}
      >

        {/* Document Details */}
        <Card 
          title={
            <div className="flex items-center">
              <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="font-bold text-gray-800">Document Details</span>
            </div>
          }
          className="mb-6 rounded-xl shadow-md border border-gray-200"
        >
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item
                label="Document Number"
                name="documentNumber"
                rules={[{ required: true, message: 'Please enter document number' }]}
              >
                <Input placeholder="Document Number" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                label="Date"
                name="date"
                rules={[{ required: true, message: 'Please select date' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                label="Supplier"
                name="supplierId"
                rules={[{ required: true, message: 'Please select supplier' }]}
              >
                <Select
                  showSearch
                  placeholder="Search by name or phone.."
                  onChange={() => {}}
                  filterOption={(input, option) =>
                    (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {suppliersList.map(supplier => (
                    <Option key={supplier._id} value={supplier._id}>
                      {supplier.name} - {supplier.phone}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                label="Supplier Invoice Date"
                name="supplierInvoiceDate"
                rules={[{ required: true, message: 'Please select invoice date' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                label="Supplier Invoice #"
                name="supplierInvoiceNumber"
              >
                <Input placeholder="Supplier Invoice Number" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Add Attachments">
                <Upload>
                  <Button icon={<UploadOutlined />}>Add Attachment</Button>
                </Upload>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Items Section */}
        <Card 
          title={
            <div className="flex items-center">
              <svg className="w-5 h-5 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <span className="font-bold text-gray-800">Stock Items</span>
            </div>
          }
          className="mb-6 rounded-xl shadow-md border border-gray-200"
        >
          <div className="mb-4 flex items-center justify-between">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={addRow}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 border-none rounded-lg shadow-md"
            >
              + Add Item
            </Button>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Please select an item and enter quantity for all rows</span>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <Table
              columns={columns}
              dataSource={rows}
              rowKey="id"
              pagination={false}
              scroll={{ x: 1500 }}
              size="small"
              rowClassName={(record) => {
                // Highlight rows with missing item or quantity
                if (!record.pharmItemId || !record.quantity || record.quantity <= 0) {
                  return 'bg-red-50 border-l-4 border-red-500';
                }
                return '';
              }}
            />
          </div>
        </Card>

        {/* Summary Section */}
        <Card 
          title={
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span className="font-bold text-gray-800">Financial Summary</span>
            </div>
          }
          className="mb-6 rounded-xl shadow-md border border-gray-200"
        >
          <Row gutter={16}>
            <Col span={8}>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl shadow-md border border-blue-200 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2">
                  <div className="text-xs font-bold text-white">TOTAL COST</div>
                </div>
                <div className="p-6 text-center">
                  <div className="text-3xl font-bold text-blue-600">Rs. {totalCost.toFixed(2)}</div>
                  <div className="text-xs text-gray-600 mt-1">Before tax</div>
                </div>
              </div>
            </Col>
            <Col span={8}>
              <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl shadow-md border border-green-200 overflow-hidden">
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-2">
                  <div className="text-xs font-bold text-white">TOTAL TAX (17%)</div>
                </div>
                <div className="p-6 text-center">
                  <div className="text-3xl font-bold text-green-600">Rs. {totalTax.toFixed(2)}</div>
                  <div className="text-xs text-gray-600 mt-1">Tax amount</div>
                </div>
              </div>
            </Col>
            <Col span={8}>
              <div className="bg-gradient-to-br from-purple-50 to-pink-100 rounded-xl shadow-md border border-purple-200 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2">
                  <div className="text-xs font-bold text-white">GRAND TOTAL</div>
                </div>
                <div className="p-6 text-center">
                  <div className="text-3xl font-bold text-purple-600">Rs. {grandTotal.toFixed(2)}</div>
                  <div className="text-xs text-gray-600 mt-1">Total with tax</div>
                </div>
              </div>
            </Col>
          </Row>
        </Card>

        {/* Remarks */}
        <Card 
          title={
            <div className="flex items-center">
              <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              <span className="font-bold text-gray-800">Additional Remarks</span>
            </div>
          }
          className="mb-6 rounded-xl shadow-md border border-gray-200"
        >
          <Form.Item name="remarks">
            <Input.TextArea
              rows={3}
              placeholder="Enter any additional remarks, notes, or special instructions here..."
              className="rounded-lg"
            />
          </Form.Item>
        </Card>

        {/* Submit Button */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-sm text-gray-600">
              <p className="font-medium">Ready to add this stock?</p>
              <p className="text-xs text-gray-500">Review all details before saving</p>
            </div>
            <div className="flex space-x-4">
              <Button
                htmlType="button"
                size="large"
                onClick={() => {
                  form.resetFields();
                  setRows([{ ...defaultRow, id: '1' }]);
                  setTotalCost(0);
                  setTotalTax(0);
                  setGrandTotal(0);
                  form.setFieldsValue({
                    documentNumber: `100${Date.now().toString().slice(-4)}`,
                    date: dayjs(),
                    supplierInvoiceDate: dayjs(),
                  });
                  message.success('Form reset successfully');
                }}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300 rounded-lg px-8 font-semibold"
              >
                Reset Form
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={isSubmitting}
                size="large"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 border-none rounded-lg px-12 font-bold shadow-lg"
              >
                {isSubmitting ? 'Processing...' : '✓ Save Stock'}
              </Button>
            </div>
          </div>
        </div>
      </Form>
    </div>
  );
}