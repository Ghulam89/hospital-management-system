
const patientController = require("../controllers/patientController");
const { upload } = require("../upload/UploadFile");

const router = require("express").Router();

router.get("/get", patientController.getpatients);
router.post(
  "/create",
  upload.fields([{ name: "image", maxCount: 1 }]),
  patientController.addpatient
);

router.get("/get/:id", patientController.getpatientById);
router.put(
  "/update/:id",
  upload.fields([{ name: "image", maxCount: 1 }]),
  patientController.updatepatient
);
router.delete("/delete/:id", patientController.deletepatient);

module.exports = router;
