import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import LoginScreen from '../../screens/LoginScreen';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';

jest.mock('../../store/authStore');
jest.mock('../../services/authService');
jest.mock('../../hooks/useAuthScreenEnterAnimation', () => ({
  useAuthScreenEnterAnimation: () => ({}),
}));

const mockLogin = jest.fn();
(useAuthStore as unknown as jest.Mock).mockImplementation((selector: (s: unknown) => unknown) => {
  const state = { login: mockLogin };
  return selector ? selector(state) : state;
});

describe('LoginScreen', () => {
  const onRegister = jest.fn();
  const onSuccess = jest.fn();
  const onBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders welcome text and form', () => {
    render(
      <LoginScreen onRegister={onRegister} onSuccess={onSuccess} onBack={onBack} />
    );
    expect(screen.getByText('Welcome back')).toBeTruthy();
    expect(screen.getByText('Sign in to stay on track')).toBeTruthy();
    expect(screen.getByPlaceholderText('Email')).toBeTruthy();
    expect(screen.getByPlaceholderText('Password')).toBeTruthy();
    expect(screen.getByText('Sign in')).toBeTruthy();
  });

  it('shows validation error when submitting empty', async () => {
    render(
      <LoginScreen onRegister={onRegister} onSuccess={onSuccess} />
    );
    fireEvent.press(screen.getByText('Sign in'));
    expect(await screen.findByText(/Please enter email and password/)).toBeTruthy();
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('calls authService and onSuccess on successful login', async () => {
    (authService.login as jest.Mock).mockResolvedValue({
      success: true,
      data: {
        user: { id: '1', email: 'u@t.com', displayName: 'User' },
        token: 'token',
      },
    });
    render(
      <LoginScreen onRegister={onRegister} onSuccess={onSuccess} />
    );
    fireEvent.changeText(screen.getByPlaceholderText('Email'), 'user@test.com');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'pass123');
    fireEvent.press(screen.getByText('Sign in'));
    await screen.findByText('Sign in'); // wait for async
    expect(authService.login).toHaveBeenCalledWith('user@test.com', 'pass123');
    expect(mockLogin).toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalled();
  });

  it('renders Sign up link and calls onRegister when pressed', () => {
    render(
      <LoginScreen onRegister={onRegister} onSuccess={onSuccess} />
    );
    const registerLink = screen.getByText('Sign up');
    fireEvent.press(registerLink);
    expect(onRegister).toHaveBeenCalled();
  });
});
