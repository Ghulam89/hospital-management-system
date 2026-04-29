
const pharmReturnStockController = require("../controllers/pharmReturnStockController");
const { upload } = require("../upload/UploadFile");
const { optionalAuth } = require("../middleware/auth");
const { auth: checkLogin } = require("../middleware/auth");

const router = require("express").Router();

router.get("/get", optionalAuth, checkLogin, pharmReturnStockController.getpharmReturnStocks);
router.get("/next-number", optionalAuth, checkLogin, pharmReturnStockController.getNextReturnNumber);
router.post(
  "/create",
  optionalAuth,
  checkLogin,
  pharmReturnStockController.addpharmReturnStock
);

router.get("/get/:id", optionalAuth, checkLogin, pharmReturnStockController.getpharmReturnStockById);
router.put(
  "/update/:id",
  optionalAuth,
  checkLogin,
  pharmReturnStockController.updatepharmReturnStock
);
router.delete("/delete/:id", optionalAuth, checkLogin, pharmReturnStockController.deletepharmReturnStock);

router.get("/invoices/:supplierId", optionalAuth, checkLogin, pharmReturnStockController.getSupplierInvoices);

module.exports = router;
