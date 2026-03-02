import Constants from 'expo-constants';

const EXPLICIT = (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) ||
  (Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL as string | undefined);

const LOCAL_IP = (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_LOCAL_IP) || '127.0.0.1';

export const API_BASE_URL = (EXPLICIT || '').trim().replace(/\/+$/, '') ||
  `http://${LOCAL_IP}:8080/api`;

export function getAPIBaseURL(): Promise<string> {
  return Promise.resolve(API_BASE_URL);
}
