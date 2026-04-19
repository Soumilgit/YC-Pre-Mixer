# AgentForge - Instant MCP Server Builder

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

## The Agent Pipeline (How It Actually Works)

### Agent 1 - Classifier
- Takes raw user input
- Identifies: external API needed, auth type (OAuth / API key / none), input/output schema
- Outputs structured JSON spec

### Agent 2 - Code Generator
- Takes the spec from Agent 1
- Generates full MCP server using `mcp` SDK
- Includes: tool definitions, input validation, error handling, retry logic

### Agent 3 - Validator
- Statically checks the generated code
- Verifies MCP schema compliance
- Flags any missing auth fields or broken imports
- Returns a pass/fail with error explanation

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

## Getting Started

### Prerequisites
- Node.js 18+
- Gemini API Key

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
- **Environment guard** - clear error if `GEMINI_API_KEY` is missing, not a silent crash

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
