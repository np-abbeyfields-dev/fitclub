import { Router } from 'express';
import { RoundController } from '../controllers/round.controller';
import { CustomChallengeController } from '../controllers/customChallenge.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/clubs/:clubId/rounds', RoundController.create);
router.get('/clubs/:clubId/rounds', RoundController.listByClub);
router.get('/rounds/:roundId', RoundController.getById);
router.get('/rounds/:roundId/leaderboard', RoundController.getLeaderboard);
router.get('/rounds/:roundId/users/:userId/workouts', RoundController.listMemberWorkouts);
router.get('/rounds/:roundId/summary', RoundController.getRoundSummary);
router.get('/rounds/:roundId/custom-challenges', CustomChallengeController.listByRound);
router.post('/rounds/:roundId/custom-challenges', CustomChallengeController.create);
router.get('/rounds/:roundId/draft-state', RoundController.getDraftState);
router.post('/rounds/:roundId/draft-pick', RoundController.makeDraftPick);
router.post('/rounds/:roundId/workouts', RoundController.logWorkout);
router.post('/rounds/:roundId/activate', RoundController.activate);
router.patch('/rounds/:roundId', RoundController.update);
router.post('/rounds/:roundId/end', RoundController.end);

export default router;
