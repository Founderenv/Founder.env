import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getAdminStatus } from "@/lib/admin.functions";
import { useSite } from "@/lib/useSite";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Dashboard — Founder.env admin" },
      { name: "description", content: "Manage Founder.env content." },
      { property: "og:title", content: "Dashboard — Founder.env admin" },
      { property: "og:description", content: "Manage Founder.env content." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const site = useSite();
  const navigate = useNavigate();
  const status = useServerFn(getAdminStatus);
  const { data, isLoading } = useQuery({ queryKey: ["admin-status"], queryFn: () => status() });

  if (isLoading) {
    return <main className="shell py-20 text-[12.5px] text-subtle">Checking access…</main>;
  }

  if (!data?.isAdmin) {
    return (
      <main className="shell py-20">
        <h1 className="text-[20px]">Not authorised</h1>
        <p className="mt-2 text-[12.5px] text-subtle">
          This account doesn't have admin access to Founder.env.
        </p>
      </main>
    );
  }

  const stats = [
    ["Businesses", site.businesses.length],
    ["Categories", site.categories.length],
    ["Concept builds", site.concepts.length],
    ["Website designs", site.designs.length],
    ["Projects", site.projects.length],
    ["Build log entries", site.logs.length],
    ["Media items", Object.keys(site.media).length],
  ] as const;

  return (
    <main className="shell py-14">
      <div className="flex items-center justify-between">
        <div>
          <p className="label">Admin</p>
          <h1 className="mt-3 text-[26px]">Content dashboard</h1>
        </div>
        <div className="flex gap-2">
          <Link to="/" className="row-link py-2 text-[12px] text-subtle hover:text-foreground">
            View site ↗
          </Link>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              void navigate({ to: "/admin/login" });
            }}
            className="row-link py-2 text-[12px] text-subtle hover:text-foreground"
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="panel p-5">
            <p className="label">{label}</p>
            <p className="mt-3 font-mono text-[26px]">{String(value).padStart(2, "0")}</p>
          </div>
        ))}
      </div>

      <p className="mt-10 max-w-xl text-[12.5px] text-subtle">
        Content editing screens come next — the database, storage and admin access are live.
      </p>
    </main>
  );
}
