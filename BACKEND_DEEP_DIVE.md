# AgentForge Backend - Deep Technical Documentation

> A module-by-module breakdown of how the backend works, what every file does, and how data flows through the entire system.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Request Lifecycle](#request-lifecycle)
3. [Module Breakdown](#module-breakdown)
   - [backend/main.py - FastAPI Application](#backendmainpy---fastapi-application)
   - [backend/graph.py - LangGraph Pipeline](#backendgraphpy---langgraph-pipeline)
   - [backend/agents/classifier.py - Agent 1: Classifier](#backendagentsclassifierpy---agent-1-classifier)
   - [backend/agents/codegen.py - Agent 2: Code Generator](#backendagentscodegenpy---agent-2-code-generator)
   - [backend/agents/validator.py - Agent 3: Validator](#backendagentsvalidatorpy---agent-3-validator)
   - [backend/utils/api_client.py - Anthropic API Client](#backendutilsapi_clientpy---anthropic-api-client)
   - [backend/utils/logger.py - Structured Logger](#backendutilsloggerpy---structured-logger)
   - [backend/prompts/ - System Prompts](#backendprompts---system-prompts)
   - [backend/templates/ - Jinja2 Fallback Templates](#backendtemplates---jinja2-fallback-templates)
4. [Error Handling & Robustness](#error-handling--robustness)
5. [Data Flow Diagram](#data-flow-diagram)
6. [Configuration](#configuration)

---

## Architecture Overview

The backend is a **FastAPI** application that orchestrates a 3-agent pipeline using **LangGraph**. When a user describes a tool in plain English, the pipeline:

1. **Classifies** the description into a structured JSON spec (Agent 1)
2. **Generates** a complete MCP server in Python (Agent 2)
3. **Validates** the generated code for correctness and security (Agent 3)

All three agents are powered by **Claude Sonnet** via the Anthropic API. If any step fails, the system falls back to pre-built Jinja2 templates so the user always gets a result.

```
User Request
    |
    v
FastAPI (main.py) --> creates async job --> returns job_id (HTTP 202)
    |
    v
LangGraph Pipeline (graph.py)
    |
    +--> Classifier Agent (classifier.py)
    |        |
    |        v  JSON spec
    |
    +--> CodeGen Agent (codegen.py)
    |        |
    |        v  server.py + config.json
    |
    +--> Validator Agent (validator.py)
    |        |
    |        v  pass/fail + fixed_code
    |
    +--> [If fail: retry codegen once, then fallback to Jinja2 templates]
    |
    v
Job store updated --> Frontend polls GET /generate/{job_id}
```

---

## Request Lifecycle

Here is exactly what happens when the frontend sends `POST /generate`:

### Step 1: Job Creation (main.py)
- FastAPI validates the request body using Pydantic (`GenerateRequest`)
- Checks that `ANTHROPIC_API_KEY` is set (returns 503 if not)
- Creates a `JobRecord` with a UUID4 `job_id`, stores it in an in-memory dict
- Launches the LangGraph pipeline as an `asyncio.Task` (non-blocking)
- Returns `{"job_id": "..."}` with HTTP 202 Accepted immediately

### Step 2: Pipeline Execution (graph.py)
The `run_pipeline()` function builds the initial `PipelineState` and calls `pipeline.ainvoke()`. The LangGraph state machine takes over:

**Node 1: Classifier**
- Calls Claude with the user's description
- Returns a structured JSON spec with tool_name, auth_type, input/output schemas, etc.
- If this fails (bad JSON, missing fields), the pipeline routes to the `fail` node

**Node 2: CodeGen**
- Takes the JSON spec, calls Claude to generate a complete Python MCP server
- If this fails (empty output, API error), routes to `fallback` node
- If validation feedback exists (retry), appends errors to the prompt

**Node 3: Validator**
- Runs static checks (AST syntax, security patterns, MCP compliance)
- Calls Claude for semantic validation
- If valid: routes to END
- If invalid AND first attempt: routes back to CodeGen with error feedback
- If invalid AND second attempt: routes to fallback

**Fallback Node**
- Renders a Jinja2 template (`base_server.py.j2`) with the spec's fields
- Always produces valid code (templates are pre-tested)
- Sets `used_fallback: true` in the result

**Fail Node**
- Sets `status: "failed"` with a clear error message
- Only reached if the Classifier itself fails (no spec = no way to generate anything)

### Step 3: Result Storage (main.py)
- `run_pipeline()` reads the final state from LangGraph
- Updates the `JobRecord` with status, result, or error
- The frontend polls `GET /generate/{job_id}` every 2 seconds and gets the update

---

## Module Breakdown

---

### `backend/main.py` - FastAPI Application

**Role:** HTTP layer, job management, CORS, startup validation.

#### Pydantic Models

| Model | Purpose |
|-------|---------|
| `GenerateRequest` | Validates POST /generate body. `description` must be 10-2000 chars. Optional `auth_context` (max 500 chars). |
| `GenerateResponse` | Returns `job_id` string. |
| `JobStatus` | Full job state: `job_id`, `status`, `current_step`, `result`, `error`, timestamps. |
| `ValidateRequest` | POST /validate body. `server_code` (min 20 chars) + `tool_spec` dict. |
| `ValidateResponse` | Validation result: `is_valid`, `errors`, `suggestions`, `fixed_code`. |
| `ExampleServer` | Schema for pre-built examples: `name`, `description`, `auth_type`, `inputs`. |

#### Job Store

```python
jobs: dict[str, JobRecord] = {}
```

An in-memory dictionary mapping `job_id` -> `JobRecord`. Each record tracks:
- `status`: "pending" | "running" | "completed" | "failed"
- `current_step`: "queued" | "classifying" | "generating" | "validating" | "complete" | "failed"
- `result`: The generated server_code, config_json, tool_name, etc. (only when completed)
- `error`: Human-readable error message (only when failed)
- `created_at` / `updated_at`: UTC timestamps
- `task`: Reference to the `asyncio.Task` running the pipeline

**Why in-memory?** For a hackathon single-process server, this is perfectly adequate. No need for Redis or a database. Jobs are automatically cleaned up after 1 hour by a background task.

#### Endpoints

**`POST /generate`** (HTTP 202)
- Entry point for MCP server generation
- Returns job_id immediately, pipeline runs in background
- Environment guard: returns 503 if API key is missing

**`GET /generate/{job_id}`** (HTTP 200)
- Polling endpoint for frontend
- Returns current job status, step, and result when complete
- Returns 404 if job_id doesn't exist

**`GET /examples`** (HTTP 200)
- Returns 3 pre-built example server definitions
- Works even without an API key (static data)
- Examples: notion-search, github-issues, web-scraper

**`POST /validate`** (HTTP 200)
- Standalone validation endpoint
- Takes existing server_code + tool_spec, runs the validator agent
- Useful for validating user-modified code

**`GET /health`** (HTTP 200)
- Returns server status, whether API key is configured, and count of active jobs
- Used by frontend on page load to check connectivity

#### Lifespan Management

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
```

On startup:
- Validates that `ANTHROPIC_API_KEY` is set (logs error but doesn't crash — /examples still works)
- Sets log level from `LOG_LEVEL` env var
- Starts the background cleanup task

On shutdown:
- Cancels the cleanup task
- Logs shutdown

#### CORS

Configured to allow requests from:
- `http://localhost:5173` (Vite dev server)
- `http://localhost:3000` (alternative frontend)

---

### `backend/graph.py` - LangGraph Pipeline

**Role:** Orchestrates the 3-agent pipeline as a state machine with conditional routing and retry logic.

#### PipelineState

A flat `TypedDict` that accumulates data as it flows through nodes:

```
Input fields:          job_id, user_description, auth_context
Classifier output:     tool_spec, classifier_error
CodeGen output:        server_code, config_json, codegen_error, used_fallback
Validator output:      is_valid, validation_errors, validation_suggestions,
                       final_server_code, final_config_json
Metadata:              current_step, error_message, codegen_attempts
```

Each node reads what it needs from state and returns a partial dict that gets merged back. This is the standard LangGraph pattern.

#### Nodes (5 total)

| Node | Function | Input from State | Output to State |
|------|----------|-----------------|-----------------|
| `classifier_node` | Calls `classify()` | user_description, auth_context | tool_spec OR classifier_error |
| `codegen_node` | Calls `generate_code()` | tool_spec, validation_errors (for retry) | server_code, config_json OR codegen_error |
| `validator_node` | Calls `validate()` | server_code, tool_spec | is_valid, validation_errors, final_server_code |
| `fallback_node` | Calls `generate_fallback()` | tool_spec | server_code, config_json (from Jinja2) |
| `fail_node` | Sets error state | classifier_error OR codegen_error | error_message, current_step="failed" |

#### Routing Logic (3 conditional routers)

**`route_after_classifier`**
```
If classifier_error OR no tool_spec --> "fail"
Else --> "codegen"
```
Rationale: Without a valid spec, we cannot generate anything. No fallback possible here.

**`route_after_codegen`**
```
If codegen_error OR no server_code --> "fallback"
Else --> "validator"
```
Rationale: If LLM code generation fails, go straight to template-based fallback.

**`route_after_validator`**
```
If is_valid --> END (success)
If not valid AND codegen_attempts < 2 --> "codegen" (retry with feedback)
If not valid AND codegen_attempts >= 2 --> "fallback" (give up, use template)
```
Rationale: Give the LLM one chance to self-correct based on validation errors. If it fails twice, the Jinja2 template is more reliable.

#### Graph Structure

```
START --> classifier --> [route] --> codegen --> [route] --> validator --> [route] --> END
                           |                      |                        |
                           v                      v                        v
                         fail               fallback                 codegen (retry)
                           |                      |                   or fallback
                           v                      v
                          END                    END
```

The graph is compiled once at module import time:
```python
pipeline = build_graph()
```
This means there's zero overhead per request — the graph structure is built once and reused.

---

### `backend/agents/classifier.py` - Agent 1: Classifier

**Role:** Takes a plain-English tool description and extracts a structured JSON specification.

#### How It Works

1. Loads the system prompt from `prompts/classifier.txt` **once at import time** (not per request)
2. Builds a user message from the description + optional auth_context
3. Calls Claude via `call_llm()` with temperature=0.0 (deterministic output)
4. Strips any accidental markdown code fences from the response
5. Parses the response as JSON
6. Validates that all 7 required fields are present:
   - `tool_name`, `description`, `external_api`, `auth_type`
   - `input_schema`, `output_schema`, `key_logic_steps`
7. Returns the parsed dict

#### Error Handling

- **Invalid JSON:** Raises `ValueError` with the raw LLM output (first 500 chars) for debugging
- **Missing fields:** Raises `ValueError` listing which fields are absent
- **LLM API failure:** Propagated from `call_llm()` (already retried 3 times with backoff)

#### Example Input/Output

**Input:**
```
"I want a tool that searches GitHub issues by label and returns titles with URLs"
```

**Output:**
```json
{
  "tool_name": "github_issue_search",
  "description": "Search GitHub issues by label and return titles with URLs",
  "external_api": "github",
  "auth_type": "api_key",
  "auth_details": "Use GITHUB_TOKEN env var",
  "input_schema": {
    "type": "object",
    "properties": {
      "repo": {"type": "string", "description": "GitHub repo in owner/repo format"},
      "label": {"type": "string", "description": "Issue label to filter by"}
    },
    "required": ["repo", "label"]
  },
  "output_schema": {
    "type": "object",
    "properties": {
      "issues": {"type": "array", "items": {"type": "object"}}
    }
  },
  "example_inputs": ["repo=torvalds/linux, label=bug"],
  "key_logic_steps": [
    "Authenticate with GitHub API using token",
    "GET /repos/{owner}/{repo}/issues?labels={label}",
    "Extract title and html_url from each issue",
    "Return array of {title, url} objects"
  ]
}
```

---

### `backend/agents/codegen.py` - Agent 2: Code Generator

**Role:** Takes the structured spec and generates a complete, runnable MCP server file + Claude Code config.

#### Two Code Paths

**Primary Path: `generate_code()` (LLM-based)**
- Sends the full JSON spec to Claude with the codegen system prompt
- If this is a retry, appends the validation errors to the prompt so Claude can fix them
- Strips markdown fences from the output
- Rejects suspiciously short responses (<50 chars)
- Also generates `config.json` using Jinja2 template

**Fallback Path: `generate_fallback()` (Template-based)**
- Used when LLM generation fails or validation fails twice
- Renders `base_server.py.j2` with variables from the spec
- Looks up API-specific template variables from `FALLBACK_REGISTRY`

#### Fallback Registry

```python
FALLBACK_REGISTRY = {
    "notion": {
        "api_url": "https://api.notion.com/v1/search",
        "http_method": "post",
        "headers_dict": '{"Authorization": f"Bearer {BEARER_TOKEN}", ...}',
    },
    "github": {
        "api_url": "https://api.github.com",
        "http_method": "get",
        "headers_dict": '{"Authorization": f"token {API_KEY}", ...}',
    },
}
```

If the API name doesn't match any known entry, a generic HTTP template is used with `https://example.com/api` as a placeholder.

#### Helper Functions

- **`_clean_code_output(raw)`**: Strips markdown fences (```` ```python ... ``` ````) that Claude sometimes wraps around code despite instructions
- **`_python_type(json_type)`**: Maps JSON Schema types to Python type hints (e.g., "string" -> "str", "integer" -> "int")
- **`_render_config(tool_spec)`**: Generates Claude Code MCP config JSON from `config.json.j2`, including environment variables for auth

#### Config JSON Output

For a tool named `github_issue_search` with `auth_type: "api_key"`:
```json
{
  "mcpServers": {
    "github_issue_search": {
      "command": "python",
      "args": ["server.py"],
      "env": {
        "GITHUB_ISSUE_SEARCH_API_KEY": "YOUR_API_KEY_HERE"
      }
    }
  }
}
```

---

### `backend/agents/validator.py` - Agent 3: Validator

**Role:** Validates generated MCP server code using both static analysis and LLM review.

#### Two-Tier Validation

**Tier 1: Static Checks (fast, no LLM, always runs)**

| Check | What It Does | How |
|-------|-------------|-----|
| Syntax | Verifies valid Python | `ast.parse(server_code)` |
| Security | Detects dangerous patterns | Regex for `eval()`, `exec()`, `os.system()`, `subprocess`, `__import__()` |
| MCP Tool | Requires `@mcp.tool()` decorator | String search |
| FastMCP | Requires `FastMCP` import/usage | String search |
| Entry Point | Requires `mcp.run()` | String search |
| Auth | If auth required, must use env vars | Checks for `os.environ` or `os.getenv` |

**Tier 2: LLM Validation (semantic, runs after static)**

Sends the code + original spec to Claude with the validator prompt. Claude checks:
- MCP best practices (FastMCP usage, async/await, proper tool definition)
- Input/output schema handling
- Whether the code matches the original spec
- Security issues beyond regex patterns
- Missing error handling

The LLM returns a JSON response with `status`, `issues`, `suggestions`, `is_mcp_compliant`, and `fixed_code`.

#### Response Parsing

The validator handles both old and new JSON schemas from the LLM:
```python
llm_errors = llm_result.get("issues", llm_result.get("errors", []))
```

It also flags high-level failures:
- If `status == "fail"` but no specific issues listed, adds a generic error
- If `is_mcp_compliant == false`, adds a compliance error

#### Graceful Degradation

If the LLM response is unparseable (malformed JSON, timeout, etc.), the validator **does not crash**. It returns static-only results. This means you always get at least syntax + security validation even if the API is down.

#### Error Deduplication

```python
errors = list(dict.fromkeys(errors))
```

Static checks and LLM checks may flag the same issue. This line deduplicates while preserving order.

---

### `backend/utils/api_client.py` - Anthropic API Client

**Role:** Singleton Claude client with exponential backoff retry. The single function every agent calls.

#### `get_client()` - Lazy Singleton

```python
_client: Optional[AsyncAnthropic] = None

def get_client() -> AsyncAnthropic:
    global _client
    if _client is None:
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise EnvironmentError("ANTHROPIC_API_KEY is not set.")
        _client = AsyncAnthropic(api_key=api_key, max_retries=0)
    return _client
```

- Created on first call, reused for all subsequent calls
- SDK's built-in retries are **disabled** (`max_retries=0`) so we can log each attempt with job context
- Validates the API key exists on first call — fails fast with a clear error

#### `call_llm()` - The Core Function

Every agent in the system calls this single function:

```python
async def call_llm(
    system_prompt: str,
    user_message: str,
    max_tokens: int = 4096,
    temperature: float = 0.0,
    job_id: str = "",
) -> str:
```

**Retry Logic:**
- Attempts: up to `MAX_RETRIES` (default 3, configurable via env var)
- Backoff: exponential — 2s, 4s, 8s between retries
- Retryable errors: `RateLimitError`, `APIConnectionError`, `APIError`
- Non-retryable: After all retries exhausted, raises the original exception

**What It Returns:**
- Extracts text from all content blocks in the response
- Returns a single stripped string
- Each agent is responsible for parsing this string (as JSON, as Python code, etc.)

**Logging:**
Every attempt is logged with `job_id` and step context:
```json
{"timestamp": "...", "level": "INFO", "logger": "api_client", "message": "LLM call attempt 1/3", "job_id": "abc-123", "step": "llm_call"}
```

---

### `backend/utils/logger.py` - Structured Logger

**Role:** Centralized JSON logging for the entire backend.

#### StructuredFormatter

Every log line is a single JSON object:

```json
{
  "timestamp": "2026-04-17T18:50:14.829327+00:00",
  "level": "INFO",
  "logger": "classifier",
  "message": "Starting classification",
  "job_id": "b9fa53b1-...",
  "step": "classifier"
}
```

This format is:
- **Machine-parseable**: Can be piped into log aggregators (Datadog, CloudWatch, etc.)
- **Grep-friendly**: `grep "job_id.*b9fa53b1" logs.txt` shows all events for one job
- **Contextual**: Every log line from a pipeline run carries the `job_id` and `step`

#### `get_logger(name)`

Factory function that returns a named logger. Idempotent — calling it twice with the same name returns the same logger (no duplicate handlers).

```python
logger = get_logger("classifier")
logger.info("Starting classification", extra={"job_id": job_id, "step": "classifier"})
```

The `extra` dict is how context (job_id, step, duration_ms) gets attached to log entries. The `StructuredFormatter` checks for these attributes on the log record and includes them in the JSON output.

---

### `backend/prompts/` - System Prompts

Three text files loaded once at import time by each agent.

#### `classifier.txt`
Instructs Claude to analyze a plain-English description and output a JSON spec with:
- `tool_name` (snake_case)
- `description` (one sentence)
- `external_api` (API name or null)
- `auth_type` (api_key | oauth | bearer | none | other)
- `auth_details` (how to handle auth)
- `input_schema` / `output_schema` (JSON Schema format)
- `example_inputs` and `key_logic_steps`

Rules: Be precise, don't hallucinate APIs, prefer env vars for auth.

#### `codegen.txt`
Instructs Claude to generate a complete, production-ready MCP server:
- Must use `FastMCP` from the official MCP SDK
- Must include `@mcp.tool()` decorator
- Must use Pydantic for input validation
- Must use `httpx.AsyncClient` with 30s timeout for HTTP
- Must handle auth via environment variables
- Must include error handling and logging
- Must end with `mcp.run(transport="stdio")`
- Must include run instructions as a comment block
- Must include `config.json` snippet as a comment

Output: Raw Python code only, no markdown fences.

#### `validator.txt`
Instructs Claude to validate generated code and output JSON:
- `status`: "pass" or "fail"
- `issues`: List of specific problems found
- `suggestions`: Optional improvements
- `is_mcp_compliant`: true/false
- `fixed_code`: Corrected code if failing, null if passing

Checks: Syntax, MCP best practices, schema handling, security, standalone runnability.

---

### `backend/templates/` - Jinja2 Fallback Templates

Used when LLM code generation fails. These templates produce valid, runnable MCP servers from the spec fields.

#### `base_server.py.j2`

Generates a complete MCP server with:
- Conditional imports based on `auth_type` and `external_api`
- Environment variable setup for API keys (api_key, bearer, oauth)
- Environment guards that crash early if required keys are missing
- A single `@mcp.tool()` decorated async function
- Key logic steps as numbered comments
- httpx-based API calls with error handling (if external_api is set)
- `mcp.run(transport="stdio")` entry point

Template variables:
```
{{ tool_name }}      - Function and server name
{{ description }}    - Docstring
{{ auth_type }}      - Controls auth block (api_key/bearer/oauth/none)
{{ external_api }}   - Controls whether httpx is imported
{{ input_params }}   - Function signature (e.g., "query: str, limit: int")
{{ key_logic_steps }} - Array of step descriptions
{{ headers_dict }}   - HTTP headers (from fallback registry)
{{ http_method }}    - get/post/put/delete
{{ api_url }}        - API endpoint URL
```

#### `config.json.j2`

Generates the Claude Code MCP configuration:
```json
{
  "mcpServers": {
    "{{ tool_name }}": {
      "command": "python",
      "args": ["server.py"],
      "env": { ... }
    }
  }
}
```

Environment variables are included only if `auth_type` requires them.

---

## Error Handling & Robustness

### Layer 1: API Client Retry
Every LLM call retries 3 times with exponential backoff (2s, 4s, 8s). Handles rate limits, connection errors, and general API errors.

### Layer 2: Agent-Level Error Catching
Each agent function wraps its LLM call in try/except. The classifier raises ValueError (caught by the graph node). The codegen raises RuntimeError. The validator degrades to static-only results.

### Layer 3: Graph-Level Routing
The LangGraph pipeline routes failures to appropriate handlers:
- Classifier fails -> fail node (no recovery possible)
- CodeGen fails -> fallback node (use Jinja2 templates)
- Validator fails -> retry codegen once, then fallback

### Layer 4: Pipeline-Level Safety Net
`run_pipeline()` in main.py has a top-level `try/except Exception` that catches ANY unhandled error and sets the job to "failed" with a clear message. The server never crashes.

### Layer 5: HTTP-Level Guards
- Missing API key -> 503 with clear message
- Invalid request body -> 422 with Pydantic validation errors
- Unknown job_id -> 404
- Server still starts without API key (so /examples and /health work)

### Layer 6: Background Cleanup
Stale jobs (older than 1 hour) are automatically evicted every 10 minutes to prevent memory leaks.

### Security
- Static regex scanning for `eval()`, `exec()`, `os.system()`, `subprocess`, `__import__()`
- Auth credentials must come from environment variables, never hardcoded
- CORS restricted to localhost origins
- Input length limits on all request fields

---

## Data Flow Diagram

```
Frontend (React)
    |
    | POST /generate {"description": "...", "auth_context": "..."}
    v
main.py
    |
    | Creates JobRecord, launches asyncio.Task
    | Returns {"job_id": "..."} HTTP 202
    v
run_pipeline()
    |
    | Builds PipelineState, calls pipeline.ainvoke()
    v
graph.py: LangGraph State Machine
    |
    | START
    v
classifier_node
    |
    | Calls classifier.py -> classify()
    | Calls api_client.py -> call_llm() [with classifier.txt prompt]
    | Claude returns JSON spec
    |
    | route_after_classifier: spec exists? -> codegen
    v
codegen_node
    |
    | Calls codegen.py -> generate_code()
    | Calls api_client.py -> call_llm() [with codegen.txt prompt]
    | Claude returns Python code
    |
    | route_after_codegen: code exists? -> validator
    v
validator_node
    |
    | Calls validator.py -> validate()
    |   1. ast.parse() - syntax check
    |   2. regex scan - security check
    |   3. string search - MCP compliance
    |   4. call_llm() [with validator.txt prompt] - semantic check
    |
    | route_after_validator:
    |   valid? -> END
    |   invalid + attempt 1? -> codegen (retry with errors)
    |   invalid + attempt 2? -> fallback
    v
END (or fallback_node -> END)
    |
    | Final state written to JobRecord
    v
main.py: JobRecord updated
    |
    | GET /generate/{job_id}
    v
Frontend receives result
```

---

## Configuration

### Environment Variables (.env)

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | (required) | Your Anthropic API key |
| `CLAUDE_MODEL` | `claude-sonnet-4-20250514` | Model ID for all LLM calls |
| `PORT` | `8000` | Server port (used by uvicorn) |
| `MAX_RETRIES` | `3` | Number of retry attempts per LLM call |
| `LOG_LEVEL` | `INFO` | Logging level (DEBUG, INFO, WARNING, ERROR) |

### Running the Server

```bash
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
uvicorn backend.main:app --reload --port 8000
```

### Testing Endpoints

```bash
# Health check
curl http://localhost:8000/health

# Get examples
curl http://localhost:8000/examples

# Generate a server
curl -X POST http://localhost:8000/generate \
  -H "Content-Type: application/json" \
  -d '{"description": "A tool that searches GitHub issues by label"}'

# Poll for result
curl http://localhost:8000/generate/{job_id}

# Validate existing code
curl -X POST http://localhost:8000/validate \
  -H "Content-Type: application/json" \
  -d '{"server_code": "...", "tool_spec": {...}}'
```
