FROM node:20-alpine
RUN corepack enable && corepack prepare pnpm@10.33.3 --activate
WORKDIR /repo

# 워크스페이스 매니페스트
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./

# pnpm 워크스페이스 분석용 package.json 전체 복사
COPY packages/shared/package.json ./packages/shared/
COPY apps/services/alert/package.json ./apps/services/alert/
COPY apps/services/capture/package.json ./apps/services/capture/
COPY apps/services/location/package.json ./apps/services/location/
COPY apps/frontend/package.json ./apps/frontend/

RUN pnpm install --frozen-lockfile

# 소스 복사
COPY packages/shared/ ./packages/shared/
COPY apps/services/alert/ ./apps/services/alert/

WORKDIR /repo/apps/services/alert
EXPOSE 3003
CMD ["pnpm", "exec", "ts-node", "--transpile-only", "-r", "tsconfig-paths/register", "src/main.ts"]
