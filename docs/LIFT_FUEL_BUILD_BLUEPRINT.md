# Lift & Fuel Build Blueprint

## 0) Straight talk


What we are building:
- A demo MVP that gets users from profile input to daily execution with minimal friction.
- One tight loop: generate plan -> do the day -> log it -> review it.

What we are not building right now:
- Payments
- Subscription gates
- Fancy adaptive recommendation system
- Social features

If it does not improve the daily loop, it can wait.

## 1) Stack call

- Frontend: Next.js App Router
- Backend: Python API on Vercel (`/api` functions)
- DB: Postgres (Vercel Postgres or Neon)
- Hosting: Vercel
- Auth (MVP): lightweight session or demo user id, no heavyweight auth wall needed for first pass

## 2) High-level architecture

```mermaid
flowchart LR
  U["User Client (mobile web + desktop web)"] --> EDGE["Vercel Edge/CDN"]
  EDGE --> FE["Next.js UI"]

  FE --> BE["Python API (/api)"]
  BE --> RULES["Rules Engine (goal + restrictions + equipment)"]
  BE --> DAL["Repository Layer"]

  DAL --> DB["Postgres"]
  BE --> EVT["Event Sink (product telemetry)"]
  EVT --> DB

  CRON["Vercel Cron (optional)"] --> BE
```

## 3) Product loop (the thing we actually optimize)

```mermaid
flowchart TD
  P["Profile Intake"] --> G["Plan Generate"]
  G --> D["Daily Diary"]
  D --> W["Workout + Meal Logging"]
  W --> H["History + Day Review"]
  H --> R["Regenerate / Refine"]
  R --> G
```

## 4) App map and navigation

```mermaid
flowchart TD
  ROOT["Lift & Fuel"] --> WELCOME["Welcome"]
  WELCOME --> ONBOARD["Onboarding"]
  ONBOARD --> PROFILE["Profile Inputs"]
  ONBOARD --> GOALS["Goals + Filters"]
  GOALS --> PLAN["Plan Result"]

  PLAN --> DIARY["Diary Tab"]
  PLAN --> MEALS["Meal Plan Tab"]
  PLAN --> WORKOUT["Workout Tab"]
  PLAN --> HISTORY["History Tab"]
  PLAN --> PROFILE_TAB["Profile Tab"]

  DIARY --> LOG_MEAL["Log Meal"]
  DIARY --> START_WORKOUT["Start Workout"]

  MEALS --> EDIT_MEAL["Edit Meal"]
  MEALS --> SWAP_MEAL["Swap Meal"]
  MEALS --> REGEN_MEALS["Regenerate Meals"]

  WORKOUT --> ACTIVE["Active Workout"]
  ACTIVE --> SUMMARY["Workout Summary"]

  HISTORY --> CAL["History Calendar"]
  CAL --> DAY["Day Details"]
```

## 5) Backend module cut lines

```mermaid
flowchart LR
  ROUTER["API Router"] --> PROFILE_M["M1 Profile"]
  ROUTER --> PLAN_M["M2 Plan Generation"]
  ROUTER --> DIARY_M["M3 Diary Read Model"]
  ROUTER --> MEAL_M["M4 Meal Editing + Swap"]
  ROUTER --> WORKOUT_M["M5 Workout Execution"]
  ROUTER --> HISTORY_M["M6 History + Day Detail"]
  ROUTER --> METRICS_M["M7 Metrics"]

  PROFILE_M --> SHARED["Shared Domain + Validation"]
  PLAN_M --> SHARED
  DIARY_M --> SHARED
  MEAL_M --> SHARED
  WORKOUT_M --> SHARED
  HISTORY_M --> SHARED
  METRICS_M --> SHARED

  SHARED --> DB["Postgres"]
```

## 6) Data model (MVP)

