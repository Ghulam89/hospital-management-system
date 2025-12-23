const pharmPurchaseOrderController = require("../controllers/pharmPurchaseOrderController");

const router = require("express").Router();

router.get("/get", pharmPurchaseOrderController.getPurchaseOrders);
router.post("/create", pharmPurchaseOrderController.addPurchaseOrder);
router.get("/get/:id", pharmPurchaseOrderController.getPurchaseOrderById);
router.put("/update/:id", pharmPurchaseOrderController.updatePurchaseOrder);
router.delete("/delete/:id", pharmPurchaseOrderController.deletePurchaseOrder);
router.put("/approve/:id", pharmPurchaseOrderController.approvePurchaseOrder);
router.get("/stats", pharmPurchaseOrderController.getPurchaseOrderStats);

module.exports = router;
