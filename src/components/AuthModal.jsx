"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function AuthModal({ onClose, onSuccess }) {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const { signIn, signUp } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (mode === "signin") {
        await signIn(email, password);
        onSuccess?.();
      } else {
        await signUp(email, password);
        setConfirmationSent(true);
      }
    } catch (err) {
      setError(err.message);
    }
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md mx-4 bg-[#111113] border border-[#2a2a2e] rounded-xl p-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center
                     text-[#71717a] hover:text-[#e4e4e7] transition-colors rounded-lg
                     hover:bg-[#1a1a1d]"
          aria-label="Close"
        >
          x
        </button>

        {confirmationSent ? (
          <div className="text-center py-6">
            <h2 className="text-xl font-semibold text-[#e4e4e7] mb-3">
              Check your email
            </h2>
            <p className="text-sm text-[#a1a1aa] leading-relaxed mb-6">
              We sent a confirmation link to {email}. Click it to activate your
              account, then sign in.
            </p>
            <button
              onClick={() => {
                setConfirmationSent(false);
                setMode("signin");
              }}
              className="text-sm text-[#6366f1] hover:text-[#818cf8] transition-colors"
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-semibold text-[#e4e4e7] mb-1">
              {mode === "signin" ? "Sign in" : "Create account"}
            </h2>
            <p className="text-sm text-[#71717a] mb-8">
              {mode === "signin"
                ? "Access your AgentForge dashboard"
                : "Start building MCP servers"}
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="auth-email"
                  className="block text-sm font-medium text-[#a1a1aa] mb-2"
                >
                  Email
                </label>
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={submitting}
                  className="w-full px-4 py-3 bg-[#0a0a0b] border border-[#2a2a2e] rounded-lg
                             text-[#e4e4e7] placeholder:text-[#52525b] text-sm
                             focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]
                             transition-colors disabled:opacity-50"
                />
              </div>

              <div>
                <label
                  htmlFor="auth-password"
                  className="block text-sm font-medium text-[#a1a1aa] mb-2"
                >
                  Password
                </label>
                <input
                  id="auth-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                  minLength={6}
                  disabled={submitting}
                  className="w-full px-4 py-3 bg-[#0a0a0b] border border-[#2a2a2e] rounded-lg
                             text-[#e4e4e7] placeholder:text-[#52525b] text-sm
                             focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]
                             transition-colors disabled:opacity-50"
                />
              </div>

              {error && (
                <p className="text-sm text-[#ef4444] bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg px-4 py-2.5">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-[#6366f1] hover:bg-[#818cf8] text-white text-sm font-medium
                           rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting
                  ? "Please wait..."
                  : mode === "signin"
                    ? "Sign in"
                    : "Create account"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-[#71717a]">
              {mode === "signin" ? "No account? " : "Already have an account? "}
              <button
                onClick={() => {
                  setMode(mode === "signin" ? "signup" : "signin");
                  setError(null);
                }}
                className="text-[#6366f1] hover:text-[#818cf8] transition-colors"
              >
                {mode === "signin" ? "Create one" : "Sign in"}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
