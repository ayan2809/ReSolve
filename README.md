# ReSolve

**Strict Spaced Repetition for DSA Mastery**

ReSolve enforces deep mastery of coding problems through **strict, date-bound spaced repetition**. Unlike lenient learning apps, ReSolve requires discipline: miss a scheduled review day, and the entire repetition chain is invalidated.

> 🎯 **Philosophy**: This is a cognitive discipline tool, not a gamified learning app.

---

## 🚀 Live Demo

- **Frontend**: https://d3vephc4zfhy4e.cloudfront.net
- **API**: https://q7muc2ewmpblmgy767v7vgs3vu0rejim.lambda-url.ap-southeast-2.on.aws

---

## 📚 Features

### 1. Problem Bank (`/problems`)
Track all your DSA problems in one place.

- Add problems with title, URL, platform, difficulty, and tags
- Search/filter by title or tags
- Quick "Mark as Solved" action
- Direct links to problem URLs

### 2. Spaced Repetition System (`/reviews`)
Automatic **1d → 7d → 30d → 90d** review schedule.

When you add a problem, it's auto-scheduled for reviews. Reviews appear on exact scheduled days only.

**Submit reviews with:**
- Solved (yes/no)
- Time taken
- Approach summary
- Mistakes notes
- Confidence score (1-5)

**STRICT ENFORCEMENT:**
- ❌ Miss a day = chain invalidated
- ❌ No carry-over to next day
- ❌ No automatic recovery
- ✅ Must explicitly restart from Day 1

### 3. Failure Reflection System (`/reflections`)
When a review is missed, you must record **why**.

- Free-text reflection (required): "Why did I fail?"
- Structured reasons (optional multi-select):
  - Forgot approach
  - Implementation mistakes
  - Time pressure
  - Overconfidence
  - Fatigue/distraction
  - Context switching
  - Other
- Reflections are **immutable** — permanent learning record

### 4. Insights Dashboard (`/insights`)
Analytics for understanding how learning fails.

| Metric | What It Shows |
|--------|---------------|
| **Total Failures** | How many problems failed spaced rep |
| **Failures by Interval** | % at 1d vs 7d vs 30d vs 90d (memory decay patterns) |
| **Failures by Tag** | Which categories you struggle with most |
| **Overconfidence Rate** | High confidence → failure correlation |
| **Time-of-Day** | When you fail most (fatigue detection) |
| **Failure Streaks** | Consecutive failure days (burnout awareness) |

### 5. Activity Calendar (Dashboard)
GitHub-style heatmap of daily activity for the last 365 days.

### 6. User Profile (`/profile`)
Personalize with username, display name, and bio.

---

## 🔄 Recommended Daily Workflow

```
1. Open ReSolve at CONSISTENT TIME (morning recommended)

2. Go to /reviews
   - Complete ALL scheduled reviews for today
   - Submit with honest confidence scores
   - Write approach summaries

3. If you solved new problems today:
   - Add them to /problems
   - They'll auto-schedule for 1d review

4. If you missed yesterday:
   - Check /insights for failed problems
   - Record reflection for each
   - Decide: restart or accept the loss

5. Weekly: Check /insights
   - Identify weak areas (tags with high failure)
   - Note overconfidence patterns
   - Adjust study schedule if burnout detected
```

---

## 🎓 Pro Tips

1. **Consistency over intensity** — 15 min daily beats 3-hour weekly sessions
2. **Trust the intervals** — The 1-7-30-90 schedule is science-backed
3. **Failures are data** — Don't restart immediately; analyze first
4. **Tag wisely** — Good tags enable useful analytics later
5. **Morning reviews** — Lower fatigue = better retention
6. **Accept terminal failures** — Some problems will fail repeatedly. That's information about where to focus.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React (Vite), TailwindCSS, Lucide React |
| **Backend** | FastAPI, SQLModel, Pydantic, Mangum |
| **Database** | PostgreSQL (Supabase) |
| **Auth** | Supabase Auth (JWT) |
| **AI** | Google Gemini 2.0 Flash (Failure Analysis) |
| **Deployment** | AWS Lambda, API Gateway, S3, CloudFront |
| **IaC** | Serverless Framework |

---

