"use client";

import { useState, useEffect } from "react";

export default function ExampleCards({ onSelect, disabled }) {
  const [examples, setExamples] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchExamples() {
      try {
        const res = await fetch("/api/examples");
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) setExamples(data.examples || []);
      } catch {
        // Non-critical
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchExamples();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || examples.length === 0) return null;

  return (
    <div>
      <p className="text-sm text-[#71717a] mb-3">Or try an example</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {examples.map((ex) => (
          <button
            key={ex.name}
            onClick={() => onSelect(ex.description)}
            disabled={disabled}
            className="text-left p-4 bg-[#1a1a1d] border border-[#2a2a2e] rounded-lg
                       hover:border-[#4f46e5] hover:bg-[#222226] transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed group"
          >
            <p className="text-sm font-medium text-[#e4e4e7] group-hover:text-[#818cf8] transition-colors">
              {ex.name}
            </p>
            <p className="text-xs text-[#71717a] mt-1 leading-relaxed">
              {ex.description}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222226] text-[#71717a]">
                {ex.auth_type}
              </span>
              <span className="text-[10px] text-[#71717a]">
                {Object.keys(ex.inputs).length} input
                {Object.keys(ex.inputs).length !== 1 ? "s" : ""}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
