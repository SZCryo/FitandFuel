# LFT-11

Title: Build onboarding entry flow and reusable tab navigation

Owner: Edgar A.
Branch: `feature/LFT-11-onboarding-entry`

## Goal

Replace the bare app entry with a real first-touch flow and clean up the repeated tab navigation so the app has a stable base for the next set of tickets.

## Scope

- Refresh the home page with a real entry state and clear CTA
- Add `/onboarding` with first-pass sections for body stats, goals, food filters, and equipment
- Move bottom navigation into one shared component
- Add an API status readout on the Profile tab

## Files

- `apps/web/app/page.tsx`
- `apps/web/app/onboarding/page.tsx`
- `apps/web/app/(tabs)/layout.tsx`
- `apps/web/app/(tabs)/profile/page.tsx`
- `apps/web/components/BottomNav.tsx`
- `apps/web/lib/api.ts`
- `apps/web/app/globals.css`

## Acceptance

- Home page has a primary CTA to start onboarding
- Onboarding page renders cleanly on desktop and mobile
- Tab pages use one shared bottom nav
- Profile page shows whether the API is reachable
- `npm run lint` passes
- `npm run type-check` passes

## PR

Title: `LFT-11 Build onboarding entry flow and reusable tab nav`

Commit message: `feat: add onboarding entry flow and reusable tab navigation`
