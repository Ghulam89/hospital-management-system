export type PaymentRowLike = { amount?: number; paid?: number };

export function paymentRowAmount(row: PaymentRowLike): number {
  if (row == null) return 0;
  if (row.amount != null && Number.isFinite(Number(row.amount))) {
    return Number(row.amount);
  }
  return Number(row.paid) || 0;
}

export function roundInvoiceMoney(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

export function breakdownClientPayments(rows: PaymentRowLike[]) {
  let received = 0;
  let refunds = 0;
  for (const row of Array.isArray(rows) ? rows : []) {
    const a = paymentRowAmount(row);
    if (a > 0) received += a;
    else if (a < 0) refunds += Math.abs(a);
  }
  const netPaid = roundInvoiceMoney(received - refunds);
  return {
    received: roundInvoiceMoney(received),
    refunds: roundInvoiceMoney(refunds),
    netPaid,
  };
}

export function clientDueAndAdvance(grandTotal: number, netPaid: number) {
  const bill = roundInvoiceMoney(Math.max(0, grandTotal));
  const paid = roundInvoiceMoney(netPaid);
  return {
    bill,
    paid,
    due: roundInvoiceMoney(Math.max(0, bill - paid)),
    advance: roundInvoiceMoney(Math.max(0, paid - bill)),
  };
}

export type ClientBalanceDisplay = {
  bill: number;
  paid: number;
  due: number;
  advance: number;
  statusLabel: string;
  statusAmount: number;
  statusTone: 'due' | 'advance' | 'clear';
  headerText: string;
};

export type ClientPaymentBalanceOptions = {
  undatedAdvance?: number;
};

export function getClientPaymentBalance(
  grandTotal: number,
  paymentRows: PaymentRowLike[],
  options?: ClientPaymentBalanceOptions,
): ClientBalanceDisplay {
  const { received, refunds, netPaid } = breakdownClientPayments(paymentRows);
  const undated = roundInvoiceMoney(Math.max(0, options?.undatedAdvance ?? 0));
  const billWithAdvance = roundInvoiceMoney(Math.max(0, grandTotal) + undated);
  const { bill, due, advance } = clientDueAndAdvance(billWithAdvance, netPaid);

  if (netPaid < 0 && refunds > received) {
    return {
      bill,
      paid: netPaid,
      due,
      advance,
      statusLabel: 'Due Amount',
      statusAmount: due > 0 ? due : Math.abs(netPaid),
      statusTone: 'due',
      headerText: `Refunds exceed payments by Rs. ${Math.abs(netPaid).toFixed(2)}`,
    };
  }
  if (advance > 0) {
    return {
      bill,
      paid: netPaid,
      due,
      advance,
      statusLabel: 'Advance Paid',
      statusAmount: advance,
      statusTone: 'advance',
      headerText: `Advance: Rs. ${advance.toFixed(2)}`,
    };
  }
  if (due > 0) {
    return {
      bill,
      paid: netPaid,
      due,
      advance,
      statusLabel: 'Due Amount',
      statusAmount: due,
      statusTone: 'due',
      headerText: `Due: Rs. ${due.toFixed(2)}`,
    };
  }
  return {
    bill,
    paid: netPaid,
    due,
    advance,
    statusLabel: 'Balance',
    statusAmount: 0,
    statusTone: 'clear',
    headerText: netPaid > 0 ? 'Payment Complete' : 'No payment yet',
  };
}

export function formatPaymentBreakdownLabel(
  received: number,
  refunds: number,
  netPaid: number,
): string {
  if (refunds <= 0) return `Rs. ${netPaid.toFixed(2)}`;
  return `Rs. ${netPaid.toFixed(2)} (received ${received.toFixed(2)}, refunds ${refunds.toFixed(2)})`;
}
