import { API_BASE_URL } from '../config/environment';
import { getAuthToken } from '../config/api';

const base = API_BASE_URL.replace(/\/+$/, '');

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...(options.headers as Record<string, string>),
  };
  const res = await fetch(`${base}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || data?.message || `Request failed ${res.status}`);
  return data as T;
}

export const feedbackService = {
  reportBug(message: string, context?: string) {
    return request<{ success: boolean; message?: string }>('/feedback/bug', {
      method: 'POST',
      body: JSON.stringify({ message: message.trim(), ...(context ? { context: context.trim() } : {}) }),
    });
  },
  contact(subject: string, message: string) {
    return request<{ success: boolean; message?: string }>('/feedback/contact', {
      method: 'POST',
      body: JSON.stringify({ subject: subject.trim(), message: message.trim() }),
    });
  },
};
