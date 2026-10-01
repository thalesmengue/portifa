// Shape of /api/now-playing, shared by the server (src/spotify.ts) and the browser.

export type Track = {
  playing: boolean;
  title: string;
  artist: string;
  url: string;
  art: string | null;
  progress: number; // ms, only meaningful while playing
  duration: number; // ms
  playedAt: string | null; // ISO date, only for the last played track
};

// a cached answer is a few seconds old; move the playhead forward so the bar stays honest
export const aged = (t: Track | null, at: number): Track | null =>
  t?.playing ? { ...t, progress: Math.min(t.progress + Date.now() - at, t.duration) } : t;

// 3:07
export const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

// 5m ago, 2h ago, 3d ago
export function ago(iso: string) {
  const m = Math.floor((Date.now() - Date.parse(iso)) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (m < 60 * 24) return `${Math.floor(m / 60)}h ago`;
  return `${Math.floor(m / (60 * 24))}d ago`;
}

// right side of the card's footer: where we are in the song, or when it played
export const when = (t: Track) =>
  t.playing ? `${clock(t.progress)} / ${clock(t.duration)}` : t.playedAt ? ago(t.playedAt) : "";
