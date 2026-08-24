import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  const url = process.env["SUPABASE_URL"];
  if (!key || !url) throw new Error("Public content service is not configured.");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

const SIGNED_TTL = 60 * 60 * 24 * 7;

async function signMediaUrls(
  sb: ReturnType<typeof publicClient>,
  paths: (string | null | undefined)[],
) {
  const unique = Array.from(new Set(paths.filter((p): p is string => !!p)));
  if (unique.length === 0) return {} as Record<string, string>;
  const { data, error } = await sb.storage.from("media").createSignedUrls(unique, SIGNED_TTL);
  if (error) throw new Error(`Unable to sign public media: ${error.message}`);
  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    if (row.path && row.signedUrl) map[row.path] = row.signedUrl;
  }
  return map;
}

export type MediaMap = Record<string, string>;

async function loadMedia(sb: ReturnType<typeof publicClient>) {
  try {
    const { data, error } = await sb.from("media").select("id, storage_path, alt_text");
    if (error) {
      console.error("Unable to load public media:", error.message);
      return {} as MediaMap;
    }
    const rows = data ?? [];
    const signed = await signMediaUrls(
      sb,
      rows.map((r) => r.storage_path),
    );
    const byId: MediaMap = {};
    for (const r of rows) {
      const url = signed[r.storage_path];
      if (url) byId[r.id] = url;
    }
    return byId;
  } catch (e) {
    console.error("loadMedia failed:", e);
    return {} as MediaMap;
  }
}

export const getSiteData = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();

  const safe = <T>(label: string, fn: () => PromiseLike<T>): Promise<T | null> =>
    Promise.resolve().then(() => fn()).catch((e: unknown) => {
      console.error(`getSiteData: ${label} failed:`, e);
      return null;
    });

  const [profile, brand, appearance, seo, nav, socials, businesses, categories, concepts, designs, projects, logs, media] =
    await Promise.all([
      safe("profile", () => sb.from("profiles").select("*").limit(1).maybeSingle()),
      safe("brand", () => sb.from("brand_settings").select("*").limit(1).maybeSingle()),
      safe("appearance", () => sb.from("appearance_settings").select("*").limit(1).maybeSingle()),
      safe("seo", () => sb.from("seo_settings").select("*").limit(1).maybeSingle()),
      safe("navigation", () => sb.from("navigation_settings").select("*").eq("visible", true).order("display_order")),
      safe("social links", () => sb.from("social_links").select("*").eq("visible", true).order("display_order")),
      safe("businesses", () => sb.from("businesses").select("*").eq("published", true).order("display_order")),
      safe("categories", () => sb.from("business_categories").select("*").eq("published", true).order("display_order")),
      safe("ideas", () => sb.from("concept_builds").select("*").eq("published", true).order("display_order")),
      safe("designs", () => sb.from("website_designs").select("*").neq("status", "HIDDEN").neq("status", "DRAFT").order("display_order")),
      safe("projects", () => sb.from("projects").select("*").eq("published", true).order("display_order")),
      safe("build log", () => sb.from("build_logs").select("*").eq("published", true).order("log_date", { ascending: false }).order("display_order")),
      safe("media", () => loadMedia(sb)),
    ]);

  return {
    profile: profile?.data ?? null,
    brand: brand?.data ?? null,
    appearance: appearance?.data ?? null,
    seo: seo?.data ?? null,
    nav: nav?.data ?? [],
    socials: socials?.data ?? [],
    businesses: businesses?.data ?? [],
    categories: categories?.data ?? [],
    concepts: concepts?.data ?? [],
    designs: designs?.data ?? [],
    projects: projects?.data ?? [],
    logs: logs?.data ?? [],
    media: media ?? {},
  };
});

export type SiteData = Awaited<ReturnType<typeof getSiteData>>;

export const getDesignScreenshots = createServerFn({ method: "GET" })
  .validator((input: { slug: string }) => input)
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: design, error: designError } = await sb
      .from("website_designs")
      .select("id")
      .eq("slug", data.slug)
      .maybeSingle();
    if (designError) throw new Error("Unable to load this design.");
    if (!design) return [];
    const { data: shots, error } = await sb
      .from("design_screenshots")
      .select("*")
      .eq("design_id", design.id)
      .order("display_order");
    if (error) throw new Error("Unable to load design screenshots.");
    return shots ?? [];
  });

type SeoRequest = {
  path: string;
  section?: string;
  entity?: "business" | "design" | "project" | "idea";
  slug?: string;
};

export type PageSeo = {
  title: string;
  description: string;
  canonical: string | null;
  image: string | null;
  twitterHandle: string | null;
  index: boolean;
  keywords: string[];
  found: boolean;
};

