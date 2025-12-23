
const birthCertificateController = require("../controllers/birthCertificateController");
const { upload } = require("../upload/UploadFile");

const router = require("express").Router();

router.get("/get", birthCertificateController.getbirthCertificates);
router.post(
  "/create",
  birthCertificateController.addbirthCertificate
);

router.get("/get/:id", birthCertificateController.getbirthCertificateById);
router.put(
  "/update/:id",
  birthCertificateController.updatebirthCertificate
);
router.delete("/delete/:id", birthCertificateController.deletebirthCertificate);

module.exports = router;
