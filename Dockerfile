FROM node:22-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production \
    DB_PATH=/app/data/sniper.db

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src
COPY public ./public
COPY scripts ./scripts

RUN mkdir -p /app/data && chown node:node /app/data

VOLUME ["/app/data"]
EXPOSE 3000
USER node
CMD ["node", "src/server.js"]
