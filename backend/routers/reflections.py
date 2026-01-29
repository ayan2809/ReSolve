"""
Reflection Router - Captures failure reflections for learning analysis.

IMMUTABLE: Reflections cannot be edited or deleted once created.
This forms a permanent record for understanding how learning fails.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date

from database import get_session
from models import FailureReflection, Problem, ReviewSchedule, Attempt, FAILURE_REASONS
from auth import get_current_user_id

router = APIRouter(prefix="/reflections", tags=["reflections"])


class ReflectionCreate(BaseModel):
    """Schema for creating a failure reflection."""
    problem_id: int
    reflection_text: str  # REQUIRED - "Why did I fail?"
    structured_reasons: List[str] = []  # Optional multi-select from FAILURE_REASONS


class ReflectionRead(BaseModel):
    """Schema for reading a failure reflection."""
    id: int
    problem_id: int
    problem_title: str
    problem_tags: List[str]
    failure_date: date
    interval_label: str
    reflection_text: str
    structured_reasons: List[str]
    failure_hour: int
    last_confidence_score: Optional[int]
    created_at: datetime


@router.post("")
def create_reflection(
    data: ReflectionCreate,
    session: Session = Depends(get_session),
    user_id: str = Depends(get_current_user_id)
):
    """
    Create a failure reflection for a problem.
    
    REQUIREMENTS:
    - Problem must have at least one expired review schedule
    - reflection_text is required (non-empty)
    - structured_reasons must be valid values from FAILURE_REASONS
    
    This is the ONLY way to acknowledge a failed spaced repetition.
    """
    # Validate non-empty reflection
    if not data.reflection_text or not data.reflection_text.strip():
        raise HTTPException(status_code=400, detail="Reflection text is required")
    
    # Validate structured reasons
    for reason in data.structured_reasons:
        if reason not in FAILURE_REASONS:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid reason: {reason}. Valid: {FAILURE_REASONS}"
            )
    
    # Verify problem exists and belongs to user
    problem = session.exec(
        select(Problem)
        .where(Problem.id == data.problem_id)
        .where(Problem.user_id == user_id)
    ).first()
    
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Find an expired review schedule for this problem
    expired_review = session.exec(
        select(ReviewSchedule)
        .where(ReviewSchedule.problem_id == data.problem_id)
        .where(ReviewSchedule.status == "expired")
        .order_by(ReviewSchedule.scheduled_date.desc())  # Most recent first
    ).first()
    
    if not expired_review:
        raise HTTPException(
            status_code=400, 
            detail="No expired review found for this problem. Reflections are only for failed spaced repetition."
        )
    
    # Check if reflection already exists for this review
    existing = session.exec(
        select(FailureReflection)
        .where(FailureReflection.review_schedule_id == expired_review.id)
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail="A reflection already exists for this failed review. Reflections are immutable."
        )
    
    # Get last confidence score from most recent successful attempt
    last_attempt = session.exec(
        select(Attempt)
        .where(Attempt.problem_id == data.problem_id)
        .where(Attempt.solved == True)
        .order_by(Attempt.attempt_date.desc())
    ).first()
    
    last_confidence = last_attempt.confidence_score if last_attempt else None
    
    # Create the reflection
    now = datetime.utcnow()
    reflection = FailureReflection(
        user_id=user_id,
        problem_id=data.problem_id,
        review_schedule_id=expired_review.id,
        failure_date=expired_review.scheduled_date,
        interval_label=expired_review.interval_label,
        reflection_text=data.reflection_text.strip(),
        structured_reasons=data.structured_reasons,
        failure_hour=now.hour,
        last_confidence_score=last_confidence,
        created_at=now
    )
    
    session.add(reflection)
    session.commit()
    session.refresh(reflection)
    
    return {
        "message": "Reflection recorded successfully",
        "reflection_id": reflection.id,
        "interval_failed": expired_review.interval_label,
        "can_restart": True  # User can now restart this problem
    }


@router.get("", response_model=List[ReflectionRead])
def get_reflections(
    session: Session = Depends(get_session),
    user_id: str = Depends(get_current_user_id)
):
    """
    Get all failure reflections for the current user.
    
    Returns most recent first for analysis.
    """
    reflections = session.exec(
        select(FailureReflection)
        .where(FailureReflection.user_id == user_id)
        .options(selectinload(FailureReflection.problem))
        .order_by(FailureReflection.created_at.desc())
    ).all()
    
    return [
        ReflectionRead(
            id=r.id,
            problem_id=r.problem_id,
            problem_title=r.problem.title,
            problem_tags=r.problem.tags,
            failure_date=r.failure_date,
            interval_label=r.interval_label,
            reflection_text=r.reflection_text,
            structured_reasons=r.structured_reasons,
            failure_hour=r.failure_hour,
            last_confidence_score=r.last_confidence_score,
            created_at=r.created_at
        )
        for r in reflections
    ]


@router.get("/problem/{problem_id}", response_model=List[ReflectionRead])
def get_problem_reflections(
    problem_id: int,
    session: Session = Depends(get_session),
    user_id: str = Depends(get_current_user_id)
):
    """
    Get all failure reflections for a specific problem.
    
    Useful for viewing history when re-tracking a problem.
    """
    # Verify problem ownership
    problem = session.exec(
        select(Problem)
        .where(Problem.id == problem_id)
        .where(Problem.user_id == user_id)
    ).first()
    
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    reflections = session.exec(
        select(FailureReflection)
        .where(FailureReflection.problem_id == problem_id)
        .order_by(FailureReflection.created_at.desc())
    ).all()
    
    return [
        ReflectionRead(
            id=r.id,
            problem_id=r.problem_id,
            problem_title=problem.title,
            problem_tags=problem.tags,
            failure_date=r.failure_date,
            interval_label=r.interval_label,
            reflection_text=r.reflection_text,
            structured_reasons=r.structured_reasons,
            failure_hour=r.failure_hour,
            last_confidence_score=r.last_confidence_score,
            created_at=r.created_at
        )
        for r in reflections
    ]


@router.get("/reasons")
def get_failure_reasons():
    """Returns the list of valid structured failure reasons."""
    return {
        "reasons": FAILURE_REASONS,
        "descriptions": {
            "forgot_approach": "Forgot the solution approach or algorithm",
            "implementation_mistakes": "Knew the approach but made coding errors",
            "time_pressure": "Didn't have enough time to complete",
            "overconfidence": "Thought I knew it but was wrong",
            "fatigue_distraction": "Too tired or distracted to focus",
            "context_switching": "Mind was on other tasks",
            "other": "Other reason (explain in text)"
        }
    }
