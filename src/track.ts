// Shape of /api/now-playing, shared by the server (src/spotify.ts) and the browser.

export type Track = {
  playing: boolean;
  title: string;
  artist: string;
  url: string;
  art: string | null;
  progress: number; // ms, only meaningful while playing
  duration: number; // ms
};

// a cached answer is a few seconds old; move the playhead forward so the bar stays honest
export const aged = (t: Track | null, at: number): Track | null =>
  t?.playing ? { ...t, progress: Math.min(t.progress + Date.now() - at, t.duration) } : t;
