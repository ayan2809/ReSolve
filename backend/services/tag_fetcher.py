"""
Tag Fetcher Service — Manual tag fetching from LeetCode and Codeforces.

DESIGN PRINCIPLES:
- Fetching is MANUAL and BUTTON-TRIGGERED only
- No auto-triggering on URL input or save
- Returns SUGGESTIONS only — no DB writes
- User can fully edit tags before saving
"""
import re
import httpx
from typing import List, Optional, Tuple, Dict, Any


def detect_platform(url: str) -> Optional[str]:
    """
    Detect platform from problem URL.
    
    Returns:
        "leetcode", "codeforces", or None if unsupported
    """
    url = url.lower()
    if "leetcode.com" in url:
        return "leetcode"
    elif "codeforces.com" in url:
        return "codeforces"
    return None


def extract_leetcode_slug(url: str) -> Optional[str]:
    """
    Extract problem slug from LeetCode URL.
    
    Examples:
        https://leetcode.com/problems/two-sum/ -> "two-sum"
        https://leetcode.com/problems/two-sum/description/ -> "two-sum"
    """
    match = re.search(r'leetcode\.com/problems/([^/]+)', url, re.IGNORECASE)
    return match.group(1) if match else None


def extract_codeforces_ids(url: str) -> Optional[Tuple[str, str]]:
    """
    Extract contestId and problemIndex from Codeforces URL.
    
    Examples:
        https://codeforces.com/problemset/problem/1/A -> ("1", "A")
        https://codeforces.com/contest/1/problem/A -> ("1", "A")
        https://codeforces.com/contest/1915/problem/F -> ("1915", "F")
    """
    match = re.search(
        r'codeforces\.com/(?:problemset/problem|contest)/(\d+)/(?:problem/)?([A-Za-z0-9]+)',
        url,
        re.IGNORECASE
    )
    return (match.group(1), match.group(2).upper()) if match else None


async def fetch_leetcode_tags(slug: str) -> List[str]:
    """
    Fetch tags from LeetCode using their GraphQL API.
    
    Args:
        slug: Problem slug (e.g., "two-sum")
        
    Returns:
        List of tag names (e.g., ["Array", "Hash Table"])
    """
    query = """
    query questionData($titleSlug: String!) {
        question(titleSlug: $titleSlug) {
            topicTags {
                name
            }
        }
    }
    """
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(
            "https://leetcode.com/graphql",
            json={
                "query": query,
                "variables": {"titleSlug": slug}
            },
            headers={
                "Content-Type": "application/json",
                "Referer": "https://leetcode.com"
            }
        )
        
        if response.status_code != 200:
            raise Exception(f"LeetCode API returned status {response.status_code}")
        
        data = response.json()
        
        # Check for errors
        if "errors" in data:
            raise Exception(data["errors"][0].get("message", "Unknown GraphQL error"))
        
        question = data.get("data", {}).get("question")
        if not question:
            raise Exception(f"Problem not found: {slug}")
        
        topic_tags = question.get("topicTags", [])
        return [tag["name"] for tag in topic_tags]


async def fetch_codeforces_tags(contest_id: str, problem_index: str) -> List[str]:
    """
    Fetch tags from Codeforces using their public API.
    
    Args:
        contest_id: Contest ID (e.g., "1")
        problem_index: Problem index (e.g., "A")
        
    Returns:
        List of tag names (e.g., ["math", "greedy"])
    """
    async with httpx.AsyncClient(timeout=10.0) as client:
        # Use problemset.problems API to find the specific problem
        response = await client.get(
            "https://codeforces.com/api/problemset.problems"
        )
        
        if response.status_code != 200:
            raise Exception(f"Codeforces API returned status {response.status_code}")
        
        data = response.json()
        
        if data.get("status") != "OK":
            raise Exception(data.get("comment", "Unknown Codeforces API error"))
        
        problems = data.get("result", {}).get("problems", [])
        
        # Find the specific problem
        for problem in problems:
            if (str(problem.get("contestId")) == contest_id and 
                problem.get("index", "").upper() == problem_index.upper()):
                return problem.get("tags", [])
        
        raise Exception(f"Problem {contest_id}/{problem_index} not found in Codeforces")


async def fetch_tags_from_url(url: str) -> Dict[str, Any]:
    """
    Main entry point: Fetch tags from a problem URL.
    
    Args:
        url: Problem URL (LeetCode or Codeforces)
        
    Returns:
        {
            "platform": "leetcode" | "codeforces" | null,
            "tags": ["tag1", "tag2", ...],
            "error": null | "error message"
        }
        
    NOTE: This function does NOT write to the database.
          Tags are returned as SUGGESTIONS only.
    """
    platform = detect_platform(url)
    
    if not platform:
        return {
            "platform": None,
            "tags": [],
            "error": "Unsupported platform. Only LeetCode and Codeforces are supported."
        }
    
    try:
        if platform == "leetcode":
            slug = extract_leetcode_slug(url)
            if not slug:
                return {
                    "platform": platform,
                    "tags": [],
                    "error": "Could not extract problem slug from URL"
                }
            tags = await fetch_leetcode_tags(slug)
            
        elif platform == "codeforces":
            ids = extract_codeforces_ids(url)
            if not ids:
                return {
                    "platform": platform,
                    "tags": [],
                    "error": "Could not extract contest ID and problem index from URL"
                }
            tags = await fetch_codeforces_tags(ids[0], ids[1])
        
        return {
            "platform": platform,
            "tags": tags,
            "error": None
        }
        
    except httpx.TimeoutException:
        return {
            "platform": platform,
            "tags": [],
            "error": "Request timed out. Please try again."
        }
    except httpx.RequestError as e:
        return {
            "platform": platform,
            "tags": [],
            "error": f"Network error: {str(e)}"
        }
    except Exception as e:
        return {
            "platform": platform,
            "tags": [],
            "error": str(e)
        }
