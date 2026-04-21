"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const tryRefresh = params.get("try_refresh") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(tryRefresh);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tryRefresh) return;
    (async () => {
      try {
        const res = await fetch("/api/auth/refresh", { method: "POST" });
        if (res.ok) {
          router.replace(next);
          return;
        }
      } catch {}
      setRefreshing(false);
    })();
  }, [tryRefresh, next, router]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.status === 401 ? "Invalid email or password." : "Login failed.");
      return;
    }
    router.replace(next);
  }

  if (refreshing) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-fgMuted">
        Restoring session…
      </div>
    );
  }

  return (
    <div className="mx-auto mt-16 max-w-sm">
      <div className="card">
        <h1 className="mb-1 text-2xl font-semibold">Sign in</h1>
        <p className="mb-5 text-sm text-fgMuted">InvestOS is private. Enter your credentials.</p>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              required
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              autoFocus
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              required
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <button className="btn w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
          {error && <div className="text-sm text-danger">{error}</div>}
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-fgMuted">
          Loading…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
