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

# serve
FROM nginx:1.29-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
