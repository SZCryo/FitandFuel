# LiftFuelApp

Repository layout for MVP implementation.

## Structure

- `apps/web` - Next.js frontend
- `apps/api` - Python API
- `packages/contracts` - shared API contract package
- `docs` - planning docs and handoff material
- `infra/vercel` - deployment notes

## Local start

### Web

```powershell
cd apps/web
npm install
npm run dev
```

### API

```powershell
cd apps/api
python -m pip install -r requirements.txt
pytest
```

## Deployment model

Create two Vercel projects from this repo.

- Web root: `apps/web`
- API root: `apps/api`
