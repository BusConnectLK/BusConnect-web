// Picks and starts the one hero video matching the current theme + viewport.
// This runs as an inline script (not a "use client" React component) so the
// video request fires immediately during HTML parsing — before the JS
// bundle downloads and React hydrates. A client-component version added a
// ~3.4s delay before the video (which is the page's LCP element) even
// started loading, since it had to wait for a useEffect to run.
const heroVideoScript = `
(function () {
  var el = document.getElementById('hero-video');
  if (!el) return;

  function pickSrc() {
    var dark = document.documentElement.classList.contains('dark');
    var desktop = window.matchMedia('(min-width: 640px)').matches;
    if (dark) return desktop ? '/hero-dark.mp4' : '/hero-dark-mobile.mp4';
    return desktop ? '/hero-light.mp4' : '/hero-light-mobile.mp4';
  }

  var currentSrc = null;

  function render() {
    var next = pickSrc();
    if (next === currentSrc) return;
    currentSrc = next;

    // Replace the element with a fresh one that has src+autoplay+muted all
    // present from the moment it's created, rather than mutating the
    // existing element's src and calling .play() afterwards. Safari only
    // runs its lenient native-autoplay handling when autoplay+src start out
    // together; a later, script-driven play() call goes through a
    // stricter policy path and can be silently rejected, leaving the video
    // paused indefinitely. Replacing in place (same tag, same position)
    // rather than inserting into a wrapper keeps this hydration-safe —
    // React never sees an unexpected extra child node.
    var video = document.createElement('video');
    video.id = 'hero-video';
    video.className = el.className;
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    video.autoplay = true;
    video.setAttribute('disablepictureinpicture', '');
    video.setAttribute('disableremoteplayback', '');
    video.preload = 'auto';
    video.setAttribute('aria-hidden', 'true');
    video.src = next;
    el.replaceWith(video);
    el = video;
    video.play().catch(function () {});
  }

  render();

  var media = window.matchMedia('(min-width: 640px)');
  media.addEventListener('change', render);
  new MutationObserver(render).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });

  // Last-resort fallback for any engine that still won't autoplay even
  // with src present from creation — a user gesture always satisfies
  // autoplay policy.
  function onFirstGesture() {
    el.play().catch(function () {});
    document.removeEventListener('touchstart', onFirstGesture);
    document.removeEventListener('click', onFirstGesture);
  }
  document.addEventListener('touchstart', onFirstGesture, { once: true, passive: true });
  document.addEventListener('click', onFirstGesture, { once: true });
})();
`;

export function HeroVideo() {
  return (
    <>
      <video
        id="hero-video"
        className="hero-video pointer-events-none absolute inset-0 h-full w-full object-cover"
        muted
        loop
        playsInline
        controls={false}
        disablePictureInPicture
        disableRemotePlayback
        preload="none"
        aria-hidden="true"
        // The inline script below replaces this element with one that has
        // src/autoplay baked in — this placeholder is intentionally never
        // meant to match, so don't warn about it.
        suppressHydrationWarning
      />
      <script dangerouslySetInnerHTML={{ __html: heroVideoScript }} />
    </>
  );
}
