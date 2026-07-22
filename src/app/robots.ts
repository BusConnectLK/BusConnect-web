import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/operator", "/profile", "/tickets", "/bookings", "/auth"],
      },
    ],
    sitemap: "https://busconnect.lk/sitemap.xml",
    host: "https://busconnect.lk",
  };
}
