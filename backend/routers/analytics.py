"""
Analytics Router - Provides insights into learning failure patterns.

FIXED: Now derives analytics from ReviewSchedule status instead of FailureReflection.
This ensures analytics populate automatically when reviews fail, without requiring
user to manually submit reflections.

Failure statuses:
- 'failed_attempt': User attempted but didn't solve
- 'expired': User missed the scheduled review date
"""
from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from sqlalchemy import func, distinct
from sqlalchemy.orm import selectinload
from typing import List, Dict, Any
from datetime import date, timedelta
from collections import defaultdict

from database import get_session
from models import Problem, ReviewSchedule, Attempt
from auth import get_current_user_id

router = APIRouter(prefix="/analytics", tags=["analytics"])

# Statuses that count as "failures" for analytics
FAILURE_STATUSES = ["failed_attempt", "expired"]


@router.get("/failure-log")
def get_failure_log(
    limit: int = 50,
    offset: int = 0,
    session: Session = Depends(get_session),
    user_id: str = Depends(get_current_user_id)
) -> List[Dict[str, Any]]:
    """
    Returns paginated list of all failed reviews.
    
    Shows:
    - Problem title and tags
    - Interval where it failed (1d/7d/30d/90d)
    - Failure date
    - Failure type (failed_attempt or expired)
    """
    failed_reviews = session.exec(
        select(ReviewSchedule)
        .join(Problem)
        .options(selectinload(ReviewSchedule.problem))
        .where(Problem.user_id == user_id)
        .where(ReviewSchedule.status.in_(FAILURE_STATUSES))
        .order_by(ReviewSchedule.scheduled_date.desc())
        .offset(offset)
        .limit(limit)
    ).all()
    
    result = []
    for r in failed_reviews:
        problem = r.problem
        result.append({
            "problem_id": problem.id,
            "problem_title": problem.title,
            "tags": problem.tags,
            "interval_label": r.interval_label,
            "failure_date": r.scheduled_date.isoformat(),
            "failure_type": r.status,
            "reflection_snippet": f"Review {r.status.replace('_', ' ')}"  # Placeholder until reflection added
        })
    
    return result


@router.get("/failure-by-interval")
def get_failure_by_interval(
    session: Session = Depends(get_session),
    user_id: str = Depends(get_current_user_id)
) -> Dict[str, Dict[str, Any]]:
    """
    Returns failure distribution by interval.
    
    Reveals memory decay patterns:
    - High 1d failures = immediate recall issues
    - High 7d failures = short-term retention issues
    - High 30d/90d failures = long-term retention issues
    """
    # Count failures by interval from ReviewSchedule
    counts = session.exec(
        select(
            ReviewSchedule.interval_label,
            func.count(ReviewSchedule.id).label("count")
        )
        .join(Problem)
        .where(Problem.user_id == user_id)
        .where(ReviewSchedule.status.in_(FAILURE_STATUSES))
        .group_by(ReviewSchedule.interval_label)
    ).all()
    
    # Convert to dict
    interval_counts = {row[0]: row[1] for row in counts}
    total = sum(interval_counts.values()) or 1  # Avoid division by zero
    
    result = {}
    for interval in ["1d", "7d", "30d", "90d"]:
        count = interval_counts.get(interval, 0)
        result[interval] = {
            "count": count,
            "percentage": round((count / total) * 100, 1)
        }
    
    return result


