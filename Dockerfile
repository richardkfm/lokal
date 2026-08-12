# syntax=docker/dockerfile:1

# lokal is meant to be self-hosted on a small VM, so this image favours a
# small, predictable runtime over build speed. Three stages:
#   deps    - install dependencies once, cached across builds
#   builder - compile the Next.js app (output: "standalone")
#   runner  - minimal runtime image; also reused (via --target builder) by
#             docker-compose to run `prisma migrate deploy` as a one-off step,
#             so the runtime image itself never needs the Prisma CLI.
#
# better-sqlite3 needs a native addon, hence python3/make/g++ in the deps
# stage as a fallback if no prebuilt binary matches the image's platform.

FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable

# Created here (not just in the runner stage) so that whichever container
# mounts the shared `data` volume first — the one-off migrate step or the
# app itself — initializes it with consistent, non-root ownership. Both
# compose services pin `user: node` to match.
RUN mkdir -p /data && chown node:node /data

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma
COPY prisma.config.ts ./

# Only used to satisfy `prisma generate` during install; the app never
# connects to this file. The real DATABASE_URL is supplied at container
# runtime (see docker-compose.yml / README).
ENV DATABASE_URL="file:/tmp/build.db"
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm install --frozen-lockfile

FROM deps AS builder
WORKDIR /app
COPY . .
ENV DATABASE_URL="file:/tmp/build.db"
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# /data is where the SQLite file lives by default (see docker-compose.yml).
RUN mkdir -p /data && chown node:node /data

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node
EXPOSE 3000
CMD ["node", "server.js"]
