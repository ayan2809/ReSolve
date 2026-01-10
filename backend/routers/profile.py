from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from database import get_session
from models import UserProfile
from auth import get_current_user_id

router = APIRouter(prefix="/profile", tags=["profile"])

class ProfileUpdate(BaseModel):
    username: Optional[str] = None
    display_name: Optional[str] = None
    bio: Optional[str] = None

class ProfileRead(BaseModel):
    user_id: str
    username: str
    display_name: str
    bio: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    model_config = {"from_attributes": True}

@router.get("")
def get_profile(
    session: Session = Depends(get_session),
    user_id: str = Depends(get_current_user_id)
):
    """Get current user's profile. Creates one if it doesn't exist."""
    try:
        profile = session.exec(
            select(UserProfile).where(UserProfile.user_id == user_id)
        ).first()
        
        if not profile:
            # Create a default profile
            now = datetime.utcnow()
            profile = UserProfile(
                user_id=user_id,
                username="",
                display_name="",
                created_at=now,
                updated_at=now
            )
            session.add(profile)
            session.commit()
            session.refresh(profile)
        
        return {
            "user_id": profile.user_id,
            "username": profile.username or "",
            "display_name": profile.display_name or "",
            "bio": profile.bio,
            "created_at": profile.created_at,
            "updated_at": profile.updated_at
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("")
def update_profile(
    data: ProfileUpdate,
    session: Session = Depends(get_session),
    user_id: str = Depends(get_current_user_id)
):
    """Update current user's profile."""
    try:
        profile = session.exec(
            select(UserProfile).where(UserProfile.user_id == user_id)
        ).first()
        
        now = datetime.utcnow()
        
        if not profile:
            profile = UserProfile(
                user_id=user_id,
                username="",
                display_name="",
                created_at=now,
                updated_at=now
            )
            session.add(profile)
        
        # Update fields if provided
        if data.username is not None:
            profile.username = data.username
        if data.display_name is not None:
            profile.display_name = data.display_name
        if data.bio is not None:
            profile.bio = data.bio
        
        profile.updated_at = now
        
        session.commit()
        session.refresh(profile)
        
        return {
            "user_id": profile.user_id,
            "username": profile.username or "",
            "display_name": profile.display_name or "",
            "bio": profile.bio,
            "created_at": profile.created_at,
            "updated_at": profile.updated_at
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
