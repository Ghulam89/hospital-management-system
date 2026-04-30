
const pharmCategoryController = require("../controllers/pharmCategoryController");
const { upload } = require("../upload/UploadFile");
const { optionalAuth, auth, requireSuperAdmin } = require("../middleware/auth");

const router = require("express").Router();

router.get("/get", optionalAuth, pharmCategoryController.getpharmCategorys);
router.post(
  "/create",
  auth,
  requireSuperAdmin,
  pharmCategoryController.addpharmCategory
);

router.get("/get/:id", optionalAuth, pharmCategoryController.getpharmCategoryById);
router.put(
  "/update/:id",
  auth,
  requireSuperAdmin,
  pharmCategoryController.updatepharmCategory
);
router.delete("/delete/:id", auth, requireSuperAdmin, pharmCategoryController.deletepharmCategory);

module.exports = router;
