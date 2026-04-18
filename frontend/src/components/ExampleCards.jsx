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
        // Examples are non-critical
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
      <p className="text-sm text-text-muted mb-3">
        Or try an example
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {examples.map((ex) => (
          <button
            key={ex.name}
            onClick={() => onSelect(ex.description)}
            disabled={disabled}
            className="text-left p-4 bg-bg-tertiary border border-border-primary rounded-lg
                       hover:border-border-active hover:bg-bg-elevated transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed group"
          >
            <p className="text-sm font-medium text-text-primary group-hover:text-accent-hover transition-colors">
              {ex.name}
            </p>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              {ex.description}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-elevated text-text-muted">
                {ex.auth_type}
              </span>
              <span className="text-[10px] text-text-muted">
                {Object.keys(ex.inputs).length} input{Object.keys(ex.inputs).length !== 1 ? "s" : ""}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
