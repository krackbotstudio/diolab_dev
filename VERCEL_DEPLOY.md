# Vercel Deployment Guide

## 1) What is configured in this repo

- Static frontend build output: `dist/public`
- Backend API: `api/index.ts` (Vercel Node function)
- Rewrites:
  - `/api/*` -> `api/index.ts`
  - everything else -> static assets

## 2) Prerequisites

- Vercel account
- Project connected to this Git repository
- Environment variables configured in Vercel Project Settings

## 3) Required environment variables

At minimum, set these in Vercel (Project -> Settings -> Environment Variables):

- `NODE_ENV=production`
- `SESSION_SECRET=<strong-random-secret>`
- `DATABASE_URL=<your-neon-or-postgres-url>`
- `GOOGLE_CLIENT_ID=<if using Google auth>`
- `GOOGLE_CLIENT_SECRET=<if using Google auth>`
- `OPENAI_API_KEY=<if using AI routes>`

Also include any other secrets currently used in your local `.env`.

## 4) Deploy with Git (recommended)

1. Push this branch to GitHub/GitLab/Bitbucket.
2. In Vercel, create a new project (or import existing repo).
3. Framework preset: **Other**.
4. Build command: `npm run build`.
5. Output directory: `dist/public`.
6. Install command: `npm install`.
7. Add environment variables.
8. Click **Deploy**.

## 5) Deploy with Vercel CLI (optional)

```bash
npm i -g vercel
vercel login
vercel
vercel --prod
```

## 6) Important Vercel limitations for this app

- WebSocket signaling (`server/signaling.ts`) is disabled in Vercel serverless function mode.
- In-memory sessions reset on cold starts/redeploys. Use a persistent session store (Redis/Postgres) for production-grade auth sessions.

## 7) Verify deployment

- Open `/` and confirm UI loads.
- Open an API route like `/api/health` (or any existing API endpoint) and verify JSON response.
- Test login flow if Google auth is enabled.
