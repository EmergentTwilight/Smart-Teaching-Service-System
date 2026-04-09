mod middleware;

use middleware::{
    decode_jwt_token, ensure_roles, ErrorTransformMiddleware, JwtPayload, RequestLoggerMiddleware,
};
use poem::{
    http::StatusCode, listener::TcpListener, middleware::Cors, web::Data, EndpointExt, Request,
    Route, Server,
};
use poem_openapi::{auth::Bearer, payload::Json, Object, OpenApi, OpenApiService, SecurityScheme};
use std::env;

// --- 模型定义 (使用 poem_openapi::Object 代替单纯的 Serialize) ---
// Object 宏会自动生成 OpenAPI 的 Schema 定义

#[derive(Object)]
struct HealthData {
    service: String,
    status: String,
}

#[derive(Object)]
struct HealthResponse {
    code: u16,
    message: String,
    data: HealthData,
}

#[derive(Object)]
struct EnvData {
    database_url: String,
    redis_url: String,
}

#[derive(Object)]
struct EnvResponse {
    code: u16,
    message: String,
    data: EnvData,
}

#[derive(Object)]
struct OnlineTestingPingData {
    module: String,
    from: String,
    status: String,
}

#[derive(Object)]
struct OnlineTestingPingResponse {
    code: u16,
    message: String,
    data: OnlineTestingPingData,
}

// --- 状态定义 ---
#[derive(Clone)]
struct AppState {
    service: String,
    database_url: String,
    redis_url: String,
    jwt_secret: String,
}

// --- API 实现 ---
struct Api;

#[derive(SecurityScheme)]
#[oai(rename = "BearerAuth", ty = "bearer", checker = "check_bearer")]
struct BearerAuth(JwtPayload);

async fn check_bearer(req: &Request, bearer: Bearer) -> poem::Result<JwtPayload> {
    let state = req.data::<AppState>().ok_or_else(|| {
        poem::Error::from_string("应用状态缺失", StatusCode::INTERNAL_SERVER_ERROR)
    })?;

    decode_jwt_token(&bearer.token, &state.jwt_secret)
        .map_err(|_| poem::Error::from_string("无效或过期的令牌", StatusCode::UNAUTHORIZED))
}

#[OpenApi(prefix_path = "/api/v1")]
impl Api {
    /// 健康检查
    #[oai(path = "/health", method = "get")]
    async fn health(&self, state: poem::web::Data<&AppState>) -> Json<HealthResponse> {
        Json(HealthResponse {
            code: 200,
            message: "success".to_string(),
            data: HealthData {
                service: state.service.clone(),
                status: "ok".to_string(),
            },
        })
    }

    /// 显示环境变量（仅 super_admin/admin）
    #[oai(path = "/env", method = "get")]
    async fn show_env(
        &self,
        state: Data<&AppState>,
        auth: BearerAuth,
    ) -> poem::Result<Json<EnvResponse>> {
        ensure_roles(&auth.0, &["super_admin", "admin"])?;

        Ok(Json(EnvResponse {
            code: 200,
            message: "success".to_string(),
            data: EnvData {
                database_url: state.database_url.clone(),
                redis_url: state.redis_url.clone(),
            },
        }))
    }

    /// 在线测试 Ping
    #[oai(path = "/online-testing/ping", method = "get")]
    async fn online_testing_ping(&self) -> Json<OnlineTestingPingResponse> {
        Json(OnlineTestingPingResponse {
            code: 200,
            message: "online testing ping ok".to_string(),
            data: OnlineTestingPingData {
                module: "online-testing".to_string(),
                from: "rust-e-server".to_string(),
                status: "ok".to_string(),
            },
        })
    }
}

#[tokio::main]
async fn main() -> Result<(), std::io::Error> {
    tracing_subscriber::fmt()
        .with_env_filter(env::var("RUST_LOG").unwrap_or_else(|_| "info".to_string()))
        .init();

    let state = AppState {
        service: "stss-e-server".to_string(),
        database_url: env::var("DATABASE_URL").unwrap_or_default(),
        redis_url: env::var("REDIS_URL").unwrap_or_default(),
        jwt_secret: env::var("JWT_SECRET").unwrap_or_else(|_| "dev-secret-change-me".to_string()),
    };

    // 1. 创建 OpenAPI 服务
    let api_service: OpenApiService<Api, ()> =
        OpenApiService::new(Api, "E Server API", "1.0.0").server("http://localhost:3001");

    // 2. 获取 Swagger UI
    let ui = api_service.swagger_ui();

    // 3. 配置 CORS
    let cors_origin =
        env::var("CORS_ORIGIN").unwrap_or_else(|_| "http://localhost:5173".to_string());
    let cors = Cors::new()
        .allow_origin(cors_origin)
        .allow_methods(vec!["GET", "POST", "PATCH", "DELETE"])
        .allow_credentials(true);

    // 4. 组装路由
    let app = Route::new()
        .nest("/", api_service) // 接口挂载
        .nest("/docs", ui) // 文档挂载在 /docs
        .with(cors) // 中间件
        .with(ErrorTransformMiddleware)
        .with(RequestLoggerMiddleware)
        .data(state); // 共享状态

    let port = env::var("PORT").unwrap_or_else(|_| "3001".to_string());
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("E server listening on http://{}", addr);
    tracing::info!("Swagger UI available at http://{}/docs", addr);

    Server::new(TcpListener::bind(addr)).run(app).await
}
