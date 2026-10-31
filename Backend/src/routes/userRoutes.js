const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorizePermission } = require('../middlewares/authMiddleware');

// Profile Endpoints (Strictly scoped to req.user.id)
router.get('/me', authenticate, authorizePermission('profile.manage'), userController.getMyProfile);
router.put('/me', authenticate, authorizePermission('profile.manage'), userController.updateMyProfile);

// Dashboard Summary Stats
router.get('/dashboard-stats', authenticate, userController.getDashboardStats);

// Account Management (Admin Portal)
router.get('/', authenticate, authorizePermission('users.view'), userController.getAllUsers);
router.post('/', authenticate, userController.createUser);
router.patch('/:id/status', authenticate, authorizePermission('users.status'), userController.toggleUserStatus);

module.exports = router;
