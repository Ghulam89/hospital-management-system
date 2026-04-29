
const tokenController = require("../controllers/tokenController");
const { upload } = require("../upload/UploadFile");
const { optionalAuth } = require("../middleware/auth");

const router = require("express").Router();


router.get('/opdReport', optionalAuth, tokenController.getTokensOpdReport); 
router.get('/opdOverallReport', optionalAuth, tokenController.getDoctorsWithTokenCount);

router.get("/get", optionalAuth, tokenController.getDetails);
router.get("/get", optionalAuth, tokenController.getTokensOpdReport);
router.post(
  "/create",
  optionalAuth,
  tokenController.addDetail
);

router.get("/get/:id", optionalAuth, tokenController.getDetailById);
router.get("/getToken", optionalAuth, tokenController.getUnassignedTokenList);
router.put(
  "/update/:id",
  optionalAuth,
  tokenController.updateDetail
);
router.delete("/delete/:id", optionalAuth, tokenController.deleteDetail);

module.exports = router;
