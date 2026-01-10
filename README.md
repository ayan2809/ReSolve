# ReSolve

ReSolve is a spaced-repetition tracking tool for coding problems. It enforces deep mastery by scheduling reviews at 1d, 7d, 30d, and 90d intervals based on a strictly deterministic logic.

## Stack
- **Backend**: FastAPI, SQLModel (PostgreSQL), Alembic, APScheduler.
- **Frontend**: React (Vite), TailwindCSS, Lucide React.
- **Database**: PostgreSQL.

## Prerequisites
- Python 3.9+
- Node.js 16+
- PostgreSQL running locally.

## Setup

### 1. Database
Ensure PostgreSQL is running and you have a user/password or trust configuration.
The default configuration expects:
- URL: `postgresql://postgres:postgres@localhost:5432/resolve`

You can change this in `backend/.env` (create it if needed) or `backend/settings.py`.

### 2. Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# Run migrations
alembic upgrade head
cd ..
# Start server (from root)
uvicorn backend.main:app --reload
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

## Features
- **Problem Bank**: Add problems from LeetCode/others.
- **Spaced Repetition**: First solve triggers the 1/7/30/90 day schedule.
- **Review Session**: Daily list of problems to review.
    - **Pass**: Marks review done.
    - **Fail**: Resets the entire schedule from today.
- **Notifications**: Daily console logs (or Discord Webhook if configured).

## Design Decisions
- **Strict Reset**: Failure resets the schedule to enforce mastery.
- **No Gamification**: Pure tracking and reflection.
- **Rich UI**: High-contrast dark mode for focus.

## Configuration
- `NOTIFICATION_TIME`: Set in `backend/settings.py` or env var (Default "09:00").
