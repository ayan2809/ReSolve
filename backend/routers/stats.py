from fastapi import APIRouter, Depends
from sqlmodel import Session, select, func
from datetime import date, timedelta
from typing import Dict

from database import get_session
from models import Attempt
from auth import get_current_user_id

router = APIRouter(prefix="/stats", tags=["stats"])

@router.get("/activity")
def get_activity(
    session: Session = Depends(get_session),
    user_id: str = Depends(get_current_user_id)
) -> Dict[str, int]:
    """
    Returns a dictionary of date -> attempt count for the last 365 days.
    Used for the activity calendar heatmap.
    """
    start_date = date.today() - timedelta(days=365)
    
    # Query attempts grouped by date
    results = session.exec(
        select(
            func.date(Attempt.attempt_date).label("day"),
            func.count(Attempt.id).label("count")
        )
        .where(Attempt.user_id == user_id)
        .where(func.date(Attempt.attempt_date) >= start_date)
        .group_by(func.date(Attempt.attempt_date))
    ).all()
    
    # Convert to dict with string keys for JSON
    return {str(row.day): row.count for row in results}
