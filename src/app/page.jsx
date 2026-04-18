"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import AuthModal from "@/components/AuthModal";

const PIPELINE_STEPS = [
  {
    number: "01",
    title: "Describe",
    text: "Tell AgentForge what tool you need in plain English. Mention the API, auth type, and expected inputs.",
  },
  {
    number: "02",
    title: "Generate",
    text: "A 3-agent pipeline classifies your intent, generates production-ready Python code, and validates it automatically.",
  },
  {
    number: "03",
    title: "Deploy",
    text: "Get a complete server.py and config.json. Plug directly into Claude Code. Your new tool is live in seconds.",
  },
];

const FEATURES = [
  {
    title: "3-Agent Pipeline",
    text: "Classifier, Code Generator, and Validator work in sequence. If generation fails, pre-tested fallback templates guarantee output.",
  },
  {
    title: "MCP Compliant",
    text: "Every generated server uses the official FastMCP SDK with proper tool decorators, async patterns, and stdio transport.",
  },
  {
    title: "Auth Handling",
    text: "API keys, Bearer tokens, OAuth. Auth credentials are always read from environment variables, never hardcoded.",
  },
  {
    title: "Security Validated",
    text: "Static analysis scans for eval, exec, subprocess, and other dangerous patterns before code leaves the pipeline.",
  },
  {
    title: "Instant Config",
    text: "Generates the exact Claude Code MCP config JSON. Copy, paste, connected. No manual wiring required.",
  },
  {
    title: "Generation History",
    text: "Every generated server is stored in Neo4j. Browse, revisit, and reuse past generations from your dashboard.",
  },
];

export default function LandingPage() {
  const [showAuth, setShowAuth] = useState(false);
  const { user, loading } = useAuth();
  const router = useRouter();

  function handleCTA() {
    if (user) {
      router.push("/dashboard");
    } else {
      setShowAuth(true);
    }
  }

  function handleAuthSuccess() {
    setShowAuth(false);
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0b]">
      {/* Nav */}
      <nav className="border-b border-[#2a2a2e] bg-[#0a0a0b]">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <span className="text-lg font-semibold tracking-tight text-[#e4e4e7]">
            AgentForge
          </span>
          <div className="flex items-center gap-4">
            {!loading && user ? (
              <button
                onClick={() => router.push("/dashboard")}
                className="px-5 py-2 bg-[#6366f1] hover:bg-[#818cf8] text-white text-sm font-medium
                           rounded-lg transition-colors"
              >
                Dashboard
              </button>
            ) : (
              <>
                <button
                  onClick={() => setShowAuth(true)}
                  className="text-sm text-[#a1a1aa] hover:text-[#e4e4e7] transition-colors"
                >
                  Sign in
                </button>
                <button
                  onClick={handleCTA}
                  className="px-5 py-2 bg-[#6366f1] hover:bg-[#818cf8] text-white text-sm font-medium
                             rounded-lg transition-colors"
                >
                  Get started
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-24 pb-20 text-center">
        <p className="text-xs font-medium tracking-widest uppercase text-[#6366f1] mb-6">
          YC Hackathon / Architect Track
        </p>
        <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight text-[#e4e4e7] leading-[1.1]">
          MCP Servers from
          <br />
          Plain English
        </h1>
        <p className="mt-6 text-lg text-[#a1a1aa] max-w-lg mx-auto leading-relaxed">
          Describe a tool. AgentForge generates a validated, production-ready
          MCP server you can plug into Claude Code in under 60 seconds.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <button
            onClick={handleCTA}
            className="px-8 py-3 bg-[#6366f1] hover:bg-[#818cf8] text-white text-sm font-medium
                       rounded-lg transition-colors"
          >
            {user ? "Open Dashboard" : "Get Started"}
          </button>
          <a
            href="#how-it-works"
            className="px-8 py-3 border border-[#2a2a2e] text-[#a1a1aa] hover:text-[#e4e4e7]
                       hover:border-[#3a3a3e] text-sm font-medium rounded-lg transition-colors"
          >
            How it works
          </a>
        </div>
      </section>

      {/* Metrics bar */}
      <section className="border-y border-[#2a2a2e] bg-[#111113]">
        <div className="max-w-4xl mx-auto px-6 py-8 grid grid-cols-3 gap-8 text-center">
          <div>
            <p className="text-2xl font-semibold text-[#e4e4e7]">~45s</p>
            <p className="text-xs text-[#71717a] mt-1">Time to first server</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-[#e4e4e7]">200-400</p>
            <p className="text-xs text-[#71717a] mt-1">Lines of boilerplate eliminated</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-[#e4e4e7]">3 Agents</p>
            <p className="text-xs text-[#71717a] mt-1">Classify, Generate, Validate</p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="max-w-4xl mx-auto px-6 py-24">
        <h2 className="text-2xl font-semibold text-[#e4e4e7] text-center mb-16">
          How it works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {PIPELINE_STEPS.map((step) => (
            <div key={step.number}>
              <p className="text-xs font-medium text-[#6366f1] mb-3">
                {step.number}
              </p>
              <h3 className="text-lg font-semibold text-[#e4e4e7] mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-[#a1a1aa] leading-relaxed">
                {step.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-[#2a2a2e] bg-[#111113]">
        <div className="max-w-4xl mx-auto px-6 py-24">
          <h2 className="text-2xl font-semibold text-[#e4e4e7] text-center mb-16">
            Built for reliability
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-[#2a2a2e] rounded-xl overflow-hidden">
            {FEATURES.map((feat) => (
              <div
                key={feat.title}
                className="bg-[#111113] p-6 hover:bg-[#161618] transition-colors"
              >
                <h3 className="text-sm font-semibold text-[#e4e4e7] mb-2">
                  {feat.title}
                </h3>
                <p className="text-xs text-[#71717a] leading-relaxed">
                  {feat.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 py-24 text-center">
        <h2 className="text-2xl font-semibold text-[#e4e4e7] mb-4">
          Ready to build?
        </h2>
        <p className="text-sm text-[#a1a1aa] mb-8 max-w-md mx-auto leading-relaxed">
          Stop writing MCP boilerplate. Describe what you need, and ship
          a working server in under a minute.
        </p>
        <button
          onClick={handleCTA}
          className="px-8 py-3 bg-[#6366f1] hover:bg-[#818cf8] text-white text-sm font-medium
                     rounded-lg transition-colors"
        >
          {user ? "Open Dashboard" : "Get Started"}
        </button>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#2a2a2e] py-6 text-center text-xs text-[#52525b]">
        AgentForge | YC Hackathon | Architect Track
      </footer>

      {/* Auth modal */}
      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onSuccess={handleAuthSuccess}
        />
      )}
    </div>
  );
}
