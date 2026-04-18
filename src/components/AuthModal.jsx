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
  const { signIn, signUp, signInWithGoogle } = useAuth();

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

  async function handleGoogle() {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err.message);
    }
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
            <p className="text-sm text-[#71717a] mb-6">
              {mode === "signin"
                ? "Access your AgentForge dashboard"
                : "Start building MCP servers"}
            </p>

            {/* Google OAuth */}
            <button
              onClick={handleGoogle}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-3 py-3 bg-[#0a0a0b] border border-[#2a2a2e]
                         rounded-lg text-sm font-medium text-[#e4e4e7] hover:border-[#3a3a3e] hover:bg-[#161618]
                         transition-colors disabled:opacity-50"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-[#2a2a2e]" />
              <span className="text-xs text-[#52525b]">or</span>
              <div className="flex-1 h-px bg-[#2a2a2e]" />
            </div>

            {/* Email/password form */}
            <form onSubmit={handleSubmit} className="space-y-4">
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
              {mode === "signin"
                ? "No account? "
                : "Already have an account? "}
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
