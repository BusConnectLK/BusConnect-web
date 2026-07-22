import type { MetadataRoute } from "next";
import { locales, defaultLocale } from "@/lib/i18n/config";

/**
 * The homepage is the only public, stable marketing page — /search results,
 * /trips/:id, and dashboards are dynamic, ephemeral, or private. Each locale's
 * home is listed with `alternates.languages` so Google understands they're
 * translations of one page rather than duplicate content.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://busconnect.lk";
  const languages = Object.fromEntries(locales.map((l) => [l, `${base}/${l}`]));

  return locales.map((l) => ({
    url: `${base}/${l}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: l === defaultLocale ? 1 : 0.8,
    alternates: { languages },
  }));
}
