# AgentForge - Instant MCP Server Builder
> **Track: Architect - Agentic Infrastructure**
> Built for YC Hackathon | Deadline: 9:00 AM IST

---

## The One-Line Pitch

**Describe a tool in plain English - AgentForge generates a working MCP server - it plugs directly into Claude Code in under 60 seconds.**

---

## The Problem We're Solving

The MCP (Model Context Protocol) ecosystem is exploding - but building MCP servers is still painful. Every developer who wants to give Claude Code a new capability has to:

- Manually write server boilerplate
- Figure out the MCP spec from scratch
- Handle authentication, error states, schema definitions
- Test and debug with zero tooling

**This kills developer velocity.** The people who need agents most are the ones least equipped to build the infrastructure.

---

## Our Solution

A 3-step agentic pipeline:

```
User Describes Tool (plain English)
        |
        v
AI Agent Scaffolds MCP Server Code
        |
        v
Running MCP Server -> Plug into Claude Code
```

**Example:** User types:
> "I want a tool that searches my Notion workspace and returns the top 3 matching pages as summaries"

AgentForge:
1. Identifies required API (Notion API)
2. Generates full MCP server with correct schema, auth flow, error handling
3. Outputs a `server.py` + `config.json` ready to run
4. Gives you the exact command to connect it to Claude Code

---

## System Architecture

```
+----------------------------------------------------------+
|                     FRONTEND (React)                      |
|         Plain English Input -> Live Preview Output        |
+----------------------------+-----------------------------+
                             | HTTP POST
+----------------------------v-----------------------------+
|               ORCHESTRATION LAYER (FastAPI)               |
|                                                           |
|   +--------------+    +----------------+   +-----------+  |
|   |  Classifier  |--->| Code Generator |--->| Validator |  |
|   |   Agent      |    |    Agent       |   |   Agent   |  |
|   +--------------+    +----------------+   +-----------+  |
|         |                   |                  |          |
|         +-------------------+------------------+          |
|                     Claude API (Sonnet)                    |
+----------------------------+-----------------------------+
                             |
+----------------------------v-----------------------------+
|                   OUTPUT LAYER                            |
|   Generated MCP Server Code + Claude Code Config JSON     |
+----------------------------------------------------------+
```

---

## The Agent Pipeline (How It Actually Works)

### Agent 1 - Classifier
- Takes raw user input
- Identifies: external API needed, auth type (OAuth / API key / none), input/output schema
- Outputs structured JSON spec

### Agent 2 - Code Generator
- Takes the spec from Agent 1
- Generates full MCP server using Python (`mcp` SDK)
- Includes: tool definitions, input validation, error handling, retry logic

### Agent 3 - Validator
- Statically checks the generated code
- Verifies MCP schema compliance
- Flags any missing auth fields or broken imports
- Returns a pass/fail with error explanation

All 3 agents run on **Claude claude-sonnet-4-20250514** via Anthropic API.

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React + TailwindCSS | Fast to build, easy to demo |
| Backend | FastAPI (Python) | Async, clean, fast to scaffold |
| Orchestration | LangGraph | State machine for multi-agent pipeline |
| AI | Claude claude-sonnet-4-20250514 (Anthropic API) | Best at code gen + reasoning |
| MCP Runtime | `mcp` Python SDK (official) | Standard compliant |
| IDE Integration | Claude Code | Target integration environment |

---

## Project Structure

```
agentforge/
├── README.md                  <- You are here
├── backend/
│   ├── main.py                <- FastAPI app entry point
│   ├── agents/
│   │   ├── classifier.py      <- Agent 1: intent + spec extraction
│   │   ├── codegen.py         <- Agent 2: MCP server code generation
│   │   └── validator.py       <- Agent 3: static validation
│   ├── graph.py               <- LangGraph pipeline definition
│   ├── prompts/
│   │   ├── classifier.txt     <- System prompt for Classifier Agent
│   │   ├── codegen.txt        <- System prompt for CodeGen Agent
│   │   └── validator.txt      <- System prompt for Validator Agent
│   └── templates/
│       ├── base_server.py.j2  <- Jinja2 MCP server template
│       └── config.json.j2     <- Claude Code config template
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   └── components/
│   │       ├── PromptInput.jsx
│   │       ├── CodePreview.jsx
│   │       └── StatusTracker.jsx
│   └── package.json
├── examples/
│   ├── notion-search/         <- Pre-built example
│   ├── github-issues/         <- Pre-built example
│   └── web-scraper/           <- Pre-built example
├── .env.example
└── requirements.txt
```

---

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- Anthropic API key
- `uv` or `pip` for Python deps

### 1. Clone & Install

```bash
git clone https://github.com/your-org/agentforge
cd agentforge

# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
# Fill in:
# ANTHROPIC_API_KEY=sk-ant-...
# PORT=8000
```

### 3. Run

```bash
# Terminal 1 - Backend
cd backend
uvicorn main:app --reload --port 8000

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Open `http://localhost:5173` and start building.

---

## API Reference

### `POST /generate`

