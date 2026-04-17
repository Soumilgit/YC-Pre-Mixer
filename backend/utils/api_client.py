import os
import asyncio
from typing import Optional

from anthropic import AsyncAnthropic, APIError, RateLimitError, APIConnectionError
from dotenv import load_dotenv

from backend.utils.logger import get_logger

load_dotenv()
logger = get_logger("api_client")

_client: Optional[AsyncAnthropic] = None


def get_client() -> AsyncAnthropic:
    """Lazy singleton. Validates ANTHROPIC_API_KEY on first call."""
    global _client
    if _client is None:
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise EnvironmentError(
                "ANTHROPIC_API_KEY is not set. "
                "Copy .env.example to .env and fill in your key."
            )
        _client = AsyncAnthropic(
            api_key=api_key,
            max_retries=0,  # We handle retries ourselves for logging
        )
    return _client


async def call_llm(
    system_prompt: str,
    user_message: str,
    max_tokens: int = 4096,
    temperature: float = 0.0,
    job_id: str = "",
) -> str:
    """
    Call Claude with retry logic. Returns the text content of the response.
    Raises after MAX_RETRIES exhausted.
    """
    client = get_client()
    model = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-20250514")
    max_retries = int(os.getenv("MAX_RETRIES", "3"))

    for attempt in range(1, max_retries + 1):
        try:
            logger.info(
                f"LLM call attempt {attempt}/{max_retries}",
                extra={"job_id": job_id, "step": "llm_call"},
            )
            response = await client.messages.create(
                model=model,
                max_tokens=max_tokens,
                temperature=temperature,
                system=system_prompt,
                messages=[{"role": "user", "content": user_message}],
            )
            text = ""
            for block in response.content:
                if block.type == "text":
                    text += block.text
            return text.strip()

        except (RateLimitError, APIConnectionError, APIError) as e:
            if attempt == max_retries:
                logger.error(
                    f"LLM call failed after {max_retries} attempts: {e}",
                    extra={"job_id": job_id, "step": "llm_call"},
                )
                raise
            wait = 2 ** attempt  # 2s, 4s, 8s
            logger.warning(
                f"LLM call attempt {attempt} failed, retrying in {wait}s: {e}",
                extra={"job_id": job_id, "step": "llm_call"},
            )
            await asyncio.sleep(wait)

    raise RuntimeError("LLM call failed: exhausted retries")
