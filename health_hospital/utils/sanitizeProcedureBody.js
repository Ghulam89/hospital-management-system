const mongoose = require('mongoose');

function isValidObjectId(id) {
  return id && mongoose.Types.ObjectId.isValid(String(id));
}

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function sanitizeProcedureBody(body = {}) {
  const out = { ...body };
  delete out.branchId;
  delete out.createdBy;

  out.amount = out.amount != null ? String(out.amount) : '';
  out.cost = num(out.cost, 0);
  out.discount = Math.max(0, num(out.discount, 0));
  out.discountType = out.discountType === 1 ? 1 : 0;
  out.taxRate = Math.max(0, num(out.taxRate, 0));
  out.subDepartment = String(out.subDepartment || '').trim();

  if (out.isActive !== undefined) {
    out.isActive = !(
      out.isActive === false ||
      out.isActive === 'false' ||
      out.isActive === 0 ||
      out.isActive === '0'
    );
  }

  if (Array.isArray(out.doctorShares)) {
    out.doctorShares = out.doctorShares
      .filter((row) => isValidObjectId(row?.doctorId))
      .map((row) => ({
        doctorId: row.doctorId,
        share: Math.max(0, num(row.share, 0)),
        shareType:
          String(row.shareType || '').toLowerCase() === 'value' ? 'value' : 'percentage',
      }));
  }

  if (Array.isArray(out.defaultExpenses)) {
    out.defaultExpenses = out.defaultExpenses
      .filter(
        (row) =>
          isValidObjectId(row?.expenseCategoryId) &&
          num(row.amount, 0) > 0,
      )
      .map((row) => ({
        description: String(row.description || '').trim(),
        expenseCategoryId: row.expenseCategoryId,
        amount: num(row.amount, 0),
        deductBeforeDoctorShare: !!row.deductBeforeDoctorShare,
        showInPrint: !!row.showInPrint,
      }));
  }

  if (Array.isArray(out.consumptions)) {
    out.consumptions = out.consumptions
      .filter((row) => isValidObjectId(row?.pharmItemId) && num(row.qty, 0) > 0)
      .map((row) => ({
        pharmItemId: row.pharmItemId,
        qty: num(row.qty, 1),
        batchNumber: String(row.batchNumber || '').trim(),
      }));
  }

  return out;
}

module.exports = { sanitizeProcedureBody, isValidObjectId };
