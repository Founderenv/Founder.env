import { createFileRoute } from "@tanstack/react-router";
import { useSite, mediaUrl } from "@/lib/useSite";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { PageHeader, StatusPill } from "@/components/site/primitives";

export const Route = createFileRoute("/build-log")({
  head: () => ({
    meta: [
      { title: "Build Log — Founder.env" },
      { name: "description", content: "A dated, running log of everything being built." },
      { property: "og:title", content: "Build Log — Founder.env" },
      { property: "og:description", content: "A dated, running log of everything being built." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BuildLog,
});

function BuildLog() {
  const site = useSite();

  return (
    <>
      <Header />
      <main className="pb-24">
        <PageHeader
          title="Build Log"
          description="Everything shipped, in order. No polish, just progress."
          crumbs={[{ label: "Home", href: "/" }, { label: "Build Log" }]}
        />
        <div className="shell">
          <div className="border-l pl-6 md:pl-10">
            {site.logs.map((l) => {
              const img = mediaUrl(site, l.media_id);
              return (
                <article key={l.id} className="relative pb-12">
                  <span
                    className="absolute top-2 h-1.5 w-1.5 rounded-full left-[-28.5px] md:left-[-44.5px]"
                    style={{ background: "var(--accent)" }}
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="meta text-muted-foreground">
                      {new Date(l.log_date).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                    {l.log_number ? (
                      <span className="label">LOG {String(l.log_number).padStart(3, "0")}</span>
                    ) : null}
                    <StatusPill status={l.status} />
                  </div>
                  <h2 className="mt-2 text-[16px]">{l.title}</h2>
                  {l.description ? (
                    <p className="mt-2 max-w-2xl whitespace-pre-line text-[13px] leading-relaxed text-subtle">
                      {l.description}
                    </p>
                  ) : null}
                  {img ? (
                    <div className="mt-4 max-w-2xl overflow-hidden rounded-[3px] border">
                      <img src={img} alt={l.title} className="w-full" />
                    </div>
                  ) : null}
                </article>
              );
            })}
            {site.logs.length === 0 ? (
              <p className="py-10 text-[12.5px] text-muted-foreground">No entries yet.</p>
            ) : null}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
