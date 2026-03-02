import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authLimiter } from '../middleware/rateLimit';

const router = Router();

router.post('/register', authLimiter, AuthController.register);
router.post('/login', authLimiter, AuthController.login);

export default router;
