# DraftKit App (Frontend)

This is the DraftKit web client that consumes the standalone DraftKit API.

## Routes
- `/` -> available players list
- `/player/:playerId` -> player detail screen

## Required environment variables
Create `.env` from `.env.example`:

- `VITE_BACKEND_URL` (DraftKit API base URL)
- `VITE_APP_CLIENT_KEY` (must match API `APP_CLIENT_KEY`)

## Run locally
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

## Product boundary
This app does not contain backend logic. It authenticates to the external DraftKit API with a bearer key and renders returned data.
