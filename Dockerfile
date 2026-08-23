FROM node:24-bookworm-slim

# procps는 dev의 `nest start --watch`가 파일 변경마다 재시작할 때 필요하다.
# 없으면 tree-kill이 이전 프로세스를 못 찾아 죽이지 못하고, 그 프로세스가 포트를 계속 물고 있어 EADDRINUSE가 난다.
RUN apt-get update && apt-get install -y --no-install-recommends openssl procps && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@11.1.1 --activate

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile

COPY . .
RUN touch apps/api/.env
