import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSite, mediaUrl } from "@/lib/useSite";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { PageHeader, StatusPill, IndexNum } from "@/components/site/primitives";

export const Route = createFileRoute("/businesses/$slug/")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — Founder.env` },
      { name: "description", content: `Categories, concepts and designs for ${params.slug}.` },
      { property: "og:title", content: `${params.slug} — Founder.env` },
      { property: "og:description", content: `Inside the ${params.slug} business.` },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BusinessDetail,
});

function BusinessDetail() {
  const { slug } = Route.useParams();
  const site = useSite();
  const business = site.businesses.find((b) => b.slug === slug);
  if (!business) throw notFound();

  const cats = site.categories.filter((c) => c.business_id === business.id);
  const concepts = site.concepts.filter((c) => c.business_id === business.id);
  const cover = mediaUrl(site, business.cover_media_id);

  return (
    <>
      <Header />
      <main className="pb-24">
        <PageHeader
          title={business.name}
          description={business.tagline}
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Businesses", href: "/businesses" },
            { label: business.name },
          ]}
        >
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <StatusPill status={business.status} />
            {business.website_url ? (
              <a
                href={business.website_url}
                target="_blank"
                rel="noreferrer"
                className="row-link py-2 text-[12px] text-subtle hover:text-foreground"
              >
                Visit site ↗
              </a>
            ) : null}
          </div>
        </PageHeader>

        {cover ? (
          <div className="shell">
            <div className="overflow-hidden rounded-[4px] border">
              <img src={cover} alt={business.name} className="w-full object-cover" />
            </div>
          </div>
        ) : null}

        {business.long_description ? (
          <section className="shell py-14">
            <p className="max-w-2xl whitespace-pre-line text-[14px] leading-relaxed text-subtle">
              {business.long_description}
            </p>
          </section>
        ) : null}

        {cats.length ? (
          <section className="shell py-8">
            <h2 className="label mb-4">Categories</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {cats.map((c, i) => (
                <Link
                  key={c.id}
                  to="/businesses/$slug/$category"
                  params={{ slug: business.slug, category: c.slug }}
                  className="panel flex items-start justify-between gap-4 p-5 transition-colors hover:border-border-strong"
                >
                  <div className="flex gap-4">
                    <IndexNum n={i + 1} />
                    <div>
                      <h3 className="text-[15px]">{c.name}</h3>
                      <p className="mt-1 text-[12.5px] text-subtle">{c.description}</p>
                    </div>
                  </div>
                  <StatusPill status={c.status} />
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {concepts.length ? (
          <section className="shell py-8">
            <h2 className="label mb-4">Concept builds</h2>
            <div className="divide-y overflow-hidden rounded-[3px] border">
              {concepts.map((c, i) => (
                <div key={c.id} className="flex items-center gap-5 bg-surface px-5 py-4">
                  <IndexNum n={i + 1} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px]">{c.name}</p>
                    <p className="truncate text-[12.5px] text-subtle">{c.short_description}</p>
                  </div>
                  <span className="meta hidden text-muted-foreground md:block">{c.technology}</span>
                  <StatusPill status={c.status} />
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </main>
      <Footer />
    </>
  );
}
