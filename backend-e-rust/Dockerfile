FROM rust:latest

WORKDIR /app

# 预热依赖缓存（首次可忽略）
COPY Cargo.toml Cargo.lock* ./
RUN mkdir -p src && echo "fn main() { println!(\"bootstrap\"); }" > src/main.rs
RUN cargo build || true

# 复制真实代码并运行
COPY . .
EXPOSE 3001
CMD ["cargo", "run"]
