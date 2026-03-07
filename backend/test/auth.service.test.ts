/**
 * Unit tests for AuthService (with mocked Prisma).
 * For full integration tests see auth.test.ts.
 */
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuthService } from '../src/services/auth.service';

// Mock prisma
jest.mock('../src/config/database', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

const prisma = require('../src/config/database').default;

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateToken', () => {
    it('returns a JWT string with userId and email', () => {
      const token = AuthService.generateToken('user-1', 'test@example.com');
      expect(typeof token).toBe('string');
      const decoded = jwt.decode(token) as { userId?: string; email?: string };
      expect(decoded?.userId).toBe('user-1');
      expect(decoded?.email).toBe('test@example.com');
    });
  });

  describe('register', () => {
    it('creates user and returns auth response when email is free', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'new-id',
        email: 'new@example.com',
        displayName: 'New User',
      });
      const hashSpy = jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed' as never);

      const result = await AuthService.register({
        email: 'new@example.com',
        password: 'Pass123!',
        displayName: 'New User',
      });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'new@example.com' },
      });
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'new@example.com',
          passwordHash: 'hashed',
          displayName: 'New User',
        },
        select: { id: true, email: true, displayName: true },
      });
      expect(result.user).toMatchObject({ email: 'new@example.com', displayName: 'New User' });
      expect(result).toHaveProperty('token');
      hashSpy.mockRestore();
    });

    it('throws when email already registered', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        AuthService.register({
          email: 'existing@example.com',
          password: 'Pass123!',
          displayName: 'User',
        })
      ).rejects.toThrow(/already registered/i);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('returns user and token when password matches', async () => {
      const hashed = await bcrypt.hash('Pass123!', 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'login@example.com',
        displayName: 'Login User',
        passwordHash: hashed,
      });

      const result = await AuthService.login({
        email: 'login@example.com',
        password: 'Pass123!',
      });

      expect(result.user).toMatchObject({ email: 'login@example.com' });
      expect(result).toHaveProperty('token');
    });

    it('throws when password is wrong', async () => {
      const hashed = await bcrypt.hash('RightPass1!', 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'u@example.com',
        passwordHash: hashed,
      });

      await expect(
        AuthService.login({ email: 'u@example.com', password: 'WrongPass1!' })
      ).rejects.toThrow(/Invalid email or password/i);
    });

    it('throws when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        AuthService.login({ email: 'nobody@example.com', password: 'Pass123!' })
      ).rejects.toThrow(/Invalid email or password/i);
    });
  });
});
