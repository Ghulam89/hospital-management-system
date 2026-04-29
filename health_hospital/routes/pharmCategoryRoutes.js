
const pharmCategoryController = require("../controllers/pharmCategoryController");
const { upload } = require("../upload/UploadFile");
const { optionalAuth } = require("../middleware/auth");

const router = require("express").Router();

router.get("/get", optionalAuth, pharmCategoryController.getpharmCategorys);
router.post(
  "/create",
  optionalAuth,
  pharmCategoryController.addpharmCategory
);

router.get("/get/:id", optionalAuth, pharmCategoryController.getpharmCategoryById);
router.put(
  "/update/:id",
  optionalAuth,
  pharmCategoryController.updatepharmCategory
);
router.delete("/delete/:id", optionalAuth, pharmCategoryController.deletepharmCategory);

module.exports = router;
