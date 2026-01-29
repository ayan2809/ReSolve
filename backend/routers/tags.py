"""
Tags Router — Manual tag fetching and management.

DESIGN PRINCIPLES:
- Tag fetching is MANUAL and BUTTON-TRIGGERED only
- Fetch endpoint returns SUGGESTIONS, no DB writes
- User can fully edit tags before saving
"""
from fastapi import APIRouter, Depends
from services.tag_fetcher import fetch_tags_from_url, detect_platform

router = APIRouter(prefix="/tags", tags=["tags"])


@router.get("/fetch")
async def fetch_tags_endpoint(url: str):
    """
    Fetch suggested tags from a problem URL.
    
    Supported platforms:
    - LeetCode (uses GraphQL API)
    - Codeforces (uses public API)
    
    Returns:
        platform: Detected platform name
        tags: List of suggested tags
        error: Error message if fetch failed
    
    NOTE: This endpoint does NOT write to the database.
          Tags are returned as suggestions for user review.
    """
    result = await fetch_tags_from_url(url)
    return result


@router.get("/detect-platform")
def detect_platform_endpoint(url: str):
    """
    Detect the platform from a problem URL.
    
    Returns:
        platform: "leetcode", "codeforces", or null if unsupported
        supported: boolean indicating if platform is supported
    """
    platform = detect_platform(url)
    return {
        "platform": platform,
        "supported": platform is not None
    }
