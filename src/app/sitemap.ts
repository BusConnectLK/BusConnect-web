import type { MetadataRoute } from "next";

/**
 * Only public, stable marketing pages belong here — /search results,
 * /trips/:id, and every authenticated dashboard route are either dynamic
 * (query-string dependent), ephemeral (a trip disappears once departed), or
 * private, so indexing them would just create duplicate-content / dead-link
 * noise for crawlers.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://busconnect.lk";
  return [
    {
      url: base,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${base}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];
}
