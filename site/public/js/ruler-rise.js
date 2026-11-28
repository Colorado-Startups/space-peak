// The home page's altitude ruler (issue #140) rises once, in 1.4 s, the first time it scrolls into view.
// Never under reduced motion. With no script, or when it starts on screen, it is simply drawn. It is hidden only
// after the observer's first answer shows it off screen, so an observer that never answers hides nothing.
// A plain file in public/, because the CSP (script-src 'self') blocks inline code.
(() => {
  const ruler = document.querySelector("[data-rise]");
  const target = ruler?.querySelector("svg");
  if (!target || !("IntersectionObserver" in window)) return;
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  if (still.matches) return;

  let first = true;
  const observer = new IntersectionObserver(([entry]) => {
    if (first) {
      first = false;
      if (entry.isIntersecting) observer.disconnect();
      else ruler.dataset.rise = "wait";
      return;
    }
    if (entry.intersectionRatio < 0.3) return;
    observer.disconnect();
    ruler.dataset.rise = still.matches ? "" : "go";
  }, { threshold: [0, 0.3] });

  observer.observe(target);
  still.addEventListener("change", () => {
    if (!still.matches) return;
    observer.disconnect();
    ruler.dataset.rise = "";
  });
})();
