// curl, wget, httpie and friends get a plain-text page instead of HTML.
// Middleware only runs for on-demand routes, which is why the home page has `prerender = false`.

import { defineMiddleware } from "astro:middleware";
import { curlPage } from "./curl";

const CLI = /^(curl|wget|httpie|xh)\//i;

export const onRequest = defineMiddleware(async (context, next) => {
  if (context.url.pathname !== "/") return next();

  const cli = CLI.test(context.request.headers.get("user-agent") ?? "");
  const res = cli
    ? new Response(await curlPage(), { headers: { "Content-Type": "text/plain; charset=utf-8" } })
    : await next();

  res.headers.set("Vary", "User-Agent");
  res.headers.set("Cache-Control", "public, max-age=300");
  return res;
});
