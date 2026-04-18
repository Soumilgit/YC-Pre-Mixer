import { classify } from "@/lib/agents/classifier";
import { generateCode, generateFallback } from "@/lib/agents/codegen";
import { validate } from "@/lib/agents/validator";
import { storeGeneration } from "@/lib/neo4j";

export const maxDuration = 60;

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { description, auth_context } = body;

  if (!description || description.length < 10 || description.length > 2000) {
    return Response.json(
      { error: "description must be 10-2000 characters" },
      { status: 400 }
    );
  }

  if (!process.env.GEMINI_API_KEY) {
    return Response.json(
      { error: "GEMINI_API_KEY is not configured" },
      { status: 503 }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // Step 1: Classify
        send({ step: "classifying", status: "running" });
        const spec = await classify(description, auth_context);
        send({ step: "classified", status: "running" });

        // Step 2: Generate code
        send({ step: "generating", status: "running" });
        let serverCode, configJson, usedFallback = false;

        try {
          const gen = await generateCode(spec);
          serverCode = gen.serverCode;
          configJson = gen.configJson;
        } catch {
          const fb = generateFallback(spec);
          serverCode = fb.serverCode;
          configJson = fb.configJson;
          usedFallback = true;
        }
        send({ step: "generated", status: "running" });

        // Step 3: Validate
        if (!usedFallback) {
          send({ step: "validating", status: "running" });
          const validation = await validate(serverCode, spec);

          if (!validation.isValid) {
            // Retry once with feedback
            send({ step: "retrying", status: "running" });
            try {
              const retry = await generateCode(
                spec,
                validation.errors.join("\n")
              );
              const rev = await validate(retry.serverCode, spec);
              if (rev.isValid) {
                serverCode = retry.serverCode;
                configJson = retry.configJson;
              } else {
                const fb = generateFallback(spec);
                serverCode = fb.serverCode;
                configJson = fb.configJson;
                usedFallback = true;
              }
            } catch {
              const fb = generateFallback(spec);
              serverCode = fb.serverCode;
              configJson = fb.configJson;
              usedFallback = true;
            }
          } else if (validation.fixedCode) {
            serverCode = validation.fixedCode;
          }

          send({
            step: "validated",
            status: "running",
            suggestions: validation.suggestions || [],
          });
        }

        // Store in Neo4j
        let generationId = null;
        try {
          generationId = await storeGeneration({
            description,
            toolSpec: spec,
            serverCode,
            configJson,
            usedFallback,
          });
        } catch {
          // Non-critical
        }

        send({
          step: "complete",
          status: "completed",
          result: {
            server_code: serverCode,
            config_json: configJson,
            tool_name: spec.tool_name,
            description: spec.description,
            used_fallback: usedFallback,
            validation_suggestions: [],
            setup_command: "python server.py",
            generation_id: generationId,
          },
        });
      } catch (err) {
        send({
          step: "failed",
          status: "failed",
          error: err.message || "Pipeline failed",
        });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
