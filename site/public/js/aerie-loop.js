// The aerie loop (issue #94). It starts on the visitor's first scroll or on a press of its button,
// never under reduced motion, and the button pauses it at any time. A plain file in public/, because
// Astro inlines a script this small and the CSP (script-src 'self') blocks inline code.
(() => {
  const figure = document.querySelector("[data-loop]");
  if (!figure) return;
  const video = figure.querySelector("video");
  const button = figure.querySelector("button");
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  let held = false; // The visitor paused it; scrolling never restarts it.

  const label = () => { button.textContent = video.paused ? "Play the loop" : "Pause the loop"; };
  const play = () => { if (!still.matches && !held) video.play()?.catch(label); };
  const motion = () => {
    button.hidden = still.matches;
    if (still.matches) video.pause();
  };

  video.addEventListener("play", label);
  video.addEventListener("pause", label);
  addEventListener("scroll", play, { once: true, passive: true });
  button.addEventListener("click", () => {
    if (video.paused) { held = false; play(); } else { held = true; video.pause(); }
  });
  still.addEventListener("change", motion);
  motion();
})();
