# Client Repo Backend (Initial MVP)

This is an initial backend scaffold inside the client app repo for user-related data.

## Current schema
- `username` (unique)
- `passwordHash`
- `playerNotes` (map keyed by `playerId` with `{ note, updatedAt }`)

## Environment variables
Copy `.env.example` to `.env`:

- `PORT` (optional, default `3001`)
- `MONGODB_URI`
- `CORS_ORIGIN`

## Run
```bash
npm install --prefix backend
npm run dev --prefix backend
```

## Current routes
- `POST /api/users/register`
- `GET /api/users/:username/notes/:playerId`
- `PUT /api/users/:username/notes/:playerId` (username will be removed after auth implemented)
