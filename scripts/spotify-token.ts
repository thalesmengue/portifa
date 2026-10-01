// One-off: authorize the Spotify app with my account and print a refresh token.
//
//   SPOTIFY_CLIENT_ID=... SPOTIFY_CLIENT_SECRET=... bun scripts/spotify-token.ts
//
// The app's redirect URI (Spotify dashboard → Settings) must be exactly REDIRECT below.
// Spotify only accepts plain http for loopback IPs, so it's 127.0.0.1, not localhost.

const { SPOTIFY_CLIENT_ID: id, SPOTIFY_CLIENT_SECRET: secret } = process.env;
if (!id || !secret) {
  console.error("set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET first");
  process.exit(1);
}

const PORT = 8888;
const REDIRECT = `http://127.0.0.1:${PORT}/callback`;
const SCOPES = "user-read-currently-playing user-read-recently-played";
const state = crypto.randomUUID();

const authorize = new URL("https://accounts.spotify.com/authorize");
authorize.search = new URLSearchParams({
  client_id: id,
  response_type: "code",
  redirect_uri: REDIRECT,
  scope: SCOPES,
  state,
}).toString();

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname !== "/callback") return new Response("not found", { status: 404 });

    const code = url.searchParams.get("code");
    if (url.searchParams.get("state") !== state || !code) {
      return new Response(`authorization failed: ${url.searchParams.get("error") ?? "bad state"}`, { status: 400 });
    }

    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${id}:${secret}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: REDIRECT }),
    });
    const body = (await res.json()) as { refresh_token?: string; error_description?: string };

    if (!body.refresh_token) {
      console.error("token exchange failed:", body.error_description ?? res.status);
    } else {
      console.log(`\nSPOTIFY_REFRESH_TOKEN=${body.refresh_token}\n`);
      console.log("put it in Coolify as an environment variable, then you can close this.");
    }
    setTimeout(() => server.stop(), 100);
    return new Response(body.refresh_token ? "done, back to the terminal." : "failed, check the terminal.");
  },
});

console.log(`open this in your browser and log in:\n\n${authorize}\n`);
