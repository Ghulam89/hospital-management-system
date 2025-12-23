
const roomDetailController = require("../controllers/roomDetailController");
const { upload } = require("../upload/UploadFile");

const router = require("express").Router();

router.get("/get", roomDetailController.getroomDetails);
router.post(
  "/create",
  roomDetailController.addroomDetail
);

router.get("/get/:id", roomDetailController.getroomDetailById);
router.put(
  "/update/:id",
  roomDetailController.updateroomDetail
);
router.delete("/delete/:id", roomDetailController.deleteroomDetail);

module.exports = router;
