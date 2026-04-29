
const admitPatientController = require("../controllers/admitPatientController");
const { upload } = require("../upload/UploadFile");
const { optionalAuth } = require("../middleware/auth");

const router = require("express").Router();

router.get("/get", optionalAuth, admitPatientController.getadmitPatients);
router.post(
  "/create",
  optionalAuth,
  admitPatientController.addadmitPatient
);

router.get("/get/:id", optionalAuth, admitPatientController.getadmitPatientById);
router.put(
  "/update/:id",
  optionalAuth,
  admitPatientController.updateadmitPatient
);
router.delete("/delete/:id", optionalAuth, admitPatientController.deleteadmitPatient);

module.exports = router;
