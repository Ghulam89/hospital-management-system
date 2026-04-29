
const dischargePatientController = require("../controllers/dischargePatientController");
const { upload } = require("../upload/UploadFile");
const { optionalAuth } = require("../middleware/auth");

const router = require("express").Router();

router.get("/get", optionalAuth, dischargePatientController.getdischargePatients);
router.post(
  "/create",
  optionalAuth,
  upload.fields([{ name: "document" }]),
  dischargePatientController.adddischargePatient
);

router.get("/get/:id", optionalAuth, dischargePatientController.getdischargePatientById);
router.put(
  "/update/:id",
  optionalAuth,
  upload.fields([{ name: "document" }]),
  dischargePatientController.updatedischargePatient
);
router.delete("/delete/:id", optionalAuth, dischargePatientController.deletedischargePatient);

module.exports = router;
