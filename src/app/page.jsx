"use client";

import { useCallback } from "react";
import Header from "@/components/Header";
import PromptInput from "@/components/PromptInput";
import StatusTracker from "@/components/StatusTracker";
import CodePreview from "@/components/CodePreview";
import ExampleCards from "@/components/ExampleCards";
import HistoryPanel from "@/components/HistoryPanel";
import { useHealthCheck } from "@/hooks/useHealthCheck";
import { useGeneration } from "@/hooks/useGeneration";

export default function Home() {
  const { healthy, apiKeyConfigured, neo4jConfigured } = useHealthCheck();
  const {
    status,
    currentStep,
    result,
    error,
    generating,
    generate,
    reset,
  } = useGeneration();

  const handleGenerate = useCallback(
    (payload) => {
      reset();
      generate(payload);
    },
    [generate, reset]
  );

  const handleExampleSelect = useCallback(
    (description) => {
      handleGenerate({ description, auth_context: null });
    },
    [handleGenerate]
  );

  const showResults = status === "completed" && result;

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0b]">
      <Header
        healthy={healthy}
        apiKeyConfigured={apiKeyConfigured}
        neo4jConfigured={neo4jConfigured}
      />

      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-10 space-y-8">
        <section className="text-center space-y-3">
          <h2 className="text-3xl font-semibold tracking-tight text-[#e4e4e7]">
            Build MCP Servers in Seconds
          </h2>
          <p className="text-[#a1a1aa] text-sm max-w-lg mx-auto leading-relaxed">
            Describe a tool in plain English. AgentForge generates a
            production-ready MCP server with validation, auth handling, and
            Claude Code integration config.
          </p>
        </section>

        <section>
          <PromptInput onSubmit={handleGenerate} disabled={generating} />
        </section>

        {!generating && !showResults && (
          <section>
            <ExampleCards
              onSelect={handleExampleSelect}
              disabled={generating}
            />
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
              <h3 className="text-lg font-medium text-[#e4e4e7]">
                Generated Output
              </h3>
              <button
                onClick={reset}
                className="text-sm text-[#71717a] hover:text-[#a1a1aa] transition-colors"
              >
                Start over
              </button>
            </div>
            <CodePreview result={result} />
          </section>
        )}

        {error && !generating && status !== "running" && status !== "failed" && (
          <div className="p-4 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg text-sm text-[#ef4444]">
            {error}
          </div>
        )}

        {!generating && !showResults && (
          <section>
            <HistoryPanel />
          </section>
        )}
      </main>

      <footer className="border-t border-[#2a2a2e] py-4 text-center text-xs text-[#71717a]">
        AgentForge | YC Hackathon | Architect Track
      </footer>
    </div>
  );
}
