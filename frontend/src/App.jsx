import { useCallback } from "react";
import Header from "./components/Header";
import PromptInput from "./components/PromptInput";
import StatusTracker from "./components/StatusTracker";
import CodePreview from "./components/CodePreview";
import ExampleCards from "./components/ExampleCards";
import { useHealthCheck } from "./hooks/useHealthCheck";
import { useApi } from "./hooks/useApi";
import { useJobPoller } from "./hooks/useJobPoller";

export default function App() {
  const { healthy, apiKeyConfigured } = useHealthCheck();
  const { post, error: apiError } = useApi();
  const {
    status,
    currentStep,
    result,
    error: jobError,
    polling,
    startPolling,
    reset,
  } = useJobPoller();

  const handleGenerate = useCallback(
    async (payload) => {
      reset();
      try {
        const data = await post("/generate", payload);
        startPolling(data.job_id);
      } catch {
        // error is handled by useApi
      }
    },
    [post, startPolling, reset]
  );

  const handleExampleSelect = useCallback(
    (description) => {
      handleGenerate({ description, auth_context: null });
    },
    [handleGenerate]
  );

  const isGenerating = polling || status === "running";
  const showResults = status === "completed" && result;
  const error = apiError || jobError;

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary">
      <Header healthy={healthy} apiKeyConfigured={apiKeyConfigured} />

      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-10 space-y-8">
        <section className="text-center space-y-3">
          <h2 className="text-3xl font-semibold tracking-tight text-text-primary">
            Build MCP Servers in Seconds
          </h2>
          <p className="text-text-secondary text-sm max-w-lg mx-auto leading-relaxed">
            Describe a tool in plain English. AgentForge generates a
            production-ready MCP server with validation, auth handling, and
            Claude Code integration config.
          </p>
        </section>

        <section>
          <PromptInput onSubmit={handleGenerate} disabled={isGenerating} />
        </section>

        {!isGenerating && !showResults && (
          <section>
            <ExampleCards onSelect={handleExampleSelect} disabled={isGenerating} />
          </section>
        )}

        {(status === "running" || status === "failed") && (
          <section>
            <StatusTracker
              status={status}
              currentStep={currentStep}
              error={error}
            />
          </section>
        )}

        {showResults && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-text-primary">
                Generated Output
              </h3>
              <button
                onClick={reset}
                className="text-sm text-text-muted hover:text-text-secondary transition-colors"
              >
                Start over
              </button>
            </div>
            <CodePreview result={result} />
          </section>
        )}

        {error && !polling && status !== "running" && status !== "failed" && (
          <div className="p-4 bg-error/10 border border-error/20 rounded-lg text-sm text-error">
            {error}
          </div>
        )}
      </main>

      <footer className="border-t border-border-primary py-4 text-center text-xs text-text-muted">
        AgentForge | YC Hackathon | Architect Track
      </footer>
    </div>
  );
}
