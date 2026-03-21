# Build stage - use Debian slim (glibc) to avoid Rollup optional-deps issues on Alpine (musl)
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-timeout 600000 && \
    npm ci

COPY . .
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL
# Increase Node memory for Vite/Rollup build (helps multi-platform builds)
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build

# Serve stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
# SPA routing: serve index.html for unknown paths
RUN echo 'server { \
  listen 80; \
  root /usr/share/nginx/html; \
  index index.html; \
  location / { try_files $uri $uri/ /index.html; } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
