"""Guesty API client with OAuth 2.0 authentication."""

import time
import logging
from typing import Optional, Any
import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class GuestyClient:
    """HTTP client for Guesty Open API with OAuth 2.0 authentication."""
    
    def __init__(self):
        self._access_token: Optional[str] = None
        self._token_expiry: float = 0
        self._client = httpx.Client(timeout=30.0)
    
    def _get_token(self) -> str:
        """Get or refresh OAuth access token."""
        # Check if token is still valid (with 5-minute buffer)
        if self._access_token and time.time() < (self._token_expiry - 300):
            return self._access_token
        
        logger.info("Fetching new Guesty access token")
        
        response = self._client.post(
            settings.guesty_token_url,
            data={
                "grant_type": "client_credentials",
                "client_id": settings.guesty_client_id,
                "client_secret": settings.guesty_client_secret,
                "scope": "open-api",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        
        if response.status_code != 200:
            logger.error(f"Failed to get Guesty token: {response.text}")
            raise Exception(f"Failed to get Guesty access token: {response.status_code}")
        
        data = response.json()
        self._access_token = data["access_token"]
        self._token_expiry = time.time() + data.get("expires_in", 86400)
        
        logger.info("Successfully obtained Guesty access token")
        return self._access_token
    
    def _make_request(
        self, 
        method: str, 
        endpoint: str, 
        params: Optional[dict] = None,
        json_data: Optional[dict] = None,
        retries: int = 3,
    ) -> Any:
        """Make authenticated request to Guesty API with retry logic."""
        url = f"{settings.guesty_base_url}{endpoint}"
        headers = {
            "Authorization": f"Bearer {self._get_token()}",
            "Content-Type": "application/json",
        }
        
        for attempt in range(retries):
            try:
                response = self._client.request(
                    method=method,
                    url=url,
                    headers=headers,
                    params=params,
                    json=json_data,
                )
                
                if response.status_code == 401:
                    # Token expired, refresh and retry
                    self._access_token = None
                    headers["Authorization"] = f"Bearer {self._get_token()}"
                    continue
                
                if response.status_code == 429:
                    # Rate limited, exponential backoff
                    wait_time = 2 ** attempt
                    logger.warning(f"Rate limited, waiting {wait_time}s before retry")
                    time.sleep(wait_time)
                    continue
                
                response.raise_for_status()
                return response.json()
                
            except httpx.HTTPError as e:
                logger.error(f"HTTP error on attempt {attempt + 1}: {e}")
                if attempt == retries - 1:
                    raise
                time.sleep(2 ** attempt)
        
        return None
    
    def get_listings(self, skip: int = 0, limit: int = 100) -> dict:
        """Fetch listings from Guesty."""
        return self._make_request(
            "GET", 
            "/listings",
            params={"skip": skip, "limit": limit},
        )
    
    def get_reservations(
        self, 
        skip: int = 0, 
        limit: int = 100,
        filters: Optional[list] = None,
    ) -> dict:
        """Fetch reservations from Guesty."""
        params = {"skip": skip, "limit": limit}
        if filters:
            import json
            params["filters"] = json.dumps(filters)
        
        return self._make_request("GET", "/reservations", params=params)
    
    def get_guests(self, skip: int = 0, limit: int = 100) -> dict:
        """Fetch guests from Guesty."""
        return self._make_request(
            "GET",
            "/guests",
            params={"skip": skip, "limit": limit},
        )
    
    def get_conversations(self, skip: int = 0, limit: int = 100) -> dict:
        """Fetch conversations from Guesty."""
        return self._make_request(
            "GET",
            "/communication/conversations",
            params={"skip": skip, "limit": limit},
        )
    
    def close(self):
        """Close the HTTP client."""
        self._client.close()


# Global client instance
_client: Optional[GuestyClient] = None


def get_guesty_client() -> GuestyClient:
    """Get or create Guesty client instance."""
    global _client
    if _client is None:
        _client = GuestyClient()
    return _client
