const mongoose = require('mongoose');
const PharmItem = require('./pharmItemModel'); // Adjust path as needed

const pharmReturnStock = new mongoose.Schema({
    returnNumber: {
        type: String,
        unique: true,
    },
    supplierId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PharmSupplier',
        required: true,
    },
    returnDate: {
        type: Date,
        required: true,
    },
    reason: {
        type: String,
        required: true,
    },
    items: [{
        itemId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'PharmItem',
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
        },
        unitCost: {
            type: Number,
            default: 0,
        },
        totalCost: {
            type: Number,
            default: 0,
        },
        batchNumber: {
            type: String,
        },
        reason: {
            type: String,
        },
    }],
    totalAmount: {
        type: Number,
        default: 0,
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected', 'Completed'],
        default: 'Pending',
    },
    notes: {
        type: String,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    // Legacy fields for backward compatibility
    stock: {
        type: Number,
        allowNull: true,
    },
    unit: {
        type: String,
        allowNull: true, // 'pack' or 'unit'
    },
    pharmItemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PharmItem',
    },
}, { timestamps: true });

// Generate return number
pharmReturnStock.pre('save', async function (next) {
    const returnStock = this;

    try {
        // Generate return number if not exists
        if (!returnStock.returnNumber) {
            const count = await mongoose.model('PharmReturnStock').countDocuments();
            returnStock.returnNumber = `SR-${String(count + 1).padStart(6, '0')}`;
        }

        // Process items and update stock
        if (returnStock.items && returnStock.items.length > 0) {
            for (const returnItem of returnStock.items) {
                const item = await PharmItem.findById(returnItem.itemId);
                if (!item) {
                    return next(new Error(`Item not found: ${returnItem.itemId}`));
                }

                // Check if enough stock is available
                if (item.availableQuantity < returnItem.quantity) {
                    return next(new Error(`Insufficient stock for item: ${item.name}. Available: ${item.availableQuantity}, Required: ${returnItem.quantity}`));
                }

                // Reduce stock (stock is being returned to supplier)
                item.availableQuantity -= returnItem.quantity;
                await item.save();
            }
        }

        // Handle legacy single item return
        if (returnStock.pharmItemId && returnStock.stock) {
            const item = await PharmItem.findById(returnStock.pharmItemId);
            if (!item) return next(new Error("Item not found"));

            const conversionUnit = item.conversionUnit || 1;
            const actualQty = returnStock.unit === 'pack' ? returnStock.stock * conversionUnit : returnStock.stock;

            if (item.availableQuantity < actualQty) {
                return next(new Error("You do not have enough stock to return"));
            }

            item.availableQuantity -= actualQty;
            await item.save();
        }

        next();
    } catch (err) {
        next(err);
    }
});

// ✅ PRE-UPDATE
pharmReturnStock.pre('findOneAndUpdate', async function (next) {
    try {
        const update = this.getUpdate();
        const original = await this.model.findOne(this.getQuery());
        
        if (!original) return next(new Error("Original return record not found"));

        // Revert stock for all original items
        if (original.items && original.items.length > 0) {
            for (const oldItem of original.items) {
                const pharmItem = await PharmItem.findById(oldItem.itemId);
                if (pharmItem) {
                    pharmItem.availableQuantity += oldItem.quantity;
                    await pharmItem.save();
                }
            }
        }

        // Apply new stock changes if items are being updated
        if (update.items && update.items.length > 0) {
            for (const newItem of update.items) {
                const pharmItem = await PharmItem.findById(newItem.itemId);
                if (!pharmItem) {
                    return next(new Error(`Item not found: ${newItem.itemId}`));
                }

                if (pharmItem.availableQuantity < newItem.quantity) {
                    return next(new Error(`Insufficient stock for item: ${pharmItem.name}. Available: ${pharmItem.availableQuantity}, Required: ${newItem.quantity}`));
                }

                pharmItem.availableQuantity -= newItem.quantity;
                await pharmItem.save();
            }
        }

        // Handle legacy update
        if (update.stock && update.unit && original.pharmItemId) {
            const pharmItem = await PharmItem.findById(original.pharmItemId);
            if (!pharmItem) return next(new Error("PharmItem not found"));

            const conversionUnit = pharmItem.conversionUnit || 1;

            // Revert old stock
            const oldQty = original.unit === 'pack' ? original.stock * conversionUnit : original.stock;
            pharmItem.availableQuantity += oldQty;

            // Apply new stock
            const newQty = update.unit === 'pack' ? update.stock * conversionUnit : update.stock;
            if (pharmItem.availableQuantity < newQty) {
                return next(new Error("You do not have enough stock to return"));
            }
            pharmItem.availableQuantity -= newQty;

            await pharmItem.save();
        }

        next();
    } catch (err) {
        next(err);
    }
});

// ✅ POST-DELETE (Restore stock when return is deleted)
pharmReturnStock.post('findOneAndDelete', async function (doc) {
    try {
        if (!doc) return;

        // Restore stock for all items in the return
        if (doc.items && doc.items.length > 0) {
            for (const returnItem of doc.items) {
                const pharmItem = await PharmItem.findById(returnItem.itemId);
                if (pharmItem) {
                    pharmItem.availableQuantity += returnItem.quantity;
                    await pharmItem.save();
                }
            }
        }

        // Handle legacy single item return
        if (doc.pharmItemId && doc.stock) {
            const pharmItem = await PharmItem.findById(doc.pharmItemId);
            if (!pharmItem) return;

            const conversionUnit = pharmItem.conversionUnit || 1;
            const actualQty = doc.unit === 'pack' ? doc.stock * conversionUnit : doc.stock;

            pharmItem.availableQuantity += actualQty;
            await pharmItem.save();
        }
    } catch (err) {
        console.error("Error restoring stock on delete:", err);
    }
});

const PharmReturnStock = mongoose.model('PharmReturnStock', pharmReturnStock);
module.exports = PharmReturnStock;
