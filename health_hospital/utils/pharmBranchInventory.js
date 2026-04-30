const mongoose = require("mongoose");
const PharmItem = require("../models/pharmItemModel");

const escapeRegex = (s) => String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function keyParts(doc) {
  const bc = doc.barcode != null ? String(doc.barcode).trim() : "";
  if (bc) return { barcode: bc };
  const name = String(doc.name || "").trim();
  const rp = Number(doc.retailPrice) || 0;
  return { name, retailPrice: rp };
}

async function findBranchRowId(branchOid, doc) {
  const parts = keyParts(doc);
  if (parts.barcode) {
    const row = await PharmItem.findOne({
      branchId: branchOid,
      barcode: new RegExp(`^${escapeRegex(parts.barcode)}$`, "i"),
    })
      .select("_id")
      .lean();
    return row ? row._id : null;
  }
  const row = await PharmItem.findOne({
    branchId: branchOid,
    name: new RegExp(`^${escapeRegex(parts.name)}$`, "i"),
    retailPrice: parts.retailPrice,
  })
    .select("_id")
    .lean();
  return row ? row._id : null;
}

async function findMasterLean(doc) {
  const parts = keyParts(doc);
  const globalOr = [{ branchId: null }, { branchId: { $exists: false } }];
  if (parts.barcode) {
    const m = await PharmItem.findOne({
      $and: [{ $or: globalOr }, { barcode: new RegExp(`^${escapeRegex(parts.barcode)}$`, "i") }],
    }).lean();
    if (m) return m;
  }
  return PharmItem.findOne({
    $and: [
      { $or: globalOr },
      { name: new RegExp(`^${escapeRegex(parts.name)}$`, "i") },
      { retailPrice: parts.retailPrice },
    ],
  }).lean();
}

/**
 * Map the PharmItem id coming from the UI (often catalog/master) to the inventory row for `branchOid`.
 * Creates a branch-scoped copy from global master (or template doc) when missing.
 */
async function resolvePharmItemIdForBranchStock(pharmItemId, branchOid) {
  if (!pharmItemId || !branchOid) return null;
  if (!mongoose.Types.ObjectId.isValid(String(pharmItemId))) return null;

  const bid =
    branchOid instanceof mongoose.Types.ObjectId ? branchOid : new mongoose.Types.ObjectId(String(branchOid));

  const doc = await PharmItem.findById(pharmItemId).lean();
  if (!doc) return null;

  const docBranch = doc.branchId != null && doc.branchId !== "" ? String(doc.branchId) : "";
  if (docBranch && docBranch === String(bid)) {
    return new mongoose.Types.ObjectId(String(pharmItemId));
  }

  let targetId = await findBranchRowId(bid, doc);
  if (targetId) return targetId;

  const master = (await findMasterLean(doc)) || doc;
  const template = { ...master };
  delete template._id;
  delete template.__v;
  delete template.createdAt;
  delete template.updatedAt;
  template.branchId = bid;
  template.availableQuantity = 0;
  template.expiredQuantity = Number(template.expiredQuantity) || 0;
  template.openingStock = 0;

  try {
    const created = await PharmItem.create(template);
    return created._id;
  } catch (err) {
    targetId = await findBranchRowId(bid, doc);
    if (targetId) return targetId;
    throw err;
  }
}

module.exports = {
  resolvePharmItemIdForBranchStock,
};
