FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM base AS builder
RUN npm ci
COPY . .
# Accept NEXT_PUBLIC_ vars as build args so they are baked into the bundle.
# No default for the API URL: an unset value silently falls back to the old
# Render host in src/lib/api/client.ts, so refuse to build without it.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_NAME=HomeGenny
# Demo build only: prints the seeded demo accounts on the public login page.
# An ARG that is not declared here is silently ignored, so the compose build
# arg alone does nothing — both lines are needed.
ARG NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
ENV NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS=$NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS
ENV NEXT_TELEMETRY_DISABLED=1
RUN test -n "$NEXT_PUBLIC_API_URL" || { echo "NEXT_PUBLIC_API_URL build arg is required"; exit 1; }
# The repo has no public/ yet; the production stage copies it.
RUN mkdir -p public && npm run build

# Dev stage: docker-compose mounts ./src over /app/src and runs `next dev`,
# so the build output here is throwaway — only node_modules and the config
# files outside src/ need to be present in the image.
FROM node:20-alpine AS development
WORKDIR /app
ENV NODE_ENV=development
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# server.js binds to $HOSTNAME, which docker sets to the container id.
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
