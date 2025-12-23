
const userController = require("../controllers/userController");
const { upload } = require("../upload/UploadFile");

const router = require("express").Router();

router.get("/get", userController.getusers);
router.post(
  "/create",
  upload.fields([{ name: "image", maxCount: 1 }]),
  userController.adduser
);

router.get("/get/:id", userController.getuserById);
router.put(
  "/update/:id",
  upload.fields([{ name: "image", maxCount: 1 }]),
  userController.updateuser
);
router.delete("/delete/:id", userController.deleteuser);

module.exports = router;
