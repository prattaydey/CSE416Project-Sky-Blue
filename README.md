# DraftKit App (Frontend)

This is the DraftKit web client that consumes the standalone [DraftKit API](https://github.com/prattaydey/CSE416Project-Sky-Blue-API) with API key in authorization header of HTTP request.

## Routes
- `/` -> available players list
- `/player/:playerId` -> player detail screen
- `/player/:playerId?username=<username>` -> loads/saves notes for that user from client backend

## Required environment variables
Create `.env` from `.env.example`:

- `VITE_API_BASE_URL` (DraftKit API base URL for player data)
- `VITE_CLIENT_BACKEND_URL` (client app backend URL for users/notes)
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