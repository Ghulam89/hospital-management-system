
const medicalCertificateController = require("../controllers/medicalCertificateController");
const { upload } = require("../upload/UploadFile");
const { optionalAuth } = require("../middleware/auth");

const router = require("express").Router();

router.get("/get", optionalAuth, medicalCertificateController.getDetails);
router.post(
  "/create",
  optionalAuth,
  medicalCertificateController.addDetail
);

router.get("/get/:id", optionalAuth, medicalCertificateController.getDetailById);
router.put(
  "/update/:id",
  optionalAuth,
  medicalCertificateController.updateDetail
);
router.delete("/delete/:id", optionalAuth, medicalCertificateController.deleteDetail);

module.exports = router;
