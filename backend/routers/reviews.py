from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload
from typing import List
from datetime import date

from database import get_session
from models import ReviewSchedule, Attempt, Problem
from schemas import ReviewScheduleRead, AttemptCreate, ProblemRead
from services.scheduler_logic import handle_review_submission, expire_missed_reviews, generate_initial_schedules

router = APIRouter(prefix="/reviews", tags=["reviews"])

from auth import get_current_user_id


@router.get("/today", response_model=List[ReviewScheduleRead])
def get_todays_reviews(
    session: Session = Depends(get_session),
    user_id: str = Depends(get_current_user_id)
):
    """
    Get reviews scheduled for TODAY only.
    
    STRICT SPACED REPETITION ENFORCEMENT:
    - First expires any pending reviews from past dates
    - Then returns ONLY reviews scheduled for exactly today
    - No carry-over from previous days
    """
    # CRITICAL: Expire any missed reviews before returning today's list
    # This ensures strict discipline - missed reviews are terminal
    expire_missed_reviews(session, user_id)
    
    today = date.today()
    
    # STRICT DATE MATCHING: Only return reviews for exactly TODAY
    # Using == instead of <= ensures no carry-over
    statement = (
        select(ReviewSchedule)
        .join(Problem)
        .options(selectinload(ReviewSchedule.problem))
        .where(ReviewSchedule.status == "pending")
        .where(ReviewSchedule.scheduled_date == today)  # STRICT: exactly today only
        .where(Problem.user_id == user_id)
        .order_by(ReviewSchedule.scheduled_date)
    )
    reviews = session.exec(statement).all()
    return reviews


@router.get("/upcoming", response_model=List[ReviewScheduleRead])
def get_upcoming_reviews(
    session: Session = Depends(get_session),
    user_id: str = Depends(get_current_user_id)
):
    """
    Get pending reviews for the next 7 days (excluding today).
    Used to show "Next review in X days" on Dashboard.
    """
    from datetime import timedelta
    today = date.today()
    week_ahead = today + timedelta(days=7)
    
    statement = (
        select(ReviewSchedule)
        .join(Problem)
        .options(selectinload(ReviewSchedule.problem))
        .where(ReviewSchedule.status == "pending")
        .where(ReviewSchedule.scheduled_date > today)
        .where(ReviewSchedule.scheduled_date <= week_ahead)
        .where(Problem.user_id == user_id)
        .order_by(ReviewSchedule.scheduled_date)
    )
    reviews = session.exec(statement).all()
    return reviews


@router.get("/failed", response_model=List[ProblemRead])
def get_failed_problems(
    session: Session = Depends(get_session),
    user_id: str = Depends(get_current_user_id)
):
    """
    Returns problems where the user missed a scheduled review,
    causing the entire repetition chain to be invalidated.
    
    These problems are NOT automatically re-added to the review system.
    The user must explicitly call /reviews/{problem_id}/restart to
    begin a new repetition cycle from Day 1.
    
    This list is for analysis and tracking of discipline failures.
    """
    # First, ensure expiration has run
    expire_missed_reviews(session, user_id)
    
    # Find problems with expired reviews (missed their scheduled date)
    statement = (
        select(Problem)
        .join(ReviewSchedule)
        .where(ReviewSchedule.status == "expired")
        .where(Problem.user_id == user_id)
        .distinct()
    )
    failed_problems = session.exec(statement).all()
    return failed_problems


@router.post("/{problem_id}/restart")
def restart_spaced_repetition(
    problem_id: int,
    session: Session = Depends(get_session),
    user_id: str = Depends(get_current_user_id)
):
    """
    Restarts spaced repetition for a problem from Day 1.
    
    STRICT SPACED REPETITION:
    This is the ONLY way to re-enter the repetition system after a failure.
    Creates a fresh schedule: 1d, 7d, 30d, 90d from today.
    
    Past attempts and expired schedules remain in history for analysis.
    """
    # Verify ownership
    problem = session.exec(
        select(Problem)
        .where(Problem.id == problem_id)
        .where(Problem.user_id == user_id)
    ).first()
    
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Cancel any existing pending schedules (shouldn't be any, but be safe)
    existing = session.exec(
        select(ReviewSchedule).where(
            ReviewSchedule.problem_id == problem_id,
            ReviewSchedule.status == "pending"
        )
    ).all()
    for sched in existing:
        sched.status = "cancelled"
        session.add(sched)
    
    # Generate fresh schedule starting from today
    generate_initial_schedules(session, problem_id, date.today())
    
    return {
        "message": "Spaced repetition restarted from Day 1",
        "problem_id": problem_id,
        "new_schedule": ["1d", "7d", "30d", "90d"]
    }


@router.post("/{schedule_id}/submit")
def submit_review(
    schedule_id: int,
    attempt_data: AttemptCreate,
    session: Session = Depends(get_session),
    user_id: str = Depends(get_current_user_id)
):
    """
    Submit a review attempt for a scheduled review.
    
    If solved: Mark as completed, continue the repetition chain.
    If not solved: Mark as failed_attempt, reset the chain from Day 1.
    """
    # Verify ownership via join
    review = session.exec(
        select(ReviewSchedule)
        .join(Problem)
        .where(ReviewSchedule.id == schedule_id)
        .where(Problem.user_id == user_id)
    ).first()

    if not review:
        raise HTTPException(status_code=404, detail="Review schedule not found")
        
    if review.status != "pending":
         raise HTTPException(status_code=400, detail="Review already completed or cancelled")
    
    # Additional check: ensure the review is for today (strict enforcement)
    today = date.today()
    if review.scheduled_date != today:
        raise HTTPException(
            status_code=400, 
            detail=f"This review was scheduled for {review.scheduled_date}, not today. Missed reviews cannot be submitted."
        )

    # 1. Create the Attempt Record
    from sqlalchemy import func
    count = session.exec(
        select(func.count()).where(Attempt.problem_id == review.problem_id)
    ).one()
    attempt_number = count + 1
    
    new_attempt = Attempt(
        problem_id=review.problem_id,
        user_id=user_id,
        attempt_number=attempt_number,
        **attempt_data.model_dump()
    )
    session.add(new_attempt)
    session.commit()
    
    # 2. Handle Schedule Logic (Update status, reset if fail)
    handle_review_submission(
        session, 
        schedule_id, 
        attempt_data.solved, 
        new_attempt.attempt_date.date()
    )
    
    return {"message": "Review submitted successfully", "attempt_id": new_attempt.id}
