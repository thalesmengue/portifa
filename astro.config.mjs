// @ts-check
import { defineConfig, envField } from "astro/config";
import node from "@astrojs/node";

export default defineConfig({
  site: "https://thaleslab.xyz",
  // pages stay prerendered; only routes with `prerender = false` run on the server
  adapter: node({ mode: "standalone" }),
  env: {
    schema: {
      SPOTIFY_CLIENT_ID: envField.string({ context: "server", access: "secret", optional: true }),
      SPOTIFY_CLIENT_SECRET: envField.string({ context: "server", access: "secret", optional: true }),
      SPOTIFY_REFRESH_TOKEN: envField.string({ context: "server", access: "secret", optional: true }),
    },
  },
});
