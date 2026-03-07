import { Router } from 'express';
import * as NotificationController from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/notifications', NotificationController.listNotifications);
router.post('/notifications/:id/read', NotificationController.markNotificationRead);

export default router;
