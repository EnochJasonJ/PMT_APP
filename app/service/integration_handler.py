import httpx
from typing import List, Dict, Any
from loguru import logger

class GitHubIntegrationHandler:
    BASE_URL = "https://api.github.com"

    def __init__(self, repository_url: str, access_token: str = None):
        self.access_token = access_token
        # Extract owner/repo from URL
        parts = repository_url.strip("/").replace(".git", "").split("/")
        self.repo_path = "/".join(parts[-2:]) if len(parts) >= 2 else ""
        
        self.headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "Internal-PM-Tool-Backend"
        }
        if access_token:
            if access_token.startswith("github_pat_"):
                self.headers["Authorization"] = f"Bearer {access_token}"
            else:
                self.headers["Authorization"] = f"token {access_token}"

    async def _make_request(self, method: str, url: str) -> List[Dict[str, Any]]:
        """Internal helper to make requests with graceful error handling."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.request(method, url, headers=self.headers)
                
                if response.status_code == 403 and "rate limit exceeded" in response.text.lower():
                    logger.error(f"GitHub Rate Limit Exceeded for {url}")
                    return [{"error": "GitHub API rate limit exceeded. Please wait or use an access token."}]
                
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"GitHub API Error ({e.response.status_code}): {e.response.text}")
            # Surface GitHub's own reason so 403/404 are actionable
            # (e.g. token missing the 'Issues' permission, or feature disabled).
            gh_message = ""
            try:
                gh_message = e.response.json().get("message", "")
            except Exception:
                pass
            status_code = e.response.status_code
            if status_code == 403:
                hint = gh_message or "Access denied. The token may lack permission for this resource, or the feature is disabled."
                return [{"error": f"403 — {hint}"}]
            if status_code == 404:
                return [{"error": gh_message or "Not found. The repository may be private/renamed, or this feature is disabled."}]
            return [{"error": f"GitHub API error: {status_code}{f' — {gh_message}' if gh_message else ''}"}]
        except Exception as e:
            logger.error(f"Unexpected error calling GitHub: {e}")
            return [{"error": "An unexpected error occurred while contacting GitHub"}]

    async def fetch_pull_requests(self, state: str = "open") -> List[Dict[str, Any]]:
        """Fetch PRs from the repository."""
        url = f"{self.BASE_URL}/repos/{self.repo_path}/pulls?state={state}"
        return await self._make_request("GET", url)

    async def fetch_recent_commits(self, branch: str = "main", limit: int = 10) -> List[Dict[str, Any]]:
        """Fetch recent commits from a branch."""
        url = f"{self.BASE_URL}/repos/{self.repo_path}/commits?sha={branch}&per_page={limit}"
        return await self._make_request("GET", url)

    async def fetch_branches(self) -> List[Dict[str, Any]]:
        """Fetch all branches for the repository."""
        url = f"{self.BASE_URL}/repos/{self.repo_path}/branches?per_page=100"
        return await self._make_request("GET", url)

    async def fetch_issues(self, state: str = "open") -> List[Dict[str, Any]]:
        """Fetch issues (excluding PRs) from the repository."""
        url = f"{self.BASE_URL}/repos/{self.repo_path}/issues?state={state}"
        data = await self._make_request("GET", url)
        
        if data and isinstance(data, list) and "error" not in data[0]:
            return [issue for issue in data if "pull_request" not in issue]
        return data
