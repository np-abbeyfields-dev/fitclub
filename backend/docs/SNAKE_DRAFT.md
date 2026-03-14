# Snake draft (team formation)

Team leaders pick members in **snake order**: Team A → B → C → … → Last, then Last → … → B → A, then repeat. Team leaders see **previous rounds’ statistics** (points, workouts) for each available member so they can make informed picks.

## Flow

1. **Create round** (draft). Create **teams** with **team leaders** (one leader per team; they are the first member with `isLeader: true`).
2. **Draft phase**: Only the team **on the clock** can pick. Order is determined by snake: pick index 0 = first team (by creation order), 1 = second, …, then reverse, then repeat.
3. **Pick**: The team lead of the team on the clock (or an admin) calls **draft-pick** with `teamId` and `userId` to add that club member to their team. The next team in snake order is then on the clock.
4. When all members are picked (or you’re done), **activate** the round to start the challenge.

## APIs

- **GET `/api/rounds/:roundId/draft-state`** (round must be `draft`)  
  Returns: whose turn (`currentTeamId`, `currentTeamName`), `pickNumber`, `teams` (with `memberIds`), `availableMembers` (with `previousRounds`: `roundName`, `points`, `workouts` for last 10 completed rounds), and `isCurrentUserTurn` (true if the current user is the team lead of the team on the clock).

- **POST `/api/rounds/:roundId/draft-pick`**  
  Body: `{ "teamId": "...", "userId": "..." }`.  
  Only succeeds if the round is in draft, `teamId` is the team currently on the clock, and the caller is that team’s **team lead** or an **admin**. Creates the team membership and advances the pick (snake) to the next team.

## Previous-round stats

`availableMembers` in draft-state includes `previousRounds`: for each of the club’s last 10 **completed** rounds, the member’s total points and workout count (from `UserStats`). Team leaders use this to decide whom to pick.

## Order of teams (snake)

Teams are ordered by **creation time** (`createdAt`). Pick index `k` maps to team index:

- Forward: 0, 1, 2, …, N−1  
- Backward: N−1, N−2, …, 0  
- Then repeat.

So for 4 teams: picks 0–3 = team 0,1,2,3; picks 4–7 = team 3,2,1,0; picks 8–11 = team 0,1,2,3; etc.