@router.get("/failure-by-tag")
def get_failure_by_tag(
    session: Session = Depends(get_session),
    user_id: str = Depends(get_current_user_id)
) -> List[Dict[str, Any]]:
    """
    Returns failure counts grouped by problem tags.
    
    Identifies which problem categories fail most often.
    """
    # Get all failed reviews with problem data
    failed_reviews = session.exec(
        select(ReviewSchedule)
        .join(Problem)
        .options(selectinload(ReviewSchedule.problem))
        .where(Problem.user_id == user_id)
        .where(ReviewSchedule.status.in_(FAILURE_STATUSES))
    ).all()
    
    # Count failures by tag
    tag_counts = defaultdict(int)
    for r in failed_reviews:
        for tag in r.problem.tags:
            tag_counts[tag.lower()] += 1
    
    total = sum(tag_counts.values()) or 1
    
    # Sort by count descending
    result = [
        {
            "tag": tag,
            "count": count,
            "percentage": round((count / total) * 100, 1)
        }
        for tag, count in sorted(tag_counts.items(), key=lambda x: -x[1])
    ]
    
    return result[:10]  # Top 10 tags


@router.get("/confidence-outcome")
def get_confidence_outcome(
    session: Session = Depends(get_session),
    user_id: str = Depends(get_current_user_id)
) -> Dict[str, Any]:
    """
    Compares last confidence score with subsequent failure.
    
    Highlights overconfidence: high confidence scores followed by failure.
    """
    # Get failed reviews
    failed_reviews = session.exec(
        select(ReviewSchedule)
        .join(Problem)
        .options(selectinload(ReviewSchedule.problem))
        .where(Problem.user_id == user_id)
        .where(ReviewSchedule.status.in_(FAILURE_STATUSES))
    ).all()
    
    high_confidence_failures = 0  # Score 4-5, then failed
    medium_confidence_failures = 0  # Score 3
    low_confidence_failures = 0  # Score 1-2
    no_prior_attempt = 0
    
    overconfident_problems = []
    
    for r in failed_reviews:
        # Get last successful attempt before this failure
        last_attempt = session.exec(
            select(Attempt)
            .where(Attempt.problem_id == r.problem_id)
            .where(Attempt.solved == True)
            .where(Attempt.attempt_date < r.scheduled_date)
            .order_by(Attempt.attempt_date.desc())
        ).first()
        
        if last_attempt:
            score = last_attempt.confidence_score
            if score >= 4:
                high_confidence_failures += 1
                overconfident_problems.append({
                    "problem_title": r.problem.title,
                    "confidence_score": score,
                    "failure_date": r.scheduled_date.isoformat()
                })
            elif score == 3:
                medium_confidence_failures += 1
            else:
                low_confidence_failures += 1
        else:
            no_prior_attempt += 1
    
    total = high_confidence_failures + medium_confidence_failures + low_confidence_failures
    total = total or 1  # Avoid division by zero
    
    return {
        "high_confidence_failures": high_confidence_failures,
        "high_confidence_percentage": round((high_confidence_failures / total) * 100, 1),
        "medium_confidence_failures": medium_confidence_failures,
        "low_confidence_failures": low_confidence_failures,
        "overconfident_examples": overconfident_problems[:5],  # Top 5 examples
        "insight": _generate_confidence_insight(high_confidence_failures, total)
    }


def _generate_confidence_insight(high_conf_failures: int, total: int) -> str:
    """Generate a human-readable insight about overconfidence."""
    if total == 0:
        return "Not enough data for confidence analysis."
    
    percentage = (high_conf_failures / total) * 100
    if percentage >= 50:
        return "⚠️ Over half of failures came after high confidence. Consider being more cautious with self-assessment."
    elif percentage >= 30:
        return "Notable overconfidence pattern detected. Review problems carefully even when they feel easy."
    else:
        return "Confidence scores generally align with outcomes."


@router.get("/time-of-day")
def get_time_of_day_failures(
    session: Session = Depends(get_session),
    user_id: str = Depends(get_current_user_id)
) -> List[Dict[str, int]]:
    """
    Failure distribution by scheduled date.
    
    NOTE: Without reflection data, we can't track exact hour of failure.
    This endpoint returns empty until reflections are implemented.
    """
    # Without FailureReflection, we don't have hour data
    # Return empty for now - this feature requires reflection flow
    return []


