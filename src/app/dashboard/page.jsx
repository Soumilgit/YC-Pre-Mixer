"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import PromptInput from "@/components/PromptInput";
import StatusTracker from "@/components/StatusTracker";
import CodePreview from "@/components/CodePreview";
import ExampleCards from "@/components/ExampleCards";
import HistoryPanel from "@/components/HistoryPanel";
import { useHealthCheck } from "@/hooks/useHealthCheck";
import { useGeneration } from "@/hooks/useGeneration";
import { useAuth } from "@/hooks/useAuth";

export default function Dashboard() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
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

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

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

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0b]">
        <p className="text-sm text-[#71717a]">Loading...</p>
      </div>
    );
  }

  if (!user) return null;

  const showResults = status === "completed" && result;

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0b]">
      <header className="border-b border-[#2a2a2e] bg-[#111113]">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-[#e4e4e7]">
              AgentForge
            </h1>
            <p className="text-sm text-[#71717a] mt-0.5">Dashboard</p>
          </div>
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-3">
              <StatusDot
                label="Server"
                active={healthy === true}
                checking={healthy === null}
              />
              <StatusDot
                label="Gemini"
                active={apiKeyConfigured}
                checking={healthy === null}
              />
              <StatusDot
                label="Neo4j"
                active={neo4jConfigured}
                checking={healthy === null}
              />
            </div>
            <div className="h-4 w-px bg-[#2a2a2e]" />
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#71717a] hidden sm:inline">
                {user.email}
              </span>
              <button
                onClick={signOut}
                className="text-xs text-[#a1a1aa] hover:text-[#e4e4e7] transition-colors
                           px-3 py-1.5 border border-[#2a2a2e] rounded-lg hover:border-[#3a3a3e]"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-12 space-y-10">
        <section className="text-center space-y-3 mb-2">
          <h2 className="text-2xl font-semibold tracking-tight text-[#e4e4e7]">
            Build MCP Servers in Seconds
          </h2>
          <p className="text-[#a1a1aa] text-sm max-w-md mx-auto leading-relaxed">
            Describe a tool in plain English. AgentForge generates a
            production-ready MCP server with validation, auth handling, and
            Claude Code integration.
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

      <footer className="border-t border-[#2a2a2e] py-5 text-center text-xs text-[#52525b]">
        AgentForge | YC Hackathon | Architect Track
      </footer>
    </div>
  );
}

function StatusDot({ label, active, checking }) {
  const color = checking
    ? "bg-[#f59e0b]"
    : active
      ? "bg-[#22c55e]"
      : "bg-[#ef4444]";

  return (
    <div className="flex items-center gap-1.5 text-xs text-[#a1a1aa]">
      <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
      {label}
    </div>
  );
}
