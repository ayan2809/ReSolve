# ReSolve Backend — Technical Review & Documentation

> **Review Date:** 2026-02-05  
> **Codebase Size:** ~2,600 lines Python across 15 files  
> **Reviewer Scope:** Full backend code review for senior engineer onboarding

---

## 1. High-Level Overview

### What This Backend Does

ReSolve is a **spaced repetition system for competitive programmers**. It enforces strict, date-bound review schedules for coding problems. Unlike lenient learning apps, missing a scheduled review invalidates the entire repetition chain.

### Primary Responsibilities

| Capability | Description |
|------------|-------------|
| **Problem Tracking** | CRUD for coding problems with metadata (platform, difficulty, tags) |
| **Spaced Repetition** | 1d → 7d → 30d → 90d review scheduling with strict enforcement |
| **Review Management** | Daily reviews, submission handling, automatic chain resets |
| **Failure Analysis** | Gemini-powered AI analysis of why reviews failed |
| **Analytics** | Learning failure patterns, overconfidence detection, streak tracking |
| **User Profiles** | Basic profile management |

### Consumers

- **React SPA Frontend** — Primary consumer via REST API
- **AWS Lambda Cron** — Daily job for expiring missed reviews
- **Internal Services** — Gemini API, LeetCode/Codeforces APIs for tag fetching

---

## 2. Architecture & Design

### Overall Architecture

**Modular Monolith** deployed as a single AWS Lambda function.

```
┌─────────────────────────────────────────────────────┐
│                    FastAPI + Mangum                  │
├────────────────────┬──────────────────┬─────────────┤
│      Routers       │     Services     │    Models   │
│   (7 modules)      │   (4 modules)    │  (6 ORM)    │
└────────────────────┴──────────────────┴─────────────┘
                           │
                           ▼
               ┌─────────────────────┐
               │  Supabase Postgres  │
               └─────────────────────┘
```

### Major Components

| Component | Responsibility | Lines |
|-----------|----------------|-------|
| `main.py` | App entry, CORS, router registration | 52 |
| `models.py` | SQLModel ORM definitions | 176 |
| `routers/*` | 7 REST API modules | 1,591 |
| `services/*` | 4 business logic modules | 850 |
| `auth.py` | JWT extraction (unverified claims) | 23 |
| `settings.py` | Pydantic settings | 20 |

### Control Flow

1. Request → Lambda via Mangum adapter
2. FastAPI routing → Appropriate router
3. Router → Service layer (if complex logic)
4. Service → Models → SQLModel/SQLAlchemy → PostgreSQL
5. Response serialization via Pydantic

### Key Design Patterns

| Pattern | Usage |
|---------|-------|
| **Dependency Injection** | FastAPI `Depends()` for session and auth |
| **Repository Pattern** | Implicit — routers contain query logic |
| **Service Layer** | Explicit for scheduler, AI, notifications |
| **Enum Validation** | Pydantic enums for AI failure types |
| **Immutable Records** | FailureReflection cannot be edited/deleted |

### External Dependencies

| Service | Purpose | Integration |
|---------|---------|-------------|
| **Supabase** | Auth (JWT) + PostgreSQL | Direct DB connection |
| **Google Gemini** | Failure analysis AI | REST API via httpx |
| **LeetCode** | Tag fetching | GraphQL API |
| **Codeforces** | Tag fetching | REST API |
| **AWS Lambda** | Compute | Mangum adapter |
| **APScheduler** | Local-only scheduling | Background thread |

---

## 3. Codebase Structure

```
backend/
├── main.py              # FastAPI app, CORS, lifespan
├── models.py            # 6 SQLModel tables
├── schemas.py           # Pydantic request/response (38 lines)
├── database.py          # Engine + session factory (9 lines)
├── auth.py              # JWT extraction (23 lines)
├── settings.py          # Pydantic settings (20 lines)
├── scheduler.py         # APScheduler for local dev (27 lines)
│
├── routers/
│   ├── problems.py      # Problem CRUD + filtering (272 lines)
│   ├── reviews.py       # Review submission + restart (263 lines)
│   ├── analytics.py     # 10+ analytics endpoints (620 lines)
│   ├── reflections.py   # Immutable failure reflections (239 lines)
│   ├── profile.py       # User profile CRUD (111 lines)
│   ├── stats.py         # Activity heatmap data (36 lines)
│   └── tags.py          # Tag fetching endpoints (50 lines)
│
├── services/
│   ├── scheduler_logic.py    # Core spaced-rep logic (146 lines)
│   ├── failure_intelligence.py # Gemini integration (430 lines)
│   ├── tag_fetcher.py        # LeetCode/CF APIs (216 lines)
│   └── notifications.py      # Console/Discord notifier (58 lines)
│
├── serverless.yml       # AWS deployment config
└── requirements.txt     # Python dependencies
```

