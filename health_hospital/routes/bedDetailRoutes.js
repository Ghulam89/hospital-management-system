
const bedDetailController = require("../controllers/bedDetailController");
const { upload } = require("../upload/UploadFile");

const router = require("express").Router();

router.get("/get", bedDetailController.getbedDetails);
router.post(
  "/create",
  bedDetailController.addbedDetail
);

router.get("/get/:id", bedDetailController.getbedDetailById);
router.put(
  "/update/:id",
  bedDetailController.updatebedDetail
);
router.delete("/delete/:id", bedDetailController.deletebedDetail);

module.exports = router;
