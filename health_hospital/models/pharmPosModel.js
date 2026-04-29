const mongoose = require('mongoose');
const PharmItem = require('./pharmItemModel');
const PharmInboundStock = require('./pharmInboundStockModel');
const PharmReturnStock = require('./pharmReturnStockModel');

const pharmPos = new mongoose.Schema({
    invoiceNumber: { type: String, unique: true, sparse: true }, // Invoice number for reference
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
    patientName: { type: String }, // Manual patient name when patientId is not provided
    referId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    doctorName: { type: String }, // Manual doctor name when referId is not provided
    allowNegativeInventory: { type: Boolean, default: false },
    totalDiscount: Number,
    totalTax: Number, // Add tax field
    due: Number,
    advance: Number,
    paid: Number,
    note: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // User who created the transaction
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    allItem: [
        {
            pharmItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'PharmItem' },
            unit: String,
            batchNumber: String, // Add batch number field
            perUnitCost: Number,
            unitCost: Number, // Add unitCost field
            rate: Number,
            discount: Number,
            tax: Number, // Add tax field per item
            quantity: Number,
            returnQuantity: Number,
            netAmount: Number,
            totalAmount: Number,
            isReturn: { type: Boolean, default: false },
            originalInvoiceNumber: { type: String, default: '' },
        }
    ],
    payment: [
        {
            method: String,
            payDate: Date,
            paid: Number,
            reference: String,
            chequeNo: { type: String, default: null },
            bankName: { type: String, default: null },
            chequeDate: { type: Date, default: null },
            notes: { type: String, default: null }
        }
    ]
}, { timestamps: true });

// 🔄 Pre-Save (Create)
pharmPos.pre('save', async function (next) {
    const pos = this;

    try {
        if (!pos.allItem || pos.allItem.length === 0) {
            return next(new Error("No items provided for POS transaction"));
        }

        for (const itemData of pos.allItem) {
            const pharmItem = await PharmItem.findById(itemData.pharmItemId);
            if (!pharmItem) {
                return next(new Error(`Item with ID ${itemData.pharmItemId} not found in pharmacy inventory`));
            }

            const conversionUnit = Number(pharmItem.conversionUnit) || 1;
            const unitStr = String(itemData.unit || '').toLowerCase();
            const actualSaleQty = (unitStr === 'pack' ? conversionUnit : 1) * (Number(itemData.quantity) || 0);
            const actualReturnQty = (unitStr === 'pack' ? conversionUnit : 1) * (Number(itemData.returnQuantity) || 0);

            if (itemData.isReturn) {
                // Returning item - add stock back
                pharmItem.availableQuantity += actualReturnQty;
                console.log(`Returning ${actualReturnQty} units of ${pharmItem.name}, new stock: ${pharmItem.availableQuantity}`);
            } else {
                if ((Number(pharmItem.availableQuantity) || 0) < actualSaleQty) {
                    const itemUnitStr = String(pharmItem.unit || '').toLowerCase();
                    const openingUnits = itemUnitStr === 'pack'
                        ? (Number(pharmItem.openingStock) || 0) * conversionUnit
                        : (Number(pharmItem.openingStock) || 0);
                    const inboundUnits = await PharmInboundStock.aggregate([
                        { $unwind: "$items" },
                        { $match: { "items.pharmItemId": pharmItem._id } },
                        {
                            $group: {
                                _id: null,
                                u: {
                                    $sum: {
                                        $add: [
                                            { $multiply: [ { $ifNull: ["$items.quantity", 0] }, conversionUnit ] },
                                            { $ifNull: ["$items.looseUnitQty", 0] }
                                        ]
                                    }
                                }
                            }
                        }
                    ]);
                    const inboundSum = Array.isArray(inboundUnits) && inboundUnits[0] ? Number(inboundUnits[0].u) || 0 : 0;
                    const salesUnits = await mongoose.model('PharmPos').aggregate([
                        { $unwind: "$allItem" },
                        { $match: { "allItem.pharmItemId": pharmItem._id, "allItem.isReturn": { $ne: true } } },
                        {
                            $group: {
                                _id: null,
                                u: {
                                    $sum: {
                                        $cond: [
                                            { $eq: [ { $toLower: "$allItem.unit" }, "pack" ] },
                                            { $multiply: [ { $ifNull: ["$allItem.quantity", 0] }, conversionUnit ] },
                                            { $ifNull: ["$allItem.quantity", 0] }
                                        ]
                                    }
                                }
                            }
                        }
                    ]);
                    const salesSum = Array.isArray(salesUnits) && salesUnits[0] ? Number(salesUnits[0].u) || 0 : 0;
                    const returnUnits = await PharmReturnStock.aggregate([
                        { $unwind: "$items" },
                        { $match: { "items.itemId": pharmItem._id } },
                        { $group: { _id: null, u: { $sum: { $ifNull: ["$items.quantity", 0] } } } }
                    ]);
                    const returnSum = Array.isArray(returnUnits) && returnUnits[0] ? Number(returnUnits[0].u) || 0 : 0;
                    const computedAvailable = openingUnits + inboundSum - salesSum - returnSum;
                    pharmItem.availableQuantity = computedAvailable;
                    await pharmItem.save();
                    if ((Number(pharmItem.availableQuantity) || 0) < actualSaleQty && !pos.allowNegativeInventory) {
                        return next(new Error(`Insufficient stock for ${pharmItem.name || pharmItem._id}. Available: ${pharmItem.availableQuantity}, Required: ${actualSaleQty}`));
                    }
                }
                pharmItem.availableQuantity = (Number(pharmItem.availableQuantity) || 0) - actualSaleQty;
                console.log(`Selling ${actualSaleQty} units of ${pharmItem.name}, remaining stock: ${pharmItem.availableQuantity}`);
            }

            await pharmItem.save();
        }

        console.log('Stock updated successfully for POS transaction');
        next();
    } catch (err) {
        console.error('Error updating stock in POS pre-save:', err);
        next(err);
    }
});

