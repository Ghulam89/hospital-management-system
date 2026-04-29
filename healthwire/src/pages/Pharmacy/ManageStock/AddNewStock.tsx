import { useState, useEffect } from 'react';
import { Form, Input, Button, DatePicker, Table, Card, Row, Col, message, Upload, Pagination } from 'antd';
import { PlusOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import axios from 'axios';
import { Base_url } from '../../../utils/Base_url';
import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import dayjs from 'dayjs';
import { useNavigate, useParams } from 'react-router-dom';
import { AsyncPaginate } from 'react-select-async-paginate';
import * as XLSX from 'xlsx';

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
  retailPrice: number;
  totalCost: number;
  itemTax: number;
  batchNumber: string;
  expiryDate: string;
}

interface SelectOption {
  value: string;
  label: string;
  [key: string]: any;
}

interface LoadOptionsResult {
  options: SelectOption[];
  hasMore: boolean;
  additional?: {
    page: number;
  };
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
  retailPrice: 0,
  totalCost: 0,
  itemTax: 0,
  batchNumber: '',
  expiryDate: '',
};

export default function AddNewStock() {
  const [form] = Form.useForm();
  const [rows, setRows] = useState<StockItem[]>([{ ...defaultRow, id: '1' }]);
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingDoc, setIsLoadingDoc] = useState(false);
  const [itemsList, setItemsList] = useState<any[]>([]);
  const [suppliersList, setSuppliersList] = useState<any[]>([]);
  const [manufacturerNameById, setManufacturerNameById] = useState<Record<string, string>>({});
  const [categoryNameById, setCategoryNameById] = useState<Record<string, string>>({});
  const [rackNameById, setRackNameById] = useState<Record<string, string>>({});
  const [totalCost, setTotalCost] = useState(0);
  const [totalTax, setTotalTax] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);
  const [totalItemTax, setTotalItemTax] = useState(0);
  const [totalGlobalTax, setTotalGlobalTax] = useState(0);
  const [taxRateInput, setTaxRateInput] = useState<string>('');
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const loadPurchaseOrderOptions = async (search: string, loadedOptions: any, { page }: any) => {
    try {
      const supplierIdObj = form.getFieldValue('supplierId');
      const supplierId = supplierIdObj?.value || supplierIdObj;

      const params: any = {
        page,
        limit: 10,
        status: 'Delivered', // Only show delivered purchase orders
      };

      if (String(search || '').trim()) {
        params.search = search;
      }

      if (supplierId) {
        params.supplierId = supplierId;
      }

      const response = await axios.get(`${Base_url}/apis/pharmPurchaseOrder/get`, {
        params,
      });

      const data = response.data?.data || [];
      const hasMore = response.data?.totalPages > page;

      return {
        options: data.map((po: any) => ({
          value: po._id,
          label: `${po.purchaseOrderNumber} - ${po.supplierId?.name || 'Unknown'} (${dayjs(po.orderDate).format('DD/MM/YYYY')})`,
          poData: po,
        })),
        hasMore,
        additional: {
          page: page + 1,
        },
      };
    } catch (error) {
      return {
        options: [],
        hasMore: false,
      };
    }
  };

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(rows.length / tablePageSize));
    if (tablePage > maxPage) setTablePage(maxPage);
  }, [rows.length, tablePage, tablePageSize]);

  const handlePurchaseOrderSelect = (option: any) => {
    if (option && option.poData) {
      const po = option.poData;
      
      // Set form fields
      form.setFieldsValue({
        supplierInvoiceNumber: po.purchaseOrderNumber, // Use PO number as reference initially
        // supplierInvoiceDate: dayjs(), // Default to today as invoice date
        supplierId: po.supplierId ? { value: po.supplierId._id, label: po.supplierId.name } : null,
      });
      
      // Auto-load items if they exist
      if (po.items && po.items.length > 0) {
        const mappedRows: StockItem[] = po.items.map((it: any, idx: number) => {
          const itemDoc = it?.pharmItemId || {};
          // Map PO unitsRequired to quantity
          // PO items structure: { pharmItemId: Object, unitsRequired: Number, unitCost: Number, ... }
          
          return {
            ...defaultRow,
            id: String(idx + 1),
            pharmItemId: itemDoc._id,
            itemName: itemDoc.name,
            manufacturer: itemDoc.pharmManufacturerId?.name || '',
            b2bCategory: itemDoc.pharmCategoryId?.name || '',
            rack: itemDoc.pharmRackId?.name || '',
            conversionUnit: Number(itemDoc.conversionUnit) || 1,
            unit: itemDoc.unit || 'Pack',
            availableQty: Number(itemDoc.availableQuantity) || 0,
            quantity: Number(it.unitsRequired) || 0, // Load ordered quantity
            looseUnitQty: 0,
            unitCost: Number(it.unitCost) || 0,
            retailPrice: Number(itemDoc.retailPrice) || 0,
            totalCost: (Number(it.unitsRequired) || 0) * (Number(it.unitCost) || 0),
            itemTax: 0,
            batchNumber: '',
            expiryDate: '',
          };
        });
        setRows(mappedRows);
        calculateTotals(mappedRows);
        message.success(`Loaded ${mappedRows.length} items from Purchase Order`);
      }
    }
  };

  const getNameFromRef = (
    ref: any,
    fallbackById: Record<string, string>,
    fallbackText?: string
  ) => {
    const id =
      typeof ref === 'object' && ref !== null
        ? String(ref?._id || '').trim()
        : String(ref || '').trim();
    const name =
      typeof ref === 'object' && ref !== null ? String(ref?.name || '').trim() : '';
    return name || fallbackById[id] || String(fallbackText || '').trim();
  };

  const getRowIndexById = (rowId: string) => rows.findIndex((r) => r.id === rowId);

  const calculateRowTotalCost = (row: StockItem) => {
    const quantity = Number(row.quantity) || 0;
    const loose = Number(row.looseUnitQty) || 0;
    const unitCost = Number(row.unitCost) || 0;
    const conversionUnit = Math.max(1, Number(row.conversionUnit) || 1);
    const pieceCost = unitCost / conversionUnit;
    const total = quantity * unitCost + loose * pieceCost;
    return Number.isFinite(total) ? total : 0;
  };
  
  const calculateRowItemTax = (row: StockItem) => {
    const cost = calculateRowTotalCost(row);
    const percent = Math.max(0, Number(row.itemTax) || 0);
    const tax = cost * (percent / 100);
    return Number.isFinite(tax) ? tax : 0;
  };

  // Function to load items with pagination and search
  const loadItems = async (search: string, prevOptions: any, { page }: any) => {
    try {
      const response = await axios.get(`${Base_url}/apis/pharmItem/get`, {
        params: {
          search: search || '',
          page: page || 1,
          limit: 20,
        }
      });

      const data = response.data.data || [];
      const options = data.map((item: any) => {
        const manufacturer = getNameFromRef(
          item.pharmManufacturerId,
          manufacturerNameById,
          item.manufacturer || item.manufacturerName
        );
        const category = getNameFromRef(
          item.pharmCategoryId,
          categoryNameById,
          item.b2bCategory || item.category || item.categoryName
        );
        const rack = getNameFromRef(item.pharmRackId, rackNameById, item.rack);

        return {
          value: item._id,
          label: item.name,
          _manufacturerName: manufacturer,
          _categoryName: category,
          _rackName: rack,
          ...item,
        };
      });

      return {
        options,
        hasMore: data.length === 20,
        additional: {
          page: page + 1,
        },
      };
    } catch (error) {
      console.error('Error loading items:', error);
      return {
        options: [],
        hasMore: false,
      };
    }
  };

  // Function to load suppliers with pagination and search
  const loadSuppliers = async (search: string, prevOptions: any, { page }: any) => {
    try {
      const response = await axios.get(`${Base_url}/apis/pharmSupplier/get`, {
        params: {
          search: search || '',
          page: page || 1,
          limit: 20,
        }
      });

      const data = response.data.data || [];
      const options = data.map((supplier: any) => ({
        value: supplier._id,
        label: `${supplier.name} - ${supplier.phone}`,
        ...supplier
      }));

      return {
        options,
        hasMore: data.length === 20,
        additional: {
          page: page + 1,
        },
      };
    } catch (error) {
      console.error('Error loading suppliers:', error);
      return {
        options: [],
        hasMore: false,
      };
    }
  };

  // Initial data fetch for local state
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [itemsRes, suppliersRes, manufacturersRes, categoriesRes, racksRes] = await Promise.all([
          axios.get(`${Base_url}/apis/pharmItem/get?limit=10`),
          axios.get(`${Base_url}/apis/pharmSupplier/get?limit=10`),
          axios.get(`${Base_url}/apis/pharmManufacturer/get?limit=1000`),
          axios.get(`${Base_url}/apis/pharmCategory/get?limit=1000`),
          axios.get(`${Base_url}/apis/pharmRack/get?limit=1000`),
        ]);
        
        setItemsList(itemsRes.data.data || []);
        setSuppliersList(suppliersRes.data.data || []);

        const manList = manufacturersRes?.data?.data || [];
        setManufacturerNameById(
          (manList || []).reduce((acc: Record<string, string>, m: any) => {
            const id = String(m?._id || '').trim();
            const name = String(m?.name || '').trim();
            if (id && name) acc[id] = name;
            return acc;
          }, {})
        );

        const catList = categoriesRes?.data?.data || [];
        setCategoryNameById(
          (catList || []).reduce((acc: Record<string, string>, c: any) => {
            const id = String(c?._id || '').trim();
            const name = String(c?.name || '').trim();
            if (id && name) acc[id] = name;
            return acc;
          }, {})
        );

        const rackList = racksRes?.data?.data || [];
        setRackNameById(
          (rackList || []).reduce((acc: Record<string, string>, r: any) => {
            const id = String(r?._id || '').trim();
            const name = String(r?.name || '').trim();
            if (id && name) acc[id] = name;
            return acc;
          }, {})
        );
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    };
    
    fetchInitialData();
  }, []);

  useEffect(() => {
    const fetchDocForEdit = async () => {
      if (!isEditMode || !id) return;
      try {
        setIsLoadingDoc(true);
        const res = await axios.get(`${Base_url}/apis/pharmAddStock/get/${id}`);
        const doc = res?.data?.data;
        if (!doc?._id) return;

        const supplierId = doc?.supplierId?._id || doc?.supplierId;
        const supplierLabel = doc?.supplierId?.name
          ? `${doc.supplierId.name}${doc.supplierId.phone ? ` - ${doc.supplierId.phone}` : ''}`
          : '';

        form.setFieldsValue({
          documentNumber: doc.documentNumber || '',
          date: doc.date ? dayjs(doc.date) : doc.createdAt ? dayjs(doc.createdAt) : dayjs(),
          supplierId: supplierId
            ? {
                value: supplierId,
                label: supplierLabel || String(supplierId),
              }
            : null,
          supplierInvoiceDate: doc.supplierInvoiceDate ? dayjs(doc.supplierInvoiceDate) : dayjs(),
          supplierInvoiceNumber: doc.supplierInvoiceNumber || '',
          remarks: doc.remarks || '',
        });

        const items = Array.isArray(doc.items) ? doc.items : [];
        const mappedRows: StockItem[] = items.map((it: any, idx: number) => {
          const itemDoc = it?.pharmItemId || {};
          const itemId = itemDoc?._id || it?.pharmItemId;
          const itemName = itemDoc?.name || '';
          const conversionUnit = Number(itemDoc?.conversionUnit) || 1;
          const unit = itemDoc?.unit || 'Pack';
          const unitCost = Number(it?.unitCost ?? itemDoc?.unitCost) || 0;
          const retailPrice = Number(itemDoc?.retailPrice) || 0;

          const rackName =
            itemDoc?.pharmRackId?.name ||
            itemDoc?.pharmRackId?.name ||
            String(it?.rack || '').trim();

          const manufacturerName =
            itemDoc?.pharmManufacturerId?.name ||
            String(itemDoc?.manufacturer || '').trim();

          const categoryName =
            itemDoc?.pharmCategoryId?.name ||
            String(itemDoc?.b2bCategory || '').trim();

          const row: StockItem = {
            ...defaultRow,
            id: String(idx + 1),
            pharmItemId: String(itemId || '').trim(),
            itemName: String(itemName || '').trim(),
            manufacturer: String(manufacturerName || '').trim(),
            b2bCategory: String(categoryName || '').trim(),
            rack: String(rackName || '').trim(),
            conversionUnit,
            unit,
            availableQty: Number(itemDoc?.availableQuantity) || 0,
            quantity: Number(it?.quantity) || 0,
            looseUnitQty: Number(it?.looseUnitQty) || 0,
            unitCost,
            retailPrice,
            totalCost: Number(it?.totalCost) || 0,
            batchNumber: it?.batchNumber || '',
            expiryDate: it?.expiryDate ? dayjs(it.expiryDate).format('YYYY-MM-DD') : '',
          };
          row.totalCost = calculateRowTotalCost(row);
          return row;
        });

        if (mappedRows.length > 0) {
          setRows(mappedRows);
          calculateTotals(mappedRows);
        } else {
          setRows([{ ...defaultRow, id: '1' }]);
          calculateTotals([{ ...defaultRow, id: '1' }]);
        }

        const cachedItemsToAdd = items
          .map((it: any) => it?.pharmItemId)
          .filter(Boolean)
          .map((itemDoc: any) => ({
            _id: itemDoc?._id,
            name: itemDoc?.name,
            ...itemDoc,
          }))
          .filter((x: any) => x?._id);
        if (cachedItemsToAdd.length > 0) {
          setItemsList((prev) => {
            const existingIds = new Set((prev || []).map((p: any) => String(p?._id || '')));
            const merged = [...(prev || [])];
            for (const it of cachedItemsToAdd) {
              const k = String(it._id || '');
              if (k && !existingIds.has(k)) merged.push(it);
            }
            return merged;
          });
        }
      } catch (error: any) {
        message.error(error?.response?.data?.message || 'Failed to load stock document');
      } finally {
        setIsLoadingDoc(false);
      }
    };

    fetchDocForEdit();
  }, [form, id, isEditMode]);

  useEffect(() => {
    setRows((prev) => {
      let changed = false;
      const next = prev.map((row) => {
        if (!row.pharmItemId) return row;
        if (row.manufacturer && row.b2bCategory && row.rack) return row;

        const cached = itemsList.find((i) => String(i?._id || i?.value || '') === String(row.pharmItemId));
        if (!cached) return row;

        const manufacturer = row.manufacturer || getNameFromRef(
          cached.pharmManufacturerId,
          manufacturerNameById,
          cached.manufacturer || cached.manufacturerName || cached._manufacturerName
        );
        const category = row.b2bCategory || getNameFromRef(
          cached.pharmCategoryId,
          categoryNameById,
          cached.b2bCategory || cached.category || cached.categoryName || cached._categoryName
        );
        const rack = row.rack || getNameFromRef(
          cached.pharmRackId,
          rackNameById,
          cached.rack || cached._rackName
        );

        const updatedRow: StockItem = {
          ...row,
          manufacturer,
          b2bCategory: category,
          rack,
        };

        if (
          updatedRow.manufacturer !== row.manufacturer ||
          updatedRow.b2bCategory !== row.b2bCategory ||
          updatedRow.rack !== row.rack
        ) {
          changed = true;
          return updatedRow;
        }

        return row;
      });

      return changed ? next : prev;
    });
  }, [itemsList, manufacturerNameById, categoryNameById, rackNameById]);

  const handleRowChange = (rowId: string, field: string, value: any) => {
    const idx = getRowIndexById(rowId);
    if (idx < 0) return;
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
    
    // Validate: If item category is "Product", or Qty/Pack (conversionUnit) <= 1, loose quantity should not be allowed
    if (field === 'looseUnitQty' && numValue > 0) {
      const selectedItem = itemsList.find(item => item._id === currentRow.pharmItemId);
      if (selectedItem) {
        const categoryName = getNameFromRef(selectedItem.pharmCategoryId, categoryNameById).toLowerCase();
        const packSingle = (Number(currentRow.conversionUnit) || 1) <= 1;
        if (packSingle || categoryName === 'product' || categoryName.includes('product')) {
          message.warning('Loose quantity is not allowed when Qty/Pack is 1 or for Product items');
          return;
        }
      }
    }
    
    // Ensure numeric fields are never NaN
    if (['quantity', 'looseUnitQty', 'unitCost', 'retailPrice', 'totalCost', 'availableQty', 'itemTax'].includes(field)) {
      updated[idx] = { ...updated[idx], [field]: numValue || 0 };
    } else {
      updated[idx] = { ...updated[idx], [field]: value };
    }
    
    if (field === 'quantity' || field === 'unitCost' || field === 'looseUnitQty') {
      updated[idx].totalCost = calculateRowTotalCost(updated[idx]);
    }
    
    setRows(updated);
    calculateTotals(updated);
  };

  const handleItemSelect = (rowId: string, option: any) => {
    const idx = getRowIndexById(rowId);
    if (idx < 0) return;
    if (option) {
      const selectedItem = option;
      const manufacturerRef = selectedItem.pharmManufacturerId;
      const manufacturerId =
        typeof manufacturerRef === 'object' && manufacturerRef !== null
          ? String(manufacturerRef?._id || '').trim()
          : String(manufacturerRef || '').trim();
      const manufacturerName =
        (typeof manufacturerRef === 'object' && manufacturerRef !== null
          ? String(manufacturerRef?.name || '').trim()
          : '') ||
        manufacturerNameById[manufacturerId] ||
        String(selectedItem?.manufacturer || selectedItem?.manufacturerName || '').trim();

      const categoryRef = selectedItem.pharmCategoryId;
      const categoryId =
        typeof categoryRef === 'object' && categoryRef !== null
          ? String(categoryRef?._id || '').trim()
          : String(categoryRef || '').trim();
      const categoryName =
        (typeof categoryRef === 'object' && categoryRef !== null
          ? String(categoryRef?.name || '').trim()
          : '') ||
        categoryNameById[categoryId] ||
        String(selectedItem?.b2bCategory || selectedItem?.category || selectedItem?.categoryName || '').trim();

      const rackRef = selectedItem.pharmRackId;
      const rackId =
        typeof rackRef === 'object' && rackRef !== null
          ? String(rackRef?._id || '').trim()
          : String(rackRef || '').trim();
      const rackName =
        (typeof rackRef === 'object' && rackRef !== null
          ? String(rackRef?.name || '').trim()
          : '') ||
        rackNameById[rackId] ||
        String(selectedItem?.rack || '').trim();

      const updated = [...rows];
      updated[idx] = {
        ...updated[idx],
        pharmItemId: selectedItem.value,
        itemName: String(selectedItem.name || selectedItem.label || '').trim(),
        manufacturer: manufacturerName || '',
        b2bCategory: categoryName || '',
        rack: rackName || '',
        conversionUnit: Number(selectedItem.conversionUnit) || 1,
        unit: selectedItem.unit || 'Pack',
        unitCost: Number(selectedItem.unitCost) || 0,
        retailPrice: Number(selectedItem.retailPrice) || 0,
        availableQty: Number(selectedItem.availableQuantity) || 0,
      };
      updated[idx].totalCost = calculateRowTotalCost(updated[idx]);
      setRows(updated);
      calculateTotals(updated);
      
      // Add to local cache for later use
      if (!itemsList.some(item => item._id === selectedItem.value)) {
        setItemsList(prev => [...prev, {
          _id: selectedItem.value,
          name: String(selectedItem.name || selectedItem.label || '').trim(),
          ...selectedItem
        }]);
      }
    } else {
      // Clear selection
      const updated = [...rows];
      updated[idx] = {
        ...updated[idx],
        pharmItemId: '',
        itemName: '',
        manufacturer: '',
        b2bCategory: '',
        rack: '',
        conversionUnit: 1,
        unit: 'Pack',
        availableQty: 0,
      };
      setRows(updated);
      calculateTotals(updated);
    }
  };

  const calculateTotals = (updatedRows: StockItem[], overrideRate?: number) => {
    const total = updatedRows.reduce((sum, row) => {
      const cost = Number(row.totalCost) || 0;
      return sum + (isNaN(cost) ? 0 : cost);
    }, 0);
    const rate = Math.max(0, Number(overrideRate !== undefined ? overrideRate : (parseFloat(taxRateInput) || 0)));
    const taxFromItems = updatedRows.reduce((sum, row) => sum + calculateRowItemTax(row), 0);
    const percentTax = total * (rate / 100);
    const tax = (Number.isFinite(taxFromItems) ? taxFromItems : 0) + (Number.isFinite(percentTax) ? percentTax : 0);
    const grand = total + tax;
    
    setTotalCost(isNaN(total) ? 0 : total);
    setTotalTax(isNaN(tax) ? 0 : tax);
    setGrandTotal(isNaN(grand) ? 0 : grand);
    setTotalItemTax(isNaN(taxFromItems) ? 0 : taxFromItems);
    setTotalGlobalTax(isNaN(percentTax) ? 0 : percentTax);
  };

  const addRow = () => {
    const newId = (rows.length + 1).toString();
    setRows([...rows, { ...defaultRow, id: newId }]);
  };

  const removeRow = (rowId: string) => {
    if (rows.length > 1) {
      const updated = rows.filter((r) => r.id !== rowId);
      setRows(updated);
      calculateTotals(updated);
    }
  };

  const handleSubmit = async (values: any) => {
    // Validate items before submission
    const validItems = rows.filter(
      (row) => row.pharmItemId && ((Number(row.quantity) || 0) > 0 || (Number(row.looseUnitQty) || 0) > 0)
    );
    
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
        supplierId: values.supplierId?.value || values.supplierId,
        supplierInvoiceDate: values.supplierInvoiceDate.format('YYYY-MM-DD'),
        supplierInvoiceNumber: values.supplierInvoiceNumber,
        items: validItems.map(row => {
          const quantity = Number(row.quantity);
          const looseUnitQty = Number(row.looseUnitQty);
          const unitCost = Number(row.unitCost);
          const totalCost = calculateRowTotalCost(row);
          const itemTaxAmount = calculateRowItemTax(row);
          const conversionUnit = Math.max(1, Number(row.conversionUnit) || 1);
          
          // Validate that all numbers are valid (not NaN)
          if (isNaN(quantity) || quantity < 0) {
            throw new Error(`Invalid quantity for item: ${row.itemName || row.pharmItemId}`);
          }
          if (isNaN(looseUnitQty) || looseUnitQty < 0) {
            throw new Error(`Invalid loose unit quantity for item: ${row.itemName || row.pharmItemId}`);
          }
          if (isNaN(unitCost) || unitCost < 0) {
            throw new Error(`Invalid unit cost for item: ${row.itemName || row.pharmItemId}`);
          }
          if (isNaN(totalCost) || totalCost < 0) {
            throw new Error(`Invalid total cost for item: ${row.itemName || row.pharmItemId}`);
          }
          
          return {
            pharmItemId: row.pharmItemId,
            quantity: quantity,
            looseUnitQty: conversionUnit <= 1 ? 0 : looseUnitQty,
            unitCost: unitCost,
            totalCost: totalCost,
            itemTax: itemTaxAmount,
            batchNumber: row.batchNumber || '',
            expiryDate: row.expiryDate || '',
            rack: row.rack || '',
          };
        }),
        totalCost: isNaN(Number(totalCost)) ? 0 : Number(totalCost),
        totalTax: isNaN(Number(totalTax)) ? 0 : Number(totalTax),
        grandTotal: isNaN(Number(grandTotal)) ? 0 : Number(grandTotal),
        remarks: values.remarks || '',
      };

      if (isEditMode && id) {
        await axios.put(`${Base_url}/apis/pharmAddStock/update/${id}`, stockData);
      } else {
        await axios.post(`${Base_url}/apis/pharmAddStock/create`, stockData);
      }

      const retailUpdates = new Map<string, number>();
      for (const row of validItems) {
        const price = Number(row.retailPrice) || 0;
        if (price > 0) {
          retailUpdates.set(row.pharmItemId, price);
        }
      }

      if (retailUpdates.size > 0) {
        const results = await Promise.allSettled(
          Array.from(retailUpdates.entries()).map(([itemId, retailPrice]) =>
            axios.put(`${Base_url}/apis/pharmItem/update/${itemId}`, { retailPrice })
          )
        );
        const failed = results.filter((r) => r.status === 'rejected').length;
        if (failed > 0) {
          message.warning(`${failed} item(s) retail price update failed`);
        }
      }

      message.success(isEditMode ? 'Stock updated successfully!' : 'Stock added successfully!');
      navigate('/admin/pharmacy/stocks');
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
      width: 420,
      render: (_: any, record: StockItem) => (
        <AsyncPaginate
          value={record.pharmItemId ? {
            value: record.pharmItemId,
            label: record.itemName,
          } : null}
          loadOptions={loadItems}
          onChange={(option) => handleItemSelect(record.id, option)}
          placeholder="Search for Items"
          formatOptionLabel={(option: any) => (
            <div>
              <div style={{ fontWeight: 600 }}>{option?.name || option?.label || ''}</div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>
                {(option?._manufacturerName || option?.pharmManufacturerId?.name || 'N/A')}{' '}
                | {(option?._categoryName || option?.pharmCategoryId?.name || 'N/A')}{' '}
                | {(option?._rackName || option?.pharmRackId?.name || 'N/A')}
              </div>
            </div>
          )}
          additional={{
            page: 1,
          }}
          debounceTimeout={300}
          isClearable
          styles={{
            control: (provided) => ({
              ...provided,
              minHeight: '32px',
              fontSize: '14px',
              borderColor: '#d9d9d9',
              width: '100%',
            }),
            menuPortal: (provided) => ({
              ...provided,
              zIndex: 999999,
            }),
          }}
          menuPortalTarget={document.body}
          menuPosition="fixed"
          className="react-select-async"
        />
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
      render: (_: any, record: StockItem) => (
        <Input
          type="number"
          step="0.01"
          value={record.quantity}
          onChange={(e) => {
            const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
            handleRowChange(record.id, 'quantity', isNaN(val) ? 0 : val);
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
      render: (_: any, record: StockItem) => {
        const selectedItem = itemsList.find(item => item._id === record.pharmItemId);
        const categoryName = selectedItem ? getNameFromRef(selectedItem.pharmCategoryId, categoryNameById).toLowerCase() : '';
        const isProduct = categoryName === 'product' || categoryName.includes('product');
        const isPackSingle = (Number(record.conversionUnit) || 1) <= 1;
        
        return (
          <Input
            type="number"
            step="0.01"
            value={record.looseUnitQty}
            onChange={(e) => {
              const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
              handleRowChange(record.id, 'looseUnitQty', isNaN(val) ? 0 : val);
            }}
            min={0}
            disabled={isProduct || isPackSingle}
            onWheel={(e) => e.currentTarget.blur()}
            style={{ width: '100%' }}
            title={(isProduct || isPackSingle) ? 'Loose quantity not allowed when Qty/Pack is 1 or for Product items' : ''}
          />
        );
      },
    },
    {
      title: 'UNIT COST',
      key: 'unitCost',
      width: 100,
      render: (_: any, record: StockItem) => (
        <Input
          type="number"
          step="0.01"
          value={record.unitCost}
          onChange={(e) => {
            const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
            handleRowChange(record.id, 'unitCost', isNaN(val) ? 0 : val);
          }}
          min={0}
          onWheel={(e) => e.currentTarget.blur()}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'ITEM TAX (%)',
      key: 'itemTax',
      width: 110,
      render: (_: any, record: StockItem) => (
        <Input
          type="number"
          step="0.01"
          value={(Number(record.itemTax || 0) > 0) ? record.itemTax : ''}
          onChange={(e) => {
            const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
            handleRowChange(record.id, 'itemTax', isNaN(val) ? 0 : val);
          }}
          min={0}
          max={100}
          onWheel={(e) => e.currentTarget.blur()}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'RETAIL PRICE',
      key: 'retailPrice',
      width: 110,
      render: (_: any, record: StockItem) => (
        <Input
          type="number"
          step="0.01"
          value={record.retailPrice}
          onChange={(e) => {
            const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
            handleRowChange(record.id, 'retailPrice', isNaN(val) ? 0 : val);
          }}
          min={0}
          onWheel={(e) => e.currentTarget.blur()}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'TOTAL COST',
      key: 'totalCost',
      width: 100,
      render: (_: any, record: StockItem) => {
        const beforeTax = Number(record.totalCost || 0);
        const itemTaxAmount = calculateRowItemTax(record);
        return `Rs. ${(beforeTax + itemTaxAmount).toFixed(2)}`;
      },
    },
    {
      title: 'BATCH',
      key: 'batchNumber',
      width: 100,
      render: (_: any, record: StockItem) => (
        <Input
          value={record.batchNumber}
          onChange={(e) => handleRowChange(record.id, 'batchNumber', e.target.value)}
          placeholder="Batch"
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'EXP',
      key: 'expiryDate',
      width: 120,
      render: (_: any, record: StockItem) => (
        <DatePicker
          value={record.expiryDate ? dayjs(record.expiryDate) : null}
          onChange={(date) => handleRowChange(record.id, 'expiryDate', date?.format('YYYY-MM-DD') || '')}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Action',
      key: 'action',
      width: 80,
      render: (_: any, record: StockItem) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeRow(record.id)}
          disabled={rows.length <= 1}
        />
      ),
    },
  ];

  const startIndex = (tablePage - 1) * tablePageSize;
  const pagedRows = rows.slice(startIndex, startIndex + tablePageSize);

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-6">
      <Breadcrumb pageName={isEditMode ? "Edit Stock" : "Add New Stock"} />
      
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        disabled={isLoadingDoc}
        initialValues={{
          documentNumber: `100${Date.now().toString().slice(-4)}`,
          date: dayjs(),
          supplierInvoiceDate: dayjs(),
        }}
      >

        {/* Invoice Details */}
        <Card 
          title={
            <div className="flex items-center">
              <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="font-bold text-gray-800">Invoice Details</span>
            </div>
          }
          className="mb-6 rounded-xl shadow-md border border-gray-200"
        >
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item
                label="Invoice Number"
                name="documentNumber"
                rules={[{ required: true, message: 'Please enter invoice number' }]}
              >
                <Input placeholder="Invoice Number" disabled={isEditMode} />
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
                <AsyncPaginate
                  loadOptions={loadSuppliers}
                  value={form.getFieldValue('supplierId') || null}
                  onChange={(val: any) => {
                    form.setFieldsValue({
                      supplierId: val,
                      selectedInvoice: null,
                      supplierInvoiceNumber: undefined,
                    });
                  }}
                  placeholder="Search by name or phone.."
                  additional={{
                    page: 1,
                  }}
                  debounceTimeout={300}
                  defaultOptions
                  isClearable
                  styles={{
                    control: (provided) => ({
                      ...provided,
                      minHeight: '32px',
                      fontSize: '14px',
                      borderColor: '#d9d9d9',
                    }),
                    menuPortal: (provided) => ({
                      ...provided,
                      zIndex: 999999,
                    }),
                  }}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  className="react-select-async"
                />
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
            <Col span={7}>
              <Form.Item
                label="Supplier Invoice #"
                shouldUpdate={(prev, curr) =>
                  prev.supplierId !== curr.supplierId || prev.selectedInvoice !== curr.selectedInvoice
                }
              >
                {() => (
                  <>
                    <Form.Item noStyle>
                       <AsyncPaginate
                        key={form.getFieldValue('supplierId')?.value || 'no-supplier'}
                        value={form.getFieldValue('selectedInvoice')}
                        loadOptions={loadPurchaseOrderOptions}
                        onChange={(val: any) => {
                          handlePurchaseOrderSelect(val);
                          // Force update the UI
                          form.setFieldsValue({ selectedInvoice: val });
                        }}
                        placeholder="Search Purchase Order Invoice #..."
                        additional={{
                          page: 1,
                        }}
                        debounceTimeout={300}
                        defaultOptions
                        isClearable
                        styles={{
                          control: (provided) => ({
                            ...provided,
                            minHeight: '32px',
                            fontSize: '14px',
                            borderColor: '#d9d9d9',
                          }),
                          menuPortal: (provided) => ({
                            ...provided,
                            zIndex: 999999,
                          }),
                        }}
                        menuPortalTarget={document.body}
                        menuPosition="fixed"
                        className="react-select-async"
                        // Allow custom input for new invoice numbers
                        formatCreateLabel={(inputValue) => `Use Invoice #: "${inputValue}"`}
                        onCreateOption={(inputValue) => {
                           form.setFieldsValue({ 
                             supplierInvoiceNumber: inputValue,
                             selectedInvoice: { label: inputValue, value: inputValue }
                           });
                        }}
                        isValidNewOption={() => true}
                      />
                    </Form.Item>
                    <Form.Item name="supplierInvoiceNumber" hidden>
                      <Input />
                    </Form.Item>
                    <Form.Item name="selectedInvoice" hidden>
                      <Input />
                    </Form.Item>
                  </>
                )}
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
            <Upload
              beforeUpload={() => false}
              accept=".xlsx,.xls"
              maxCount={1}
              onChange={async (info) => {
                const file = info.file.originFileObj as File | undefined;
                if (!file) return;
                try {
                  const data = await file.arrayBuffer();
                  const wb = XLSX.read(data, { type: 'array' });
                  const wsName = wb.SheetNames[0];
                  const ws = wb.Sheets[wsName];
                  const rowsJson: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
                  const nextRows: StockItem[] = [];
                  for (let i = 0; i < rowsJson.length; i++) {
                    const r = rowsJson[i];
                    const name = String(r['Item Name'] || r['Name'] || r['Item'] || '').trim();
                    if (!name) continue;
                    const qty = Number(r['Quantity'] || r['Qty'] || 0) || 0;
                    const loose = Number(r['Loose Unit Qty'] || r['Loose'] || 0) || 0;
                    const unitCost = Number(r['Unit Cost'] || r['Cost'] || 0) || 0;
                const itemTax = Number(r['Tax'] || r['Item Tax'] || 0) || 0;
                    const batchNumber = String(r['Batch'] || r['Batch Number'] || '').trim();
                    const expiryRaw = String(r['Expiry'] || r['Expiry Date'] || '').trim();
                    const rack = String(r['Rack'] || '').trim();
                    let itemRes;
                    try {
                      itemRes = await axios.get(`${Base_url}/apis/pharmItem/get`, {
                        params: { search: name, page: 1, limit: 1 },
                      });
                    } catch {}
                    const itemDoc = Array.isArray(itemRes?.data?.data) ? itemRes?.data?.data[0] : null;
                    if (!itemDoc?._id) continue;
                    const conv = Number(itemDoc?.conversionUnit) || 1;
                    const exp = expiryRaw ? dayjs(expiryRaw).isValid() ? dayjs(expiryRaw).format('YYYY-MM-DD') : '' : '';
                    nextRows.push({
                      ...defaultRow,
                      id: String(nextRows.length + 1),
                      pharmItemId: itemDoc._id,
                      itemName: itemDoc.name || name,
                      manufacturer: itemDoc?.pharmManufacturerId?.name || '',
                      b2bCategory: itemDoc?.pharmCategoryId?.name || '',
                      rack: rack || itemDoc?.pharmRackId?.name || '',
                      conversionUnit: conv,
                      unit: itemDoc?.unit || 'Pack',
                      availableQty: Number(itemDoc?.availableQuantity) || 0,
                      quantity: qty,
                      looseUnitQty: conv <= 1 ? 0 : loose,
                      unitCost: unitCost,
                      itemTax: itemTax,
                      retailPrice: Number(itemDoc?.retailPrice) || 0,
                      totalCost: (qty * unitCost) + ((conv > 1 ? loose : 0) * (unitCost / conv)),
                      batchNumber,
                      expiryDate: exp,
                    });
                  }
                  if (nextRows.length === 0) {
                    message.warning('No valid rows found in Excel');
                    return;
                  }
                  setRows(nextRows);
                  calculateTotals(nextRows);
                  message.success(`Imported ${nextRows.length} item(s) from Excel`);
                } catch (e: any) {
                  message.error('Failed to import Excel');
                }
              }}
            >
              <Button icon={<UploadOutlined />}>Import Excel</Button>
            </Upload>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Please select an item and enter quantity for all rows</span>
            </div>
          </div>
          
          <div className="overflow-x-auto relative">
            <Table
              columns={columns}
              dataSource={pagedRows}
              rowKey="id"
              pagination={false}
              scroll={{ x: 1900 }}
              size="small"
              rowClassName={(record) => {
                // Highlight rows with missing item or quantity
                const qty = Number(record.quantity) || 0;
                const loose = Number(record.looseUnitQty) || 0;
                if (!record.pharmItemId || (qty <= 0 && loose <= 0)) {
                  return 'bg-red-50 border-l-4 border-red-500';
                }
                return '';
              }}
            />
          </div>

          <div className="flex justify-end mt-3">
            <Pagination
              current={tablePage}
              pageSize={tablePageSize}
              total={rows.length}
              showSizeChanger
              pageSizeOptions={['10', '20', '50', '100']}
              showQuickJumper
              showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} items`}
              onChange={(page, pageSize) => {
                if (pageSize !== tablePageSize) {
                  setTablePage(1);
                  setTablePageSize(pageSize);
                  return;
                }
                setTablePage(page);
              }}
              onShowSizeChange={(_page, pageSize) => {
                setTablePage(1);
                setTablePageSize(pageSize);
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
                  <div className="text-xs font-bold text-white">TOTAL TAX</div>
                </div>
                <div className="p-6 text-center">
                  <div className="text-3xl font-bold text-green-600">Rs. {totalGlobalTax.toFixed(2)}</div>
                  <div className="text-xs text-gray-600 mt-1">Tax amount</div>
                  <div className="text-xs text-gray-500 mt-1">Item Tax: Rs. {totalItemTax.toFixed(2)}</div>
                  <div className="mt-3">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      value={rows.some(r => r.pharmItemId) ? taxRateInput : ''}
                      placeholder="Tax %"
                      disabled={!rows.some(r => r.pharmItemId)}
                      onChange={(e) => {
                        const valStr = e.target.value;
                        setTaxRateInput(valStr);
                        const valNum = valStr === '' ? 0 : parseFloat(valStr);
                        const rate = isNaN(valNum) ? 0 : Math.max(0, Math.min(100, valNum));
                        calculateTotals(rows, rate);
                      }}
                    />
                    <div className="text-xs text-gray-500 mt-1">Tax %</div>
                  </div>
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
                  setTotalItemTax(0);
                  setTotalGlobalTax(0);
                  setTaxRateInput('');
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
                {isSubmitting ? 'Processing...' : isEditMode ? '✓ Update Stock' : '✓ Save Stock'}
              </Button>
            </div>
          </div>
        </div>
      </Form>

      {/* Add CSS styles for react-select-async-paginate */}
      <style jsx global>{`
        /* Fix for React Select dropdown - HIGHEST PRIORITY */
        .react-select__menu {
          z-index: 999999 !important;
        }
        
        .react-select__menu-portal {
          z-index: 999999 !important;
        }
        
        /* Ensure the menu portal has fixed positioning */
        .react-select__menu-portal > div {
          position: fixed !important;
        }
        
        /* Fix for Ant Design table cells */
        .ant-table-cell {
          position: static !important;
          overflow: visible !important;
        }
        
        .ant-table-tbody > tr > td {
          position: relative !important;
          z-index: auto !important;
          overflow: visible !important;
        }
        
        /* Ensure table doesn't create stacking context */
        .ant-table-container {
          position: static !important;
          overflow: visible !important;
        }
        
        .ant-table-wrapper {
          position: relative !important;
          z-index: 1 !important;
          overflow: visible !important;
        }
        
        
        
        /* Higher specificity for AsyncPaginate */
        .react-select-async .react-select__menu {
          z-index: 999999 !important;
        }
        
        /* Make sure parent containers don't clip */
        .ant-card-body {
          overflow: visible !important;
        }
        
        /* Fix for any modal or drawer if present */
        .ant-modal-wrap,
        .ant-drawer-wrap {
          z-index: 1000 !important;
        }
        
        /* React Select menu should be above everything */
        .react-select__menu {
          z-index: 999999 !important;
          position: fixed !important;
        }
        
        /* Additional safety for very high z-index */
        .react-select__menu * {
          z-index: 999999 !important;
        }
      `}</style>
    </div>
  );
}
