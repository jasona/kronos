# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app

# Install runtime dependencies for native modules
RUN apk add --no-cache python3 make g++

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 kronos

# Copy built files
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./

# Create data directory
RUN mkdir -p /data && chown kronos:nodejs /data

# Set environment variables
ENV NODE_ENV=production
ENV DATABASE_URL=file:/data/kronos.db
ENV PORT=3000
ENV HOST=0.0.0.0

# Switch to non-root user
USER kronos

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start script
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx prisma/seed.ts && node build/index.js"]