## 🏗️ System Architecture

```mermaid
flowchart TB
    subgraph Client["🖥️ Client"]
        Browser["Browser"]
        React["React SPA"]
    end

    subgraph AWS["☁️ AWS"]
        CF["CloudFront"]
        S3["S3"]
        Lambda["Lambda<br/>(FastAPI)"]
        Cron["⏰ Daily Cron"]
    end

    subgraph External["🔌 External"]
        Supabase["Supabase<br/>(Auth + DB)"]
        Gemini["Gemini AI"]
    end

    Browser --> CF --> S3
    React -->|JWT| Lambda
    Lambda --> Supabase
    Lambda --> Gemini
    Cron --> Lambda
```

> 📖 See [DOCUMENTATION.md](./DOCUMENTATION.md) for detailed Low-Level Design diagrams.

---

## 🧑‍💻 Local Development

### Prerequisites
- Python 3.12+
- Node.js 18+
- PostgreSQL (or Supabase account)

### Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL="postgresql://user:pass@host:5432/dbname"
export SUPABASE_ANON_KEY="your-anon-key"

# Run locally
uvicorn main:app --reload
```

### Frontend Setup
```bash
cd frontend
npm install

# Create .env.local
echo "VITE_SUPABASE_URL=https://your-project.supabase.co" > .env.local
echo "VITE_SUPABASE_ANON_KEY=your-anon-key" >> .env.local
echo "VITE_API_URL=http://localhost:8000" >> .env.local

npm run dev
```

### Deploy to AWS
```bash
cd backend
npx serverless deploy
```

---

## 📊 Database Schema

### Tables
- `problems` — Problem metadata (title, URL, tags, difficulty)
- `attempts` — Individual solve attempts with notes
- `review_schedules` — Spaced repetition schedule entries
- `failure_reflections` — Reflection records when reviews missed
- `user_profiles` — User preferences

### Review Schedule Status Values
| Status | Meaning |
|--------|---------|
| `pending` | Awaiting review on scheduled date |
| `completed` | Successfully reviewed |
| `failed_attempt` | User submitted but didn't solve |
| `expired` | **TERMINAL** — Missed scheduled date |
| `cancelled` | Cancelled due to reset |

---

## 🔐 Environment Variables

### Backend (`serverless.yml` or `.env`)
```
DATABASE_URL=postgresql://...
SUPABASE_ANON_KEY=...
NOTIFICATION_TIME=09:00
```

### Frontend (`.env.local`)
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_API_URL=https://your-api-url
```

---

## 📁 Project Structure

```
ReSolve/
├── backend/
│   ├── main.py              # FastAPI app entry
│   ├── models.py            # SQLModel database models
│   ├── schemas.py           # Pydantic request/response schemas
│   ├── database.py          # Database connection
│   ├── auth.py              # JWT authentication
│   ├── routers/
│   │   ├── problems.py      # Problem CRUD
│   │   ├── reviews.py       # Review submission + strict enforcement
│   │   ├── reflections.py   # Failure reflection capture
│   │   ├── analytics.py     # Insights dashboard data
│   │   ├── stats.py         # Activity calendar
│   │   └── profile.py       # User profile
│   ├── services/
│   │   ├── scheduler_logic.py  # Spaced rep + expiration logic
│   │   └── notifications.py    # Daily notification service
│   └── serverless.yml       # AWS deployment config
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── ProblemList.jsx
│   │   │   ├── ReviewSession.jsx
│   │   │   ├── Insights.jsx
│   │   │   ├── Profile.jsx
│   │   │   └── Login.jsx
│   │   ├── components/
│   │   │   ├── Layout.jsx
│   │   │   └── ActivityCalendar.jsx
│   │   └── context/
│   │       └── AuthContext.jsx
│   └── index.html
│
└── README.md
```

---

## 📜 Design Philosophy

1. **Strict Reset**: Failure resets everything — no partial credit
2. **No Gamification**: No points, no streaks, no celebrations
3. **Reflection over Retry**: Understand failures before restarting
4. **Clarity over Decoration**: Minimal, functional UI
5. **Discipline as Feature**: The strictness IS the value proposition

---

## 📄 License

MIT

---

Built with discipline. 🧠
