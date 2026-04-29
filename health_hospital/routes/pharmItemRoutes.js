
const pharmItemController = require("../controllers/pharmItemController");
const { upload } = require("../upload/UploadFile");
const { optionalAuth, auth, requireSuperAdmin } = require("../middleware/auth");

const router = require("express").Router();

router.get("/get", optionalAuth, pharmItemController.getpharmItems);
router.get("/flow-summary", optionalAuth, pharmItemController.getPharmItemFlowSummary);

router.post("/create", auth, requireSuperAdmin, pharmItemController.addpharmItem);
router.post("/createExcel", auth, requireSuperAdmin, pharmItemController.addExcelpharmItem);

router.get("/get/:id", optionalAuth, pharmItemController.getpharmItemById);
router.put("/update/:id", optionalAuth, pharmItemController.updatepharmItem);
router.delete("/delete/:id", auth, requireSuperAdmin, pharmItemController.deletepharmItem);

module.exports = router;
