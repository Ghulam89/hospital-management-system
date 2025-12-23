const mongoose = require('mongoose');
const PharmItem = require('./pharmItemModel'); // Adjust path

const pharmPos = new mongoose.Schema({
    invoiceNumber: { type: String, unique: true, sparse: true }, // Invoice number for reference
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
    patientName: { type: String }, // Manual patient name when patientId is not provided
    referId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    doctorName: { type: String }, // Manual doctor name when referId is not provided
    totalDiscount: Number,
    totalTax: Number, // Add tax field
    due: Number,
    advance: Number,
    paid: Number,
    note: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // User who created the transaction
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
        }
    ],
    payment: [
        {
            method: String,
            payDate: Date,
            paid: Number,
            reference: String // Add reference field
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

            const conversionUnit = pharmItem.conversionUnit || 1;
            const actualQty = (itemData.unit === 'pack' ? conversionUnit : 1) * (itemData.quantity || 0);

            if (itemData.isReturn) {
                // Returning item - add stock back
                pharmItem.availableQuantity += actualQty;
                console.log(`Returning ${actualQty} units of ${pharmItem.name}, new stock: ${pharmItem.availableQuantity}`);
            } else {
                // Selling item - check stock and deduct
                if (pharmItem.availableQuantity < actualQty) {
                    return next(new Error(`Insufficient stock for ${pharmItem.name || pharmItem._id}. Available: ${pharmItem.availableQuantity}, Required: ${actualQty}`));
                }
                pharmItem.availableQuantity -= actualQty;
                console.log(`Selling ${actualQty} units of ${pharmItem.name}, remaining stock: ${pharmItem.availableQuantity}`);
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
            const actualQty = (oldItem.unit === 'pack' ? conversionUnit : 1) * (oldItem.quantity || 0);

            if (oldItem.isReturn) {
                pharmItem.availableQuantity -= actualQty; // undo add
            } else {
                pharmItem.availableQuantity += actualQty; // undo subtract
            }

            await pharmItem.save();
        }

        // Apply new changes
        for (const itemData of newItems) {
            const pharmItem = await PharmItem.findById(itemData.pharmItemId);
            if (!pharmItem) continue;

            const conversionUnit = pharmItem.conversionUnit || 1;
            const actualQty = (itemData.unit === 'pack' ? conversionUnit : 1) * (itemData.quantity || 0);

            if (itemData.isReturn) {
                pharmItem.availableQuantity += actualQty;
            } else {
                if (pharmItem.availableQuantity < actualQty) {
                    return next(new Error(`Insufficient stock for item ${pharmItem.name || pharmItem._id}`));
                }
                pharmItem.availableQuantity -= actualQty;
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
