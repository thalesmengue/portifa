// @ts-check
import { defineConfig, envField } from "astro/config";
import node from "@astrojs/node";

export default defineConfig({
  site: "https://thaleslab.xyz",
  // pages stay prerendered; only routes with `prerender = false` run on the server
  adapter: node({ mode: "standalone" }),
  integrations: [
    {
      // pages for checking things by eye while developing; never part of the build
      name: "dev-pages",
      hooks: {
        "astro:config:setup": ({ command, injectRoute }) => {
          if (command !== "dev") return;
          injectRoute({ pattern: "/dev/achievements", entrypoint: "./src/dev/achievements.astro" });
        },
      },
    },
  ],
  env: {
    schema: {
      SPOTIFY_CLIENT_ID: envField.string({ context: "server", access: "secret", optional: true }),
      SPOTIFY_CLIENT_SECRET: envField.string({ context: "server", access: "secret", optional: true }),
      SPOTIFY_REFRESH_TOKEN: envField.string({ context: "server", access: "secret", optional: true }),
    },
  },
});
