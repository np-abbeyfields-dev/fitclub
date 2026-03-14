import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types';
import { sendBugReportEmail, sendContactMessageEmail } from '../services/email.service';

export class FeedbackController {
  /** POST /feedback/bug — body: { message, context? } */
  static async reportBug(req: AuthRequest, res: Response): Promise<void> {
    const user = req.user!;
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    const context = typeof req.body?.context === 'string' ? req.body.context.trim() : undefined;
    if (!message) {
      res.status(400).json({ success: false, error: 'Message is required.' } as ApiResponse);
      return;
    }
    const result = await sendBugReportEmail({
      userEmail: user.email,
      userDisplayName: user.displayName || '—',
      message,
      context,
    });
    if (result.sent) {
      res.status(200).json({ success: true, message: 'Bug report sent.' } as ApiResponse);
    } else {
      res.status(502).json({ success: false, error: result.error || 'Failed to send bug report.' } as ApiResponse);
    }
  }

  /** POST /feedback/contact — body: { subject?, message } */
  static async contact(req: AuthRequest, res: Response): Promise<void> {
    const user = req.user!;
    const subject = typeof req.body?.subject === 'string' ? req.body.subject.trim() : '';
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    if (!message) {
      res.status(400).json({ success: false, error: 'Message is required.' } as ApiResponse);
      return;
    }
    const result = await sendContactMessageEmail({
      userEmail: user.email,
      userDisplayName: user.displayName || '—',
      subject: subject || 'Contact from FitClub',
      message,
    });
    if (result.sent) {
      res.status(200).json({ success: true, message: 'Message sent.' } as ApiResponse);
    } else {
      res.status(502).json({ success: false, error: result.error || 'Failed to send message.' } as ApiResponse);
    }
  }
}
