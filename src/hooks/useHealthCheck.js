"use client";

import { useState, useEffect } from "react";

export function useHealthCheck() {
  const [healthy, setHealthy] = useState(null);
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [neo4jConfigured, setNeo4jConfigured] = useState(false);

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
          setNeo4jConfigured(data.neo4j_configured);
        }
      } catch {
        if (!cancelled) {
          setHealthy(false);
        }
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  return { healthy, apiKeyConfigured, neo4jConfigured };
}
