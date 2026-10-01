// Client side of /api/now-playing, shared by the "now" card and the terminal.

import { aged, type Track } from "../track";

export type { Track };

let last: { track: Track | null; at: number } | null = null;

// null when the API is down or not configured; callers keep the static fallback
export async function nowPlaying(maxAge = 10_000): Promise<Track | null> {
  if (last && Date.now() - last.at < maxAge) return aged(last.track, last.at);
  try {
    const res = await fetch("/api/now-playing");
    const track = res.ok ? ((await res.json()) as Track | null) : null;
    last = { track, at: Date.now() };
    return track;
  } catch {
    return null;
  }
}
