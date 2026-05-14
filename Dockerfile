# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — Builder
# Full toolchain: installs all deps, compiles native modules, runs the build.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

# Build tools required for native modules (bcrypt uses node-gyp)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Install ALL dependencies (devDeps needed for tsx, vite, esbuild build chain)
COPY package*.json ./
RUN npm ci

# Copy every source file the build needs
COPY . .

# Run the project's own build script (script/build.ts via tsx):
#   - Vite builds the React client → dist/public/
#   - esbuild bundles the server   → dist/index.cjs
#     (with a carefully managed allowlist; packages like bcrypt, postgres,
#      passport-google-oauth20, dotenv are left as external requires so they
#      resolve from node_modules at runtime)
RUN npm run build

# Strip devDependencies in-place; native binaries (.node files) are preserved
# because the same base image is used in the production stage
RUN npm prune --omit=dev

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — Production
# Lean runtime image — no build tools, only what the server needs to run.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-slim AS production

WORKDIR /app

# Pruned node_modules from the builder (includes compiled native modules)
COPY --from=builder /app/node_modules ./node_modules

# Compiled server bundle + bundled React client assets
COPY --from=builder /app/dist ./dist

# package.json is needed by some runtime module-resolution internals
COPY --from=builder /app/package.json ./

# Persistent directory for user-uploaded files (mount as a named volume)
RUN mkdir -p /app/uploads

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Lightweight health check using Node's built-in http module (no curl/wget needed)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "\
const http = require('http'); \
const req = http.get('http://localhost:3000/api/auth/me', r => { \
  process.exit(r.statusCode < 500 ? 0 : 1); \
}); \
req.on('error', () => process.exit(1)); \
req.setTimeout(8000, () => { req.destroy(); process.exit(1); });"

CMD ["node", "dist/index.cjs"]
