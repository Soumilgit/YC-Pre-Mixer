import { useState, useEffect } from "react";

export function useHealthCheck() {
  const [healthy, setHealthy] = useState(null);
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch("/api/health");
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) {
          setHealthy(true);
          setApiKeyConfigured(data.api_key_configured);
        }
      } catch {
        if (!cancelled) {
          setHealthy(false);
          setApiKeyConfigured(false);
        }
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  return { healthy, apiKeyConfigured };
}
