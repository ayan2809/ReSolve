from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload
from typing import List
from datetime import date

from database import get_session
from models import ReviewSchedule, Attempt, Problem
from schemas import ReviewScheduleRead, AttemptCreate
from services.scheduler_logic import handle_review_submission

router = APIRouter(prefix="/reviews", tags=["reviews"])

from auth import get_current_user_id

@router.get("/today", response_model=List[ReviewScheduleRead])
def get_todays_reviews(
    session: Session = Depends(get_session),
    user_id: str = Depends(get_current_user_id)
):
    today = date.today()
    # Join with Problem to filter by user_id
    statement = (
        select(ReviewSchedule)
        .join(Problem)
        .options(selectinload(ReviewSchedule.problem))
        .where(ReviewSchedule.status == "pending")
        .where(ReviewSchedule.scheduled_date <= today)
        .where(Problem.user_id == user_id)
        .order_by(ReviewSchedule.scheduled_date)
    )
    reviews = session.exec(statement).all()
    return reviews

@router.post("/{schedule_id}/submit")
def submit_review(
    schedule_id: int,
    attempt_data: AttemptCreate,
    session: Session = Depends(get_session),
    user_id: str = Depends(get_current_user_id)
):
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
    session.commit() # Commit attempt to get ID if needed, and ensure it saves
    
    # 2. Handle Schedule Logic (Update status, reset if fail)
    handle_review_submission(
        session, 
        schedule_id, 
        attempt_data.solved, 
        new_attempt.attempt_date.date()
    )
    
    return {"message": "Review submitted successfully", "attempt_id": new_attempt.id}
