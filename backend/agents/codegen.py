import json
import os
from typing import Optional

from jinja2 import Environment, FileSystemLoader

from backend.utils.api_client import call_llm
from backend.utils.logger import get_logger

logger = get_logger("codegen")

_prompt_path = os.path.join(os.path.dirname(__file__), "..", "prompts", "codegen.txt")
with open(_prompt_path, "r", encoding="utf-8") as f:
    SYSTEM_PROMPT = f.read().strip()

_templates_dir = os.path.join(os.path.dirname(__file__), "..", "templates")
_jinja_env = Environment(loader=FileSystemLoader(_templates_dir))

# Fallback template variables keyed by lowercase API name
FALLBACK_REGISTRY: dict[str, dict] = {
    "notion": {
        "api_url": "https://api.notion.com/v1/search",
        "http_method": "post",
        "headers_dict": '{"Authorization": f"Bearer {BEARER_TOKEN}", "Notion-Version": "2022-06-28", "Content-Type": "application/json"}',
    },
    "github": {
        "api_url": "https://api.github.com",
        "http_method": "get",
        "headers_dict": '{"Authorization": f"token {API_KEY}", "Accept": "application/vnd.github.v3+json"}',
    },
}

_GENERIC_FALLBACK = {
    "api_url": "https://example.com/api",
    "http_method": "get",
    "headers_dict": "{}",
}


async def generate_code(
    tool_spec: dict,
    job_id: str = "",
    validation_feedback: Optional[str] = None,
) -> tuple[str, str]:
    """
    Generate MCP server code and config JSON from a tool spec via LLM.
    Returns (server_code, config_json).
    Raises RuntimeError on failure.
    """
    logger.info("Starting code generation", extra={"job_id": job_id, "step": "codegen"})

    spec_json = json.dumps(tool_spec, indent=2)

    user_msg = f"Tool Specification:\n{spec_json}"
    if validation_feedback:
        user_msg += (
            f"\n\nPREVIOUS ATTEMPT FAILED VALIDATION. Fix these errors:\n{validation_feedback}"
        )

    raw_code = await call_llm(
        system_prompt=SYSTEM_PROMPT,
        user_message=user_msg,
        max_tokens=4096,
        temperature=0.0,
        job_id=job_id,
    )

    server_code = _clean_code_output(raw_code)

    if not server_code or len(server_code) < 50:
        raise RuntimeError("CodeGen returned empty or suspiciously short code")

    config_json = _render_config(tool_spec)

    logger.info("Code generation complete", extra={"job_id": job_id, "step": "codegen"})
    return server_code, config_json


def generate_fallback(tool_spec: dict, job_id: str = "") -> tuple[str, str]:
    """
    Generate code from Jinja2 templates when LLM codegen fails.
    Returns (server_code, config_json).
    """
    logger.warning(
        "Using fallback template", extra={"job_id": job_id, "step": "codegen_fallback"}
    )

    api_name = (tool_spec.get("external_api") or "").lower()
    fallback_vars = FALLBACK_REGISTRY.get(api_name, _GENERIC_FALLBACK)

    template = _jinja_env.get_template("base_server.py.j2")
    input_props = tool_spec.get("input_schema", {}).get("properties", {})
    input_params = ", ".join(
        f"{name}: {_python_type(prop.get('type', 'string'))}"
        for name, prop in input_props.items()
    )

    context = {
        "tool_name": tool_spec.get("tool_name", "generated_tool"),
        "description": tool_spec.get("description", "A generated MCP tool"),
        "auth_type": tool_spec.get("auth_type", "none"),
        "external_api": tool_spec.get("external_api"),
        "input_params": input_params or "query: str",
        "key_logic_steps": tool_spec.get("key_logic_steps", []),
        "headers_dict": fallback_vars["headers_dict"],
        "http_method": fallback_vars["http_method"],
        "api_url": fallback_vars["api_url"],
        "request_kwargs": "",
    }

    server_code = template.render(**context)
    config_json = _render_config(tool_spec)

    return server_code, config_json


def _render_config(tool_spec: dict) -> str:
    """Render the Claude Code MCP config JSON."""
    template = _jinja_env.get_template("config.json.j2")
    tool_name = tool_spec.get("tool_name", "generated_tool")
    auth_type = tool_spec.get("auth_type", "none")

    env_vars: dict[str, str] = {}
    if auth_type in ("api_key", "bearer", "oauth"):
        env_vars[f"{tool_name.upper()}_API_KEY"] = "YOUR_API_KEY_HERE"

    return template.render(tool_name=tool_name, env_vars=env_vars)


def _clean_code_output(raw: str) -> str:
    """Strip markdown code fences that LLMs sometimes wrap around code."""
    cleaned = raw.strip()
    if cleaned.startswith("```python"):
        cleaned = cleaned[len("```python") :].strip()
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:].strip()
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3].strip()
    return cleaned


def _python_type(json_type: str) -> str:
    """Map JSON Schema type to Python type hint."""
    mapping = {
        "string": "str",
        "integer": "int",
        "number": "float",
        "boolean": "bool",
        "array": "list",
        "object": "dict",
    }
    return mapping.get(json_type, "str")