export const getPageSeo = createServerFn({ method: "GET" })
  .validator((input: SeoRequest) => input)
  .handler(async ({ data }) => {
    const sb = publicClient();
    const [{ data: seo, error: seoError }, { data: profile, error: profileError }] =
      await Promise.all([
        sb.from("seo_settings").select("*").limit(1).maybeSingle(),
        sb.from("profiles").select("brand_name").limit(1).maybeSingle(),
      ]);
    if (seoError || profileError) throw new Error("Unable to load page metadata.");

    let pageTitle = data.section ?? null;
    let description = seo?.site_description ?? "Founder.env";
    let mediaId = seo?.og_image_media_id ?? seo?.twitter_image_media_id ?? null;
    let found = !data.entity;

    if (data.entity && data.slug) {
      if (data.entity === "business") {
        const { data: row, error } = await sb
          .from("businesses")
          .select("name, short_description, cover_media_id")
          .eq("slug", data.slug)
          .maybeSingle();
        if (error) throw new Error("Unable to load business metadata.");
        found = Boolean(row);
        pageTitle = row?.name ?? pageTitle;
        description = row?.short_description ?? description;
        mediaId = row?.cover_media_id ?? mediaId;
      } else if (data.entity === "design") {
        const { data: row, error } = await sb
          .from("website_designs")
          .select(
            "design_name, seo_title, seo_description, short_description, cover_media_id, thumbnail_media_id",
          )
          .eq("slug", data.slug)
          .maybeSingle();
        if (error) throw new Error("Unable to load design metadata.");
        found = Boolean(row);
        pageTitle = row?.seo_title ?? row?.design_name ?? pageTitle;
        description = row?.seo_description ?? row?.short_description ?? description;
        mediaId = row?.cover_media_id ?? row?.thumbnail_media_id ?? mediaId;
      } else if (data.entity === "project") {
        const { data: row, error } = await sb
          .from("projects")
          .select("name, short_description, cover_media_id")
          .eq("slug", data.slug)
          .maybeSingle();
        if (error) throw new Error("Unable to load project metadata.");
        found = Boolean(row);
        pageTitle = row?.name ?? pageTitle;
        description = row?.short_description ?? description;
        mediaId = row?.cover_media_id ?? mediaId;
      } else {
        const { data: row, error } = await sb
          .from("concept_builds")
          .select("name, short_description, cover_media_id")
          .eq("slug", data.slug)
          .maybeSingle();
        if (error) throw new Error("Unable to load idea metadata.");
        found = Boolean(row);
        pageTitle = row?.name ?? pageTitle;
        description = row?.short_description ?? description;
        mediaId = row?.cover_media_id ?? mediaId;
      }
    }

    const brand = profile?.brand_name ?? "Founder.env";
    const title = pageTitle
      ? seo?.title_template?.includes("%s")
        ? seo.title_template.replace("%s", pageTitle)
        : `${pageTitle} — ${brand}`
      : (seo?.site_title ?? brand);
    let image: string | null = null;
    if (mediaId) {
      const { data: media } = await sb
        .from("media")
        .select("storage_path")
        .eq("id", mediaId)
        .maybeSingle();
      if (media?.storage_path) {
        const signed = await signMediaUrls(sb, [media.storage_path]);
        image = signed[media.storage_path] ?? null;
      }
    }
    const base = seo?.canonical_url?.replace(/\/$/, "") ?? null;
    return {
      title,
      description,
      canonical: base ? `${base}${data.path === "/" ? "" : data.path}` : null,
      image,
      twitterHandle: seo?.twitter_handle ?? null,
      index: seo?.robots_index !== false,
      keywords: seo?.keywords ?? [],
      found,
    } satisfies PageSeo;
  });

export const getSitemapEntries = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const [businesses, ideas, designs, projects] = await Promise.all([
    sb.from("businesses").select("slug, updated_at").order("updated_at", { ascending: false }),
    sb.from("concept_builds").select("slug, updated_at").order("updated_at", { ascending: false }),
    sb.from("website_designs").select("slug, updated_at").order("updated_at", { ascending: false }),
    sb.from("projects").select("slug, updated_at").order("updated_at", { ascending: false }),
  ]);
  const failed = [businesses.error, ideas.error, designs.error, projects.error].some(Boolean);
  if (failed) throw new Error("Unable to generate sitemap.");
  return [
    ...(businesses.data ?? []).map((row) => ({
      path: `/businesses/${row.slug}`,
      updatedAt: row.updated_at,
    })),
    ...(ideas.data ?? []).map((row) => ({ path: `/ideas/${row.slug}`, updatedAt: row.updated_at })),
    ...(designs.data ?? []).map((row) => ({
      path: `/designs/${row.slug}`,
      updatedAt: row.updated_at,
    })),
    ...(projects.data ?? []).map((row) => ({
      path: `/projects/${row.slug}`,
      updatedAt: row.updated_at,
    })),
  ];
});
