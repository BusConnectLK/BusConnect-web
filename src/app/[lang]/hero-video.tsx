import { cookies } from "next/headers";

/**
 * Renders the hero background video matching the visitor's theme, resolved
 * server-side from a cookie (kept in sync by the layout's theme script and
 * the theme toggle) rather than picked client-side after the fact.
 *
 * This matters specifically for Safari/WebKit: it only runs its lenient
 * muted-autoplay handling for <video autoplay> elements present in the
 * originally parsed HTML. Any video created or mutated via JavaScript
 * (even one built and inserted before hydration) is treated as a
 * programmatic play() request instead, subject to a stricter policy that
 * silently leaves it paused — confirmed by a minimal static <video> tag
 * autoplaying fine in WebKit while every JS-driven version stayed paused.
 * A real, static `src` attribute is the only thing that reliably works.
 *
 * Breakpoint (mobile vs desktop) is still resolved with plain CSS
 * (`sm:hidden` / `hidden sm:block`) rather than a cookie, since that was
 * never the autoplay problem — both breakpoint variants of the resolved
 * theme end up in the DOM and get fetched, but at ~2MB each post
 * re-encode that's a fine trade for correctness across every browser.
 */
export async function HeroVideo() {
  const cookieStore = await cookies();
  const dark = cookieStore.get("theme")?.value === "dark";

  const mobileSrc = dark ? "/hero-dark-mobile.mp4" : "/hero-light-mobile.mp4";
  const desktopSrc = dark ? "/hero-dark.mp4" : "/hero-light.mp4";

  return (
    <>
      <video
        className="hero-video pointer-events-none absolute inset-0 block h-full w-full object-cover sm:hidden"
        src={mobileSrc}
        autoPlay
        muted
        loop
        playsInline
        controls={false}
        disablePictureInPicture
        disableRemotePlayback
        preload="auto"
        aria-hidden="true"
      />
      <video
        className="hero-video pointer-events-none absolute inset-0 hidden h-full w-full object-cover sm:block"
        src={desktopSrc}
        autoPlay
        muted
        loop
        playsInline
        controls={false}
        disablePictureInPicture
        disableRemotePlayback
        preload="auto"
        aria-hidden="true"
      />
    </>
  );
}
