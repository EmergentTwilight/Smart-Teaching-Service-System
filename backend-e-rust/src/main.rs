mod middleware;

use middleware::{
    decode_jwt_token, ensure_roles, ErrorTransformMiddleware, JwtPayload, RequestLoggerMiddleware,
};
use poem::{
    http::StatusCode, listener::TcpListener, middleware::Cors, web::Data, EndpointExt, Error,
    Request, Route, Server,
};
use poem_openapi::{
    auth::Bearer,
    param::{Path, Query},
    payload::Json,
    Enum, Object, OpenApi, OpenApiService, SecurityScheme,
};
use std::{env, sync::Arc};
use tokio_postgres::{types::ToSql, Client, NoTls};
use url::Url;

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
    db: Arc<Client>,
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

#[derive(Enum, Debug, Clone, Eq, PartialEq)]
enum QuestionTypeDto {
    SingleChoice,
    MultiChoice,
    TrueFalse,
}

impl QuestionTypeDto {
    fn as_db_value(&self) -> &'static str {
        match self {
            Self::SingleChoice => "SINGLE_CHOICE",
            Self::MultiChoice => "MULTI_CHOICE",
            Self::TrueFalse => "TRUE_FALSE",
        }
    }
}

#[derive(Enum, Debug, Clone, Eq, PartialEq)]
enum DifficultyDto {
    Easy,
    Medium,
    Hard,
}

impl DifficultyDto {
    fn as_db_value(&self) -> &'static str {
        match self {
            Self::Easy => "EASY",
            Self::Medium => "MEDIUM",
            Self::Hard => "HARD",
        }
    }
}

fn parse_question_type(value: &str) -> QuestionTypeDto {
    match value {
        "SINGLE_CHOICE" => QuestionTypeDto::SingleChoice,
        "MULTI_CHOICE" => QuestionTypeDto::MultiChoice,
        "TRUE_FALSE" => QuestionTypeDto::TrueFalse,
        _ => QuestionTypeDto::SingleChoice,
    }
}

fn parse_difficulty(value: Option<String>) -> Option<DifficultyDto> {
    match value.as_deref() {
        Some("EASY") => Some(DifficultyDto::Easy),
        Some("MEDIUM") => Some(DifficultyDto::Medium),
        Some("HARD") => Some(DifficultyDto::Hard),
        _ => None,
    }
}

#[derive(Object, Clone)]
struct QuestionOptionData {
    id: String,
    option_text: String,
    option_order: i32,
    is_correct: bool,
}

#[derive(Object, Clone)]
struct QuestionData {
    id: String,
    bank_id: String,
    question_type: QuestionTypeDto,
    content: String,
    answer: String,
    explanation: Option<String>,
    default_points: String,
    difficulty: Option<DifficultyDto>,
    knowledge_point: Option<String>,
    created_at: String,
    updated_at: Option<String>,
    options: Vec<QuestionOptionData>,
}

#[derive(Object)]
struct PaginationData {
    page: i32,
    page_size: i32,
    total: i64,
    total_pages: i32,
}

#[derive(Object)]
struct QuestionListData {
    items: Vec<QuestionData>,
    pagination: PaginationData,
}

#[derive(Object)]
struct QuestionListResponse {
    code: u16,
    message: String,
    data: QuestionListData,
}

#[derive(Object)]
struct QuestionDetailResponse {
    code: u16,
    message: String,
    data: QuestionData,
}

#[derive(Object)]
struct DeleteQuestionResponse {
    code: u16,
    message: String,
}

#[derive(Object)]
struct QuestionOptionInput {
    option_text: String,
    option_order: i32,
    is_correct: bool,
}

#[derive(Object)]
struct CreateQuestionInput {
    bank_id: String,
    question_type: QuestionTypeDto,
    content: String,
    answer: String,
    explanation: Option<String>,
    default_points: String,
    difficulty: Option<DifficultyDto>,
    knowledge_point: Option<String>,
    options: Option<Vec<QuestionOptionInput>>,
}

