import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { login, logout, me, refresh, signOutEverywhere, updatePassword } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { loginLimiter } from '../middleware/rateLimit.middleware.js';
import { loginSchema } from '../validators/auth.validator.js';

const router = Router();

router.post('/login', loginLimiter, validate(loginSchema), login);
router.post('/refresh', refresh);
router.post('/logout', asyncHandler(logout));

// Every route below needs a valid session.
router.use(requireAuth);

router.get('/me', me);
router.post('/change-password', updatePassword);
router.post('/sign-out-everywhere', signOutEverywhere);

export default router;
