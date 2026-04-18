"use client";

import { useState, useCallback, useRef } from "react";

export function useGeneration() {
  const [status, setStatus] = useState(null);
  const [currentStep, setCurrentStep] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);
  const abortRef = useRef(null);

  const generate = useCallback(async (payload) => {
    setGenerating(true);
    setStatus("running");
    setCurrentStep("queued");
    setResult(null);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data: ")) continue;

          try {
            const data = JSON.parse(line.slice(6));
            setCurrentStep(data.step);
            setStatus(data.status);
            if (data.result) setResult(data.result);
            if (data.error) setError(data.error);
          } catch {
            // skip malformed events
          }
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        setError(err.message);
        setStatus("failed");
      }
    }

    setGenerating(false);
  }, []);

  const reset = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setStatus(null);
    setCurrentStep(null);
    setResult(null);
    setError(null);
    setGenerating(false);
  }, []);

  return { status, currentStep, result, error, generating, generate, reset };
}
