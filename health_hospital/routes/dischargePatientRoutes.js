
const dischargePatientController = require("../controllers/dischargePatientController");
const { upload } = require("../upload/UploadFile");

const router = require("express").Router();

router.get("/get", dischargePatientController.getdischargePatients);
router.post(
  "/create",
  upload.fields([{ name: "document" }]),
  dischargePatientController.adddischargePatient
);

router.get("/get/:id", dischargePatientController.getdischargePatientById);
router.put(
  "/update/:id",
  upload.fields([{ name: "document" }]),
  dischargePatientController.updatedischargePatient
);
router.delete("/delete/:id", dischargePatientController.deletedischargePatient);

module.exports = router;
