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
                if (!pharmItem) {
                    return next(new Error(`Pharmacy item not found with ID: ${item.pharmItemId}`));
                }
                
                // Ensure all values are numbers
                const quantity = Number(item.quantity) || 0;
                const looseUnitQty = Number(item.looseUnitQty) || 0;
                const conversionUnit = Number(pharmItem.conversionUnit) || 1;
                const currentAvailableQty = Number(pharmItem.availableQuantity) || 0;
                
                // Calculate the total quantity to add based on quantity and looseUnitQty
                const totalToAdd = (quantity * conversionUnit) + looseUnitQty;
                
                // Ensure totalToAdd is a valid number
                if (isNaN(totalToAdd)) {
                    return next(new Error(`Invalid quantity calculation for item: ${pharmItem.name || item.pharmItemId}`));
                }
                
                pharmItem.availableQuantity = currentAvailableQty + totalToAdd;
                await pharmItem.save();
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
                // Ensure all values are numbers
                const quantity = Number(item.quantity) || 0;
                const looseUnitQty = Number(item.looseUnitQty) || 0;
                const conversionUnit = Number(pharmItem.conversionUnit) || 1;
                const currentAvailableQty = Number(pharmItem.availableQuantity) || 0;
                
                const totalToRevert = (quantity * conversionUnit) + looseUnitQty;
                
                // Ensure totalToRevert is a valid number
                if (!isNaN(totalToRevert)) {
                    pharmItem.availableQuantity = Math.max(0, currentAvailableQty - totalToRevert);
                    await pharmItem.save();
                }
            }
        }
    } catch (err) {
        console.error("Error reverting inventory on delete:", err);
    }
});

const PharmInboundStock = mongoose.model('PharmInboundStock', pharmInboundStockSchema);
module.exports = PharmInboundStock;

