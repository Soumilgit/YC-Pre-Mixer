import json
import ast
import os
import re
from typing import Optional

from backend.utils.api_client import call_llm
from backend.utils.logger import get_logger

logger = get_logger("validator")

_prompt_path = os.path.join(os.path.dirname(__file__), "..", "prompts", "validator.txt")
with open(_prompt_path, "r", encoding="utf-8") as f:
    SYSTEM_PROMPT = f.read().strip()

# Patterns that should never appear in generated MCP servers
DANGEROUS_PATTERNS = [
    r"\beval\s*\(",
    r"\bexec\s*\(",
    r"\bos\.system\s*\(",
    r"\bsubprocess\b",
    r"\b__import__\s*\(",
]


async def validate(
    server_code: str,
    tool_spec: dict,
    job_id: str = "",
) -> dict:
    """
    Validate generated MCP server code with static checks + LLM review.
    Returns dict with: is_valid, errors, suggestions, fixed_code.
    """
    logger.info("Starting validation", extra={"job_id": job_id, "step": "validator"})

    errors: list[str] = []

    # --- Static checks (fast, no LLM needed) ---

    # 1. Syntax check
    try:
        ast.parse(server_code)
    except SyntaxError as e:
        errors.append(f"Python syntax error at line {e.lineno}: {e.msg}")

    # 2. Security check
    for pattern in DANGEROUS_PATTERNS:
        if re.search(pattern, server_code):
            errors.append(f"Dangerous pattern found: {pattern}")

    # 3. Required MCP patterns
    if "@mcp.tool()" not in server_code:
        errors.append("Missing @mcp.tool() decorator")
    if "FastMCP" not in server_code:
        errors.append("Missing FastMCP import/usage")
    if "mcp.run(" not in server_code:
        errors.append("Missing mcp.run() entry point")

    # 4. Auth check
    auth_type = tool_spec.get("auth_type", "none")
    if auth_type != "none":
        if "os.environ" not in server_code and "os.getenv" not in server_code:
            errors.append(
                "Auth required but no environment variable usage found — "
                "API keys may be hardcoded"
            )

    # --- LLM-based validation ---
    spec_json = json.dumps(tool_spec, indent=2)
    fixed_code: Optional[str] = None
    suggestions: list[str] = []

    try:
        raw_response = await call_llm(
            system_prompt=SYSTEM_PROMPT,
            user_message=(
                f"Original Tool Specification:\n{spec_json}\n\n"
                f"Generated Code:\n{server_code}"
            ),
            max_tokens=4096,
            temperature=0.0,
            job_id=job_id,
        )

        # Parse LLM validation response
        cleaned = raw_response.strip()
        if cleaned.startswith("```"):
            lines = cleaned.split("\n")
            if lines[-1].strip() == "```":
                cleaned = "\n".join(lines[1:-1])
            else:
                cleaned = "\n".join(lines[1:])

        llm_result = json.loads(cleaned)
        # Support both old schema ("errors") and new schema ("issues"/"status")
        llm_errors = llm_result.get("issues", llm_result.get("errors", []))
        errors.extend(llm_errors)
        fixed_code = llm_result.get("fixed_code")
        suggestions = llm_result.get("suggestions", [])
        # If LLM says status=fail or is_mcp_compliant=false, flag it
        if llm_result.get("status") == "fail" and not llm_errors:
            errors.append("LLM validator flagged code as failing")
        if llm_result.get("is_mcp_compliant") is False:
            errors.append("Code is not MCP-compliant per LLM validation")

    except (json.JSONDecodeError, Exception) as e:
        logger.warning(
            f"LLM validation response unparseable: {e}",
            extra={"job_id": job_id, "step": "validator"},
        )
        # Degrade gracefully to static-only results

    # Deduplicate errors
    errors = list(dict.fromkeys(errors))

    is_valid = len(errors) == 0
    result = {
        "is_valid": is_valid,
        "errors": errors,
        "suggestions": suggestions,
        "fixed_code": fixed_code if not is_valid else None,
    }

    logger.info(
        f"Validation complete: is_valid={is_valid}, error_count={len(errors)}",
        extra={"job_id": job_id, "step": "validator"},
    )
    return result
