# FitClub Scoring Engine Specification

**Version:** 1.0 (MVP)  
**Scope:** Deterministic, configurable, auditable scoring system  

---

## 1. Design Principles

The scoring engine must be:

| Principle | Description |
|-----------|-------------|
| **Deterministic** | Same input → same score every time. |
| **Configurable per Round** | Each round defines its own scoring logic. |
| **Anti-Gaming Resistant** | Prevent infinite point inflation. |
| **Auditable** | Every score traceable to: Workout, rule applied, cap enforcement, final awarded points. |
| **Extensible** | Must support future integrations (Strava, Apple Health, etc.). |

---

## 2. Scoring Model Overview

Each Round defines:

- **Scoring Mode**
- **Activity Types Allowed**
- **Point Rules per Activity**
- **Daily Caps**
- **Per-Workout Caps** (optional)
- **Team Aggregation Rule**

---

## 3. Scoring Modes (MVP)

Round must select one of:

| Mode | Description | Example |
|------|-------------|--------|
| **A — Distance-Based** | Points per unit distance | 1 pt/mile, max 10 pts/day |
| **B — Duration-Based** | Points per minute | 0.5 pt/min, max 60 min counted/day |
| **C — Fixed Per Activity** | Each workout = fixed points | 1 workout = 5 pts, max 2 workouts/day |
| **D — Hybrid** (Recommended Default) | Per-activity-type rules | Running: 1 pt/mile; Cycling: 0.5 pt/mile; Strength: 0.2 pt/min |

Hybrid is most flexible and powerful.

---

## 4. Activity Configuration Model

Each Round contains:

```json
RoundScoringConfig {
  "scoring_mode": "distance | duration | fixed | hybrid",
  "daily_cap_points": number,
  "per_workout_cap_points": number | null,
  "activity_rules": [
    {
      "activity_type": string,
      "metric_type": "distance | duration | fixed",
      "conversion_ratio": number,
      "minimum_threshold": number,
      "max_per_workout": number
    }
  ]
}
```

---

## 5. Detailed Rule Logic

### 5.1 Activity Rule

Each activity must define:

| Field | Description |
|-------|-------------|
| `activity_type` | Running, Cycling, Strength, Yoga, etc. |
| `metric_type` | distance / duration / fixed |
| `conversion_ratio` | Points per unit |
| `minimum_threshold` | Minimum valid workout (e.g. miles or minutes) |
| `max_per_workout` | Max points per single workout |

### Example Rule — Running

- `metric_type`: distance  
- `conversion_ratio`: 1 point per mile  
- `minimum_threshold`: 0.5 mile  
- `max_per_workout`: 10 points  

---

## 6. Score Calculation Algorithm

### Step 1 — Validate Workout

Reject if:

- Negative values  
- Below minimum threshold  
- Outside round date range  
- Duplicate detected  

### Step 2 — Calculate Raw Points

- **If `metric_type` = distance:** `raw_points = distance * conversion_ratio`  
- **If `metric_type` = duration:** `raw_points = duration * conversion_ratio`  
- **If `metric_type` = fixed:** `raw_points = conversion_ratio`  

### Step 3 — Apply Per-Workout Cap

```text
workout_points = min(raw_points, max_per_workout)
```

If no `max_per_workout` defined: `workout_points = raw_points`.

### Step 4 — Apply Daily Cap (Critical Anti-Gaming)

1. Fetch total awarded points for user for that **date** (from ScoreLedger).  
2. `remaining_daily = daily_cap - today_awarded`  
3. `final_points = min(workout_points, remaining_daily)`  
4. If `remaining_daily ≤ 0` → award **0** points.  

### Step 5 — Persist Score Ledger Entry

Each workout generates one ledger entry:

```json
ScoreLedger {
  "user_id": uuid,
  "round_id": uuid,
  "workout_id": uuid,
  "raw_points": number,
  "capped_points": number,
  "daily_adjusted_points": number,
  "final_awarded_points": number,
  "rule_snapshot_json": string,
  "timestamp": datetime
}
```

This ensures full auditability.

---

## 7. Team Scoring Logic

**MVP:** Team score = **SUM**(all member `final_awarded_points` within round).

Optional future extensions:

- Average score per member  
- Top N members count only  
- Weighted team scoring  

---

## 8. Anti-Gaming Protections

**MVP:**

- Daily point cap  
- Minimum threshold  
- Per-workout cap  
- No retroactive edits after 24 hours  
- Proof upload option  
- Admin override capability  

**Future:**

- GPS validation  
- External API validation  
- Outlier detection  

---

## 9. Tie-Breaking Rules

1. **Primary:** Total points  
2. **Secondary:** Total workouts  
3. **Tertiary:** First to reach score  

---

## 10. Recalculation Policy

| When | Behavior |
|------|----------|
| **Before round start** | Full recalculation allowed if rules change |
| **After round start** | No rule changes permitted **OR** must trigger full recalculation event |

---

## 11. Real-Time Leaderboard Strategy

**Recommended architecture:**

- Store **ScoreLedger** entries in Postgres (source of truth).  
- Maintain **Redis sorted sets** for fast ranking:

**Individual:**

```text
ZINCRBY leaderboard:user:<round_id> final_awarded_points user_id
```

**Team:**

```text
ZINCRBY leaderboard:team:<round_id> final_awarded_points team_id
```

Benefits: O(log n) ranking, instant leaderboard fetch.

---

## 12. Performance Requirements

| Metric | Target |
|--------|--------|
| Score calculation | < 50ms |
| Leaderboard update | < 100ms |
| Throughput | 100 workouts/sec |

---

## 13. Edge Cases

| Scenario | Behavior |
|----------|----------|
| User deletes workout | Reverse ledger entry (and Redis) |
| Admin edits workout | Recalculate and update ledger |
| Duplicate submission | Reject |
| Late submission | Allowed only within 24h (configurable) |
| Timezone differences | Store all in UTC; evaluate daily cap by user timezone (or round timezone) |

---

## 14. Future Extensions (Do Not Build Yet)

- Streak bonuses  
- Weekly bonuses  
- Team bonus multipliers  
- Underdog multipliers  
- Weight-based normalization  
- Handicap system  
- Cross-club playoffs  

---

## 15. Why This Engine Is Powerful

- Supports any activity  
- Supports multiple scoring styles  
- Prevents abuse  
- Configurable per round  
- Scalable  
- Audit-safe  
- Extensible  

This becomes the core defensible layer.

---

## 16. Strategic Recommendation

**Start with:**

- **Hybrid Mode**  
- **Daily Cap** required  
- **Minimum Threshold** required  
- **Per-Workout Cap** required  

This keeps competition fair.
