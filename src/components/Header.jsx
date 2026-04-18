"use client";

export default function Header({ healthy, apiKeyConfigured, neo4jConfigured }) {
  return (
    <header className="border-b border-[#2a2a2e] bg-[#111113]">
      <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#e4e4e7]">
            AgentForge
          </h1>
          <p className="text-sm text-[#71717a] mt-0.5">
            Instant MCP Server Builder
          </p>
        </div>
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
      </div>
    </header>
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
