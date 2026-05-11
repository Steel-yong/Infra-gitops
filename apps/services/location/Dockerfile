FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared/ packages/shared/
COPY apps/services/location/ apps/services/location/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @pubg-helper/location exec prisma generate
RUN pnpm --filter @pubg-helper/location build

FROM node:20-alpine AS runner
WORKDIR /app
RUN corepack enable

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared/ packages/shared/
COPY apps/services/location/package.json apps/services/location/
COPY apps/services/location/prisma/ apps/services/location/prisma/

RUN pnpm install --frozen-lockfile --prod
RUN pnpm --filter @pubg-helper/location exec prisma generate
COPY --from=builder /app/apps/services/location/dist apps/services/location/dist

EXPOSE 3002
CMD ["node", "apps/services/location/dist/main.js"]
