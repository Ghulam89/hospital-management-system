
const birthCertificateController = require("../controllers/birthCertificateController");
const { upload } = require("../upload/UploadFile");
const { optionalAuth } = require("../middleware/auth");

const router = require("express").Router();

router.get("/get", optionalAuth, birthCertificateController.getbirthCertificates);
router.post(
  "/create",
  optionalAuth,
  birthCertificateController.addbirthCertificate
);

router.get("/get/:id", optionalAuth, birthCertificateController.getbirthCertificateById);
router.put(
  "/update/:id",
  optionalAuth,
  birthCertificateController.updatebirthCertificate
);
router.delete("/delete/:id", optionalAuth, birthCertificateController.deletebirthCertificate);

module.exports = router;
