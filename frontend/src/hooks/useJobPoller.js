import { useState, useEffect, useRef, useCallback } from "react";

const POLL_INTERVAL = 2000;

export function useJobPoller() {
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState(null);
  const [currentStep, setCurrentStep] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [polling, setPolling] = useState(false);
  const intervalRef = useRef(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setPolling(false);
  }, []);

  const startPolling = useCallback(
    (id) => {
      stopPolling();
      setJobId(id);
      setStatus("pending");
      setCurrentStep("queued");
      setResult(null);
      setError(null);
      setPolling(true);
    },
    [stopPolling]
  );

  useEffect(() => {
    if (!polling || !jobId) return;

    const poll = async () => {
      try {
        const response = await fetch(`/api/generate/${jobId}`);
        if (!response.ok) {
          throw new Error(`Poll failed (${response.status})`);
        }
        const data = await response.json();

        setStatus(data.status);
        setCurrentStep(data.current_step);

        if (data.status === "completed") {
          setResult(data.result);
          stopPolling();
        } else if (data.status === "failed") {
          setError(data.error || "Generation failed");
          stopPolling();
        }
      } catch (err) {
        setError(err.message);
        stopPolling();
      }
    };

    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [polling, jobId, stopPolling]);

  const reset = useCallback(() => {
    stopPolling();
    setJobId(null);
    setStatus(null);
    setCurrentStep(null);
    setResult(null);
    setError(null);
  }, [stopPolling]);

  return {
    jobId,
    status,
    currentStep,
    result,
    error,
    polling,
    startPolling,
    reset,
  };
}
