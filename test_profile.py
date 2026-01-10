#!/usr/bin/env python3
"""Test profile database operations directly"""

import sys
sys.path.insert(0, '/Volumes/Projects/ReSolve')

from datetime import datetime
from sqlmodel import Session, select
from backend.database import engine
from backend.models import UserProfile

def test_profile():
    test_user_id = "test-user-123"
    
    with Session(engine) as session:
        print("1. Testing SELECT query...")
        try:
            profile = session.exec(
                select(UserProfile).where(UserProfile.user_id == test_user_id)
            ).first()
            print(f"   Found profile: {profile}")
        except Exception as e:
            print(f"   SELECT ERROR: {e}")
            return
        
        print("2. Testing INSERT if not exists...")
        try:
            if not profile:
                now = datetime.utcnow()
                profile = UserProfile(
                    user_id=test_user_id,
                    username="testuser",
                    display_name="Test User",
                    bio="Test bio",
                    created_at=now,
                    updated_at=now
                )
                session.add(profile)
                session.commit()
                session.refresh(profile)
                print(f"   Created profile: {profile}")
            else:
                print(f"   Profile exists: {profile}")
        except Exception as e:
            print(f"   INSERT ERROR: {e}")
            import traceback
            traceback.print_exc()
            return
        
        print("3. Testing UPDATE...")
        try:
            profile.display_name = "Updated Name"
            profile.updated_at = datetime.utcnow()
            session.commit()
            session.refresh(profile)
            print(f"   Updated profile: {profile}")
        except Exception as e:
            print(f"   UPDATE ERROR: {e}")
            import traceback
            traceback.print_exc()
            return
        
        print("4. Testing dict conversion...")
        try:
            result = {
                "user_id": profile.user_id,
                "username": profile.username or "",
                "display_name": profile.display_name or "",
                "bio": profile.bio,
                "created_at": profile.created_at,
                "updated_at": profile.updated_at
            }
            print(f"   Dict result: {result}")
        except Exception as e:
            print(f"   DICT ERROR: {e}")
            import traceback
            traceback.print_exc()
            return
        
        print("\n✅ All tests passed!")

if __name__ == "__main__":
    test_profile()
