const Department = require("../models/departmentModel");
const PharmItem = require("../models/pharmItemModel");
const PharmPos = require("../models/pharmPosModel");
const PharmInboundStock = require("../models/pharmInboundStockModel");
const mongoose = require("mongoose");
const { mergeBranchScopedQuery, assignBranchIdForCreate, branchDocumentVisible, resolveBranchIdForNonSuperAdmin } = require("../utils/branchScope");
const { normalizeRole } = require("../middleware/auth");

const escapeRegex = (s) => String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// 1. Create pharmItem
const addpharmItem = async (req, res) => {
  try {
    const cleanedBody = {};
    for (const key in req.body) {
      if (req.body[key] !== null && req.body[key] !== undefined && req.body[key] !== '') {
        cleanedBody[key] = req.body[key];
      }
    }

    const branchDupFilter = await mergeBranchScopedQuery(req);
    const dupExtra = branchDupFilter && Object.keys(branchDupFilter).length ? branchDupFilter : {};

    const nameStr = String(req.body?.name || "").trim();
    const retail = Number(req.body?.retailPrice) || 0;
    const bcRaw = req.body?.barcode;
    const bc = bcRaw === '' || bcRaw === null || bcRaw === undefined ? null : String(bcRaw).trim();
    const altRaw = Array.isArray(req.body?.alternateBarcodes) ? req.body.alternateBarcodes : [];
    const alt = altRaw.map((v) => String(v || "").trim()).filter(Boolean);

    if (nameStr) {
      const nameRegex = new RegExp(`^${escapeRegex(nameStr)}$`, "i");
      const dupCombo = await PharmItem.findOne({ name: nameRegex, retailPrice: retail, barcode: bc, ...dupExtra });
      if (dupCombo) {
        return res.status(409).json({ status: "error", message: "Duplicate item with same name, price, and barcode exists" });
      }
    }

    const orConds = [];
    if (bc !== null) {
      orConds.push({ barcode: bc });
      orConds.push({ alternateBarcodes: bc });
    }
    if (alt.length > 0) {
      orConds.push({ barcode: { $in: alt } });
      orConds.push({ alternateBarcodes: { $in: alt } });
    }
    if (orConds.length > 0) {
      const dupAnyBarcode = await PharmItem.findOne(
        Object.keys(dupExtra).length ? { $and: [{ $or: orConds }, dupExtra] } : { $or: orConds }
      );
      if (dupAnyBarcode) {
        return res.status(409).json({ status: "error", message: "Duplicate barcode found in existing items" });
      }
    }

    const data = await PharmItem.create(assignBranchIdForCreate(req, cleanedBody));
    return res.status(200).json({ status: "ok", data: data });

  } catch (err) {
    console.error('Error creating pharmacy item:', err);
    res.status(500).json({ error: err.message });
  }
};

