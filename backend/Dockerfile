# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

COPY src ./src
COPY tsconfig.json ./

RUN npx prisma generate
RUN npm run build

# Production stage: Node + Cloud SQL Auth Proxy (TCP so Prisma connects on Cloud Run)
FROM node:20-alpine AS production

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat su-exec wget

# Cloud SQL Auth Proxy (connect via TCP to avoid Prisma socket :5432 bug)
ARG PROXY_VERSION=v2.8.0
RUN wget -q -O /cloud-sql-proxy "https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/${PROXY_VERSION}/cloud-sql-proxy.linux.amd64" \
  && chmod +x /cloud-sql-proxy

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

RUN npx prisma generate

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

COPY scripts/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

ENTRYPOINT ["/docker-entrypoint.sh"]
