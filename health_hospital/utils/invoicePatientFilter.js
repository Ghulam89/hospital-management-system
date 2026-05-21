const Patient = require("../models/patientModel");
const { getScopedPatientIds } = require("./branchScope");
const { normalizePhone } = require("./patientIdentity");

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Resolve patient _ids for invoice list filters (branch-scoped, exact MR / normalized phone).
 * @returns {null} no patient field filters active
 * @returns {[]} no matches
 * @returns {import('mongoose').Types.ObjectId[]} matches
 */
async function resolveInvoiceFilterPatientIds(
  req,
  { patientMR, patientName, patientPhone } = {},
) {
  const mrRaw = String(patientMR || "").trim();
  const name = String(patientName || "").trim();
  const phone = String(patientPhone || "").trim();
  if (!mrRaw && !name && !phone) return null;

  const scoped = await getScopedPatientIds(req);
  const q = {};
  if (scoped !== null) {
    if (!scoped.length) return [];
    q._id = { $in: scoped };
  }

  const and = [];
  if (mrRaw) {
    const digits = mrRaw.replace(/\D/g, "");
    const looksLikeMr =
      digits.length >= 4 && digits.length <= 10 && /^\d+$/.test(digits);
    if (looksLikeMr) {
      const mrOr = [{ mr: digits }];
      if (mrRaw !== digits) mrOr.push({ mr: mrRaw });
      and.push(mrOr.length === 1 ? mrOr[0] : { $or: mrOr });
    } else {
      and.push({ mr: { $regex: escapeRegex(mrRaw), $options: "i" } });
    }
  }
  if (name) {
    and.push({ name: { $regex: escapeRegex(name), $options: "i" } });
  }
  if (phone) {
    const pn = normalizePhone(phone);
    const phoneOr = [];
    if (pn.length >= 10) phoneOr.push({ phoneNormalized: pn });
    phoneOr.push({ phone: { $regex: escapeRegex(phone), $options: "i" } });
    and.push(phoneOr.length === 1 ? phoneOr[0] : { $or: phoneOr });
  }

  if (and.length === 1) Object.assign(q, and[0]);
  else if (and.length > 1) q.$and = and;

  const docs = await Patient.find(q).select("_id").limit(5000).lean();
  return docs.map((d) => d._id);
}

function intersectObjectIdLists(a, b) {
  if (!Array.isArray(a) || !a.length) return [];
  if (!Array.isArray(b) || !b.length) return [];
  const set = new Set(b.map(String));
  return a.filter((id) => set.has(String(id)));
}

module.exports = {
  resolveInvoiceFilterPatientIds,
  intersectObjectIdLists,
};
