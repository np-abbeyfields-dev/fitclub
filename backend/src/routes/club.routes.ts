import { Router } from 'express';
import { ClubController } from '../controllers/club.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', ClubController.create);
router.post('/join', ClubController.join);
router.get('/', ClubController.listMine);

export default router;
