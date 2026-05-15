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
