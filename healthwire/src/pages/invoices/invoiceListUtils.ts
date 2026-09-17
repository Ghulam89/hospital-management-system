/** Collect doctor ids + display names from invoice header and line doctorShares. */
export function getInvoiceDoctorEntries(invoice: {
  doctorId?: unknown;
  doctorData?: { _id?: unknown; name?: string } | null;
  item?: unknown[];
}): { id: string; name: string }[] {
  const byId = new Map<string, string>();

  const push = (rawId: unknown, rawName?: unknown) => {
    let id = '';
    let name = '';
    if (rawId && typeof rawId === 'object' && rawId !== null && '_id' in rawId) {
      const obj = rawId as { _id?: unknown; name?: unknown };
      id = String(obj._id || '').trim();
      name = String(obj.name || rawName || '').trim();
    } else {
      id = String(rawId || '').trim();
      name = String(rawName || '').trim();
    }
    if (!id || id === 'null' || id === 'undefined') return;
    const existing = byId.get(id);
    if (!existing) byId.set(id, name);
    else if (name && (!existing || existing === id)) byId.set(id, name);
  };

  push(invoice?.doctorId, (invoice?.doctorId as { name?: string })?.name);
  push(invoice?.doctorData?._id, invoice?.doctorData?.name);

  for (const item of Array.isArray(invoice?.item) ? invoice.item : []) {
    const row = item as Record<string, unknown>;
    push(row.performedBy, (row.performedBy as { name?: string })?.name);
    for (const share of Array.isArray(row.doctorShares) ? row.doctorShares : []) {
      const s = share as Record<string, unknown>;
      const doc = s.doctorId ?? s.userId ?? s.doctor;
      push(doc, (doc as { name?: string })?.name || s.doctorName);
    }
  }

  return [...byId.entries()].map(([id, name]) => ({ id, name: name || id }));
}

export function formatInvoiceDoctorsLabel(
  invoice: Parameters<typeof getInvoiceDoctorEntries>[0],
): string {
  const entries = getInvoiceDoctorEntries(invoice);
  if (!entries.length) return 'N/A';
  const labels = entries.map((e) => e.name || e.id).filter(Boolean);
  return labels.length ? labels.join(', ') : 'N/A';
}

/** Procedure name for invoice list tables — never show embedded procedure date from description. */
export function getInvoiceItemProcedureName(item: any): string {
  if (item?.procedureId?.name) return String(item.procedureId.name).trim();
  const desc = String(item?.description || '').trim();
  const sep = ' — ';
  const sepIdx = desc.indexOf(sep);
  if (sepIdx > 0) return desc.slice(0, sepIdx).trim();
  return desc || 'N/A';
}

export function invoiceListDueAndAdvance(totalBill: unknown, totalPay: unknown) {
  const bill = Number(totalBill) || 0;
  const paid = Number(totalPay) || 0;
  return {
    due: Math.max(0, bill - paid),
    advance: Math.max(0, paid - bill),
  };
}

export function invoiceListStatus(totalBill: unknown, totalPay: unknown): string {
  const { due, advance } = invoiceListDueAndAdvance(totalBill, totalPay);
  if (advance > 0) return 'Advance';
  if (due === 0) return 'Paid';
  return 'Pending';
}

export function hasProcedureDate(value: unknown): boolean {
  return !!(value && String(value).trim());
}

/** Net amount for procedure lines without a date (advance-only rows). */
export function getProcedureAdvanceAmount(invoice: { item?: unknown[] } | null | undefined): number {
  const items = Array.isArray(invoice?.item) ? invoice.item : [];
  return items.reduce((sum: number, item: any) => {
    if (hasProcedureDate(item?.procedureDate)) return sum;
    const amount =
      Number(item?.amount) || (Number(item?.rate) || 0) * Math.max(1, Number(item?.quantity) || 1);
    const discount = Number(item?.discount) || 0;
    const discountAmount = Number(item?.discountType) === 1 ? amount * (discount / 100) : discount;
    return sum + Math.max(0, amount - discountAmount);
  }, 0);
}

/**
 * List / report TOTAL column — matches form & PDF Grand Total:
 * dated `totalBill` + undated procedure advance (not `totalPay`).
 */
export function getInvoiceListGrandTotal(invoice: {
  item?: unknown[];
  total?: unknown;
  totalBill?: unknown;
} | null | undefined): number {
  const datedBill = Number(invoice?.totalBill ?? invoice?.total) || 0;
  return Math.max(0, datedBill + getProcedureAdvanceAmount(invoice));
}

/** PDF / print summary — matches invoice save: dated bill + undated procedure advance. */
export function invoicePdfPaymentSummary(
  invoice: {
    item?: unknown[];
    subTotal?: unknown;
    subTotalBill?: unknown;
    discount?: unknown;
    discountBill?: unknown;
    total?: unknown;
    totalBill?: unknown;
    paid?: unknown;
    totalPay?: unknown;
    advance?: unknown;
    advancePay?: unknown;
    duePay?: unknown;
  },
  printExpensesTotal = 0,
): {
  subTotal: number;
  discount: number;
  datedBill: number;
  procedureAdvance: number;
  clientBill: number;
  grandTotal: number;
  paid: number;
  due: number;
  advance: number;
} {
  const lines = Array.isArray(invoice?.item) ? invoice.item : [];
  const liveSubTotal = lines.reduce((sum, item: any) => sum + (Number(item?.amount) || 0), 0);
  const liveDiscount = lines.reduce((sum, item: any) => {
    const amount = Number(item?.amount) || 0;
    const discount = Number(item?.discount) || 0;
    const discountType = Number(item?.discountType) || 0;
    return sum + (discountType === 1 ? amount * (discount / 100) : discount);
  }, 0);

  const subTotal =
    liveSubTotal > 0 ? liveSubTotal : Number(invoice.subTotal ?? invoice.subTotalBill ?? 0);
  const discount =
    liveDiscount > 0 ? liveDiscount : Number(invoice.discount ?? invoice.discountBill ?? 0);
  const datedBill = Number(invoice.total ?? invoice.totalBill ?? 0);
  const procedureAdvance = getProcedureAdvanceAmount(invoice);
  const clientBill = datedBill + procedureAdvance;
  const owed = clientBill + Math.max(0, Number(printExpensesTotal) || 0);
  const paid = Number(invoice.paid ?? invoice.totalPay ?? 0);
  const live = invoiceListDueAndAdvance(owed, paid);
  const storedAdvance = Number(invoice.advance ?? invoice.advancePay ?? 0);
  const storedDue = Number(invoice.duePay ?? 0);

  return {
    subTotal,
    discount,
    datedBill,
    procedureAdvance,
    clientBill,
    grandTotal: owed,
    paid,
    due: live.due > 0 ? live.due : storedDue > 0 && live.advance === 0 ? storedDue : live.due,
    advance: live.advance > 0 ? live.advance : storedAdvance > 0 && live.due === 0 ? storedAdvance : live.advance,
  };
}
