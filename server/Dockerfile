FROM node:22-alpine

WORKDIR /app/server

COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

COPY server/src/ ./src/
COPY shared/ /app/shared/

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

CMD ["node", "src/index.js"]
