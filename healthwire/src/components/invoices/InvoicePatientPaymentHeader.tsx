import { getClientPaymentBalance, type PaymentRowLike } from '../../utils/invoicePaymentSummary';

type Props = {
  grandTotal: number;
  paymentRows: PaymentRowLike[];
  undatedAdvance?: number;
};

export default function InvoicePatientPaymentHeader({
  grandTotal,
  paymentRows,
  undatedAdvance = 0,
}: Props) {
  const b = getClientPaymentBalance(grandTotal, paymentRows, { undatedAdvance });

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap justify-end gap-2 text-sm">
        <span className="rounded-md border border-stroke bg-gray-50 px-3 py-1.5">
          Net paid:{' '}
          <span className={`font-semibold ${b.paid < 0 ? 'text-red-700' : 'text-green-700'}`}>
            Rs. {b.paid.toFixed(2)}
          </span>
        </span>
        {b.due > 0 && (
          <span className="rounded-md bg-red-100 px-3 py-1.5 font-medium text-red-800">
            Due: Rs. {b.due.toFixed(2)}
          </span>
        )}
        {b.advance > 0 && (
          <span className="rounded-md bg-amber-100 px-3 py-1.5 font-medium text-amber-900">
            Advance: Rs. {b.advance.toFixed(2)}
          </span>
        )}
        {b.statusTone === 'clear' && b.paid > 0 && (
          <span className="rounded-md bg-green-100 px-3 py-1.5 font-medium text-green-800">
            Paid in full
          </span>
        )}
      </div>
      <span className="text-xs text-gray-500">
        Bill Rs. {b.bill.toFixed(2)}
        {undatedAdvance > 0 ? ' (includes undated advance)' : ''}
      </span>
    </div>
  );
}
