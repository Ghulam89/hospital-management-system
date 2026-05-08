const mongoose = require("mongoose");
const StoreClosing = require("../models/storeClosingModel");

function startOfLocalDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addOneLocalDay(d) {
  const x = new Date(d);
  x.setDate(x.getDate() + 1);
  return x;
}

/** True when `value` is strictly before today's calendar start (local). */
function isBeforeStartOfTodayLocal(value) {
  if (value == null || value === "") return false;
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return false;
  return dt < startOfLocalDay(new Date());
}

/**
 * Store closing for a calendar day locks pharmacy POS for that branch.
 * Closings with no branchId apply to every branch (legacy / single-site).
 */
async function isPharmPosDayClosedForBranch(branchId, anchorDate) {
  const dayStart = startOfLocalDay(anchorDate);
  const dayEnd = addOneLocalDay(dayStart);

  const orBranch = [];
  if (branchId != null && branchId !== "" && mongoose.Types.ObjectId.isValid(String(branchId))) {
    orBranch.push({ branchId: new mongoose.Types.ObjectId(String(branchId)) });
  }
  orBranch.push({ branchId: null });
  orBranch.push({ branchId: { $exists: false } });

  const found = await StoreClosing.findOne({
    closingDate: { $gte: dayStart, $lt: dayEnd },
    $or: orBranch,
  })
    .select("branchId")
    .lean();

  if (!found) return false;
  if (found.branchId == null || !found.branchId) return true;
  if (branchId != null && branchId !== "" && mongoose.Types.ObjectId.isValid(String(branchId))) {
    return String(found.branchId) === String(branchId);
  }
  return false;
}

function getEffectivePosTimestamp(body, existingDoc) {
  if (body && body.createdAt) return new Date(body.createdAt);
  if (body && Array.isArray(body.payment) && body.payment.length > 0 && body.payment[0].payDate) {
    return new Date(body.payment[0].payDate);
  }
  if (existingDoc && existingDoc.createdAt) return new Date(existingDoc.createdAt);
  return new Date();
}

function normPharmItemId(line) {
  if (!line) return "";
  const pid = line.pharmItemId;
  if (pid && typeof pid === "object" && pid._id) return String(pid._id);
  return String(pid || "");
}

function posAllItemQtyOrLinesChanged(oldItems, newItems) {
  if (!Array.isArray(newItems)) return false;
  if (!Array.isArray(oldItems)) return newItems.length > 0;
  if (oldItems.length !== newItems.length) return true;
  for (let i = 0; i < oldItems.length; i++) {
    const a = oldItems[i] || {};
    const b = newItems[i] || {};
    if (normPharmItemId(a) !== normPharmItemId(b)) return true;
    if (Number(a.quantity) !== Number(b.quantity)) return true;
    if (Number(a.returnQuantity || 0) !== Number(b.returnQuantity || 0)) return true;
  }
  return false;
}

module.exports = {
  startOfLocalDay,
  isBeforeStartOfTodayLocal,
  isPharmPosDayClosedForBranch,
  getEffectivePosTimestamp,
  posAllItemQtyOrLinesChanged,
};
