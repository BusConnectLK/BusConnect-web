"use client";

import { usePathname } from "next/navigation";
import { locales, localeShort, type Locale } from "@/lib/i18n/config";
import { useLocale } from "@/lib/i18n/provider";
import { localizePath, stripLocale } from "@/lib/i18n/navigation";

/** Compact EN · සිං · த switcher. Switching sets a year-long NEXT_LOCALE cookie
 * and does a full reload to the same page in the chosen language (full reload
 * keeps the server-loaded dictionary perfectly in sync — no soft-nav staleness). */
export function LanguageSwitcher() {
  const active = useLocale();
  const pathname = usePathname();

  function switchTo(loc: Locale) {
    if (loc === active) return;
    // Event-handler side effects (not render-time), so the immutability rule is
    // a false positive here — persist the choice, then hard-reload to apply it.
    // eslint-disable-next-line react-hooks/immutability
    document.cookie = `NEXT_LOCALE=${loc}; path=/; max-age=31536000; samesite=lax`;
    window.location.assign(localizePath(loc, stripLocale(pathname)));
  }

  return (
    <span className="ui hidden items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium sm:inline-flex">
      {locales.map((loc, i) => (
        <span key={loc} className="inline-flex items-center gap-1.5">
          {i > 0 && <span className="text-muted-foreground/40">·</span>}
          <button
            type="button"
            onClick={() => switchTo(loc)}
            aria-current={loc === active ? "true" : undefined}
            className={
              loc === active
                ? "font-semibold text-brand dark:text-blue-400"
                : "text-muted-foreground transition-colors hover:text-foreground"
            }
          >
            {localeShort[loc]}
          </button>
        </span>
      ))}
    </span>
  );
}
