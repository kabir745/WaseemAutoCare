const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const { authenticate, authorizePermission, requireMainAdmin } = require('../middlewares/authMiddleware');

// Get all roles with their assigned permissions
router.get('/', authenticate, roleController.getAllRoles);

// Get available permissions catalog
router.get('/permissions', authenticate, roleController.getAllPermissions);

// Update permissions for a role (Main Admin only)
router.put('/:id/permissions', authenticate, requireMainAdmin, authorizePermission('roles.manage'), roleController.updateRolePermissions);

module.exports = router;
