# LFT-07

Title: History calendar and day queries

Owner: David M
Branch: `feature/LFT-07-history-queries`

## Goal

Make stored days queryable by month and by date.

## Scope

- Add `GET /api/history/calendar`
- Add `GET /api/history/day`
- Return consistent shapes for calendar markers and day detail

## Acceptance

- Calendar returns logged-day markers
- Day query returns nutrition and workout detail
- Tests cover empty and populated responses
