import { Router } from 'express';
import { FeedbackController } from '../controllers/feedback.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/bug', FeedbackController.reportBug);
router.post('/contact', FeedbackController.contact);

export default router;