@router.get("/failure-streaks")
def get_failure_streaks(
    session: Session = Depends(get_session),
    user_id: str = Depends(get_current_user_id)
) -> Dict[str, Any]:
    """
    Tracks consecutive days with failures.
    
    NOT gamification - this is for burnout/overload awareness.
    Long streaks may indicate:
    - Taking on too many problems
    - External life stress
    - Need for a break
    """
    # Get all failure dates from ReviewSchedule
    failure_dates = session.exec(
        select(distinct(ReviewSchedule.scheduled_date))
        .join(Problem)
        .where(Problem.user_id == user_id)
        .where(ReviewSchedule.status.in_(FAILURE_STATUSES))
        .order_by(ReviewSchedule.scheduled_date)
    ).all()
    
    if not failure_dates:
        return {
            "current_streak": 0,
            "longest_streak": 0,
            "streak_dates": [],
            "insight": "No failure data yet."
        }
    
    # Convert to set for quick lookup
    dates_set = set(failure_dates)
    today = date.today()
    
    # Calculate current streak (consecutive days ending today or yesterday)
    current_streak = 0
    check_date = today
    current_streak_dates = []
    
    # Check if there's a streak ending today or yesterday
    while check_date in dates_set or (check_date == today and (today - timedelta(days=1)) in dates_set):
        if check_date in dates_set:
            current_streak += 1
            current_streak_dates.append(check_date.isoformat())
        check_date -= timedelta(days=1)
        if current_streak > 0 and check_date not in dates_set:
            break
    
    # Calculate longest streak
    sorted_dates = sorted(failure_dates)
    longest_streak = 1
    current_run = 1
    longest_streak_dates = [sorted_dates[0].isoformat()] if sorted_dates else []
    current_run_dates = [sorted_dates[0].isoformat()] if sorted_dates else []
    
    for i in range(1, len(sorted_dates)):
        if sorted_dates[i] - sorted_dates[i-1] == timedelta(days=1):
            current_run += 1
            current_run_dates.append(sorted_dates[i].isoformat())
        else:
            if current_run > longest_streak:
                longest_streak = current_run
                longest_streak_dates = current_run_dates.copy()
            current_run = 1
            current_run_dates = [sorted_dates[i].isoformat()]
    
    if current_run > longest_streak:
        longest_streak = current_run
        longest_streak_dates = current_run_dates
    
    # Generate insight
    insight = _generate_streak_insight(current_streak, longest_streak)
    
    return {
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "streak_dates": longest_streak_dates,
        "insight": insight
    }


def _generate_streak_insight(current: int, longest: int) -> str:
    """Generate insight about failure streaks."""
    if current >= 3:
        return "⚠️ Multiple consecutive failure days. Consider reducing load or taking a break."
    elif longest >= 5:
        return f"Longest streak was {longest} days. Monitor for overload patterns."
    elif longest == 0:
        return "No consecutive failure days detected."
    else:
        return "Failure patterns appear manageable."


