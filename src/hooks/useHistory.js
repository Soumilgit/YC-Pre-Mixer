"use client";

import { useState, useEffect, useCallback } from "react";

export function useHistory() {
  const [generations, setGenerations] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/history?limit=10");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setGenerations(data.generations || []);
    } catch {
      // Non-critical
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { generations, loading, refresh };
}
