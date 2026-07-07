# ResumePilot E2E

Playwright tests against deployed or local app.

## Setup

```bash
cd e2e
npm install
npm run install:browsers
```

## Run

```bash
# Default: production Quick Tunnel
npm test

# Local dev (API + Vite proxy required)
PLAYWRIGHT_BASE_URL=http://localhost:5173 npm test
```

## Suites

| File | Coverage |
|------|----------|
| `tests/smoke.spec.ts` | `/`, `/admin/`, `/swagger-ui.html` |
| `tests/user-journey.spec.ts` | signup → experience → workspace autosave |
