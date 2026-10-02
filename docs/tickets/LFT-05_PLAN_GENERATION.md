# LFT-05

Title: Plan generation v1

Owner: Edgar L.
Branch: `feature/LFT-05-plan-generation-v1`

## Goal

Turn a complete profile into a first-pass nutrition target, meal plan, and workout split.

## Scope

- Add `POST /api/plan/generate`
- Require a complete profile before generation
- Return calories, macros, meal structure, and workout structure
- Keep the logic deterministic and easy to inspect

## Acceptance

- Endpoint returns a full plan for a valid profile
- Goal mode changes affect targets
- Incomplete profile blocks generation
- API tests cover major goal modes
