# ReSolve - Master Project Context

This document serves as the comprehensive context guide for the ReSolve project, intended to be provided to Large Language Models (LLMs) to understand the system's architecture, data models, tech stack, and design philosophy.

> **Philosophy**: ReSolve is a spaced repetition system for competitive programmers to track, review, and master coding problems. It enforces strict, date-bound review schedules. Missing a scheduled review day invalidates the entire repetition chain. No grace periods.

---

## 1. Tech Stack

- **Frontend**: React 18, Vite, TailwindCSS, Lucide Icons
- **Backend**: FastAPI, SQLModel (ORM), Mangum (Lambda adapter)
- **Database**: PostgreSQL via Supabase
- **Authentication**: Supabase Auth (Magic Link - JWT)
- **Deployment**: AWS Lambda + CloudFront via Serverless Framework
- **AI Integration**: Google Gemini 2.0 Flash (for Failure Analysis)

---

## 2. Directory Structure

The repository is structured as a monolithic repository containing both frontend and backend. 

```
ReSolve/
├── backend/                  # FastAPI Application deployed on AWS Lambda
│   ├── main.py               # App entry point, CORS, Mango adapter
│   ├── models.py             # SQLModel DB Models (Source of truth for DB schema)
│   ├── schemas.py            # Pydantic request/response schemas
│   ├── database.py           # DB connection
│   ├── auth.py               # JWT authentication handling
│   ├── requirements.txt      # Python dependencies
│   ├── serverless.yml        # AWS Deployment config
│   ├── routers/              # API Endpoints
│   │   ├── problems.py       # Problem CRUD + filtering
│   │   ├── reviews.py        # Spaced repetition submission + enforcement
│   │   ├── reflections.py    # Failure reflection capture
│   │   ├── analytics.py      # Insights dashboard data
│   │   ├── profile.py        # User profile
│   │   ├── stats.py          # Activity calendar
│   │   └── tags.py           # Platform tag fetching
│   └── services/             # Business Logic
│       ├── scheduler_logic.py # Spaced rep 1d/7d/30d/90d generation & expiration
│       ├── failure_intelligence.py # Gemini AI context construction
│       ├── tag_fetcher.py     # LeetCode/Codeforces APIs
│       └── notifications.py   # Daily notifications
│
├── frontend/                 # React SPA
│   ├── package.json          # Node dependencies
│   ├── vite.config.js        # Vite build config
│   ├── tailwind.config.js    # Tailwind styling config
│   └── src/
│       ├── App.jsx           # Routing & Layout wrapping
│       ├── main.jsx          # React DOM entry
│       ├── api/client.js     # Axios with Supabase JWT interceptor
│       ├── context/AuthContext.jsx # Auth state management
│       ├── lib/supabase.js   # Supabase client init
│       ├── components/       # Reusable components (Layout, ActivityCalendar)
│       └── pages/            # Page-level components
│           ├── Dashboard.jsx
│           ├── ProblemList.jsx
│           ├── ReviewSession.jsx
│           ├── Insights.jsx
│           ├── Profile.jsx
│           ├── About.jsx
│           └── Login.jsx
│
├── README.md                 # Original high-level README 
├── DOCUMENTATION.md          # Original Low-Level Design Document
└── BACKEND_REVIEW.md         # Technical Review Document with critique
```

---

## 3. Database Schema (`models.py`)

The source of truth for the database schema is defined using SQLModel in `backend/models.py`. The fundamental entities are:

```python
class Problem(SQLModel):
    # Core problem entity
    id: int
    user_id: str
    title: str
    platform: str
    url: str
    difficulty: str
    created_at: datetime
    # ...relationships Note: tags field used to be JSON array, migrating to ProblemTag

class Attempt(SQLModel):
    # A single try at solving a problem
    id: int
    problem_id: int
    attempt_date: datetime
    solved: bool
    time_taken_minutes: int
    approach_summary: str
    confidence_score: int

class ReviewSchedule(SQLModel):
    # Spaced repetition instances
    id: int
    problem_id: int
    scheduled_date: date
    interval_label: str # "1d", "7d", "30d", "90d"
    status: str # "pending", "completed", "failed_attempt", "expired", "cancelled"

class FailureReflection(SQLModel):
    # Immutable record created when a schedule fails. Includes AI insights.
    id: int
    problem_id: int
    review_schedule_id: int
    reflection_text: str # User input
    structured_reasons: List[str] # ["forgot_approach", "time_pressure", ...]
    # AI Fields populated by Gemini:
    ai_failure_type: str
    ai_primary_reason: str
    ai_secondary_factors: List[str]
    ai_recommended_actions: List[str]

class UserProfile(SQLModel):
    user_id: str
    username: str
    bio: str
```

---

## 4. Key Design Decisions & Workflows

### 4.1 Spaced Repetition State Machine
- **Generation:** Solving a problem for the first time creates four future `ReviewSchedule` entries: 1 day, 7 days, 30 days, 90 days.
- **Strict Enforcement:** A `ReviewSchedule` must be completed exactly on the `scheduled_date`.
- **Missed/Failed Reviews:** If a user submits a failure (`failed_attempt`) OR misses the day completely (`expired` via daily cron job), all future schedules for that sequence are marked `cancelled`. A new sequence is generated starting from Day 1.

### 4.2 Failure Reflection System
When a scheduled review fails, the user must submit a `FailureReflection` answering "Why did I fail?". This reflection triggers an asynchronous call to Gemini 2.0 Flash (`failure_intelligence.py`), loading the previous 5 attempts and problem context. The AI returns structured reasons, categorized failures, and recommendations which are persisted in the `FailureReflection`. 

### 4.3 Background Jobs
AWS Lambda Cron executes `services.scheduler_logic.run_daily_reviews` daily at Midnight UTC. This sweeps through `ReviewSchedule` where `scheduled_date < today` and `status = pending`, forcing them to `expired` and regenerating the spaced-repetition chain.

### 4.4 Analytics Strategy
All analytics displayed on the frontend insights dashboard (`/analytics/...` routers) derive from the `ReviewSchedule` statuses, rather than the `FailureReflection` entries, to ensure consistency even if a user bypasses reflections.

---

## 5. Security Context (from Backend Review)
- JWT validation currently accepts unverified claims (`auth.py: jwt.get_unverified_claims`). This is identified as a critical vulnerability in `BACKEND_REVIEW.md`.
- CORS policy is wide open (`["*"]`). 
- **Actionable for LLM**: When adding features or changing auth logic, emphasize secure JWT decoding (`jose.jwt.decode` with Supabase secrets).

## 6. Dependencies

**Backend Packages:**
`fastapi`, `uvicorn`, `sqlmodel`, `alembic`, `psycopg2-binary`, `apscheduler`, `requests`, `python-dotenv`, `pydantic-settings`, `mangum`, `python-jose[cryptography]`, `httpx`

**Frontend Packages:**
`react`, `react-router-dom`, `vite`, `tailwindcss`, `lucide-react`, `axios`, `@supabase/supabase-js`, `clsx`, `tailwind-merge`

---

## 7. Adding Features via LLM
When providing this document to an LLM for new feature requests, you can prompt the corresponding chat with:
```
I am building a feature for the ReSolve app. Here is the context of the project:
<Pasted contents of this file>

Next, please build the following feature: [Your feature description]
```
Ensure the LLM references the exact DB schemas defined in Section 3 and the directory mappings in Section 2.
