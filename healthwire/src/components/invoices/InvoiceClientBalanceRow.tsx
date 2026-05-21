import {
  breakdownClientPayments,
  formatPaymentBreakdownLabel,
  getClientPaymentBalance,
  type PaymentRowLike,
} from '../../utils/invoicePaymentSummary';

type Props = {
  grandTotal: number;
  paymentRows: PaymentRowLike[];
  undatedAdvance?: number;
  showPaidLine?: boolean;
};

export default function InvoiceClientBalanceRow({
  grandTotal,
  paymentRows,
  undatedAdvance = 0,
  showPaidLine = true,
}: Props) {
  const b = getClientPaymentBalance(grandTotal, paymentRows, { undatedAdvance });
  const { received, refunds } = breakdownClientPayments(paymentRows);

  const amountClass =
    b.statusTone === 'due'
      ? 'text-red-500'
      : b.statusTone === 'advance'
        ? 'text-amber-600'
        : 'text-green-500';

  return (
    <>
      {showPaidLine && (
        <div className="flex justify-between gap-2">
          <span>Net Paid:</span>
          <span
            className={`font-medium text-right ${
              b.paid < 0 ? 'text-red-600' : 'text-green-600'
            }`}
          >
            {formatPaymentBreakdownLabel(received, refunds, b.paid)}
          </span>
        </div>
      )}
      <div className="flex justify-between">
        <span>{b.statusLabel}:</span>
        <span className={`font-medium ${amountClass}`}>
          {b.statusTone === 'clear'
            ? b.paid > 0
              ? 'Paid in full'
              : 'Rs. 0.00'
            : `Rs. ${b.statusAmount.toFixed(2)}`}
        </span>
      </div>
    </>
  );
}
