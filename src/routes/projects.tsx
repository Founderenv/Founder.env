import { createFileRoute } from "@tanstack/react-router";
import { useSite } from "@/lib/useSite";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { PageHeader, StatusPill, IndexNum } from "@/components/site/primitives";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "Projects — Founder.env" },
      { name: "description", content: "Tools, experiments and products built in public." },
      { property: "og:title", content: "Projects — Founder.env" },
      { property: "og:description", content: "Tools, experiments and products built in public." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Projects,
});

function Projects() {
  const site = useSite();

  return (
    <>
      <Header />
      <main className="pb-24">
        <PageHeader
          title="Projects"
          description="Tools, experiments and products — each one shipped from the same environment."
          crumbs={[{ label: "Home", href: "/" }, { label: "Projects" }]}
        />
        <div className="shell">
          <div className="divide-y overflow-hidden rounded-[3px] border">
            {site.projects.map((p, i) => (
              <article key={p.id} className="bg-surface px-5 py-5">
                <div className="flex items-start gap-5">
                  <IndexNum n={i + 1} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-[15px]">{p.name}</h2>
                      <StatusPill status={p.status} />
                    </div>
                    <p className="mt-1.5 max-w-2xl text-[12.5px] text-subtle">
                      {p.short_description}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-4">
                      <span className="meta text-muted-foreground">
                        {p.tech_stack.join(" · ")}
                      </span>
                      {p.live_demo_url ? (
                        <a
                          href={p.live_demo_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[12px] text-subtle hover:text-foreground"
                        >
                          Live ↗
                        </a>
                      ) : null}
                      {p.github_url ? (
                        <a
                          href={p.github_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[12px] text-subtle hover:text-foreground"
                        >
                          Code ↗
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            ))}
            {site.projects.length === 0 ? (
              <p className="bg-surface px-5 py-10 text-center text-[12.5px] text-muted-foreground">
                No projects published yet.
              </p>
            ) : null}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
