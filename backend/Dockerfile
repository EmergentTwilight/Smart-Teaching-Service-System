# ============================================
# Smart Teaching Service System - Backend
# Multi-stage Production Dockerfile
# ============================================

# ==================== Builder Stage ====================
# 用于编译 TypeScript 和构建应用
FROM node:24-alpine AS builder

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# 复制 package.json 文件（利用 Docker 缓存层）
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# 安装所有依赖（包括 devDependencies，用于编译）
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY tsconfig.json ./
COPY src ./src

# 生成 Prisma Client
RUN npx prisma generate

# 编译 TypeScript
RUN pnpm build

# 移除开发依赖，只保留生产依赖
RUN pnpm prune --prod

# ==================== Runtime Stage ====================
# 只包含运行时必要文件，最小化镜像体积
FROM node:24-alpine AS runtime

# 安装 pnpm（生产环境也需要）
RUN corepack enable && corepack prepare pnpm@latest --activate

# 安装 dumb-init 用于正确处理信号
RUN apk add --no-cache dumb-init

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# 从 builder 复制必要文件
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000

# 切换到非 root 用户
USER nodejs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# 使用 dumb-init 启动应用
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/app.js"]
