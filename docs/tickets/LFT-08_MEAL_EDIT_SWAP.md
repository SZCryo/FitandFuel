# LFT-08

Title: Meal edit, swap, and macro recompute

Owner: Mikayel
Branch: `feature/LFT-08-meal-edit-swap`

## Goal

Let the user change meals without losing day-level totals.

## Scope

- Add meal edit endpoint
- Add meal swap endpoint
- Recompute macro totals after changes

## Acceptance

- Swap returns updated meal data
- Day totals remain in sync
- Tests cover macro recompute logic
