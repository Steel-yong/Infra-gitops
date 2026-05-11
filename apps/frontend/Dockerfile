FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared/ packages/shared/
COPY apps/frontend/ apps/frontend/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @pubg-helper/frontend build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/frontend/.next/standalone ./
COPY --from=builder /app/apps/frontend/.next/static apps/frontend/.next/static
COPY --from=builder /app/apps/frontend/public apps/frontend/public

USER nextjs
EXPOSE 3000
ENV PORT=3000

CMD ["node", "apps/frontend/server.js"]
