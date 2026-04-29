
const pharmRackController = require("../controllers/pharmRackController");
const { upload } = require("../upload/UploadFile");
const { optionalAuth } = require("../middleware/auth");

const router = require("express").Router();

router.get("/get", optionalAuth, pharmRackController.getpharmRacks);
router.post(
  "/create",
  optionalAuth,
  pharmRackController.addpharmRack
);

router.get("/get/:id", optionalAuth, pharmRackController.getpharmRackById);
router.put(
  "/update/:id",
  optionalAuth,
  pharmRackController.updatepharmRack
);
router.delete("/delete/:id", optionalAuth, pharmRackController.deletepharmRack);

module.exports = router;
