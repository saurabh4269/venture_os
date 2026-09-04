FROM node:22-bookworm-slim
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages
RUN pnpm install --frozen-lockfile
ARG APP=api
ENV APP=${APP}
ENV NODE_ENV=production
EXPOSE 4000
# Production start. Compose overrides this with `pnpm … dev` for local watch.
CMD ["sh", "-c", "if [ \"$FLY_PROCESS_GROUP\" = \"worker\" ] || [ \"$APP\" = \"worker\" ]; then exec pnpm --filter @venture-os/worker start; else exec pnpm --filter @venture-os/api start; fi"]
