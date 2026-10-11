FROM node:22-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production \
    DB_PATH=/app/data/sniper.db

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src

RUN mkdir -p /app/data && chown node:node /app/data

VOLUME ["/app/data"]
USER node
# No ports: the bot only makes outgoing connections to Telegram and Vinted.
CMD ["node", "src/index.js"]
