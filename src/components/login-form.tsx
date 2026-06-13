"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock, LogIn, UserPlus } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Mode = "sign-in" | "sign-up";

export function LoginForm() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      setStatus("error");
      setMessage("Supabase environment variables are not configured.");
      return;
    }

    setStatus("loading");
    setMessage("");

    if (mode === "sign-up") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: displayName,
          },
        },
      });

      if (error) {
        setStatus("error");
        setMessage(error.message);
        return;
      }

      setStatus("success");
      setMessage("Account created. Confirm the email if Supabase requires it, then sign in.");
      setMode("sign-in");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <header className="border-b border-[#334155] bg-[#0f172a]">
        <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white">
            <ArrowLeft size={16} aria-hidden="true" />
            CRM
          </Link>
          <a
            href="https://www.steelit.site"
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-slate-300 hover:text-white"
          >
            steelit.site
          </a>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl items-center justify-center px-4 py-16 sm:px-6">
        <section className="w-full max-w-md border border-[#334155] bg-[#0f172a] p-6 shadow-2xl shadow-black/30">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded bg-gradient-to-br from-[#2563eb] to-[#06b6d4] text-white shadow-lg shadow-cyan-950/40">
              <Lock size={18} aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">Steelit CRM</h1>
              <p className="text-sm text-slate-400">{mode === "sign-in" ? "Sign in" : "Create account"}</p>
            </div>
          </div>

          <div className="mt-6 inline-grid h-10 w-full grid-cols-2 rounded border border-[#334155] bg-[#020617] p-0.5">
            <button
              type="button"
              onClick={() => setMode("sign-in")}
              className={
                mode === "sign-in"
                  ? "rounded-sm bg-gradient-to-r from-[#2563eb] to-[#06b6d4] text-sm font-medium text-white shadow-sm"
                  : "text-sm font-medium text-slate-400 hover:text-slate-100"
              }
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("sign-up")}
              className={
                mode === "sign-up"
                  ? "rounded-sm bg-gradient-to-r from-[#2563eb] to-[#06b6d4] text-sm font-medium text-white shadow-sm"
                  : "text-sm font-medium text-slate-400 hover:text-slate-100"
              }
            >
              Sign up
            </button>
          </div>

          <form onSubmit={submit} className="mt-5 space-y-4">
            {mode === "sign-up" ? (
              <label className="block">
                <span className="text-sm font-medium text-slate-300">Name</span>
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="mt-1 h-10 w-full rounded border border-[#334155] bg-[#020617] px-3 text-sm text-slate-100 outline-none focus:border-[#3b82f6]"
                  autoComplete="name"
                />
              </label>
            ) : null}

            <label className="block">
              <span className="text-sm font-medium text-slate-300">Email</span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 h-10 w-full rounded border border-[#334155] bg-[#020617] px-3 text-sm text-slate-100 outline-none focus:border-[#3b82f6]"
                type="email"
                autoComplete="email"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-300">Password</span>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 h-10 w-full rounded border border-[#334155] bg-[#020617] px-3 text-sm text-slate-100 outline-none focus:border-[#3b82f6]"
                type="password"
                autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                required
              />
            </label>

            {message ? (
              <p className={status === "error" ? "text-sm text-red-300" : "text-sm text-emerald-300"}>{message}</p>
            ) : null}

            <button
              type="submit"
              disabled={status === "loading"}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded bg-gradient-to-r from-[#2563eb] to-[#06b6d4] px-3 text-sm font-medium text-white hover:from-[#1d4ed8] hover:to-[#0891b2] disabled:cursor-not-allowed disabled:from-[#334155] disabled:to-[#334155] disabled:text-slate-400"
            >
              {mode === "sign-in" ? <LogIn size={16} aria-hidden="true" /> : <UserPlus size={16} aria-hidden="true" />}
              {status === "loading" ? "Working" : mode === "sign-in" ? "Sign in" : "Create account"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
