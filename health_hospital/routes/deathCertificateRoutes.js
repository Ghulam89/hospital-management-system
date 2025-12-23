
const deathCertificateController = require("../controllers/deathCertificateController");
const { upload } = require("../upload/UploadFile");

const router = require("express").Router();

router.get("/get", deathCertificateController.getdeathCertificates);
router.post(
  "/create",
  deathCertificateController.adddeathCertificate
);

router.get("/get/:id", deathCertificateController.getdeathCertificateById);
router.put(
  "/update/:id",
  deathCertificateController.updatedeathCertificate
);
router.delete("/delete/:id", deathCertificateController.deletedeathCertificate);

module.exports = router;
