# FitClub Design System

Centralized tokens live in `/theme`. Use `useTheme()` in components to access the active theme (light/dark).

## Theme Files

| File | Purpose |
|------|---------|
| `colors.ts` | Semantic color palettes (light/dark) |
| `typography.ts` | Type scale: hero, title, section, body, caption, metric |
| `spacing.ts` | xs, sm, md, lg, xl |
| `radius.ts` | sm, md, lg |
| `elevation.ts` | Card and shadow presets |

## Semantic Color Tokens

- **primary** — Brand actions, CTAs, active nav
- **energy** — Points, workout metrics, charts (active)
- **success** — Streaks, progress, active indicators
- **competition** — Leaderboard, podium emphasis
- **background** — Page background
- **card** — Card/surface background
- **textPrimary** — Primary text
- **textSecondary** — Secondary/muted text

## Rules

1. **No hardcoded colors** — Use `theme.colors.*` only.
2. **Metric numbers** — Use `typography.metric` for large numeric values (points, counts, streaks).
3. **Points & workout metrics** — Use `colors.energy`.
4. **Streak indicators** — Use `colors.success`.
5. **Leaderboard podium** — Use `colors.competition` (and gold/silver/bronze for top 3).
6. **Cards** — Use `theme.shadows.card` (elevation.card) and `radius.md`.
7. **Spacing** — Use `theme.spacing` tokens only (no magic numbers).

## Usage

```tsx
const theme = useTheme();
const { colors, typography, spacing, radius, shadows } = theme;
```
