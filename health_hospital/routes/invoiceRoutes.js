
const invoiceController = require("../controllers/invoiceController");
const { upload } = require("../upload/UploadFile");
const { optionalAuth } = require("../middleware/auth");

const router = require("express").Router();

router.get("/get", optionalAuth, invoiceController.getinvoices);
router.get("/summary", optionalAuth, invoiceController.getInvoiceSummary); // Separate summary endpoint for Financial Reports
router.post(
  "/create",
  optionalAuth,
  invoiceController.addinvoice
);

router.get("/get/:id", optionalAuth, invoiceController.getinvoiceById);
router.put(
  "/update/:id",
  optionalAuth,
  invoiceController.updateinvoice
);
router.post("/add-payments/:id", optionalAuth, invoiceController.addInvoicePayments);
router.post("/add-refund/:id", optionalAuth, invoiceController.addInvoiceRefund);
router.post("/procedure-refund/:id", optionalAuth, invoiceController.addProcedureRefund);
router.delete("/delete/:id", optionalAuth, invoiceController.deleteinvoice);

module.exports = router;
