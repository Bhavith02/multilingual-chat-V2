# ── Stage 1: Install all dependencies (needed for the build) ─────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ── Stage 2: Build the Next.js app ───────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ── Stage 3: Production image ─────────────────────────────────────────────────
# Only carries what's needed to run — no build tools, no dev dependencies.
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install production dependencies only (drops typescript, @types/*, tailwindcss etc.)
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev

# Copy compiled Next.js output
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Copy TypeScript source that tsx compiles at runtime (server.ts + lib/ + types/)
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/types ./types
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/tsconfig.json ./

EXPOSE 3000

CMD ["npm", "start"]
