// ↑ ↑ ↓ ↓ ← → ← → B A, anywhere on the page. Listeners react to the "konami" event.

const CODE = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];

let progress = 0;

window.addEventListener(
  "keydown",
  (e) => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    progress = key === CODE[progress] ? progress + 1 : key === CODE[0] ? 1 : 0;
    if (progress === CODE.length) {
      progress = 0;
      document.dispatchEvent(new CustomEvent("konami"));
    }
  },
  true,
);
