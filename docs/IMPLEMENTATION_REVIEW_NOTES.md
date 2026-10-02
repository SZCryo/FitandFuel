# Lift & Fuel implementation review notes

Date: 2026-05-18

These are the build notes we can submit with the project. It is not meant to read like perfect API docs. It is more of a recap of what each ticket/module taught us, what code landed, and where the app is still a little rough around the edges.

## Current build snapshot

The app is split into two Vercel projects from the same repo:

- `apps/web` is the Next.js app.
- `apps/api` is the Python/FastAPI app.
- The web app still has browser-side fallback state because this is an MVP/demo and we are not using a real database yet.
- The API has working endpoint shapes and tests, but most persistence is in-memory. That is fine for the current demo, but it is not production storage.

The big thing we learned early: the frontend needs to keep moving even if the API project is temporarily offline or a serverless instance loses state. That is why `apps/web/lib/demo.ts` does a lot. It talks to the API when it can, then falls back locally when it cannot.

## Edgar A. - foundation, deployment, and web flow

Tickets: `LFT-01`, `LFT-02`, `LFT-03`, `LFT-11`, plus the later polish passes.

Main areas:

- repo shape
- Vercel split between web and API
- Next.js routing shell
- onboarding entry
- shared bottom tabs
- local demo session handling
- final integration fixes

Files worth checking:

- `apps/web/app/page.tsx`
- `apps/web/app/onboarding/page.tsx`
- `apps/web/app/(tabs)/layout.tsx`
- `apps/web/components/BottomNav.tsx`
- `apps/web/lib/demo.ts`
- `apps/web/lib/api.ts`
- `apps/api/app/main.py`
- `apps/api/vercel.json`

Notes from the work:

- The monorepo setup was the first actual blocker. Vercel will build the wrong thing if the root directory is off by even one folder. The web project needs `apps/web`; the API project needs `apps/api`.
- The API path needed to line up with Vercel's Python function layout. We ended up using `apps/api/api/index.py` as the function entry and `apps/api/app/main.py` as the actual FastAPI app.
- The frontend could not wait for every backend feature to be perfect, so we kept a fallback layer in `demo.ts`. That let onboarding, meal plan, diary, workout, history, and profile all stay clickable during API work.
- Local storage became the demo glue. It is not glamorous, but it made the app testable on Vercel without setting up a DB.
- The tab shell was moved into one shared layout because repeated nav markup was already starting to drift.
- One lesson: when we make route changes in Next, run both `type-check` and `build`. Type-check alone does not always catch route/build metadata issues.

What I would change later:

- Put the session adapter behind a cleaner interface so page components do not know as much about fallback behavior.
- Add a real storage layer once the demo needs multiple users or stable data across browsers.
- Lock the web/API contract harder with shared schema notes or generated types.

## Edgar L. - profile and plan backend

Tickets: `LFT-04`, `LFT-05`.

Main areas:

- profile create/update
- plan generation
- planner models
- tests around profile and plan behavior

Files worth checking:

- `apps/api/app/routes/profile.py`
- `apps/api/app/routes/plan.py`
- `apps/api/app/models/profile.py`
- `apps/api/app/models/plan.py`
- `apps/api/app/services/profile_store.py`
- `apps/api/app/services/planner.py`
- `apps/api/tests/test_profile.py`
- `apps/api/tests/test_plan.py`

Notes from the work:

- Pydantic models helped keep the API payloads sane. It was easier to catch bad profile data there instead of chasing weird frontend bugs later.
- Plan generation is deterministic on purpose. Same profile in, same kind of target output. For a demo, boring math beats random behavior.
- The planner uses body weight, activity level, and goal mode to estimate calories/macros. It is not a nutrition science engine; it is enough to prove the app flow.
- We had to keep meal and workout output in the same plan response because the web app needs both immediately after onboarding.
- The profile ID is the anchor for almost everything else. Once that was stable, other modules had a clear thing to reference.

Stuff learned:

- Endpoint names matter. The frontend kept getting simpler once the paths were obvious: `/api/profile`, `/api/plan/generate`, `/api/plan/{user_id}`.
- If a response shape changes, update tests right away. Otherwise the frontend starts carrying weird compatibility patches.
- In-memory stores are fast for test/demo work, but they hide persistence issues. We should not pretend they are anything more than a temporary stand-in.

## David M - workout sessions and history backend

Tickets: `LFT-06`, `LFT-07`.

Main areas:

- start workout session
- log sets
- complete workout
- calendar history query
- day detail query

Files worth checking:

- `apps/api/app/routes/workout.py`
- `apps/api/app/routes/history.py`
- `apps/api/app/models/workout.py`
- `apps/api/app/models/history.py`
- `apps/api/app/services/workout_store.py`
- `apps/api/tests/test_workout.py`
- `apps/api/tests/test_history.py`

Notes from the work:

- The workout module needed an actual state machine, even if it is tiny: start -> active -> completed.
- Set logging needs to belong to a session, not just float around as loose records.
- History queries need two views: month markers for the calendar and a single-day detail view. Trying to make one endpoint do both would have made the payload muddy.
- Dates were a real footgun. Browser dates and server dates can disagree if we are sloppy with timezone assumptions. The frontend now uses local date formatting for the demo flow.

Stuff learned:

