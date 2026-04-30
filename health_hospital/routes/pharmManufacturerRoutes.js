
const pharmManufacturerController = require("../controllers/pharmManufacturerController");
const { upload } = require("../upload/UploadFile");
const { optionalAuth, auth, requireSuperAdmin } = require("../middleware/auth");

const router = require("express").Router();

router.get("/get", optionalAuth, pharmManufacturerController.getpharmManufacturers);
router.post(
  "/create",
  auth,
  requireSuperAdmin,
  pharmManufacturerController.addpharmManufacturer
);

router.get("/get/:id", optionalAuth, pharmManufacturerController.getpharmManufacturerById);
router.put(
  "/update/:id",
  auth,
  requireSuperAdmin,
  pharmManufacturerController.updatepharmManufacturer
);
router.delete("/delete/:id", auth, requireSuperAdmin, pharmManufacturerController.deletepharmManufacturer);

module.exports = router;
