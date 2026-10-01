// Server-only: what I'm listening to on Spotify, or the last thing I played.
// Credentials never leave the server; see scripts/spotify-token.ts to get the refresh token.

import { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN } from "astro:env/server";
import { aged, type Track } from "./track";

export type { Track };

type SpotifyTrack = {
  name: string;
  artists: { name: string }[];
  album: { images: { url: string; width: number }[] };
  external_urls: { spotify: string };
  duration_ms: number;
};

const API = "https://api.spotify.com/v1";
const TTL = 20_000; // be nice to the rate limit, the card polls every 30s

let token: { value: string; expires: number } | null = null;
let cached: { track: Track | null; at: number } | null = null;
let inflight: Promise<Track | null> | null = null;

export const configured = () => Boolean(SPOTIFY_CLIENT_ID && SPOTIFY_CLIENT_SECRET && SPOTIFY_REFRESH_TOKEN);

async function accessToken() {
  if (token && token.expires > Date.now()) return token.value;

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: SPOTIFY_REFRESH_TOKEN! }),
  });
  if (!res.ok) throw new Error(`spotify token: ${res.status}`);

  const { access_token, expires_in } = (await res.json()) as { access_token: string; expires_in: number };
  token = { value: access_token, expires: Date.now() + (expires_in - 60) * 1000 };
  return access_token;
}

async function get<T>(path: string): Promise<T | null> {
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${await accessToken()}` } });
  if (res.status === 204) return null; // nothing playing
  if (!res.ok) throw new Error(`spotify ${path}: ${res.status}`);
  return (await res.json()) as T;
}

function toTrack(t: SpotifyTrack, playing: boolean, progress = 0): Track {
  // smallest cover that still looks sharp in the 72px box
  const art = [...t.album.images].sort((a, b) => a.width - b.width).find((i) => i.width >= 144) ?? t.album.images[0];
  return {
    playing,
    title: t.name,
    artist: t.artists.map((a) => a.name).join(", "),
    url: t.external_urls.spotify,
    art: art?.url ?? null,
    progress,
    duration: t.duration_ms,
  };
}

async function load(): Promise<Track | null> {
  const now = await get<{ is_playing: boolean; progress_ms: number; item: SpotifyTrack | null; currently_playing_type: string }>(
    "/me/player/currently-playing",
  );
  if (now?.item && now.currently_playing_type === "track") return toTrack(now.item, now.is_playing, now.progress_ms);

  const recent = await get<{ items: { track: SpotifyTrack }[] }>("/me/player/recently-played?limit=1");
  const last = recent?.items[0]?.track;
  return last ? toTrack(last, false) : null;
}

export async function nowPlaying(): Promise<Track | null> {
  if (cached && Date.now() - cached.at < TTL) return aged(cached.track, cached.at);

  inflight ??= load()
    .then((track) => {
      cached = { track, at: Date.now() };
      return track;
    })
    .catch((err) => {
      // keep showing the last good answer and back off for one TTL
      if (!cached) throw err;
      console.error(err);
      cached.at = Date.now();
      return cached.track;
    })
    .finally(() => (inflight = null));
  return inflight;
}
