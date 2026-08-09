import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { adminExists, claimAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { title: "Admin — Founder.env" },
      { name: "description", content: "Sign in to manage Founder.env content." },
      { property: "og:title", content: "Admin — Founder.env" },
      { property: "og:description", content: "Sign in to manage Founder.env content." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "setup">("signin");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void adminExists().then(({ exists }) => setMode(exists ? "signin" : "setup"));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      if (mode === "setup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/admin/login` },
        });
        if (error) throw error;
        if (!data.session) {
          setMessage("Check your email to confirm the account, then sign in here.");
          setMode("signin");
          return;
        }
        await claimAdmin();
        void navigate({ to: "/admin" });
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const { exists } = await adminExists();
      if (!exists) await claimAdmin();
      void navigate({ to: "/admin" });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <form onSubmit={onSubmit} className="panel w-full max-w-sm p-7">
        <p className="label">Founder.env</p>
        <h1 className="mt-3 text-[20px]">
          {mode === "setup" ? "Create admin account" : "Admin sign in"}
        </h1>
        <p className="mt-2 text-[12.5px] text-subtle">
          {mode === "setup"
            ? "No admin exists yet. The first account created becomes the owner."
            : "Manage every piece of content on the site."}
        </p>

        <label className="label mt-7 block">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-2 w-full rounded-[3px] border bg-[var(--surface-2)] px-3 py-2.5 text-[13px] text-foreground outline-none focus:border-border-strong"
        />

        <label className="label mt-4 block">Password</label>
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-2 w-full rounded-[3px] border bg-[var(--surface-2)] px-3 py-2.5 text-[13px] text-foreground outline-none focus:border-border-strong"
        />

        {message ? <p className="mt-4 text-[12px] text-subtle">{message}</p> : null}

        <button
          type="submit"
          disabled={busy}
          className="mt-6 w-full rounded-[3px] border px-4 py-2.5 text-[12.5px] transition-colors disabled:opacity-50"
          style={{ borderColor: "var(--accent)", background: "var(--accent-glow)" }}
        >
          {busy ? "Working…" : mode === "setup" ? "Create account" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
