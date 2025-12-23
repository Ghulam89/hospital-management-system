const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
    item: [
        {
            procedureId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Procedure',
            },
            description: { type: String, allowNull: true },
            rate: { type: Number, allowNull: true },
            quantity: { type: Number, allowNull: true },
            amount: { type: Number, allowNull: true },
            doctorAmount: { type: Number, allowNull: true },
            hospitalAmount: { type: Number, allowNull: true },
            expenseAmount: { type: Number, allowNull: true },
            discount: { type: Number, allowNull: true },
            discountType: { type: Number, allowNull: true },
            tax: { type: Number, allowNull: true },
            total: { type: Number, allowNull: true },
            performedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        }
    ],
    invoiceNo: {
        type: String,
        allowNull: true,
    },
    subTotalBill: { type: Number, allowNull: true },
    discountBill: { type: Number, allowNull: true },
    taxBill: { type: Number, allowNull: true },
    totalBill: { type: Number, allowNull: true },
    duePay: { type: Number, allowNull: true },
    advancePay: { type: Number, allowNull: true },
    totalPay: { type: Number, allowNull: true },
    remainPay: { type: Number, allowNull: true },
    note: { type: String, allowNull: true },
    tokenId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Token',
    },
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient',
    },
    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    createdById: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    updatedById: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    departmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
    },
    payment: [
        {
            method: { type: String, allowNull: true },
            payDate: { type: Date, allowNull: true },
            paid: { type: Number, allowNull: true }
        }
    ]
}, { timestamps: true });


// ✅ Correct place for the hook — before model creation
invoiceSchema.pre('save', async function (next) {
    const invoice = this;

    if (!invoice.invoiceNo) {
        let isUnique = false;
        let generatedCode;

        const generateRandomCode = () => {
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += Math.floor(Math.random() * 10); // Generates a random digit (0-9)
    }
    return result;
};

        while (!isUnique) {
            generatedCode = generateRandomCode();
            const existing = await mongoose.model('Invoice').findOne({ invoiceNo: generatedCode });
            if (!existing) {
                isUnique = true;
            }
        }

        invoice.invoiceNo = generatedCode;
    }

    next();
});


// ✅ Model created after hook is defined
const invoice = mongoose.model('Invoice', invoiceSchema);

module.exports = invoice;