```mermaid
erDiagram
  USER_PROFILE {
    uuid user_id PK
    int age
    float height_cm
    float weight_kg
    string activity_level
    string goal_mode
    string restrictions_json
    string equipment_json
    string units
  }

  NUTRITION_TARGET {
    uuid target_id PK
    uuid user_id FK
    int calories
    int protein_g
    int carbs_g
    int fat_g
    date start_date
    date end_date
    string version
  }

  MEAL_PLAN {
    uuid meal_plan_id PK
    uuid user_id FK
    date plan_date
    string status
    datetime generated_at
  }

  MEAL_ITEM {
    uuid meal_item_id PK
    uuid meal_plan_id FK
    string meal_type
    string name
    int calories
    int protein_g
    int carbs_g
    int fat_g
    bool was_swapped
  }

  MEAL_LOG_ENTRY {
    uuid meal_log_id PK
    uuid user_id FK
    date log_date
    string meal_type
    int calories
    int protein_g
    int carbs_g
    int fat_g
    datetime logged_at
  }

  WORKOUT_PROGRAM {
    uuid workout_program_id PK
    uuid user_id FK
    string split_name
    string goal_mode
    string equipment_profile
    string version
  }

  WORKOUT_EXERCISE_TEMPLATE {
    uuid template_id PK
    uuid workout_program_id FK
    string day_label
    string exercise_name
    int prescribed_sets
    string prescribed_reps
  }

  WORKOUT_SESSION {
    uuid session_id PK
    uuid user_id FK
    date session_date
    string status
    int duration_seconds
    datetime started_at
    datetime completed_at
  }

  SET_LOG {
    uuid set_log_id PK
    uuid session_id FK
    string exercise_name
    int set_index
    int reps
    float weight
    datetime logged_at
  }

  DAILY_SUMMARY {
    uuid daily_summary_id PK
    uuid user_id FK
    date summary_date
    int calories_total
    int protein_total
    int carbs_total
    int fat_total
    bool workout_completed
    int meals_logged
  }

  HISTORY_MARKER {
    uuid history_marker_id PK
    uuid user_id FK
    date marker_date
    bool has_nutrition_data
    bool has_workout_data
  }

  USER_PROFILE ||--o{ NUTRITION_TARGET : has
  USER_PROFILE ||--o{ MEAL_PLAN : has
  MEAL_PLAN ||--|{ MEAL_ITEM : contains
  USER_PROFILE ||--o{ MEAL_LOG_ENTRY : logs
  USER_PROFILE ||--o{ WORKOUT_PROGRAM : has
  WORKOUT_PROGRAM ||--|{ WORKOUT_EXERCISE_TEMPLATE : includes
  USER_PROFILE ||--o{ WORKOUT_SESSION : starts
  WORKOUT_SESSION ||--|{ SET_LOG : records
  USER_PROFILE ||--o{ DAILY_SUMMARY : rolls_up
  USER_PROFILE ||--o{ HISTORY_MARKER : flags
```

## 7) API surface (MVP)

| Domain | Method | Route | Notes |
|---|---|---|---|
| Profile | `POST` | `/api/profile` | Create first profile |
| Profile | `PATCH` | `/api/profile/{user_id}` | Update profile/preferences |
| Plan | `POST` | `/api/plan/generate` | Generate targets + meals + workout |
| Plan | `POST` | `/api/plan/regenerate` | Regenerate meals or workout |
| Diary | `GET` | `/api/diary/today?user_id=...` | Read-model for home screen |
| Meals | `POST` | `/api/meals/log` | Manual meal/snack logging |
| Meals | `PATCH` | `/api/meals/{meal_item_id}` | Edit one meal |
| Meals | `POST` | `/api/meals/swap` | Swap meal and recalc totals |
| Workout | `GET` | `/api/workout/today?user_id=...` | Today session template |
| Workout | `POST` | `/api/workout/session/start` | Create active session |
| Workout | `POST` | `/api/workout/session/{session_id}/set` | Append set result |
| Workout | `POST` | `/api/workout/session/{session_id}/complete` | Close session + summary |
| History | `GET` | `/api/history/calendar?user_id=...&month=YYYY-MM` | Monthly markers |
| History | `GET` | `/api/history/day?user_id=...&date=YYYY-MM-DD` | Nutrition + workout details |
| Metrics | `POST` | `/api/metrics/event` | Product analytics events |

## 8) Critical flows

### 8.1 Onboarding -> plan generation

```mermaid
sequenceDiagram
  participant U as User
  participant FE as Next.js
  participant BE as Python API
  participant RE as Rules Engine
  participant DB as Postgres

  U->>FE: Submit profile + goal + restrictions + equipment
  FE->>BE: POST /api/profile
  BE->>DB: Upsert USER_PROFILE
  BE-->>FE: Profile ok

  FE->>BE: POST /api/plan/generate
  BE->>RE: Build nutrition and workout plan
  RE-->>BE: Computed plan payload
  BE->>DB: Persist targets, meal plan, workout program
  BE->>DB: Seed DAILY_SUMMARY
  BE-->>FE: Plan result
```

