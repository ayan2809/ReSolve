# ReSolve - Codebase Documentation

> A spaced repetition system for competitive programmers to track, review, and master coding problems.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tech Stack](#tech-stack)
3. [Data Models](#data-models)
4. [Core Feature: Spaced Repetition](#core-feature-spaced-repetition)
5. [API Endpoints Reference](#api-endpoints-reference)
6. [Services](#services)
7. [Frontend Structure](#frontend-structure)
8. [Authentication Flow](#authentication-flow)
9. [Deployment](#deployment)
10. [Design Decisions & Nuances](#design-decisions--nuances)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Vite + React)                  │
│   Dashboard │ Problems │ Reviews │ Insights │ Profile │ About  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ Axios + Supabase JWT
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND (FastAPI + SQLModel)                │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Routers   │  │   Services  │  │        Models           │ │
│  │ • problems  │  │ • scheduler │  │ • Problem               │ │
│  │ • reviews   │  │ • tag_fetch │  │ • Attempt               │ │
│  │ • analytics │  │ • notifier  │  │ • ReviewSchedule        │ │
│  │ • profile   │  └─────────────┘  │ • FailureReflection     │ │
│  │ • stats     │                   │ • UserProfile           │ │
│  │ • tags      │                   └─────────────────────────┘ │
│  │ • reflect   │                                               │
│  └─────────────┘                                               │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE (Supabase PostgreSQL)               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, Vite, TailwindCSS, Lucide Icons |
| **Backend** | FastAPI, SQLModel, Mangum (Lambda adapter) |
| **Database** | PostgreSQL via Supabase |
| **Auth** | Supabase Auth (Magic Link) |
| **Deployment** | AWS Lambda + CloudFront via Serverless Framework |
| **Cron** | AWS Lambda scheduled event (daily) |

---

## Data Models

### Problem
```python
class Problem:
    id: int
    user_id: str           # Supabase user UUID
    title: str             # Problem name
    platform: str          # "leetcode" | "codeforces"
    url: str               # Problem URL
    tags: List[str]        # ["dynamic-programming", "array"]
    difficulty: str        # "easy" | "medium" | "hard"
    created_at: datetime
```

### Attempt
```python
class Attempt:
    id: int
    user_id: str
    problem_id: int        # FK → Problem
    attempt_number: int    # Auto-incremented per problem
    attempt_date: datetime
    solved: bool           # Did user solve it?
    time_taken_minutes: int
    approach_summary: str  # User's notes on approach
    mistakes_notes: str    # Optional notes on mistakes
    confidence_score: int  # 1-5 scale
```

### ReviewSchedule
```python
class ReviewSchedule:
    id: int
    problem_id: int        # FK → Problem
    scheduled_date: date   # When review is due
    interval_label: str    # "1d" | "7d" | "30d" | "90d"
    status: str            # See status values below
```

**Status Values:**
| Status | Meaning |
|--------|---------|
| `pending` | Awaiting review on scheduled_date |
| `completed` | Successfully reviewed and solved |
| `failed_attempt` | User attempted but didn't solve |
| `expired` | Missed the scheduled date (auto-set by cron) |
| `cancelled` | Cancelled due to chain reset or restart |

### FailureReflection
```python
class FailureReflection:
    id: int
    user_id: str
    problem_id: int
    review_schedule_id: int
    failure_date: date
    interval_label: str
    reflection_text: str        # Required: "Why did I fail?"
    structured_reasons: List    # Multi-select from predefined list
    failure_hour: int           # 0-23
    last_confidence_score: int  # From last successful attempt
```

### UserProfile
```python
class UserProfile:
    id: int
    user_id: str           # Supabase user UUID
    username: str
    display_name: str
    bio: str
    created_at: datetime
    updated_at: datetime
```

---

## Core Feature: Spaced Repetition

### The Algorithm

When a user **first solves** a problem, the system generates 4 review schedules:

```
Day 1 → Day 7 → Day 30 → Day 90
```

Each review must be completed **on the exact scheduled day**.

### Strict Enforcement Rules

| Scenario | What Happens |
|----------|--------------|
| ✅ **Completed on time** | Status → `completed`, chain continues |
| ❌ **Failed attempt** | Status → `failed_attempt`, chain resets to Day 1 |
| ⏰ **Missed entirely** | Status → `expired`, chain resets to Day 1 |

### Key Implementation Details

**File:** `services/scheduler_logic.py`

```python
INTERVALS = [1, 7, 30, 90]

def generate_initial_schedules(session, problem_id, start_date):
    """Creates 4 review schedules from start_date"""
    for days in INTERVALS:
        scheduled_date = start_date + timedelta(days=days)
        schedule = ReviewSchedule(
            problem_id=problem_id,
            scheduled_date=scheduled_date,
            interval_label=f"{days}d",
            status="pending"
        )
        session.add(schedule)
```

**Auto-Restart Logic:** When a review expires or fails:
1. All future pending reviews for that problem are `cancelled`
2. Fresh 1d/7d/30d/90d schedules are generated from today

---

## API Endpoints Reference

### Problems Router (`/problems`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/problems` | Create a new problem |
| `GET` | `/problems` | List problems with filtering |
| `GET` | `/problems/filters` | Get available filter options |
| `GET` | `/problems/{id}` | Get single problem |
| `POST` | `/problems/{id}/attempts` | Record an attempt |
| `GET` | `/problems/{id}/attempts` | List attempts for problem |

**Filter Parameters for `GET /problems`:**

| Param | Values | Description |
|-------|--------|-------------|
| `status` | `active`, `failed`, `completed`, `new` | Filter by computed status |
| `due` | `today`, `week`, `overdue` | Filter by review urgency |
| `platform` | `leetcode`, `codeforces`, etc. | Filter by platform |
| `difficulty` | `easy`, `medium`, `hard` | Filter by difficulty |
| `tags` | comma-separated | Filter by tags (OR logic) |
| `q` | string | Search by title |
| `sort` | `created_desc`, `created_asc`, `next_review`, `failure_count` | Sort order |

**Response includes computed fields:**
- `status`: derived from ReviewSchedule data
- `next_review_date`: nearest pending review
- `failure_count`: total failed/expired reviews

**Important:** First successful attempt triggers schedule generation.

### Reviews Router (`/reviews`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/reviews/today` | Get today's pending reviews |
| `GET` | `/reviews/upcoming` | Get next 7 days of reviews |
| `POST` | `/reviews/{id}/submit` | Submit a review attempt |
| `POST` | `/reviews/{problem_id}/restart` | Restart from Day 1 |
| `GET` | `/reviews/failed` | List expired problems |

**Submit Flow:**
1. Validates review is for today (strict enforcement)
2. Creates an `Attempt` record
3. If solved → `completed`
4. If failed → `failed_attempt`, resets chain

### Analytics Router (`/analytics`)

| Endpoint | Description |
|----------|-------------|
| `/analytics/summary` | Overview: total failures, common interval, problem tag |
| `/analytics/failure-log` | Paginated list of failed reviews |
| `/analytics/failure-by-interval` | Distribution across 1d/7d/30d/90d |
| `/analytics/failure-by-tag` | Top 10 tags with most failures |
| `/analytics/confidence-outcome` | Overconfidence analysis |
| `/analytics/failure-streaks` | Consecutive failure days |
| `/analytics/completion-streak` | Consecutive completion days |

**Data Source:** All analytics derive from `ReviewSchedule.status` (not `FailureReflection`).

### Tags Router (`/tags`)

| Endpoint | Description |
|----------|-------------|
| `/tags/fetch?url=...` | Fetch suggested tags from LeetCode/Codeforces |
| `/tags/detect-platform?url=...` | Detect platform from URL |

**Design:** Manual button-triggered only. Returns suggestions, no DB writes.

### Profile Router (`/profile`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/profile` | Get profile (creates if missing) |
| `PUT` | `/profile` | Update profile fields |

### Stats Router (`/stats`)

| Endpoint | Description |
|----------|-------------|
| `/stats/activity` | Last 365 days of attempt counts (for heatmap) |

---

## Services

### Scheduler Logic (`services/scheduler_logic.py`)

| Function | Purpose |
|----------|---------|
| `generate_initial_schedules()` | Creates 1d/7d/30d/90d schedules |
| `expire_missed_reviews()` | Marks overdue reviews as expired + auto-restarts |
| `handle_review_submission()` | Processes review completion/failure |
| `run_daily_reviews()` | Lambda cron handler |

### Tag Fetcher (`services/tag_fetcher.py`)

| Function | Purpose |
|----------|---------|
| `detect_platform()` | Returns "leetcode" | "codeforces" | null |
| `fetch_leetcode_tags()` | GraphQL query to LeetCode |
| `fetch_codeforces_tags()` | API query to Codeforces |
| `fetch_tags_from_url()` | Main entry point |

### Notifications (`services/notifications.py`)

| Class | Purpose |
|-------|---------|
| `ConsoleNotification` | Logs to console (default) |
| `DiscordNotification` | Sends to Discord webhook |
| `send_daily_review_notification()` | Sends daily summary |

---

## Frontend Structure

```
frontend/src/
├── api/
│   └── client.js          # Axios with Supabase JWT interceptor
├── context/
│   └── AuthContext.jsx    # Auth state management
├── lib/
│   └── supabase.js        # Supabase client init
├── components/
│   ├── Layout.jsx         # Collapsible sidebar
│   └── ActivityCalendar.jsx
├── pages/
│   ├── Dashboard.jsx      # Home with stats, today's focus
│   ├── ProblemList.jsx    # CRUD + filtering/sorting
│   ├── ReviewSession.jsx  # Daily review workflow
│   ├── Insights.jsx       # Analytics dashboard
│   ├── Profile.jsx        # User settings
│   ├── About.jsx          # Feature documentation
│   └── Login.jsx          # Magic link auth
├── public/
│   └── logo.png           # App favicon/logo
└── App.jsx                # Routes + ProtectedRoute
```

### Key Frontend Components

| Component | Purpose |
|-----------|---------|
| `Layout` | Collapsible sidebar, nav items, user section |
| `ActivityCalendar` | GitHub-style heatmap from `/stats/activity` |
| `ProtectedRoute` | Redirects to login if not authenticated |

### Problem List Features

The Problem Bank page (`ProblemList.jsx`) includes:

- **Collapsible filter panel** with dropdowns for Status, Due, Platform, Difficulty
- **Search bar** for title matching
- **Sort dropdown** with 4 options: Newest, Oldest, Next Review, Most Failed
- **URL param persistence** — filters persist across page reloads and are bookmarkable
- **Enhanced problem cards** showing:
  - Status badge (Active, Failed, Completed, New)
  - Next review date
  - Failure count

---

## Authentication Flow

1. User enters email on Login page
2. Supabase sends magic link email
3. User clicks link → Supabase sets session
4. `AuthContext` tracks session state
5. `api/client.js` attaches JWT to every request
6. Backend `auth.py` extracts `user_id` from JWT claims

**Backend Auth:**
```python
def get_current_user_id(token: str = Depends(oauth2_scheme)) -> str:
    payload = jwt.get_unverified_claims(token)
    return payload.get("sub")  # Supabase user UUID
```

---

## Deployment

### Serverless Configuration (`serverless.yml`)

```yaml
service: resolve-backend
provider:
  name: aws
  runtime: python3.12
  region: ap-southeast-2

functions:
  api:
    handler: main.handler
    url: true  # Lambda function URL

  cron:
    handler: services.scheduler_logic.run_daily_reviews
    events:
      - schedule: cron(0 0 * * ? *)  # Midnight UTC daily

constructs:
  frontend:
    type: single-page-app
    path: ../frontend/dist
```

### Deploy Commands
```bash
# Build frontend
cd frontend && npm run build

# Deploy all
cd backend && npx serverless deploy
```

---

## Design Decisions & Nuances

### 1. Strict Spaced Repetition (No Grace Periods)

**Why:** Real learning requires discipline. Carried-over reviews defeat the purpose.

**Implementation:** 
- Reviews can ONLY be submitted on `scheduled_date == today`
- Missed reviews are auto-expired by daily cron
- Failed/expired automatically restart from Day 1

### 2. Analytics from ReviewSchedule (Not FailureReflection)

**Why:** `FailureReflection` requires manual user input. Analytics should populate automatically.

**Implementation:** All analytics query `ReviewSchedule.status IN ('failed_attempt', 'expired')`.

### 3. Manual Tag Fetching

**Why:** Avoid rate limits and give users control over tags.

**Implementation:** Button-triggered `/tags/fetch` returns suggestions. User can edit before saving.

### 4. Collapsible Desktop Sidebar

**Why:** More screen space for content. Mobile already had this pattern.

**Implementation:** `desktopCollapsed` state in Layout.jsx with smooth width transition.

### 5. No Soft Deletes

**Why:** Simplicity. Problems and attempts are permanent records.

**Future:** Could add `deleted_at` for soft deletes if needed.

---

## Key Files Quick Reference

| File | Purpose |
|------|---------|
| `backend/models.py` | All SQLModel database models |
| `backend/services/scheduler_logic.py` | Core spaced repetition logic |
| `backend/routers/problems.py` | Problem CRUD + filtering/sorting |
| `backend/routers/reviews.py` | Review submission and management |
| `backend/routers/analytics.py` | Insights dashboard data |
| `frontend/src/pages/ProblemList.jsx` | Problem Bank with filters |
| `frontend/src/pages/ReviewSession.jsx` | Daily review UI flow |
| `frontend/src/pages/Insights.jsx` | Analytics visualization |
| `frontend/index.html` | App title (ReSolve) and favicon |

---

## Environment Variables

### Backend (`.env`)
```
DATABASE_URL=postgresql://...
SUPABASE_ANON_KEY=eyJ...
NOTIFICATION_TIME=09:00
```

### Frontend (`.env`)
```
VITE_API_URL=https://your-lambda-url.on.aws
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## Future Enhancement Ideas

- [ ] Push notifications for daily reviews
- [ ] Problem difficulty auto-detection from platforms
- [ ] Study groups / social features
- [ ] Spaced repetition interval customization
- [ ] Export/import problem lists
- [ ] LeetCode submission tracking integration

---

## Changelog

### 2026-01-29
- **Problem List Filtering**: Added server-side filtering by status, due date, platform, difficulty, tags; sorting by created date, next review, failure count
- **Analytics Fix**: Rewrote analytics to use `ReviewSchedule.status` instead of unpopulated `FailureReflection` table
- **Branding**: Updated app title from "frontend" to "ReSolve"; added custom logo favicon
- **URL Persistence**: Filters in Problem Bank persist via URL query params
