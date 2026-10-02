# LFT-02

Title: Vercel project setup and environment wiring

Owner: Edgar A.
Branch: `feature/LFT-02-vercel-setup`

## Goal

Deploy the frontend and API from the same repo using separate Vercel projects.

## Scope

- Create the web project with root `apps/web`
- Create the API project with root `apps/api`
- Add base environment variables
- Confirm both projects deploy from `main`

## Acceptance

- Web project deploys
- API project deploys
- API health route returns JSON
- Web project has `NEXT_PUBLIC_API_URL` configured
