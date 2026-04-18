import { validate } from "@/lib/agents/validator";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { server_code, tool_spec } = body;

  if (!server_code || server_code.length < 20) {
    return Response.json(
      { error: "server_code must be at least 20 characters" },
      { status: 400 }
    );
  }

  if (!tool_spec || typeof tool_spec !== "object") {
    return Response.json(
      { error: "tool_spec must be a valid object" },
      { status: 400 }
    );
  }

  if (!process.env.GEMINI_API_KEY) {
    return Response.json(
      { error: "GEMINI_API_KEY is not configured" },
      { status: 503 }
    );
  }

  const result = await validate(server_code, tool_spec);

  return Response.json({
    is_valid: result.isValid,
    errors: result.errors,
    suggestions: result.suggestions,
    fixed_code: result.fixedCode,
  });
}
