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
COPY apps/frontend/ ./apps/frontend/

WORKDIR /repo/apps/frontend
EXPOSE 3000
# 0.0.0.0으로 바인딩해야 컨테이너 외부에서 접근 가능
CMD ["pnpm", "exec", "next", "dev", "--hostname", "0.0.0.0"]
