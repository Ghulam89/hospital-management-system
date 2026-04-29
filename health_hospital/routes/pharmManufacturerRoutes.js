
const pharmManufacturerController = require("../controllers/pharmManufacturerController");
const { upload } = require("../upload/UploadFile");
const { optionalAuth } = require("../middleware/auth");

const router = require("express").Router();

router.get("/get", optionalAuth, pharmManufacturerController.getpharmManufacturers);
router.post(
  "/create",
  optionalAuth,
  pharmManufacturerController.addpharmManufacturer
);

router.get("/get/:id", optionalAuth, pharmManufacturerController.getpharmManufacturerById);
router.put(
  "/update/:id",
  optionalAuth,
  pharmManufacturerController.updatepharmManufacturer
);
router.delete("/delete/:id", optionalAuth, pharmManufacturerController.deletepharmManufacturer);

module.exports = router;
