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
            if (!item) {
                return next(new Error(`Pharmacy item not found with ID: ${this.pharmItemId}`));
            }
            
            // Ensure all values are numbers
            const quantity = Number(this.quantity) || 0;
            const unitCost = Number(item.unitCost) || 0;
            
            this.totalCost = quantity * unitCost;
            
            // Ensure totalCost is a valid number
            if (isNaN(this.totalCost)) {
                this.totalCost = 0;
            }
        } catch (error) {
            console.error('Error calculating total cost:', error);
            return next(error);
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
            if (!item) {
                return next(new Error(`Pharmacy item not found with ID: ${this.pharmItemId}`));
            }
            
            // Ensure all values are numbers
            const quantity = Number(this.quantity) || 0;
            const currentAvailableQty = Number(item.availableQuantity) || 0;
            
            // Validate quantity
            if (isNaN(quantity) || quantity <= 0) {
                return next(new Error(`Invalid quantity: ${this.quantity}`));
            }
            
            if (isNaN(currentAvailableQty)) {
                return next(new Error(`Invalid available quantity for item: ${item.name || this.pharmItemId}`));
            }
            
            if (currentAvailableQty < quantity) {
                return next(new Error(`Insufficient stock. Available: ${currentAvailableQty}, Required: ${quantity}`));
            }
            
            item.availableQuantity = currentAvailableQty - quantity;
            await item.save();
        } catch (error) {
            return next(error);
        }
    }
    next();
});

const PharmConsumedStock = mongoose.model('PharmConsumedStock', pharmConsumedStockSchema);

module.exports = PharmConsumedStock;