/** Normalize expense row from API / local bundle for UI and save. */
export function normalizeProcedureExpenseRow(e: unknown, index: number) {
  const row = (e && typeof e === 'object' ? e : {}) as Record<string, unknown>;
  const amountRaw = row.amount ?? row.value ?? row.price;
  const amount =
    typeof amountRaw === 'number'
      ? amountRaw
      : amountRaw === '' || amountRaw == null
        ? NaN
        : Number(amountRaw);
  return {
    id: typeof row.id === 'number' ? row.id : index + 1,
    description: String(row.description || row.name || row.categoryName || ''),
    expenseCategoryId: String(
      row.expenseCategoryId || row.categoryId || (row.category as { _id?: string })?._id || row.category || '',
    ),
    amount,
    deductBeforeDoctorShare: !!(
      row.deductBeforeDoctorShare ?? row.deductBeforeShare ?? row.beforeDoctorShare
    ),
    showInPrint: !!(row.showInPrint ?? row.print),
  };
}

export function expenseDeductBeforeDoctorShareTotal(expenses: unknown[]): number {
  return (Array.isArray(expenses) ? expenses : [])
    .filter((e) => {
      const row = e as { deductBeforeDoctorShare?: boolean; deductBeforeShare?: boolean; beforeDoctorShare?: boolean };
      return !!(row.deductBeforeDoctorShare ?? row.deductBeforeShare ?? row.beforeDoctorShare);
    })
    .reduce((s, e) => {
      const row = e as { amount?: number; value?: number; price?: number };
      const v = row.amount ?? row.value ?? row.price;
      return s + (Number(v) || 0);
    }, 0);
}

/** Expenses added to bill / print summary (not deducted before doctor share). */
export function expenseAdditionalBillTotal(expenses: unknown[]): number {
  return (Array.isArray(expenses) ? expenses : [])
    .filter((e) => {
      const row = e as { deductBeforeDoctorShare?: boolean; deductBeforeShare?: boolean; beforeDoctorShare?: boolean };
      return !(row.deductBeforeDoctorShare ?? row.deductBeforeShare ?? row.beforeDoctorShare);
    })
    .reduce((s, e) => {
      const row = e as { amount?: number; value?: number; price?: number };
      const v = row.amount ?? row.value ?? row.price;
      return s + (Number(v) || 0);
    }, 0);
}

export function isProcedureFreeFromPricing(bundle: unknown): boolean {
  return Boolean(
    (bundle as { procedurePricing?: { isFreeProcedure?: boolean } } | null)?.procedurePricing
      ?.isFreeProcedure,
  );
}

export function procedureLineGrossAmount(item: {
  amount?: unknown;
  rate?: unknown;
  quantity?: unknown;
}): number {
  const amount = Number(item?.amount);
  if (Number.isFinite(amount) && amount > 0) return amount;
  const rate = Number(item?.rate) || 0;
  const qty = Math.max(1, Number(item?.quantity) || 1);
  return rate * qty;
}

export function procedureLineDiscountTotal(item: {
  amount?: unknown;
  rate?: unknown;
  quantity?: unknown;
  discount?: unknown;
  discountType?: unknown;
}): number {
  const gross = procedureLineGrossAmount(item);
  const discount = Number(item?.discount) || 0;
  return Number(item?.discountType) === 1 ? gross * (discount / 100) : discount;
}

export function isProcedureLineEffectivelyFree(
  item: {
    amount?: unknown;
    rate?: unknown;
    quantity?: unknown;
    discount?: unknown;
    discountType?: unknown;
  },
  bundle?: unknown,
): boolean {
  if (isProcedureFreeFromPricing(bundle)) return true;
  const gross = procedureLineGrossAmount(item);
  if (gross <= 0) return false;
  return procedureLineDiscountTotal(item) >= gross;
}

/** True when any line uses procedure-level discount or is marked free in costing. */
export function invoiceUsesProcedureWiseDiscount(
  procedures: Array<{
    id?: number;
    procedureId?: string;
    amount?: unknown;
    rate?: unknown;
    quantity?: unknown;
    discount?: unknown;
    discountType?: unknown;
  }>,
  getBundleForRow: (rowId: number) => unknown,
): boolean {
  return procedures.some((p) => {
    if (!String(p.procedureId || '').trim()) return false;
    const rowId = Number(p.id);
    if (!Number.isFinite(rowId)) return false;
    if (isProcedureFreeFromPricing(getBundleForRow(rowId))) return true;
    return procedureLineDiscountTotal(p) > 0;
  });
}
