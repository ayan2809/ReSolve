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


def expire_missed_reviews(session: Session, user_id: str = None) -> int:
    """
    STRICT SPACED REPETITION ENFORCEMENT
    
    Finds all pending reviews with scheduled_date < today and marks them as 'expired'.
    Also cancels all future pending reviews for those problems.
    
    This enforces strict spaced repetition discipline:
    - Missing a scheduled review day invalidates the ENTIRE repetition chain
    - No carry-over, no grace periods, no automatic recovery
    - The user must explicitly restart from Day 1 to re-enter the system
    
    Args:
        session: Database session
        user_id: If provided, only expire reviews for this user
        
    Returns:
        Number of problems that had their repetition chains invalidated
    """
    today = date.today()
    
    # Find all overdue pending reviews
    if user_id:
        statement = (
            select(ReviewSchedule)
            .join(Problem)
            .where(ReviewSchedule.status == "pending")
            .where(ReviewSchedule.scheduled_date < today)
            .where(Problem.user_id == user_id)
        )
    else:
        statement = select(ReviewSchedule).where(
            ReviewSchedule.status == "pending",
            ReviewSchedule.scheduled_date < today
        )
    
    overdue_reviews = session.exec(statement).all()
    
    # Track which problems need their chains invalidated
    problem_ids_to_invalidate = set()
    
    for review in overdue_reviews:
        review.status = "expired"
        session.add(review)
        problem_ids_to_invalidate.add(review.problem_id)
    
    # Cancel ALL remaining pending reviews for affected problems
    # (the chain is broken, so future reviews are meaningless)
    for problem_id in problem_ids_to_invalidate:
        future_stmt = select(ReviewSchedule).where(
            ReviewSchedule.problem_id == problem_id,
            ReviewSchedule.status == "pending"
        )
        for future_review in session.exec(future_stmt).all():
            future_review.status = "cancelled"
            session.add(future_review)
    
    # AUTO-RESTART: Generate fresh schedules from today for all expired problems
    # This removes the need for manual /restart - missed reviews auto-reset to Day 1
    for problem_id in problem_ids_to_invalidate:
        generate_initial_schedules(session, problem_id, today)
    
    if problem_ids_to_invalidate:
        session.commit()
    
    return len(problem_ids_to_invalidate)


def handle_review_submission(session: Session, schedule_id: int, solved: bool, review_date: date):
    """
    Handles a review submission.
    If solved: Mark schedule as completed.
    If failed: Mark schedule as failed_attempt, cancel future pending schedules 
               for this problem, and regenerate new schedule starting from review_date.
    """
    review = session.get(ReviewSchedule, schedule_id)
    if not review:
        raise ValueError(f"Review entry {schedule_id} not found")
    
    review.status = "completed" if solved else "failed_attempt"
    session.add(review)
    
    if not solved:
        # Reset Logic: User attempted but failed
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
    """
    Lambda cron handler for daily review jobs.
    
    This runs at a scheduled time each day to:
    1. Expire all missed reviews system-wide (enforcing strict discipline)
    2. Send notifications for today's reviews
    """
    from database import engine
    from services.notifications import send_daily_review_notification
    
    with Session(engine) as session:
        # CRITICAL: Expire all missed reviews before sending notifications
        # This ensures users are only notified about valid, on-time reviews
        expired_count = expire_missed_reviews(session)
        if expired_count > 0:
            print(f"[SPACED REP] Expired {expired_count} problems due to missed reviews")
        
        send_daily_review_notification(session)
    
    return {"message": "Daily reviews processed", "expired_problems": expired_count}
