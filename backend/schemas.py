from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date

class ProblemCreate(BaseModel):
    title: str
    platform: str
    url: str
    tags: List[str] = []
    difficulty: str

class ProblemRead(ProblemCreate):
    id: int
    created_at: datetime

class AttemptCreate(BaseModel):
    solved: bool
    time_taken_minutes: int
    approach_summary: str
    mistakes_notes: Optional[str] = None
    confidence_score: int
    # Required when solved=False - user's reflection on why they failed
    reflection_text: Optional[str] = None

class AttemptRead(AttemptCreate):
    id: int
    attempt_number: int
    attempt_date: datetime
    problem_id: int

class ReviewScheduleRead(BaseModel):
    id: int
    problem_id: int
    scheduled_date: date
    interval_label: str
    status: str
    problem: Optional[ProblemRead] = None
