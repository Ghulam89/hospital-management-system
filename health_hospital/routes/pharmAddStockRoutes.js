
const PharmAddStockController = require("../controllers/pharmAddStockController");
const { upload } = require("../upload/UploadFile");
const { optionalAuth } = require("../middleware/auth");

const router = require("express").Router();

router.get("/get", optionalAuth, PharmAddStockController.getpharmAddStocks);
router.post(
  "/create",
  optionalAuth,
  PharmAddStockController.addpharmAddStock
);

router.get("/get/:id", optionalAuth, PharmAddStockController.getpharmAddStockById);
router.get("/get-by-item/:itemId", optionalAuth, PharmAddStockController.getAddStockByItem);
router.put(
  "/update/:id",
  optionalAuth,
  PharmAddStockController.updatepharmAddStock
);
router.delete("/delete/:id", optionalAuth, PharmAddStockController.deletepharmAddStock);

module.exports = router;
