
const deathCertificateController = require("../controllers/deathCertificateController");
const { upload } = require("../upload/UploadFile");
const { optionalAuth } = require("../middleware/auth");

const router = require("express").Router();

router.get("/get", optionalAuth, deathCertificateController.getdeathCertificates);
router.post(
  "/create",
  optionalAuth,
  deathCertificateController.adddeathCertificate
);

router.get("/get/:id", optionalAuth, deathCertificateController.getdeathCertificateById);
router.put(
  "/update/:id",
  optionalAuth,
  deathCertificateController.updatedeathCertificate
);
router.delete("/delete/:id", optionalAuth, deathCertificateController.deletedeathCertificate);

module.exports = router;
