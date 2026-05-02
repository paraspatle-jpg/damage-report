# syntax=docker/dockerfile:1.7

# ── base ────────────────────────────────────────────────────────────
FROM node:22-slim AS base
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
ENV NEXT_TELEMETRY_DISABLED=1

# ── build ───────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# ── runtime ─────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

# Static runtime config
ENV NODE_ENV=production
ENV PORT=6001
ENV HOSTNAME=0.0.0.0

# Runtime env vars — declared here so Coolify (or `docker run -e …`)
# can override them. Leave blank in the image; inject real values in Coolify.
ENV DATABASE_URL=""
ENV JWT_SECRET=""
ENV OPENAI_API_KEY=""
ENV OPENAI_MODEL="gpt-4o-mini"
ENV TELEGRAM_BOT_TOKEN=""
ENV TELEGRAM_ALLOWED_CHAT_ID=""
ENV SEED_USER_EMAIL=""
ENV SEED_USER_PASSWORD=""

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/package-lock.json ./package-lock.json
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --chown=nextjs:nodejs docker/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

USER nextjs
EXPOSE 6001
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["npm", "run", "start", "--", "-p", "6001"]
