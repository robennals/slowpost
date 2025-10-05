# syntax=docker/dockerfile:1.4

FROM node:20-bullseye-slim AS base
WORKDIR /app

FROM base AS deps
COPY package.json yarn.lock ./
COPY packages/server/package.json ./packages/server/package.json
RUN yarn install --frozen-lockfile

FROM deps AS builder
COPY . .
RUN yarn workspace @slowpost/server build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/yarn.lock ./yarn.lock
COPY --from=builder /app/packages/server/dist ./packages/server/dist
COPY --from=builder /app/packages/server/package.json ./packages/server/package.json
COPY --from=deps /app/node_modules ./node_modules

EXPOSE 3001

CMD ["node", "packages/server/dist/devServer.js"]