@router.get("/completion-streak")
def get_completion_streak(
    session: Session = Depends(get_session),
    user_id: str = Depends(get_current_user_id)
) -> Dict[str, Any]:
    """
    Returns the review completion streak.
    
    A streak day is defined as:
    - A calendar day where the user had scheduled reviews AND
    - ALL scheduled reviews for that day were completed
    
    STRICT RULES (from spaced repetition discipline):
    - Streak increments ONLY when ReviewSchedule.status == "completed"
    - Day-based, not problem-based
    - Consecutive days where ALL scheduled reviews were completed
    
    Returns current streak (consecutive days ending today/yesterday)
    and longest historical streak.
    """
    today = date.today()
    
    # Get all review schedules for this user that have been processed
    # (completed, failed_attempt, or expired - not pending)
    statement = (
        select(ReviewSchedule)
        .join(Problem)
        .where(Problem.user_id == user_id)
        .where(ReviewSchedule.status.in_(["completed", "failed_attempt", "expired", "cancelled"]))
    )
    all_reviews = session.exec(statement).all()
    
    if not all_reviews:
        return {
            "current_streak": 0,
            "longest_streak": 0,
            "streak_dates": [],
            "total_completion_days": 0
        }
    
    # Group reviews by scheduled_date
    reviews_by_date: Dict[date, list] = defaultdict(list)
    for review in all_reviews:
        reviews_by_date[review.scheduled_date].append(review)
    
    # Find dates where ALL reviews were completed
    # A day counts as completed ONLY if every scheduled review for that day was completed
    completion_dates = set()
    for scheduled_date, reviews in reviews_by_date.items():
        # Only count days on or before today (can't complete future reviews)
        if scheduled_date <= today:
            if all(r.status == "completed" for r in reviews):
                completion_dates.add(scheduled_date)
    
    if not completion_dates:
        return {
            "current_streak": 0,
            "longest_streak": 0,
            "streak_dates": [],
            "total_completion_days": 0
        }
    
    # Calculate current streak (consecutive days ending today or yesterday)
    current_streak = 0
    current_streak_dates = []
    check_date = today
    
    # Start from today and go backwards
    # Allow starting from today OR yesterday (in case user hasn't done today's reviews yet)
    while True:
        if check_date in completion_dates:
            current_streak += 1
            current_streak_dates.append(check_date.isoformat())
            check_date -= timedelta(days=1)
        elif check_date == today:
            # Today not completed yet, check if yesterday starts a streak
            check_date -= timedelta(days=1)
        else:
            # Gap found, streak ends
            break
    
    # Calculate longest streak ever
    sorted_dates = sorted(completion_dates)
    longest_streak = 1
    current_run = 1
    longest_streak_dates = [sorted_dates[0].isoformat()]
    current_run_dates = [sorted_dates[0].isoformat()]
    
    for i in range(1, len(sorted_dates)):
        if sorted_dates[i] - sorted_dates[i-1] == timedelta(days=1):
            current_run += 1
            current_run_dates.append(sorted_dates[i].isoformat())
        else:
            if current_run > longest_streak:
                longest_streak = current_run
                longest_streak_dates = current_run_dates.copy()
            current_run = 1
            current_run_dates = [sorted_dates[i].isoformat()]
    
    # Check final run
    if current_run > longest_streak:
        longest_streak = current_run
        longest_streak_dates = current_run_dates
    
    return {
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "streak_dates": current_streak_dates,  # Dates in current streak
        "total_completion_days": len(completion_dates)
    }


@router.get("/summary")
def get_analytics_summary(
    session: Session = Depends(get_session),
    user_id: str = Depends(get_current_user_id)
) -> Dict[str, Any]:
    """
    Returns a summary of all analytics for the dashboard overview.
    """
    # Total failures from ReviewSchedule
    total_failures = session.exec(
        select(func.count(ReviewSchedule.id))
        .join(Problem)
        .where(Problem.user_id == user_id)
        .where(ReviewSchedule.status.in_(FAILURE_STATUSES))
    ).one()
    
    # Most common failure interval
    interval_data = get_failure_by_interval(session, user_id)
    most_common_interval = max(interval_data.items(), key=lambda x: x[1]["count"])[0] if any(interval_data[k]["count"] > 0 for k in interval_data) else None
    
    # Most problematic tag
    tag_data = get_failure_by_tag(session, user_id)
    most_problematic_tag = tag_data[0]["tag"] if tag_data else None
    
    # Confidence analysis
    confidence_data = get_confidence_outcome(session, user_id)
    
    return {
        "total_failures": total_failures,
        "most_common_interval": most_common_interval,
        "most_problematic_tag": most_problematic_tag,
        "overconfidence_rate": confidence_data.get("high_confidence_percentage", 0),
        "has_data": total_failures > 0
    }
