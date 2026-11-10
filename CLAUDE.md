# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

ThreadHive is a Reddit-style discussion app (subreddits → threads → comments, with voting and JWT auth). It is two independent npm projects with no root-level package.json — run commands from inside each folder:

- `threadhive-backend/` — Express 5 + Mongoose REST API (ES modules)
- `threadhive-frontend/` — React 19 + Vite + Redux Toolkit + React-Bootstrap SPA

`resources/prompts.md` holds the specs for upcoming AI features (Gemini-powered thread summary and "Rephrase with AI"). Both specs require Gemini calls to happen on the backend, with the API client created only after `GEMINI_API_KEY` is loaded from `.env`.

    ## Commands

Backend (`cd threadhive-backend`):
- `npm run dev` — start with nodemon (`main.js`); needs `.env` (copy `.env.example`: `MONGODB_URI`, `PORT=5000`, `JWT_SECRET`, `JWT_EXPIRATION`, `NODE_ENV`, `GEMINI_API_KEY`)
- `npm run populate` — seed MongoDB from `src/scripts/seed-data.js`
- `npm test` — Vitest, all tests once
- `npx vitest run tests/unit/services/threadService.test.js` — single file; add `-t "name"` to filter by test name
- `npm run format` — Prettier

Frontend (`cd threadhive-frontend`):
- `npm run dev` / `npm run build` / `npm run lint`
- `npm test` — Vitest in **watch mode**; use `npx vitest run` for a single pass, `npx vitest run tests/unit/components/ThreadCard.test.jsx` for one file

## Backend architecture

`main.js` loads dotenv, connects Mongo (`db.js`), then starts the server (`server.js`). `src/app.js` builds the Express app separately (helmet, rate limit 100 req/15 min, cors, JSON) so tests can import it with supertest without listening.

Layering is strict: **routes → controllers → services → models**.
- Routes attach `authHandler` (JWT Bearer check; sets `req.user = { userId }`). Nearly every route is protected.
- Controllers do request validation and shape the response as `{ success, message, data }`.
- Services contain all Mongoose queries/business logic.
- Errors: throw `createAppError(message, statusCode)` from `src/utils/createAppError.js`. There are no try/catch blocks in handlers — Express 5 forwards rejected async handlers to `middleware/errorHandler.js`, which emits `{ success: false, message }` (plus `stack` in development).
- Votes live in `routes/votes.js` mounted at `/api` (`/api/threads/:id/upvote`, `/api/comments/:id/downvote`, etc.). Vote state is tracked via `upvotedBy`/`downvotedBy` arrays plus a denormalized `voteCount` on Thread and Comment.

Tests (`vitest.config.js`: node env, `fileParallelism: false`, 60s timeouts):
- `tests/unit/` mock the layer below with `vi.mock` (controllers mock services, etc.).
- `tests/integration/` import `../setup.js` explicitly, which starts `mongodb-memory-server` and connects mongoose; they register/login a real user via supertest to get a JWT. They rely on `JWT_SECRET` from `.env`.

## Frontend architecture

- `src/api/axiosInstance.js` hardcodes base URL `http://localhost:5000/api`; endpoint paths are centralized in `src/config/apiConfig.js`.
- `src/services/*` wrap axios calls, attach the `Authorization: Bearer` header from `localStorage` per request, and return `res.data.data`.
- `src/reducers/*Slice.js` are RTK slices with `createAsyncThunk`s calling the services; errors go through `utils/handleApiError.js`, which on 401 clears localStorage and hard-redirects to `/login`. Store keys: `auth`, `threads`, `currentThread`, `comments`, `theme`, `subreddits` (`src/store/store.js`).
- Auth token/user persist in `localStorage` (side effects live in thunks, not reducers). `PrivateRoute` gates `/home`, `/thread/:threadId`, `/profile`. Dark mode sets `data-theme="dark"` on `<html>`.
- Tests: jsdom + Testing Library; `tests/setup.js` starts an MSW server with handlers in `tests/mocks/handlers.js` (same `localhost:5000/api` base) and fixtures in `tests/mocks/mockData.js`. New API endpoints need matching MSW handlers.
