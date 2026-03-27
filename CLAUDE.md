# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Frontend
```bash
cd frontend && npm run dev      # dev server on port 3000
cd frontend && npm run build    # production build → frontend/dist/
cd frontend && npm run preview  # preview production build
```

### Backend
```bash
cd functions && npm install     # install Lambda dependencies
serverless deploy               # deploy to AWS (ap-southeast-1)
serverless deploy --aws-profile <profile>
```

### Full deploy (from root)
```bash
npm run deploy:backend   # serverless deploy
npm run deploy:frontend  # build + S3 sync + CloudFront invalidation
```
> Edit `package.json` `config` block to set `s3Bucket` and `cfDistId` before deploying frontend.

### Local backend (Serverless offline or SAM)
The API base URL defaults to `http://localhost:3001/Prod` when `VITE_API_URL` is not set. Set it for production:
```bash
VITE_API_URL=https://<api-id>.execute-api.ap-southeast-1.amazonaws.com/dev npm run build
```

---

## Architecture

### Overview
Single-page React app + single AWS Lambda function. All backend routes are handled by one Hono app (`functions/app.js`) deployed as one Lambda behind API Gateway with `/{proxy+}` catch-all routing.

### Backend (`functions/`)
- **`handler.js`** — Lambda entry point, wraps Hono via `hono/aws-lambda`
- **`app.js`** — All route registration; `adminAuth` middleware applied per-route
- **`shared/auth.js`** — `signAdminToken(eventId)`, `verifyAdminToken()`, `adminAuth` Hono middleware
- **`shared/db.js`** — DynamoDB `DynamoDBDocumentClient` singleton (AWS SDK v3)
- **`shared/validate.js`** — `requireFields(body, fields)` throws `{ statusCode, message }` on missing fields
- **Error handling** — handlers throw `{ statusCode, message }` objects; `app.onError` catches them globally

### Frontend (`frontend/src/`)
Three independent app sections mounted at separate route prefixes in `main.jsx`:
- **`/admin/*`** — `AdminRoot.jsx` + `AdminContext` (token, eventId, eventData, liveState in sessionStorage)
- **`/play/*`** — `PlayRoot.jsx` + `PlayContext` (userId, nickname, eventId in localStorage)
- **`/screen/:eventId/*`** — `ScreenRoot.jsx`, read-only polling display for projector

All API calls go through `services/api.js` (axios instance). The request interceptor automatically attaches `Authorization: Bearer <token>` from `sessionStorage.adminToken`.

### DynamoDB Single-Table Design (`PlotCastTable`)
| Record | PK | SK |
|--------|----|----|
| Event metadata | `EVENT#<id>` | `META` |
| Story | `EVENT#<id>` | `STORY#<zeroPaddedIndex>` (e.g. `STORY#00`) |
| Character | `EVENT#<id>` | `CHARACTER#<id>` |
| User | `EVENT#<id>` | `USER#<userId>` |
| Answer/vote | `EVENT#<id>` | `ANSWER#<userId>#<storyIndex>` |
| Global admin password | `GLOBAL` | `ADMIN` |

Story SKs use zero-padded indexes (`STORY#00`, `STORY#01`) for correct lexicographic sort order. The global admin password is a single shared bcrypt hash — not per-event. First login auto-creates the hash from the `ADMIN_PASSWORD` env var (default: `12345678`).

### Authentication
- One global admin password for the whole app (stored at `PK: GLOBAL, SK: ADMIN`)
- JWT tokens are event-scoped (`{ eventId, role: "admin" }`) — admin handlers verify `tokenEventId === requestEventId`
- Token expiry: 4 hours (`JWT_EXPIRY=14400`)

### Admin UI Flow
`/` → `/admin/events` (event history list) → click Login → `/admin/login` (password only, eventId passed via `location.state`) → back to `/admin/events` → Manage → `/admin/live`

Event history is stored in `localStorage` key `plotcast_admin_history` (up to 8 recent events) via `utils/eventHistory.js`.

### Public User Flow
`/play?event=<id>` pre-fills and locks the event ID on the join form. After joining, the app polls `GET /event/:eventId/state` every 2s. When `currentStoryIndex` changes, `hasVoted` resets and the user navigates to StoryPage.

### Score notes
- Options can have negative scores — DynamoDB `ADD` handles negative values atomically
- `ScoreMeter` clamps percentage to `[0, 100]` to avoid negative bar widths
- Score inputs use `type="text" inputMode="numeric"` with `onBlur` parsing to support negative entry

### Presentation Screen
`/screen/:eventId` — polls every 1.5s, full-screen layout for projector. Opened via "Open Presentation Screen" link in LiveControlPage.

### Env vars (Lambda)
| Var | Default | Notes |
|-----|---------|-------|
| `TABLE_NAME` | `PlotCastTable` | DynamoDB table |
| `JWT_SECRET` | `change-this-secret-before-deploy` | Must be set in production |
| `JWT_EXPIRY` | `14400` | Seconds (4h) |
| `ADMIN_PASSWORD` | `12345678` | Used only on first-ever login |
