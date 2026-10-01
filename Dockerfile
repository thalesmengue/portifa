# build
FROM oven/bun:1.4 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
ARG PUBLIC_UMAMI_SRC
ARG PUBLIC_UMAMI_ID
ENV PUBLIC_UMAMI_SRC=$PUBLIC_UMAMI_SRC PUBLIC_UMAMI_ID=$PUBLIC_UMAMI_ID
RUN bun run build

# runtime deps only
FROM oven/bun:1.4 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# serve: prerendered pages + the few on-demand routes (home, /coffee, /api/now-playing)
FROM oven/bun:1.4-slim
WORKDIR /app
ENV HOST=0.0.0.0 PORT=80 NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
USER bun
EXPOSE 80
CMD ["bun", "dist/server/entry.mjs"]
