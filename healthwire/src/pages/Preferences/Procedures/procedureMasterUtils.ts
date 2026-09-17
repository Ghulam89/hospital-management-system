/** Build API payload from Preferences procedure form state. */
export type DoctorShareRow = {
  id: number;
  doctorId: string;
  share: number;
  shareType: 'value' | 'percentage';
};

export type ExpenseRow = {
  id: number;
  description: string;
  expenseCategoryId: string;
  amount: number;
  deductBeforeDoctorShare: boolean;
  showInPrint: boolean;
};

export type ConsumptionRow = {
  id: number;
  pharmItemId: string;
  itemName: string;
  qty: number;
  batchNumber: string;
};

export function refId(value: unknown): string {
  if (value == null || value === '') return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && '_id' in value) {
    return String((value as { _id: unknown })._id || '');
  }
  return '';
}

export function buildProcedureMasterPayload(form: {
  name: string;
  amount: string;
  departmentId: string;
  subDepartment: string;
  description: string;
  cost: string;
  discount: string;
  discountType: number;
  taxRate: string;
  doctorShares: DoctorShareRow[];
  defaultExpenses: ExpenseRow[];
  consumptions: ConsumptionRow[];
}) {
  return {
    name: form.name.trim(),
    amount: parseFloat(String(form.amount)) || 0,
    departmentId: form.departmentId,
    subDepartment: form.subDepartment.trim(),
    description: form.description.trim(),
    cost: parseFloat(String(form.cost)) || 0,
    discount: parseFloat(String(form.discount)) || 0,
    discountType: form.discountType === 1 ? 1 : 0,
    taxRate: parseFloat(String(form.taxRate)) || 0,
    doctorShares: form.doctorShares
      .filter((d) => refId(d.doctorId))
      .map((d) => ({
        doctorId: d.doctorId,
        share: Number(d.share) || 0,
        shareType: d.shareType,
      })),
    defaultExpenses: form.defaultExpenses
      .filter((e) => e.expenseCategoryId && Number(e.amount) > 0)
      .map((e) => ({
        description: e.description.trim(),
        expenseCategoryId: e.expenseCategoryId,
        amount: Number(e.amount) || 0,
        deductBeforeDoctorShare: !!e.deductBeforeDoctorShare,
        showInPrint: !!e.showInPrint,
      })),
    consumptions: form.consumptions
      .filter((c) => refId(c.pharmItemId) && Number(c.qty) > 0)
      .map((c) => ({
        pharmItemId: c.pharmItemId,
        qty: Number(c.qty) || 1,
        batchNumber: c.batchNumber.trim(),
      })),
  };
}

/** Map GET procedure → form state */
export function mapProcedureApiToForm(proc: Record<string, unknown>) {
  const doctorShares: DoctorShareRow[] = (Array.isArray(proc.doctorShares)
    ? proc.doctorShares
    : []
  ).map((d: unknown, i: number) => {
    const row = (d && typeof d === 'object' ? d : {}) as Record<string, unknown>;
    return {
      id: i + 1,
      doctorId: refId(row.doctorId),
      share: Number(row.share) || 0,
      shareType:
        String(row.shareType || '').toLowerCase() === 'value' ? 'value' : 'percentage',
    };
  });

  const defaultExpenses: ExpenseRow[] = (Array.isArray(proc.defaultExpenses)
    ? proc.defaultExpenses
    : []
  ).map((e: unknown, i: number) => {
    const row = (e && typeof e === 'object' ? e : {}) as Record<string, unknown>;
    return {
      id: i + 1,
      description: String(row.description || ''),
      expenseCategoryId: refId(row.expenseCategoryId),
      amount: Number(row.amount) || 0,
      deductBeforeDoctorShare: !!row.deductBeforeDoctorShare,
      showInPrint: !!row.showInPrint,
    };
  });

  const consumptions: ConsumptionRow[] = (Array.isArray(proc.consumptions)
    ? proc.consumptions
    : []
  ).map((c: unknown, i: number) => {
    const row = (c && typeof c === 'object' ? c : {}) as Record<string, unknown>;
    const item = row.pharmItemId;
    const itemName =
      typeof item === 'object' && item !== null && 'name' in item
        ? String((item as { name?: string }).name || '')
        : '';
    return {
      id: i + 1,
      pharmItemId: refId(row.pharmItemId),
      itemName,
      qty: Number(row.qty) || 1,
      batchNumber: String(row.batchNumber || ''),
    };
  });

  const dept = proc.departmentId;
  const departmentId =
    typeof dept === 'object' && dept !== null && '_id' in dept
      ? String((dept as { _id: string })._id)
      : String(dept || '');

  return {
    name: String(proc.name || ''),
    amount: String(proc.amount ?? ''),
    departmentId,
    subDepartment: String(proc.subDepartment || ''),
    description: String(proc.description || ''),
    cost: String(proc.cost ?? ''),
    discount: String(proc.discount ?? '0'),
    discountType: Number(proc.discountType) === 1 ? 1 : 0,
    taxRate: String(proc.taxRate ?? '0'),
    doctorShares,
    defaultExpenses,
    consumptions,
  };
}

