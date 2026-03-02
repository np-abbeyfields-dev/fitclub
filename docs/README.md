# FitClub Documentation

All project documentation lives in this single `docs/` directory.

## Quick links

| I need to… | Go to |
|------------|--------|
| **Product spec (PRD)** | [project/FITCLUB_PRD.md](./project/FITCLUB_PRD.md) |
| **Scoring engine spec** | [project/FITCLUB_SCORING_ENGINE_SPEC.md](./project/FITCLUB_SCORING_ENGINE_SPEC.md) |
| **Understand the product** | [project/projectbrief.md](./project/projectbrief.md) |
| **Why we're building this** | [project/productContext.md](./project/productContext.md) |
| **Current focus & next steps** | [project/activeContext.md](./project/activeContext.md) |
| **What's done / what's left** | [project/progress.md](./project/progress.md) |
| **Architecture & patterns** | [project/systemPatterns.md](./project/systemPatterns.md) |
| **Tech stack & setup** | [project/techContext.md](./project/techContext.md) |
| **GCP project (Cloud Run + Cloud SQL)** | [project/GCP_REFERENCE.md](./project/GCP_REFERENCE.md) |
| **Set up locally** | [setup/BACKEND_SETUP.md](./setup/BACKEND_SETUP.md), [setup/FRONTEND_SETUP.md](./setup/FRONTEND_SETUP.md) |
| **Local dev with Cloud SQL** | [deployment/LOCAL_CLOUD_SQL_SETUP.md](./deployment/LOCAL_CLOUD_SQL_SETUP.md) |
| **Cloud SQL (create instance / user)** | [deployment/CLOUD_SQL_FITCLUB.md](./deployment/CLOUD_SQL_FITCLUB.md) |
| **Create all GCP services (low cost)** | [deployment/GCP_CREATE_SERVICES.md](./deployment/GCP_CREATE_SERVICES.md) |
| **Deploy** | [deployment/](./deployment/) |
| **Feature specs** | [features/](./features/) |
| **Testing** | [testing/](./testing/) |

## Directory structure

```
docs/
├── README.md              ← You are here
├── project/               # Product context, architecture, progress
│   ├── FITCLUB_PRD.md     # Product requirements (source of truth)
│   ├── FITCLUB_SCORING_ENGINE_SPEC.md  # Scoring rules, algorithm, ledger, Redis
│   ├── projectbrief.md
│   ├── productContext.md
│   ├── activeContext.md
│   ├── systemPatterns.md
│   ├── techContext.md
│   └── progress.md
├── setup/                 # Local setup, env, tooling
├── deployment/            # Build, deploy, release
├── features/              # Feature specs and requirements
├── guides/                # How-to guides
├── testing/               # Testing setup and coverage
└── archive/               # Superseded or one-off docs
```

## Notes

- **Single source of truth** — All markdown lives under `docs/`. Structure follows TeenLifeManager (Sortova) as reference.
- **Archive** — Superseded or one-off docs go in `docs/archive/`.

### Reference: TeenLifeManager (read-only)

**Do not change any file in the TeenLifeManager folder from this workspace.** TeenLifeManager is kept here for reference only. Use it to read and copy patterns, structure, and docs—never edit, move, or delete files in that project.
