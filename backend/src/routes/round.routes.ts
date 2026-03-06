import { Router } from 'express';
import { RoundController } from '../controllers/round.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/clubs/:clubId/rounds', RoundController.create);
router.get('/clubs/:clubId/rounds', RoundController.listByClub);
router.get('/rounds/:roundId', RoundController.getById);
router.get('/rounds/:roundId/leaderboard', RoundController.getLeaderboard);
router.post('/rounds/:roundId/workouts', RoundController.logWorkout);
router.post('/rounds/:roundId/activate', RoundController.activate);
router.patch('/rounds/:roundId', RoundController.update);
router.post('/rounds/:roundId/end', RoundController.end);

export default router;
