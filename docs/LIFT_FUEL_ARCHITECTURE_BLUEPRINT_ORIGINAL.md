# Lift & Fuel Architecture Blueprint

This document converts the whitepaper into a concrete build blueprint for a demo MVP.

## 1. Scope and constraints

- Source of truth: `lift_fuel_product_whitepaper_2.pdf`.
- Screenshots are treated as UI intent only and may have inaccuracies.
- Frontend: Next.js (App Router).
- Backend: Python API on Vercel serverless functions.
- Hosting: Vercel.
- No payments or billing in MVP.
- Product objective: one closed daily loop (plan, execute, log, review).

## 2. Deployment architecture (Vercel + Next.js + Python)

```mermaid
flowchart LR
  U["User (iOS web app / desktop web app)"] --> E["Vercel Edge + CDN"]
  E --> FE["Next.js App Router UI"]

  FE --> API["Python API (FastAPI or function handlers in /api)"]
  API --> RULES["Plan Rules Engine (goal + restriction + equipment logic)"]
  API --> REPO["Data Access Layer"]

  REPO --> DB["Postgres (Vercel Postgres / Neon)"]
  API --> EVT["Event Logger (product metrics)"]
  EVT --> DB

  CRON["Vercel Cron (optional: reminders / weekly check-ins)"] --> API

  FE -. "No payment subsystem in MVP" .- FE
```

## 3. Product closed loop (from whitepaper)

```mermaid
flowchart TD
  A["Profile Intake\nage, height, weight, activity, goal, restrictions, equipment"] --> B["Plan Generation\ncalories, macros, meals, workout split"]
  B --> C["Daily Execution\ndiary view, meal logging, active workout"]
  C --> D["History and Review\ncalendar, day details, workout summary"]
  D --> E["Plan Refinement\nregenerate from recent adherence"]
  E --> B
```

## 4. Page map and navigation architecture

```mermaid
flowchart TD
  ROOT["Lift & Fuel App"] --> WELCOME["Welcome / Intro"]
  WELCOME --> ONBOARD["Onboarding"]
  ONBOARD --> PROFILE["Profile Inputs"]
  ONBOARD --> GOAL["Goal and Filters"]
  GOAL --> PLAN_RESULT["Plan Result"]

  PLAN_RESULT --> DIARY_TAB["Diary Tab"]
  PLAN_RESULT --> MEAL_TAB["Meal Plan Tab"]
  PLAN_RESULT --> WORKOUT_TAB["Workout Tab"]
  PLAN_RESULT --> HISTORY_TAB["History Tab"]
  PLAN_RESULT --> PROFILE_TAB["Profile Tab"]

  DIARY_TAB --> MEAL_LOG["Meal Log"]
  DIARY_TAB --> ACTIVE_WORKOUT["Start Active Workout"]

  MEAL_TAB --> EDIT_MEAL["Edit Meal"]
  MEAL_TAB --> SWAP_MEAL["Swap Meal"]
  MEAL_TAB --> REGEN_MEAL["Regenerate Meal Plan"]

  WORKOUT_TAB --> WORKOUT_PLAN["Workout Plan"]
  WORKOUT_TAB --> ACTIVE_WORKOUT
  ACTIVE_WORKOUT --> WORKOUT_SUMMARY["Workout Summary"]

  HISTORY_TAB --> HISTORY_CAL["History Calendar"]
  HISTORY_CAL --> DAY_DETAILS["Day Details"]

  PROFILE_TAB --> CHECKIN["Check-in and Progress (post-MVP)"]
```

## 5. Backend module architecture

```mermaid
flowchart LR
  CLIENT["Next.js API Client"] --> ROUTER["Python API Router"]

  ROUTER --> M1["Module 1: Profile and Preferences"]
  ROUTER --> M2["Module 2: Plan Generation"]
  ROUTER --> M3["Module 3: Diary Read Model"]
  ROUTER --> M4["Module 4: Meal Customization"]
  ROUTER --> M5["Module 5: Workout Execution"]
  ROUTER --> M6["Module 6: History and Day Details"]
  ROUTER --> M7["Module 7: Metrics and Reporting"]

  M1 --> SHARED["Shared Domain Models and Validation"]
  M2 --> SHARED
  M3 --> SHARED
  M4 --> SHARED
  M5 --> SHARED
  M6 --> SHARED
  M7 --> SHARED

  SHARED --> DB["Postgres"]
```

