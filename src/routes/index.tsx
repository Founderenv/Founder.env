import { createFileRoute, Link } from "@tanstack/react-router";
import { useSite, mediaUrl } from "@/lib/useSite";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Orbital } from "@/components/site/Orbital";
import { SectionHead, StatusPill, IndexNum } from "@/components/site/primitives";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Founder.env — Building things I wish existed" },
      {
        name: "description",
        content:
          "A build-in-public environment: businesses, website design concepts, projects and a running build log.",
      },
      { property: "og:title", content: "Founder.env — Building things I wish existed" },
      {
        property: "og:description",
        content: "Businesses, design concepts, projects and a running build log.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const site = useSite();
  const p = site.profile;

  return (
    <>
      <Header />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-[-30%] h-[70vh]"
            style={{
              background:
                "radial-gradient(60% 50% at 50% 40%, var(--accent-glow), transparent 70%)",
            }}
          />
          <div className="shell relative grid items-center gap-16 py-24 md:grid-cols-2 md:py-32">
            <div className="fade-up">
              <p className="label">{p?.founder_status ?? "BUILDING"}</p>
              <h1 className="mt-6 text-[42px] leading-[1.05] md:text-[58px]">
                {p?.hero_heading_line_1}
                <br />
                <span style={{ color: "var(--accent-2)" }}>{p?.hero_highlight_text}</span>{" "}
                {p?.hero_heading_line_2}
              </h1>
              <p className="mt-6 max-w-md text-[14px] leading-relaxed text-subtle">
                {p?.hero_description}
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link
                  to="/businesses"
                  className="row-link py-2.5 text-[12px] text-foreground hover:border-border-strong"
                >
                  Explore businesses →
                </Link>
                <Link
                  to="/build-log"
                  className="row-link py-2.5 text-[12px] text-subtle hover:text-foreground"
                >
                  Read the build log
                </Link>
              </div>
              {p?.current_build ? (
                <p className="meta mt-10 text-muted-foreground">
                  CURRENTLY — {p.current_build}
                </p>
              ) : null}
            </div>

            <div className="fade-up" style={{ animationDelay: "120ms" }}>
              <Orbital />
            </div>
          </div>
        </section>

        {/* Businesses */}
        <section className="shell py-16">
          <SectionHead label="Businesses" href="/businesses" />
          <div className="grid gap-3 md:grid-cols-2">
            {site.businesses.map((b, i) => {
              const cover = mediaUrl(site, b.cover_media_id);
              return (
                <Link
                  key={b.id}
                  to="/businesses/$slug"
                  params={{ slug: b.slug }}
                  className="panel group overflow-hidden transition-colors hover:border-border-strong"
                >
                  {cover ? (
                    <div className="aspect-[16/9] overflow-hidden border-b">
                      <img
                        src={cover}
                        alt={b.name}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                      />
                    </div>
                  ) : null}
                  <div className="flex items-start justify-between gap-4 p-5">
                    <div className="flex gap-4">
                      <IndexNum n={i + 1} />
                      <div>
                        <h3 className="text-[15px]">{b.name}</h3>
                        <p className="mt-1 max-w-sm text-[12.5px] text-subtle">
                          {b.short_description ?? b.tagline}
                        </p>
                      </div>
                    </div>
                    <StatusPill status={b.status} />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Projects */}
        <section className="shell py-16">
          <SectionHead label="Projects" href="/projects" />
          <div className="divide-y overflow-hidden rounded-[3px] border">
            {site.projects.slice(0, 6).map((pr, i) => (
              <div key={pr.id} className="flex items-center gap-5 bg-surface px-5 py-4">
                <IndexNum n={i + 1} />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px]">{pr.name}</p>
                  <p className="truncate text-[12.5px] text-subtle">{pr.short_description}</p>
                </div>
                <span className="meta hidden text-muted-foreground md:block">
                  {pr.tech_stack.slice(0, 3).join(" · ")}
                </span>
                <StatusPill status={pr.status} />
              </div>
            ))}
            {site.projects.length === 0 ? (
              <p className="bg-surface px-5 py-8 text-center text-[12.5px] text-muted-foreground">
                No projects published yet.
              </p>
            ) : null}
          </div>
        </section>

        {/* Build log */}
        <section className="shell py-16 pb-24">
          <SectionHead label="Build Log" href="/build-log" />
          <div className="border-l pl-6">
            {site.logs.slice(0, 5).map((l) => (
              <div key={l.id} className="relative pb-8">
                <span
                  className="absolute left-[-28.5px] top-1.5 h-1.5 w-1.5 rounded-full"
                  style={{ background: "var(--accent)" }}
                />
                <p className="meta text-muted-foreground">
                  {new Date(l.log_date).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                  {l.log_number ? ` — LOG ${String(l.log_number).padStart(3, "0")}` : ""}
                </p>
                <p className="mt-1.5 text-[14px]">{l.title}</p>
                {l.description ? (
                  <p className="mt-1 max-w-2xl text-[12.5px] text-subtle">{l.description}</p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
