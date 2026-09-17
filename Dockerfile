# Stage 1: build the React/Vite frontend bundle.
FROM node:24-bookworm AS frontend-build

WORKDIR /app

COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/

# Install only the frontend workspace (plus root devDeps it depends on).
# Vite, @vitejs/plugin-react and TypeScript are devDependencies, so we
# cannot pass --omit=dev here.
RUN npm ci --workspace=frontend --include-workspace-root \
    && npm cache clean --force

COPY frontend ./frontend

# The About says which commit it was built from, and the build reads that off
# the checkout rather than from a build argument. `.dockerignore` lets only
# HEAD, refs and packed-refs through, so this is a few kilobytes.
COPY .git ./.git

# Vite is configured to emit at ../backend/public → /app/backend/public.
# Bump the heap because tsc + molstar/monaco/blueprint comfortably exceed
# the default ~1.7 GB during the type-check pass.
ENV NODE_OPTIONS=--max-old-space-size=4096
RUN npm run build -w frontend

# Stage 2: backend service image (runs the API + cron + cron-ccd) with
# the built frontend baked in at /app/backend/public.
FROM node:24-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
        pymol \
        graphicsmagick \
        rsync \
        gosu \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Workspace metadata first so the install layer is cached.
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN npm ci --omit=dev --workspace=backend && npm cache clean --force

COPY backend ./backend
COPY --from=frontend-build /app/backend/public ./backend/public
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

RUN useradd --system --create-home --uid 10001 app \
    && mkdir -p /app/data \
    && chown -R app:app /app

# No USER directive: the entrypoint runs as root to fix bind-mount
# permissions, then drops privileges to `app` via gosu.
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "run", "cron"]
