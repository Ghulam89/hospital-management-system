const mongoose = require('mongoose');
const PharmItem = require("./pharmItemModel");

// Schema for individual items within an inbound stock document
const inboundStockItemSchema = new mongoose.Schema({
    pharmItemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PharmItem',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 0
    },
    looseUnitQty: {
        type: Number,
        default: 0
    },
    unitCost: {
        type: Number,
        required: true,
        min: 0
    },
    totalCost: {
        type: Number,
        required: true,
        min: 0
    },
    batchNumber: {
        type: String,
        default: null
    },
    expiryDate: {
        type: Date,
        default: null
    },
    rack: {
        type: String,
        default: null
    }
}, { _id: true });

// Main inbound stock document schema
const pharmInboundStockSchema = new mongoose.Schema({
    documentNumber: {
        type: String,
        required: false,
        unique: true,
        sparse: true
    },
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    supplierId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PharmSupplier',
        required: true
    },
    supplierInvoiceDate: {
        type: Date,
        default: null
    },
    supplierInvoiceNumber: {
        type: String,
        default: null
    },
    items: [inboundStockItemSchema],
    totalCost: {
        type: Number,
        required: true,
        default: 0
    },
    totalTax: {
        type: Number,
        default: 0
    },
    grandTotal: {
        type: Number,
        required: true,
        default: 0
    },
    remarks: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'cancelled'],
        default: 'completed'
    },
    totalQuantity: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

// Pre-save middleware to generate document number if not provided
pharmInboundStockSchema.pre('save', async function(next) {
    try {
        // 1. Generate documentNumber if not provided
        if (this.isNew && !this.documentNumber) {
            let isUnique = false;
            let generatedCode;
            
            const generateRandomCode = () => {
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                let result = 'IB-';
                for (let i = 0; i < 8; i++) {
                    result += chars.charAt(Math.floor(Math.random() * chars.length));
                }
                return result;
            };
            
            while (!isUnique) {
                generatedCode = generateRandomCode();
                const existing = await this.constructor.findOne({ documentNumber: generatedCode });
                if (!existing) isUnique = true;
            }
            
            this.documentNumber = generatedCode;
        }

        // 2. Calculate totalQuantity from items
        if (this.items && this.items.length > 0) {
            this.totalQuantity = this.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
        }

        // 3. Update inventory for each item (add stock)
        if (this.isNew) {
            for (const item of this.items) {
                const pharmItem = await PharmItem.findById(item.pharmItemId);
                if (pharmItem) {
                    // Calculate the total quantity to add based on quantity and looseUnitQty
                    const totalToAdd = (item.quantity * pharmItem.conversionUnit) + (item.looseUnitQty || 0);
                    pharmItem.availableQuantity += totalToAdd;
                    await pharmItem.save();
                }
            }
        }

        next();
    } catch (err) {
        next(err);
    }
});

// Post-delete middleware to revert inventory
pharmInboundStockSchema.post('findOneAndDelete', async function(doc) {
    try {
        if (!doc) return;

        // Revert inventory for each item
        for (const item of doc.items) {
            const pharmItem = await PharmItem.findById(item.pharmItemId);
            if (pharmItem) {
                const totalToRevert = (item.quantity * pharmItem.conversionUnit) + (item.looseUnitQty || 0);
                pharmItem.availableQuantity -= totalToRevert;
                // Ensure availableQuantity doesn't go negative
                if (pharmItem.availableQuantity < 0) pharmItem.availableQuantity = 0;
                await pharmItem.save();
            }
        }
    } catch (err) {
        console.error("Error reverting inventory on delete:", err);
    }
});

const PharmInboundStock = mongoose.model('PharmInboundStock', pharmInboundStockSchema);
module.exports = PharmInboundStock;

