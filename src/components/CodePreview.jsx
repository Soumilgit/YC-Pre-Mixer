"use client";

import { useState } from "react";
import { useClipboard } from "@/hooks/useClipboard";

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
    <div className="bg-[#111113] border border-[#2a2a2e] rounded-lg overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#2a2a2e] px-4">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px
                ${
                  activeTab === tab.id
                    ? "text-[#6366f1] border-[#6366f1]"
                    : "text-[#71717a] border-transparent hover:text-[#a1a1aa]"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {result.used_fallback && (
            <span className="text-xs text-[#f59e0b] bg-[#f59e0b]/10 px-2 py-0.5 rounded">
              Fallback template used
            </span>
          )}
          {result.tool_name && (
            <span className="text-xs text-[#71717a]">{result.tool_name}</span>
          )}
        </div>
      </div>

      <div className="relative">
        {activeTab === "server" && (
          <CodeBlock code={result.server_code} clipboard={serverClip} />
        )}
        {activeTab === "config" && (
          <CodeBlock code={result.config_json} clipboard={configClip} />
        )}
        {activeTab === "setup" && (
          <SetupPanel
            setupCommand={result.setup_command}
            clipboard={cmdClip}
          />
        )}
      </div>
    </div>
  );
}

function CodeBlock({ code, clipboard }) {
  if (!code) {
    return (
      <div className="p-6 text-sm text-[#71717a] text-center">
        No content generated
      </div>
    );
  }

  return (
    <div className="relative group">
      <button
        onClick={() => clipboard.copy(code)}
        className="absolute top-3 right-3 px-3 py-1.5 text-xs font-medium rounded
                   bg-[#222226] text-[#a1a1aa] border border-[#2a2a2e]
                   hover:text-[#e4e4e7] hover:border-[#4f46e5]
                   opacity-0 group-hover:opacity-100 transition-all"
      >
        {clipboard.copied ? "Copied" : "Copy"}
      </button>
      <pre className="p-4 overflow-auto max-h-[500px] text-sm leading-relaxed">
        <code className="text-[#e4e4e7] whitespace-pre" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {code}
        </code>
      </pre>
    </div>
  );
}

function SetupPanel({ setupCommand, clipboard }) {
  return (
    <div className="p-5 space-y-5">
      <div>
        <h3 className="text-sm font-medium text-[#a1a1aa] mb-2">
          1. Save the generated files
        </h3>
        <p className="text-xs text-[#71717a] leading-relaxed">
          Copy server.py and save it to your project directory.
          Copy config.json content into your Claude Code MCP configuration.
        </p>
      </div>

      <div>
        <h3 className="text-sm font-medium text-[#a1a1aa] mb-2">
          2. Install dependencies
        </h3>
        <div className="relative group">
          <button
            onClick={() => clipboard.copy("pip install mcp httpx pydantic")}
            className="absolute top-2 right-2 px-2 py-1 text-xs rounded
                       bg-[#222226] text-[#71717a] border border-[#2a2a2e]
                       hover:text-[#e4e4e7] opacity-0 group-hover:opacity-100 transition-all"
          >
            {clipboard.copied ? "Copied" : "Copy"}
          </button>
          <pre className="bg-[#1a1a1d] rounded p-3 text-sm text-[#e4e4e7]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            pip install mcp httpx pydantic
          </pre>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-[#a1a1aa] mb-2">
          3. Run the server
        </h3>
        <pre className="bg-[#1a1a1d] rounded p-3 text-sm text-[#e4e4e7]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {setupCommand || "python server.py"}
        </pre>
      </div>

      <div>
        <h3 className="text-sm font-medium text-[#a1a1aa] mb-2">
          4. Connect to Claude Code
        </h3>
        <p className="text-xs text-[#71717a] leading-relaxed">
          Add the config.json content to your Claude Code MCP settings.
          The new tool will be available immediately.
        </p>
      </div>
    </div>
  );
}
