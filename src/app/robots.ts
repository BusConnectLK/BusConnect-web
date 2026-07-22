import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Private/auth areas — the passenger ones now live under a locale
        // prefix (/en/tickets, /si/profile…), so wildcard the locale segment.
        disallow: [
          "/admin",
          "/operator",
          "/auth",
          "/*/profile",
          "/*/tickets",
          "/*/bookings",
        ],
      },
    ],
    sitemap: "https://busconnect.lk/sitemap.xml",
    host: "https://busconnect.lk",
  };
}
