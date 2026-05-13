FROM node:20-alpine
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
COPY apps/services/location/ ./apps/services/location/

WORKDIR /repo/apps/services/location

# prisma migrate deploy에 필요한 openssl 설치
RUN apk add --no-cache openssl

# Prisma 클라이언트 생성
RUN pnpm exec prisma generate

EXPOSE 3002
# 컨테이너 시작 시 마이그레이션 적용 후 서버 기동
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && pnpm exec ts-node --transpile-only -r tsconfig-paths/register src/main.ts"]
