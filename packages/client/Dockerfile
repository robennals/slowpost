# syntax=docker/dockerfile:1.4

FROM node:20-bullseye-slim AS base
WORKDIR /app

FROM base AS deps
COPY package.json yarn.lock ./
COPY packages/client/package.json ./packages/client/package.json
COPY packages/server/package.json ./packages/server/package.json
RUN yarn install --frozen-lockfile

FROM deps AS builder
COPY . .
RUN yarn workspace @slowpost/client build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/yarn.lock ./yarn.lock
COPY --from=builder /app/packages ./packages
COPY --from=deps /app/node_modules ./node_modules

EXPOSE 3000

CMD ["yarn", "workspace", "@slowpost/client", "start"]
