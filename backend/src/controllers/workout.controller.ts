import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types';
import { listGenericActivities, listWorkoutMaster } from '../services/workout.service';

export class WorkoutController {
  /**
   * GET /workouts/activities
   * Returns generic workout types (GenericWorkoutMet) for activity chips.
   * MET fields will be used later for points calculation.
   */
  static async listActivities(req: AuthRequest, res: Response): Promise<void> {
    const activities = await listGenericActivities();
    res.json({ success: true, data: activities } as ApiResponse);
  }

  /**
   * GET /workouts/workout-master
   * Returns full WorkoutMaster list (specific workoutType -> genericWorkoutType).
   * Frontend can group by genericWorkoutType for sections or search.
   */
  static async listWorkoutMaster(req: AuthRequest, res: Response): Promise<void> {
    const list = await listWorkoutMaster();
    res.json({ success: true, data: list } as ApiResponse);
  }
}
