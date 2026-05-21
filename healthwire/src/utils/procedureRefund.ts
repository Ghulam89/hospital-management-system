export type ProcedureRefundLine = {
  rate?: number;
  quantity?: number;
  amount?: number;
  discount?: number;
  discountType?: number;
  total?: number;
  procedureId?: unknown;
};

export type ProcedureRefundPayment = {
  paid?: number;
  notes?: string;
};

export function roundMoney(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

export function formatProcedureRefundMoney(n: number): string {
  return roundMoney(n).toFixed(2);
}

export function refId(value: unknown): string {
  if (value == null || value === '') return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && '_id' in value) {
    const idVal = (value as { _id: unknown })._id;
    if (idVal != null && idVal !== '') return String(idVal);
  }
  return '';
}

function procedureLineRefundableBalance(item: ProcedureRefundLine): number {
  const total = Number(item.total);
  if (Number.isFinite(total) && total > 0) return roundMoney(total);

  const amount = Number(item.amount) || 0;
  const discount = Number(item.discount) || 0;
  const discountType = Number(item.discountType) || 0;
  const rate = Number(item.rate) || 0;
  const qty = Number(item.quantity) || 0;

  let base = amount;
  if (base <= 0 && rate > 0 && qty > 0) base = rate * qty;
  if (base <= 0) return 0;

  if (discount <= 0) return roundMoney(base);
  if (discountType === 1) {
    return roundMoney(Math.max(0, base - (base * discount) / 100));
  }
  return roundMoney(Math.max(0, base - discount));
}

export function procedureRefundLineMarker(procedureId: string, itemIndex: number): string {
  const id = refId(procedureId);
  const idx = Number.isFinite(itemIndex) && itemIndex >= 0 ? Math.floor(itemIndex) : 0;
  return `ProcedureRefund:${id}#${idx}`;
}

export function hasProcedureRefundOnLine(
  payments: ProcedureRefundPayment[] | undefined,
  procedureId: string,
  itemIndex: number,
): boolean {
  const id = refId(procedureId);
  if (!id || !Array.isArray(payments)) return false;
  const lineMarker = procedureRefundLineMarker(id, itemIndex);
  const legacyIdx =
    Number.isFinite(itemIndex) && itemIndex >= 0 ? Math.floor(itemIndex) : 0;
  return payments.some((p) => {
    const notes = typeof p?.notes === 'string' ? p.notes : '';
    if (!notes.includes('ProcedureRefund:')) return false;
    if (notes.includes(lineMarker)) return true;
    if (
      legacyIdx === 0 &&
      notes.includes(`ProcedureRefund:${id}`) &&
      !notes.includes(`ProcedureRefund:${id}#`)
    ) {
      return true;
    }
    return false;
  });
}

export function sumProcedureRefundsFromPayments(
  payments: ProcedureRefundPayment[] | undefined,
  targetId: string,
  itemIndex?: number,
): number {
  const id = refId(targetId);
  if (!id || !Array.isArray(payments)) return 0;
  const lineMarker =
    itemIndex != null && Number.isFinite(itemIndex) && itemIndex >= 0
      ? procedureRefundLineMarker(id, itemIndex)
      : null;
  const legacyIdx =
    itemIndex != null && Number.isFinite(itemIndex) && itemIndex >= 0
      ? Math.floor(itemIndex)
      : 0;
  return payments
    .filter((p) => {
      if (typeof p?.notes !== 'string') return false;
      if (lineMarker) {
        if (p.notes.includes(lineMarker)) return true;
        if (
          legacyIdx === 0 &&
          p.notes.includes(`ProcedureRefund:${id}`) &&
          !p.notes.includes(`ProcedureRefund:${id}#`)
        ) {
          return true;
        }
        return false;
      }
      return p.notes.includes(`ProcedureRefund:${id}`);
    })
    .reduce((sum, p) => sum + Math.abs(Number(p?.paid) || 0), 0);
}

export function procedureOriginalNet(item: ProcedureRefundLine): number {
  const rate = Number(item.rate) || 0;
  const qty = Number(item.quantity) || 0;
  const gross = rate * qty;
  const base = gross > 0 ? gross : Number(item.amount) || 0;
  const discount = Number(item.discount) || 0;
  const discountType = Number(item.discountType) || 0;
  if (base <= 0) return 0;
  if (discount <= 0) return roundMoney(base);
  if (discountType === 1) {
    return roundMoney(Math.max(0, base - (base * discount) / 100));
  }
  return roundMoney(Math.max(0, base - discount));
}

export function procedureCurrentLineBalance(item: ProcedureRefundLine): number {
  const explicitTotal = Number(item.total);
  const lineWithTotal = procedureLineRefundableBalance(item);
  const lineNoTotal = procedureLineRefundableBalance({ ...item, total: undefined });
  if (Number.isFinite(explicitTotal) && explicitTotal <= 0 && lineNoTotal > 0) {
    return lineNoTotal;
  }
  if (lineNoTotal > 0) {
    return roundMoney(Math.min(lineWithTotal, lineNoTotal));
  }
  return lineWithTotal;
}

export function procedureMaxRefundable(
  item: ProcedureRefundLine,
  payments: ProcedureRefundPayment[] | undefined,
  procedureId: string,
  itemIndex?: number,
): number {
  const targetId = refId(procedureId);
  if (
    itemIndex != null &&
    Number.isFinite(itemIndex) &&
    hasProcedureRefundOnLine(payments, targetId, itemIndex)
  ) {
    return 0;
  }
  const alreadyRefunded = sumProcedureRefundsFromPayments(
    payments,
    targetId,
    itemIndex,
  );
  const currentLine = procedureCurrentLineBalance(item);
  const catalogNet = procedureOriginalNet(item);

  if (alreadyRefunded > 0) {
    const impliedOriginal = roundMoney(
      Math.min(currentLine + alreadyRefunded, alreadyRefunded + catalogNet),
    );
    let remaining = roundMoney(Math.max(0, impliedOriginal - alreadyRefunded));
    if (currentLine <= 0 && catalogNet > 0) {
      remaining = roundMoney(Math.max(remaining, catalogNet));
    }
    if (currentLine > 0) {
      return roundMoney(Math.min(remaining, currentLine));
    }
    return remaining;
  }

  const cap = roundMoney(currentLine > 0 ? currentLine : catalogNet);
  return roundMoney(Math.min(cap, catalogNet > 0 ? catalogNet : cap));
}

export function procedureMaxRefundableFromInvoiceRow(
  item: ProcedureRefundLine & { procedureId?: unknown },
  payments: ProcedureRefundPayment[] | undefined,
  itemIndex?: number,
): number {
  const pid = refId(item.procedureId);
  if (!pid) return 0;
  return procedureMaxRefundable(item, payments, pid, itemIndex);
}
