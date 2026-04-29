import React, { useEffect, useRef, useState } from 'react';
import { Form, Input, Select, DatePicker, Button, Table, Space, message, Card, Row, Col, Modal, Radio } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import axios from 'axios';
import { Base_url } from '../../../utils/Base_url';
import dayjs from 'dayjs';
import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import { useParams } from 'react-router-dom';
import { AsyncPaginate, type LoadOptions } from 'react-select-async-paginate';

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

type PharmItemOption = {
  label: string;
  value: string;
  itemData: PharmItem;
};

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
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [grandTotal, setGrandTotal] = useState(0);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [loadModalOpen, setLoadModalOpen] = useState(false);
  const [loadMode, setLoadMode] = useState<'all' | 'latest' | 'po'>('all');
  const [selectedPO, setSelectedPO] = useState<any>(null);

  const fetchNextPONumber = async () => {
    try {
      const response = await axios.get(`${Base_url}/apis/pharmPurchaseOrder/next-po-number`);
      if (response.data && response.data.status === 'ok') {
        form.setFieldsValue({
          purchaseOrderNumber: response.data.nextPONumber
        });
      }
    } catch (error) {
      console.error('Error fetching next PO number:', error);
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      setIsDataLoaded(false);
      try {
        const promises = [fetchSuppliers()];
        if (isEditMode && id) {
          promises.push(fetchPurchaseOrder(id));
        } else {
          promises.push(fetchNextPONumber());
        }
        await Promise.all(promises);
      } finally {
        setIsDataLoaded(true);
      }
    };

    loadInitialData();
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
          supplierId: orderData.supplierId?._id
            ? {
                value: orderData.supplierId._id,
                label: `${orderData.supplierId.name}${orderData.supplierId.phone ? ` - ${orderData.supplierId.phone}` : ''}`,
              }
            : null,
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

  // Legacy fetchSuppliers function for backward compatibility if needed
  const fetchSuppliers = async () => {
    try {
      const response = await axios.get(`${Base_url}/apis/pharmSupplier/get`, {
        params: { limit: 100 } // Load more suppliers for legacy usage
      });
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

  const latestSupplierIdRef = useRef<string>('');

  const fetchItemsBySupplier = async (
    supplierId: string,
    opts?: { zeroOnly?: boolean; from?: string; to?: string; projectDays?: number }
  ) => {
    try {
      latestSupplierIdRef.current = supplierId;
      setItems([{
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
      }]);

      setLoading(true);
      const limit = 2000; 
      const response = await axios.get(`${Base_url}/apis/pharmItem/get`, {
        params: { pharmSupplierId: supplierId, page: 1, limit }
      });

      const raw = response?.data || {};
      const list =
        Array.isArray(raw?.data) ? raw.data :
        Array.isArray(raw?.data?.data) ? raw.data.data :
        Array.isArray(raw) ? raw : [];

      if (list) {
        if (latestSupplierIdRef.current !== supplierId) {
          return;
        }
        const directDocs = Array.isArray(list) ? list : [];
        let poFetched: any[] = [];
        try {
          const poRes = await axios.get(`${Base_url}/apis/pharmPurchaseOrder/get`, {
            params: { supplierId, limit: 1000 }
          });
          const orders = Array.isArray(poRes?.data?.data) ? poRes.data.data : [];
          const idSet = new Set<string>();
          orders.forEach((po: any) => {
            const arr = Array.isArray(po?.items) ? po.items : [];
            arr.forEach((it: any) => {
              const raw = it?.pharmItemId;
              let pid = '';
              if (typeof raw === 'string') {
                pid = raw.trim();
              } else if (raw && typeof raw === 'object' && raw._id) {
                pid = String(raw._id).trim();
              }
              if (pid) idSet.add(pid);
            });
          });
          const ids = Array.from(idSet);
          if (ids.length > 0) {
            const chunks: string[][] = [];
            for (let i = 0; i < ids.length; i += 10) chunks.push(ids.slice(i, i + 10));
            const fetched: any[] = [];
            for (const c of chunks) {
              const resps = await Promise.all(
                c.map((pid) => axios.get(`${Base_url}/apis/pharmItem/get/${pid}`).catch(() => null))
              );
              resps.forEach((r) => {
                const d = r?.data?.data;
                if (d?._id) fetched.push(d);
              });
            }
            poFetched = fetched;
          }
        } catch {}
        const map = new Map<string, any>();
        directDocs.forEach((d: any) => { if (d?._id) map.set(String(d._id), d); });
        poFetched.forEach((d: any) => { if (d?._id && !map.has(String(d._id))) map.set(String(d._id), d); });
        const merged = Array.from(map.values());
        if (merged.length > 0) {
          let formatted = merged.map((item: any, index: number) => ({
            id: index + 1,
            pharmItemId: item._id,
            itemName: item.name,
            manufacturerName: item.pharmManufacturerId?.name || '',
            b2bCategory: item.pharmCategoryId?.name || '',
            conversionUnit: item.conversionUnit || 1,
            currentStock: item.availableQuantity || 0,
            soldQuantity: 0,
            avgSaleQuantity: 0,
            projectedSales: 0,
            unitsRequired: 0,
            unitCost: item.unitCost || 0,
            totalCost: 0,
          }));

          const hasRange = !!(opts?.from && opts?.to);
          const projDays = Number(opts?.projectDays || 0);
          if (hasRange || projDays > 0) {
            const rangeFrom = opts?.from || '';
            const rangeTo = opts?.to || '';
            const itemsCopy = [...formatted];
            const ids = itemsCopy.map((it) => String(it.pharmItemId));
            const chunkSize = 100;
            for (let i = 0; i < ids.length; i += chunkSize) {
              const chunkIds = ids.slice(i, i + chunkSize);
              const params: any = { itemIds: chunkIds.join(',') };
              if (rangeFrom && rangeTo) {
                params.from = rangeFrom;
                params.to = rangeTo;
              }
              const resp = await axios
                .get(`${Base_url}/apis/pharmItem/flow-summary`, { params })
                .catch(() => null);
              const map = resp?.data?.data || {};
              // Determine effective days window for averaging
              const fromDate = rangeFrom ? dayjs(rangeFrom, 'YYYY-MM-DD') : null;
              const toDate = rangeTo ? dayjs(rangeTo, 'YYYY-MM-DD') : null;
              let daysWindow = projDays;
              if (fromDate && toDate && toDate.isValid() && fromDate.isValid()) {
                const diff = toDate.diff(fromDate, 'day') + 1;
                daysWindow = diff > 0 ? diff : projDays;
              }
              itemsCopy.forEach((target) => {
                if (!chunkIds.includes(String(target.pharmItemId))) return;
                const row = map[String(target.pharmItemId)] || {};
                const sold = Number(row?.netSoldUnits ?? row?.soldUnits ?? 0) || 0;
                const avgPerDay = daysWindow > 0 ? sold / daysWindow : 0;
                const projected = Math.ceil(avgPerDay * (projDays > 0 ? projDays : daysWindow || 0));
                const required = Math.max(0, projected - Number(target.currentStock || 0));
                target.soldQuantity = sold;
                target.avgSaleQuantity = avgPerDay;
                target.projectedSales = projected;
                target.unitsRequired = required;
                target.totalCost = Number(target.unitCost || 0) * Number(target.unitsRequired || 0);
              });
            }
            formatted = itemsCopy;
          }

          if (opts && opts.zeroOnly === true) {
            formatted = formatted.filter((it: any) => Number(it.currentStock || 0) === 0);
          } else if (opts && opts.zeroOnly === false) {
            formatted = formatted.filter((it: any) => Number(it.currentStock || 0) > 0);
          }
          formatted.sort((a: any, b: any) => a.currentStock - b.currentStock);
          setItems(formatted);
          message.success(`Loaded ${formatted.length} items for supplier`);
        } else {
          message.info('No items found for this supplier');
          setItems([{
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
          }]);
        }
      }
    } catch (error) {
      console.error('Error fetching supplier items:', error);
      message.error('Failed to load supplier items');
    } finally {
      setLoading(false);
    }
  };

  const loadLastOrderAndAutofill = async (supplierId: string): Promise<boolean> => {
    try {
      latestSupplierIdRef.current = supplierId;
      const res = await axios.get(`${Base_url}/apis/pharmPurchaseOrder/get`, {
        params: { supplierId, limit: 1 }
      });
      const last = Array.isArray(res?.data?.data) ? res.data.data[0] : null;
      if (!last) return false;
      const lastSupplierId =
        typeof last?.supplierId === 'object'
          ? (last?.supplierId?._id || last?.supplierId?.toString?.() || '')
          : String(last?.supplierId || '');
      if (String(lastSupplierId) !== String(supplierId)) return false;
      if (latestSupplierIdRef.current !== supplierId) return true;
      form.setFieldsValue({
        projectDays: last.projectDays || 0,
        zeroQuantity: last.zeroQuantity ? 'Yes' : 'No',
        poCategory: last.poCategory || 'Projection Period',
        unit: last.unit || 'Pack',
        notes: last.notes || '',
      });
      const mapped: PurchaseOrderItem[] = (Array.isArray(last.items) ? last.items : []).map((it: any, idx: number) => {
        const itemDoc = it?.pharmItemId || {};
        return {
          id: idx + 1,
          pharmItemId: itemDoc?._id || it?.pharmItemId,
          itemName: itemDoc?.name || '',
          manufacturerName: it?.manufacturerName || itemDoc?.pharmManufacturerId?.name || '',
          b2bCategory: it?.b2bCategory || itemDoc?.pharmCategoryId?.name || '',
          conversionUnit: it?.conversionUnit || itemDoc?.conversionUnit || 1,
          currentStock: itemDoc?.availableQuantity || 0,
          soldQuantity: it?.soldQuantity || 0,
          avgSaleQuantity: it?.avgSaleQuantity || 0,
          projectedSales: it?.projectedSales || 0,
          unitsRequired: it?.unitsRequired || 0,
          unitCost: it?.unitCost || itemDoc?.unitCost || 0,
          totalCost: it?.totalCost || 0,
        };
      });
      if (mapped.length > 0) {
        setItems(mapped);
        calculateGrandTotal();
        message.success('Previous order data auto-filled');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const loadPOOptions: LoadOptions<any, false, { page: number }> = async (search, _prev, additional) => {
    const page = additional?.page || 1;
    try {
      const sidObj = form.getFieldValue('supplierId');
      const sid = sidObj?.value || sidObj;
      if (!sid) {
        return { options: [], hasMore: false, additional: { page: 1 } };
      }
      const res = await axios.get(`${Base_url}/apis/pharmPurchaseOrder/get`, {
        params: { supplierId: sid, search: search || '', page, limit: 10 }
      });
      const data = Array.isArray(res?.data?.data) ? res.data.data : [];
      const totalPages = Number(res?.data?.totalPages || 1);
      return {
        options: data.map((po: any) => ({
          value: po._id,
          label: `${po.purchaseOrderNumber}`,
          po
        })),
        hasMore: page < totalPages,
        additional: { page: page + 1 }
      };
    } catch {
      return { options: [], hasMore: false, additional: { page: 1 } };
    }
  };

  const handleLoadData = async () => {
    try {
      const sidObj = form.getFieldValue('supplierId');
      const sid = sidObj?.value || sidObj;
      if (!sid) {
        message.warning('Please select supplier first');
        return;
      }
      if (loadMode === 'all') {
        await fetchItemsBySupplier(sid);
        setLoadModalOpen(false);
        return;
      }
      if (loadMode === 'latest') {
        const ok = await loadLastOrderAndAutofill(sid);
        if (!ok) {
          message.info('No previous order found for this supplier');
        }
        setLoadModalOpen(false);
        return;
      }
      if (loadMode === 'po') {
        const poId = selectedPO?.value || selectedPO;
        if (!poId) {
          message.warning('Select a purchase order');
          return;
        }
        latestSupplierIdRef.current = sid;
        const res = await axios.get(`${Base_url}/apis/pharmPurchaseOrder/get/${poId}`);
        const po = res?.data?.data;
        if (!po) {
          message.error('Purchase order not found');
          return;
        }
        const poSupplierId = typeof po?.supplierId === 'object' ? (po?.supplierId?._id || '') : String(po?.supplierId || '');
        if (String(poSupplierId) !== String(sid)) {
          message.error('Selected PO does not belong to this supplier');
          return;
        }
        form.setFieldsValue({
          projectDays: po.projectDays || 0,
          zeroQuantity: po.zeroQuantity ? 'Yes' : 'No',
          poCategory: po.poCategory || 'Projection Period',
          unit: po.unit || 'Pack',
          notes: po.notes || '',
        });
        const mapped = (Array.isArray(po.items) ? po.items : []).map((it: any, idx: number) => {
          const itemDoc = it?.pharmItemId || {};
          return {
            id: idx + 1,
            pharmItemId: itemDoc?._id || it?.pharmItemId,
            itemName: itemDoc?.name || '',
            manufacturerName: it?.manufacturerName || itemDoc?.pharmManufacturerId?.name || '',
            b2bCategory: it?.b2bCategory || itemDoc?.pharmCategoryId?.name || '',
            conversionUnit: it?.conversionUnit || itemDoc?.conversionUnit || 1,
            currentStock: itemDoc?.availableQuantity || 0,
            soldQuantity: it?.soldQuantity || 0,
            avgSaleQuantity: it?.avgSaleQuantity || 0,
            projectedSales: it?.projectedSales || 0,
            unitsRequired: it?.unitsRequired || 0,
            unitCost: it?.unitCost || itemDoc?.unitCost || 0,
            totalCost: it?.totalCost || 0,
          } as PurchaseOrderItem;
        });
        setItems(mapped.length ? mapped : [{
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
        }]);
        calculateGrandTotal();
        setLoadModalOpen(false);
        return;
      }
    } catch {
      message.error('Failed to load data');
    }
  };

  const handleGetData = async () => {
    const sidObj = form.getFieldValue('supplierId');
    const sid = sidObj?.value || sidObj;
    if (!sid) {
      message.warning('Please select supplier first');
      return;
    }
    const zq = form.getFieldValue('zeroQuantity');
    const zeroOnly = zq === 'Yes' || zq === true;
    const projectDaysRaw = Number(form.getFieldValue('projectDays') || 0);
    const orderDate = form.getFieldValue('orderDate');
    const expectedDeliveryDate = form.getFieldValue('expectedDeliveryDate');
    const dateRange = form.getFieldValue('dateRange');
    let effectiveProjectDays = projectDaysRaw > 0 ? projectDaysRaw : 0;
    if (!effectiveProjectDays && orderDate && expectedDeliveryDate) {
      const od = dayjs(orderDate);
      const ed = dayjs(expectedDeliveryDate);
      if (od.isValid() && ed.isValid()) {
        const diff = ed.diff(od, 'day') + 1;
        effectiveProjectDays = diff > 0 ? diff : 0;
      }
    }
    let from = '';
    let to = '';
    if (dateRange && Array.isArray(dateRange) && dateRange[0] && dateRange[1]) {
      from = dayjs(dateRange[0]).format('YYYY-MM-DD');
      to = dayjs(dateRange[1]).format('YYYY-MM-DD');
    } else if (effectiveProjectDays > 0) {
      const end = dayjs();
      const start = end.subtract(effectiveProjectDays - 1, 'day');
      from = start.format('YYYY-MM-DD');
      to = end.format('YYYY-MM-DD');
    }
    await fetchItemsBySupplier(sid, {
      zeroOnly,
      from: from || undefined,
      to: to || undefined,
      projectDays: effectiveProjectDays || undefined,
    });
  };

  const loadPharmItemOptions: LoadOptions<PharmItemOption, false, { page: number }> = async (
    searchQuery,
    _loadedOptions,
    additional,
  ) => {
    const page = additional?.page || 1;
    try {
      const response = await axios.get(`${Base_url}/apis/pharmItem/get`, {
        params: {
          search: searchQuery || '',
          page,
          limit: 20,
        },
      });

      const raw = response.data || {};
      const data: PharmItem[] = Array.isArray(raw?.data)
        ? raw.data
        : Array.isArray(raw?.data?.data)
          ? raw.data.data
          : [];

      const totalPages = Number(raw?.totalPages || raw?.data?.totalPages || 1);
      const currentPage = Number(raw?.currentPage || raw?.page || page);

      return {
        options: data.map((item) => ({
          label: item.name,
          value: item._id,
          itemData: item,
        })),
        hasMore: currentPage < totalPages,
        additional: { page: currentPage + 1 },
      };
    } catch {
      return {
        options: [],
        hasMore: false,
        additional: { page },
      };
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

  const handleItemSelect = async (id: number, option: PharmItemOption | null) => {
    if (!option) {
      const updatedItems = items.map(item => {
        if (item.id === id) {
          return {
            ...item,
            pharmItemId: '',
            itemName: '',
            manufacturerName: '',
            b2bCategory: '',
            conversionUnit: 1,
            currentStock: 0,
            unitCost: 0,
            soldQuantity: 0,
            avgSaleQuantity: 0,
            projectedSales: 0,
            totalCost: 0,
          };
        }
        return item;
      });
      setItems(updatedItems);
      return;
    }

    const pharmItemId = option.value;
    const selectedItem = option.itemData;

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
        supplierId: (formValues.supplierId && formValues.supplierId.value) ? formValues.supplierId.value : formValues.supplierId,
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
      // const errorMsg = error.response?.data?.error || error.message || 'Failed to create purchase order. Please check all fields and try again.';
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
        <div style={{ width: '100%', minWidth: '280px' }}>
          <AsyncPaginate
            value={
              record.pharmItemId
                ? ({
                    value: record.pharmItemId,
                    label: record.itemName || 'Selected item',
                    itemData: {
                      _id: record.pharmItemId,
                      name: record.itemName,
                      unitCost: record.unitCost || 0,
                      availableQuantity: record.currentStock || 0,
                      conversionUnit: record.conversionUnit || 1,
                    },
                  } as PharmItemOption)
                : null
            }
            loadOptions={loadPharmItemOptions}
            onChange={(opt) => handleItemSelect(record.id, opt as PharmItemOption | null)}
            additional={{ page: 1 }}
            placeholder="Search for Items"
            classNamePrefix="react-select"
            className="w-full"
            debounceTimeout={400}
            menuPortalTarget={document.body}
            menuPosition="fixed"
            styles={{
              menuPortal: (base) => ({ ...base, zIndex: 9999 }),
              control: (base) => ({ ...base, minHeight: '32px' }),
            }}
            isClearable
          />
        </div>
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
              <AsyncPaginate
                loadOptions={loadSuppliers}
                value={form.getFieldValue('supplierId') || null}
                onChange={(val: any) => {
                  form.setFieldsValue({ supplierId: val });
                }}
                placeholder="Search by name or phone.."
                additional={{ page: 1 }}
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

      <div className="flex justify-end items-center gap-2 mt-2">
        <Button type="default" onClick={handleGetData}>
          Get Data
        </Button>
      </div>
      
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
          pagination={{
            defaultPageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            position: ['bottomRight'],
          }}
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
