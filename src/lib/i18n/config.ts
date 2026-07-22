/** The three languages BusConnect ships in. `en` is the default (un-prefixed
 * fallback and the source dictionary every other locale falls back to). */
export const locales = ["en", "si", "ta"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeNames: Record<Locale, string> = {
  en: "English",
  si: "සිංහල",
  ta: "தமிழ்",
};

/** Short label for the compact header switcher. */
export const localeShort: Record<Locale, string> = {
  en: "EN",
  si: "සිං",
  ta: "த",
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
