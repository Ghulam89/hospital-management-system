function roundMoneyAmount(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

/** Net refundable balance for one invoice line (total after discount, not raw amount). */
function procedureLineRefundableBalance(item) {
  if (!item || typeof item !== "object") return 0;
  const total = Number(item.total);
  if (Number.isFinite(total) && total > 0) return roundMoneyAmount(total);

  const amount = Number(item.amount) || 0;
  const discount = Number(item.discount) || 0;
  const discountType = Number(item.discountType) || 0;
  const rate = Number(item.rate) || 0;
  const qty = Number(item.quantity) || 0;

  let base = amount;
  if (base <= 0 && rate > 0 && qty > 0) base = rate * qty;
  if (base <= 0) return 0;

  if (discount <= 0) return roundMoneyAmount(base);
  if (discountType === 1) {
    return roundMoneyAmount(Math.max(0, base - (base * discount) / 100));
  }
  return roundMoneyAmount(Math.max(0, base - discount));
}

function procedureRefundLineMarker(procedureId, itemIndex) {
  const id = procedureId != null ? String(procedureId) : "";
  const idx =
    Number.isFinite(itemIndex) && itemIndex >= 0 ? Math.floor(itemIndex) : 0;
  return `ProcedureRefund:${id}#${idx}`;
}

function hasProcedureRefundOnLine(payments, targetId, itemIndex) {
  const id = targetId != null ? String(targetId) : "";
  if (!id) return false;
  const lineMarker = procedureRefundLineMarker(id, itemIndex);
  const legacyIdx =
    Number.isFinite(itemIndex) && itemIndex >= 0 ? Math.floor(itemIndex) : 0;
  return (Array.isArray(payments) ? payments : []).some((p) => {
    const notes = typeof p?.notes === "string" ? p.notes : "";
    if (!notes.includes("ProcedureRefund:")) return false;
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

function sumProcedureRefundsFromPayments(payments, targetId, itemIndex) {
  const id = targetId != null ? String(targetId) : "";
  if (!id) return 0;
  const lineMarker =
    itemIndex != null && Number.isFinite(itemIndex) && itemIndex >= 0
      ? procedureRefundLineMarker(id, itemIndex)
      : null;
  const legacyIdx =
    itemIndex != null && Number.isFinite(itemIndex) && itemIndex >= 0
      ? Math.floor(itemIndex)
      : 0;
  return (Array.isArray(payments) ? payments : [])
    .filter((p) => {
      if (typeof p?.notes !== "string") return false;
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

/** Original net for a line (rate×qty − discount). */
function procedureOriginalNet(item) {
  if (!item || typeof item !== "object") return 0;
  const rate = Number(item.rate) || 0;
  const qty = Number(item.quantity) || 0;
  const discount = Number(item.discount) || 0;
  const discountType = Number(item.discountType) || 0;
  let base = rate > 0 && qty > 0 ? rate * qty : Number(item.amount) || 0;
  if (base <= 0) return 0;
  if (discount <= 0) return roundMoneyAmount(base);
  if (discountType === 1) {
    return roundMoneyAmount(Math.max(0, base - (base * discount) / 100));
  }
  return roundMoneyAmount(Math.max(0, base - discount));
}

/** Current line balance (handles total=0 with amount still set). */
function procedureCurrentLineBalance(item) {
  const explicitTotal = Number(item.total);
  const lineWithTotal = procedureLineRefundableBalance(item);
  const lineNoTotal = procedureLineRefundableBalance({ ...item, total: null });
  if (Number.isFinite(explicitTotal) && explicitTotal <= 0 && lineNoTotal > 0) {
    return lineNoTotal;
  }
  if (lineNoTotal > 0) {
    return roundMoneyAmount(Math.min(lineWithTotal, lineNoTotal));
  }
  return lineWithTotal;
}

/** Remaining refundable for one procedure line. */
function procedureMaxRefundable(item, payments, targetId, itemIndex) {
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
    const impliedOriginal = roundMoneyAmount(
      Math.min(currentLine + alreadyRefunded, alreadyRefunded + catalogNet),
    );
    let remaining = roundMoneyAmount(
      Math.max(0, impliedOriginal - alreadyRefunded),
    );
    if (currentLine <= 0 && catalogNet > 0) {
      remaining = roundMoneyAmount(Math.max(remaining, catalogNet));
    }
    if (currentLine > 0) {
      return roundMoneyAmount(Math.min(remaining, currentLine));
    }
    return remaining;
  }

  const cap = roundMoneyAmount(currentLine > 0 ? currentLine : catalogNet);
  return roundMoneyAmount(Math.min(cap, catalogNet > 0 ? catalogNet : cap));
}

module.exports = {
  roundMoneyAmount,
  procedureLineRefundableBalance,
  procedureCurrentLineBalance,
  procedureOriginalNet,
  procedureRefundLineMarker,
  hasProcedureRefundOnLine,
  sumProcedureRefundsFromPayments,
  procedureMaxRefundable,
};
