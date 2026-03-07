import { Router } from 'express';
import { TeamController } from '../controllers/team.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/rounds/:roundId/teams', TeamController.create);
router.get('/rounds/:roundId/teams', TeamController.listByRound);
router.get('/rounds/:roundId/my-team', TeamController.getMyTeam);
router.get('/rounds/:roundId/teams/:teamId/summary', TeamController.getTeamSummary);
router.get('/rounds/:roundId/teams/:teamId/stats', TeamController.getTeamStats);
router.post('/rounds/:roundId/teams/:teamId/members', TeamController.addMember);
router.delete('/rounds/:roundId/teams/:teamId/members/:userId', TeamController.removeMember);

export default router;
