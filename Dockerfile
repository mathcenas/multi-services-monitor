FROM node:20-alpine AS builder

WORKDIR /app

# Install Python and build tools for native modules
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN npm run build:server

FROM node:20-alpine

WORKDIR /app

# Install Python and build tools for better-sqlite3
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/data/monitoring.db

EXPOSE 3001

VOLUME ["/data"]

CMD ["node", "dist/server/index.js"]