// 1. Create pharmItem
const addExcelpharmItem = async (req, res) => {
  try {


    if (!req.body.departmentName) {
      return res
        .status(500)
        .json({ status: "fail", message: "Must add department name!" });
    }

    let departmentId = await Department.findOne({ name: req.body.departmentName })


    const data = await PharmItem.create(assignBranchIdForCreate(req, { ...req.body, departmentId:departmentId?._id }));
    return res.status(200).json({ status: "ok", data: data });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/** Global catalog rows use branchId null; branch rows hold stock. Merge so POS shows one row per product with branch qty when matched by barcode or name+price. */
function mergeCatalogBranchPharmItems(rows, branchOid) {
  const bid = branchOid ? String(branchOid) : '';
  const plain = rows.map((r) => (typeof r.toObject === 'function' ? r.toObject({ virtuals: true }) : { ...r }));

  const branchRows = plain.filter((r) => r.branchId != null && String(r.branchId) === bid);
  const catalogRows = plain.filter((r) => r.branchId == null || r.branchId === undefined);

  const keyOf = (r) => {
    const bc = r.barcode != null ? String(r.barcode).trim() : '';
    if (bc) return `bc:${bc.toLowerCase()}`;
    const name = String(r.name || '').trim().toLowerCase();
    const rp = Number(r.retailPrice) || 0;
    return `nm:${name}:${rp}`;
  };

  const branchByKey = new Map();
  for (const br of branchRows) {
    branchByKey.set(keyOf(br), br);
  }

  const out = [];
  const branchSeen = new Set();

  for (const br of branchRows) {
    const k = keyOf(br);
    if (branchSeen.has(k)) continue;
    branchSeen.add(k);
    out.push({
      ...br,
      sellablePharmItemId: String(br._id),
      catalogMasterOnly: false,
      catalogMasterId: null,
    });
  }

  for (const cat of catalogRows) {
    const k = keyOf(cat);
    if (branchByKey.has(k)) continue;
    const plainCat = { ...cat };
    plainCat.availableQuantity = 0;
    plainCat.expiredQuantity = plainCat.expiredQuantity || 0;
    out.push({
      ...plainCat,
      sellablePharmItemId: null,
      catalogMasterOnly: true,
      catalogMasterId: String(cat._id),
    });
  }

  out.sort((a, b) => {
    const ta = new Date(a.createdAt || 0).getTime();
    const tb = new Date(b.createdAt || 0).getTime();
    return tb - ta;
  });
  return out;
}

function buildPharmItemFilters(req, catalogSync, branchQ) {
  const filters = [];

  if (catalogSync && branchQ && branchQ.branchId) {
    filters.push({
      $or: [
        { branchId: branchQ.branchId },
        { branchId: null },
        { branchId: { $exists: false } },
      ],
    });
  } else if (branchQ && branchQ.branchId) {
    filters.push({ branchId: branchQ.branchId });
  }

  if (req.query.pharmSupplierId) {
    filters.push({ pharmSupplierId: req.query.pharmSupplierId });
  }
  if (req.query.pharmManufacturerId) {
    filters.push({ pharmManufacturerId: req.query.pharmManufacturerId });
  }
  if (req.query.pharmCategoryId) {
    filters.push({ pharmCategoryId: req.query.pharmCategoryId });
  }
  if (req.query.unit) {
    filters.push({ unit: req.query.unit });
  }
  if (req.query.active) {
    filters.push({ active: req.query.active });
  }
  if (req.query.status) {
    filters.push({ status: req.query.status });
  }

  if (req.query.from || req.query.to) {
    const ca = {};
    if (req.query.from) ca.$gte = new Date(req.query.from);
    if (req.query.to) ca.$lte = new Date(req.query.to);
    filters.push({ createdAt: ca });
  }

  const search = req.query.search || '';
  if (search) {
    const searchRegex = { $regex: search, $options: 'i' };
    filters.push({
      $or: [
        { name: searchRegex },
        { barcode: searchRegex },
        { genericName: searchRegex },
        { alternateBarcodes: searchRegex },
      ],
    });
  }

  if (req.query.stock) {
    switch (req.query.stock) {
      case 'out-of-stock':
        filters.push({ availableQuantity: 0 });
        break;
      case 'low-stock':
        filters.push({
          $expr: {
            $lt: ['$availableQuantity', '$reOrderLevel'],
          },
        });
        break;
      case 'expired-stock':
        filters.push({
          $expr: {
            $lt: ['$availableQuantity', '$expiredQuantity'],
          },
        });
        break;
      case 'available-stock':
        filters.push({
          $expr: {
            $and: [
              { $gt: ['$availableQuantity', '$reOrderLevel'] },
              { $gt: ['$availableQuantity', '$expiredQuantity'] },
            ],
          },
        });
        break;
      default:
        filters.push({ stock: req.query.stock });
    }
  }

  if (filters.length === 0) return {};
  if (filters.length === 1) return filters[0];
  return { $and: filters };
}

const getpharmItems = async (req, res) => {
  try {
    let search = req.query.search || '';
    let page = parseInt(req.query.page, 10) || 1;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;

    const catalogSync = ['1', 'true', 'yes'].includes(String(req.query.catalog || '').toLowerCase());
    const branchQ = await mergeBranchScopedQuery(req);

    /** Duplicate barcode scan — keep legacy aggregation path (no catalog merge here). */
    if (req.query.duplicates) {
      let baseQuery = buildPharmItemFilters(req, false, branchQ);

      const duplicateGroups = await PharmItem.aggregate([
        { $match: baseQuery },
        {
          $group: {
            _id: '$barcode',
            count: { $sum: 1 },
          },
        },
        {
          $match: {
            _id: { $ne: null },
            count: { $gt: 1 },
          },
        },
      ]);

      const duplicateBarcodes = duplicateGroups.map((group) => group._id);

      if (duplicateBarcodes.length > 0) {
        baseQuery = {
          $and: [baseQuery, { barcode: { $in: duplicateBarcodes } }],
        };
      } else {
        return res.status(200).json({
          status: 'ok',
          data: [],
          search,
          page,
          count: 0,
          totalPages: 0,
          currentPage: page,
          limit,
        });
      }

      const data = await PharmItem.find(baseQuery)
        .sort({ createdAt: -1 })
        .populate(['pharmManufacturerId', 'pharmSupplierId', 'pharmCategoryId', 'pharmRackId'])
        .limit(limit)
        .skip((page - 1) * limit)
        .exec();

      const count = await PharmItem.countDocuments(baseQuery);

      return res.status(200).json({
        status: 'ok',
        data,
        search,
        page,
        count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        limit,
      });
    }

    const baseQuery = buildPharmItemFilters(req, catalogSync, branchQ);
    const branchOid = catalogSync && req.user ? await resolveBranchIdForNonSuperAdmin(req) : null;
    const useMerge = catalogSync && branchOid;

    const populatePaths = ['pharmManufacturerId', 'pharmSupplierId', 'pharmCategoryId', 'pharmRackId'];

    if (useMerge) {
      const MAX_FETCH = 2500;
      const raw = await PharmItem.find(baseQuery)
        .sort({ createdAt: -1 })
        .populate(populatePaths)
        .limit(MAX_FETCH)
        .exec();

      const merged = mergeCatalogBranchPharmItems(raw, branchOid);
      const totalMerged = merged.length;
      const data = merged.slice((page - 1) * limit, page * limit);

      return res.status(200).json({
        status: 'ok',
        data,
        search,
        page,
        count: totalMerged,
        totalPages: Math.ceil(totalMerged / limit) || 1,
        currentPage: page,
        limit,
        catalogMerged: true,
      });
    }

    const data = await PharmItem.find(baseQuery)
      .sort({ createdAt: -1 })
      .populate(populatePaths)
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();

    const count = await PharmItem.countDocuments(baseQuery);

    return res.status(200).json({
      status: 'ok',
      data,
      search,
      page,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      limit,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};


// 3. Get pharmItem by id
const getpharmItemById = async (req, res) => {
  try {
    const id = req.params.id;
    const data = await PharmItem.findById(id);
    if (!data || !(await branchDocumentVisible(req, data.branchId))) {
      return res.status(404).json({ status: "fail", message: "Item not found" });
    }
    return res.status(200).json({ status: "ok", data: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. Update pharmItem
const updatepharmItem = async (req, res) => {
  try {
    let id = req.params.id;

    if (!req.user) {
      return res.status(401).json({ status: "error", message: "Unauthorized" });
    }

    const existing = await PharmItem.findById(id).lean();
    if (!existing) {
      return res.status(404).json({ status: "error", message: "Item not found" });
    }
    if (!(await branchDocumentVisible(req, existing.branchId))) {
      return res.status(404).json({ status: "error", message: "Item not found" });
    }

    const role = normalizeRole(req.user.role);
    const isSuperAdmin = role === "superadmin" || role === "super admin";

    /** Branches may only PATCH pricing fields on their own inventory rows (e.g. Manage Stock inbound). Full edits are super admin only. */
    if (!isSuperAdmin) {
      const ALLOW = new Set(["retailPrice", "pieceCost"]);
      const cleaned = {};
      for (const k of Object.keys(req.body || {})) {
        if (!ALLOW.has(k)) continue;
        const v = req.body[k];
        if (v !== undefined && v !== null && v !== "") cleaned[k] = v;
      }
      if (Object.keys(cleaned).length === 0) {
        return res.status(403).json({
          status: "error",
          message:
            "Only super admin can edit item master data. Branches may only update retail price / piece cost on their inventory.",
        });
      }
      req.body = cleaned;
    }

    const branchDupFilter = await mergeBranchScopedQuery(req);
    const dupExtra = branchDupFilter && Object.keys(branchDupFilter).length ? branchDupFilter : {};

    const nextName = req.body.hasOwnProperty("name") ? String(req.body.name || "").trim() : String(existing.name || "");
    const nextRetail = req.body.hasOwnProperty("retailPrice") ? (Number(req.body.retailPrice) || 0) : (Number(existing.retailPrice) || 0);
    const nextBc = req.body.hasOwnProperty("barcode")
      ? (req.body.barcode === '' || req.body.barcode === null ? null : String(req.body.barcode).trim())
      : (existing.barcode ?? null);
    const nextAlt = req.body.hasOwnProperty("alternateBarcodes")
      ? (Array.isArray(req.body.alternateBarcodes) ? req.body.alternateBarcodes.map((v) => String(v || "").trim()).filter(Boolean) : [])
      : (Array.isArray(existing.alternateBarcodes) ? existing.alternateBarcodes.map((v) => String(v || "").trim()).filter(Boolean) : []);

    if (nextName) {
      const nameRegex = new RegExp(`^${escapeRegex(nextName)}$`, "i");
      const dupCombo = await PharmItem.findOne({ _id: { $ne: id }, name: nameRegex, retailPrice: nextRetail, barcode: nextBc, ...dupExtra });
      if (dupCombo) {
        return res.status(409).json({ status: "error", message: "Duplicate item with same name, price, and barcode exists" });
      }
    }

    const orCondsUpd = [];
    if (nextBc !== null) {
      orCondsUpd.push({ barcode: nextBc });
      orCondsUpd.push({ alternateBarcodes: nextBc });
    }
    if (nextAlt.length > 0) {
      orCondsUpd.push({ barcode: { $in: nextAlt } });
      orCondsUpd.push({ alternateBarcodes: { $in: nextAlt } });
    }
    if (orCondsUpd.length > 0) {
      const dupAnyBarcode = await PharmItem.findOne(
        Object.keys(dupExtra).length
          ? { _id: { $ne: id }, $and: [{ $or: orCondsUpd }, dupExtra] }
          : { _id: { $ne: id }, $or: orCondsUpd }
      );
      if (dupAnyBarcode) {
        return res.status(409).json({ status: "error", message: "Duplicate barcode found in existing items" });
      }
    }

    const setFields = {};
    const unsetFields = {};

    for (const key in req.body) {
      const value = req.body[key];
      if (value === null || value === '') {
        unsetFields[key] = "";
        continue;
      }
      if (value !== undefined) {
        setFields[key] = value;
      }
    }

    // If openingStock provided on update, add to availableQuantity when client did NOT explicitly set availableQuantity
    let incFields = {};
    const clientSetAvailable = req.body.hasOwnProperty("availableQuantity");
    if (req.body.hasOwnProperty("openingStock") && !clientSetAvailable) {
      const openNum = Number(req.body.openingStock);
      if (!isNaN(openNum) && openNum !== 0) {
        const conv = req.body.hasOwnProperty("conversionUnit")
          ? (Number(req.body.conversionUnit) || Number(existing.conversionUnit) || 1)
          : (Number(existing.conversionUnit) || 1);
        const unitStr = req.body.hasOwnProperty("unit")
          ? String(req.body.unit || "")
          : String(existing.unit || "");
        const isPack = unitStr.toLowerCase() === "pack";
        const deltaUnits = isPack ? (openNum * (conv > 0 ? conv : 1)) : openNum;
        const currentAvail = Number(existing.availableQuantity) || 0;
        const nextAvail = Math.max(0, currentAvail + deltaUnits);
        if (setFields.hasOwnProperty("availableQuantity")) {
          delete setFields.availableQuantity;
        }
        setFields["availableQuantity"] = nextAvail;
        unsetFields["openingStock"] = "";
        if (setFields.hasOwnProperty("openingStock")) {
          delete setFields.openingStock;
        }
      }
    }

    const updateOps = {};
    if (Object.keys(setFields).length) updateOps.$set = setFields;
    if (Object.keys(unsetFields).length) updateOps.$unset = unsetFields;
    if (Object.keys(incFields).length) updateOps.$inc = incFields;

    const data = await PharmItem.findByIdAndUpdate(id, updateOps, { new: true });
    return res.status(200).json({ status: "ok", data: data });
  } catch (err) {
    console.error('Error updating pharmacy item:', err);
    res.status(500).json({ error: err.message });
  }
};

// 5. Delete pharmItem
const deletepharmItem = async (req, res) => {
  try {
    const id = req.params.id;
    const doc = await PharmItem.findById(id);
    if (!doc || !(await branchDocumentVisible(req, doc.branchId))) {
      return res.status(404).json({ status: "fail", message: "Item not found" });
    }
    await PharmItem.findByIdAndDelete(id);
    return res
      .status(200)
      .json({ status: "ok", message: "Pharmacy Item deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getPharmItemFlowSummary = async (req, res) => {
  try {
    const itemIdsRaw = String(req.query.itemIds || req.query.itemId || "").trim();
    if (!itemIdsRaw) {
      return res.status(400).json({ status: "error", message: "itemIds is required" });
    }

    const ids = itemIdsRaw
      .split(",")
      .map((v) => String(v).trim())
      .filter(Boolean);

    const uniqueIds = Array.from(new Set(ids));
    if (uniqueIds.length === 0) {
      return res.status(400).json({ status: "error", message: "No valid itemIds provided" });
    }
    if (uniqueIds.length > 100) {
      return res.status(400).json({ status: "error", message: "Too many itemIds (max 100)" });
    }

    const itemObjectIds = uniqueIds.map((id) => new mongoose.Types.ObjectId(id));

    const itemsForScope = await PharmItem.find({ _id: { $in: itemObjectIds } }).select("_id branchId").lean();
    if (itemsForScope.length !== uniqueIds.length) {
      return res.status(404).json({ status: "error", message: "One or more items not found" });
    }
    for (const it of itemsForScope) {
      if (!(await branchDocumentVisible(req, it.branchId))) {
        return res.status(404).json({ status: "error", message: "Item not found" });
      }
    }

    const branchQ = await mergeBranchScopedQuery(req);
    const fromRaw = String(req.query.from || "").trim();
    const toRaw = String(req.query.to || "").trim();
    const hasLegacyDate = Boolean(fromRaw || toRaw);

    const fromMs = Number(req.query.fromMs);
    const toMs = Number(req.query.toMs);
    const useMs =
      Number.isFinite(fromMs) &&
      Number.isFinite(toMs) &&
      fromMs > 0 &&
      toMs > 0 &&
      fromMs <= toMs;

    // Purchases: match business `date` on inbound stock (same as purchase history filters), not createdAt.
    const inboundMatch = { status: "completed" };
    if (useMs) {
      inboundMatch.date = { $gte: new Date(fromMs), $lte: new Date(toMs) };
    } else if (hasLegacyDate) {
      inboundMatch.date = {};
      if (fromRaw) inboundMatch.date.$gte = new Date(fromRaw);
      if (toRaw) {
        const toDate = new Date(toRaw);
        toDate.setDate(toDate.getDate() + 1);
        inboundMatch.date.$lte = toDate;
      }
    }
    inboundMatch["items.pharmItemId"] = { $in: itemObjectIds };

    const posMatch = {};
    if (useMs) {
      posMatch.createdAt = { $gte: new Date(fromMs), $lte: new Date(toMs) };
    } else if (hasLegacyDate) {
      posMatch.createdAt = {};
      if (fromRaw) posMatch.createdAt.$gte = new Date(fromRaw);
      if (toRaw) {
        const toDate = new Date(toRaw);
        toDate.setDate(toDate.getDate() + 1);
        posMatch.createdAt.$lte = toDate;
      }
    }
    posMatch["allItem.pharmItemId"] = { $in: itemObjectIds };
    if (branchQ) Object.assign(posMatch, branchQ);

    const itemsCollection = PharmItem.collection.name;

    const [purchaseAgg, salesAgg] = await Promise.all([
      PharmInboundStock.aggregate([
        { $match: inboundMatch },
        { $unwind: "$items" },
        { $match: { "items.pharmItemId": { $in: itemObjectIds } } },
        {
          $lookup: {
            from: itemsCollection,
            localField: "items.pharmItemId",
            foreignField: "_id",
            as: "itemDoc",
          },
        },
        { $unwind: { path: "$itemDoc", preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            _conversionUnit: {
              $cond: [
                { $gt: [{ $ifNull: ["$itemDoc.conversionUnit", 0] }, 0] },
                "$itemDoc.conversionUnit",
                1,
              ],
            },
          },
        },
        {
          $addFields: {
            _purchasedUnits: {
              $add: [
                { $multiply: [{ $ifNull: ["$items.quantity", 0] }, "$_conversionUnit"] },
                { $ifNull: ["$items.looseUnitQty", 0] },
              ],
            },
          },
        },
        {
          $group: {
            _id: "$items.pharmItemId",
            purchasedPacks: { $sum: { $ifNull: ["$items.quantity", 0] } },
            purchasedLoose: { $sum: { $ifNull: ["$items.looseUnitQty", 0] } },
            purchasedUnits: { $sum: { $ifNull: ["$_purchasedUnits", 0] } },
          },
        },
      ]),
      PharmPos.aggregate([
        { $match: posMatch },
        { $unwind: "$allItem" },
        { $match: { "allItem.pharmItemId": { $in: itemObjectIds } } },
        {
          $lookup: {
            from: itemsCollection,
            localField: "allItem.pharmItemId",
            foreignField: "_id",
            as: "itemDoc",
          },
        },
        { $unwind: { path: "$itemDoc", preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            _conversionUnit: {
              $cond: [
                { $gt: [{ $ifNull: ["$itemDoc.conversionUnit", 0] }, 0] },
                "$itemDoc.conversionUnit",
                1,
              ],
            },
          },
        },
        {
          $addFields: {
            _lineUnits: {
              $cond: [
                { $eq: [{ $toLower: { $ifNull: ["$allItem.unit", ""] } }, "pack"] },
                { $multiply: [{ $ifNull: ["$allItem.quantity", 0] }, "$_conversionUnit"] },
                { $ifNull: ["$allItem.quantity", 0] },
              ],
            },
          },
        },
        {
          $group: {
            _id: "$allItem.pharmItemId",
            soldUnits: {
              $sum: {
                $cond: [{ $eq: ["$allItem.isReturn", true] }, 0, { $ifNull: ["$_lineUnits", 0] }],
              },
            },
            returnedUnits: {
              $sum: {
                $cond: [{ $eq: ["$allItem.isReturn", true] }, { $ifNull: ["$_lineUnits", 0] }, 0],
              },
            },
          },
        },
        {
          $addFields: {
            netSoldUnits: { $subtract: ["$soldUnits", "$returnedUnits"] },
          },
        },
      ]),
    ]);

    const result = {};
    for (const id of uniqueIds) {
      result[id] = {
        purchasedPacks: 0,
        purchasedLoose: 0,
        purchasedUnits: 0,
        soldUnits: 0,
        returnedUnits: 0,
        netSoldUnits: 0,
      };
    }

    for (const row of purchaseAgg || []) {
      const id = String(row._id);
      if (!result[id]) continue;
      result[id].purchasedPacks = Number(row.purchasedPacks) || 0;
      result[id].purchasedLoose = Number(row.purchasedLoose) || 0;
      result[id].purchasedUnits = Number(row.purchasedUnits) || 0;
    }

    for (const row of salesAgg || []) {
      const id = String(row._id);
      if (!result[id]) continue;
      result[id].soldUnits = Number(row.soldUnits) || 0;
      result[id].returnedUnits = Number(row.returnedUnits) || 0;
      result[id].netSoldUnits = Number(row.netSoldUnits) || 0;
    }

    return res.status(200).json({ status: "ok", data: result });
  } catch (err) {
    console.error("Error in getPharmItemFlowSummary:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
};

module.exports = {
  addpharmItem,
  getpharmItems,
  getpharmItemById,
  updatepharmItem,
  deletepharmItem,
  addExcelpharmItem,
  getPharmItemFlowSummary
};
