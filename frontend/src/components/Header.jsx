export default function Header({ healthy, apiKeyConfigured }) {
  return (
    <header className="border-b border-border-primary bg-bg-secondary">
      <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-text-primary">
            AgentForge
          </h1>
          <p className="text-sm text-text-muted mt-0.5">
            Instant MCP Server Builder
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusDot
            label="Backend"
            active={healthy === true}
            checking={healthy === null}
          />
          <StatusDot
            label="API Key"
            active={apiKeyConfigured}
            checking={healthy === null}
          />
        </div>
      </div>
    </header>
  );
}

function StatusDot({ label, active, checking }) {
  const color = checking
    ? "bg-warning"
    : active
      ? "bg-success"
      : "bg-error";

  return (
    <div className="flex items-center gap-1.5 text-xs text-text-secondary">
      <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
      {label}
    </div>
  );
}
