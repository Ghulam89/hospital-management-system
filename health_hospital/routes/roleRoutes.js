const router = require('express').Router();
const roleController = require('../controllers/roleController');
const { auth, requireRole, requireSuperAdmin } = require('../middleware/auth');

/** Branch admins manage branch-owned roles; delete is Super Admin only. List scope is enforced in controller. */
const adminRoles = requireRole(
  'superadmin',
  'super admin',
  'administrator',
  'admin',
  'branchadmin',
  'branch_admin',
);

router.get('/catalog', auth, requireSuperAdmin, roleController.getCatalog);
router.get('/get', auth, adminRoles, roleController.getRoles);
router.get('/get/:id', auth, adminRoles, roleController.getRoleById);
router.post('/create', auth, adminRoles, roleController.createRole);
router.put('/update/:id', auth, adminRoles, roleController.updateRole);
router.delete('/delete/:id', auth, adminRoles, roleController.deleteRole);

module.exports = router;
