import os
import asyncio
from typing import Optional

from google import genai
from google.genai import types
from dotenv import load_dotenv

from backend.utils.logger import get_logger

load_dotenv()
logger = get_logger("api_client")

_client: Optional[genai.Client] = None


def get_client() -> genai.Client:
    """Lazy singleton. Validates GEMINI_API_KEY on first call."""
    global _client
    if _client is None:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise EnvironmentError(
                "GEMINI_API_KEY is not set. "
                "Copy .env.example to .env and fill in your key."
            )
        _client = genai.Client(api_key=api_key)
    return _client


async def call_llm(
    system_prompt: str,
    user_message: str,
    max_tokens: int = 4096,
    temperature: float = 0.0,
    job_id: str = "",
) -> str:
    """
    Call Gemini with retry logic. Returns the text content of the response.
    Raises after MAX_RETRIES exhausted.
    """
    client = get_client()
    model = os.getenv("GEMINI_MODEL", "gemini-flash-lite-latest")
    max_retries = int(os.getenv("MAX_RETRIES", "3"))

    for attempt in range(1, max_retries + 1):
        try:
            logger.info(
                f"LLM call attempt {attempt}/{max_retries}",
                extra={"job_id": job_id, "step": "llm_call"},
            )
            response = await client.aio.models.generate_content(
                model=model,
                contents=user_message,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    max_output_tokens=max_tokens,
                    temperature=temperature,
                ),
            )
            return response.text.strip()

        except Exception as e:
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