**Request:**
```json
{
  "description": "A tool that searches Notion and returns the top 3 matching pages",
  "auth_context": "I have a Notion API key"
}
```

**Response:**
```json
{
  "status": "success",
  "server_code": "...",
  "config_json": "...",
  "tool_name": "notion_search",
  "setup_command": "python server.py",
  "claude_code_snippet": "..."
}
```

### `GET /examples`

Returns list of pre-built example templates.

### `POST /validate`

Validate an existing MCP server definition without regenerating.

---

## Pre-Built Example Servers

These come bundled and can be demoed immediately:

### 1. `notion-search`
Search Notion workspace, return summaries of top N pages.
- Auth: Bearer token
- Inputs: `query` (string), `limit` (int)

### 2. `github-issues`
Fetch open issues from a GitHub repo filtered by label.
- Auth: Personal access token
- Inputs: `repo` (string), `label` (string)

### 3. `web-scraper`
Scrape a URL and return main content as clean text.
- Auth: None
- Inputs: `url` (string), `selector` (optional CSS selector)

---

## Robustness & Error Handling

This system is built to not break mid-demo or in prod:

- **Retry logic** on all Anthropic API calls (exponential backoff, 3 retries)
- **Schema validation** on every generated MCP server before returning to user
- **Fallback templates** - if code gen fails, we return the closest matching hand-written template
- **Async pipeline** - frontend polls status, never hangs on a single API call
- **Structured logging** - every agent step logged with timestamps for debugging
- **Environment guard** - clear error if `ANTHROPIC_API_KEY` is missing, not a silent crash

---

## Demo Script (For Judges)

> Use this exact flow when presenting. Practice it twice.

1. Open the UI at `localhost:5173`
2. Type: *"I want a tool that searches GitHub issues by label and returns titles with URLs"*
3. Hit Generate - walk through the 3-agent status bar (Classifier -> CodeGen -> Validator)
4. Show the generated `server.py` code in the preview pane
5. Copy the `claude_code_snippet` - paste into Claude Code terminal
6. Show Claude Code now has the new tool available
7. Ask Claude Code: *"Find all open issues labeled 'bug' in torvalds/linux"*
8. Claude executes via the MCP server you just generated - shows results

**Total demo time: ~90 seconds**

---

## Why This Wins

| Metric | Value |
|--------|-------|
| Time to first working MCP server (manual) | ~2-4 hours |
| Time to first working MCP server (AgentForge) | ~45 seconds |
| Lines of boilerplate eliminated | ~200-400 per server |
| Target users | Any developer using Claude Code |
| Moat | Template library + validation layer + UX |

---

## Build Timeline (11 PM - 9 AM)

| Time | Task | Owner |
|------|------|-------|
| 11 PM - 12 AM | FastAPI skeleton + `/generate` endpoint | Backend |
| 12 AM - 1 AM | Classifier Agent prompt + integration | Backend |
| 1 AM - 2 AM | CodeGen Agent + Jinja2 templates | Backend |
| 2 AM - 3 AM | Validator Agent + retry/fallback logic | Backend |
| 3 AM - 4 AM | LangGraph pipeline wiring | Backend |
| 3 AM - 4 AM | React UI - input + status tracker | Frontend |
| 4 AM - 5 AM | React UI - code preview + copy buttons | Frontend |
| 5 AM - 6 AM | Integration testing (full pipeline E2E) | Both |
| 6 AM - 7 AM | Polish + 3 example servers verified | Both |
| 7 AM - 8 AM | Dry run demo x 3 | Both |
| 8 AM - 9 AM | Buffer / fix any last-minute issues | Both |

---

## Key Files to Write First

Start in this exact order to unblock each other:

1. `backend/main.py` - FastAPI app with `/generate` stub
2. `backend/prompts/classifier.txt` - most critical prompt
3. `backend/agents/classifier.py` - calls Claude, returns JSON spec
4. `backend/templates/base_server.py.j2` - the MCP template
5. `backend/agents/codegen.py` - fills template via Claude
6. `frontend/src/App.jsx` - input -> POST -> poll status -> show result

---

## Environment Variables

```env
ANTHROPIC_API_KEY=sk-ant-xxxxx      # Required
CLAUDE_MODEL=claude-sonnet-4-20250514  # Do not change
PORT=8000                           # Backend port
MAX_RETRIES=3                       # API retry count
LOG_LEVEL=INFO
```

---

## Team Split Recommendation

**Person A (Backend)**
- `backend/` - agents, graph, API

**Person B (Frontend + Integration)**
- `frontend/` - React UI
- `examples/` - pre-built servers
- End-to-end testing

Sync at: 3 AM (integration), 6 AM (full demo dry run)

---

## Requirements

```
# requirements.txt
fastapi==0.115.0
uvicorn==0.30.0
anthropic==0.40.0
langgraph==0.2.0
langchain-anthropic==0.3.0
jinja2==3.1.4
pydantic==2.9.0
httpx==0.27.0
python-dotenv==1.0.0
mcp==1.0.0
```

---

*Built with Claude. Powered by coffee. Ship it.*
