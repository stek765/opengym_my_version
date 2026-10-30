FROM node:25-alpine
WORKDIR /app

# ── AI Coach runtimes ─────────────────────────────────────────────────────────
# Claude's Agent SDK ships with its matching native runtime; libgcc/libstdc++ support it on Alpine.
RUN apk add --no-cache libgcc libstdc++

# Coach jobs run as this user, which is not root and cannot read /data (chmod 0700 at boot).
# The Agent SDK runtime therefore sees its job's temp directory and nothing else — no state files, no
# db.json, no session secret, no provider credential.
RUN addgroup -S coach && adduser -S -G coach -H -s /sbin/nologin coach

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --include=optional \
 && npm cache clean --force \
 && node -e "import('@anthropic-ai/claude-agent-sdk').then(() => console.log('Claude Agent SDK ready'))"
COPY server.js ./
COPY coach/ ./coach/
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]
