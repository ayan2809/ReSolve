from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func, or_, and_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import date, timedelta

from database import get_session
from models import Problem, Attempt, ReviewSchedule
from schemas import ProblemCreate, ProblemRead, AttemptCreate, AttemptRead
from services.scheduler_logic import generate_initial_schedules
from auth import get_current_user_id

router = APIRouter(prefix="/problems", tags=["problems"])


class ProblemWithMeta(ProblemRead):
    """Extended problem response with computed metadata."""
    status: Optional[str] = None  # active, failed, completed, new
    next_review_date: Optional[date] = None
    failure_count: int = 0


@router.post("", response_model=ProblemRead)
def create_problem(
    problem: ProblemCreate, 
    session: Session = Depends(get_session),
    user_id: str = Depends(get_current_user_id)
):
    db_problem = Problem(**problem.model_dump(), user_id=user_id)
    session.add(db_problem)
    session.commit()
    session.refresh(db_problem)
    return db_problem


@router.get("")
def read_problems(
    # Filters
    status: Optional[str] = Query(None, description="active|failed|completed|new"),
    due: Optional[str] = Query(None, description="today|week|overdue"),
    platform: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None),
    tags: Optional[str] = Query(None, description="Comma-separated tags (OR logic)"),
    q: Optional[str] = Query(None, description="Title search"),
    # Sorting
    sort: str = Query("created_desc", description="created_desc|created_asc|next_review|failure_count"),
    # Pagination
    offset: int = 0,
    limit: int = Query(default=100, le=100),
    # Dependencies
    session: Session = Depends(get_session),
    user_id: str = Depends(get_current_user_id)
) -> List[dict]:
    """
    Get problems with filtering and sorting.
    
    Filters:
    - status: active (has pending), failed (has failed/expired), completed (all done), new (no schedules)
    - due: today, week, overdue
    - platform: leetcode, codeforces, etc.
    - difficulty: easy, medium, hard
    - tags: comma-separated list (OR logic)
    - q: title search
    
    Sort:
    - created_desc: Newest first (default)
    - created_asc: Oldest first
    - next_review: Nearest pending review first
    - failure_count: Most failures first
    """
    today = date.today()
    
    # Get all problems for user with their schedules
    base_query = (
        select(Problem)
        .options(selectinload(Problem.schedules))
        .where(Problem.user_id == user_id)
    )
    
    # Apply basic filters
    if platform:
        base_query = base_query.where(func.lower(Problem.platform) == platform.lower())
    
    if difficulty:
        base_query = base_query.where(func.lower(Problem.difficulty) == difficulty.lower())
    
    if q:
        base_query = base_query.where(Problem.title.ilike(f"%{q}%"))
    
    # Execute query
    problems = session.exec(base_query).all()
    
    # Compute metadata for each problem
    result = []
    for p in problems:
        schedules = p.schedules
        
        # Compute status
        has_pending = any(s.status == "pending" for s in schedules)
        has_failed = any(s.status in ("failed_attempt", "expired") for s in schedules)
        all_completed = schedules and all(s.status in ("completed", "cancelled") for s in schedules)
        
        if has_pending:
            computed_status = "active"
        elif has_failed:
            computed_status = "failed"
        elif all_completed:
            computed_status = "completed"
        else:
            computed_status = "new"
        
        # Compute next review date
        pending_schedules = [s for s in schedules if s.status == "pending"]
        next_review = min((s.scheduled_date for s in pending_schedules), default=None)
        
        # Compute failure count
        failure_count = sum(1 for s in schedules if s.status in ("failed_attempt", "expired"))
        
        # Apply status filter
        if status and computed_status != status:
            continue
        
        # Apply due filter
        if due:
            if due == "today":
                if not (next_review and next_review == today):
                    continue
            elif due == "week":
                week_end = today + timedelta(days=7)
                if not (next_review and today <= next_review <= week_end):
                    continue
            elif due == "overdue":
                # Problems with expired schedules
                if not any(s.status == "expired" for s in schedules):
                    continue
        
        # Apply tags filter (OR logic)
        if tags:
            tag_list = [t.strip().lower() for t in tags.split(",") if t.strip()]
            problem_tags = [t.lower() for t in p.tags]
            if not any(t in problem_tags for t in tag_list):
                continue
        
        result.append({
            "id": p.id,
            "title": p.title,
            "platform": p.platform,
            "url": p.url,
            "tags": p.tags,
            "difficulty": p.difficulty,
            "created_at": p.created_at,
            "status": computed_status,
            "next_review_date": next_review.isoformat() if next_review else None,
            "failure_count": failure_count
        })
    
    # Apply sorting
    if sort == "created_desc":
        result.sort(key=lambda x: x["created_at"], reverse=True)
    elif sort == "created_asc":
        result.sort(key=lambda x: x["created_at"])
    elif sort == "next_review":
        # Sort by next review date, nulls last
        result.sort(key=lambda x: (x["next_review_date"] is None, x["next_review_date"] or "9999-99-99"))
    elif sort == "failure_count":
        result.sort(key=lambda x: x["failure_count"], reverse=True)
    
    # Apply pagination
    return result[offset:offset + limit]


