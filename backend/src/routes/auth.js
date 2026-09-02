import { Router } from 'express';
import { login, me, logout } from '../controllers/authController.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();
router.post('/login', login);
router.get('/me',    requireAuth, me);
router.post('/logout', requireAuth, logout);

export default router;
