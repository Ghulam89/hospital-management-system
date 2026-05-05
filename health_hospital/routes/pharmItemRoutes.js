
const pharmItemController = require("../controllers/pharmItemController");
const { optionalAuth, auth, requireMpPermission } = require("../middleware/auth");

const router = require("express").Router();

router.get("/get", optionalAuth, pharmItemController.getpharmItems);
router.get("/flow-summary", optionalAuth, pharmItemController.getPharmItemFlowSummary);

router.post("/create", auth, requireMpPermission("pharm_items", "create"), pharmItemController.addpharmItem);
router.post("/createExcel", auth, requireMpPermission("pharm_items", "create"), pharmItemController.addExcelpharmItem);

router.get("/get/:id", optionalAuth, pharmItemController.getpharmItemById);
router.put("/update/:id", auth, requireMpPermission("pharm_items", "update"), pharmItemController.updatepharmItem);
router.delete("/delete/:id", auth, requireMpPermission("pharm_items", "delete"), pharmItemController.deletepharmItem);

module.exports = router;
