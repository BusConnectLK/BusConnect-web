import "server-only";
import type { Locale } from "./config";
import en from "@/dictionaries/en.json";

/** The English dictionary is the canonical shape every locale conforms to. */
export type Dictionary = typeof en;

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => Promise.resolve(en),
  si: () => import("@/dictionaries/si.json").then((m) => m.default as Dictionary),
  ta: () => import("@/dictionaries/ta.json").then((m) => m.default as Dictionary),
};

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  return (dictionaries[locale] ?? dictionaries.en)();
}
