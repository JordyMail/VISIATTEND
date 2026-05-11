# Multi-stage build untuk Node.js API
# Stage 1: Builder
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json .npmrc ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy semua source code
COPY . .

# Build TypeScript (client + server)
RUN npm run build:server

# Stage 2: Runtime
FROM node:20-slim

WORKDIR /app

# Install curl untuk healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json package-lock.json .npmrc ./

# Install hanya production dependencies
RUN npm ci --omit=dev --legacy-peer-deps

# Copy hasil build dari stage builder
COPY --from=builder /app/dist ./dist

# Set environment
ENV NODE_ENV=production

EXPOSE 8080

CMD ["node", "dist/server/node-build.mjs"]
