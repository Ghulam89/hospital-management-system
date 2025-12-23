
const pharmItemController = require("../controllers/pharmItemController");
const { upload } = require("../upload/UploadFile");

const router = require("express").Router();

router.get("/get", pharmItemController.getpharmItems);
router.post(
  "/create",
  pharmItemController.addpharmItem
);
router.post(
  "/createExcel",
  pharmItemController.addExcelpharmItem
);

router.get("/get/:id", pharmItemController.getpharmItemById);
router.put(
  "/update/:id",
  pharmItemController.updatepharmItem
);
router.delete("/delete/:id", pharmItemController.deletepharmItem);

module.exports = router;
