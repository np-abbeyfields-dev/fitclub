import { Router } from 'express';
import { WorkoutController } from '../controllers/workout.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/workouts/activities', WorkoutController.listActivities);
router.get('/workouts/workout-master', WorkoutController.listWorkoutMaster);

export default router;