/** Invoice costing bundle from procedure master */
export function procedureMasterToCostingBundle(
  proc: Record<string, unknown>,
  sourceProcedureId?: string,
) {
  const doctorShares = (Array.isArray(proc.doctorShares) ? proc.doctorShares : []).map(
    (d: unknown, i: number) => {
      const row = (d && typeof d === 'object' ? d : {}) as Record<string, unknown>;
      const doc = row.doctorId;
      const doctorName =
        typeof doc === 'object' && doc !== null && 'name' in doc
          ? String((doc as { name?: string }).name || '')
          : '';
      return {
        id: i + 1,
        doctorId: refId(row.doctorId),
        share: Number(row.share) || 0,
        shareType:
          String(row.shareType || '').toLowerCase() === 'value' ? 'value' : 'percentage',
        doctorName,
      };
    },
  );

  const expenses = (Array.isArray(proc.defaultExpenses) ? proc.defaultExpenses : []).map(
    (e: unknown, i: number) => {
      const row = (e && typeof e === 'object' ? e : {}) as Record<string, unknown>;
      const cat = row.expenseCategoryId;
      const categoryName =
        typeof cat === 'object' && cat !== null && 'name' in cat
          ? String((cat as { name?: string }).name || '')
          : '';
      return {
        id: i + 1,
        description: String(row.description || ''),
        expenseCategoryId: refId(row.expenseCategoryId),
        amount: Number(row.amount) || 0,
        deductBeforeDoctorShare: !!row.deductBeforeDoctorShare,
        showInPrint: !!row.showInPrint,
        categoryName,
      };
    },
  );

  const consumptions = (Array.isArray(proc.consumptions) ? proc.consumptions : []).map(
    (c: unknown, i: number) => {
      const row = (c && typeof c === 'object' ? c : {}) as Record<string, unknown>;
      const item = row.pharmItemId;
      const itemName =
        typeof item === 'object' && item !== null && 'name' in item
          ? String((item as { name?: string }).name || '')
          : '';
      return {
        id: i + 1,
        pharmItemId: refId(row.pharmItemId),
        itemName,
        qty: Number(row.qty) || 1,
        batchNumber: String(row.batchNumber || ''),
        availableBatches: [],
      };
    },
  );

  const firstDoc = doctorShares.find((d) => d.doctorId);
  const firstRaw = (Array.isArray(proc.doctorShares) ? proc.doctorShares : []).find(
    (d: unknown) => {
      const row = (d && typeof d === 'object' ? d : {}) as Record<string, unknown>;
      return !!refId(row.doctorId);
    },
  ) as Record<string, unknown> | undefined;
  const firstDocObj = firstRaw?.doctorId;
  const primaryDoctorProfile =
    firstDoc && typeof firstDocObj === 'object' && firstDocObj !== null
      ? {
          _id: firstDoc.doctorId,
          name:
            firstDoc.doctorName ||
            String((firstDocObj as { name?: string }).name || ''),
          sharePrice:
            (firstDocObj as { sharePrice?: unknown }).sharePrice != null
              ? String((firstDocObj as { sharePrice?: unknown }).sharePrice)
              : undefined,
          shareType:
            (firstDocObj as { shareType?: unknown }).shareType != null
              ? String((firstDocObj as { shareType?: unknown }).shareType)
              : undefined,
        }
      : firstDoc
        ? {
            _id: firstDoc.doctorId,
            name: firstDoc.doctorName || '',
          }
        : null;

  const procId =
    sourceProcedureId ||
    refId(proc._id) ||
    '';
  return {
    expenses,
    doctorShares,
    consumptions,
    assistedBy: [],
    receptionStaff: [],
    primaryDoctorProfile,
    fromProcedureMaster: true,
    sourceProcedureId: procId,
    _id: `proc-master-${Date.now()}`,
    ...(firstDoc ? { performedByHint: firstDoc.doctorId } : {}),
  };
}

/** Ignore stale costing when user changed procedure on the same row */
export function getCostingBundleForProcedureRow(
  localExpenses: Array<{ procedureRowId?: number | null; procedureId?: string; sourceProcedureId?: string }>,
  rowId: number,
  currentProcedureId: string,
) {
  const bundle = localExpenses.find((e) => e.procedureRowId === rowId);
  if (!bundle || !currentProcedureId) return null;
  const pid = String(currentProcedureId).trim();
  const stored = String(bundle.procedureId || bundle.sourceProcedureId || '').trim();
  if (stored && stored !== pid) return null;
  return bundle;
}

export function procedureMasterHasCostingDefaults(proc: Record<string, unknown>): boolean {
  return (
    (Array.isArray(proc.doctorShares) && proc.doctorShares.length > 0) ||
    (Array.isArray(proc.defaultExpenses) && proc.defaultExpenses.length > 0) ||
    (Array.isArray(proc.consumptions) && proc.consumptions.length > 0)
  );
}

/** Short label for invoice procedure row after master prefetch */
export function procedureCostingBundleSummary(bundle: {
  doctorShares?: unknown[];
  expenses?: unknown[];
  consumptions?: unknown[];
} | null | undefined): string {
  if (!bundle) return '';
  const doctors = Array.isArray(bundle.doctorShares) ? bundle.doctorShares.length : 0;
  const expenses = Array.isArray(bundle.expenses) ? bundle.expenses.length : 0;
  const pharmacy = Array.isArray(bundle.consumptions) ? bundle.consumptions.length : 0;
  if (!doctors && !expenses && !pharmacy) return '';
  const parts: string[] = [];
  if (doctors) parts.push(`${doctors} doctor${doctors > 1 ? 's' : ''}`);
  if (expenses) parts.push(`${expenses} expense${expenses > 1 ? 's' : ''}`);
  if (pharmacy) parts.push(`${pharmacy} pharmacy`);
  return parts.join(' · ');
}
