const pharmMissedSaleController = require("../controllers/pharmMissedSaleController");

const router = require("express").Router();

router.get("/get", pharmMissedSaleController.getMissedSales);
router.post("/create", pharmMissedSaleController.addMissedSale);
router.get("/get/:id", pharmMissedSaleController.getMissedSaleById);
router.put("/update/:id", pharmMissedSaleController.updateMissedSale);
router.delete("/delete/:id", pharmMissedSaleController.deleteMissedSale);
router.put("/resolve/:id", pharmMissedSaleController.resolveMissedSale);
router.get("/stats", pharmMissedSaleController.getMissedSaleStats);

module.exports = router;