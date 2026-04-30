
const expenseCategoryController = require("../controllers/expenseCategoryController");
const { upload } = require("../upload/UploadFile");
const { optionalAuth, auth, requireSuperAdmin } = require("../middleware/auth");

const router = require("express").Router();

router.get("/get", optionalAuth, expenseCategoryController.getexpenseCategorys);
router.post(
  "/create",
  auth,
  requireSuperAdmin,
  expenseCategoryController.addexpenseCategory
);

router.get("/get/:id", optionalAuth, expenseCategoryController.getexpenseCategoryById);
router.put(
  "/update/:id",
  auth,
  requireSuperAdmin,
  expenseCategoryController.updateexpenseCategory
);
router.delete("/delete/:id", auth, requireSuperAdmin, expenseCategoryController.deleteexpenseCategory);

module.exports = router;