### Entry Points

| Entry Point | Handler | Trigger |
|-------------|---------|---------|
| `main.handler` | Mangum(app) | HTTP requests |
| `services.scheduler_logic.run_daily_reviews` | Lambda cron | Daily at midnight UTC |

---

## 4. API & Interfaces

### REST Endpoints (35 total)

| Router | Endpoints | Key Operations |
|--------|-----------|----------------|
| `/problems` | 5 | CRUD, filtering, attempts |
| `/reviews` | 5 | Today's reviews, submit, restart, failed |
| `/analytics` | 9 | Summary, failure-log, intervals, tags, streaks |
| `/reflections` | 4 | Create (immutable), list, by-problem |
| `/profile` | 2 | GET/PUT profile |
| `/stats` | 1 | Activity calendar data |
| `/tags` | 2 | Fetch suggestions, detect platform |

### Request/Response Patterns

**Good:**
- Consistent use of Pydantic models for validation
- Clear HTTP status codes (400, 401, 404, 500)
- Descriptive error messages

**Issues:**
- No API versioning (no `/v1/` prefix)
- Inconsistent response models — some return dict, some return Pydantic

### Cron Job

```yaml
# serverless.yml
cron:
  handler: services.scheduler_logic.run_daily_reviews
  events:
    - schedule: cron(0 0 * * ? *)  # Midnight UTC
```

**Purpose:** Expires missed reviews, auto-generates new schedules

---

## 5. Data Layer

### Database: Supabase PostgreSQL

### Tables (6)

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `problems` | Problem metadata | user_id, title, platform, tags (JSON) |
| `attempts` | Solve attempt records | problem_id, solved, confidence_score |
| `review_schedules` | Spaced-rep schedules | problem_id, scheduled_date, status |
| `failure_reflections` | Immutable failure records | reflection_text, ai_* fields |
| `user_profiles` | User settings | user_id, username, bio |
| `tags` | Normalized tag entities | name (unique), created_at |

### Schema Observations

**Design Issues:**

1. **Duplicate tag storage**: `Problem.tags` is a JSON array (deprecated), but `Tag` table exists. Many-to-many via `problem_tags` defined but **never used in queries** — all code still reads `Problem.tags`.

2. **No indexes** on frequently queried columns:
   - `review_schedules.scheduled_date` — filtered in every `/reviews/today` call
   - `review_schedules.status` — filtered constantly

3. **JSON columns** for `tags`, `structured_reasons`, `ai_secondary_factors` — limits query capability.

### Migrations

- No Alembic migrations in use (alembic.ini points to library, not project)
- Manual SQL scripts in `/migrations/`
- **Risk:** Schema drift between environments

### Transactions

- Single `session.commit()` per request
- No explicit transaction boundaries
- **Risk:** Partial writes on multi-step operations (e.g., expire + regenerate schedules)

### Caching

**None.** Every request hits PostgreSQL.

---

## 6. Configuration & Environment

### Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SUPABASE_ANON_KEY` | Yes | Supabase auth validation |
| `GEMINI_API_KEY` | No | AI failure analysis |
| `NOTIFICATION_TIME` | No | Local scheduler time (default: 09:00) |

### Settings Management

```python
# settings.py
class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://..."
    GEMINI_API_KEY: str = ""  # Empty = stub response
    
    class Config:
        env_file = ".env"
```

**Good:** Pydantic settings with `.env` support  
**Issue:** `@lru_cache` on settings means env changes require restart

### Secrets Handling

- Secrets passed via environment variables
- `GEMINI_API_KEY` logged to console if not set (warning level)
- No secrets rotation mechanism

### Local vs Production

| Aspect | Local | Production |
|--------|-------|------------|
| Scheduler | APScheduler in-process | Lambda cron |
| Database | Local PostgreSQL | Supabase |
| CORS | `*` allowed | `*` allowed (same) |

---

## 7. Observability & Operations

### Logging

```python
import logging
logger = logging.getLogger(__name__)
```

