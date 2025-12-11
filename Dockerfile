# Stage 1: Build Stage
FROM node:24 AS build

WORKDIR /app

COPY package*.json ./
COPY packages/core/package*.json ./packages/core/
COPY packages/entrypoints/package*.json ./packages/entrypoints/
COPY packages/providers/package*.json ./packages/providers/
COPY packages/telemetry/package*.json ./packages/telemetry/
COPY packages/scripts/package*.json ./packages/scripts/

RUN apt-get update -y && apt-get install -y cmake
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Runtime Stage
FROM node:24-slim AS runtime

WORKDIR /app

COPY package*.json ./
COPY packages/core/package*.json ./packages/core/
COPY packages/entrypoints/package*.json ./packages/entrypoints/
COPY packages/providers/package*.json ./packages/providers/
COPY packages/telemetry/package*.json ./packages/telemetry/
RUN npm install --only=production

COPY --from=build /app/dist .

VOLUME /app/config
VOLUME /app/db

# Set the entrypoint
ENTRYPOINT ["node", "src/index.js"]
