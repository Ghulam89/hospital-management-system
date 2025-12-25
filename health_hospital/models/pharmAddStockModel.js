const mongoose = require('mongoose');
const PharmItem = require("./pharmItemModel");

const pharmAddStock = new mongoose.Schema({
    batchNo: {
        type: String,
        allowNull: true,
    },
    stock: {
        type: Number,
        allowNull: true,
    },
    unit: {
        type: String, // 'pack' or 'unit'
        allowNull: true,
    },
    expiredDate: {
        type: Date,
        allowNull: true,
    },
    pharmItemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PharmItem',
    },
    pharmSupplierId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PharmSupplier',
    },
}, { timestamps: true });

// ✅ Pre-save (Create)
pharmAddStock.pre('save', async function (next) {
    const pharmAdd = this;

    try {
        // 1. Generate batchNo if not provided
        if (!pharmAdd.batchNo) {
            let isUnique = false;
            let generatedCode;
            const generateRandomCode = () => {
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                let result = '';
                for (let i = 0; i < 6; i++) {
                    result += chars.charAt(Math.floor(Math.random() * chars.length));
                }
                return result;
            };
            while (!isUnique) {
                generatedCode = generateRandomCode();
                const existing = await mongoose.model('Invoice').findOne({ invoiceNo: generatedCode });
                if (!existing) isUnique = true;
            }
            pharmAdd.batchNo = generatedCode;
        }

        const pharm = await PharmItem.findById(pharmAdd.pharmItemId);
        if (!pharm) return next(new Error("PharmItem not found"));

        // Ensure all values are numbers
        const stock = Number(pharmAdd.stock) || 0;
        const conversionUnit = Number(pharm.conversionUnit) || 1;
        const currentAvailableQty = Number(pharm.availableQuantity) || 0;
        
        const quant = pharmAdd.unit === 'pack' ? conversionUnit : 1;
        const totalStock = stock * quant;

        // Validate totalStock is a valid number
        if (isNaN(totalStock)) {
            return next(new Error(`Invalid stock calculation for item: ${pharm.name || pharmAdd.pharmItemId}`));
        }

        pharm.availableQuantity = currentAvailableQty + totalStock;
        await pharm.save();

        next();
    } catch (err) {
        next(err);
    }
});

// ✅ Pre-update
pharmAddStock.pre('findOneAndUpdate', async function (next) {
    try {
        const update = this.getUpdate();
        const newStock = update.stock;
        const newUnit = update.unit;

        const original = await this.model.findOne(this.getQuery());
        if (!original) return next(new Error("Original stock record not found"));

        const pharm = await PharmItem.findById(original.pharmItemId);
        if (!pharm) return next(new Error("PharmItem not found"));

        // Ensure all values are numbers
        const conversionUnit = Number(pharm.conversionUnit) || 1;
        const currentAvailableQty = Number(pharm.availableQuantity) || 0;
        const originalStock = Number(original.stock) || 0;
        const newStockValue = Number(newStock) || 0;

        // Revert original stock
        const oldQty = original.unit === 'pack' ? originalStock * conversionUnit : originalStock;
        
        // Apply new stock
        const newQty = newUnit === 'pack' ? newStockValue * conversionUnit : newStockValue;

        // Validate calculations
        if (isNaN(oldQty) || isNaN(newQty)) {
            return next(new Error(`Invalid stock calculation for item: ${pharm.name || original.pharmItemId}`));
        }

        pharm.availableQuantity = Math.max(0, currentAvailableQty - oldQty + newQty);
        await pharm.save();
        next();
    } catch (err) {
        next(err);
    }
});

// ✅ Post-delete
pharmAddStock.post('findOneAndDelete', async function (doc) {
    try {
        if (!doc) return;

        const pharm = await PharmItem.findById(doc.pharmItemId);
        if (!pharm) return;

        // Ensure all values are numbers
        const conversionUnit = Number(pharm.conversionUnit) || 1;
        const stock = Number(doc.stock) || 0;
        const currentAvailableQty = Number(pharm.availableQuantity) || 0;
        
        const actualQty = doc.unit === 'pack' ? stock * conversionUnit : stock;

        // Validate calculation
        if (!isNaN(actualQty)) {
            pharm.availableQuantity = Math.max(0, currentAvailableQty - actualQty);
            await pharm.save();
        }
    } catch (err) {
        console.error("Error reverting stock on delete:", err);
    }
});

const PharmAddStock = mongoose.model('PharmAddStock', pharmAddStock);
module.exports = PharmAddStock;
