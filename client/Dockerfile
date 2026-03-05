# Build stage
FROM node:22-alpine AS build

WORKDIR /app/client

COPY client/package.json client/package-lock.json ./
RUN npm ci

COPY client/ ./
COPY shared/ /app/shared/

RUN npm run build

# Serve stage
FROM nginx:alpine

COPY --from=build /app/client/dist /usr/share/nginx/html
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