#[derive(Object)]
struct UpdateQuestionInput {
    bank_id: String,
    question_type: QuestionTypeDto,
    content: String,
    answer: String,
    explanation: Option<String>,
    default_points: String,
    difficulty: Option<DifficultyDto>,
    knowledge_point: Option<String>,
    options: Option<Vec<QuestionOptionInput>>,
}

fn internal_error(err: impl std::fmt::Display) -> Error {
    Error::from_string(
        format!("数据库操作失败: {err}"),
        StatusCode::INTERNAL_SERVER_ERROR,
    )
}

async fn query_question_options(
    client: &Client,
    question_id: &str,
) -> poem::Result<Vec<QuestionOptionData>> {
    let option_rows = client
        .query(
            "SELECT id, option_text, option_order, is_correct \
             FROM question_options \
             WHERE question_id = $1 \
             ORDER BY option_order ASC",
            &[&question_id],
        )
        .await
        .map_err(internal_error)?;

    let options = option_rows
        .into_iter()
        .map(|row| QuestionOptionData {
            id: row.get::<_, String>("id"),
            option_text: row.get::<_, String>("option_text"),
            option_order: row.get::<_, i32>("option_order"),
            is_correct: row.get::<_, bool>("is_correct"),
        })
        .collect();

    Ok(options)
}

