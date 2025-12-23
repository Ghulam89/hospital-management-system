
const pharmReturnStockController = require("../controllers/pharmReturnStockController");
const { upload } = require("../upload/UploadFile");

const router = require("express").Router();

router.get("/get", pharmReturnStockController.getpharmReturnStocks);
router.post(
  "/create",
  pharmReturnStockController.addpharmReturnStock
);

router.get("/get/:id", pharmReturnStockController.getpharmReturnStockById);
router.put(
  "/update/:id",
  pharmReturnStockController.updatepharmReturnStock
);
router.delete("/delete/:id", pharmReturnStockController.deletepharmReturnStock);

module.exports = router;
