
const pharmManufacturerController = require("../controllers/pharmManufacturerController");
const { upload } = require("../upload/UploadFile");

const router = require("express").Router();

router.get("/get", pharmManufacturerController.getpharmManufacturers);
router.post(
  "/create",
  pharmManufacturerController.addpharmManufacturer
);

router.get("/get/:id", pharmManufacturerController.getpharmManufacturerById);
router.put(
  "/update/:id",
  pharmManufacturerController.updatepharmManufacturer
);
router.delete("/delete/:id", pharmManufacturerController.deletepharmManufacturer);

module.exports = router;
