# Stage 1: Build Stage
FROM node:22 AS build

WORKDIR /app

COPY package*.json ./

RUN apt-get update -y && apt-get install -y cmake
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Runtime Stage
FROM node:22-slim AS runtime

WORKDIR /app

COPY --from=build /app/dist .
COPY --from=build /app/package*.json ./

RUN npm install --only=production

VOLUME /app/config
VOLUME /app/db

# Set the entrypoint
ENTRYPOINT ["node", "src/index.js"]
