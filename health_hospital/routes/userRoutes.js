
const userController = require("../controllers/userController");
const { upload } = require("../upload/UploadFile");
const {
  auth,
  hasMpPermission,
  normalizeRole,
} = require("../middleware/auth");
const { isBranchAdmin } = require("../middleware/rbac");

const router = require("express").Router();

/** Superadmin / branch admin / users with mp.users.* may manage staff accounts */
const requireUserManage = (action) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ status: "fail", message: "Unauthorized" });
  }
  const role = normalizeRole(req.user.role);
  if (
    role === "superadmin" ||
    role === "super admin" ||
    role === "administrator" ||
    role === "admin" ||
    role.startsWith("administrator_") ||
    role.startsWith("admin_")
  ) {
    return next();
  }
  if (isBranchAdmin(req.user)) return next();
  if (hasMpPermission(req.user, "users", action)) return next();
  return res.status(403).json({
    status: "fail",
    message: "You do not have permission for this action",
  });
};

router.get("/me", auth, userController.getCurrentUser);
router.get("/doctors-grouped", auth, userController.getDoctorsGrouped);
router.get("/get", auth, userController.getusers);
router.post("/register-superadmin", userController.registerSuperAdmin);
router.post(
  "/create",
  auth,
  requireUserManage("create"),
  upload.fields([{ name: "image", maxCount: 1 }]),
  userController.adduser
);

router.get("/get/:id", auth, userController.getuserById);
router.get(
  "/doctor-branches/:id",
  auth,
  requireUserManage("view"),
  userController.getDoctorBranches,
);
router.put(
  "/doctor-branches/:id",
  auth,
  requireUserManage("update"),
  userController.syncDoctorBranches,
);
router.put(
  "/update/:id",
  auth,
  requireUserManage("update"),
  upload.fields([{ name: "image", maxCount: 1 }]),
  userController.updateuser
);
router.delete(
  "/delete/:id",
  auth,
  requireUserManage("delete"),
  userController.deleteuser
);

module.exports = router;
