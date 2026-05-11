FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared/ packages/shared/
COPY apps/services/alert/ apps/services/alert/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @pubg-helper/alert build

FROM node:20-alpine AS runner
WORKDIR /app
RUN corepack enable

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared/ packages/shared/
COPY apps/services/alert/package.json apps/services/alert/

RUN pnpm install --frozen-lockfile --prod
COPY --from=builder /app/apps/services/alert/dist apps/services/alert/dist

EXPOSE 3003
CMD ["node", "apps/services/alert/dist/main.js"]
