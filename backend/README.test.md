# FitClub Backend Tests

## Setup

1. **Database**: Tests use the same Prisma schema and require a database.
   - **Option A**: Use a dedicated test database. Set `TEST_DATABASE_URL` in `.env.test` (or env).
   - **Option B**: Use your dev database. Set `DATABASE_URL`; tests create unique data (emails, club names) to avoid collisions.

2. **Seed reference data** (required for workout tests):
   ```bash
   npm run seed
   ```
   This populates `GenericWorkoutMet` and `WorkoutMaster` so activity types like "Run" and "Gym Workout" exist.

3. **Install dependencies** (includes Jest and supertest):
   ```bash
   npm install
   ```

## Running tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## Test structure

| File | Description |
|------|-------------|
| `test/health.test.ts` | Health endpoints (`/api/health`, `/health`) |
| `test/auth.test.ts` | Register, login, validation, duplicate email |
| `test/auth.service.test.ts` | AuthService unit tests (mocked DB) |
| `test/clubs.test.ts` | Create club, list, get by id, join, dashboard, members |
| `test/rounds.test.ts` | Create round, list, activate, get, leaderboard |
| `test/teams.test.ts` | Create team, list teams, my-team |
| `test/workouts.test.ts` | List activities, log workout (duration/distance), list my workouts |
| `test/errors.test.ts` | Error classes (status codes) |
| `test/helpers.ts` | Shared helpers: registerUser, createClub, createRound, authHeader, etc. |

## Environment

- `NODE_ENV=test` is set automatically by Jest.
- In test, `config/env.ts` uses `TEST_DATABASE_URL` if set, otherwise `DATABASE_URL`.
- Rate limiting is skipped when `NODE_ENV === 'test'`.

## Adding tests

- **Integration**: Use `request(app)` from supertest and `helpers.ts` to create users/clubs/rounds. Keep tests independent (unique emails/names).
- **Unit**: Mock `../src/config/database` with `jest.mock()` and test service logic in isolation.