// 🔄 Pre-Update
pharmPos.pre('findOneAndUpdate', async function (next) {
    try {
        const update = this.getUpdate();
        const newItems = update.allItem;
        if (!newItems) return next();

        const oldPos = await this.model.findOne(this.getQuery());
        if (!oldPos) return next(new Error("Original POS not found"));

        // Revert old changes
        for (const oldItem of oldPos.allItem) {
            const pharmItem = await PharmItem.findById(oldItem.pharmItemId);
            if (!pharmItem) continue;

            const conversionUnit = pharmItem.conversionUnit || 1;
            const actualOldSaleQty = (oldItem.unit === 'pack' ? conversionUnit : 1) * (Number(oldItem.quantity) || 0);
            const actualOldReturnQty = (oldItem.unit === 'pack' ? conversionUnit : 1) * (Number(oldItem.returnQuantity) || 0);

            if (oldItem.isReturn) {
                pharmItem.availableQuantity -= actualOldReturnQty; // undo add
            } else {
                pharmItem.availableQuantity += actualOldSaleQty; // undo subtract
            }

            await pharmItem.save();
        }

        // Apply new changes
        for (const itemData of newItems) {
            const pharmItem = await PharmItem.findById(itemData.pharmItemId);
            if (!pharmItem) continue;

            const conversionUnit = Number(pharmItem.conversionUnit) || 1;
            const unitStr = String(itemData.unit || '').toLowerCase();
            const actualSaleQty = (unitStr === 'pack' ? conversionUnit : 1) * (Number(itemData.quantity) || 0);
            const actualReturnQty = (unitStr === 'pack' ? conversionUnit : 1) * (Number(itemData.returnQuantity) || 0);

            if (itemData.isReturn) {
                pharmItem.availableQuantity += actualReturnQty;
            } else {
                if ((Number(pharmItem.availableQuantity) || 0) < actualSaleQty) {
                    const itemUnitStr = String(pharmItem.unit || '').toLowerCase();
                    const openingUnits = itemUnitStr === 'pack'
                        ? (Number(pharmItem.openingStock) || 0) * conversionUnit
                        : (Number(pharmItem.openingStock) || 0);
                    const inboundUnits = await PharmInboundStock.aggregate([
                        { $unwind: "$items" },
                        { $match: { "items.pharmItemId": pharmItem._id } },
                        {
                            $group: {
                                _id: null,
                                u: {
                                    $sum: {
                                        $add: [
                                            { $multiply: [ { $ifNull: ["$items.quantity", 0] }, conversionUnit ] },
                                            { $ifNull: ["$items.looseUnitQty", 0] }
                                        ]
                                    }
                                }
                            }
                        }
                    ]);
                    const inboundSum = Array.isArray(inboundUnits) && inboundUnits[0] ? Number(inboundUnits[0].u) || 0 : 0;
                    const salesUnits = await mongoose.model('PharmPos').aggregate([
                        { $unwind: "$allItem" },
                        { $match: { "allItem.pharmItemId": pharmItem._id, "allItem.isReturn": { $ne: true } } },
                        {
                            $group: {
                                _id: null,
                                u: {
                                    $sum: {
                                        $cond: [
                                            { $eq: [ { $toLower: "$allItem.unit" }, "pack" ] },
                                            { $multiply: [ { $ifNull: ["$allItem.quantity", 0] }, conversionUnit ] },
                                            { $ifNull: ["$allItem.quantity", 0] }
                                        ]
                                    }
                                }
                            }
                        }
                    ]);
                    const salesSum = Array.isArray(salesUnits) && salesUnits[0] ? Number(salesUnits[0].u) || 0 : 0;
                    const returnUnits = await PharmReturnStock.aggregate([
                        { $unwind: "$items" },
                        { $match: { "items.itemId": pharmItem._id } },
                        { $group: { _id: null, u: { $sum: { $ifNull: ["$items.quantity", 0] } } } }
                    ]);
                    const returnSum = Array.isArray(returnUnits) && returnUnits[0] ? Number(returnUnits[0].u) || 0 : 0;
                    const computedAvailable = openingUnits + inboundSum - salesSum - returnSum;
                    pharmItem.availableQuantity = computedAvailable;
                    await pharmItem.save();
                    if ((Number(pharmItem.availableQuantity) || 0) < actualSaleQty && !(update && update.allowNegativeInventory)) {
                        return next(new Error(`Insufficient stock for ${pharmItem.name || pharmItem._id}. Available: ${pharmItem.availableQuantity}, Required: ${actualSaleQty}`));
                    }
                }
                pharmItem.availableQuantity = (Number(pharmItem.availableQuantity) || 0) - actualSaleQty;
            }

            await pharmItem.save();
        }

        next();
    } catch (err) {
        next(err);
    }
});

// 🗑️ Post-Delete (Restore Stock)
pharmPos.post('findOneAndDelete', async function (doc) {
    try {
        if (!doc || !doc.allItem) return;

        for (const item of doc.allItem) {
            const pharmItem = await PharmItem.findById(item.pharmItemId);
            if (!pharmItem) continue;

            const conversionUnit = pharmItem.conversionUnit || 1;
            const actualQty = (item.unit === 'pack' ? conversionUnit : 1) * (item.quantity || 0);

            if (item.isReturn) {
                pharmItem.availableQuantity -= actualQty; // undo return
            } else {
                pharmItem.availableQuantity += actualQty; // restore stock
            }

            await pharmItem.save();
        }
    } catch (err) {
        console.error("Error in post delete pharmPos:", err);
    }
});

const PharmPos = mongoose.model('PharmPos', pharmPos);
module.exports = PharmPos;
