"use client";

import { createContext, useContext } from "react";
import type { Locale } from "./config";
import type { Dictionary } from "./dictionaries";

interface I18nValue {
  locale: Locale;
  dict: Dictionary;
}

const I18nContext = createContext<I18nValue | null>(null);

/** Wraps the app once in the root layout; the server passes the resolved
 * dictionary + locale down so client components can read them synchronously. */
export function I18nProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dictionary;
  children: React.ReactNode;
}) {
  return <I18nContext.Provider value={{ locale, dict }}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within <I18nProvider>");
  return ctx;
}

/** Namespaced accessor: `const t = useT("nav"); t("signIn")`. Falls back to the
 * key itself if a string is missing so the UI degrades gracefully. */
export function useT<N extends keyof Dictionary>(namespace: N) {
  const { dict } = useI18n();
  return (key: keyof Dictionary[N]): string => {
    const section = dict[namespace] as Record<string, string>;
    return section?.[key as string] ?? String(key);
  };
}

export function useLocale(): Locale {
  return useI18n().locale;
}
