
const expenseCategoryController = require("../controllers/expenseCategoryController");
const { upload } = require("../upload/UploadFile");
const { optionalAuth } = require("../middleware/auth");

const router = require("express").Router();

router.get("/get", optionalAuth, expenseCategoryController.getexpenseCategorys);
router.post(
  "/create",
  optionalAuth,
  expenseCategoryController.addexpenseCategory
);

router.get("/get/:id", optionalAuth, expenseCategoryController.getexpenseCategoryById);
router.put(
  "/update/:id",
  optionalAuth,
  expenseCategoryController.updateexpenseCategory
);
router.delete("/delete/:id", optionalAuth, expenseCategoryController.deleteexpenseCategory);

module.exports = router;
