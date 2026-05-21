const { roundMoneyAmount } = require("./invoiceProcedureRefund");

function isItemDated(item) {
  const pd = item?.procedureDate;
  if (pd == null || pd === "") return false;
  if (typeof pd === "string" && !String(pd).trim()) return false;
  const d = new Date(pd);
  return Number.isFinite(d.getTime());
}

/** Net line amount after discount (uses `total` when set, e.g. after procedure refund). */
function lineNetAfterDiscount(item) {
  if (!item || typeof item !== "object") return 0;
  const total = Number(item.total);
  const amount = Number(item.amount) || 0;
  const discount = Number(item.discount) || 0;
  const discountType = Number(item.discountType) || 0;

  if (Number.isFinite(total) && total >= 0) {
    if (total > 0 || amount <= 0) {
      return roundMoneyAmount(Math.max(0, total));
    }
  }

  const disc =
    discountType === 1 ? amount * (discount / 100) : discount;
  return roundMoneyAmount(Math.max(0, amount - disc));
}

/** Dated procedures only — matches frontend `calculateGrandTotal`. */
function computeDatedInvoiceBillTotals(
  items,
  invoiceDiscount = 0,
  invoiceDiscountType = 0,
) {
  const list = Array.isArray(items) ? items : [];
  let subTotal = 0;
  let procedureDiscount = 0;
  let procedureNet = 0;

  for (const it of list) {
    if (!isItemDated(it)) continue;
    const amt = Number(it.amount) || 0;
    subTotal += amt;
    const disc = Number(it.discount) || 0;
    const dt = Number(it.discountType) || 0;
    if (dt === 1) procedureDiscount += amt * (disc / 100);
    else procedureDiscount += disc;
    procedureNet += lineNetAfterDiscount(it);
  }

  let invoiceDiscountApplied = 0;
  const invDisc = Number(invoiceDiscount) || 0;
  const invType = Number(invoiceDiscountType) || 0;
  if (procedureNet > 0) {
    if (invType === 1) {
      invoiceDiscountApplied = Math.min(
        procedureNet,
        Math.max(0, procedureNet * (invDisc / 100)),
      );
    } else {
      invoiceDiscountApplied = Math.min(procedureNet, Math.max(0, invDisc));
    }
  }

  const totalBill = roundMoneyAmount(
    Math.max(0, procedureNet - invoiceDiscountApplied),
  );

  return {
    subTotalBill: roundMoneyAmount(subTotal),
    discountBill: roundMoneyAmount(procedureDiscount + invoiceDiscountApplied),
    totalBill,
    procedureNet: roundMoneyAmount(procedureNet),
    invoiceDiscountApplied: roundMoneyAmount(invoiceDiscountApplied),
  };
}

/** Undated procedure lines — matches frontend `undatedProcedureAdvance`. */
function computeUndatedAdvanceTotal(items) {
  return roundMoneyAmount(
    (Array.isArray(items) ? items : [])
      .filter((it) => !isItemDated(it))
      .reduce((sum, it) => sum + lineNetAfterDiscount(it), 0),
  );
}

function computeClientBillFromItems(
  items,
  invoiceDiscount = 0,
  invoiceDiscountType = 0,
) {
  const dated = computeDatedInvoiceBillTotals(
    items,
    invoiceDiscount,
    invoiceDiscountType,
  );
  const undated = computeUndatedAdvanceTotal(items);
  return {
    ...dated,
    undatedAdvance: undated,
    clientBill: roundMoneyAmount(dated.totalBill + undated),
  };
}

module.exports = {
  isItemDated,
  lineNetAfterDiscount,
  computeDatedInvoiceBillTotals,
  computeUndatedAdvanceTotal,
  computeClientBillFromItems,
};
