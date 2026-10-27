# syntax=docker/dockerfile:1

# Stage 1: Build & Dependencies
FROM node:20-slim AS builder

WORKDIR /app

# Install system compilation packages for native bindings (better-sqlite3)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Stage 2: Production Runtime (Lean, Non-Root)
FROM node:20-slim AS runner

WORKDIR /app

# Install curl for HEALTHCHECK and ca-certificates
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create data directory for SQLite storage and set proper non-root permissions
RUN mkdir -p /app/data && chown -R node:node /app

# Copy production node_modules from builder
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node . .

# Switch to standard non-root user
USER node

# Environment Defaults
ENV NODE_ENV=production \
    PORT=4000 \
    HOST=0.0.0.0

EXPOSE 4000

# Container Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:4000/api/health || exit 1

CMD ["node", "server.js"]
