import { Router } from 'express';
import { WorkoutController } from '../controllers/workout.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/workouts/activities', WorkoutController.listActivities);
router.get('/workouts/workout-master', WorkoutController.listWorkoutMaster);
router.get('/workouts/me', WorkoutController.listMyWorkouts);
router.get('/workouts/:id', WorkoutController.getWorkoutById);
router.delete('/workouts/:id', WorkoutController.deleteWorkout);

export default router;
