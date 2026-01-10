from datetime import datetime, date
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship, JSON

class Problem(SQLModel, table=True):
    __tablename__ = "problems"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(index=True) # Auth provider ID (UUID string)
    title: str
    platform: str
    url: str
    tags: List[str] = Field(default=[], sa_type=JSON)
    difficulty: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    attempts: List["Attempt"] = Relationship(back_populates="problem")
    schedules: List["ReviewSchedule"] = Relationship(back_populates="problem")

class Attempt(SQLModel, table=True):
    __tablename__ = "attempts"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(index=True) # Auth provider ID
    problem_id: int = Field(foreign_key="problems.id")
    attempt_number: int
    attempt_date: datetime = Field(default_factory=datetime.utcnow)
    solved: bool
    time_taken_minutes: int
    approach_summary: str
    mistakes_notes: Optional[str] = None
    confidence_score: int # 1-5
    
    problem: Problem = Relationship(back_populates="attempts")

class ReviewSchedule(SQLModel, table=True):
    __tablename__ = "review_schedules"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    problem_id: int = Field(foreign_key="problems.id")
    scheduled_date: date
    interval_label: str # 1d, 7d, 30d, 90d
    status: str = "pending" # pending, completed, skipped, cancelled
    
    problem: Problem = Relationship(back_populates="schedules")

class UserProfile(SQLModel, table=True):
    __tablename__ = "user_profiles"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(unique=True, index=True) # Auth provider ID (UUID string)
    username: str = Field(default="")
    display_name: str = Field(default="")
    bio: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
