
const pharmRackController = require("../controllers/pharmRackController");
const { upload } = require("../upload/UploadFile");

const router = require("express").Router();

router.get("/get", pharmRackController.getpharmRacks);
router.post(
  "/create",
  pharmRackController.addpharmRack
);

router.get("/get/:id", pharmRackController.getpharmRackById);
router.put(
  "/update/:id",
  pharmRackController.updatepharmRack
);
router.delete("/delete/:id", pharmRackController.deletepharmRack);

module.exports = router;
