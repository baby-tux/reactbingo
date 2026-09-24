# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Bingo display board for running a live 75-ball bingo game. Two independent packages, no root `package.json`:

- `frontend/` — Vite + React 19 + TypeScript (strict), function components and hooks
- `backend/` — Express 5 + `ws` WebSocket server in TypeScript, MongoDB via Mongoose

Deployed with `docker-compose.yml`: `db` (mongo, data in `./db`), `backend` (port 8999), and `frontend` (Vite build stage, then nginx serving `dist` on port 3000).

## Commands

```bash
# Frontend
cd frontend && npm install
npm run dev          # Vite dev server on :3000 (`npm start` is an alias)
npm run build        # tsc type-check, then production bundle in frontend/dist

# Backend (multi-stage Dockerfile uses these scripts)
cd backend && npm install
npm run build        # tsc: type-check / compile to backend/dist
npm start            # node dist/server.js

# Full stack
docker compose build && docker compose up -d   # http://localhost:3000
```

There is no linter config and there are no tests yet.

Dev caveats:
- `backend/src/db.ts` connects to Mongo at `db:27017` when `NODE_ENV=production` (set in the backend Docker image) and `localhost:27017` otherwise.
- The frontend always calls `/api/...` (REST and WebSocket, `ws`/`wss` following the page protocol). In production nginx strips the `/api` prefix before proxying to the backend (`nginx.conf`); in dev the Vite proxy in `frontend/vite.config.ts` does the same, so run the backend on `localhost:8999`.
- `cards.csv` is read relative to the backend's working directory; compose mounts `backend/cards.csv` into `/app`.

## Architecture

**Game model and URLs.** A game is a Mongo document (`backend/src/bingo-model.ts`) keyed by `gameId` with a random secret `code` generated on `POST /create`. Frontend routes (`frontend/src/App.tsx`): `/` (`pages/HomePage.tsx`) lists public games updated in the last 2 days and creates games; `/view/:id` is read-only; `/control/:id/:code` is the controller. Both game routes render `pages/GamePage.tsx`; view vs. control mode is decided solely by whether `code` is present (`isViewMode` in `game/useGame.ts`). The README's "eye icon" description of view mode is outdated.

**State sync is client-authoritative.** The controller holds the full game state in React state (`frontend/src/game/useGame.ts`, transitions in `game/reducer.ts`) and after every change sends the entire state over the WebSocket as `{action: "push", gameId, code, pushId, baseRevision, state}`, one push at a time. Clients send `{action: "register", gameId}` on connect and receive `{type: "state", state}` (or `{type: "notFound"}`); the control code is never sent to clients. Pushes carry the `baseRevision` they were built on; the server applies them only if it matches the stored `revision` (otherwise it replies `conflict`), replies `ack`, and broadcasts `{type: "state"}` to the other sockets registered to that `gameId`. The client (`game/syncClient.ts`, a plain class wrapped by the `useGameSync` hook) reconnects with backoff, pings to detect dead connections, queues changes made while offline, and asks the controller which version wins on conflict.

**Event history.** State is `eventHistory` (array of `{number, patterns}`) plus `eventPosition`, a cursor that supports undo/redo. A drawn number is `{number: n, patterns: []}`. Awarding patterns after a bingo appends `{number: null, patterns: [...]}`. Drawn numbers, already-validated patterns (before the last drawn number), and current patterns (after it) are all derived by slicing the history up to `eventPosition` (pure functions in `game/history.ts`). Protocol and state types live in `game/types.ts` and mirror the backend by hand. `bingo`, `validationResult`, and `validatedPatterns` hold the transient state of an in-progress bingo check.

**Card validation** runs on the server (`backend/src/validation.ts`). `POST /validate` takes a card id, the drawn numbers, and the candidate patterns (available patterns minus already-awarded ones). It returns per-cell `{number, isDrawn, isOnPattern}` for positions `b1`..`o5` and the patterns matched. `n3` is the free center cell and is never listed in pattern definitions; it gets highlighted through special-case logic.

## Adding a pattern (touches three places)

1. `backend/src/validation.ts`: add an entry to `bingoTypeValidations` (name → list of alternative position sets, excluding `n3`).
2. `frontend/src/patterns/`: add an SVG (derived from `frontend/base_fig.svg`) and register `{name, src}` in `patterns/index.ts`. The name must match the backend key. For example, backend `full` maps to `blackout.svg`.
3. `backend/src/server.ts` `GET /types`: the hardcoded array of arrays of pattern names active for the game. Each inner array is a display line, max 2.

Cards live in `backend/cards.csv` with columns `id,b1..b5,i1..i5,n1,n2,n4,n5,g1..g5,o1..o5` (no `n3`).
