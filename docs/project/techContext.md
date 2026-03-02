# Technical Context

## Technology Stack (from PRD)

### Backend

| Concern | Choice | Notes |
|--------|--------|------|
| Runtime | FastAPI or Node.js | API-first; async-friendly |
| Database | PostgreSQL | Multi-tenant; relational model |
| Cache | Redis | Leaderboards; sub-300ms queries; &lt; 5s update target |
| File storage | S3-compatible | Workout proof images |
| Background jobs | Celery or BullMQ | Scoring, recalc, notifications |

### Frontend

| Platform | Stack | Notes |
|----------|--------|------|
| Web | React | Admin + full participant experience |
| Mobile | React Native | iOS + Android; shared backend API |

### Infrastructure

- Containerized (Docker).
- Deployable to AWS / GCP / Azure.
- CI/CD enabled.
- Stateless API servers; horizontal scaling.

## Development Setup

- *(To be added: repo layout, env vars, how to run backend, frontend, mobile, Redis, Postgres, S3/local storage.)*

## Technical Constraints

- **Multi-tenancy** — All data scoped by club; strict isolation in queries and APIs.
- **Performance** — Leaderboard queries &lt; 300ms; updates reflected within 5 seconds; target 10,000 concurrent users.
- **Security** — JWT auth; secure password hashing; RBAC; rate limiting; audit logging; secure uploads.

## Key Dependencies (to be pinned)

- Backend: FastAPI or Express (Node); ORM (e.g. SQLAlchemy / Prisma); Redis client; job queue; S3 SDK.
- Frontend Web: React; state management; API client; auth handling.
- Mobile: React Native; navigation; API client; push (Phase 2).

---

*Architecture and data model: [systemPatterns.md](./systemPatterns.md). Full PRD: [FITCLUB_PRD.md](./FITCLUB_PRD.md).*
