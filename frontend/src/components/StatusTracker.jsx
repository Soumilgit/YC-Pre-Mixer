const STEPS = [
  { key: "classifying", label: "Classifying" },
  { key: "generating", label: "Generating Code" },
  { key: "validating", label: "Validating" },
];

function resolveStepIndex(currentStep) {
  if (!currentStep || currentStep === "queued") return -1;
  if (currentStep === "classifying" || currentStep === "classified" || currentStep === "classifier_failed") return 0;
  if (currentStep === "code_generated" || currentStep === "codegen_failed" || currentStep === "generating") return 1;
  if (currentStep === "validating" || currentStep === "validated" || currentStep === "validation_failed" || currentStep === "complete_fallback") return 2;
  if (currentStep === "complete" || currentStep === "failed") return 3;
  return -1;
}

export default function StatusTracker({ status, currentStep, error }) {
  if (!status || status === "pending") return null;

  const activeIndex = resolveStepIndex(currentStep);
  const isComplete = status === "completed";
  const isFailed = status === "failed";

  return (
    <div className="bg-bg-secondary border border-border-primary rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-text-secondary">
          Pipeline Status
        </span>
        {isComplete && (
          <span className="text-xs font-medium text-success bg-success/10 px-2 py-0.5 rounded">
            Complete
          </span>
        )}
        {isFailed && (
          <span className="text-xs font-medium text-error bg-error/10 px-2 py-0.5 rounded">
            Failed
          </span>
        )}
      </div>

      <div className="flex items-center gap-0">
        {STEPS.map((step, i) => {
          const isDone = activeIndex > i || isComplete;
          const isActive = activeIndex === i && !isComplete && !isFailed;
          const isPending = activeIndex < i;

          return (
            <div key={step.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium
                    transition-colors
                    ${isDone ? "bg-success text-white" : ""}
                    ${isActive ? "bg-accent text-white animate-pulse" : ""}
                    ${isPending ? "bg-bg-tertiary text-text-muted" : ""}
                    ${isFailed && isActive ? "bg-error text-white animate-none" : ""}
                  `}
                >
                  {isDone ? "\u2713" : i + 1}
                </div>
                <span
                  className={`text-xs mt-2 ${isDone ? "text-success" : isActive ? "text-text-primary" : "text-text-muted"}`}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`h-px flex-1 mx-1 transition-colors ${isDone ? "bg-success" : "bg-border-primary"}`}
                />
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-error/10 border border-error/20 rounded text-sm text-error">
          {error}
        </div>
      )}
    </div>
  );
}
