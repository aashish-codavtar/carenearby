# ─────────────────────────────────────────────────────────────────────────────
# CareNearby – Production Dockerfile
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine

# Create a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Install dependencies first (layer cache – only rebuilds on package.json change)
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy application source
COPY src/ ./src/

# Switch to non-root user
USER appuser

EXPOSE 3000

# Use exec form so signals (SIGTERM from Docker stop) propagate correctly
CMD ["node", "src/app.js"]
