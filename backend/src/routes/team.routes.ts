import { Router } from 'express';
import { TeamController } from '../controllers/team.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/rounds/:roundId/teams', TeamController.create);
router.get('/rounds/:roundId/teams', TeamController.listByRound);
router.get('/rounds/:roundId/my-team', TeamController.getMyTeam);
router.get('/rounds/:roundId/teams/:teamId/summary', TeamController.getTeamSummary);
router.post('/rounds/:roundId/teams/:teamId/members', TeamController.addMember);

export default router;
