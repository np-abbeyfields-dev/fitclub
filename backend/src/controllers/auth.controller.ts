import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { RegisterDto, LoginDto, ApiResponse } from '../types';

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    const data: RegisterDto = req.body;
    if (!data.email || !data.password || !data.displayName) {
      res.status(400).json({ success: false, error: 'Email, password, and display name are required.' } as ApiResponse);
      return;
    }
    const result = await AuthService.register(data);
    res.status(201).json({ success: true, data: result, message: 'Registered successfully.' } as ApiResponse);
  }

  static async login(req: Request, res: Response): Promise<void> {
    const data: LoginDto = req.body;
    if (!data.email || !data.password) {
      res.status(400).json({ success: false, error: 'Email and password are required.' } as ApiResponse);
      return;
    }
    const result = await AuthService.login(data);
    res.json({ success: true, data: result, message: 'Login successful.' } as ApiResponse);
  }
}
