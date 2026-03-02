from datetime import datetime, date
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship, JSON
import re

# Valid structured reasons for failure reflections
FAILURE_REASONS = [
    "forgot_approach",
    "implementation_mistakes", 
    "time_pressure",
    "overconfidence",
    "fatigue_distraction",
    "context_switching",
    "other"
]


def normalize_tag(tag: str) -> str:
    """
    Normalize a tag for consistent storage.
    
    - Lowercase
    - Trimmed
    - Replace spaces with hyphens
    - Remove special characters except hyphens
    
    Examples:
        "Dynamic Programming" -> "dynamic-programming"
        "  DP  " -> "dp"
        "Binary Search" -> "binary-search"
    """
    tag = tag.lower().strip()
    tag = re.sub(r'\s+', '-', tag)  # Replace whitespace with hyphens
    tag = re.sub(r'[^a-z0-9\-]', '', tag)  # Remove special chars
    tag = re.sub(r'-+', '-', tag)  # Collapse multiple hyphens
    tag = tag.strip('-')  # Remove leading/trailing hyphens
    return tag


# Link table for many-to-many Problem <-> Tag relationship
class ProblemTag(SQLModel, table=True):
    """
    Join table for Problem <-> Tag many-to-many relationship.
    Enables proper tag analytics and deduplication.
    """
    __tablename__ = "problem_tags"
    
    problem_id: int = Field(foreign_key="problems.id", primary_key=True)
    tag_id: int = Field(foreign_key="tags.id", primary_key=True)


class Tag(SQLModel, table=True):
    """
    First-class tag entity for global uniqueness and analytics.
    
    Tags are normalized (lowercase, trimmed) and unique.
    Never duplicated across problems.
    """
    __tablename__ = "tags"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)  # Normalized: lowercase, trimmed
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationship via link table (back_populates defined in Problem)


class Problem(SQLModel, table=True):
    __tablename__ = "problems"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(index=True) # Auth provider ID (UUID string)
    title: str
    platform: str
    url: str
    # DEPRECATED: Keep for backward compatibility, use tag_objects for new code
    tags: List[str] = Field(default=[], sa_type=JSON)
    difficulty: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    attempts: List["Attempt"] = Relationship(back_populates="problem")
    schedules: List["ReviewSchedule"] = Relationship(back_populates="problem")
    reflections: List["FailureReflection"] = Relationship(back_populates="problem")


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
    # Status values:
    #   - pending: Awaiting review on scheduled_date
    #   - completed: Successfully reviewed
    #   - failed_attempt: User submitted but didn't solve (triggers reset)
    #   - expired: TERMINAL - Missed the scheduled date (strict enforcement)
    #   - cancelled: Cancelled due to chain reset or restart
    status: str = "pending"

    problem: Problem = Relationship(back_populates="schedules")
    reflection: Optional["FailureReflection"] = Relationship(back_populates="review_schedule")


class FailureReflection(SQLModel, table=True):
    """
    Records a reflection when a spaced repetition cycle fails.
    
    IMMUTABLE: Once created, reflections cannot be edited or deleted.
    They form a permanent record for learning analysis.
    """
    __tablename__ = "failure_reflections"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(index=True)
    problem_id: int = Field(foreign_key="problems.id", index=True)
    review_schedule_id: int = Field(foreign_key="review_schedules.id")
    
    failure_date: date  # The date the review was originally scheduled for
    interval_label: str  # 1d, 7d, 30d, 90d - which interval failed
    
    # Free-text reflection (REQUIRED) - "Why did I fail?"
    reflection_text: str
    
    # Structured reasons (multi-select, stored as JSON array)
    # Valid values from FAILURE_REASONS constant
    structured_reasons: List[str] = Field(default=[], sa_type=JSON)
    
    # Metadata for analytics
    failure_hour: int  # 0-23, hour when reflection was recorded
    last_confidence_score: Optional[int] = None  # From last successful attempt
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # AI-generated insights (nullable - populated by Gemini intelligence service)
    # These fields are NEVER edited directly by users, only by the AI service
    ai_failure_type: Optional[str] = None  # From FailureType enum values
    ai_confidence_mismatch: Optional[bool] = None  # True if confidence didn't match performance
    ai_primary_reason: Optional[str] = None  # Main cause of failure
    ai_secondary_factors: List[str] = Field(default=[], sa_type=JSON)  # Contributing factors
    ai_recommended_actions: List[str] = Field(default=[], sa_type=JSON)  # Actionable next steps
    ai_analyzed_at: Optional[datetime] = None  # When AI analysis was performed
    
    # Relationships
    problem: Problem = Relationship(back_populates="reflections")
    review_schedule: ReviewSchedule = Relationship(back_populates="reflection")


class UserProfile(SQLModel, table=True):
    __tablename__ = "user_profiles"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(unique=True, index=True) # Auth provider ID (UUID string)
    username: str = Field(default="")
    display_name: str = Field(default="")
    bio: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
