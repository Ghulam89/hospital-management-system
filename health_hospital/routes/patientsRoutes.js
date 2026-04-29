/**
 * REST-style aliases (plural) — production API surface.
 * Base path: /apis/patients
 */
const router = require("express").Router();
const { auth } = require("../middleware/auth");
const { upload } = require("../upload/UploadFile");
const patientController = require("../controllers/patientController");

router.post(
  "/",
  auth,
  upload.fields([{ name: "image", maxCount: 1 }]),
  patientController.addpatient,
);

router.get("/search", auth, patientController.searchPatients);

router.get("/:id/full-history", auth, patientController.getPatientFullHistory);

module.exports = router;
