"use client";

const STEPS = [
  { key: "classifying", label: "Classifying" },
  { key: "generating", label: "Generating Code" },
  { key: "validating", label: "Validating" },
];

function resolveStepIndex(currentStep) {
  if (!currentStep || currentStep === "queued") return -1;
  if (currentStep === "classifying" || currentStep === "classified") return 0;
  if (
    currentStep === "generating" ||
    currentStep === "generated" ||
    currentStep === "retrying"
  )
    return 1;
  if (currentStep === "validating" || currentStep === "validated") return 2;
  if (currentStep === "complete" || currentStep === "failed") return 3;
  return -1;
}

export default function StatusTracker({ status, currentStep, error }) {
  if (!status || status === "pending") return null;

  const activeIndex = resolveStepIndex(currentStep);
  const isComplete = status === "completed";
  const isFailed = status === "failed";

  return (
    <div className="bg-[#111113] border border-[#2a2a2e] rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-[#a1a1aa]">
          Pipeline Status
        </span>
        {isComplete && (
          <span className="text-xs font-medium text-[#22c55e] bg-[#22c55e]/10 px-2 py-0.5 rounded">
            Complete
          </span>
        )}
        {isFailed && (
          <span className="text-xs font-medium text-[#ef4444] bg-[#ef4444]/10 px-2 py-0.5 rounded">
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
                    w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors
                    ${isDone ? "bg-[#22c55e] text-white" : ""}
                    ${isActive ? "bg-[#6366f1] text-white animate-pulse" : ""}
                    ${isPending ? "bg-[#1a1a1d] text-[#71717a]" : ""}
                    ${isFailed && isActive ? "bg-[#ef4444] text-white animate-none" : ""}
                  `}
                >
                  {isDone ? "\u2713" : i + 1}
                </div>
                <span
                  className={`text-xs mt-2 ${isDone ? "text-[#22c55e]" : isActive ? "text-[#e4e4e7]" : "text-[#71717a]"}`}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`h-px flex-1 mx-1 transition-colors ${isDone ? "bg-[#22c55e]" : "bg-[#2a2a2e]"}`}
                />
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded text-sm text-[#ef4444]">
          {error}
        </div>
      )}
    </div>
  );
}
