import { Resend } from 'resend';
import { env } from '../config/env';

let resend: Resend | null = null;
if (env.resendApiKey) {
  resend = new Resend(env.resendApiKey);
}

export type SendClubInviteParams = {
  toEmail: string;
  clubName: string;
  inviteCode: string;
  inviterDisplayName: string;
};

/**
 * Sends a club invite email. No-op if RESEND_API_KEY is not set.
 * Returns { sent: true } on success, { sent: false, error } on failure.
 */
export async function sendClubInviteEmail(params: SendClubInviteParams): Promise<{ sent: boolean; error?: string }> {
  if (!resend) {
    return { sent: false, error: 'Email is not configured (RESEND_API_KEY).' };
  }
  const { toEmail, clubName, inviteCode, inviterDisplayName } = params;
  const appUrl = env.inviteAppUrl || '';
  const appUrlDisplay = appUrl || 'the FitClub app';
  const html = `
    <p>${inviterDisplayName} invited you to join <strong>${escapeHtml(clubName)}</strong> on FitClub.</p>
    <p>Use this code to join: <strong style="letter-spacing: 2px; font-family: monospace;">${escapeHtml(inviteCode)}</strong></p>
    <p>${appUrl ? `Open <a href="${escapeHtml(appUrl)}">the app</a> and enter the code when prompted to join a club.` : `Open the FitClub app and enter the code when prompted to join a club.`}</p>
    <p>— FitClub</p>
  `;
  const text = `${inviterDisplayName} invited you to join ${clubName} on FitClub. Use this code to join: ${inviteCode}. Open ${appUrlDisplay} and enter the code to join.`;

  try {
    const { error } = await resend.emails.send({
      from: env.inviteFromEmail,
      to: [toEmail.trim().toLowerCase()],
      subject: `You're invited to join ${clubName} on FitClub`,
      html,
      text,
    });
    if (error) {
      return { sent: false, error: error.message };
    }
    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send email';
    return { sent: false, error: message };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type SendBugReportParams = {
  userEmail: string;
  userDisplayName: string;
  message: string;
  context?: string;
};

/**
 * Sends a bug report email to SUPPORT_EMAIL. No-op if RESEND_API_KEY or SUPPORT_EMAIL not set.
 */
export async function sendBugReportEmail(params: SendBugReportParams): Promise<{ sent: boolean; error?: string }> {
  if (!resend) {
    return { sent: false, error: 'Email is not configured (RESEND_API_KEY).' };
  }
  if (!env.supportEmail) {
    return { sent: false, error: 'Support email is not configured (SUPPORT_EMAIL).' };
  }
  const { userEmail, userDisplayName, message, context } = params;
  const subject = `[FitClub Bug] ${(context || 'App').slice(0, 50)}`;
  const html = `
    <p><strong>Bug report</strong></p>
    <p>From: ${escapeHtml(userDisplayName || '—')} &lt;${escapeHtml(userEmail)}&gt;</p>
    ${context ? `<p>Context: ${escapeHtml(context)}</p>` : ''}
    <p>Message:</p>
    <pre style="white-space: pre-wrap; background: #f1f5f9; padding: 12px; border-radius: 8px;">${escapeHtml(message)}</pre>
    <p>— FitClub</p>
  `;
  const text = `Bug report\nFrom: ${userDisplayName || '—'} <${userEmail}>\n${context ? `Context: ${context}\n` : ''}\nMessage:\n${message}`;
  try {
    const { error } = await resend.emails.send({
      from: env.inviteFromEmail,
      to: [env.supportEmail],
      replyTo: userEmail,
      subject,
      html,
      text,
    });
    if (error) return { sent: false, error: error.message };
    return { sent: true };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : 'Failed to send email' };
  }
}

export type SendContactMessageParams = {
  userEmail: string;
  userDisplayName: string;
  subject: string;
  message: string;
};

/**
 * Sends a contact form email to SUPPORT_EMAIL. No-op if RESEND_API_KEY or SUPPORT_EMAIL not set.
 */
export async function sendContactMessageEmail(params: SendContactMessageParams): Promise<{ sent: boolean; error?: string }> {
  if (!resend) {
    return { sent: false, error: 'Email is not configured (RESEND_API_KEY).' };
  }
  if (!env.supportEmail) {
    return { sent: false, error: 'Support email is not configured (SUPPORT_EMAIL).' };
  }
  const { userEmail, userDisplayName, subject, message } = params;
  const subj = subject.trim() || 'Contact from FitClub';
  const html = `
    <p><strong>Contact form</strong></p>
    <p>From: ${escapeHtml(userDisplayName || '—')} &lt;${escapeHtml(userEmail)}&gt;</p>
    <p>Subject: ${escapeHtml(subj)}</p>
    <p>Message:</p>
    <pre style="white-space: pre-wrap; background: #f1f5f9; padding: 12px; border-radius: 8px;">${escapeHtml(message)}</pre>
    <p>— FitClub</p>
  `;
  const text = `Contact\nFrom: ${userDisplayName || '—'} <${userEmail}>\nSubject: ${subj}\n\n${message}`;
  try {
    const { error } = await resend.emails.send({
      from: env.inviteFromEmail,
      to: [env.supportEmail],
      replyTo: userEmail,
      subject: `[FitClub Contact] ${subj.slice(0, 80)}`,
      html,
      text,
    });
    if (error) return { sent: false, error: error.message };
    return { sent: true };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : 'Failed to send email' };
  }
}
