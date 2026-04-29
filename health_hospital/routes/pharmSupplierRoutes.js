
const pharmSupplierController = require("../controllers/pharmSupplierController");
const { upload } = require("../upload/UploadFile");
const { optionalAuth } = require("../middleware/auth");

const router = require("express").Router();

router.get("/get", optionalAuth, pharmSupplierController.getpharmSuppliers);
router.post(
  "/create",
  optionalAuth,
  pharmSupplierController.addpharmSupplier
);

router.get("/get/:id", optionalAuth, pharmSupplierController.getpharmSupplierById);
router.get("/ledger/:supplierId", optionalAuth, pharmSupplierController.getSupplierLedger);
router.post("/ledger-payment/:supplierId", optionalAuth, pharmSupplierController.addSupplierLedgerPayment);
router.post(
  "/purchase-ledger-payment/:supplierId/:purchaseId",
  optionalAuth,
  pharmSupplierController.addSupplierPurchaseLedgerPayment
);
router.put(
  "/purchase-ledger-payment/:supplierId/:purchaseId/:paymentId",
  optionalAuth,
  pharmSupplierController.updateSupplierPurchaseLedgerPayment
);
router.delete(
  "/purchase-ledger-payment/:supplierId/:purchaseId/:paymentId",
  optionalAuth,
  pharmSupplierController.deleteSupplierPurchaseLedgerPayment
);
router.post(
  "/purchase-ledger-adjustment/:supplierId/:purchaseId",
  optionalAuth,
  pharmSupplierController.addSupplierPurchaseLedgerAdjustment
);
router.put(
  "/purchase-ledger-adjustment/:supplierId/:purchaseId/:adjustmentId",
  optionalAuth,
  pharmSupplierController.updateSupplierPurchaseLedgerAdjustment
);
router.delete(
  "/purchase-ledger-adjustment/:supplierId/:purchaseId/:adjustmentId",
  optionalAuth,
  pharmSupplierController.deleteSupplierPurchaseLedgerAdjustment
);
router.put(
  "/ledger-payment/:supplierId/:paymentId",
  optionalAuth,
  pharmSupplierController.updateSupplierLedgerPayment
);
router.delete(
  "/ledger-payment/:supplierId/:paymentId",
  optionalAuth,
  pharmSupplierController.deleteSupplierLedgerPayment
);
router.post("/ledger-adjustment/:supplierId", optionalAuth, pharmSupplierController.addSupplierLedgerAdjustment);
router.put(
  "/ledger-adjustment/:supplierId/:adjustmentId",
  optionalAuth,
  pharmSupplierController.updateSupplierLedgerAdjustment
);
router.delete(
  "/ledger-adjustment/:supplierId/:adjustmentId",
  optionalAuth,
  pharmSupplierController.deleteSupplierLedgerAdjustment
);
router.put(
  "/update/:id",
  optionalAuth,
  pharmSupplierController.updatepharmSupplier
);
router.delete("/delete/:id", optionalAuth, pharmSupplierController.deletepharmSupplier);

module.exports = router;
