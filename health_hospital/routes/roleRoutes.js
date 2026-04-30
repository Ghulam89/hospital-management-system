const router = require('express').Router();
const roleController = require('../controllers/roleController');
const { auth, requireRole } = require('../middleware/auth');

/** Branch admins may manage branch roles; elevated templates (admin/superadmin) excluded in controller for non–super-admins. */
const adminRoles = requireRole(
  'superadmin',
  'super admin',
  'administrator',
  'admin',
  'branchadmin',
  'branch_admin',
);

router.get('/catalog', auth, adminRoles, roleController.getCatalog);
router.get('/get', auth, adminRoles, roleController.getRoles);
router.get('/get/:id', auth, adminRoles, roleController.getRoleById);
router.post('/create', auth, adminRoles, roleController.createRole);
router.put('/update/:id', auth, adminRoles, roleController.updateRole);
router.delete('/delete/:id', auth, adminRoles, roleController.deleteRole);

module.exports = router;