@router.get("/filters")
def get_filter_options(
    session: Session = Depends(get_session),
    user_id: str = Depends(get_current_user_id)
) -> dict:
    """
    Get available filter options based on user's problems.
    Returns unique platforms, difficulties, and tags.
    """
    problems = session.exec(
        select(Problem).where(Problem.user_id == user_id)
    ).all()
    
    platforms = set()
    difficulties = set()
    all_tags = set()
    
    for p in problems:
        platforms.add(p.platform)
        difficulties.add(p.difficulty)
        for tag in p.tags:
            all_tags.add(tag.lower())
    
    return {
        "platforms": sorted(platforms),
        "difficulties": sorted(difficulties),
        "tags": sorted(all_tags)
    }


@router.get("/{problem_id}", response_model=ProblemRead)
def read_problem(
    problem_id: int, 
    session: Session = Depends(get_session),
    user_id: str = Depends(get_current_user_id)
):
    problem = session.get(Problem, problem_id)
    if not problem or problem.user_id != user_id:
        raise HTTPException(status_code=404, detail="Problem not found")
    return problem


@router.post("/{problem_id}/attempts", response_model=AttemptRead)
def create_attempt(
    problem_id: int, 
    attempt_data: AttemptCreate, 
    session: Session = Depends(get_session),
    user_id: str = Depends(get_current_user_id)
):
    problem = session.get(Problem, problem_id)
    if not problem or problem.user_id != user_id:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Calculate attempt number
    count_statement = select(func.count()).where(Attempt.problem_id == problem_id)
    attempt_number = session.exec(count_statement).one() + 1
    
    # Create Attempt
    db_attempt = Attempt(
        problem_id=problem_id,
        user_id=user_id,
        attempt_number=attempt_number,
        **attempt_data.model_dump()
    )
    session.add(db_attempt)
    session.commit()
    session.refresh(db_attempt)
    
    # Check if this is the first SUCCESSFUL attempt to trigger schedules
    if db_attempt.solved:
        previous_success = session.exec(
            select(Attempt)
            .where(Attempt.problem_id == problem_id)
            .where(Attempt.solved == True)
            .where(Attempt.id != db_attempt.id)
        ).first()
        
        if not previous_success:
            generate_initial_schedules(session, problem_id, db_attempt.attempt_date.date())
            
    return db_attempt


@router.get("/{problem_id}/attempts", response_model=List[AttemptRead])
def read_attempts(
    problem_id: int, 
    session: Session = Depends(get_session),
    user_id: str = Depends(get_current_user_id)
):
    # Verify ownership
    problem = session.get(Problem, problem_id)
    if not problem or problem.user_id != user_id:
        raise HTTPException(status_code=404, detail="Problem not found")

    attempts = session.exec(
        select(Attempt)
        .where(Attempt.problem_id == problem_id)
        .order_by(Attempt.attempt_date.desc())
    ).all()
    return attempts
