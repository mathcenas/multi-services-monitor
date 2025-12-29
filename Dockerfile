FROM node:20-alpine AS builder

WORKDIR /app

# Install Python and build tools for native modules
RUN apk add --no-cache python3 make g++

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy all source files
COPY . .

# Verify required directories exist
RUN test -d src || (echo "ERROR: src directory is missing! Make sure all files are copied to the server." && exit 1)
RUN test -d server || (echo "ERROR: server directory is missing! Make sure all files are copied to the server." && exit 1)
RUN test -f src/main.tsx || (echo "ERROR: src/main.tsx is missing! Make sure all files are copied to the server." && exit 1)

# Build the application
RUN npm run build
RUN npm run build:server

FROM node:20-alpine

WORKDIR /app

# Install Python and build tools for better-sqlite3, plus monitoring tools
RUN apk add --no-cache python3 make g++ bash curl jq docker openssh-client

# Copy package files from builder stage
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY monitor-agent.sh ./dist/server/monitor-agent.sh
RUN chmod +x ./dist/server/monitor-agent.sh

ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/data/monitoring.db

EXPOSE 3001

VOLUME ["/data"]

CMD ["node", "dist/server/index.js"]
