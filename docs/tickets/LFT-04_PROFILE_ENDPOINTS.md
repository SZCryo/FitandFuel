# LFT-04

Title: Profile create and update endpoints

Owner: Edgar L.
Branch: `feature/LFT-04-profile-endpoints`

## Goal

Let the app create and update a user profile with enough data to drive planning.

## Scope

- Add `POST /api/profile`
- Add `PATCH /api/profile/{user_id}`
- Add validation for profile fields
- Return a clear profile payload after create and update

## Acceptance

- A profile can be created with a generated `user_id`
- A profile can be updated by `user_id`
- Invalid payloads return 4xx responses
- API tests cover happy path and basic validation
