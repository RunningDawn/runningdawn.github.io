# Local dev image: runs the Vite dev server with HMR. Not a production build - prod is a
# static bundle deployed to GitHub Pages. Source is bind-mounted at runtime (see
# docker-compose.yml); the COPY below seeds a self-contained image that also works unmounted.
FROM node:24-slim

WORKDIR /app

# Install deps first so the layer caches until the lockfile changes. npm ci builds the
# correct LINUX native binaries (rollup/esbuild) inside the container - never reuse the
# host's node_modules (a bind mount would break these), hence the anonymous-volume shadow
# in compose and node_modules in .dockerignore.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 5174

# --host 0.0.0.0 so the port is reachable from the host through the published mapping.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5174"]
