FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared/ packages/shared/
COPY apps/services/capture/ apps/services/capture/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @pubg-helper/capture build

FROM node:20-alpine AS runner
WORKDIR /app
RUN corepack enable

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared/ packages/shared/
COPY apps/services/capture/package.json apps/services/capture/

RUN pnpm install --frozen-lockfile --prod
COPY --from=builder /app/apps/services/capture/dist apps/services/capture/dist

EXPOSE 3001
CMD ["node", "apps/services/capture/dist/main.js"]
