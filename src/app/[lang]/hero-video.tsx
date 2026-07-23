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

  // React doesn't reliably sync the muted IDL property from the JSX
  // attribute on every hydration path, and browsers check the live
  // property (not the HTML attribute) before permitting muted autoplay.
  el.muted = true;
  el.defaultMuted = true;

  function tryPlay() {
    el.play().catch(function () {});
  }

  function setSrc() {
    var next = pickSrc();
    if (el.getAttribute('src') === next) return;
    el.setAttribute('src', next);
    el.load();
    tryPlay();
  }

  setSrc();
  el.addEventListener('loadeddata', tryPlay);
  el.addEventListener('canplay', tryPlay);

  function onFirstGesture() {
    tryPlay();
    document.removeEventListener('touchstart', onFirstGesture);
    document.removeEventListener('click', onFirstGesture);
  }
  document.addEventListener('touchstart', onFirstGesture, { once: true, passive: true });
  document.addEventListener('click', onFirstGesture, { once: true });

  var media = window.matchMedia('(min-width: 640px)');
  media.addEventListener('change', setSrc);
  new MutationObserver(setSrc).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });
})();
`;

export function HeroVideo() {
  return (
    <>
      <video
        id="hero-video"
        className="hero-video pointer-events-none absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        controls={false}
        disablePictureInPicture
        disableRemotePlayback
        preload="metadata"
        aria-hidden="true"
      />
      <script dangerouslySetInnerHTML={{ __html: heroVideoScript }} />
    </>
  );
}
