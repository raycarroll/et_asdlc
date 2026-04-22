# Frontend Dockerfile for OpenShift deployment

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app/frontend

# Copy package files
COPY frontend/frontend/package.json ./

# Install dependencies
RUN npm install

# Copy shared types if needed
# (Next.js doesn't need shared at build time currently)

# Copy source code
COPY frontend/frontend/src ./src
COPY frontend/frontend/public ./public
COPY frontend/frontend/next.config.* ./
COPY frontend/frontend/tsconfig.json ./
COPY frontend/frontend/postcss.config.* ./
COPY frontend/frontend/eslint.config.* ./

# Build Next.js application
# Set production environment variables for build
ARG NEXT_PUBLIC_API_URL
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN npm run build

# Production stage
FROM node:20-alpine

# Create app user
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

WORKDIR /app

# Copy package files and install production dependencies only
COPY frontend/frontend/package.json ./
RUN npm install --only=production && \
    npm cache clean --force

# Copy built application from builder
COPY --from=builder /app/frontend/.next ./.next
COPY --from=builder /app/frontend/public ./public
COPY --from=builder /app/frontend/next.config.* ./

# Set proper permissions for OpenShift
RUN chown -R 1001:1001 /app && \
    chmod -R g=u /app

# OpenShift compatibility - ensure group permissions
RUN chmod -R g=u /app /etc/passwd

# Switch to non-root user
USER 1001

# Expose port
EXPOSE 3000

# Environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start Next.js
CMD ["npm", "start"]
