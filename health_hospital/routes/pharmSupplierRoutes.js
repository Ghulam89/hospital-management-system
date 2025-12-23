
const pharmSupplierController = require("../controllers/pharmSupplierController");
const { upload } = require("../upload/UploadFile");

const router = require("express").Router();

router.get("/get", pharmSupplierController.getpharmSuppliers);
router.post(
  "/create",
  pharmSupplierController.addpharmSupplier
);

router.get("/get/:id", pharmSupplierController.getpharmSupplierById);
router.put(
  "/update/:id",
  pharmSupplierController.updatepharmSupplier
);
router.delete("/delete/:id", pharmSupplierController.deletepharmSupplier);

module.exports = router;
