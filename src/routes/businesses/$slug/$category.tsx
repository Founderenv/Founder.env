import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSite, mediaUrl } from "@/lib/useSite";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { PageHeader, StatusPill } from "@/components/site/primitives";

export const Route = createFileRoute("/businesses/$slug/$category")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.category} — Founder.env` },
      { name: "description", content: `Website designs in the ${params.category} category.` },
      { property: "og:title", content: `${params.category} — Founder.env` },
      { property: "og:description", content: `Website designs in ${params.category}.` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CategoryPage,
});

function CategoryPage() {
  const { slug, category } = Route.useParams();
  const site = useSite();
  const business = site.businesses.find((b) => b.slug === slug);
  const cat = site.categories.find((c) => c.slug === category && c.business_id === business?.id);
  if (!business || !cat) throw notFound();

  const designs = site.designs.filter((d) => d.category_id === cat.id);

  return (
    <>
      <Header />
      <main className="pb-24">
        <PageHeader
          title={cat.name}
          description={cat.description}
          crumbs={[
            { label: "Businesses", href: "/businesses" },
            { label: business.name, href: `/businesses/${business.slug}` },
            { label: cat.name },
          ]}
        />

        <div className="shell grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {designs.map((d) => {
            const thumb = mediaUrl(site, d.thumbnail_media_id ?? d.cover_media_id);
            return (
              <Link
                key={d.id}
                to="/designs/$slug"
                params={{ slug: d.slug }}
                className="panel group overflow-hidden transition-colors hover:border-border-strong"
              >
                <div className="aspect-[4/3] overflow-hidden border-b bg-[var(--surface-2)]">
                  {thumb ? (
                    <img
                      src={thumb}
                      alt={d.design_name}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                  ) : null}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="label">{d.design_code}</p>
                      <h2 className="mt-1.5 text-[14px]">{d.design_name}</h2>
                    </div>
                    <StatusPill status={d.availability} />
                  </div>
                  <p className="mt-2 text-[12.5px] text-subtle">{d.short_description}</p>
                  <p className="meta mt-4 text-muted-foreground">
                    {[d.style, d.pages_count ? `${d.pages_count} PAGES` : null, d.technology]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </Link>
            );
          })}
          {designs.length === 0 ? (
            <p className="panel p-8 text-center text-[12.5px] text-muted-foreground">
              No designs published in this category yet.
            </p>
          ) : null}
        </div>
      </main>
      <Footer />
    </>
  );
}
