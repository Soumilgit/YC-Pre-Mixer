import { GoogleGenAI } from "@google/genai";

let client = null;

function getClient() {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

export async function callLLM({
  systemPrompt,
  userMessage,
  maxTokens = 4096,
  temperature = 0.0,
}) {
  const ai = getClient();
  const model = process.env.GEMINI_MODEL || "gemini-1.5-flash-8b";
  const maxRetries = parseInt(process.env.MAX_RETRIES || "3", 10);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: userMessage,
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: maxTokens,
          temperature,
        },
      });
      return response.text.trim();
    } catch (err) {
      if (attempt === maxRetries) throw err;
      const wait = Math.pow(2, attempt) * 1000;
      await new Promise((r) => setTimeout(r, wait));
    }
  }

  throw new Error("LLM call failed: exhausted retries");
}
