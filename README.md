# DraftKit App (Frontend)

This is the DraftKit web client that consumes the standalone [DraftKit API](https://github.com/prattaydey/CSE416Project-Sky-Blue-API) with API key in authorization header of HTTP request.

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