### 8.2 Diary + meal swap + workout complete

```mermaid
sequenceDiagram
  participant U as User
  participant FE as Next.js
  participant BE as Python API
  participant DB as Postgres

  U->>FE: Open Diary
  FE->>BE: GET /api/diary/today
  BE->>DB: Aggregate targets + logs + workout status
  DB-->>BE: Current day state
  BE-->>FE: Diary payload

  U->>FE: Swap meal
  FE->>BE: POST /api/meals/swap
  BE->>DB: Replace meal item + recompute totals
  BE->>DB: Update DAILY_SUMMARY
  BE-->>FE: Updated totals

  U->>FE: Complete workout
  FE->>BE: POST /api/workout/session/{id}/complete
  BE->>DB: Mark session complete + write markers
  BE-->>FE: Workout summary
```

## 9) Module shipping plan (do this in order)

### M0 Foundation

- Set up Next.js shell and tab layout.
- Stand up Python `/api` router with `/api/health`.
- Wire Postgres connection and migrations.
- Add request/response schemas so payloads are stable.

Done when:
- We can deploy on Vercel and hit `/api/health` from UI.

### M1 Onboarding + Profile

- Build profile/goal/filter flow.
- Block plan generation until required fields are filled.
- Save profile via `POST /api/profile`.

Done when:
- New user can complete onboarding without dead ends.

### M2 Plan Generation

- Implement deterministic rules for goal modes (`lose`, `maintain`, `build`, `consistency`).
- Return calories/macros plus baseline 3-meal plan and workout split.
- Persist generated artifacts with version tags.

Done when:
- One request returns a full starting plan the user can execute today.

### M3 Diary Home (hot path)

- Build merged daily dashboard (calorie/macros + meal status + workout status).
- Implement manual meal logging.
- Keep response fast; this is the highest-frequency read path.

Done when:
- Diary reflects updates immediately after log events.

### M4 Meal Editing + Swap

- Edit meal values and swap meals without breaking day totals.
- Recompute per-meal and per-day totals server-side.
- Track swap metadata for history/debug.

Done when:
- Users can customize meals and still trust the macro math.

### M5 Workout Execution

- Start active session, log sets, complete session.
- Persist actuals, not just completion booleans.
- Generate clean workout summary output.

Done when:
- In-session logging feels fast and does not drop set data.

### M6 History + Day Detail

- Build monthly calendar markers from real logged data.
- Build day details page for nutrition totals and workout recap.

Done when:
- Any logged day is visible and drill-down works.

### M7 Metrics + Hardening

- Capture product events for funnel and retention checks.
- Add idempotency checks for duplicate submissions.
- Add basic retries and error surfaces for flaky mobile networks.

Done when:
- We can report the key whitepaper metrics with real data.

## 10) Module dependencies

```mermaid
flowchart LR
  M0["M0 Foundation"] --> M1["M1 Onboarding"]
  M1 --> M2["M2 Plan Generation"]
  M2 --> M3["M3 Diary"]
  M2 --> M4["M4 Meal Customization"]
  M2 --> M5["M5 Workout Execution"]
  M3 --> M6["M6 History"]
  M4 --> M6
  M5 --> M6
  M6 --> M7["M7 Metrics + Hardening"]
```

## 11) Repo skeleton

```text
LiftFuelApp/
  app/
    (tabs)/
      diary/page.tsx
      meal-plan/page.tsx
      workout/page.tsx
      history/page.tsx
      profile/page.tsx
    onboarding/page.tsx
    plan-result/page.tsx
  api/
    index.py
    routers/
      profile.py
      plan.py
      diary.py
      meals.py
      workout.py
      history.py
      metrics.py
    services/
      rules_engine.py
      meal_service.py
      workout_service.py
      history_service.py
    db/
      models.py
      repositories.py
      migrations/
  components/
  lib/
    api-client.ts
    types.ts
  docs/
    LIFT_FUEL_BUILD_BLUEPRINT.md
```

## 12) Acceptance checklist

- Required profile fields gate plan generation.
- Generated plan always shows calories + protein + carbs + fat.
- Meal edit/swap always updates day totals in real time.
- Workout flow stores per-set actual performance.
- Diary unifies nutrition and workout state on one screen.
- History marks logged days and opens day details.
- Metrics cover onboarding, plan completion, diary opens, workout completes, and full-day logs.
