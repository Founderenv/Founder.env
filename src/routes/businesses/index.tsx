import { createFileRoute, Link } from "@tanstack/react-router";
import { useSite, mediaUrl } from "@/lib/useSite";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { PageHeader, StatusPill, IndexNum } from "@/components/site/primitives";

export const Route = createFileRoute("/businesses/")({
  head: () => ({
    meta: [
      { title: "Businesses — Founder.env" },
      {
        name: "description",
        content: "The businesses being built inside the Founder.env environment.",
      },
      { property: "og:title", content: "Businesses — Founder.env" },
      { property: "og:description", content: "The businesses being built inside Founder.env." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Businesses,
});

function Businesses() {
  const site = useSite();

  return (
    <>
      <Header />
      <main className="pb-24">
        <PageHeader
          title="Businesses"
          description="Ventures in motion — each with its own categories, concepts and design work."
          crumbs={[{ label: "Home", href: "/" }, { label: "Businesses" }]}
        />
        <div className="shell grid gap-3 md:grid-cols-2">
          {site.businesses.map((b, i) => {
            const cover = mediaUrl(site, b.cover_media_id);
            const cats = site.categories.filter((c) => c.business_id === b.id);
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
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-4">
                      <IndexNum n={i + 1} />
                      <div>
                        <h2 className="text-[15px]">{b.name}</h2>
                        <p className="mt-1 text-[12.5px] text-subtle">
                          {b.short_description ?? b.tagline}
                        </p>
                      </div>
                    </div>
                    <StatusPill status={b.status} />
                  </div>
                  {cats.length ? (
                    <p className="label mt-5">{cats.map((c) => c.name).join(" · ")}</p>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      </main>
      <Footer />
    </>
  );
}
