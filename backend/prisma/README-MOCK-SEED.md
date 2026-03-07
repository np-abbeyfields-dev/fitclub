# Mock data seed

Loads test data so you can exercise the app with your user and three clubs.

## Prerequisites

- **User** `023a49a2-ee34-42a4-886f-999cfb457923` exists (admin of club 1, member of clubs 2 and 3).
- **Clubs** with IDs `1`, `2`, `3` exist. If your club IDs are UUIDs, set:
  - `CLUB_1_ID`, `CLUB_2_ID`, `CLUB_3_ID` in the environment (or in `.env`).

Base seed (reference data) must be run first:

```bash
cd backend
npm run seed
```

## Run mock seed

```bash
cd backend
npm run seed:mock
```

## What gets created

| Data | Description |
|------|-------------|
| **Users** | 6 mock users (Alice, Bob, Carol, Dave, Eve, Frank). All use password **`Test123!`**. |
| **Club memberships** | Your user: admin club 1, member clubs 2 & 3. Mock users spread across clubs. |
| **Rounds** | One active round per club (created only if none active). |
| **Teams** | Two teams per round (Alpha, Bravo). |
| **Team memberships** | Your user and mock users assigned to teams. |
| **Workouts + ScoreLedger** | ~15 days of workouts per round (only if the round has no workouts yet). |
| **UserStats / TeamStats** | Aggregates for leaderboards. |
| **ActivityFeed** | A few feed entries per club. |
| **Notifications** | Sample in-app notifications. |

Re-running the script is safe: it upserts users and memberships, reuses existing rounds/teams, and only adds workouts for rounds that currently have none.
