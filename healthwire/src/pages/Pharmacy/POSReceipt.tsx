import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Base_url } from '../../utils/Base_url';
import { getPosReceiptHeader } from '../../utils/branchPdfHeader';
import { fetchBranchForPosReceipt, isBranchInfoPopulated } from '../../utils/enrichInvoiceForPdf';
import logo from '../../images/logo.png';
export default function POSReceipt() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [branchExtra, setBranchExtra] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await axios.get(`${Base_url}/apis/pharmPos/get/${id}`);
        const pos = res?.data?.data || null;
        if (cancelled) return;
        setData(pos);
        setBranchExtra(null);
        if (pos && !isBranchInfoPopulated(pos.branchId)) {
          const b = await fetchBranchForPosReceipt(pos.branchId);
          if (!cancelled && b) {
            setBranchExtra(b);
          }
        }
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const grossTotal = Number(
    (data?.allItem || []).reduce((s: number, it: any) => s + Number(it?.netAmount || 0), 0)
  );
  const discount = Number(data?.totalDiscount || 0);
  const netTotal = Number(
    (data?.allItem || []).reduce((s: number, it: any) => s + Number(it?.totalAmount || 0), 0)
  );
  const paymentMethod =
    Array.isArray(data?.payment) && data.payment.length > 0
      ? data.payment[0]?.method || 'Cash'
      : 'Cash';

  const groupedItems = (() => {
    const arr = Array.isArray(data?.allItem) ? data.allItem : [];
    const map = new Map<string, { name: string; rate: number; qty: number; total: number }>();
    for (const it of arr) {
      const key = `${it?.pharmItemId?._id || it?.pharmItemId || it?.itemName || ''}|${String(it?.unit || '')}|${String(it?.batchNumber || '')}`;
      const name = it?.pharmItemId?.name || it?.itemName || '-';
      const rate = Number(it?.rate || 0);
      const isReturn = Boolean(it?.isReturn);
      const qty = isReturn ? -(Number(it?.returnQuantity || 0)) : Number(it?.quantity || 0);
      const total = Number(it?.totalAmount || 0);
      if (!map.has(key)) {
        map.set(key, { name, rate, qty: 0, total: 0 });
      }
      const g = map.get(key)!;
      g.rate = rate || g.rate;
      g.qty += qty;
      g.total += total;
    }
    return Array.from(map.values()).filter((g) => Number(g.qty || 0) !== 0);
  })();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-sm text-gray-600">Loading receipt...</div>
      </div>
    );
  }

  const receiptData = data && branchExtra ? { ...data, branchId: branchExtra } : data;
  const receiptHeader = getPosReceiptHeader(receiptData);
  const salesPerson = data?.createdBy?.name || '-';

  return (
    <div className="flex items-start justify-center w-full bg-gray-100 py-6">
      <style>
        {`
          @media print {
            body * { visibility: hidden; }
            #receipt-print, #receipt-print * { visibility: visible; }
            #receipt-print { position: fixed; left: 50%; top: 0; transform: translateX(-50%); }
            #receipt-print .logo-mono { filter: grayscale(100%) brightness(0) contrast(200%); }
          }
          #receipt-print .logo-mono { filter: grayscale(100%) brightness(0) contrast(200%); }
        `}
      </style>
      <div id="receipt-print" className="bg-white mx-auto shadow-sm w-[420px] p-4 text-black">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => navigate(-1)}
            className="px-3 py-1.5 rounded bg-gray-200 text-black font-semibold text-xs print:hidden"
          >
            Back
          </button>
          
        </div>

        
        <div className="text-center">
          <img src={logo} alt="logo" className="mb-1 w-32  mx-auto  border-b pb-2 logo-mono" />
          <div className="text-xs font-bold tracking-wide uppercase">{receiptHeader.title}</div>
          {receiptHeader.addressLines.map((line, i) => (
            <div key={i} className="text-[10px] text-black mt-0.5 px-1">
              {line}
            </div>
          ))}
        </div>

        <div className="mt-2 text-xs text-black">
          <div className="text-center font-semibold capitalize">{receiptHeader.phoneLine || ''}</div>
          <div className="flex justify-between font-semibold">
            <div className="capitalize">POS: 01</div>
            <div className="capitalize flex items-center gap-1">MOP: <span className=' font-normal'>{paymentMethod}</span></div>
          </div>
          <div className="flex justify-between font-semibold">
            <div className="capitalize flex items-center gap-1">Receipt#: <span className=' font-normal'>{String(data?.invoiceNumber || '').toUpperCase()}</span></div>
            <div>
              <span className="capitalize">Date:</span> <span className=' font-normal'>{data?.createdAt ? new Date(data.createdAt).toLocaleString() : '-'}</span> 
            </div>
          </div>
          <div className="capitalize font-semibold">Customer Name: <span className="font-normal capitalize">{data?.patientId?.name || data?.patientName || '-'}</span></div>
        </div>

        <div className="my-2 border-t  border-dashed" />

        <div className="text-xs text-black">
          <div className="flex font-bold border-b pb-1 mb-2  border-dashed">
            <div className="w-6 capitalize">Sr.</div>
            <div className="flex-1 capitalize">Product</div>
            <div className="w-14 text-right capitalize">Price</div>
            <div className="w-10 text-right capitalize">Qty</div>
            <div className="w-16 text-right capitalize">Total</div>
          </div>
          {groupedItems.map((it: any, idx: number) => (
            <div className="flex text-black" key={idx}>
              <div className="w-6">{idx + 1}</div>
              <div className="flex-1  lowercase">{it.name}</div>
              <div className="w-14 text-right">{Number(it.rate || 0).toFixed(2)}</div>
              <div className="w-10 text-right">{Number(it.qty || 0)}</div>
              <div className="w-16 text-right">{Number(it.total || 0).toFixed(2)}</div>
            </div>
          ))}
        </div>

        <div className="my-2 border-t border-dashed" />

        <div className="text-xs text-black">
          <div className="flex justify-between">
            <div className="capitalize">Gross Total:</div>
            <div className=" font-normal">{grossTotal.toFixed(2)}</div>
          </div>
          <div className="flex justify-between">
            <div className="capitalize font-normal">Discount:</div>
            <div className="font-normal">{discount.toFixed(2)}</div>
          </div>
          <div className="flex justify-between font-bold">
            <div className="capitalize font-semibold">Net Total:</div>
            <div className="font-bold">{netTotal.toFixed(2)}</div>
          </div>
        </div>

        <div className="my-2 border-t border-dashed" />

        <div className="text-xs text-black">
          <div className="capitalize font-semibold">Sales Person: <span className="font-normal capitalize">{salesPerson}</span></div>
        </div>

        <div className="my-2 border-t border-dashed" />

        <div className="text-[11px] text-black">
          <div className="font-bold capitalize">Terms & Conditions</div>
          <div className="capitalize">1- No exchange/return without receipt.</div>
          <div className="capitalize">2- Exchange within 3 days of purchase.</div>
          <div className="capitalize">3- Refrigerated, electronics and damaged items cannot be refunded or exchanged.</div>
        </div>

        <div className="mt-4 flex justify-center print:hidden">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded bg-primary text-white text-xs"
          >
            Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
}
