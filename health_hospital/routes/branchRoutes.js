const branchController = require('../controllers/branchController');
const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');

router.get('/get', auth, branchController.getBranches);
router.get('/get/:id', auth, branchController.getBranchById);

router.post('/create', auth, requireRole('superadmin', 'super admin'), branchController.createBranch);
router.put('/update/:id', auth, requireRole('superadmin', 'super admin'), branchController.updateBranch);
router.delete('/delete/:id', auth, requireRole('superadmin', 'super admin'), branchController.deleteBranch);

router.post(
  '/:id/create-admin',
  auth,
  requireRole('superadmin', 'super admin'),
  branchController.createBranchAdmin,
);

module.exports = router;
