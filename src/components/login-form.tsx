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
    <div className="min-h-screen bg-[#f6f7f9]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-950">
            <ArrowLeft size={16} aria-hidden="true" />
            CRM
          </Link>
          <a
            href="https://www.steelit.site"
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-slate-600 hover:text-slate-950"
          >
            steelit.site
          </a>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl items-center justify-center px-4 py-16 sm:px-6">
        <section className="w-full max-w-md border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded bg-slate-950 text-white">
              <Lock size={18} aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-950">Steelit CRM</h1>
              <p className="text-sm text-slate-500">{mode === "sign-in" ? "Sign in" : "Create account"}</p>
            </div>
          </div>

          <div className="mt-6 inline-grid h-10 w-full grid-cols-2 rounded border border-slate-300 bg-slate-100 p-0.5">
            <button
              type="button"
              onClick={() => setMode("sign-in")}
              className={mode === "sign-in" ? "rounded-sm bg-white text-sm font-medium shadow-sm" : "text-sm font-medium text-slate-600"}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("sign-up")}
              className={mode === "sign-up" ? "rounded-sm bg-white text-sm font-medium shadow-sm" : "text-sm font-medium text-slate-600"}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={submit} className="mt-5 space-y-4">
            {mode === "sign-up" ? (
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Name</span>
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="mt-1 h-10 w-full rounded border border-slate-300 px-3 text-sm outline-none focus:border-slate-950"
                  autoComplete="name"
                />
              </label>
            ) : null}

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 h-10 w-full rounded border border-slate-300 px-3 text-sm outline-none focus:border-slate-950"
                type="email"
                autoComplete="email"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Password</span>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 h-10 w-full rounded border border-slate-300 px-3 text-sm outline-none focus:border-slate-950"
                type="password"
                autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                required
              />
            </label>

            {message ? (
              <p className={status === "error" ? "text-sm text-red-700" : "text-sm text-emerald-700"}>{message}</p>
            ) : null}

            <button
              type="submit"
              disabled={status === "loading"}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded bg-slate-950 px-3 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
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