**Usage:**
- `failure_intelligence.py`: Good logging of API calls, errors
- `scheduler_logic.py`: Prints expired count
- Other modules: Minimal logging

**Issues:**
- No structured logging (no JSON format)
- No request ID propagation
- No log levels configured centrally

### Metrics

**None.** No Prometheus, CloudWatch metrics, or custom instrumentation.

### Error Handling

| Location | Quality |
|----------|---------|
| `failure_intelligence.py` | Excellent — graceful degradation, fallback |
| `profile.py` | Poor — catches all exceptions, hides root cause |
| `reviews.py` | Good — specific HTTP errors |

**Pattern in profile.py (anti-pattern):**
```python
except Exception as e:
    raise HTTPException(status_code=500, detail=str(e))
```
This leaks internal errors to clients.

### Deployment

- Serverless Framework + serverless-lift plugin
- Single Lambda function (512MB, 30s timeout)
- Frontend deployed to S3 + CloudFront via `constructs`

### Runtime Assumptions

- Lambda cold starts acceptable
- 30s timeout sufficient for Gemini calls (30s httpx timeout inside 30s Lambda = race)
- No connection pooling configured

---

## 8. Security Review

### Authentication Model

```python
# auth.py
def get_current_user_id(token: str = Depends(oauth2_scheme)) -> str:
    payload = jwt.get_unverified_claims(token)  # ⚠️ UNVERIFIED
    return payload.get("sub")
```

> [!CAUTION]
> **Critical Issue:** JWT signature is **NOT verified**. Any valid JWT structure with a `sub` claim will be accepted. This completely bypasses Supabase authentication.

**Impact:** An attacker can forge JWTs with any `user_id` and access/modify any user's data.

### Authorization

- User isolation via `WHERE Problem.user_id == user_id`
- Consistent across all endpoints
- **But:** Meaningless if auth is broken

### Input Validation

| Location | Validation |
|----------|------------|
| Pydantic schemas | Type validation, some length limits |
| reflection_text | Required, non-empty check |
| structured_reasons | Validated against `FAILURE_REASONS` enum |
| tags | No sanitization — stored as-is |

**SQL Injection:** SQLModel/SQLAlchemy parameterized queries = safe

### Attack Surfaces

| Surface | Risk |
|---------|------|
| JWT Bypass | **CRITICAL** — immediate fix needed |
| CORS `*` | High — allows any origin |
| Gemini API key in env | Medium — Lambda env visible in console |
| Rate limiting | None — DoS possible |
| LeetCode/CF APIs | Low — outbound only, timeout protected |

### CORS Configuration

```python
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "*"  # ⚠️ Wide open
]
```

The `*` makes the explicit origins irrelevant. This is likely intentional for "friends" access but is a security risk.

---

## 9. Testing & Reliability

### Test Coverage

**None.** No `tests/` directory, no pytest configuration, no test files.

### Quality Gaps

| Gap | Impact |
|-----|--------|
| No unit tests | Unknown correctness of scheduler logic |
| No integration tests | API behavior unverified |
| No contract tests | Gemini response changes could break silently |

### Failure Scenarios

| Scenario | Current Behavior |
|----------|-----------------|
| DB connection fails | 500 error, no retry |
| Gemini timeout | Fallback to stub response (good) |
| LeetCode API down | Error returned to client (acceptable) |
| Lambda timeout | Partial state possible (bad) |
| Cron overlaps | APScheduler local may overlap; Lambda has concurrency controls |

### Resilience

- **failure_intelligence.py**: Exemplary — never blocks on AI failures
- **scheduler_logic.py**: Commits after each batch (good)
- **No retry logic** anywhere else

---

## 10. Strengths

### What This Codebase Does Well

1. **Clear Domain Model**  
   The spaced repetition logic is well-encapsulated in `scheduler_logic.py`. Status transitions are explicit and documented.

2. **Strict Enforcement Philosophy**  
   The "no grace period" approach is consistently implemented. Missed reviews auto-expire and regenerate schedules.

3. **Graceful AI Degradation**  
   `failure_intelligence.py` is a model of how to integrate external AI:
   - Returns stub if API key missing
   - Catches all exceptions
   - Never blocks the primary flow

4. **Comprehensive Analytics**  
   620 lines of analytics covering failure patterns, overconfidence, streaks — well-designed for learning insights.

5. **Immutable Reflections**  
   The design decision that reflections cannot be edited creates an honest learning record.

6. **Good Pydantic Usage**  
   Schemas validate Gemini output structure, catching malformed responses early.

