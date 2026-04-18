"use client";

import { useHistory } from "@/hooks/useHistory";

export default function HistoryPanel() {
  const { generations, loading } = useHistory();

  if (loading || generations.length === 0) return null;

  return (
    <div className="bg-[#111113] border border-[#2a2a2e] rounded-lg p-5">
      <h3 className="text-sm font-medium text-[#a1a1aa] mb-3">
        Recent Generations
      </h3>
      <div className="space-y-2">
        {generations.map((gen) => (
          <div
            key={gen.id}
            className="flex items-center justify-between p-3 bg-[#1a1a1d] rounded-lg"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm text-[#e4e4e7] font-medium truncate">
                {gen.tool_name}
              </p>
              <p className="text-xs text-[#71717a] truncate mt-0.5">
                {gen.description}
              </p>
            </div>
            <div className="flex items-center gap-2 ml-3 shrink-0">
              {gen.used_fallback && (
                <span className="text-[10px] text-[#f59e0b] bg-[#f59e0b]/10 px-1.5 py-0.5 rounded">
                  fallback
                </span>
              )}
              {gen.created_at && (
                <span className="text-[10px] text-[#71717a]">
                  {formatTime(gen.created_at)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatTime(isoString) {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;

    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;

    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}d ago`;
  } catch {
    return "";
  }
}
