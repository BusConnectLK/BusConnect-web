import type { Metadata } from "next";
import { Inter, Outfit, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { ConditionalFooter } from "@/components/conditional-footer";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: "swap" });
const ibmPlex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm",
  display: "swap",
});

const SITE_URL = "https://busconnect.lk";
const SITE_NAME = "BusConnect";
const TAGLINE = "Every Journey, Connected.";
const SITE_DESCRIPTION = `BusConnect – ${TAGLINE} Sri Lanka's Smartest Online Bus Booking Platform. Search Live Seat Availability, Compare Operators and Fares, Book Securely, and Receive Instant QR E tickets.`;
const BRAND_DESCRIPTION =
  "BusConnect is Sri Lanka's Smartest Online Bus Booking Platform, Making Travel Simple With Live Seat Availability, Operator and Fare Comparisons, Secure Online Booking, and Instant QR E tickets.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "BusConnect",
    "bus booking Sri Lanka",
    "online bus tickets Sri Lanka",
    "intercity bus seats",
    "bus seat reservation",
    "bus e ticket Sri Lanka",
  ],
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  icons: { icon: "/icon.png", shortcut: "/icon.png", apple: "/icon.png" },
  openGraph: {
    type: "website",
    locale: "en_LK",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `BusConnect — ${TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: [{ url: "/logo.png" }],
  },
  twitter: {
    card: "summary",
    title: `BusConnect — ${TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: ["/logo.png"],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      slogan: TAGLINE,
      description: BRAND_DESCRIPTION,
      logo: `${SITE_URL}/logo.png`,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "en-LK",
    },
    {
      "@type": "SiteNavigationElement",
      name: ["Search buses", "Popular routes", "My tickets"],
      url: [`${SITE_URL}/`, `${SITE_URL}/#routes`, `${SITE_URL}/tickets`],
    },
  ],
};

// Set theme class before paint to avoid a flash of the wrong theme.
const themeScript = `
try {
  var t = localStorage.getItem('theme');
  var d = t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (d) document.documentElement.classList.add('dark');
} catch (e) {}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${outfit.variable} ${ibmPlex.variable} h-full`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="flex min-h-full flex-col antialiased">
        <SiteHeader />
        <main className="flex flex-1 flex-col pb-16 lg:pb-0">{children}</main>
        <ConditionalFooter />
      </body>
    </html>
  );
}
