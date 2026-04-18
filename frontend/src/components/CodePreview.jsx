import { useState } from "react";
import { useClipboard } from "../hooks/useClipboard";

export default function CodePreview({ result }) {
  const [activeTab, setActiveTab] = useState("server");
  const serverClip = useClipboard();
  const configClip = useClipboard();
  const cmdClip = useClipboard();

  if (!result) return null;

  const tabs = [
    { id: "server", label: "server.py" },
    { id: "config", label: "config.json" },
    { id: "setup", label: "Setup" },
  ];

  return (
    <div className="bg-bg-secondary border border-border-primary rounded-lg overflow-hidden">
      <div className="flex items-center justify-between border-b border-border-primary px-4">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px
                ${
                  activeTab === tab.id
                    ? "text-accent border-accent"
                    : "text-text-muted border-transparent hover:text-text-secondary"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {result.used_fallback && (
            <span className="text-xs text-warning bg-warning/10 px-2 py-0.5 rounded">
              Fallback template used
            </span>
          )}
          {result.tool_name && (
            <span className="text-xs text-text-muted">
              {result.tool_name}
            </span>
          )}
        </div>
      </div>

      <div className="relative">
        {activeTab === "server" && (
          <CodeBlock
            code={result.server_code}
            clipboard={serverClip}
          />
        )}
        {activeTab === "config" && (
          <CodeBlock
            code={result.config_json}
            clipboard={configClip}
          />
        )}
        {activeTab === "setup" && (
          <SetupPanel
            setupCommand={result.setup_command}
            configJson={result.config_json}
            clipboard={cmdClip}
          />
        )}
      </div>

      {result.validation_suggestions?.length > 0 && (
        <div className="border-t border-border-primary px-4 py-3">
          <p className="text-xs font-medium text-text-secondary mb-2">
            Suggestions
          </p>
          <ul className="space-y-1">
            {result.validation_suggestions.map((s, i) => (
              <li key={i} className="text-xs text-text-muted">
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function CodeBlock({ code, clipboard }) {
  if (!code) {
    return (
      <div className="p-6 text-sm text-text-muted text-center">
        No content generated
      </div>
    );
  }

  return (
    <div className="relative group">
      <button
        onClick={() => clipboard.copy(code)}
        className="absolute top-3 right-3 px-3 py-1.5 text-xs font-medium rounded
                   bg-bg-elevated text-text-secondary border border-border-primary
                   hover:text-text-primary hover:border-border-active
                   opacity-0 group-hover:opacity-100 transition-all"
      >
        {clipboard.copied ? "Copied" : "Copy"}
      </button>
      <pre className="p-4 overflow-auto max-h-[500px] text-sm leading-relaxed">
        <code className="text-text-primary font-mono whitespace-pre">
          {code}
        </code>
      </pre>
    </div>
  );
}

function SetupPanel({ setupCommand, configJson, clipboard }) {
  return (
    <div className="p-5 space-y-5">
      <div>
        <h3 className="text-sm font-medium text-text-secondary mb-2">
          1. Save the generated files
        </h3>
        <p className="text-xs text-text-muted leading-relaxed">
          Copy server.py and save it to your project directory.
          Copy config.json content into your Claude Code MCP configuration.
        </p>
      </div>

      <div>
        <h3 className="text-sm font-medium text-text-secondary mb-2">
          2. Install dependencies
        </h3>
        <div className="relative group">
          <button
            onClick={() => clipboard.copy("pip install mcp httpx pydantic")}
            className="absolute top-2 right-2 px-2 py-1 text-xs rounded
                       bg-bg-elevated text-text-muted border border-border-primary
                       hover:text-text-primary opacity-0 group-hover:opacity-100 transition-all"
          >
            {clipboard.copied ? "Copied" : "Copy"}
          </button>
          <pre className="bg-bg-tertiary rounded p-3 text-sm font-mono text-text-primary">
            pip install mcp httpx pydantic
          </pre>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-text-secondary mb-2">
          3. Run the server
        </h3>
        <pre className="bg-bg-tertiary rounded p-3 text-sm font-mono text-text-primary">
          {setupCommand || "python server.py"}
        </pre>
      </div>

      <div>
        <h3 className="text-sm font-medium text-text-secondary mb-2">
          4. Connect to Claude Code
        </h3>
        <p className="text-xs text-text-muted leading-relaxed">
          Add the config.json content to your Claude Code MCP settings.
          The new tool will be available immediately.
        </p>
      </div>
    </div>
  );
}
