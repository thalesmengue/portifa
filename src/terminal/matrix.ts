// cmatrix, but it rains cats. Used as the terminal's screensaver.

const CHARS = "meowMEOW=^.^~><ωlua01".split("");

export function startMatrix(root: HTMLElement, area: HTMLElement, onExit: () => void) {
  const canvas = document.createElement("canvas");
  canvas.className = "matrix";
  const css = getComputedStyle(root);
  const green = css.getPropertyValue("--t-green").trim() || "#8ae234";
  const bg = css.backgroundColor;

  const w = area.clientWidth;
  const h = area.clientHeight;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  Object.assign(canvas.style, { top: `${area.offsetTop}px`, height: `${h}px` });
  root.appendChild(canvas);

  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const size = 13;
  const cols = Math.floor(w / (size * 0.75));
  const drops = Array.from({ length: cols }, () => Math.floor(Math.random() * -40));
  ctx.font = `${size}px "JetBrains Mono Variable", monospace`;

  const timer = setInterval(() => {
    // fade the previous frame, leaving trails
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
    drops.forEach((y, i) => {
      const x = i * size * 0.75;
      if (y >= 0) {
        ctx.fillStyle = green;
        ctx.fillText(CHARS[Math.floor(Math.random() * CHARS.length)], x, (y - 1) * size);
        ctx.fillStyle = "#f2fff0";
        ctx.fillText(CHARS[Math.floor(Math.random() * CHARS.length)], x, y * size);
      }
      drops[i] = y * size > h && Math.random() > 0.97 ? Math.floor(Math.random() * -20) : y + 1;
    });
  }, 55);

  const startedAt = performance.now();
  const events = ["keydown", "pointerdown", "pointermove", "wheel", "touchstart"] as const;

  function stop(e?: Event) {
    // ignore the input that started it
    if (e && performance.now() - startedAt < 400) return;
    if (e instanceof KeyboardEvent) e.preventDefault();
    clearInterval(timer);
    canvas.remove();
    events.forEach((ev) => window.removeEventListener(ev, stop, true));
    onExit();
  }

  events.forEach((ev) => window.addEventListener(ev, stop, true));
  return stop;
}
