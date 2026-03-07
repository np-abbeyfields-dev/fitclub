import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
} from '../src/utils/errors';

describe('Errors', () => {
  it('AppError has message and statusCode', () => {
    const err = new AppError('Something failed', 500);
    expect(err.message).toBe('Something failed');
    expect(err.statusCode).toBe(500);
    expect(err.name).toBe('AppError');
  });

  it('ValidationError defaults to 400', () => {
    const err = new ValidationError('Invalid input');
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe('Invalid input');
  });

  it('AuthenticationError defaults to 401', () => {
    const err = new AuthenticationError();
    expect(err.statusCode).toBe(401);
  });

  it('AuthorizationError defaults to 403', () => {
    const err = new AuthorizationError('Forbidden');
    expect(err.statusCode).toBe(403);
  });

  it('NotFoundError defaults to 404', () => {
    const err = new NotFoundError('Not found');
    expect(err.statusCode).toBe(404);
  });

  it('ConflictError defaults to 409', () => {
    const err = new ConflictError('Already exists');
    expect(err.statusCode).toBe(409);
  });
});
