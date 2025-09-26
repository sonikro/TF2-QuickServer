# Stage 1: Build Stage
FROM node:22 AS build

WORKDIR /app

COPY package*.json ./

RUN apt-get update -y && apt-get install -y cmake
RUN npm install

COPY . .

# Build both the TypeScript backend and NextJS
RUN npm run build
RUN npm run build:web

# Stage 2: Runtime Stage
FROM node:22-slim AS runtime

WORKDIR /app

# Copy built files
COPY --from=build /app/dist .
COPY --from=build /app/.next ./.next
COPY --from=build /app/src/entrypoints/web/next.config.js ./src/entrypoints/web/
COPY --from=build /app/src/entrypoints/web/tsconfig.json ./src/entrypoints/web/
COPY --from=build /app/src/entrypoints/web/next-env.d.ts ./src/entrypoints/web/
COPY --from=build /app/package*.json ./

RUN npm install --only=production

# Install PM2 for process management
RUN npm install -g pm2

# Create logs directory for PM2
RUN mkdir -p /app/logs

# Copy PM2 ecosystem configuration
COPY ecosystem.config.js .

VOLUME /app/config
VOLUME /app/db

# Expose both ports
EXPOSE 3000 3001

# Use PM2 to run both services
ENTRYPOINT ["pm2-runtime", "start", "ecosystem.config.js"]
