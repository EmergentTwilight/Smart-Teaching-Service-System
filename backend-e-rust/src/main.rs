use axum::{
    extract::State,
    http::{header, HeaderValue, Method},
    routing::get,
    Json, Router,
};
use serde::Serialize;
use std::{env, net::SocketAddr};
use tower_http::cors::{Any, CorsLayer};

#[derive(Clone)]
struct AppState {
    service: String,
    database_url: String,
    redis_url: String,
}

#[derive(Serialize)]
struct HealthResponse {
    code: u16,
    message: &'static str,
    data: HealthData,
}

#[derive(Serialize)]
struct HealthData {
    service: String,
    status: &'static str,
}

#[derive(Serialize)]
struct EnvResponse {
    code: u16,
    message: &'static str,
    data: EnvData,
}

#[derive(Serialize)]
struct EnvData {
    database_url: String,
    redis_url: String,
}

#[derive(Serialize)]
struct OnlineTestingPingResponse {
    code: u16,
    message: &'static str,
    data: OnlineTestingPingData,
}

#[derive(Serialize)]
struct OnlineTestingPingData {
    module: &'static str,
    from: &'static str,
    status: &'static str,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(env::var("RUST_LOG").unwrap_or_else(|_| "info".to_string()))
        .init();

    let port = env::var("PORT").unwrap_or_else(|_| "3001".to_string());
    let addr: SocketAddr = format!("0.0.0.0:{}", port)
        .parse()
        .expect("PORT must be a valid u16");

    let state = AppState {
        service: "stss-e-server".to_string(),
        database_url: env::var("DATABASE_URL").unwrap_or_default(),
        redis_url: env::var("REDIS_URL").unwrap_or_default(),
    };

    let cors_origin = env::var("CORS_ORIGIN").unwrap_or_else(|_| "http://localhost:5173".to_string());
    let cors = CorsLayer::new()
        .allow_origin(
            cors_origin
                .parse::<HeaderValue>()
                .expect("CORS_ORIGIN must be a valid header value"),
        )
        .allow_methods([Method::GET, Method::POST, Method::PATCH, Method::DELETE])
        .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION, header::ACCEPT])
        .allow_credentials(true);

    let app = Router::new()
        .route("/api/v1/health", get(health))
        .route("/api/v1/env", get(show_env))
        .route("/api/v1/online-testing/ping", get(online_testing_ping))
        .with_state(state)
        .layer(cors);

    tracing::info!("E server listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("failed to bind TCP listener");

    axum::serve(listener, app)
        .await
        .expect("server exited unexpectedly");
}

async fn health(State(state): State<AppState>) -> Json<HealthResponse> {
    Json(HealthResponse {
        code: 200,
        message: "success",
        data: HealthData {
            service: state.service,
            status: "ok",
        },
    })
}

async fn show_env(State(state): State<AppState>) -> Json<EnvResponse> {
    Json(EnvResponse {
        code: 200,
        message: "success",
        data: EnvData {
            database_url: state.database_url,
            redis_url: state.redis_url,
        },
    })
}

async fn online_testing_ping() -> Json<OnlineTestingPingResponse> {
    Json(OnlineTestingPingResponse {
        code: 200,
        message: "online testing ping ok",
        data: OnlineTestingPingData {
            module: "online-testing",
            from: "rust-e-server",
            status: "ok",
        },
    })
}
