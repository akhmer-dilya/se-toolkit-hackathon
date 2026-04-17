# Healthy habits

A full-stack student project webapp for habit tracking.

## Stack
- Backend: Python + FastAPI
- Database: PostgreSQL
- Frontend: React + Vite

## Core features implemented
- User registration and login (JWT auth)
- Profile endpoint (`/auth/me`)
- Create personal or group habits
- Habit tracking by day (habit record)
- View own habit records history
- Playful, mobile-friendly frontend UI

## Project structure
- `backend/` FastAPI app and database models
- `frontend/` React app built with Vite
- `docker-compose.yml` local PostgreSQL

## Quick start

### 1) Start PostgreSQL
From project root:

```powershell
docker compose up -d
```

### 2) Run backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload
```

Backend will run at `http://localhost:8000`.
Swagger docs are at `http://localhost:8000/docs`.

### 3) Run frontend
Open another terminal:

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Frontend will run at `http://localhost:5173`.

## API overview

### Auth
- `POST /auth/register` create account
- `POST /auth/login` get bearer token
- `GET /auth/me` current user profile

### Habits
- `POST /habits` create habit
- `GET /habits` list personal habits + all group habits
- `POST /habits/{habit_id}/records` add a day record for current user
- `GET /habits/{habit_id}/records` list current user records for habit

## Notes
- Tables are auto-created on app startup.
- Current implementation is intended as a clean MVP for coursework.
- For production, add migrations, stronger validation/rate limits, refresh tokens, and tests.
