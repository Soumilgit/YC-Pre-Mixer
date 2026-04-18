from typing import TypedDict, Optional, List, Literal

from langgraph.graph import StateGraph, START, END

from backend.agents.classifier import classify
from backend.agents.codegen import generate_code, generate_fallback
from backend.agents.validator import validate
from backend.utils.logger import get_logger

logger = get_logger("graph")


class PipelineState(TypedDict):
    # Input
    job_id: str
    user_description: str
    auth_context: Optional[str]

    # Classifier output
    tool_spec: Optional[dict]
    classifier_error: Optional[str]

    # CodeGen output
    server_code: Optional[str]
    config_json: Optional[str]
    codegen_error: Optional[str]
    used_fallback: bool

    # Validator output
    is_valid: bool
    validation_errors: Optional[List[str]]
    validation_suggestions: Optional[List[str]]
    final_server_code: Optional[str]
    final_config_json: Optional[str]

    # Pipeline metadata
    current_step: str
    error_message: Optional[str]
    codegen_attempts: int


# ---------------------------------------------------------------------------
# Node functions — each takes state, returns a partial state update dict
# ---------------------------------------------------------------------------


async def classifier_node(state: PipelineState) -> dict:
    """Run the Classifier agent."""
    try:
        spec = await classify(
            user_description=state["user_description"],
            auth_context=state.get("auth_context"),
            job_id=state["job_id"],
        )
        return {
            "tool_spec": spec,
            "classifier_error": None,
            "current_step": "classified",
        }
    except (ValueError, RuntimeError) as e:
        logger.error(
            f"Classifier failed: {e}", extra={"job_id": state["job_id"], "step": "classifier"}
        )
        return {
            "tool_spec": None,
            "classifier_error": str(e),
            "current_step": "classifier_failed",
        }


async def codegen_node(state: PipelineState) -> dict:
    """Run the CodeGen agent."""
    try:
        feedback = None
        if state.get("validation_errors"):
            feedback = "\n".join(state["validation_errors"])

        server_code, config_json = await generate_code(
            tool_spec=state["tool_spec"],
            job_id=state["job_id"],
            validation_feedback=feedback,
        )
        return {
            "server_code": server_code,
            "config_json": config_json,
            "codegen_error": None,
            "used_fallback": False,
            "current_step": "code_generated",
            "codegen_attempts": state.get("codegen_attempts", 0) + 1,
        }
    except Exception as e:
        logger.error(
            f"CodeGen failed: {e}", extra={"job_id": state["job_id"], "step": "codegen"}
        )
        return {
            "server_code": None,
            "config_json": None,
            "codegen_error": str(e),
            "current_step": "codegen_failed",
            "codegen_attempts": state.get("codegen_attempts", 0) + 1,
        }


async def validator_node(state: PipelineState) -> dict:
    """Run the Validator agent."""
    result = await validate(
        server_code=state["server_code"],
        tool_spec=state["tool_spec"],
        job_id=state["job_id"],
    )
    if result["is_valid"]:
        return {
            "is_valid": True,
            "validation_errors": [],
            "validation_suggestions": result.get("suggestions", []),
            "final_server_code": state["server_code"],
            "final_config_json": state["config_json"],
            "current_step": "validated",
        }
    return {
        "is_valid": False,
        "validation_errors": result["errors"],
        "validation_suggestions": result.get("suggestions", []),
        "final_server_code": result.get("fixed_code") or state["server_code"],
        "final_config_json": state["config_json"],
        "current_step": "validation_failed",
    }


async def fallback_node(state: PipelineState) -> dict:
    """Use Jinja2 templates as a fallback."""
    logger.warning("Entering fallback", extra={"job_id": state["job_id"], "step": "fallback"})
    server_code, config_json = generate_fallback(
        tool_spec=state["tool_spec"],
        job_id=state["job_id"],
    )
    return {
        "server_code": server_code,
        "config_json": config_json,
        "final_server_code": server_code,
        "final_config_json": config_json,
        "used_fallback": True,
        "is_valid": True,  # Fallback templates are pre-validated
        "current_step": "complete_fallback",
    }


async def fail_node(state: PipelineState) -> dict:
    """Terminal failure node."""
    error = (
        state.get("classifier_error") or state.get("codegen_error") or "Unknown error"
    )
    return {
        "current_step": "failed",
        "error_message": error,
    }


# ---------------------------------------------------------------------------
# Routing functions
# ---------------------------------------------------------------------------


def route_after_classifier(state: PipelineState) -> Literal["codegen", "fail"]:
    if state.get("classifier_error") or not state.get("tool_spec"):
        return "fail"
    return "codegen"


def route_after_codegen(state: PipelineState) -> Literal["validator", "fallback"]:
    if state.get("codegen_error") or not state.get("server_code"):
        return "fallback"
    return "validator"


def route_after_validator(state: PipelineState) -> Literal["codegen", "fallback", "end"]:
    if state.get("is_valid"):
        return "end"
    # Retry codegen once with validation feedback
    if state.get("codegen_attempts", 0) < 2:
        return "codegen"
    # Exhausted retries — use fallback
    return "fallback"


# ---------------------------------------------------------------------------
# Build and compile the graph
# ---------------------------------------------------------------------------


def build_graph():
    """Construct and compile the LangGraph pipeline."""
    graph = StateGraph(PipelineState)

    graph.add_node("classifier", classifier_node)
    graph.add_node("codegen", codegen_node)
    graph.add_node("validator", validator_node)
    graph.add_node("fallback", fallback_node)
    graph.add_node("fail", fail_node)

    graph.add_edge(START, "classifier")

    graph.add_conditional_edges(
        "classifier",
        route_after_classifier,
        {"codegen": "codegen", "fail": "fail"},
    )
    graph.add_conditional_edges(
        "codegen",
        route_after_codegen,
        {"validator": "validator", "fallback": "fallback"},
    )
    graph.add_conditional_edges(
        "validator",
        route_after_validator,
        {"codegen": "codegen", "fallback": "fallback", "end": END},
    )

    graph.add_edge("fallback", END)
    graph.add_edge("fail", END)

    return graph.compile()


# Module-level compiled graph singleton
pipeline = build_graph()
