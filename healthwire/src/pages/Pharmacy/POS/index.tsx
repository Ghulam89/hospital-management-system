import { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { Base_url } from '../../../utils/Base_url';
import { toast } from 'react-toastify';
import { useParams, useNavigate } from 'react-router-dom';
import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import { AsyncPaginate, LoadOptions } from 'react-select-async-paginate';
import Modal from '../../../components/modal';
import { getStoredUserForPermissions, getUserRoleSlug, hasAnyPermission } from '../../../utils/permissions';

// Enhanced type definitions
// Custom option types for AsyncPaginate
type PatientOption = {
  label: string;
  value: string;
  patientData: Patient;
};
type DoctorOption = {
  label: string;
  value: string;
  doctorData: User;
};

type Batch = {
  batchNumber: string;
  expiryDate: string;
  purchasePrice: number;
  quantity: number;
  remainingQuantity: number;
};

type PharmItem = {
  _id: string;
  name: string;
  unit: string;
  conversionUnit: number;
  availableQuantity: number;
  costPrice: number;
  unitCost: number;
  retailPrice: number;
  batches: Batch[];
  taxRate: number;
  discountAllowed: boolean;
  barcode?: string;
  pieceCost?: number;
  /** Branch inventory row used for checkout when merged with global catalog */
  sellablePharmItemId?: string | null;
  catalogMasterOnly?: boolean;
  catalogMasterId?: string | null;
  pharmManufacturerId?: {
    _id: string;
    name: string;
  } | string | null;
  pharmCategoryId?: {
    _id: string;
    name: string;
  } | string | null;
};

type Patient = {
  _id: string;
  mr: string;
  name: string;
};

type User = {
  _id: string;
  name: string;
  role: string;
};

type PosItem = {
  id: number;
  pharmItemId: string;
  itemName: string;
  unit: string;
  unitQuantity: number;
  conversionUnit: number;
  batchNumber: string;
  unitCost: number;
  rate: number;
  quantity: number;
  returnQuantity: number;
  discountMode: 'value' | 'percentage';
  discount: number;
  taxMode: 'percentage' | 'value';
  tax: number;
  netAmount: number;
  totalAmount: number;
  isReturn: boolean;
  originalInvoiceNumber?: string; // Invoice number for return items
};

type PaymentMethod = 'Cash' | 'Credit' | 'Card' | 'Bank Transfer' | 'Cheque';

type PaymentInstallment = {
  id: number;
  date: string;
  method: PaymentMethod;
  amount: number;
  reference: string;
};

function localTodayYmd(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Line discount base: % on return slice uses return qty; if return qty 0, use full sold qty. */
function posGetBaseAmountForPercent(item: PosItem): number {
  if (item.isReturn) {
    const Q = Math.max(0, Number(item.quantity) || 0);
    const R = Q > 0 ? Math.min(Math.max(0, Number(item.returnQuantity) || 0), Q) : Math.max(0, Number(item.returnQuantity) || 0);
    if (R > 0) return Math.abs(item.rate * R);
    return Math.abs(item.rate * Math.max(Q, 1));
  }
  return item.rate * item.quantity;
}

/** Sale: same as before. Return: proportional discount (same % or value scaled by return qty / reference qty). */
function posGetDiscountAmount(item: PosItem): number {
  if (item.isReturn) {
    const rq = Number(item.returnQuantity) || 0;
    if (rq <= 0) return 0;
    const base = item.rate * rq;
    const discountValue = Number(item.discount) || 0;
    if (item.discountMode === 'percentage') {
      return (base * discountValue) / 100;
    }
    const refQty = Math.max(Number(item.quantity) || 0, rq, 1);
    return (discountValue * rq) / refQty;
  }
  const base = posGetBaseAmountForPercent(item);
  const discountValue = Number(item.discount) || 0;
  if (item.discountMode === 'percentage') {
    return (base * discountValue) / 100;
  }
  return discountValue;
}

/** Full-line discount as if this row were a normal sale (qty × rate). */
function posGetFullSaleLineDiscount(item: PosItem): number {
  return posGetDiscountAmount({ ...item, isReturn: false });
}

/** Discount still affecting net after a partial/full return (for totals + payload). */
function posGetEffectiveLineDiscountForTotals(item: PosItem): number {
  if (!item.isReturn) return posGetDiscountAmount(item);
  const Q = Math.max(0, Number(item.quantity) || 0);
  const R = Q > 0 ? Math.min(Math.max(0, Number(item.returnQuantity) || 0), Q) : Math.max(0, Number(item.returnQuantity) || 0);
  const full = posGetFullSaleLineDiscount(item);
  const slice = R > 0 ? posGetDiscountAmount({ ...item, isReturn: true, returnQuantity: R }) : 0;
  return Math.max(0, full - slice);
}

/** Recalculate netAmount / totalAmount for one row (used on load and on every edit). */
function posRecalcItemTotals(item: PosItem): PosItem {
  if (item.isReturn) {
    const Q = Math.max(0, Number(item.quantity) || 0);
    const Rraw = Math.max(0, Number(item.returnQuantity) || 0);
    const R = Q > 0 ? Math.min(Rraw, Q) : Rraw;
    const fullSaleDiscount = posGetFullSaleLineDiscount(item);
    const returnSliceDiscount =
      R > 0 ? posGetDiscountAmount({ ...item, isReturn: true, returnQuantity: R }) : 0;
    const remainderDiscount = Math.max(0, fullSaleDiscount - returnSliceDiscount);
    const grossKept = item.rate * Math.max(0, Q - R);
    const netAmount = grossKept;
    const totalAmount = grossKept - remainderDiscount;
    return { ...item, returnQuantity: R, netAmount, totalAmount };
  }
  const discountAmount = posGetDiscountAmount(item);
  const netAmount = item.rate * (Number(item.quantity) || 0);
  const totalAmount = netAmount - discountAmount;
  return { ...item, netAmount, totalAmount };
}

export default function PharmacyPOS() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patientInfo, setPatientInfo] = useState<Patient | null>(null);
  const [manualPatientName, setManualPatientName] = useState('');
  const [useManualPatient, setUseManualPatient] = useState(false);
  const [referDoctor, setReferDoctor] = useState<User | null>(null);
  const [manualDoctorName, setManualDoctorName] = useState('');
  const [useManualDoctor, setUseManualDoctor] = useState(false);
  const [itemsList, setItemsList] = useState<PharmItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allowNegativeInventory, setAllowNegativeInventory] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('pharmAllowNegativeInventory');
      return v === 'true';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('pharmAllowNegativeInventory', allowNegativeInventory ? 'true' : 'false');
    } catch {}
  }, [allowNegativeInventory]);
  const [editingInvoiceNumber, setEditingInvoiceNumber] = useState<string>('');

  const permUser = useMemo(() => getStoredUserForPermissions(), []);
  const isSuperAdminRole = getUserRoleSlug(permUser) === 'superadmin';
  const canPosChangeQuantity = hasAnyPermission(permUser, 'pharmPosChangeQuantity');
  const canPosBackdateBills = hasAnyPermission(permUser, 'pharmPosBackdateBills');
  const lockQtyOnEdit = Boolean(id) && !canPosChangeQuantity;
  const paymentDateMin = !canPosBackdateBills && !id ? localTodayYmd() : undefined;

  const [posItems, setPosItems] = useState<PosItem[]>([
    {
      id: 1,
      pharmItemId: '',
      itemName: '',
      unit: 'pack',
      unitQuantity: 1,
      conversionUnit: 1,
      batchNumber: '',
      unitCost: 0,
      rate: 0,
      quantity: 1,
      returnQuantity: 0,
      discountMode: 'value',
      discount: 0,
      taxMode: 'percentage',
      tax: 0,
      netAmount: 0,
      totalAmount: 0,
      isReturn: false,
      originalInvoiceNumber: '',
    }
  ]);

  const [paymentInstallments, setPaymentInstallments] = useState<PaymentInstallment[]>([
    {
      id: 1,
      date: new Date().toISOString().split('T')[0],
      method: 'Cash',
      amount: 0,
      reference: ''
    }
  ]);

  const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [productSearchMinCost, setProductSearchMinCost] = useState('');
  const [productSearchMaxCost, setProductSearchMaxCost] = useState('');
  const [productSearchCategoryId, setProductSearchCategoryId] = useState('');
  const [productSearchManufacturerId, setProductSearchManufacturerId] = useState('');
  const [productSearchMinStock, setProductSearchMinStock] = useState('');
  const [productSearchPage, setProductSearchPage] = useState(1);
  const [productSearchPageSize, setProductSearchPageSize] = useState(20);
  const [productSearchResults, setProductSearchResults] = useState<PharmItem[]>([]);
  const [productSearchTotal, setProductSearchTotal] = useState(0);
  const [productSearchTotalPages, setProductSearchTotalPages] = useState(1);
  const [productSearchLoading, setProductSearchLoading] = useState(false);
  const [productSearchCategories, setProductSearchCategories] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [productSearchManufacturers, setProductSearchManufacturers] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [debouncedProductSearchQuery, setDebouncedProductSearchQuery] = useState('');
  const [posItemSearchInputByRowId, setPosItemSearchInputByRowId] = useState<
    Record<number, string>
  >({});
  const [activeSearchRowId, setActiveSearchRowId] = useState<number | null>(null);
  const productSearchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isProductSearchOpen) return;
    setTimeout(() => {
      productSearchInputRef.current?.focus();
    }, 0);
  }, [isProductSearchOpen]);

  useEffect(() => {
    if (!isProductSearchOpen) return;
    setProductSearchPage(1);
  }, [
    isProductSearchOpen,
    productSearchQuery,
    productSearchMinCost,
    productSearchMaxCost,
    productSearchCategoryId,
    productSearchManufacturerId,
    productSearchMinStock,
    productSearchPageSize,
  ]);

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    axios
      .get(`${Base_url}/apis/pharmPos/get/${id}`)
      .then((res) => {
        const inv = res?.data?.data;
        if (!inv) return;
        setEditingInvoiceNumber(String(inv.invoiceNumber || ''));

        // Patient
        if (inv.patientId && typeof inv.patientId === 'object' && inv.patientId._id) {
          setUseManualPatient(false);
          setPatientInfo({
            _id: String(inv.patientId._id),
            mr: String(inv.patientId.mr || ''),
            name: String(inv.patientId.name || ''),
          });
          setManualPatientName('');
        } else {
          setUseManualPatient(true);
          setPatientInfo(null);
          setManualPatientName(String(inv.patientName || ''));
        }

        // Doctor
        if (inv.referId && typeof inv.referId === 'object' && inv.referId._id) {
          setUseManualDoctor(false);
          setReferDoctor({
            _id: String(inv.referId._id),
            name: String(inv.referId.name || ''),
            role: 'doctor',
          });
          setManualDoctorName('');
        } else {
          setUseManualDoctor(true);
          setReferDoctor(null);
          setManualDoctorName(String(inv.doctorName || ''));
        }

        setRemarks(String(inv.note || ''));

        const items = Array.isArray(inv.allItem) ? inv.allItem : [];
        const invNo = String(inv.invoiceNumber || '');
        const mappedItems: PosItem[] = items.map((it: any, idx: number) => {
          const rate = Number(it?.rate || 0);
          let qty = Number(it?.quantity || 0);
          const isRet = Boolean(it?.isReturn);
          const rQty = Number(it?.returnQuantity || 0);
          if (isRet && rQty > 0 && qty < rQty) {
            qty = rQty;
          }
          let discount = Number(it?.discount || 0);
          if (isRet && rQty > 0 && rate > 0 && discount <= 0) {
            const storedTotal = Number(it?.totalAmount);
            if (storedTotal < 0) {
              const inferred = rate * rQty + storedTotal;
              if (inferred > 0.0001) discount = inferred;
            }
          }
          const convUnit = Number(it?.conversionUnit || 1);
          const unit = String(it?.unit || 'pack');
          const computedUnitQty =
            unit === 'pack'
              ? (convUnit > 0 ? qty * convUnit : qty)
              : qty;
          const unitQuantity = Number(it?.unitQuantity || 0) > 0 ? Number(it?.unitQuantity) : computedUnitQty;
          const row: PosItem = {
            id: idx + 1,
            pharmItemId:
              typeof it?.pharmItemId === 'object' && it?.pharmItemId?._id
                ? String(it.pharmItemId._id)
                : String(it?.pharmItemId || ''),
            itemName:
              typeof it?.pharmItemId === 'object' && it?.pharmItemId?.name
                ? String(it.pharmItemId.name)
                : String(it?.itemName || ''),
            unit,
            unitQuantity,
            conversionUnit: convUnit,
            batchNumber: String(it?.batchNumber || ''),
            unitCost: Number(it?.unitCost || 0),
            rate,
            quantity: qty,
            returnQuantity: rQty,
            discountMode: 'value',
            discount,
            taxMode: 'percentage',
            tax: 0,
            netAmount: 0,
            totalAmount: 0,
            isReturn: isRet,
            originalInvoiceNumber: String(
              it?.originalInvoiceNumber || (isRet ? invNo : '')
            ),
          };
          return posRecalcItemTotals(row);
        });
        setPosItems(mappedItems.length ? mappedItems : [
          {
            id: 1,
            pharmItemId: '',
            itemName: '',
            unit: 'pack',
            unitQuantity: 1,
            conversionUnit: 1,
            batchNumber: '',
            unitCost: 0,
            rate: 0,
            quantity: 1,
            returnQuantity: 0,
            discountMode: 'value',
            discount: 0,
            taxMode: 'percentage',
            tax: 0,
            netAmount: 0,
            totalAmount: 0,
            isReturn: false,
            originalInvoiceNumber: '',
          },
        ]);

        const payments = Array.isArray(inv.payment) ? inv.payment : [];
        const mappedPayments: PaymentInstallment[] = payments.map((p: any, idx: number) => ({
          id: idx + 1,
          date: String((p?.payDate || new Date().toISOString()).split('T')[0]),
          method: String(p?.method || 'Cash') as PaymentMethod,
          amount: Number(p?.paid || 0),
          reference: String(p?.reference || ''),
        }));
        setPaymentInstallments(mappedPayments.length ? mappedPayments : [{
          id: 1,
          date: new Date().toISOString().split('T')[0],
          method: 'Cash',
          amount: 0,
          reference: '',
        }]);
        const uniqueItemIds: string[] = Array.from(
          new Set(
            (Array.isArray(items) ? items : [])
              .map((it: any) =>
                typeof it?.pharmItemId === 'object' && it?.pharmItemId?._id
                  ? String(it.pharmItemId._id)
                  : String(it?.pharmItemId || '')
              )
              .filter((pid: string) => pid && pid.trim().length > 0)
          )
        );
        const missingIds = uniqueItemIds.filter(
          (pid) => !itemsList.some((i) => i._id === pid)
        );
        if (missingIds.length) {
          Promise.all(
            missingIds.map((pid) =>
              axios
                .get(`${Base_url}/apis/pharmItem/get/${pid}`)
                .then((r) => r?.data?.data || null)
                .catch(() => null)
            )
          )
            .then((fetched) => {
              const valid = fetched.filter(Boolean) as PharmItem[];
              if (valid.length) {
                setItemsList((prev) => {
                  const merged = [...prev];
                  valid.forEach((it) => {
                    if (!merged.some((m) => m._id === it._id)) merged.push(it);
                  });
                  return merged;
                });
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {
        toast.error('Failed to load invoice');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (!isProductSearchOpen) return;
    const t = setTimeout(() => {
      setDebouncedProductSearchQuery(productSearchQuery);
    }, 250);
    return () => clearTimeout(t);
  }, [isProductSearchOpen, productSearchQuery]);

  useEffect(() => {
    if (!isProductSearchOpen) return;
    if (productSearchCategories.length > 0) return;

    axios
      .get(`${Base_url}/apis/pharmCategory/get`, {
        params: { limit: 1000, sort: 'name' },
      })
      .then((res) => {
        const list = res?.data?.data || [];
        setProductSearchCategories(
          list
            .map((c: any) => ({
              id: String(c?._id || '').trim(),
              name: String(c?.name || '').trim(),
            }))
            .filter((c: any) => c.id && c.name)
        );
      })
      .catch(() => {
        setProductSearchCategories([]);
      });
  }, [isProductSearchOpen, productSearchCategories.length]);

  useEffect(() => {
    if (!isProductSearchOpen) return;
    if (productSearchManufacturers.length > 0) return;

    axios
      .get(`${Base_url}/apis/pharmManufacturer/get`, {
        params: { limit: 1000, sort: 'name' },
      })
      .then((res) => {
        const list = res?.data?.data || [];
        setProductSearchManufacturers(
          list
            .map((m: any) => ({
              id: String(m?._id || '').trim(),
              name: String(m?.name || '').trim(),
            }))
            .filter((m: any) => m.id && m.name)
        );
      })
      .catch(() => {
        setProductSearchManufacturers([]);
      });
  }, [isProductSearchOpen, productSearchManufacturers.length]);

  useEffect(() => {
    if (!isProductSearchOpen) return;
    const fetchProducts = async () => {
      setProductSearchLoading(true);
      try {
        const params: Record<string, any> = {
          page: productSearchPage,
          limit: productSearchPageSize,
          active: true,
          sort: 'name',
          catalog: '1',
        };

        const query = String(debouncedProductSearchQuery || '').trim();
        if (query) {
          params.search = query;
          params.searchFields = 'name,barcode,genericName';
        }

        const catId = String(productSearchCategoryId || '').trim();
        if (catId) {
          params.pharmCategoryId = catId;
        }

        const manufacturerId = String(productSearchManufacturerId || '').trim();
        if (manufacturerId) {
          params.pharmManufacturerId = manufacturerId;
        }

        const minStock =
          productSearchMinStock.trim() === '' ? null : Number(productSearchMinStock);
        if (minStock !== null && !Number.isNaN(minStock)) {
          params.minStock = minStock;
        }

        const minCost =
          productSearchMinCost.trim() === '' ? null : Number(productSearchMinCost);
        if (minCost !== null && !Number.isNaN(minCost)) {
          params.minCost = minCost;
        }

        const maxCost =
          productSearchMaxCost.trim() === '' ? null : Number(productSearchMaxCost);
        if (maxCost !== null && !Number.isNaN(maxCost)) {
          params.maxCost = maxCost;
        }

        const res = await axios.get(`${Base_url}/apis/pharmItem/get`, { params });
        const list = res?.data?.data || [];
        const totalPages = Number(res?.data?.totalPages || 1);
        const total =
          Number(res?.data?.count) ||
          Number(res?.data?.total) ||
          Number(res?.data?.totalItems) ||
          Number(res?.data?.totalCount) ||
          Number(res?.data?.totalRecords) ||
          0;

        setProductSearchResults(list);
        setProductSearchTotal(total || (Array.isArray(list) ? list.length : 0));
        setProductSearchTotalPages(Number.isFinite(totalPages) && totalPages > 0 ? totalPages : 1);
      } catch (error) {
        setProductSearchResults([]);
        setProductSearchTotal(0);
        setProductSearchTotalPages(1);
      } finally {
        setProductSearchLoading(false);
      }
    };

    fetchProducts();
  }, [
    isProductSearchOpen,
    productSearchPage,
    productSearchPageSize,
    productSearchCategoryId,
    productSearchManufacturerId,
    productSearchMinStock,
    productSearchMinCost,
    productSearchMaxCost,
    debouncedProductSearchQuery,
  ]);

  const applySelectedPharmItem = (rowId: number, selectedItem: PharmItem) => {
    const sel = selectedItem as PharmItem & { catalogMasterOnly?: boolean; sellablePharmItemId?: string | null };
    if (sel.catalogMasterOnly && !isSuperAdminRole) {
      toast.error('Pehle apni branch par stock add karein (Manage stock / purchase inbound).');
      return;
    }
    const saleId = sel.sellablePharmItemId || sel._id;
    const normalizedItem = { ...selectedItem, _id: String(saleId) };

    setItemsList((prev) => {
      if (prev.some((i) => i._id === normalizedItem._id)) return prev;
      return [...prev, normalizedItem];
    });

    setPosItems((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;

        const normalizedUnit = String(normalizedItem.unit || 'pack').toLowerCase();
        const conversionUnit = normalizedItem.conversionUnit || 1;
        const rate =
          normalizedUnit === 'pack'
            ? normalizedItem.retailPrice
            : conversionUnit > 0
              ? normalizedItem.retailPrice / conversionUnit
              : normalizedItem.retailPrice;
        const batchNumber = normalizedItem.batches?.[0]?.batchNumber || '';
        const unitCost =
          normalizedItem.batches?.[0]?.purchasePrice ?? normalizedItem.unitCost ?? 0;
        const tax = 0;
        const quantity = row.quantity || 1;
        const unitQuantity = quantity * conversionUnit;
        const merged: PosItem = {
          ...row,
          pharmItemId: String(saleId),
          itemName: normalizedItem.name,
          unit: normalizedUnit,
          conversionUnit,
          rate,
          batchNumber,
          unitCost,
          tax,
          unitQuantity,
          netAmount: 0,
          totalAmount: 0,
        };
        return posRecalcItemTotals(merged);
      })
    );
  };

  const loadPatientOptions: LoadOptions<PatientOption, never, { page: number }> = async (
    searchQuery,
    loadedOptions,
    additional
  ) => {
    const page = (additional && (additional as { page?: number }).page) ?? 1;
    try {
      const response = await axios.get(`${Base_url}/apis/patient/get`, {
        params: {
          page,
          limit: 20,
          search: searchQuery || '',
          sort: 'name',
        },
      });
      const { data, totalPages } = response.data;
      return {
        options: data.map((item: Patient) => ({
          label: `${item.name} (MR: ${item.mr})`,
          value: item._id,
          patientData: item,
        })),
        hasMore: page < totalPages,
        additional: { page: page + 1 },
      };
    } catch (error: any) {
      toast.error('Failed to search patients');
      return { options: [], hasMore: false, additional: { page: 1 } };
    }
  };

  const loadItemOptions = async (searchQuery: string, { page }: { page: number }) => {
    try {
      const response = await axios.get(`${Base_url}/apis/pharmItem/get`, {
        params: { 
          page, 
          limit: 20, 
          search: searchQuery || '',
          searchFields: 'name,barcode,genericName', // Search in multiple fields
          sort: 'name',
          active: true, // Only load active items
          catalog: '1',
        }
      });

      const { data, totalPages } = response.data;

      return {
        options: data.map((item: PharmItem) => {
          const meta = item as PharmItem & { catalogMasterOnly?: boolean };
          const packQty = Math.floor(item.availableQuantity / (item.conversionUnit || 1));
          const pieceQty = item.availableQuantity % (item.conversionUnit || 1);
          const qtyDisplay = item.conversionUnit > 1 
            ? `${packQty} ${item.unit || 'pack'} ${pieceQty > 0 ? `${pieceQty} piece` : ''}`.trim()
            : `${item.availableQuantity} ${item.unit || 'pack'}`;
          const catalogNote =
            meta.catalogMasterOnly && !isSuperAdminRole ? ' · catalog (stock add karein)' : '';

          return {
            label: `${item.name} ${item.barcode ? `(${item.barcode})` : ''} (${qtyDisplay} available)${catalogNote} - Rs.${item.retailPrice}`,
            value: item._id,
            isDisabled: isSuperAdminRole ? false : !!meta.catalogMasterOnly,
            itemData: item,
          };
        }),
        hasMore: page < totalPages,
        additional: { page: page + 1 },
      };
    } catch (error: any) {
      console.error('Error fetching items:', error);
      toast.error('Failed to search items');
      return { options: [], hasMore: false, additional: { page: 1 } };
    }
  };

  const loadDoctorOptions: LoadOptions<DoctorOption, never, { page: number }> = async (
    searchQuery,
    loadedOptions,
    additional
  ) => {
    const page = (additional && (additional as { page?: number }).page) ?? 1;
    try {
      const response = await axios.get(`${Base_url}/apis/user/get`, {
        params: {
          role: 'doctor',
          page,
          limit: 20,
          search: searchQuery || '',
          sort: 'name',
        },
      });
      const { data, totalPages } = response.data;
      return {
        options: data.map((item: User) => ({
          label: item.name,
          value: item._id,
          doctorData: item,
        })),
        hasMore: page < totalPages,
        additional: { page: page + 1 },
      };
    } catch (error: any) {
      toast.error('Failed to search doctors');
      return { options: [], hasMore: false, additional: { page: 1 } };
    }
  };

  const addPosItem = () => {
    if (posItems.length >= 20) {
      toast.warning('Maximum 20 items allowed per transaction');
      return;
    }
    
    setPosItems([...posItems, {
      id: posItems.length > 0 ? Math.max(...posItems.map(i => i.id)) + 1 : 1,
      pharmItemId: '',
      itemName: '',
      unit: 'pack',
      unitQuantity: 1,
      conversionUnit: 1,
      batchNumber: '',
      unitCost: 0,
      rate: 0,
      quantity: 1,
      returnQuantity: 0,
      discountMode: 'value',
      discount: 0,
      taxMode: 'percentage',
      tax: 0,
      netAmount: 0,
      totalAmount: 0,
      isReturn: false,
      originalInvoiceNumber: '',
    }]);
  };

  const removePosItem = (id: number) => {
    if (posItems.length <= 1) {
      toast.warning('At least one item is required');
      return;
    }
    setPosItems(posItems.filter(item => item.id !== id));
  };

  const getTaxAmount = (_item: PosItem) => {
    return 0;
  };

  const updatePosItem = (id: number, field: keyof PosItem, value: any) => {
    const updatedItems = posItems.map(item => {
      if (item.id !== id) return item;

      let updatedItem = { ...item, [field]: value };
      
      if (field === 'pharmItemId') {
        const selectedItem = itemsList.find(i => i._id === value);
        if (selectedItem) {
          updatedItem.itemName = selectedItem.name;
          const normalizedUnit = String(selectedItem.unit || 'pack').toLowerCase();
          updatedItem.unit = normalizedUnit;
          updatedItem.conversionUnit = selectedItem.conversionUnit || 1;
          // Set rate based on selected unit
          if (normalizedUnit === 'pack') {
            updatedItem.rate = selectedItem.retailPrice;
          } else {
            // For unit/piece, calculate rate from retail price and conversion unit
            updatedItem.rate = selectedItem.conversionUnit > 0 
              ? selectedItem.retailPrice / selectedItem.conversionUnit 
              : selectedItem.retailPrice;
          }
          updatedItem.unitCost = selectedItem.unitCost;
          updatedItem.taxMode = 'percentage';
          updatedItem.tax = selectedItem.taxRate || 0;
          // Calculate unit quantity (if quantity is in packs, unitQuantity is in units)
          updatedItem.unitQuantity = updatedItem.quantity * updatedItem.conversionUnit;
          if (selectedItem.batches?.length > 0) {
            updatedItem.batchNumber = selectedItem.batches[0].batchNumber;
            updatedItem.unitCost = selectedItem.batches[0].purchasePrice;
          }
          updatedItem = posRecalcItemTotals(updatedItem);
        }
      }
      
      // Update rate when unit changes
      if (field === 'unit' && updatedItem.pharmItemId) {
        const selectedItem = itemsList.find(i => i._id === updatedItem.pharmItemId);
        if (selectedItem) {
          if (value === 'pack') {
            updatedItem.rate = selectedItem.retailPrice;
          } else {
            // For unit/piece, calculate rate from retail price and conversion unit
            updatedItem.rate = selectedItem.conversionUnit > 0 
              ? selectedItem.retailPrice / selectedItem.conversionUnit 
              : selectedItem.retailPrice;
          }
          updatedItem = posRecalcItemTotals(updatedItem);
        }
      }
      
      if (field === 'batchNumber' && updatedItem.pharmItemId) {
        const selectedItem = itemsList.find(i => i._id === updatedItem.pharmItemId);
        if (selectedItem) {
          const selectedBatch = selectedItem.batches.find(b => b.batchNumber === value);
          if (selectedBatch) {
            updatedItem.unitCost = selectedBatch.purchasePrice;
          }
          updatedItem = posRecalcItemTotals(updatedItem);
        }
      }
      
      // Recalculate amounts when relevant fields change
      if (["quantity", "rate", "discount", "discountMode", "batchNumber", "returnQuantity"].includes(field)) {
        // Update unit quantity when quantity changes
        if (field === 'quantity') {
          updatedItem.unitQuantity = updatedItem.quantity * updatedItem.conversionUnit;
        }

        updatedItem = posRecalcItemTotals(updatedItem);
      }
      
      
      
      // Update quantity when unit quantity changes
      if (field === 'unitQuantity') {
        const selectedItem = itemsList.find(i => i._id === updatedItem.pharmItemId);
        
        // Validate: Unit quantity should not be below 1 for certain product types
        if (value < 1 && selectedItem) {
          const categoryName = (selectedItem as any).pharmCategoryId?.name?.toLowerCase() || '';
          const itemName = selectedItem.name.toLowerCase();
          
          // Check if it's a syrup, skin care, or similar product that shouldn't be sold below 1
          const restrictedCategories = ['syrup', 'skin care', 'cream', 'lotion', 'serum', 'product'];
          const restrictedKeywords = ['syrup', 'cream', 'lotion', 'serum', 'gel', 'lightening', 'cleanser', 'face wash'];
          
          const isRestricted = restrictedCategories.some(cat => categoryName.includes(cat)) ||
                              restrictedKeywords.some(keyword => itemName.includes(keyword));
          
          if (isRestricted) {
            toast.error(`Cannot sell ${selectedItem.name} below 1 quantity. Minimum quantity is 1.`);
            // Reset to minimum value of 1
            updatedItem.unitQuantity = 1;
            updatedItem.quantity = updatedItem.conversionUnit > 0 ? 1 / updatedItem.conversionUnit : 1;
            updatedItem = posRecalcItemTotals(updatedItem);
            return updatedItem;
          }
        }
        
        updatedItem.quantity = updatedItem.conversionUnit > 0 ? updatedItem.unitQuantity / updatedItem.conversionUnit : 0;
        updatedItem = posRecalcItemTotals(updatedItem);
      }
      
      if (field === 'isReturn') {
        updatedItem.returnQuantity = 0;
        if (!value) {
          updatedItem.originalInvoiceNumber = '';
        } else if (!updatedItem.originalInvoiceNumber) {
          updatedItem.originalInvoiceNumber = editingInvoiceNumber || '';
        }
        updatedItem = posRecalcItemTotals(updatedItem);
      }
      
      // Calculate profit - for return items, profit should be negative (loss)
      if (field === 'isReturn' || field === 'quantity' || field === 'rate' || field === 'unitCost' || field === 'returnQuantity') {
        if (updatedItem.isReturn && updatedItem.returnQuantity > 0) {
          updatedItem = posRecalcItemTotals(updatedItem);
        }
      }
      
      return updatedItem;
    });
    
    setPosItems(updatedItems);
  };

  const openProductSearch = (id: number) => {
    setActiveSearchRowId(id);
    const row = posItems.find((r) => r.id === id);
    const initialQuery = String(
      posItemSearchInputByRowId[id] || row?.itemName || ''
    );
    setProductSearchQuery(initialQuery);
    setDebouncedProductSearchQuery(initialQuery);
    setProductSearchMinCost('');
    setProductSearchMaxCost('');
    setProductSearchCategoryId('');
    setProductSearchManufacturerId('');
    setProductSearchMinStock('');
    setProductSearchPage(1);
    setIsProductSearchOpen(true);
  };

  const closeProductSearch = () => {
    setIsProductSearchOpen(false);
    setActiveSearchRowId(null);
  };

  const getProductCost = (item: PharmItem) => {
    const primaryBatch = item.batches?.[0];
    const raw =
      primaryBatch?.purchasePrice ??
      item.unitCost ??
      item.costPrice ??
      item.pieceCost ??
      0;
    return Number(raw) || 0;
  };

  const safeProductSearchPage = Math.min(
    Math.max(1, productSearchPage),
    Math.max(1, productSearchTotalPages)
  );
  const productSearchStartIndex =
    productSearchTotal === 0 ? 0 : (safeProductSearchPage - 1) * productSearchPageSize;
  const productSearchEndIndex = Math.min(
    productSearchStartIndex + (productSearchResults?.length || 0),
    productSearchTotal
  );

  const handleSelectProductFromSearch = (product: PharmItem) => {
    if (activeSearchRowId === null) {
      return;
    }
    setPosItemSearchInputByRowId((prev) => ({
      ...prev,
      [activeSearchRowId]: product.name,
    }));
    applySelectedPharmItem(activeSearchRowId, product);
    setIsProductSearchOpen(false);
    setActiveSearchRowId(null);
  };

  const addPaymentInstallment = () => {
    if (paymentInstallments.length >= 5) {
      toast.warning('Maximum 5 payment installments allowed');
      return;
    }
    
    setPaymentInstallments([...paymentInstallments, {
      id: paymentInstallments.length > 0 ? Math.max(...paymentInstallments.map(p => p.id)) + 1 : 1,
      date: new Date().toISOString().split('T')[0],
      method: 'Cash',
      amount: 0,
      reference: ''
    }]);
  };

  const removePaymentInstallment = (id: number) => {
    if (paymentInstallments.length <= 1) {
      toast.warning('At least one payment is required');
      return;
    }
    setPaymentInstallments(paymentInstallments.filter(item => item.id !== id));
  };

  const updatePaymentInstallment = (id: number, field: keyof PaymentInstallment, value: any) => {
    const updatedPayments = paymentInstallments.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setPaymentInstallments(updatedPayments);
  };

  const calculateSubTotal = () => {
    return posItems.reduce((sum, item) => sum + item.netAmount, 0);
  };

  const calculateTotalDiscount = () => {
    return posItems.reduce(
      (sum, item) => sum + posGetEffectiveLineDiscountForTotals(item),
      0
    );
  };

  const calculateTotalTax = () => {
    return posItems.reduce((sum, item) => {
      if (item.isReturn && item.returnQuantity > 0) {
        return sum - getTaxAmount(item);
      }
      return sum + getTaxAmount(item);
    }, 0);
  };

  const calculateGrandTotal = () => {
    return posItems.reduce((sum, item) => sum + item.totalAmount, 0);
  };

  const calculateTotalPaid = () => {
    return paymentInstallments.reduce((sum, item) => sum + item.amount, 0);
  };

  const calculateDue = () => {
    return calculateGrandTotal() - calculateTotalPaid();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Validate patient info (either selected or manual)
      if (!useManualPatient && !patientInfo) {
        toast.error('Please select a patient or enter manual patient name');
        return;
      }
      
      if (useManualPatient && !manualPatientName.trim()) {
        toast.error('Please enter patient name');
        return;
      }
      
      const rowsToValidate = posItems.map((item) => {
        if (
          item.isReturn &&
          item.returnQuantity > 0 &&
          id &&
          !(item.originalInvoiceNumber || '').trim()
        ) {
          return {
            ...item,
            originalInvoiceNumber: editingInvoiceNumber || item.originalInvoiceNumber || '',
          };
        }
        return item;
      });

      for (const item of rowsToValidate) {
        if (!item.pharmItemId) {
          toast.error(`Please select an item for row ${item.id}`);
          return;
        }
        
        const selectedItem = itemsList.find(i => i._id === item.pharmItemId);
        if (!selectedItem) {
          toast.error(`Selected item not found for row ${item.id}`);
          return;
        }
        
        const conversionUnit = selectedItem.conversionUnit || 1;
        
        // Validate: Unit quantity should not be below 1 for certain product types
        if (item.unitQuantity < 1 && !item.isReturn) {
          const categoryName = (selectedItem as any).pharmCategoryId?.name?.toLowerCase() || '';
          const itemName = selectedItem.name.toLowerCase();
          
          const restrictedCategories = ['syrup', 'skin care', 'cream', 'lotion', 'serum'];
          const restrictedKeywords = ['syrup', 'cream', 'lotion', 'serum', 'gel'];
          
          const isRestricted = restrictedCategories.some(cat => categoryName.includes(cat)) ||
                              restrictedKeywords.some(keyword => itemName.includes(keyword));
          
          if (isRestricted) {
            toast.error(`Cannot sell ${selectedItem.name} below 1 quantity`);
            setIsSubmitting(false);
            return;
          }
        }
        
        if (!item.isReturn) {
          const requestedUnits = Number(item.unitQuantity || (item.quantity * (selectedItem.conversionUnit || 1)));
          const availableUnits = Number(selectedItem.availableQuantity || 0);
          if (requestedUnits > availableUnits && !allowNegativeInventory) {
            toast.error(`Insufficient stock for ${selectedItem.name}. Available: ${availableUnits}`);
            setIsSubmitting(false);
            return;
          }
        }
        
        if (item.isReturn && item.returnQuantity > item.quantity) {
          toast.error(`Return quantity cannot exceed sold quantity for ${selectedItem.name}`);
          setIsSubmitting(false);
          return;
        }
        
        // Validate: Return items must have original invoice number
        if (item.isReturn && item.returnQuantity > 0 && !item.originalInvoiceNumber?.trim()) {
          toast.error(`Please enter original invoice number for return item: ${selectedItem.name}`);
          setIsSubmitting(false);
          return;
        }
      }
      
      const totalPaid = calculateTotalPaid();
      const grandTotal = calculateGrandTotal();
      
      const billHasPositiveNet = grandTotal > 0.000001;
      // Pure refunds (net ≤ 0) may omit payment; any bill where customer still owes must have payments.
      if (billHasPositiveNet) {
        if (totalPaid <= 0) {
          toast.error('At least one payment with positive amount is required');
          return;
        }
        
        if (paymentInstallments.some(p => p.amount <= 0)) {
          toast.error('All payment amounts must be greater than 0');
          return;
        }
      }
      
      // Get current user from localStorage
      const storedData = localStorage.getItem('userData');
      let currentUserId = null;
      
      try {
        const userData = storedData ? JSON.parse(storedData) : null;
        currentUserId = userData?._id;
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
      
      const posPayload = {
        patientId: useManualPatient ? null : patientInfo?._id,
        patientName: useManualPatient ? manualPatientName : patientInfo?.name,
        referId: useManualDoctor ? null : (referDoctor?._id || null),
        doctorName: useManualDoctor ? manualDoctorName : (referDoctor?.name || null),
        allowNegativeInventory,
        totalDiscount: calculateTotalDiscount(),
        totalTax: 0,
        due: Math.max(0, calculateDue()),
        advance: Math.max(0, -calculateDue()),
        paid: calculateTotalPaid(),
        note: remarks,
        createdBy: currentUserId,
        allItem: rowsToValidate.map(item => ({
          pharmItemId: item.pharmItemId,
          unit: item.unit,
          batchNumber: item.batchNumber,
          unitCost: item.unitCost,
          rate: item.rate,
          quantity: item.quantity,
          returnQuantity: item.isReturn ? item.returnQuantity : 0,
          discount: posGetEffectiveLineDiscountForTotals(item),
          tax: 0,
          netAmount: item.netAmount,
          totalAmount: item.totalAmount,
          isReturn: item.isReturn,
          originalInvoiceNumber: item.isReturn
            ? (item.originalInvoiceNumber?.trim() ||
                (id ? editingInvoiceNumber : '') ||
                '')
            : undefined
        })),
        payment: paymentInstallments.map(payment => ({
          method: payment.method,
          payDate: new Date(payment.date).toISOString(),
          paid: payment.amount,
          reference: payment.reference
        }))
      };
      
      const response = id
        ? await axios.put(`${Base_url}/apis/pharmPos/update/${id}`, posPayload)
        : await axios.post(`${Base_url}/apis/pharmPos/create`, posPayload);
      
      // console.log('POS response:', response.data);
      
      if (response.data.status === "ok" || response.data.status === "success") {
        const invoiceId = response.data.data?._id || id;
        toast.success(id ? 'POS invoice updated successfully!' : `POS invoice created successfully! Invoice ID: ${String(invoiceId || '').slice(-8).toUpperCase()}`);
        navigate(`/admin/pharmacy/invoices/receipt/${invoiceId}`);
      } else {
        throw new Error(response.data.message || 'Transaction failed');
      }
    } catch (error: unknown) {
      console.error('Error creating POS:', error);
      
      let errorMessage = 'Failed to create POS transaction';
      
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        // Check for error message in different possible locations
        errorMessage = axiosError.response?.data?.error || 
                       axiosError.response?.data?.message || 
                       axiosError.response?.data?.errorMessage ||
                       errorMessage;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
          </div>
          <p className="mt-4 text-gray-700 font-semibold text-lg">Loading POS System...</p>
          <p className="text-gray-500 text-sm mt-1">Please wait while we prepare everything</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-6">
      <Breadcrumb pageName="Pharmacy Point of Sale" />
    
      {id && (
        <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-semibold text-yellow-800">
            Editing existing invoice
            {lockQtyOnEdit ? (
              <span className="block mt-1 font-normal text-yellow-900">
                Sold pack / piece quantities are read-only without the &quot;POS: change quantities on bills&quot;
                permission. You can still enter <strong>return quantity</strong> and adjust payments for returns.
              </span>
            ) : null}
          </div>
          <div className="mt-2 sm:mt-0 text-xs text-yellow-700">
            Items: <span className="font-bold">{posItems.length}</span> • Payments: <span className="font-bold">{paymentInstallments.length}</span>
          </div>
        </div>
      )}
      
      {/* Patient and Doctor Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className="bg-blue-100 rounded-lg p-2 mr-3">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <label className="block text-sm font-semibold text-gray-700">
                Patient Information
              </label>
            </div>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                checked={useManualPatient}
                onChange={(e) => {
                  setUseManualPatient(e.target.checked);
                  if (e.target.checked) {
                    setPatientInfo(null);
                  } else {
                    setManualPatientName('');
                  }
                }}
              />
              <span className="ml-2 text-xs text-gray-600">Manual Entry</span>
            </label>
          </div>
          {useManualPatient ? (
            <input
              type="text"
              className="w-full rounded-lg border border-gray-300 bg-white py-3 px-4 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              placeholder="Enter patient name..."
              value={manualPatientName}
              onChange={(e) => setManualPatientName(e.target.value)}
            />
          ) : (
            <AsyncPaginate
              value={patientInfo ? {
                label: `${patientInfo.name} (MR: ${patientInfo.mr})`,
                value: patientInfo._id,
                patientData: patientInfo,
              } : null}
              onChange={(selectedOption: PatientOption | null) => setPatientInfo(selectedOption?.patientData || null)}
              loadOptions={loadPatientOptions}
              getOptionLabel={(option) => option.label}
              getOptionValue={(option) => option.value}
              placeholder="🔍 Search patient by name or MR number..."
              additional={{ page: 1 }}
              classNamePrefix="react-select"
              styles={{
                control: (base) => ({
                  ...base,
                  borderColor: '#e5e7eb',
                  borderRadius: '0.5rem',
                  padding: '0.25rem',
                  '&:hover': { borderColor: '#3b82f6' }
                })
              }}
            />
          )}
        </div>
        
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className="bg-green-100 rounded-lg p-2 mr-3">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <label className="block text-sm font-semibold text-gray-700">Referral Doctor (Optional)</label>
            </div>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                checked={useManualDoctor}
                onChange={(e) => {
                  setUseManualDoctor(e.target.checked);
                  if (e.target.checked) {
                    setReferDoctor(null);
                  } else {
                    setManualDoctorName('');
                  }
                }}
              />
              <span className="ml-2 text-xs text-gray-600">Manual Entry</span>
            </label>
          </div>
          {useManualDoctor ? (
            <input
              type="text"
              className="w-full rounded-lg border border-gray-300 bg-white py-3 px-4 text-sm text-gray-700 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-200"
              placeholder="Enter doctor name (optional)..."
              value={manualDoctorName}
              onChange={(e) => setManualDoctorName(e.target.value)}
            />
          ) : (
            <AsyncPaginate
              value={referDoctor ? {
                label: referDoctor.name,
                value: referDoctor._id,
                doctorData: referDoctor,
              } : null}
              onChange={(selectedOption: DoctorOption | null) => setReferDoctor(selectedOption?.doctorData || null)}
              loadOptions={loadDoctorOptions}
              getOptionLabel={(option) => option.label}
              getOptionValue={(option) => option.value}
              placeholder="🔍 Search doctor (Optional)..."
              additional={{ page: 1 }}
              classNamePrefix="react-select"
              isClearable
              styles={{
                control: (base) => ({
                  ...base,
                  borderColor: '#e5e7eb',
                  borderRadius: '0.5rem',
                  padding: '0.25rem',
                  '&:hover': { borderColor: '#10b981' }
                })
              }}
            />
          )}
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-6 bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="bg-purple-100 rounded-lg p-2 mr-3">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">Sale Items</h2>
                <p className="text-xs text-gray-500 mt-0.5">{posItems.length} item(s) added</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 w-4 h-4"
                  checked={allowNegativeInventory}
                  onChange={(e) => setAllowNegativeInventory(e.target.checked)}
                />
                <span className="ml-2 text-xs font-semibold text-gray-700">
                  Allow Negative Inventory
                </span>
                <span className={`ml-2 inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${allowNegativeInventory ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-gray-100 text-gray-600 border border-gray-300'}`}>
                  {allowNegativeInventory ? 'Enabled' : 'Disabled'}
                </span>
              </label>
              <button
                onClick={addPosItem}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-5 py-2.5 rounded-lg flex items-center shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={posItems.length >= 20}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add New Item
              </button>
            </div>
          </div>
        </div>
        <div className="p-4 space-y-4">
          {posItems.map((item, index) => {
            let profit = 0;
            const discountAmount = posGetDiscountAmount(item);
            if (item.isReturn) {
              const Q = Math.max(0, Number(item.quantity) || 0);
              const R = Q > 0 ? Math.min(Math.max(0, Number(item.returnQuantity) || 0), Q) : Math.max(0, Number(item.returnQuantity) || 0);
              const kept = Math.max(0, Q - R);
              profit = item.totalAmount - item.unitCost * kept;
            } else {
              const qty = Number(item.quantity) || 0;
              const revenue = (item.rate * qty) - discountAmount;
              profit = revenue - (item.unitCost * qty);
            }

            return (
              <div
                key={item.id}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm font-bold text-gray-800">
                    Item #{index + 1}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                        checked={item.isReturn}
                        onChange={(e) =>
                          updatePosItem(item.id, 'isReturn', e.target.checked)
                        }
                      />
                      <span className="ml-2 text-xs text-gray-600 font-medium">
                        Return
                      </span>
                    </label>
                    {item.isReturn && (
                      <input
                        type="text"
                        className="w-full sm:w-56 rounded-lg border border-red-300 bg-red-50 h-11 px-3 text-sm text-gray-700 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-200"
                        placeholder="Original Invoice #"
                        value={item.originalInvoiceNumber || ''}
                        onChange={(e) =>
                          updatePosItem(
                            item.id,
                            'originalInvoiceNumber',
                            e.target.value
                          )
                        }
                      />
                    )}
                    <button
                      onClick={() => removePosItem(item.id)}
                      className="bg-red-100 text-red-600 hover:bg-red-600 hover:text-white px-3 h-11 rounded-lg transition-all duration-200 disabled:opacity-30"
                      title="Remove Item"
                      disabled={posItems.length <= 1}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-7">
                  <div className=' col-span-3'>
                    <div className="mb-1 text-xs font-semibold text-gray-600">
                      Item <span className="text-red-500">*</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AsyncPaginate
                        value={
                          item.pharmItemId
                            ? { label: item.itemName, value: item.pharmItemId }
                            : null
                        }
                        onChange={(selectedOption: any) => {
                          const selected = selectedOption?.itemData as PharmItem | undefined;
                          if (!selected) return;
                          applySelectedPharmItem(item.id, selected);
                        }}
                        onInputChange={(newValue: string) => {
                          setPosItemSearchInputByRowId((prev) => ({
                            ...prev,
                            [item.id]: newValue,
                          }));
                          return newValue;
                        }}
                        loadOptions={
                          loadItemOptions as unknown as LoadOptions<
                            any,
                            never,
                            { page: number }
                          >
                        }
                        getOptionLabel={(option: any) =>
                          option?.label || option?.itemData?.name || ''
                        }
                        getOptionValue={(option: any) => option?.value || ''}
                        placeholder="Search by name, barcode or serial..."
                        additional={{ page: 1 }}
                        classNamePrefix="react-select"
                        className="w-full"
                        required
                        menuPortalTarget={
                          typeof window !== 'undefined' ? document.body : null
                        }
                        menuPosition="fixed"
                        styles={{
                          menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                          control: (base) => ({
                            ...base,
                            minHeight: 44,
                            height: 44,
                          }),
                          singleValue: (base) => ({
                            ...base,
                            color: '#1f2937',
                            fontWeight: '500',
                          }),
                        }}
                        formatOptionLabel={(option: any) => (
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">
                              {option.itemData?.name || option.label}
                            </div>
                            {option.itemData?.barcode && (
                              <div className="text-xs text-gray-500">
                                Barcode: {option.itemData.barcode}
                              </div>
                            )}
                          </div>
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => openProductSearch(item.id)}
                        className="inline-flex h-11 items-center justify-center rounded-md border border-gray-300 bg-white px-3 text-xs font-medium text-gray-700 hover:bg-gray-100"
                      >
                        Search
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 text-xs font-semibold text-gray-600">
                      Unit
                    </div>
                    <select
                      className="w-full h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      value={item.unit}
                      onChange={(e) =>
                        updatePosItem(item.id, 'unit', e.target.value)
                      }
                      disabled={!item.pharmItemId}
                    >
                      <option value="pack">Pack</option>
                      <option value="unit">Unit</option>
                      <option value="tablet">Tablet</option>
                      <option value="capsule">Capsule</option>
                      <option value="ml">ML</option>
                      <option value="g">Gram</option>
                    </select>
                  </div>

                  <div>
                    <div className="mb-1 text-xs font-semibold text-gray-600">
                      Batch
                    </div>
                    <select
                      className="w-full h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      value={item.batchNumber}
                      onChange={(e) =>
                        updatePosItem(item.id, 'batchNumber', e.target.value)
                      }
                      disabled={
                        !item.pharmItemId ||
                        !itemsList.find((i) => i._id === item.pharmItemId)
                          ?.batches?.length
                      }
                    >
                      <option value="">No Batch</option>
                      {itemsList
                        .find((i) => i._id === item.pharmItemId)
                        ?.batches?.map((batch) => (
                          <option key={batch.batchNumber} value={batch.batchNumber}>
                            {batch.batchNumber} (Exp:{' '}
                            {new Date(batch.expiryDate).toLocaleDateString()})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <div className="mb-1 text-xs font-semibold text-gray-600">
                      Cost
                    </div>
                    <input
                      type="number"
                      className="w-full h-11 rounded-lg border border-gray-300 bg-gray-50 px-3 text-sm text-gray-600 font-medium"
                      value={item.unitCost}
                      disabled
                    />
                  </div>

                  <div>
                    <div className="mb-1 text-xs font-semibold text-gray-600">
                      Rate <span className="text-red-500">*</span>
                    </div>
                    <input
                      type="number"
                      className="w-full h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-200"
                      value={item.rate}
                      onChange={(e) =>
                        updatePosItem(
                          item.id,
                          'rate',
                          parseFloat(e.target.value)
                        )
                      }
                      onWheel={(e) => e.currentTarget.blur()}
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>

                  <div>
                    {(() => {
                      const selected = itemsList.find((i) => i._id === item.pharmItemId);
                      const conv = selected?.conversionUnit || item.conversionUnit || 1;
                      const availableUnits = Number(selected?.availableQuantity || 0);
                      const requestedUnits = Number(item.unitQuantity || (item.quantity * conv));
                      const exceeds = !item.isReturn && requestedUnits > availableUnits;
                      const availablePacks = Math.floor(availableUnits / conv);
                      const availableRem = availableUnits % conv;
                      const availableText = `Available: ${availablePacks} ${(selected?.unit || 'pack')}${availableRem ? ` + ${availableRem}` : ''} (${availableUnits} units)`;
                      const infoText = exceeds ? ' — Exceeds available stock' : (availableUnits === 0 ? ' — Out of stock' : '');
                      const packInputClass = `w-full h-11 rounded-lg border px-3 text-sm outline-none transition ${exceeds ? 'border-red-500 bg-red-50 text-red-700 focus:border-red-500 focus:ring-2 focus:ring-red-200' : 'border-gray-300 bg-white text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'}`;
                      return (
                        <>
                    <div className="mb-1 text-xs font-semibold text-gray-600">
                      Pack <span className="text-red-500">*</span>
                    </div>
                    <input
                      type="number"
                          className={packInputClass}
                      value={item.quantity}
                      onChange={(e) =>
                        updatePosItem(
                          item.id,
                          'quantity',
                          parseInt(e.target.value)
                        )
                      }
                      onWheel={(e) => e.currentTarget.blur()}
                      min="1"
                      disabled={item.isReturn || lockQtyOnEdit}
                      required
                    />
                        {selected && (
                          <div className={`mt-1 text-xs ${exceeds || availableUnits === 0 ? 'text-red-600' : 'text-gray-500'}`}>
                            {availableText}{infoText}
                          </div>
                        )}
                        </>
                      );
                    })()}
                    {item.isReturn && (
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        className="w-full h-11 mt-2 rounded-lg border border-red-300 bg-red-50 px-3 text-sm text-gray-700 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-200"
                        value={item.returnQuantity === 0 ? '' : String(item.returnQuantity)}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '');
                          if (digits === '') {
                            updatePosItem(item.id, 'returnQuantity', 0);
                            return;
                          }
                          let v = parseInt(digits, 10);
                          if (!Number.isFinite(v) || v < 0) return;
                          const cap = Math.max(0, Number(item.quantity) || 0);
                          if (cap > 0 && v > cap) v = cap;
                          updatePosItem(item.id, 'returnQuantity', v);
                        }}
                        onBlur={() => {
                          if (!Number.isFinite(item.returnQuantity) || item.returnQuantity < 0) {
                            updatePosItem(item.id, 'returnQuantity', 0);
                          }
                        }}
                        placeholder="Return Qty"
                        title="Return qty is always editable on an open bill (even when sold pack qty is locked)."
                      />
                    )}
                    {item.isReturn && (() => {
                      const selected = itemsList.find((i) => i._id === item.pharmItemId);
                      const conv = selected?.conversionUnit || item.conversionUnit || 1;
                      const availableUnits = Number(selected?.availableQuantity || 0);
                      const returningUnits = (Number(item.returnQuantity) || 0) * conv;
                      const willBeUnits = availableUnits + returningUnits;
                      const unitName = String(selected?.unit || 'pack');
                      const willBePacks = conv > 0 ? Math.floor(willBeUnits / conv) : willBeUnits;
                      return (
                        <div className="mt-1 text-xs text-green-600">
                          Returning: {Number(item.returnQuantity) || 0} {unitName} ({returningUnits} units) — After return: {willBePacks} {unitName} ({willBeUnits} units)
                        </div>
                      );
                    })()}
                  </div>

                  <div>
                    {(() => {
                      const selected = itemsList.find((i) => i._id === item.pharmItemId);
                      const conv = selected?.conversionUnit || item.conversionUnit || 1;
                      const availableUnits = Number(selected?.availableQuantity || 0);
                      const requestedUnits = Number(item.unitQuantity || (item.quantity * conv));
                      const exceeds = !item.isReturn && requestedUnits > availableUnits;
                      const unitInputClass = `w-full h-11 rounded-lg border px-3 text-sm outline-none transition ${exceeds ? 'border-red-500 bg-red-50 text-red-700 focus:border-red-500 focus:ring-2 focus:ring-red-200' : 'border-gray-300 bg-blue-50 text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'}`;
                      return (
                        <>
                    <div className="mb-1 text-xs font-semibold text-gray-600">
                      Single Piece
                    </div>
                    <input
                      type="number"
                          className={unitInputClass}
                      value={item.unitQuantity}
                      onChange={(e) =>
                        updatePosItem(
                          item.id,
                          'unitQuantity',
                          parseInt(e.target.value)
                        )
                      }
                      onWheel={(e) => e.currentTarget.blur()}
                      min="1"
                      disabled={item.isReturn || !item.pharmItemId || item.conversionUnit <= 1 || lockQtyOnEdit}
                      title={`Conversion: 1 ${item.unit} = ${item.conversionUnit} units`}
                    />
                        </>
                      );
                    })()}
                  </div>

                  <div>
                    <div className="mb-1 text-xs font-semibold text-gray-600">
                      Discount
                    </div>
                    <div className="flex gap-2">
                      <select
                        className="h-11 w-24 rounded-lg border border-gray-300 bg-white px-2 text-sm text-gray-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                        value={item.discountMode}
                        onChange={(e) =>
                          updatePosItem(item.id, 'discountMode', e.target.value)
                        }
                        disabled={!item.pharmItemId}
                      >
                        <option value="value">Value</option>
                        <option value="percentage">%</option>
                      </select>
                      <input
                        type="number"
                        className="w-full h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                        value={item.discount}
                        onChange={(e) =>
                          updatePosItem(item.id, 'discount', parseFloat(e.target.value))
                        }
                        onWheel={(e) => e.currentTarget.blur()}
                        min="0"
                        max={
                          item.discountMode === 'percentage'
                            ? 100
                            : item.isReturn
                              ? Math.max(
                                  0,
                                  Math.abs(
                                    item.rate * (Number(item.quantity) || 0)
                                  )
                                )
                              : Math.abs(item.netAmount || 0)
                        }
                        step="0.01"
                        disabled={!item.pharmItemId}
                      />
                    </div>
                  </div>

                  

                  <div>
                    <div className="mb-1 text-xs font-semibold text-gray-600">
                      {item.isReturn ? 'Amount' : 'Amount'}
                    </div>
                    <div className="w-full h-11 flex items-center rounded-lg border border-gray-300 bg-gray-50 px-3 text-sm text-gray-700 font-semibold">
                      {item.netAmount.toFixed(2)}
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 text-xs font-semibold text-gray-600">
                      {item.isReturn ? 'Total' : 'Total'}
                    </div>
                    <div className="w-full h-11 flex items-center rounded-lg border-2 border-blue-300 bg-blue-50 px-3 text-sm text-blue-700 font-bold">
                      Rs. {item.totalAmount.toFixed(2)}
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 text-xs font-semibold text-gray-600">
                      Profit
                    </div>
                    <div
                      className={`w-full h-11 flex items-center rounded-lg border-2 px-3 text-sm font-bold ${
                        profit >= 0
                          ? 'bg-green-50 border-green-300 text-green-700'
                          : 'bg-red-50 border-red-300 text-red-700'
                      }`}
                    >
                      {profit.toFixed(2)}
                    </div>
                  </div>
                </div>
                

              </div>
            );
          })}
        </div>
      </div>

      {/* Payments Section */}
      <div className="mb-6 bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="bg-green-100 rounded-lg p-2 mr-3">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">Payment Details</h2>
                <p className="text-xs text-gray-500 mt-0.5">{paymentInstallments.length} payment(s) added</p>
              </div>
            </div>
            <button
              onClick={addPaymentInstallment}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-5 py-2.5 rounded-lg flex items-center shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={paymentInstallments.length >= 5}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add Payment
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto p-4">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Date <span className="text-red-500">*</span></th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Method <span className="text-red-500">*</span></th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Amount <span className="text-red-500">*</span></th>
                <th className="px-4 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {paymentInstallments.map((item) => (
                <tr key={item.id} className="hover:bg-green-50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <input
                      type="date"
                      className="w-full rounded-lg border border-gray-300 bg-white py-2.5 px-4 text-sm text-gray-700 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-200"
                      value={item.date}
                      min={paymentDateMin}
                      onChange={(e) => updatePaymentInstallment(item.id, 'date', e.target.value)}
                      required
                    />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <select
                      className="w-full rounded-lg border border-gray-300 bg-white py-2.5 px-4 text-sm text-gray-700 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-200"
                      value={item.method}
                      onChange={(e) => updatePaymentInstallment(item.id, 'method', e.target.value as PaymentMethod)}
                      required
                    >
                      <option value="Cash">💵 Cash</option>
                      <option value="Credit">💳 Credit</option>
                      <option value="Card">💳 Card</option>
                      <option value="Bank Transfer">🏦 Bank Transfer</option>
                      <option value="Cheque">📝 Cheque</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">Rs.</span>
                      <input
                        type="number"
                        className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-12 pr-4 text-sm text-gray-700 font-semibold outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-200"
                        value={item.amount}
                        onChange={(e) => updatePaymentInstallment(item.id, 'amount', parseFloat(e.target.value))}
                        onWheel={(e) => e.currentTarget.blur()}
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <button
                      onClick={() => removePaymentInstallment(item.id)}
                      className="bg-red-100 text-red-600 hover:bg-red-600 hover:text-white p-2.5 rounded-lg transition-all duration-200 disabled:opacity-30 inline-flex items-center justify-center"
                      title="Remove Payment"
                      disabled={paymentInstallments.length <= 1}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Remarks Section */}
      <div className="mb-6 bg-white rounded-xl shadow-md border border-gray-100 p-6">
        <div className="flex items-center mb-3">
          <div className="bg-yellow-100 rounded-lg p-2 mr-3">
            <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-800">Additional Notes & Remarks</h2>
        </div>
        <textarea
          className="w-full rounded-lg border border-gray-300 bg-white py-3 px-4 text-sm text-gray-700 outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
          rows={3}
          placeholder="Enter any additional notes, special instructions, or remarks here..."
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
        />
      </div>

      {/* Summary Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-lg border border-blue-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-white mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <h3 className="text-lg font-bold text-white">Transaction Summary</h3>
            </div>
          </div>
          <div className="p-6 space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-blue-200">
              <span className="text-gray-700 font-medium">Gross Total:</span>
              <span className="text-lg font-bold text-gray-800">Rs. {calculateSubTotal().toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-blue-200">
              <span className="text-gray-700 font-medium">Discount:</span>
              <span className="text-lg font-bold text-red-600">- Rs. {calculateTotalDiscount().toFixed(2)}</span>
            </div>
            
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg px-4 py-3 mt-4">
              <div className="flex justify-between items-center">
                <span className="text-white font-bold text-base">Net Total:</span>
                <span className="text-white font-bold text-2xl">Rs. {calculateGrandTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-lg border border-green-100 overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-white mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3 className="text-lg font-bold text-white">Payment Summary</h3>
            </div>
          </div>
          <div className="p-6 space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-green-200">
              <span className="text-gray-700 font-medium">Total Paid:</span>
              <span className="text-lg font-bold text-green-600">Rs. {calculateTotalPaid().toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-green-200">
              <span className="text-gray-700 font-medium">{calculateDue() > 0 ? 'Due Amount:' : 'Change to Return:'}</span>
              <span className={`text-lg font-bold ${calculateDue() > 0 ? 'text-red-600' : 'text-green-600'}`}>
                Rs. {Math.abs(calculateDue()).toFixed(2)}
              </span>
            </div>
            {calculateDue() < 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <span className="font-bold">💰 Return Change:</span> Please return Rs. {Math.abs(calculateDue()).toFixed(2)} to the customer
                </p>
              </div>
            )}
            <div className={`rounded-lg px-4 py-3 mt-4 ${calculateDue() > 0 ? 'bg-gradient-to-r from-red-600 to-rose-600' : 'bg-gradient-to-r from-green-600 to-emerald-600'}`}>
              <div className="flex justify-between items-center">
                <span className="text-white font-bold text-base">Payment Status:</span>
                <span className="text-white font-bold text-xl">
                  {calculateDue() === 0 ? '✓ Fully Paid' : calculateDue() > 0 ? '⚠ Pending' : '↑ Overpaid - Return Change'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Buttons */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm text-gray-600">
            <p className="font-medium">Ready to complete the transaction?</p>
            <p className="text-xs text-gray-500">Review all details before proceeding</p>
          </div>
          <div className="flex space-x-4">
            
            <button
              onClick={handleSubmit}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold px-8 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {id ? 'Update Invoice' : 'Complete Transaction'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <Modal isOpen={isProductSearchOpen} onClose={closeProductSearch} className="max-w-5xl">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-800">POS Product Search</h2>
        <button
          type="button"
          onClick={closeProductSearch}
          className="text-gray-500 hover:text-gray-700 rounded-full p-1"
        >
          <span className="text-xl leading-none">&times;</span>
        </button>
      </div>
      <div className="p-4">
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-12">
          <div className="sm:col-span-6">
            <div className="mb-1 text-xs font-semibold text-gray-600">Search</div>
            <input
              type="text"
              ref={productSearchInputRef}
              value={productSearchQuery}
              onChange={(e) => setProductSearchQuery(e.target.value)}
              placeholder="Name / Barcode / Generic..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="sm:col-span-3">
            <div className="mb-1 text-xs font-semibold text-gray-600">Category</div>
            <select
              value={productSearchCategoryId}
              onChange={(e) => setProductSearchCategoryId(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {productSearchCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <div className="mb-1 text-xs font-semibold text-gray-600">Manufacturer</div>
            <select
              value={productSearchManufacturerId}
              onChange={(e) => setProductSearchManufacturerId(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Manufacturers</option>
              {productSearchManufacturers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <div className="mb-1 text-xs font-semibold text-gray-600">Min Cost</div>
            <input
              type="number"
              value={productSearchMinCost}
              onChange={(e) => setProductSearchMinCost(e.target.value)}
              placeholder="0"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="sm:col-span-2">
            <div className="mb-1 text-xs font-semibold text-gray-600">Max Cost</div>
            <input
              type="number"
              value={productSearchMaxCost}
              onChange={(e) => setProductSearchMaxCost(e.target.value)}
              placeholder="0"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="sm:col-span-2">
            <div className="mb-1 text-xs font-semibold text-gray-600">Min Stock</div>
            <input
              type="number"
              value={productSearchMinStock}
              onChange={(e) => setProductSearchMinStock(e.target.value)}
              placeholder="0"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="sm:col-span-2">
            <div className="mb-1 text-xs font-semibold text-gray-600">Page Size</div>
            <select
              value={productSearchPageSize}
              onChange={(e) => setProductSearchPageSize(Number(e.target.value))}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>

          <div className="sm:col-span-2 flex items-end">
            <button
              type="button"
              onClick={() => {
                setProductSearchQuery('');
                setDebouncedProductSearchQuery('');
                setProductSearchMinCost('');
                setProductSearchMaxCost('');
                setProductSearchCategoryId('');
                setProductSearchManufacturerId('');
                setProductSearchMinStock('');
                setProductSearchPage(1);
              }}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Reset
            </button>
          </div>
        </div>
        <div className="overflow-auto max-h-[60vh]">
          <div className="mb-3 flex items-center justify-between text-xs text-gray-600">
            <div>
              Showing{' '}
              <span className="font-semibold text-gray-800">
                {productSearchTotal === 0 ? 0 : productSearchStartIndex + 1}-{productSearchEndIndex}
              </span>{' '}
              of <span className="font-semibold text-gray-800">{productSearchTotal}</span>
            </div>
            <div className="text-gray-500">Click any item to select</div>
          </div>

          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-gray-600">
              Page <span className="font-semibold text-gray-800">{safeProductSearchPage}</span> /{' '}
              <span className="font-semibold text-gray-800">{productSearchTotalPages}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setProductSearchPage(1)}
                disabled={safeProductSearchPage === 1}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                First
              </button>
              <button
                type="button"
                onClick={() => setProductSearchPage((p) => Math.max(1, p - 1))}
                disabled={safeProductSearchPage === 1}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() =>
                  setProductSearchPage((p) => Math.min(productSearchTotalPages, p + 1))
                }
                disabled={safeProductSearchPage === productSearchTotalPages}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
              <button
                type="button"
                onClick={() => setProductSearchPage(productSearchTotalPages)}
                disabled={safeProductSearchPage === productSearchTotalPages}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Last
              </button>
            </div>
          </div>

          <div className="grid gap-2">
            {productSearchResults.map((item) => {
              const packQty = item.conversionUnit || 1;
              const stockPack =
                packQty > 0 ? Math.floor(item.availableQuantity / packQty) : 0;
              const stockPiece = packQty > 0 ? item.availableQuantity % packQty : 0;
              const packPrice = item.retailPrice || 0;
              const unitRetailPrice = packQty > 1 ? packPrice / packQty : packPrice;
              const primaryBatch = item.batches?.[0];
              const cost =
                primaryBatch?.purchasePrice ?? item.unitCost ?? item.costPrice ?? 0;
              const manufacturerName =
                typeof item.pharmManufacturerId === 'object' &&
                item.pharmManufacturerId !== null
                  ? (item.pharmManufacturerId as any).name || ''
                  : '';
              const categoryName =
                typeof item.pharmCategoryId === 'object' && item.pharmCategoryId !== null
                  ? (item.pharmCategoryId as any).name || ''
                  : '';
              const stockLabel =
                packQty > 1
                  ? `${stockPack} ${item.unit || 'pack'}${stockPiece ? ` + ${stockPiece}` : ''}`
                  : `${item.availableQuantity} ${item.unit || 'pack'}`;

              return (
                <button
                  key={item._id}
                  type="button"
                  onClick={() => handleSelectProductFromSearch(item)}
                  className="w-full rounded-lg border border-gray-200 bg-white p-3 text-left transition hover:border-blue-300 hover:bg-blue-50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-gray-900">
                        {item.name}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
                        <div>
                          Code:{' '}
                          <span className="font-medium text-gray-800">
                            {item.barcode || '-'}
                          </span>
                        </div>
                        <div>
                          Manufacturer:{' '}
                          <span className="font-medium text-gray-800">
                            {manufacturerName || '-'}
                          </span>
                        </div>
                        <div>
                          Category:{' '}
                          <span className="font-medium text-gray-800">
                            {categoryName || '-'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-sm font-bold text-gray-900">
                        Rs. {unitRetailPrice.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-600">
                        Pack Rs. {packPrice.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-gray-700 sm:grid-cols-4">
                    <div className="rounded-md bg-gray-50 px-2 py-2">
                      <div className="text-[11px] text-gray-500">Cost</div>
                      <div className="font-semibold text-gray-900">
                        Rs. {Number(cost || 0).toFixed(2)}
                      </div>
                    </div>
                    <div className="rounded-md bg-gray-50 px-2 py-2">
                      <div className="text-[11px] text-gray-500">Pack Qty</div>
                      <div className="font-semibold text-gray-900">{packQty}</div>
                    </div>
                    <div className="rounded-md bg-gray-50 px-2 py-2">
                      <div className="text-[11px] text-gray-500">Stock</div>
                      <div className="font-semibold text-gray-900">{stockLabel}</div>
                    </div>
                    
                  </div>
                </button>
              );
            })}

            {(productSearchLoading || productSearchTotal === 0) && (
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-600">
                {productSearchLoading ? 'Loading products...' : 'No products found'}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
    
    
  </div>
  );
}
