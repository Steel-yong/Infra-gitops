FROM node:20-alpine
# sharp 네이티브 바이너리 빌드용 의존성
RUN apk add --no-cache python3 make g++
RUN corepack enable && corepack prepare pnpm@10.33.3 --activate
WORKDIR /repo

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./

COPY packages/shared/package.json ./packages/shared/
COPY apps/services/alert/package.json ./apps/services/alert/
COPY apps/services/capture/package.json ./apps/services/capture/
COPY apps/services/location/package.json ./apps/services/location/
COPY apps/frontend/package.json ./apps/frontend/

RUN pnpm install --frozen-lockfile

COPY packages/shared/ ./packages/shared/
COPY apps/services/capture/ ./apps/services/capture/

WORKDIR /repo/apps/services/capture
EXPOSE 3001
CMD ["pnpm", "dev"]
