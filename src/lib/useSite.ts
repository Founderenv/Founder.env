import { useLoaderData } from "@tanstack/react-router";
import type { SiteData } from "./site.functions";

export function useSite(): SiteData {
  return useLoaderData({ from: "__root__" }) as SiteData;
}

export function mediaUrl(site: SiteData, id: string | null | undefined) {
  if (!id) return null;
  return site.media[id] ?? null;
}
