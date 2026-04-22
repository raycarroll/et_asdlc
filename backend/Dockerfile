# Backend Dockerfile for OpenShift deployment

# Build stage
FROM node:18-alpine AS builder

# Set working directory to match monorepo structure
WORKDIR /app/backend

# Copy package files
COPY backend/package*.json ./
COPY backend/tsconfig.json ./

# Install dependencies
RUN npm install --only=production && \
    npm install -D typescript @types/node @types/pg

# Copy shared types (monorepo dependency)
COPY shared/package.json ../shared/
RUN cd ../shared && npm install --only=production

COPY shared ../shared

# Copy source code
COPY backend/src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM node:18-alpine

# Create app user (OpenShift uses random UIDs, so we need to be flexible)
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

WORKDIR /app

# Copy package files and install production dependencies only
COPY backend/package*.json ./
RUN npm install --only=production && \
    npm cache clean --force

# Copy built application from builder
COPY --from=builder /app/backend/dist ./dist

# Create data directories with proper permissions
RUN mkdir -p /app/data/ideas-repo /app/data/templates-repo && \
    chown -R 1001:1001 /app && \
    chmod -R g=u /app

# OpenShift runs containers with arbitrary UIDs, so ensure group permissions
RUN chmod -R g=u /app /etc/passwd

# Switch to non-root user
USER 1001

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start application (path adjusted for rootDir: ".." in tsconfig)
CMD ["node", "dist/backend/src/index.js"]
