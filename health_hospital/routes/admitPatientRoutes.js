
const admitPatientController = require("../controllers/admitPatientController");
const { upload } = require("../upload/UploadFile");

const router = require("express").Router();

router.get("/get", admitPatientController.getadmitPatients);
router.post(
  "/create",
  admitPatientController.addadmitPatient
);

router.get("/get/:id", admitPatientController.getadmitPatientById);
router.put(
  "/update/:id",
  admitPatientController.updateadmitPatient
);
router.delete("/delete/:id", admitPatientController.deleteadmitPatient);

module.exports = router;
