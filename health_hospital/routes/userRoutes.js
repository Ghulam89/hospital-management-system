
const userController = require("../controllers/userController");
const { upload } = require("../upload/UploadFile");
const { auth, requireRole } = require("../middleware/auth");

const router = require("express").Router();

router.get("/me", auth, userController.getCurrentUser);
router.get("/get", auth, userController.getusers);
router.post("/register-superadmin", userController.registerSuperAdmin);
router.post(
  "/create",
  auth,
  requireRole("superadmin", "super admin", "administrator", "admin"),
  upload.fields([{ name: "image", maxCount: 1 }]),
  userController.adduser
);

router.get("/get/:id", auth, userController.getuserById);
router.put(
  "/update/:id",
  auth,
  requireRole("superadmin", "super admin", "administrator", "admin"),
  upload.fields([{ name: "image", maxCount: 1 }]),
  userController.updateuser
);
router.delete(
  "/delete/:id",
  auth,
  requireRole("superadmin", "super admin", "administrator", "admin"),
  userController.deleteuser
);

module.exports = router;
