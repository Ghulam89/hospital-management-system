
const roomDetailController = require("../controllers/roomDetailController");
const { upload } = require("../upload/UploadFile");
const { optionalAuth } = require("../middleware/auth");

const router = require("express").Router();

router.get("/get", optionalAuth, roomDetailController.getroomDetails);
router.post(
  "/create",
  optionalAuth,
  roomDetailController.addroomDetail
);

router.get("/get/:id", optionalAuth, roomDetailController.getroomDetailById);
router.put(
  "/update/:id",
  optionalAuth,
  roomDetailController.updateroomDetail
);
router.delete("/delete/:id", optionalAuth, roomDetailController.deleteroomDetail);

module.exports = router;
