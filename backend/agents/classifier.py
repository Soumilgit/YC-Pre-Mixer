import json
import os
from typing import Optional

from backend.utils.api_client import call_llm
from backend.utils.logger import get_logger

logger = get_logger("classifier")

_prompt_path = os.path.join(os.path.dirname(__file__), "..", "prompts", "classifier.txt")
with open(_prompt_path, "r", encoding="utf-8") as f:
    SYSTEM_PROMPT = f.read().strip()


async def classify(
    user_description: str,
    auth_context: Optional[str] = None,
    job_id: str = "",
) -> dict:
    """
    Classify a user's tool description into a structured spec.
    Returns the parsed dict on success.
    Raises ValueError if the LLM output is not valid JSON or missing fields.
    """
    user_msg = user_description
    if auth_context:
        user_msg += f"\n\nAdditional auth context: {auth_context}"

    logger.info(
        "Starting classification",
        extra={"job_id": job_id, "step": "classifier"},
    )

    raw_response = await call_llm(
        system_prompt=SYSTEM_PROMPT,
        user_message=user_msg,
        max_tokens=2048,
        temperature=0.0,
        job_id=job_id,
    )

    # Strip accidental markdown fences
    cleaned = raw_response.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        if lines[-1].strip() == "```":
            cleaned = "\n".join(lines[1:-1])
        else:
            cleaned = "\n".join(lines[1:])

    try:
        spec = json.loads(cleaned)
    except json.JSONDecodeError as e:
        logger.error(
            f"Classifier output is not valid JSON: {e}",
            extra={"job_id": job_id, "step": "classifier"},
        )
        raise ValueError(
            f"Classifier returned invalid JSON: {e}\nRaw output: {raw_response[:500]}"
        )

    required_fields = [
        "tool_name",
        "description",
        "external_api",
        "auth_type",
        "input_schema",
        "output_schema",
        "key_logic_steps",
    ]
    missing = [f for f in required_fields if f not in spec]
    if missing:
        raise ValueError(f"Classifier output missing required fields: {missing}")

    logger.info(
        f"Classification complete: tool_name={spec.get('tool_name')}",
        extra={"job_id": job_id, "step": "classifier"},
    )
    return spec
