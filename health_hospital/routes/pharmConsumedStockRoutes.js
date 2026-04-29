const pharmConsumedStockController = require("../controllers/pharmConsumedStockController");
const { optionalAuth } = require("../middleware/auth");

const router = require("express").Router();

router.get("/get", optionalAuth, pharmConsumedStockController.getConsumedStocks);
router.post("/create", optionalAuth, pharmConsumedStockController.addConsumedStock);
router.get("/get/:id", optionalAuth, pharmConsumedStockController.getConsumedStockById);
router.put("/update/:id", optionalAuth, pharmConsumedStockController.updateConsumedStock);
router.delete("/delete/:id", optionalAuth, pharmConsumedStockController.deleteConsumedStock);
router.get("/stats", optionalAuth, pharmConsumedStockController.getConsumedStockStats);

module.exports = router;
