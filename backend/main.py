import os
import asyncio
import uuid
from datetime import datetime, timezone, timedelta
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from backend.graph import pipeline, PipelineState
from backend.agents.validator import validate as validate_code
from backend.utils.logger import get_logger

load_dotenv()
logger = get_logger("main")


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class GenerateRequest(BaseModel):
    description: str = Field(
        ..., min_length=10, max_length=2000, description="Plain-English tool description"
    )
    auth_context: Optional[str] = Field(
        None, max_length=500, description="Optional auth context"
    )


class GenerateResponse(BaseModel):
    job_id: str


class JobStatus(BaseModel):
    job_id: str
    status: str  # pending | running | completed | failed
    current_step: str
    result: Optional[dict] = None
    error: Optional[str] = None
    created_at: str
    updated_at: str


class ValidateRequest(BaseModel):
    server_code: str = Field(..., min_length=20)
    tool_spec: dict


class ValidateResponse(BaseModel):
    is_valid: bool
    errors: list[str]
    suggestions: list[str]
    fixed_code: Optional[str] = None


class ExampleServer(BaseModel):
    name: str
    description: str
    auth_type: str
    inputs: dict


class ExamplesResponse(BaseModel):
    examples: list[ExampleServer]


# ---------------------------------------------------------------------------
# Job store
# ---------------------------------------------------------------------------


class JobRecord:
    def __init__(self, job_id: str):
        self.job_id = job_id
        self.status = "pending"
        self.current_step = "queued"
        self.result: Optional[dict] = None
        self.error: Optional[str] = None
        self.created_at = datetime.now(timezone.utc)
        self.updated_at = datetime.now(timezone.utc)
        self.task: Optional[asyncio.Task] = None

    def to_response(self) -> JobStatus:
        return JobStatus(
            job_id=self.job_id,
            status=self.status,
            current_step=self.current_step,
            result=self.result,
            error=self.error,
            created_at=self.created_at.isoformat(),
            updated_at=self.updated_at.isoformat(),
        )


jobs: dict[str, JobRecord] = {}
JOB_TTL = timedelta(hours=1)


# ---------------------------------------------------------------------------
# Background pipeline runner
# ---------------------------------------------------------------------------


async def run_pipeline(job_id: str, description: str, auth_context: Optional[str]):
    """Execute the LangGraph pipeline and update the job store."""
    job = jobs[job_id]
    job.status = "running"
    job.current_step = "classifying"
    job.updated_at = datetime.now(timezone.utc)

    try:
        initial_state: PipelineState = {
            "job_id": job_id,
            "user_description": description,
            "auth_context": auth_context,
            "tool_spec": None,
            "classifier_error": None,
            "server_code": None,
            "config_json": None,
            "codegen_error": None,
            "used_fallback": False,
            "is_valid": False,
            "validation_errors": None,
            "validation_suggestions": None,
            "final_server_code": None,
            "final_config_json": None,
            "current_step": "classifying",
            "error_message": None,
            "codegen_attempts": 0,
        }

        final_state = await pipeline.ainvoke(initial_state)

        if final_state.get("current_step") == "failed":
            job.status = "failed"
            job.current_step = "failed"
            job.error = final_state.get("error_message", "Pipeline failed")
        else:
            job.status = "completed"
            job.current_step = "complete"
            tool_spec = final_state.get("tool_spec") or {}
            job.result = {
                "server_code": final_state.get("final_server_code"),
                "config_json": final_state.get("final_config_json"),
                "tool_name": tool_spec.get("tool_name", "unknown"),
                "description": tool_spec.get("description", ""),
                "used_fallback": final_state.get("used_fallback", False),
                "validation_suggestions": final_state.get("validation_suggestions", []),
                "setup_command": "python server.py",
            }

    except Exception as e:
        logger.error(f"Pipeline crashed: {e}", extra={"job_id": job_id, "step": "pipeline"})
        job.status = "failed"
        job.current_step = "failed"
        job.error = f"Internal error: {str(e)}"

    job.updated_at = datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Stale job cleanup
# ---------------------------------------------------------------------------


async def cleanup_stale_jobs():
    """Remove jobs older than JOB_TTL. Runs every 10 minutes."""
    while True:
        await asyncio.sleep(600)
        now = datetime.now(timezone.utc)
        stale = [jid for jid, j in jobs.items() if now - j.created_at > JOB_TTL]
        for jid in stale:
            del jobs[jid]
        if stale:
            logger.info(f"Cleaned up {len(stale)} stale jobs")


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.error("GEMINI_API_KEY not set! /generate and /validate will fail.")

    log_level = os.getenv("LOG_LEVEL", "INFO")
    logger.setLevel(log_level)
    logger.info(f"AgentForge backend starting (log_level={log_level})")

    cleanup_task = asyncio.create_task(cleanup_stale_jobs())
    yield

    # Shutdown
    cleanup_task.cancel()
    logger.info("AgentForge backend shutting down")


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="AgentForge API",
    description="MCP Server Builder — generates MCP servers from plain-English descriptions",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Pre-built examples
# ---------------------------------------------------------------------------

EXAMPLES = [
    ExampleServer(
        name="notion-search",
        description="Search Notion workspace and return summaries of top N pages",
        auth_type="bearer",
        inputs={"query": "string", "limit": "integer"},
    ),
    ExampleServer(
        name="github-issues",
        description="Fetch open issues from a GitHub repo filtered by label",
        auth_type="api_key",
        inputs={"repo": "string", "label": "string"},
    ),
    ExampleServer(
        name="web-scraper",
        description="Scrape a URL and return main content as clean text",
        auth_type="none",
        inputs={"url": "string", "selector": "string (optional)"},
    ),
]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@app.post("/generate", response_model=GenerateResponse, status_code=202)
async def generate(request: GenerateRequest):
    """Start the MCP server generation pipeline. Returns a job_id for polling."""
    if not os.getenv("GEMINI_API_KEY"):
        raise HTTPException(
            status_code=503,
            detail="GEMINI_API_KEY is not configured. Set it in .env and restart.",
        )

    job_id = str(uuid.uuid4())
    job = JobRecord(job_id)
    jobs[job_id] = job

    job.task = asyncio.create_task(
        run_pipeline(job_id, request.description, request.auth_context)
    )

    logger.info(f"Job created: {job_id}", extra={"job_id": job_id, "step": "generate"})
    return GenerateResponse(job_id=job_id)


@app.get("/generate/{job_id}", response_model=JobStatus)
async def get_job_status(job_id: str):
    """Poll the status of a generation job."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    return jobs[job_id].to_response()


@app.get("/examples", response_model=ExamplesResponse)
async def get_examples():
    """Return list of pre-built example MCP server templates."""
    return ExamplesResponse(examples=EXAMPLES)


@app.post("/validate", response_model=ValidateResponse)
async def validate_endpoint(request: ValidateRequest):
    """Validate an existing MCP server definition without regenerating."""
    if not os.getenv("GEMINI_API_KEY"):
        raise HTTPException(
            status_code=503,
            detail="GEMINI_API_KEY is not configured.",
        )

    result = await validate_code(
        server_code=request.server_code,
        tool_spec=request.tool_spec,
        job_id=f"validate-{str(uuid.uuid4())[:8]}",
    )
    return ValidateResponse(**result)


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "ok",
        "api_key_configured": bool(os.getenv("GEMINI_API_KEY")),
        "active_jobs": len([j for j in jobs.values() if j.status == "running"]),
    }
