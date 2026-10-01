import type { APIRoute } from "astro";
import { configured, nowPlaying } from "../../spotify";

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

export const GET: APIRoute = async () => {
  if (!configured()) return json(null, 503);
  try {
    return json(await nowPlaying());
  } catch (err) {
    console.error(err);
    return json(null, 502);
  }
};
