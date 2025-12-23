
const invoiceController = require("../controllers/invoiceController");
const { upload } = require("../upload/UploadFile");

const router = require("express").Router();

router.get("/get", invoiceController.getinvoices);
router.get("/summary", invoiceController.getInvoiceSummary); // Separate summary endpoint for Financial Reports
router.post(
  "/create",
  invoiceController.addinvoice
);

router.get("/get/:id", invoiceController.getinvoiceById);
router.put(
  "/update/:id",
  invoiceController.updateinvoice
);
router.delete("/delete/:id", invoiceController.deleteinvoice);

module.exports = router;
