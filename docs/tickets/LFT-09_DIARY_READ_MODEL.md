# LFT-09

Title: Diary read model endpoint

Owner: Arthur
Branch: `feature/LFT-09-diary-read-model`

## Goal

Aggregate the current day into one payload for the diary screen.

## Scope

- Add `GET /api/diary/today`
- Return nutrition totals, meal state, and workout state
- Keep the response stable for frontend use

## Acceptance

- Diary endpoint returns one payload for the day
- Empty state is handled
- Tests cover expected response shape
