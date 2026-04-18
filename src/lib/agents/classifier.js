import { callLLM } from "@/lib/gemini";
import { CLASSIFIER_PROMPT } from "@/lib/prompts";

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

const REQUIRED_FIELDS = [
  "tool_name",
  "description",
  "external_api",
  "auth_type",
  "input_schema",
  "output_schema",
  "key_logic_steps",
];

export async function classify(description, authContext) {
  let userMsg = description;
  if (authContext) {
    userMsg += `\n\nAdditional auth context: ${authContext}`;
  }

  const raw = await callLLM({
    systemPrompt: CLASSIFIER_PROMPT,
    userMessage: userMsg,
    maxTokens: 2048,
    temperature: 0.0,
  });

  const cleaned = stripFences(raw);

  let spec;
  try {
    spec = JSON.parse(cleaned);
  } catch (e) {
    throw new Error(
      `Classifier returned invalid JSON: ${e.message}\nRaw: ${raw.slice(0, 500)}`
    );
  }

  const missing = REQUIRED_FIELDS.filter((f) => !(f in spec));
  if (missing.length > 0) {
    throw new Error(`Classifier output missing fields: ${missing.join(", ")}`);
  }

  return spec;
}
