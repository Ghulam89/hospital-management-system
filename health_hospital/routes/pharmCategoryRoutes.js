
const pharmCategoryController = require("../controllers/pharmCategoryController");
const { upload } = require("../upload/UploadFile");

const router = require("express").Router();

router.get("/get", pharmCategoryController.getpharmCategorys);
router.post(
  "/create",
  pharmCategoryController.addpharmCategory
);

router.get("/get/:id", pharmCategoryController.getpharmCategoryById);
router.put(
  "/update/:id",
  pharmCategoryController.updatepharmCategory
);
router.delete("/delete/:id", pharmCategoryController.deletepharmCategory);

module.exports = router;
