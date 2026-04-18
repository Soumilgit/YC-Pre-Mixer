import { useState, useCallback } from "react";

const BASE_URL = "/api";

export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = useCallback(async (endpoint, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const url = `${BASE_URL}${endpoint}`;
      const config = {
        headers: { "Content-Type": "application/json" },
        ...options,
      };

      const response = await fetch(url, config);

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.detail || `Request failed (${response.status})`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const get = useCallback(
    (endpoint) => request(endpoint, { method: "GET" }),
    [request]
  );

  const post = useCallback(
    (endpoint, body) =>
      request(endpoint, { method: "POST", body: JSON.stringify(body) }),
    [request]
  );

  return { get, post, loading, error, clearError: () => setError(null) };
}
