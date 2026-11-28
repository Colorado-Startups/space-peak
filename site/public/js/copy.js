// Copy buttons (issue #131): the one script behind every snippet on the home page and /ai/.
// A plain file in public/, because the CSP (script-src 'self') blocks inline code. Each button ships with
// data-pending, which keeps its place but hides it, so showing it moves nothing. Without this script,
// or without a clipboard, the snippet is selectable text: one click selects it all (user-select: all).
(() => {
  let status = document.querySelector("[data-copy-status]");
  if (!status) {
    status = document.createElement("p");
    status.className = "visually-hidden"; // base.css, which every page loads
    status.setAttribute("role", "status");
    status.setAttribute("data-copy-status", "");
    (document.querySelector("main") ?? document.body).append(status);
  }
  const say = (button, text) => {
    button.textContent = status.textContent = text;
    clearTimeout(button.copyTimer);
    button.copyTimer = setTimeout(() => { button.textContent = "Copy"; status.textContent = ""; }, 2000);
  };
  for (const button of document.querySelectorAll("button[data-copy][data-pending]")) {
    const code = document.getElementById(button.dataset.copy);
    if (!code) continue;
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(code.textContent);
        say(button, "Copied");
      } catch {
        getSelection()?.selectAllChildren(code);
        say(button, "Selected");
      }
    });
    button.removeAttribute("data-pending");
  }
})();
