/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { useAuthStore } from '../../store/authStore';
import { User } from '../../types';
import * as SecureStore from 'expo-secure-store';

jest.mock('expo-secure-store');

const mockUser: User = {
  id: 'user-1',
  email: 'test@example.com',
  displayName: 'Test User',
};

describe('authStore', () => {
  beforeEach(async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
    (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);
    await act(async () => {
      await useAuthStore.getState().logout();
    });
  });

  it('has initial unauthenticated state', () => {
    const { result } = renderHook(() => useAuthStore());
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBe(null);
    expect(result.current.token).toBe(null);
  });

  it('login sets user and token and persists to SecureStore', async () => {
    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.login(mockUser, 'auth-token-123');
    });
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.token).toBe('auth-token-123');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'fitclub_auth_token',
      'auth-token-123'
    );
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'fitclub_auth_user',
      JSON.stringify(mockUser)
    );
  });

  it('logout clears state and SecureStore', async () => {
    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.login(mockUser, 'token');
    });
    await act(async () => {
      await result.current.logout();
    });
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBe(null);
    expect(result.current.token).toBe(null);
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('fitclub_auth_token');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('fitclub_auth_user');
  });

  it('initializeAuth restores session from SecureStore', async () => {
    (SecureStore.getItemAsync as jest.Mock)
      .mockResolvedValueOnce('stored-token')
      .mockResolvedValueOnce(JSON.stringify(mockUser));
    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.initializeAuth();
    });
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.token).toBe('stored-token');
    expect(result.current.isLoading).toBe(false);
  });

  it('initializeAuth sets unauthenticated when no stored data', async () => {
    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.initializeAuth();
    });
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBe(null);
    expect(result.current.isLoading).toBe(false);
  });
});
