# syntax=docker/dockerfile:1.7

# ─── builder ─────────────────────────────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app

# Сначала только package.json'ы — слой install кешируется, пока они не меняются
COPY package.json package-lock.json ./
COPY apps/admin/package.json ./apps/admin/
COPY apps/bot/package.json ./apps/bot/
COPY packages/shared/package.json ./packages/shared/

# npm install (а не ci) — обходим баг npm с optional native bindings (#4828):
# lockfile, сгенерированный на Windows, не содержит linux-binding'и oxc-minify.
RUN npm install --include=dev

# Исходники
COPY . .

# Сборка admin'а — nitro создаёт standalone bundle в apps/admin/.output
RUN npm run build:admin

# ─── runner ──────────────────────────────────────────────────────────────────
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NUXT_HOST=0.0.0.0 \
    NUXT_PORT=3000

# .output от nitro — самодостаточен (bundled deps включены)
COPY --from=builder --chown=node:node /app/apps/admin/.output ./

# storage будет смонтирован поверх
RUN mkdir -p storage/uploads && chown -R node:node storage

USER node

EXPOSE 3000

CMD ["node", "server/index.mjs"]
