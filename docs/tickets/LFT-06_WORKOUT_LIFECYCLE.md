# LFT-06

Title: Workout session lifecycle endpoints

Owner: David M
Branch: `feature/LFT-06-workout-session-lifecycle`

## Goal

Handle workout start, set logging, and completion as one clean session flow.

## Scope

- Add session start endpoint
- Add set logging endpoint
- Add session complete endpoint
- Return session state in a consistent payload

## Acceptance

- Session can move from new -> active -> completed
- Sets can be attached while active
- Tests cover state transitions
