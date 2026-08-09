import { createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useSite, mediaUrl } from "@/lib/useSite";
import { getDesignScreenshots } from "@/lib/site.functions";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { PageHeader, StatusPill } from "@/components/site/primitives";

export const Route = createFileRoute("/designs/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — Website design — Founder.env` },
      { name: "description", content: `Website design concept: ${params.slug}.` },
      { property: "og:title", content: `${params.slug} — Founder.env` },
      { property: "og:description", content: `Website design concept: ${params.slug}.` },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DesignDetail,
});

function DesignDetail() {
  const { slug } = Route.useParams();
  const site = useSite();
  const design = site.designs.find((d) => d.slug === slug);
  if (!design) throw notFound();

  const fetchShots = useServerFn(getDesignScreenshots);
  const { data: shots } = useQuery({
    queryKey: ["design-screenshots", slug],
    queryFn: () => fetchShots({ data: { slug } }),
  });

  const business = site.businesses.find((b) => b.id === design.business_id);
  const cat = site.categories.find((c) => c.id === design.category_id);
  const cover = mediaUrl(site, design.cover_media_id ?? design.thumbnail_media_id);

  return (
    <>
      <Header />
      <main className="pb-24">
        <PageHeader
          title={design.design_name}
          description={design.short_description}
          crumbs={[
            { label: "Businesses", href: "/businesses" },
            ...(business ? [{ label: business.name, href: `/businesses/${business.slug}` }] : []),
            ...(cat && business
              ? [{ label: cat.name, href: `/businesses/${business.slug}/${cat.slug}` }]
              : []),
            { label: design.design_name },
          ]}
        >
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <StatusPill status={design.availability} />
            {design.design_code ? <span className="label">{design.design_code}</span> : null}
            {design.live_preview_url ? (
              <a
                href={design.live_preview_url}
                target="_blank"
                rel="noreferrer"
                className="row-link py-2 text-[12px] text-subtle hover:text-foreground"
              >
                Live preview ↗
              </a>
            ) : null}
            {design.contact_url ? (
              <a
                href={design.contact_url}
                target="_blank"
                rel="noreferrer"
                className="row-link py-2 text-[12px] text-subtle hover:text-foreground"
              >
                Enquire ↗
              </a>
            ) : null}
          </div>
        </PageHeader>

        {cover ? (
          <div className="shell">
            <div className="overflow-hidden rounded-[4px] border">
              <img src={cover} alt={design.design_name} className="w-full object-cover" />
            </div>
          </div>
        ) : null}

        <section className="shell grid gap-10 py-14 md:grid-cols-[1.4fr_1fr]">
          <div>
            {design.long_description ? (
              <p className="whitespace-pre-line text-[14px] leading-relaxed text-subtle">
                {design.long_description}
              </p>
            ) : null}
            {design.features.length ? (
              <div className="mt-10">
                <h2 className="label mb-3">Features</h2>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {design.features.map((f) => (
                    <li key={f} className="row-link py-2.5 text-[12.5px] text-subtle">
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <aside className="panel h-fit p-5">
            <h2 className="label mb-4">Specification</h2>
            <dl className="space-y-3">
              {[
                ["Style", design.style],
                ["Pages", design.pages_count?.toString()],
                ["Technology", design.technology],
                ["Stack", design.tech_stack.join(", ")],
                ["Price", design.price ? `£${design.price}` : null],
                ["Status", design.status],
              ]
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k as string} className="flex justify-between gap-4 border-b pb-2">
                    <dt className="meta text-muted-foreground">{k}</dt>
                    <dd className="text-right text-[12.5px] text-subtle">{v}</dd>
                  </div>
                ))}
            </dl>
            {design.tags.length ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {design.tags.map((t) => (
                  <span key={t} className="meta border px-2 py-1 text-muted-foreground">
                    {t}
                  </span>
                ))}
              </div>
            ) : null}
          </aside>
        </section>

        {shots?.length ? (
          <section className="shell">
            <h2 className="label mb-4">Screens</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {shots.map((s) => {
                const url = mediaUrl(site, s.media_id);
                if (!url) return null;
                return (
                  <figure key={s.id} className="panel overflow-hidden">
                    <img src={url} alt={s.caption ?? design.design_name} className="w-full" />
                    {s.caption ? (
                      <figcaption className="meta border-t px-4 py-2 text-muted-foreground">
                        {s.device_type} — {s.caption}
                      </figcaption>
                    ) : null}
                  </figure>
                );
              })}
            </div>
          </section>
        ) : null}
      </main>
      <Footer />
    </>
  );
}