- History is not just a page; it is a read model. It needs workout records, food records, calories, and day-level summaries to line up.
- Empty states matter. A calendar with no data should still render cleanly.
- It is worth testing state transitions directly. Those bugs are hard to spot by clicking around only.

## Mikayel - meal edit, swap, and macro math

Ticket: `LFT-08`.

Main areas:

- editing a meal
- swapping a meal
- recalculating actual totals
- keeping day totals consistent after changes

Files worth checking:

- `apps/api/app/routes/plan.py`
- `apps/api/app/services/plan_store.py`
- `apps/api/app/models/plan.py`
- `apps/web/app/(tabs)/meal-plan/page.tsx`
- `apps/api/tests/test_plan.py`

Notes from the work:

- Meal editing is simple on the surface, but totals get stale fast if we do not recompute after every edit/swap.
- The macro totals live at the plan level, so every meal change has to run through the same recompute path.
- Swap behavior is deterministic. It cycles through known meal options instead of doing anything random. Easier to test, easier to demo.
- The frontend needed to preserve meal completion state when meals changed. Otherwise a user could mark lunch done, swap it, and lose track of the day.

Stuff learned:

- Do not duplicate macro math in five places. Use one recompute function and call it every time.
- Keep meal types stable (`breakfast`, `lunch`, `dinner`) because the diary depends on them as keys.
- If the UI edits a meal that was already marked done, history should reflect the new meal data for that day.

## Arthur - diary read model, QA, and UI checks

Tickets: `LFT-09`, `LFT-10`, plus later UI sanity fixes.

Main areas:

- diary daily summary behavior
- smoke checklist
- PR checklist
- button/layout fixes
- making the app less fragile during manual testing

Files worth checking:

- `apps/web/app/(tabs)/diary/page.tsx`
- `apps/web/app/(tabs)/history/page.tsx`
- `apps/web/app/(tabs)/profile/page.tsx`
- `apps/web/app/globals.css`
- `docs/QA_SMOKE_CHECKLIST.md`
- `docs/PR_CHECKLIST.md`

Notes from the work:

- The diary screen is basically the user's daily dashboard. It needs calorie progress, macro progress, meal state, and workout state in one place.
- The app started with some awkward button sizing and weird pill shapes. The CSS got normalized so buttons feel less broken.
- The session tools in Profile are useful for demo testing. Export/import/reset saved us time when debugging bad local state.
- QA notes were kept lightweight. The point was to have a repeatable smoke pass, not build a giant enterprise process.

Stuff learned:

- Manual QA catches dumb UI issues faster than staring at code. Button shape, route crashes, missing empty states, etc.
- A good smoke checklist should cover the happy path first: onboarding -> plan -> diary -> workout -> history -> profile.
- We need to test both fresh sessions and dirty sessions, because local storage can preserve old shapes from earlier builds.

## Later integration work

This is where a lot of the real app behavior came together.

Main areas:

- onboarding now creates a profile, generates a plan, and moves the user into the meal plan flow
- meal plan can edit, swap, regenerate, and unlock the tabs
- diary can mark meals done and clear them
- workout can run planned sessions or custom workouts
- history now shows workout history, custom workout results, food logs, calories, and macros
- profile can export/import/reset the local session

Files worth checking:

- `apps/web/app/(tabs)/meal-plan/page.tsx`
- `apps/web/app/(tabs)/workout/page.tsx`
- `apps/web/app/(tabs)/history/page.tsx`
- `apps/web/app/(tabs)/diary/page.tsx`
- `apps/web/lib/demo.ts`

Notes from the work:

- `demo.ts` became the bridge between real API calls and local fallback behavior.
- `useSyncExternalStore` was used so multiple tabs/screens react when the saved session changes.
- Food history was added after workout history because the calendar felt incomplete with only gym data.
- Custom workouts were added because a strict plan is not realistic. People skip legs, swap days, or just make up a session.

Stuff learned:

- The app feels more real when history shows what actually happened, not just what was planned.
- Calendar UI needs compact markers. We ended up showing food/workout counts instead of cramming everything into the cell.
- Local state shape needs migration defaults. Old saved sessions should not crash the newer app.

## Testing and review notes

Commands we have been using:

```bash
cd apps/web
npm run lint
npm run type-check
npm run build
```

```bash
cd apps/api
python -m pytest
```

What to click during review:

- Start from `/` and run onboarding with a basic profile.
- Generate the meal plan.
- Edit and swap at least one meal.
- Go to Diary and mark meals done.
- Start and complete a workout.
- Add a custom workout.
- Open History and check that the selected day shows food plus workout data.
- Open Profile and export/import/reset the session.

Known MVP limits:

- No real auth.
- No real database.
- No payment flow.
- Server-side stores are not durable in serverless hosting.
- Nutrition/workout logic is first-pass demo logic, not final coaching logic.
- UI is intentionally simple in places because the priority was a working MVP.

## Short version

The project ended up as a working demo with real module boundaries:

- Edgar A. got the foundation and flow online.
- Edgar L. handled profile and planner basics.
- David M covered workout sessions and history.
- Mikayel handled meal editing/swap behavior and macro consistency.
- Arthur covered diary/read-model thinking and QA polish.

The main lesson: the API contract and local session shape are the backbone of the app. Once those were stable, the screens got a lot easier to wire together.