async fn map_question_row(client: &Client, row: tokio_postgres::Row) -> poem::Result<QuestionData> {
    let id = row.get::<_, String>("id");
    let options = query_question_options(client, &id).await?;
    Ok(QuestionData {
        id,
        bank_id: row.get::<_, String>("bank_id"),
        question_type: parse_question_type(&row.get::<_, String>("question_type")),
        content: row.get::<_, String>("content"),
        answer: row.get::<_, String>("answer"),
        explanation: row.get::<_, Option<String>>("explanation"),
        default_points: row.get::<_, String>("default_points"),
        difficulty: parse_difficulty(row.get::<_, Option<String>>("difficulty")),
        knowledge_point: row.get::<_, Option<String>>("knowledge_point"),
        created_at: row.get::<_, String>("created_at"),
        updated_at: row.get::<_, Option<String>>("updated_at"),
        options,
    })
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

    /// 题目列表（分页）
    #[oai(path = "/online-testing/questions", method = "get")]
    async fn list_questions(
        &self,
        state: Data<&AppState>,
        _auth: BearerAuth,
        page: Query<Option<i32>>,
        page_size: Query<Option<i32>>,
        bank_id: Query<Option<String>>,
        keyword: Query<Option<String>>,
    ) -> poem::Result<Json<QuestionListResponse>> {
        let page = page.0.unwrap_or(1).max(1);
        let page_size = page_size.0.unwrap_or(10).clamp(1, 100);
        let offset = i64::from((page - 1) * page_size);
        let limit = i64::from(page_size);

        let rows = state
            .db
            .query(
                "SELECT id, bank_id, question_type::text AS question_type, content, answer, explanation, \
                        default_points::text AS default_points, difficulty::text AS difficulty, \
                        knowledge_point, created_at::text AS created_at, updated_at::text AS updated_at \
                 FROM questions \
                 WHERE ($1::text IS NULL OR bank_id = $1) \
                   AND ($2::text IS NULL OR content ILIKE '%' || $2 || '%') \
                 ORDER BY created_at DESC \
                 LIMIT $3 OFFSET $4",
                &[&bank_id.0, &keyword.0, &limit, &offset],
            )
            .await
            .map_err(internal_error)?;

        let mut items = Vec::with_capacity(rows.len());
        for row in rows {
            items.push(map_question_row(state.db.as_ref(), row).await?);
        }

        let total = state
            .db
            .query_one(
                "SELECT COUNT(*) AS total \
                 FROM questions \
                 WHERE ($1::text IS NULL OR bank_id = $1) \
                   AND ($2::text IS NULL OR content ILIKE '%' || $2 || '%')",
                &[&bank_id.0, &keyword.0],
            )
            .await
            .map_err(internal_error)?
            .get::<_, i64>("total");

        let total_pages = ((total + i64::from(page_size) - 1) / i64::from(page_size)) as i32;

        Ok(Json(QuestionListResponse {
            code: 200,
            message: "success".to_string(),
            data: QuestionListData {
                items,
                pagination: PaginationData {
                    page,
                    page_size,
                    total,
                    total_pages,
                },
            },
        }))
    }

    /// 获取题目详情
    #[oai(path = "/online-testing/questions/:id", method = "get")]
    async fn get_question(
        &self,
        state: Data<&AppState>,
        _auth: BearerAuth,
        id: Path<String>,
    ) -> poem::Result<Json<QuestionDetailResponse>> {
        let row = state
            .db
            .query_opt(
                "SELECT id, bank_id, question_type::text AS question_type, content, answer, explanation, \
                        default_points::text AS default_points, difficulty::text AS difficulty, \
                        knowledge_point, created_at::text AS created_at, updated_at::text AS updated_at \
                 FROM questions \
                 WHERE id = $1",
                &[&id.0],
            )
            .await
            .map_err(internal_error)?;

        let row = row.ok_or_else(|| Error::from_string("题目不存在", StatusCode::NOT_FOUND))?;
        let data = map_question_row(state.db.as_ref(), row).await?;

        Ok(Json(QuestionDetailResponse {
            code: 200,
            message: "success".to_string(),
            data,
        }))
    }

    /// 创建题目
    #[oai(path = "/online-testing/questions", method = "post")]
    async fn create_question(
        &self,
        state: Data<&AppState>,
        auth: BearerAuth,
        input: Json<CreateQuestionInput>,
    ) -> poem::Result<Json<QuestionDetailResponse>> {
        ensure_roles(&auth.0, &["super_admin", "admin"])?;

        let question_type = input.question_type.as_db_value().to_string();
        let difficulty = input
            .difficulty
            .as_ref()
            .map(DifficultyDto::as_db_value)
            .map(str::to_string);
        let params: [&(dyn ToSql + Sync); 8] = [
            &input.bank_id,
            &question_type,
            &input.content,
            &input.answer,
            &input.explanation,
            &input.default_points,
            &difficulty,
            &input.knowledge_point,
        ];
        let question = state
            .db
            .query_one(
                "INSERT INTO questions \
                    (bank_id, question_type, content, answer, explanation, default_points, difficulty, knowledge_point, created_at, updated_at) \
                 VALUES \
                    ($1, $2::\"QuestionType\", $3, $4, $5, $6::numeric, $7::\"Difficulty\", $8, NOW(), NOW()) \
                 RETURNING id, bank_id, question_type::text AS question_type, content, answer, explanation, \
                           default_points::text AS default_points, difficulty::text AS difficulty, \
                           knowledge_point, created_at::text AS created_at, updated_at::text AS updated_at",
                &params,
            )
            .await
            .map_err(internal_error)?;

        let question_id: String = question.get("id");
        if let Some(options) = &input.options {
            for option in options {
                let option_params: [&(dyn ToSql + Sync); 4] = [
                    &question_id,
                    &option.option_text,
                    &option.option_order,
                    &option.is_correct,
                ];
                state
                    .db
                    .execute(
                    "INSERT INTO question_options (question_id, option_text, option_order, is_correct) \
                     VALUES ($1, $2, $3, $4)",
                    &option_params,
                )
                .await
                .map_err(internal_error)?;
            }
        }

        let data = map_question_row(state.db.as_ref(), question).await?;
        Ok(Json(QuestionDetailResponse {
            code: 200,
            message: "created".to_string(),
            data,
        }))
    }

    /// 更新题目
    #[oai(path = "/online-testing/questions/:id", method = "put")]
    async fn update_question(
        &self,
        state: Data<&AppState>,
        auth: BearerAuth,
        id: Path<String>,
        input: Json<UpdateQuestionInput>,
    ) -> poem::Result<Json<QuestionDetailResponse>> {
        ensure_roles(&auth.0, &["super_admin", "admin"])?;

        let question_type = input.question_type.as_db_value().to_string();
        let difficulty = input
            .difficulty
            .as_ref()
            .map(DifficultyDto::as_db_value)
            .map(str::to_string);
        let params: [&(dyn ToSql + Sync); 9] = [
            &id.0,
            &input.bank_id,
            &question_type,
            &input.content,
            &input.answer,
            &input.explanation,
            &input.default_points,
            &difficulty,
            &input.knowledge_point,
        ];

        let updated = state
            .db
            .query_opt(
                "UPDATE questions \
                 SET bank_id = $2, \
                     question_type = $3::\"QuestionType\", \
                     content = $4, \
                     answer = $5, \
                     explanation = $6, \
                     default_points = $7::numeric, \
                     difficulty = $8::\"Difficulty\", \
                     knowledge_point = $9, \
                     updated_at = NOW() \
                 WHERE id = $1 \
                 RETURNING id, bank_id, question_type::text AS question_type, content, answer, explanation, \
                           default_points::text AS default_points, difficulty::text AS difficulty, \
                           knowledge_point, created_at::text AS created_at, updated_at::text AS updated_at",
                &params,
            )
            .await
            .map_err(internal_error)?;

        let updated =
            updated.ok_or_else(|| Error::from_string("题目不存在", StatusCode::NOT_FOUND))?;

        if let Some(options) = &input.options {
            let delete_params: [&(dyn ToSql + Sync); 1] = [&id.0];
            state
                .db
                .execute(
                    "DELETE FROM question_options WHERE question_id = $1",
                    &delete_params,
                )
                .await
                .map_err(internal_error)?;
            for option in options {
                let option_params: [&(dyn ToSql + Sync); 4] = [
                    &id.0,
                    &option.option_text,
                    &option.option_order,
                    &option.is_correct,
                ];
                state
                    .db
                    .execute(
                    "INSERT INTO question_options (question_id, option_text, option_order, is_correct) \
                     VALUES ($1, $2, $3, $4)",
                    &option_params,
                )
                .await
                .map_err(internal_error)?;
            }
        }

        let data = map_question_row(state.db.as_ref(), updated).await?;

        Ok(Json(QuestionDetailResponse {
            code: 200,
            message: "updated".to_string(),
            data,
        }))
    }

    /// 删除题目
    #[oai(path = "/online-testing/questions/:id", method = "delete")]
    async fn delete_question(
        &self,
        state: Data<&AppState>,
        auth: BearerAuth,
        id: Path<String>,
    ) -> poem::Result<Json<DeleteQuestionResponse>> {
        ensure_roles(&auth.0, &["super_admin", "admin"])?;

        let deleted = state
            .db
            .execute("DELETE FROM questions WHERE id = $1", &[&id.0])
            .await
            .map_err(internal_error)?;

        if deleted == 0 {
            return Err(Error::from_string("题目不存在", StatusCode::NOT_FOUND));
        }

        Ok(Json(DeleteQuestionResponse {
            code: 200,
            message: "deleted".to_string(),
        }))
    }
}

fn normalize_database_url(url: &str) -> String {
    match Url::parse(url) {
        Ok(mut parsed) => {
            parsed.set_query(None);
            parsed.to_string()
        }
        Err(_) => url.to_string(),
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
        db: {
            let db_url = normalize_database_url(&env::var("DATABASE_URL").unwrap_or_default());
            let (client, connection) = tokio_postgres::connect(&db_url, NoTls)
                .await
                .map_err(std::io::Error::other)?;
            tokio::spawn(async move {
                if let Err(err) = connection.await {
                    tracing::error!("postgres connection error: {err}");
                }
            });
            Arc::new(client)
        },
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
