from datetime import date, timedelta
from typing import List
from sqlmodel import Session, select
from models import Problem, ReviewSchedule

INTERVALS = [1, 7, 30, 90]

def generate_initial_schedules(session: Session, problem_id: int, start_date: date):
    """
    Generates the initial 1d, 7d, 30d, 90d schedules for a problem.
    """
    for days in INTERVALS:
        scheduled_date = start_date + timedelta(days=days)
        schedule = ReviewSchedule(
            problem_id=problem_id,
            scheduled_date=scheduled_date,
            interval_label=f"{days}d",
            status="pending"
        )
        session.add(schedule)
    session.commit()

def handle_review_submission(session: Session, schedule_id: int, solved: bool, review_date: date):
    """
    Handles a review submission.
    If solved: Mark schedule as completed.
    If failed: Mark schedule as completed (or failed), cancel future pending schedules 
               for this problem, and regenerate new schedule starting from review_date.
    """
    review = session.get(ReviewSchedule, schedule_id)
    if not review:
        raise ValueError(f"Review entry {schedule_id} not found")
    
    review.status = "completed" if solved else "failed_attempt"
    session.add(review)
    
    if not solved:
        # Reset Logic
        # 1. Cancel future pending reviews
        statement = select(ReviewSchedule).where(
            ReviewSchedule.problem_id == review.problem_id,
            ReviewSchedule.status == "pending",
            ReviewSchedule.scheduled_date > review.scheduled_date
        )
        future_reviews = session.exec(statement).all()
        for r in future_reviews:
            r.status = "cancelled"
            session.add(r)
        
        # 2. Generate new schedules from today (review_date)
        generate_initial_schedules(session, review.problem_id, review_date)
    
    session.commit()

def run_daily_reviews():
    """Lambda cron handler for daily review jobs."""
    from database import engine
    from services.notifications import send_daily_review_notification
    with Session(engine) as session:
        send_daily_review_notification(session)
    return {"message": "Daily reviews processed"}
