import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types';
import {
  listGenericActivities,
  listWorkoutMaster,
  listMyWorkouts as listMyWorkoutsService,
  getWorkoutById,
  deleteWorkout,
} from '../services/workout.service';

function param(req: AuthRequest, key: string): string | undefined {
  const v = req.params[key];
  return Array.isArray(v) ? v[0] : v;
}

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

  /** GET /workouts/me — list current user's workouts (query: roundId, or recent=true, limit). §7.6 */
  static async listMyWorkouts(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const roundId = typeof req.query?.roundId === 'string' ? req.query.roundId : undefined;
    const recent = String(req.query?.recent ?? '') === 'true';
    const limit = req.query?.limit != null ? Number(req.query.limit) : undefined;
    const data = await listMyWorkoutsService(userId, {
      roundId: roundId || undefined,
      recent: recent || !roundId,
      limit,
    });
    res.json({ success: true, data } as ApiResponse);
  }

  /** GET /workouts/:id — get single workout. §7.6 */
  static async getWorkoutById(req: AuthRequest, res: Response): Promise<void> {
    const workoutId = param(req, 'id');
    if (!workoutId) {
      res.status(400).json({ success: false, error: 'Workout ID required.' } as ApiResponse);
      return;
    }
    const data = await getWorkoutById(workoutId, req.user!.id);
    res.json({ success: true, data } as ApiResponse);
  }

  /** DELETE /workouts/:id — delete workout (owner or admin). §7.6 */
  static async deleteWorkout(req: AuthRequest, res: Response): Promise<void> {
    const workoutId = param(req, 'id');
    if (!workoutId) {
      res.status(400).json({ success: false, error: 'Workout ID required.' } as ApiResponse);
      return;
    }
    const prisma = (await import('../config/database')).default;
    const workout = await prisma.workout.findUnique({
      where: { id: workoutId },
      include: { Round: true },
    });
    if (!workout) {
      res.status(404).json({ success: false, error: 'Workout not found.' } as ApiResponse);
      return;
    }
    const { ClubService } = await import('../services/club.service');
    const membership = await ClubService.ensureMember(req.user!.id, workout.Round.clubId);
    await deleteWorkout(workoutId, req.user!.id, membership.role === 'admin');
    res.json({ success: true, message: 'Workout deleted.' } as ApiResponse);
  }
}