## 6. Product data model (ER)

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
    string unit_system
    datetime created_at
    datetime updated_at
  }

  NUTRITION_TARGET {
    uuid nutrition_target_id PK
    uuid user_id FK
    date start_date
    date end_date
    int calories
    int protein_g
    int carbs_g
    int fat_g
    string version
    datetime created_at
  }

  MEAL_PLAN {
    uuid meal_plan_id PK
    uuid user_id FK
    date plan_date
    string status
    string source_target_version
    datetime generated_at
  }

  MEAL_ITEM {
    uuid meal_item_id PK
    uuid meal_plan_id FK
    string meal_type
    string display_name
    int calories
    int protein_g
    int carbs_g
    int fat_g
    bool was_swapped
  }

  MEAL_LOG_ENTRY {
    uuid meal_log_entry_id PK
    uuid user_id FK
    date log_date
    string meal_type
    string source
    string notes
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
    datetime generated_at
  }

  WORKOUT_EXERCISE_TEMPLATE {
    uuid workout_exercise_template_id PK
    uuid workout_program_id FK
    string day_label
    string exercise_name
    int prescribed_sets
    string prescribed_reps
  }

  WORKOUT_SESSION {
    uuid workout_session_id PK
    uuid user_id FK
    date session_date
    string status
    int duration_seconds
    datetime started_at
    datetime completed_at
  }

  SET_LOG {
    uuid set_log_id PK
    uuid workout_session_id FK
    string exercise_name
    int set_index
    int reps
    float weight
    float rpe
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
    int adherence_score
  }

  HISTORY_MARKER {
    uuid history_marker_id PK
    uuid user_id FK
    date marker_date
    bool has_nutrition_data
    bool has_workout_data
    string marker_type
  }

  USER_PROFILE ||--o{ NUTRITION_TARGET : has
  USER_PROFILE ||--o{ MEAL_PLAN : has
  MEAL_PLAN ||--|{ MEAL_ITEM : contains
  USER_PROFILE ||--o{ MEAL_LOG_ENTRY : logs
  USER_PROFILE ||--o{ WORKOUT_PROGRAM : has
  WORKOUT_PROGRAM ||--|{ WORKOUT_EXERCISE_TEMPLATE : includes
  USER_PROFILE ||--o{ WORKOUT_SESSION : performs
  WORKOUT_SESSION ||--|{ SET_LOG : records
  USER_PROFILE ||--o{ DAILY_SUMMARY : accumulates
  USER_PROFILE ||--o{ HISTORY_MARKER : marks
```

## 7. Core API surface (MVP)

| Domain | Method | Endpoint | Purpose |
|---|---|---|---|
| Profile | `POST` | `/api/profile` | Create profile + preferences |
| Profile | `PATCH` | `/api/profile/{user_id}` | Update profile fields |
| Plan | `POST` | `/api/plan/generate` | Generate nutrition targets + meal plan + workout program |
| Plan | `POST` | `/api/plan/regenerate` | Regenerate meal or workout block |
| Diary | `GET` | `/api/diary/today?user_id=...` | Return merged daily dashboard payload |
| Meals | `POST` | `/api/meals/log` | Manual meal/snack logging |
| Meals | `POST` | `/api/meals/swap` | Swap one meal and recompute totals |
| Meals | `PATCH` | `/api/meals/{meal_item_id}` | Edit meal macros or name |
| Workout | `GET` | `/api/workout/today?user_id=...` | Get today's workout session template |
| Workout | `POST` | `/api/workout/session/start` | Start active workout session |
| Workout | `POST` | `/api/workout/session/{session_id}/set` | Log set-by-set performance |
| Workout | `POST` | `/api/workout/session/{session_id}/complete` | Complete session + summary |
| History | `GET` | `/api/history/calendar?user_id=...&month=YYYY-MM` | Calendar markers |
| History | `GET` | `/api/history/day?user_id=...&date=YYYY-MM-DD` | Daily nutrition + workout details |
| Metrics | `POST` | `/api/metrics/event` | Track product events |

## 8. Key sequence diagrams

### 8.1 Onboarding and plan generation

```mermaid
sequenceDiagram
  participant U as User
  participant FE as Next.js Frontend
  participant BE as Python API
  participant PE as Plan Engine
  participant DB as Postgres

  U->>FE: Enter profile, goal, restrictions, equipment
  FE->>BE: POST /api/profile
  BE->>DB: Upsert USER_PROFILE
  BE-->>FE: Profile saved

  FE->>BE: POST /api/plan/generate
  BE->>PE: Build nutrition + meal + workout outputs
  PE-->>BE: Plan artifacts
  BE->>DB: Save targets, meal plan, workout program
  BE->>DB: Build DAILY_SUMMARY seed
  BE-->>FE: Return plan result payload
  FE-->>U: Show calories, macros, meal plan, workout plan
```

### 8.2 Daily diary open and meal swap

```mermaid
sequenceDiagram
  participant U as User
  participant FE as Next.js Frontend
  participant BE as Python API
  participant DB as Postgres

  U->>FE: Open Diary
  FE->>BE: GET /api/diary/today
  BE->>DB: Query target + logs + workout status
  DB-->>BE: Daily data
  BE-->>FE: Aggregated diary payload
  FE-->>U: Render calories/macros progress + meal/workout status

  U->>FE: Tap Swap Meal
  FE->>BE: POST /api/meals/swap
  BE->>DB: Replace meal item and recalc totals
  BE->>DB: Update DAILY_SUMMARY
  BE-->>FE: Updated meal + day totals
  FE-->>U: Refresh meal card and progress bars
```

### 8.3 Active workout logging and completion

```mermaid
sequenceDiagram
  participant U as User
  participant FE as Next.js Frontend
  participant BE as Python API
  participant DB as Postgres

  U->>FE: Tap Start Workout
  FE->>BE: POST /api/workout/session/start
  BE->>DB: Insert WORKOUT_SESSION status=active
  BE-->>FE: Session id + exercise list

  loop Per set
    U->>FE: Enter reps and weight
    FE->>BE: POST /api/workout/session/{id}/set
    BE->>DB: Insert SET_LOG
    BE-->>FE: Set saved
  end

  U->>FE: Tap Complete Workout
  FE->>BE: POST /api/workout/session/{id}/complete
  BE->>DB: Mark session completed + duration
  BE->>DB: Update DAILY_SUMMARY and HISTORY_MARKER
  BE-->>FE: Workout summary payload
  FE-->>U: Show completion summary
```

## 9. Module-by-module build instructions

### Module 0: Platform foundation

- Frontend tasks
  - Initialize Next.js App Router project structure.
  - Create shell layout with bottom nav placeholders: Diary, Meal Plan, Workout, History, Profile.
  - Build shared UI primitives for progress bars, cards, section headers, and action buttons.
- Backend tasks
  - Create Python API entrypoint and router scaffold.
  - Add health endpoint and request validation layer.
  - Add DB connection and migration tooling.
- Data tasks
  - Create base tables for user profile and timestamps.
- Definition of done
  - Deployable to Vercel with working `/api/health`.

### Module 1: Onboarding and profile capture

- Frontend tasks
  - Build onboarding flow: profile inputs then goal and filters.
  - Add form validation and save states.
- Backend tasks
  - Implement `POST /api/profile` and `PATCH /api/profile/{user_id}`.
  - Validate required completeness fields from whitepaper rules.
- Data tasks
  - Finalize `USER_PROFILE` schema.
- Definition of done
  - Plan generation is blocked until required fields are complete.

### Module 2: Plan generation engine

- Frontend tasks
  - Build plan result screen with calorie and macro target cards.
  - Add entry points to meal plan and workout plan tabs.
- Backend tasks
  - Implement `POST /api/plan/generate`.
  - Add rules for goal modes: lose, maintain, build, consistency.
  - Return beginner-friendly workout structure and 3-meal baseline plan.
- Data tasks
  - Persist `NUTRITION_TARGET`, `MEAL_PLAN`, `MEAL_ITEM`, `WORKOUT_PROGRAM`, `WORKOUT_EXERCISE_TEMPLATE`.
- Definition of done
  - User gets visible calorie/macro targets plus meal and workout output in one response.

### Module 3: Diary dashboard (daily home)

- Frontend tasks
  - Build Diary screen from screenshot model: calorie/macro progress, meal status, workout status.
  - Add quick action buttons for meal logging and start workout.
- Backend tasks
  - Implement `GET /api/diary/today` with merged read model.
  - Implement `POST /api/meals/log` for off-plan meals.
- Data tasks
  - Persist `MEAL_LOG_ENTRY` and `DAILY_SUMMARY`.
- Definition of done
  - Logging any meal immediately updates diary totals.

### Module 4: Meal planning and customization

- Frontend tasks
  - Build meal cards with Edit and Swap actions.
  - Add regenerate meal plan action.
- Backend tasks
  - Implement `PATCH /api/meals/{meal_item_id}` and `POST /api/meals/swap`.
  - Implement `POST /api/plan/regenerate` for meal-only refresh.
  - Recompute per-meal and per-day totals after any modification.
- Data tasks
  - Track swap metadata and versioning.
- Definition of done
  - User can personalize meals without losing clarity on daily macro totals.

### Module 5: Workout planning and active logging

- Frontend tasks
  - Build Workout tab list and Active Workout logger.
  - Build Workout Summary page.
- Backend tasks
  - Implement session start, set logging, and session complete endpoints.
  - Ensure equipment filters are honored in generated exercise list.
- Data tasks
  - Persist `WORKOUT_SESSION` and `SET_LOG`.
- Definition of done
  - Set-by-set logging works in-session and summary appears on completion.

### Module 6: History and day details

- Frontend tasks
  - Build monthly history calendar with logged-day markers.
  - Build Day Details screen with nutrition totals + workout summary.
- Backend tasks
  - Implement history calendar and day details endpoints.
  - Materialize markers from existing logs.
- Data tasks
  - Persist `HISTORY_MARKER` updates.
- Definition of done
  - Any logged day is visible in calendar and drill-down supports both nutrition and workout data.

### Module 7: Product metrics and hardening

- Frontend tasks
  - Track critical product events from UI actions.
- Backend tasks
  - Implement event ingest endpoint and analytics query views.
  - Add guardrails for duplicate submissions and stale writes.
- Data tasks
  - Store events needed for whitepaper metrics.
- Definition of done
  - You can report onboarding completion, plan generation completion, diary opens, workouts completed, meal log frequency, and days with complete data.

## 10. Build dependency graph

```mermaid
flowchart LR
  M0["Module 0: Foundation"] --> M1["Module 1: Onboarding"]
  M1 --> M2["Module 2: Plan Generation"]
  M2 --> M3["Module 3: Diary"]
  M2 --> M4["Module 4: Meal Customization"]
  M2 --> M5["Module 5: Workout Logging"]
  M3 --> M6["Module 6: History"]
  M4 --> M6
  M5 --> M6
  M6 --> M7["Module 7: Metrics and Hardening"]
```

## 11. Suggested repo layout

```text
/
  app/                              # Next.js App Router pages
    (tabs)/
      diary/page.tsx
      meal-plan/page.tsx
      workout/page.tsx
      history/page.tsx
      profile/page.tsx
    onboarding/page.tsx
    plan-result/page.tsx
  components/
  lib/
    api-client.ts
    types.ts
  api/
    index.py                        # Python ASGI app entrypoint
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
```

## 12. Ticket-ready acceptance checklist

- User cannot generate plan until required profile fields are complete.
- Generated plan always includes visible calorie, protein, carbs, fat targets.
- Meal edits/swaps immediately update meal-level and day-level totals.
- Active workout supports set-by-set actual performance logging.
- Diary unifies nutrition and workout status on one screen.
- History calendar marks logged days and opens day details.
- Product metrics map to whitepaper success criteria.

## 13. Explicitly out of scope for MVP

- Payments, subscriptions, and premium access control.
- Advanced adaptive recommendation engine.
- Coach marketplace or social feed.
- Deep wearable integrations.

