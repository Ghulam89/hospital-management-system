
const medicalCertificateController = require("../controllers/medicalCertificateController");
const { upload } = require("../upload/UploadFile");

const router = require("express").Router();

router.get("/get", medicalCertificateController.getDetails);
router.post(
  "/create",
  medicalCertificateController.addDetail
);

router.get("/get/:id", medicalCertificateController.getDetailById);
router.put(
  "/update/:id",
  medicalCertificateController.updateDetail
);
router.delete("/delete/:id", medicalCertificateController.deleteDetail);

module.exports = router;