7. **Thoughtful Documentation**  
   Docstrings throughout explain *why*, not just *what*. Design principles are documented in module headers.

---

## 11. Weaknesses & Risks

### Critical

| Issue | Location | Impact |
|-------|----------|--------|
| **JWT not verified** | `auth.py:16` | Any forged token accepted |
| **No tests** | Entire codebase | Unknown correctness |

### High

| Issue | Location | Impact |
|-------|----------|--------|
| CORS allows `*` | `main.py:30` | Cross-site request forgery |
| No DB indexes | `review_schedules` | Performance at scale |
| Tag duplication | `models.py` | Unused Tag table, JSON array in use |
| Lambda timeout race | `failure_intelligence.py` | 30s httpx + 30s Lambda = fail |

### Medium

| Issue | Location | Impact |
|-------|----------|--------|
| No rate limiting | All endpoints | DoS vector |
| Exception swallowing | `profile.py:61,109` | Hides bugs |
| No structured logging | All services | Hard to debug in production |
| `echo=True` on engine | `database.py:4` | SQL logged in production |
| No connection pooling | `database.py` | Connection overhead |

### Low

| Issue | Location | Impact |
|-------|----------|--------|
| APScheduler in Lambda | `scheduler.py` | Runs but does nothing useful |
| Duplicate filtering logic | `problems.py` | In-memory vs SQL filtering |
| No API versioning | All routers | Can't evolve without breaking |

---

## 12. Recommendations

### Immediate (Fix Before Production)

1. **Verify JWT Signatures**
   ```python
   # Instead of get_unverified_claims:
   from jose import jwt
   
   def get_current_user_id(token: str = Depends(oauth2_scheme)) -> str:
       try:
           payload = jwt.decode(
               token, 
               settings.SUPABASE_JWT_SECRET,
               algorithms=["HS256"],
               audience="authenticated"
           )
           return payload["sub"]
       except JWTError:
           raise HTTPException(401, "Invalid token")
   ```

2. **Remove wide CORS**
   ```python
   origins = [
       "https://d3vephc4zfhy4e.cloudfront.net",
       "http://localhost:5173",
   ]
   ```

3. **Disable SQL echo in production**
   ```python
   engine = create_engine(settings.DATABASE_URL, echo=False)
   ```

### Short-Term (1-2 Sprints)

4. **Add database indexes**
   ```sql
   CREATE INDEX idx_review_schedules_date_status 
   ON review_schedules(scheduled_date, status);
   
   CREATE INDEX idx_attempts_problem_date 
   ON attempts(problem_id, attempt_date DESC);
   ```

5. **Add basic tests**
   - Unit tests for `scheduler_logic.py` state transitions
   - Integration tests for review submission flow
   - Contract tests for Gemini response parsing

6. **Fix Lambda timeout**
   ```python
   # In failure_intelligence.py
   async with httpx.AsyncClient(timeout=20.0) as client:  # Was 30
   ```

7. **Add structured logging**
   ```python
   import structlog
   logger = structlog.get_logger()
   logger.info("review_submitted", schedule_id=id, solved=True)
   ```

### Long-Term (Architecture)

8. **Migrate to proper Tag usage**
   - Use `problem_tags` join table for all queries
   - Migrate existing `Problem.tags` JSON to normalized form
   - Deprecate JSON column

9. **Add Alembic migrations**
   - Initialize proper migration history
   - Never use raw SQL scripts again

10. **API versioning**
    ```python
    app.include_router(problems.router, prefix="/v1")
    ```

11. **Rate limiting**
    ```python
    from slowapi import Limiter
    limiter = Limiter(key_func=get_remote_address)
    ```

12. **Observability stack**
    - AWS X-Ray for tracing
    - CloudWatch custom metrics
    - Structured JSON logs to CloudWatch

---

## Summary Table

| Category | Score | Notes |
|----------|-------|-------|
| **Architecture** | B | Clean modular design, good separation |
| **Code Quality** | B+ | Well-documented, consistent style |
| **API Design** | B- | Missing versioning, inconsistent responses |
| **Security** | F | JWT bypass is critical |
| **Performance** | C | No indexes, no caching |
| **Reliability** | C+ | Gemini handled well, others not |
| **Observability** | D | Minimal logging, no metrics |
| **Testing** | F | Zero coverage |

---

*Document prepared for senior engineer onboarding. Direct questions to the reviewing architect.*
