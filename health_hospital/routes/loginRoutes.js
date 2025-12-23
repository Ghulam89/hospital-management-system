
const loginController=require('../controllers/loginController')

const router=require('express').Router()

router.post('/user',loginController.loginuser)
router.put('/forgetUserPassword',loginController.forgetuserloginPassword)
router.put('/updateUserPassword',loginController.updateuserloginPassword)


module.exports=router

