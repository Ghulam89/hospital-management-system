
const tokenController = require("../controllers/tokenController");
const { upload } = require("../upload/UploadFile");

const router = require("express").Router();


router.get('/opdReport', tokenController.getTokensOpdReport); 
router.get('/opdOverallReport', tokenController.getDoctorsWithTokenCount);

router.get("/get", tokenController.getDetails);
router.get("/get", tokenController.getTokensOpdReport);
router.post(
  "/create",
  tokenController.addDetail
);

router.get("/get/:id", tokenController.getDetailById);
router.get("/getToken", tokenController.getUnassignedTokenList);
router.put(
  "/update/:id",
  tokenController.updateDetail
);
router.delete("/delete/:id", tokenController.deleteDetail);

module.exports = router;
