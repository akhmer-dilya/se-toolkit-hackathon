# Healthy habits

A full-stack student project webapp for habit tracking.

## Stack
- Backend: Python + FastAPI
- Database: PostgreSQL
- Frontend: React + Vite

## Core features implemented
- User registration and login (access + refresh JWT auth)
- Token refresh, logout revocation, and password reset flow (dev token)
- Profile updates (timezone) and avatar upload
- Create personal or real-group habits
- Group creation, join by invite code, and group leaderboard
- Habit tracking by day (timezone-aware default date)
- Analytics dashboard with weekly chart, adherence, and streaks
- Playful, mobile-first frontend UI
- Automated tests for backend (auth/habits) and frontend component flow

## Project structure
- `backend/` FastAPI app and database models
- `frontend/` React app built with Vite
- `docker-compose.yml` local PostgreSQL

## Quick start

### 1) Start everything (recommended)
From project root:

```bash
bash start_all.sh
```

This script:
- starts Postgres
- installs backend/frontend dependencies if needed
- runs Alembic migrations
- starts backend + frontend in background

### 2) Manual startup (optional)

#### 2.1 Start PostgreSQL
From project root:

```powershell
docker compose up -d
```

#### 2.2 Run backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
alembic upgrade head
uvicorn app.main:app --reload
```

Backend will run at `http://localhost:8000`.
Swagger docs are at `http://localhost:8000/docs`.

#### 2.3 Run frontend
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
- `POST /auth/login` get access + refresh tokens
- `POST /auth/refresh` rotate tokens
- `POST /auth/logout` revoke refresh token
- `POST /auth/forgot-password` generate reset token (dev mode)
- `POST /auth/reset-password` set new password
- `GET /auth/me` current user profile

### Profile
- `PATCH /profile` update profile fields (timezone)
- `POST /profile/avatar` upload avatar image

### Groups
- `POST /groups` create group
- `POST /groups/join` join by invite code
- `GET /groups` list joined groups
- `GET /groups/{group_id}/leaderboard` group leaderboard

### Habits
- `POST /habits` create habit
- `GET /habits` list personal habits + joined group habits
- `POST /habits/{habit_id}/records` add a day record for current user
- `GET /habits/{habit_id}/records` list current user records for habit

### Analytics
- `GET /analytics/overview` weekly completion chart + adherence + longest streak

## Testing

### Backend
```bash
cd backend
pytest -q
```

### Frontend
```bash
cd frontend
npm test
```

## Notes
- Schema is managed by Alembic migrations (`backend/alembic`).
- `start_all.sh` should be kept updated when stack steps change.
