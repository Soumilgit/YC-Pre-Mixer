import { callLLM } from "@/lib/gemini";
import { VALIDATOR_PROMPT } from "@/lib/prompts";

const DANGEROUS_PATTERNS = [
  /\beval\s*\(/,
  /\bexec\s*\(/,
  /\bos\.system\s*\(/,
  /\bsubprocess\b/,
  /\b__import__\s*\(/,
];

function stripFences(raw) {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    const lines = cleaned.split("\n");
    if (lines[lines.length - 1].trim() === "```") {
      cleaned = lines.slice(1, -1).join("\n");
    } else {
      cleaned = lines.slice(1).join("\n");
    }
  }
  return cleaned.trim();
}

export async function validate(serverCode, toolSpec) {
  const errors = [];

  // Static checks
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(serverCode)) {
      errors.push(`Dangerous pattern found: ${pattern.source}`);
    }
  }

  if (!serverCode.includes("@mcp.tool()")) {
    errors.push("Missing @mcp.tool() decorator");
  }
  if (!serverCode.includes("FastMCP")) {
    errors.push("Missing FastMCP import/usage");
  }
  if (!serverCode.includes("mcp.run(")) {
    errors.push("Missing mcp.run() entry point");
  }

  const authType = toolSpec.auth_type || "none";
  if (authType !== "none") {
    if (
      !serverCode.includes("os.environ") &&
      !serverCode.includes("os.getenv")
    ) {
      errors.push(
        "Auth required but no environment variable usage found"
      );
    }
  }

  // LLM validation
  let fixedCode = null;
  let suggestions = [];

  try {
    const raw = await callLLM({
      systemPrompt: VALIDATOR_PROMPT,
      userMessage: `Original Tool Specification:\n${JSON.stringify(toolSpec, null, 2)}\n\nGenerated Code:\n${serverCode}`,
      maxTokens: 4096,
      temperature: 0.0,
    });

    const cleaned = stripFences(raw);
    const llmResult = JSON.parse(cleaned);

    const llmErrors = llmResult.issues || llmResult.errors || [];
    errors.push(...llmErrors);
    fixedCode = llmResult.fixed_code || null;
    suggestions = llmResult.suggestions || [];

    if (llmResult.status === "fail" && llmErrors.length === 0) {
      errors.push("LLM validator flagged code as failing");
    }
    if (llmResult.is_mcp_compliant === false) {
      errors.push("Code is not MCP-compliant per LLM validation");
    }
  } catch {
    // Degrade to static-only results
  }

  // Deduplicate
  const uniqueErrors = [...new Set(errors)];

  return {
    isValid: uniqueErrors.length === 0,
    errors: uniqueErrors,
    suggestions,
    fixedCode: uniqueErrors.length > 0 ? fixedCode : null,
  };
}
