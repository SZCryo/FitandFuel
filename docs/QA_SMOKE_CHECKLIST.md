# QA Smoke Checklist (MVP)

Date:
Tester:
Preview URL:
Commit/PR:

## Core flow checks

- [ ] Onboarding can be completed with required fields only.
- [ ] Plan generation returns calories + protein + carbs + fat.
- [ ] Diary loads with current day totals.
- [ ] Meal swap updates day totals correctly.
- [ ] Meal edit updates day totals correctly.
- [ ] Workout session can start.
- [ ] Set logging persists without refresh loss.
- [ ] Workout complete shows summary.
- [ ] History calendar marks logged day.
- [ ] Day details opens and shows nutrition + workout data.

## API sanity

- [ ] No 500 errors on happy path.
- [ ] Validation errors return clear 4xx responses.
- [ ] Duplicate submit does not create broken data.

## UI sanity

- [ ] No blocking console errors.
- [ ] Mobile layout still usable at common phone widths.

## Result

- [ ] PASS
- [ ] FAIL

Notes:
