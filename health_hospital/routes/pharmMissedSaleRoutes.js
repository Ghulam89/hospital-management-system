const pharmMissedSaleController = require("../controllers/pharmMissedSaleController");
const { optionalAuth } = require("../middleware/auth");

const router = require("express").Router();

router.get("/get", optionalAuth, pharmMissedSaleController.getMissedSales);
router.post("/create", optionalAuth, pharmMissedSaleController.addMissedSale);
router.get("/get/:id", optionalAuth, pharmMissedSaleController.getMissedSaleById);
router.put("/update/:id", optionalAuth, pharmMissedSaleController.updateMissedSale);
router.delete("/delete/:id", optionalAuth, pharmMissedSaleController.deleteMissedSale);
router.put("/resolve/:id", optionalAuth, pharmMissedSaleController.resolveMissedSale);
router.get("/stats", optionalAuth, pharmMissedSaleController.getMissedSaleStats);

module.exports = router;
