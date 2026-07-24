import type { useRouter } from "next/navigation";

/**
 * `next` is usually a relative path, but can be an absolute URL back to a
 * different busconnect.lk subdomain — /login only exists on the main
 * domain, so the middleware sends visitors here from partner./admin. with
 * an absolute return URL. Only ever follow a same-site absolute target;
 * anything else falls back to "/" so this can never become an open
 * redirect to an attacker-controlled site.
 */
export function goTo(router: ReturnType<typeof useRouter>, next: string) {
  if (next.startsWith("/")) {
    router.push(next);
    router.refresh();
    return;
  }
  try {
    const url = new URL(next);
    if (url.hostname === "busconnect.lk" || url.hostname.endsWith(".busconnect.lk")) {
      window.location.href = url.toString();
      return;
    }
  } catch {
    /* not a valid absolute URL either — fall through to the safe default */
  }
  router.push("/");
  router.refresh();
}
