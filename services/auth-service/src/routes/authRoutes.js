import { Router } from 'express';
import { protect, authorize, requireSuperAdmin,  } from '../middleware/auth.js';
import {
    register,
    login,
    logout,
    getMe,
    updateMe,
    changePassword,
    deactivateSelf,
    verifyToken,
    getAllUsers,
    getUserById,
    approveDoctor,
    rejectDoctor,
    deactivateUser,
    activateUser,
    deleteUser,
    createAdmin,
    deleteAdmin,
    getUserStatus,
} from '../controllers/authController.js';

const router = Router();


// public endpoints
router.post('/register', register);
router.post('/login', login);

// Internal — checked by other services' auth middleware on every request
// No JWT — secured by x-internal-secret header
router.get('/internal/users/:id/status', getUserStatus);


// Authenticated endpoints (for any user)
router.use(protect);

router.post('/logout', logout);
router.get('/me', getMe);
router.put('/me', updateMe);
router.put('/change-password', changePassword);
router.put('/deactivate-account', deactivateSelf);
router.get('/verify', verifyToken);


// Admin + Superadmin authorized endpoints
router.use(authorize('admin'));

router.get('/admin/users', getAllUsers);
router.get('/admin/users/:id', getUserById);
router.put('/admin/users/:id/approve', approveDoctor);
router.put('/admin/users/:id/reject', rejectDoctor);
router.put('/admin/users/:id/deactivate', deactivateUser);
router.put('/admin/users/:id/activate', activateUser);
router.delete('/admin/users/:id', deleteUser);

// Super Admin only
router.post('/superadmin/create-admin', requireSuperAdmin, createAdmin);
router.delete('/superadmin/admins/:id', requireSuperAdmin, deleteAdmin);

export default router;