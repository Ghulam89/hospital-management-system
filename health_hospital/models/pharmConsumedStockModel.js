const mongoose = require('mongoose');

const pharmConsumedStockSchema = new mongoose.Schema({
    pharmItemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PharmItem',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    consumptionDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    reason: {
        type: String,
        required: true,
        enum: ['Patient Treatment', 'Emergency Use', 'Department Consumption', 'Expired Disposal', 'Damaged Disposal', 'Other']
    },
    departmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department'
    },
    consumedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    notes: {
        type: String
    },
    status: {
        type: String,
        enum: ['Active', 'Completed', 'Pending', 'Cancelled'],
        default: 'Active'
    },
    totalCost: {
        type: Number,
        min: 0
    }
}, { timestamps: true });

// Pre-save middleware to calculate total cost
pharmConsumedStockSchema.pre('save', async function(next) {
    if (this.isNew || this.isModified('quantity')) {
        try {
            const PharmItem = require('./pharmItemModel');
            const item = await PharmItem.findById(this.pharmItemId);
            if (item) {
                this.totalCost = this.quantity * item.unitCost;
            }
        } catch (error) {
            console.error('Error calculating total cost:', error);
        }
    }
    next();
});

// Pre-save middleware to update item stock
pharmConsumedStockSchema.pre('save', async function(next) {
    if (this.isNew) {
        try {
            const PharmItem = require('./pharmItemModel');
            const item = await PharmItem.findById(this.pharmItemId);
            if (item) {
                if (item.availableQuantity < this.quantity) {
                    return next(new Error(`Insufficient stock. Available: ${item.availableQuantity}, Required: ${this.quantity}`));
                }
                item.availableQuantity -= this.quantity;
                await item.save();
            }
        } catch (error) {
            next(error);
        }
    }
    next();
});

const PharmConsumedStock = mongoose.model('PharmConsumedStock', pharmConsumedStockSchema);

module.exports = PharmConsumedStock;