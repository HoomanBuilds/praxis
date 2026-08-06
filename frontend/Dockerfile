# PRAXIS frontend - multi-stage build
# Stage 1: Build React app with Vite
# Stage 2: Serve with nginx
#
# Build context is the repo root (see docker-compose.prod.yml: context: ., dockerfile:
# frontend/Dockerfile) - `npm run build` runs scripts/check-enum-coverage.mjs, which reads
# a sibling backend/ directory to keep the frontend's audit-action labels in sync with
# what the backend actually emits, so backend/ must be present relative to frontend/.

# Stage 1
FROM node:22-alpine AS build

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --no-audit --no-fund

COPY frontend/ .
COPY backend /app/backend

ARG VITE_ENABLE_SSO=false
ARG VITE_DEMO_EMAIL=admin@praxis.local
ARG VITE_DEMO_PASSWORD=admin123
ENV VITE_ENABLE_SSO=$VITE_ENABLE_SSO
ENV VITE_DEMO_EMAIL=$VITE_DEMO_EMAIL
ENV VITE_DEMO_PASSWORD=$VITE_DEMO_PASSWORD

RUN npm run build

# Stage 2
FROM nginx:1.29-alpine

# Copy built assets
COPY --from=build /app/frontend/dist /usr/share/nginx/html

# Copy nginx config for SPA serving (listens on unprivileged port 8080)
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Run as the image's built-in unprivileged user. Ports <1024 need root, so the SPA
# listens on 8080 instead of 80; the reverse-proxy container (nginx/nginx.conf) is
# updated to match. nginx also needs to write its pid file and cache dirs, which
# normally live under root-owned paths, so repoint and chown them for the nginx user.
RUN chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /etc/nginx/conf.d \
    && touch /var/run/nginx.pid \
    && chown nginx:nginx /var/run/nginx.pid
USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
