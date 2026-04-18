"use client";

import { useState } from "react";

export default function PromptInput({ onSubmit, disabled }) {
  const [description, setDescription] = useState("");
  const [authContext, setAuthContext] = useState("");
  const [showAuth, setShowAuth] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    if (!description.trim() || disabled) return;
    onSubmit({
      description: description.trim(),
      auth_context: authContext.trim() || null,
    });
  }

  const charCount = description.length;
  const isValid = charCount >= 10 && charCount <= 2000;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-[#a1a1aa] mb-2"
        >
          Describe your tool in plain English
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="I want a tool that searches GitHub issues by label and returns titles with URLs"
          rows={4}
          maxLength={2000}
          disabled={disabled}
          className="w-full px-4 py-3 bg-[#1a1a1d] border border-[#2a2a2e] rounded-lg
                     text-[#e4e4e7] placeholder:text-[#71717a] text-sm leading-relaxed
                     focus:outline-none focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5]
                     resize-none transition-colors disabled:opacity-50"
        />
        <div className="flex justify-between mt-1.5">
          <button
            type="button"
            onClick={() => setShowAuth(!showAuth)}
            className="text-xs text-[#71717a] hover:text-[#a1a1aa] transition-colors"
          >
            {showAuth ? "Hide auth context" : "+ Add auth context (optional)"}
          </button>
          <span
            className={`text-xs ${charCount > 0 && !isValid ? "text-[#ef4444]" : "text-[#71717a]"}`}
          >
            {charCount}/2000
          </span>
        </div>
      </div>

      {showAuth && (
        <div>
          <label
            htmlFor="auth-context"
            className="block text-sm font-medium text-[#a1a1aa] mb-2"
          >
            Auth context
          </label>
          <input
            id="auth-context"
            type="text"
            value={authContext}
            onChange={(e) => setAuthContext(e.target.value)}
            placeholder="e.g. I have a GitHub personal access token"
            maxLength={500}
            disabled={disabled}
            className="w-full px-4 py-2.5 bg-[#1a1a1d] border border-[#2a2a2e] rounded-lg
                       text-[#e4e4e7] placeholder:text-[#71717a] text-sm
                       focus:outline-none focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5]
                       transition-colors disabled:opacity-50"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={disabled || !isValid}
        className="w-full py-3 bg-[#6366f1] hover:bg-[#818cf8] text-white text-sm font-medium
                   rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {disabled ? "Generating..." : "Generate MCP Server"}
      </button>
    </form>
  );
}
