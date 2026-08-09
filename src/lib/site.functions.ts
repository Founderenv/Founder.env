import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const url = process.env["SUPABASE_URL"]!;
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
  const { data } = await sb.storage.from("media").createSignedUrls(unique, SIGNED_TTL);
  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    if (row.path && row.signedUrl) map[row.path] = row.signedUrl;
  }
  return map;
}

export type MediaMap = Record<string, string>;

async function loadMedia(sb: ReturnType<typeof publicClient>) {
  const { data } = await sb.from("media").select("id, storage_path, alt_text");
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
}

export const getSiteData = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();

  const [
    profile,
    brand,
    appearance,
    seo,
    nav,
    socials,
    businesses,
    categories,
    concepts,
    designs,
    projects,
    logs,
    media,
  ] = await Promise.all([
    sb.from("profiles").select("*").limit(1).maybeSingle(),
    sb.from("brand_settings").select("*").limit(1).maybeSingle(),
    sb.from("appearance_settings").select("*").limit(1).maybeSingle(),
    sb.from("seo_settings").select("*").limit(1).maybeSingle(),
    sb.from("navigation_settings").select("*").eq("visible", true).order("display_order"),
    sb.from("social_links").select("*").eq("visible", true).order("display_order"),
    sb.from("businesses").select("*").eq("published", true).order("display_order"),
    sb.from("business_categories").select("*").eq("published", true).order("display_order"),
    sb.from("concept_builds").select("*").eq("published", true).order("display_order"),
    sb
      .from("website_designs")
      .select("*")
      .neq("status", "HIDDEN")
      .neq("status", "DRAFT")
      .order("display_order"),
    sb.from("projects").select("*").eq("published", true).order("display_order"),
    sb
      .from("build_logs")
      .select("*")
      .eq("published", true)
      .order("log_date", { ascending: false })
      .order("display_order"),
    loadMedia(sb),
  ]);

  return {
    profile: profile.data,
    brand: brand.data,
    appearance: appearance.data,
    seo: seo.data,
    nav: nav.data ?? [],
    socials: socials.data ?? [],
    businesses: businesses.data ?? [],
    categories: categories.data ?? [],
    concepts: concepts.data ?? [],
    designs: designs.data ?? [],
    projects: projects.data ?? [],
    logs: logs.data ?? [],
    media,
  };
});

export type SiteData = Awaited<ReturnType<typeof getSiteData>>;

export const getDesignScreenshots = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => input)
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: design } = await sb
      .from("website_designs")
      .select("id")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!design) return [];
    const { data: shots } = await sb
      .from("design_screenshots")
      .select("*")
      .eq("design_id", design.id)
      .order("display_order");
    return shots ?? [];
  });
