const pharmPurchaseOrderController = require("../controllers/pharmPurchaseOrderController");
const { optionalAuth } = require("../middleware/auth");

const router = require("express").Router();

router.get("/get", optionalAuth, pharmPurchaseOrderController.getPurchaseOrders);
router.post("/create", optionalAuth, pharmPurchaseOrderController.addPurchaseOrder);
router.get("/get/:id", optionalAuth, pharmPurchaseOrderController.getPurchaseOrderById);
router.put("/update/:id", optionalAuth, pharmPurchaseOrderController.updatePurchaseOrder);
router.delete("/delete/:id", optionalAuth, pharmPurchaseOrderController.deletePurchaseOrder);
router.put("/approve/:id", optionalAuth, pharmPurchaseOrderController.approvePurchaseOrder);
router.get("/stats", optionalAuth, pharmPurchaseOrderController.getPurchaseOrderStats);
router.get("/next-po-number", optionalAuth, pharmPurchaseOrderController.getNextPONumber);

module.exports = router;
