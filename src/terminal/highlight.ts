// zsh-syntax-highlighting, the short version: the command word is green when it exists and
// red when it doesn't (checked again after every pipe), quoted strings are yellow.

import { esc, span } from "./html";

export function highlight(line: string, known: (name: string) => boolean) {
  let html = "";
  let expectCommand = true;
  let i = 0;

  while (i < line.length) {
    const ch = line[i];
    if (/\s/.test(ch)) {
      html += ch;
      i++;
      continue;
    }
    if (ch === "|") {
      html += ch;
      expectCommand = true;
      i++;
      continue;
    }

    // one word, quotes included; an unclosed quote runs to the end of the line
    let word = "";
    let plain = "";
    let quote: string | null = null;
    let part = "";
    const parts: string[] = [];
    const flush = (quoted: boolean) => {
      if (part) parts.push(quoted ? span("hl-str", esc(part)) : esc(part));
      part = "";
    };
    for (; i < line.length; i++) {
      const c = line[i];
      if (quote) {
        part += c;
        if (c === quote) {
          flush(true);
          quote = null;
        } else plain += c;
      } else if (c === '"' || c === "'") {
        flush(false);
        quote = c;
        part = c;
      } else if (/\s/.test(c) || c === "|") break;
      else {
        part += c;
        plain += c;
      }
      word += c;
    }
    flush(quote !== null);

    if (expectCommand) {
      html += span(known(plain) ? "hl-cmd" : "hl-bad", esc(word));
      expectCommand = false;
    } else html += parts.join("");
  }

  return html;
}
