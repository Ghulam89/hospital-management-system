/** Resolve invoice-level discount input to a single Rs amount (procedure gross subtotal). */
export function resolveInvoiceDiscountAmount(
  grossSubtotal: number,
  discount: number,
  discountType: number,
): number {
  const gross = Math.max(0, Number(grossSubtotal) || 0);
  const val = Math.max(0, Number(discount) || 0);
  if (val <= 0 || gross <= 0) return 0;
  if (Number(discountType) === 1) {
    return parseFloat((gross * (Math.min(100, val) / 100)).toFixed(2));
  }
  return Math.min(val, gross);
}

/** Split a total discount amount across rows proportionally by line amount. */
export function splitDiscountAcrossLines<T extends { id: number; amount: number }>(
  rows: T[],
  totalDiscount: number,
): Map<number, number> {
  const map = new Map<number, number>();
  const gross = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const cap = Math.min(Math.max(0, Number(totalDiscount) || 0), gross);

  if (!rows.length || cap <= 0 || gross <= 0) {
    rows.forEach((r) => map.set(r.id, 0));
    return map;
  }

  let assigned = 0;
  rows.forEach((row, index) => {
    const amt = Number(row.amount) || 0;
    let lineDisc: number;
    if (index === rows.length - 1) {
      lineDisc = parseFloat((cap - assigned).toFixed(2));
    } else {
      lineDisc = parseFloat((cap * (amt / gross)).toFixed(2));
      assigned += lineDisc;
    }
    map.set(row.id, Math.min(Math.max(0, lineDisc), amt));
  });

  return map;
}

export type DiscountLineLike = {
  amount?: number;
  discount?: number;
  discountType?: number;
};

export function procedureLineDiscountRs(item: DiscountLineLike): number {
  const amt = Math.max(0, Number(item.amount) || 0);
  const disc = Math.max(0, Number(item.discount) || 0);
  if (disc <= 0) return 0;
  if (Number(item.discountType) === 1) {
    return parseFloat((amt * (Math.min(100, disc) / 100)).toFixed(2));
  }
  return Math.min(disc, amt);
}

export function hasDatedProcedureDiscount<T extends DiscountLineLike>(
  rows: T[],
  isDated: (row: T) => boolean,
): boolean {
  return rows.some((p) => isDated(p) && procedureLineDiscountRs(p) > 0);
}
