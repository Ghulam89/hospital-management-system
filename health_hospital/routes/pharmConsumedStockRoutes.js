const pharmConsumedStockController = require("../controllers/pharmConsumedStockController");

const router = require("express").Router();

router.get("/get", pharmConsumedStockController.getConsumedStocks);
router.post("/create", pharmConsumedStockController.addConsumedStock);
router.get("/get/:id", pharmConsumedStockController.getConsumedStockById);
router.put("/update/:id", pharmConsumedStockController.updateConsumedStock);
router.delete("/delete/:id", pharmConsumedStockController.deleteConsumedStock);
router.get("/stats", pharmConsumedStockController.getConsumedStockStats);

module.exports = router;