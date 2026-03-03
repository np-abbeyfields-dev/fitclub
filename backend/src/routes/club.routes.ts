import { Router } from 'express';
import { ClubController } from '../controllers/club.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', ClubController.create);
router.post('/join', ClubController.join);
router.get('/', ClubController.listMine);
router.get('/:clubId/dashboard', ClubController.getDashboard);
router.get('/:clubId', ClubController.getById);
router.get('/:clubId/members', ClubController.listMembers);
router.patch('/:clubId/members/:userId/role', ClubController.setMemberRole);
router.delete('/:clubId/members/:userId', ClubController.removeMember);

export default router;
