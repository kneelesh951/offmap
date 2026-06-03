# ─── Stage 1: Install dependencies ───────────────────────────────────────────
FROM node:18-alpine AS deps

# Install compatibility libs needed by some npm packages on Alpine Linux
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy only package files first — Docker caches this layer.
# If package.json doesn't change, this layer is reused (faster builds).
COPY package.json package-lock.json ./
RUN npm ci

# ─── Stage 2: Build the app ───────────────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

# Copy deps from previous stage
COPY --from=deps /app/node_modules ./node_modules

# Copy all source files
COPY . .

# Build-time env vars (public ones needed at build time)
# These are baked into the JS bundle — do NOT put secrets here
ARG NEXT_PUBLIC_MOCK_MODE=false
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

ENV NEXT_PUBLIC_MOCK_MODE=$NEXT_PUBLIC_MOCK_MODE
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

# Next.js telemetry — disable it in CI/Docker
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ─── Stage 3: Production runner (smallest possible image) ─────────────────────
FROM node:18-alpine AS runner

WORKDIR /app

# Security: run as non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy only what's needed to run (not source code or dev deps)
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Give the nextjs user ownership
RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# next start uses the standalone output
CMD ["node", "server.js"]
