"use client";

import { useEffect, useState } from "react";

const SOURCES = {
  lightMobile: "/hero-light-mobile.mp4",
  lightDesktop: "/hero-light.mp4",
  darkMobile: "/hero-dark-mobile.mp4",
  darkDesktop: "/hero-dark.mp4",
} as const;

function pickSrc(dark: boolean, desktop: boolean) {
  if (dark) return desktop ? SOURCES.darkDesktop : SOURCES.darkMobile;
  return desktop ? SOURCES.lightDesktop : SOURCES.lightMobile;
}

/**
 * Renders a single hero background video matching the current theme +
 * breakpoint. Using CSS (hidden/dark:block) to swap between four <video>
 * elements still makes the browser fetch all four sources regardless of
 * visibility, so this picks one src via JS instead.
 */
export function HeroVideo() {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 640px)");
    const update = () => {
      const dark = document.documentElement.classList.contains("dark");
      setSrc(pickSrc(dark, media.matches));
    };

    update();
    media.addEventListener("change", update);
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => {
      media.removeEventListener("change", update);
      observer.disconnect();
    };
  }, []);

  if (!src) return null;

  return (
    <video
      key={src}
      className="hero-video pointer-events-none absolute inset-0 h-full w-full object-cover"
      src={src}
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
  );
}
