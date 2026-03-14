import { Router } from 'express';
import { CustomChallengeController } from '../controllers/customChallenge.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.patch('/:id', CustomChallengeController.update);
router.delete('/:id', CustomChallengeController.delete);
router.post('/:id/complete', CustomChallengeController.complete);
router.post('/:id/uncomplete', CustomChallengeController.uncomplete);

export default router;
