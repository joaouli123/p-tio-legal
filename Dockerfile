FROM node:22-bookworm-slim AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY package*.json ./
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl wget \
    && rm -rf /var/lib/apt/lists/* \
    && npm ci --omit=dev \
    && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY --from=build /app/start-railway.mjs ./start-railway.mjs

EXPOSE 3000
CMD ["npm", "run", "start:railway"]
