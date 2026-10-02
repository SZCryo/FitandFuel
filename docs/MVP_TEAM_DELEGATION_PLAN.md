# Lift & Fuel MVP Team Delegation Plan

Date: 2026-03-31


## 1) Team map

- Edgar A. - Lead - Python, JavaScript
- Edgar L. - Java > Python > C++ > JavaScript
- Arthur - Java
- Mikayel - Java, C++
- David M - C++, Java, Python

## 2) What Edgar A. should set up first (before everyone starts)


1. Create repo for `LiftFuelApp` and push current docs.
2. Connect repo to Vercel (Preview deploys on PR, Production deploy on `main`).
3. Add base env vars in Vercel and GitHub secrets.
4. Add branch protection on `main`:
   - PR required
   - 1 review minimum
   - Passing CI required
5. Create issue board columns:
   - Backlog
   - Ready
   - In Progress
   - Review
   - Done
6. Add labels:
   - `frontend`
   - `backend`
   - `db`
   - `devops`
   - `qa`
   - `blocked`
7. Commit skeleton folders so everyone starts from same shape.

## 3) Delegation by person (owner model)

### Edgar A. - Lead + Platform owner

- Own `M0 Foundation` end-to-end.
- Own Vercel setup, CI wiring, branch rules, and repo hygiene.
- Build initial Next.js shell and tab routing.
- Review/merge all PRs for week 1.

Deliverables:
- `app/` routing shell + shared layout
- `api/index.py` router bootstrap
- CI pipeline passing

### Edgar L. - Core planner backend owner

- Own `M1` + most of `M2` backend.
- Build profile capture endpoints and validation.
- Build plan generation logic (goal modes, target macro output).
- Define v1 request/response models for planner endpoints.

Deliverables:
- `POST /api/profile`
- `PATCH /api/profile/{user_id}`
- `POST /api/plan/generate`

### David M - Workout + history backend owner

- Own `M5` and backend of `M6`.
- Build workout session lifecycle endpoints.
- Build history calendar/day detail queries.
- Add unit tests around session state transitions.

Deliverables:
- `POST /api/workout/session/start`
- `POST /api/workout/session/{id}/set`
- `POST /api/workout/session/{id}/complete`
- `GET /api/history/calendar`
- `GET /api/history/day`

### Mikayel - Meal customization + computation owner

- Own `M4` backend logic.
- Implement meal edit/swap logic with deterministic recalculation.
- Enforce "never lose day totals" behavior after swaps/edits.
- Add rule tests for macro math and edge cases.

Deliverables:
- `PATCH /api/meals/{meal_item_id}`
- `POST /api/meals/swap`
- Macro recompute service + tests

### Arthur - Diary read-model + QA gate owner

- Own `M3` backend read-model and test harness.
- Build diary aggregation endpoint (targets + logs + workout status).
- Build smoke test checklist and PR test pass template.
- Run manual QA on preview links before merge to `main`.

Deliverables:
- `GET /api/diary/today`
- Smoke test checklist in `docs/QA_SMOKE_CHECKLIST.md`
- PR checklist template

## 3.5) Pairing plan (so language gaps do not slow us down)

- Edgar L. pairs with Arthur on Python endpoint patterns and test setup.
- David M pairs with Mikayel on service-layer structure and DB query conventions.
- Edgar A. handles final API contract sign-off so frontend integration stays stable.

## 4) Work split by week (MVP kickoff)

### Day 1

- Edgar A.: repo + Vercel + CI + branch rules
- Edgar L.: profile API skeleton
- David M: workout session schema draft
- Mikayel: meal swap/edit service skeleton
- Arthur: diary endpoint skeleton + QA checklist draft

### Day 2-3

- Edgar A.: Next.js tab shell + shared UI components
- Edgar L.: plan generation logic v1
- David M: workout start/set/complete working
- Mikayel: meal swap/edit + macro recompute working
- Arthur: diary read-model pulling real DB data

### Day 4-5

- Wire frontend to all implemented endpoints.
- Stabilize response contracts.
- Fix integration bugs and data mismatches.
- Run smoke pass on Vercel preview deploy.

## 5) Basic Git workflow (keep it simple)

- Branch format: `feature/<ticket-id>-<short-name>`
- Example: `feature/LFT-23-meal-swap-endpoint`
- PR size target: under 400 changed lines where possible
- PR rules:
  - Include test evidence (unit test output or screenshot)
  - Include endpoint contract changes in description
  - No direct push to `main`

## 6) Minimal CI/CD (not over-engineered)

Required checks on each PR:
- `web-lint` (Next.js lint)
- `api-tests` (Python tests)
- `type-check` (TS where applicable)

Deploy model:
- PR -> Vercel preview deploy
- Merge to `main` -> production deploy

## 7) Immediate ticket list to create right now

- LFT-01 `M0` Repo bootstrap + branch protections (Edgar A.)
- LFT-02 `M0` Vercel project + env setup (Edgar A.)
- LFT-03 `M0` Python API router skeleton (Edgar A.)
- LFT-04 `M1` Profile create/update endpoints (Edgar L.)
- LFT-05 `M2` Plan generation v1 (Edgar L.)
- LFT-06 `M5` Workout session lifecycle endpoints (David M)
- LFT-07 `M6` History calendar/day queries (David M)
- LFT-08 `M4` Meal edit/swap + macro recompute (Mikayel)
- LFT-09 `M3` Diary read-model endpoint (Arthur)
- LFT-10 QA smoke checklist + PR template (Arthur)
