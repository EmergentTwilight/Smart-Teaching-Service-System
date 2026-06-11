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
use std::{collections::{HashMap, HashSet}, env, sync::Arc};
use tokio_postgres::{types::ToSql, Client, NoTls};
use url::Url; 
use uuid::Uuid;

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
#[oai(rename_all = "camelCase")]
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
#[oai(rename_all = "camelCase")]
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
struct QuestionBankData {
    id: String,
    name: String,
    description: Option<String>,
    status: String,
    question_count: i64,
}

#[derive(Object)]
struct QuestionBankListResponse {
    code: u16,
    message: String,
    data: Vec<QuestionBankData>,
}

#[derive(Object)]
struct TestPaperData {
    id: String,
    course_offering_id: String,
    creator_id: String,
    title: String,
    description: Option<String>,
    total_points: String,
    duration_minutes: i32,
    start_time: Option<String>,
    end_time: Option<String>,
    is_random: bool,
    status: String,
    question_count: i64,
}

#[derive(Object)]
struct TestPaperDetailResponse {
    code: u16,
    message: String,
    data: TestPaperData,
}

#[derive(Object)]
struct TestPaperListResponse {
    code: u16,
    message: String,
    data: Vec<TestPaperData>,
}

#[derive(Object)]
struct TestPaperQuestionData {
    test_question_id: String,
    question_id: String,
    bank_id: String,
    question_type: QuestionTypeDto,
    content: String,
    points: String,
    order_num: i32,
    difficulty: Option<DifficultyDto>,
}

#[derive(Object)]
struct TestPaperEditorData {
    paper: TestPaperData,
    questions: Vec<TestPaperQuestionData>,
}

#[derive(Object)]
struct TestPaperEditorResponse {
    code: u16,
    message: String,
    data: TestPaperEditorData,
}

#[derive(Object)]
struct AddQuestionsResponse {
    code: u16,
    message: String,
    added_count: i32,
}

#[derive(Object)]
struct QuestionBankDetailResponse {
    code: u16,
    message: String,
    data: QuestionBankData,
}

#[derive(Object)]
struct BasicResponse {
    code: u16,
    message: String,
}

// ==================== 学生答题相关结构体 ====================

/// 学生视角的选项（不含答案标记）
#[derive(Object)]
struct TestPaperStudentOptionData {
    id: String,
    option_text: String,
    option_order: i32,
}

/// 学生视角的题目（含选项，不含 is_correct）
#[derive(Object)]
struct TestPaperStudentQuestionData {
    test_question_id: String,
    question_id: String,
    question_type: QuestionTypeDto,
    content: String,
    points: String,
    order_num: i32,
    options: Vec<TestPaperStudentOptionData>,
}

/// 开始答题返回数据
#[derive(Object)]
struct StartExamData {
    paper_title: String,
    duration_minutes: i32,
    question_count: usize,
    total_points: String,
    questions: Vec<TestPaperStudentQuestionData>,
    start_time: String,
    test_result_id: String,
    /// 恢复答题时的剩余秒数，首次进入为 null
    remaining_seconds: Option<i32>,
    /// 考试结束时间（用于前端双重倒计时）
    end_time: Option<String>,
}

#[derive(Object)]
struct StartExamResponse {
    code: u16,
    message: String,
    data: StartExamData,
}

/// 单题提交
#[derive(Object)]
#[oai(rename_all = "camelCase")]
struct SubmitAnswerItem {
    test_question_id: String,
    student_answer: Option<String>,
}

/// 提交答案请求
#[derive(Object)]
#[oai(rename_all = "camelCase")]
struct SubmitAnswersInput {
    answers: Vec<SubmitAnswerItem>,
}

/// 单题评分详情
#[derive(Object)]
struct GradedAnswerData {
    test_question_id: String,
    question_content: String,
    student_answer: Option<String>,
    correct_answer: String,
    is_correct: bool,
    score: String,
    points: String,
}

/// 提交后返回的评分结果
#[derive(Object)]
struct SubmitExamData {
    test_result_id: String,
    total_score: String,
    total_points: String,
    graded_count: i32,
    correct_count: i32,
    time_spent_seconds: Option<i32>,
    answers: Vec<GradedAnswerData>,
}

#[derive(Object)]
struct SubmitExamResponse {
    code: u16,
    message: String,
    data: SubmitExamData,
}

/// 学生成绩列表项
#[derive(Object)]
struct TestResultListItemData {
    id: String,
    test_paper_id: String,
    paper_title: String,
    start_time: String,
    submit_time: Option<String>,
    total_score: Option<String>,
    status: String,
    time_spent_seconds: Option<i32>,
}

#[derive(Object)]
struct TestResultListResponse {
    code: u16,
    message: String,
    data: Vec<TestResultListItemData>,
}

/// 单次答题详情响应
#[derive(Object)]
struct TestResultDetailResponse {
    code: u16,
    message: String,
    data: SubmitExamData,
}

/// 教师查看的试卷成绩项
#[derive(Object)]
struct PaperResultItem {
    id: String,
    student_id: String,
    student_name: String,
    total_score: Option<String>,
    status: String,
    time_spent_seconds: Option<i32>,
    submit_time: Option<String>,
}

#[derive(Object)]
struct PaperResultsResponse {
    code: u16,
    message: String,
    data: Vec<PaperResultItem>,
}
#[derive(Object)]
#[oai(rename_all = "camelCase")]
struct CreateQuestionBankInput {
    name: String,
    description: Option<String>,
}

#[derive(Object)]
#[oai(rename_all = "camelCase")]
struct CreateTestPaperInput {
    bank_id: Option<String>,
    title: String,
    description: Option<String>,
    total_points: String,
    duration_minutes: i32,
    is_random: Option<bool>,
    start_time: Option<String>,
    end_time: Option<String>,
}

#[derive(Object)]
#[oai(rename_all = "camelCase")]
struct UpdateTestPaperInput {
    title: String,
    description: Option<String>,
    total_points: String,
    duration_minutes: i32,
    is_random: Option<bool>,
    start_time: Option<String>,
    end_time: Option<String>,
}

#[derive(Object)]
#[oai(rename_all = "camelCase")]
struct AddPaperQuestionsInput {
    question_ids: Vec<String>,
    points_per_question: Option<String>,
}

#[derive(Object)]
#[oai(rename_all = "camelCase")]
struct AutoGeneratePaperQuestionsInput {
    bank_id: String,
    question_type: Option<QuestionTypeDto>,
    difficulty: Option<DifficultyDto>,
    keyword: Option<String>,
    count: i32,
    points_per_question: Option<String>,
}

#[derive(Object)]
#[oai(rename_all = "camelCase")]
struct CreateQuestionInput {
    bank_id: String,
    question_type: QuestionTypeDto,
    content: String,
    explanation: Option<String>,
    default_points: String,
    difficulty: Option<DifficultyDto>,
    knowledge_point: Option<String>,
    answer: Option<String>,
    option_count: i32,
    option_texts: Vec<String>,
    correct_option_orders: Vec<i32>,
}

#[derive(Object)]
#[oai(rename_all = "camelCase")]
struct UpdateQuestionInput {
    bank_id: String,
    question_type: QuestionTypeDto,
    content: String,
    explanation: Option<String>,
    default_points: String,
    difficulty: Option<DifficultyDto>,
    knowledge_point: Option<String>,
    answer: Option<String>,
    option_count: i32,
    option_texts: Vec<String>,
    correct_option_orders: Vec<i32>,
}

fn internal_error(err: impl std::fmt::Display) -> Error {
    tracing::error!("Internal error: {}", err);
    Error::from_string(
        format!("数据库操作失败: {err}"),
        StatusCode::INTERNAL_SERVER_ERROR,
    )
}

fn bad_request_error(message: &str) -> Error {
    Error::from_string(message.to_string(), StatusCode::BAD_REQUEST)
}

/// 兼容解析 PostgreSQL ::text 输出的时间戳（无时区）和 RFC3339
fn parse_db_timestamp(s: &str) -> chrono::DateTime<chrono::Utc> {
    // 先尝试 RFC3339（带时区）
    if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(s) {
        return dt.with_timezone(&chrono::Utc);
    }
    // 再尝试 PostgreSQL 默认格式（YYYY-MM-DD HH:MM:SS[.MS]）
    if let Ok(naive) = chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S%.f") {
        return naive.and_utc();
    }
    if let Ok(naive) = chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S") {
        return naive.and_utc();
    }
    chrono::Utc::now()
}

fn build_answer_and_options(
    question_type: &QuestionTypeDto,
    option_count: i32,
    option_texts: &[String],
    correct_option_orders: &[i32],
) -> poem::Result<(String, Vec<(i32, String, bool)>)> {
    if option_count < 2 || option_count > 8 {
        return Err(bad_request_error("选项数量必须在 2 到 8 之间"));
    }
    if matches!(question_type, QuestionTypeDto::TrueFalse) && option_count != 2 {
        return Err(bad_request_error("判断题固定为 2 个选项"));
    }
    if option_texts.len() != option_count as usize {
        return Err(bad_request_error("选项文本数量与选项数量不一致"));
    }

    let mut options = Vec::with_capacity(option_count as usize);
    for (idx, text) in option_texts.iter().enumerate() {
        let trimmed = text.trim();
        if trimmed.is_empty() {
            return Err(bad_request_error("选项文本不能为空"));
        }
        options.push(((idx + 1) as i32, trimmed.to_string(), false));
    }

    if correct_option_orders.is_empty() {
        return Err(bad_request_error("请至少选择一个正确选项"));
    }

    let mut seen = HashSet::new();
    for order in correct_option_orders {
        if !seen.insert(*order) {
            return Err(bad_request_error("正确选项序号不能重复"));
        }
        if *order < 1 || *order > option_count {
            return Err(bad_request_error("正确选项序号超出选项范围"));
        }
    }

    match question_type {
        QuestionTypeDto::SingleChoice | QuestionTypeDto::TrueFalse if correct_option_orders.len() != 1 => {
            return Err(bad_request_error("单选/判断题只能有一个正确选项"));
        }
        _ => {}
    }

    for (order, _, is_correct) in &mut options {
        *is_correct = seen.contains(order);
    }

    let answer = if matches!(question_type, QuestionTypeDto::MultiChoice) {
        let mut sorted = correct_option_orders.to_vec();
        sorted.sort_unstable();
        sorted
            .into_iter()
            .map(|value| value.to_string())
            .collect::<Vec<_>>()
            .join(",")
    } else {
        correct_option_orders[0].to_string()
    };

    Ok((answer, options))
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

fn map_test_paper_row(row: &tokio_postgres::Row) -> TestPaperData {
    TestPaperData {
        id: row.get::<_, String>("id"),
        course_offering_id: row.get::<_, String>("course_offering_id"),
        creator_id: row.get::<_, String>("creator_id"),
        title: row.get::<_, String>("title"),
        description: row.get::<_, Option<String>>("description"),
        total_points: row.get::<_, String>("total_points"),
        duration_minutes: row.get::<_, i32>("duration_minutes"),
        start_time: row.get::<_, Option<String>>("start_time"),
        end_time: row.get::<_, Option<String>>("end_time"),
        is_random: row.get::<_, bool>("is_random"),
        status: row.get::<_, String>("status").to_lowercase(),
        question_count: row.get::<_, i64>("question_count"),
    }
}

async fn query_test_paper_questions(
    client: &Client,
    paper_id: &str,
) -> poem::Result<Vec<TestPaperQuestionData>> {
    let rows = client
        .query(
            "SELECT tq.id AS test_question_id, tq.question_id, tq.order_num, tq.points::text AS points, \
                    q.bank_id, q.question_type::text AS question_type, q.content, q.difficulty::text AS difficulty \
             FROM test_questions tq \
             JOIN questions q ON q.id = tq.question_id \
             WHERE tq.test_paper_id = $1 \
             ORDER BY tq.order_num ASC, tq.id ASC",
            &[&paper_id],
        )
        .await
        .map_err(internal_error)?;

    Ok(rows
        .into_iter()
        .map(|row| TestPaperQuestionData {
            test_question_id: row.get::<_, String>("test_question_id"),
            question_id: row.get::<_, String>("question_id"),
            bank_id: row.get::<_, String>("bank_id"),
            question_type: parse_question_type(&row.get::<_, String>("question_type")),
            content: row.get::<_, String>("content"),
            points: row.get::<_, String>("points"),
            order_num: row.get::<_, i32>("order_num"),
            difficulty: parse_difficulty(row.get::<_, Option<String>>("difficulty")),
        })
        .collect())
}

async fn reorder_test_questions(client: &Client, paper_id: &str) -> poem::Result<()> {
    client
        .execute(
            "WITH ordered AS ( \
                SELECT id, ROW_NUMBER() OVER (ORDER BY order_num ASC, id ASC) AS rn \
                FROM test_questions \
                WHERE test_paper_id = $1 \
             ) \
             UPDATE test_questions t \
             SET order_num = ordered.rn \
             FROM ordered \
             WHERE t.id = ordered.id",
            &[&paper_id],
        )
        .await
        .map_err(internal_error)?;
    Ok(())
}

async fn resolve_or_create_course_offering(
    client: &Client,
    bank_id: Option<&str>,
) -> poem::Result<(String, String)> {
    let base_pair = if let Some(bank_id) = bank_id {
        let bank = client
            .query_opt(
                "SELECT course_id, creator_id \
                 FROM question_banks \
                 WHERE id = $1",
                &[&bank_id],
            )
            .await
            .map_err(internal_error)?
            .ok_or_else(|| Error::from_string("题库不存在", StatusCode::NOT_FOUND))?;
        Some((
            bank.get::<_, String>("course_id"),
            bank.get::<_, String>("creator_id"),
        ))
    } else {
        None
    };

    let (course_id, creator_id) = if let Some(pair) = base_pair {
        pair
    } else if let Some(row) = client
        .query_opt(
            "SELECT course_id, creator_id \
             FROM question_banks \
             ORDER BY id ASC \
             LIMIT 1",
            &[],
        )
        .await
        .map_err(internal_error)?
    {
        (
            row.get::<_, String>("course_id"),
            row.get::<_, String>("creator_id"),
        )
    } else if let Some(row) = client
        .query_opt(
            "SELECT c.id AS course_id, c.teacher_id AS creator_id \
             FROM courses c \
             WHERE c.teacher_id IS NOT NULL \
             ORDER BY c.id ASC \
             LIMIT 1",
            &[],
        )
        .await
        .map_err(internal_error)?
    {
        (
            row.get::<_, String>("course_id"),
            row.get::<_, String>("creator_id"),
        )
    } else {
        return Err(bad_request_error("缺少教师/课程基础数据，无法创建试卷"));
    };

    let existing = client
        .query_opt(
            "SELECT id \
             FROM course_offerings \
             WHERE course_id = $1 AND teacher_id = $2 \
             ORDER BY id ASC \
             LIMIT 1",
            &[&course_id, &creator_id],
        )
        .await
        .map_err(internal_error)?;

    if let Some(row) = existing {
        return Ok((row.get::<_, String>("id"), creator_id));
    }

    let semester_id = if let Some(row) = client
        .query_opt(
            "SELECT id \
             FROM semesters \
             WHERE status IN ('CURRENT'::\"SemesterStatus\", 'UPCOMING'::\"SemesterStatus\") \
             ORDER BY start_date ASC \
             LIMIT 1",
            &[],
        )
        .await
        .map_err(internal_error)?
    {
        row.get::<_, String>("id")
    } else {
        let semester_id = Uuid::new_v4().to_string();
        client
            .execute(
                "INSERT INTO semesters (id, name, start_date, end_date, status) \
                 VALUES ($1, '默认学期', CURRENT_DATE, (CURRENT_DATE + INTERVAL '120 day')::date, 'CURRENT'::\"SemesterStatus\")",
                &[&semester_id],
            )
            .await
            .map_err(internal_error)?;
        semester_id
    };

    let offering_id = Uuid::new_v4().to_string();
    client
        .execute(
            "INSERT INTO course_offerings (id, course_id, semester_id, teacher_id, capacity, enrolled_count, status) \
             VALUES ($1, $2, $3, $4, 100, 0, 'PLANNED'::\"OfferingStatus\")",
            &[&offering_id, &course_id, &semester_id, &creator_id],
        )
        .await
        .map_err(internal_error)?;

    Ok((offering_id, creator_id))
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

    /// 题库列表（用于题目创建表单）
    #[oai(path = "/online-testing/question-banks", method = "get")]
    async fn list_question_banks(
        &self,
        state: Data<&AppState>,
        _auth: BearerAuth,
    ) -> poem::Result<Json<QuestionBankListResponse>> {
        let rows = state
            .db
            .query(
                "SELECT qb.id, qb.name, qb.description, qb.status::text AS status, \
                        COUNT(q.id)::bigint AS question_count \
                 FROM question_banks qb \
                 LEFT JOIN questions q ON q.bank_id = qb.id \
                 GROUP BY qb.id, qb.name, qb.description, qb.status \
                 ORDER BY qb.name ASC",
                &[],
            )
            .await
            .map_err(internal_error)?;

        let data = rows
            .into_iter()
            .map(|row| QuestionBankData {
                id: row.get::<_, String>("id"),
                name: row.get::<_, String>("name"),
                description: row.get::<_, Option<String>>("description"),
                status: row.get::<_, String>("status").to_lowercase(),
                question_count: row.get::<_, i64>("question_count"),
            })
            .collect::<Vec<_>>();

        Ok(Json(QuestionBankListResponse {
            code: 200,
            message: "success".to_string(),
            data,
        }))
    }

    /// 创建题库
    #[oai(path = "/online-testing/question-banks", method = "post")]
    async fn create_question_bank(
        &self,
        state: Data<&AppState>,
        auth: BearerAuth,
        input: Json<CreateQuestionBankInput>,
    ) -> poem::Result<Json<QuestionBankDetailResponse>> {
        ensure_roles(&auth.0, &["super_admin", "admin"])?;

        let name = input.name.trim();
        if name.is_empty() {
            return Err(bad_request_error("题库名称不能为空"));
        }

        let fallback = state
            .db
            .query_opt(
                "SELECT course_id, creator_id FROM question_banks LIMIT 1",
                &[],
            )
            .await
            .map_err(internal_error)?;

        let (course_id, creator_id) = if let Some(row) = fallback {
            (
                row.get::<_, String>("course_id"),
                row.get::<_, String>("creator_id"),
            )
        } else {
            let row = state
                .db
                .query_opt(
                    "SELECT c.id AS course_id, c.teacher_id AS creator_id \
                     FROM courses c \
                     WHERE c.teacher_id IS NOT NULL \
                     LIMIT 1",
                    &[],
                )
                .await
                .map_err(internal_error)?
                .ok_or_else(|| bad_request_error("缺少教师/课程基础数据，无法创建题库"))?;
            (
                row.get::<_, String>("course_id"),
                row.get::<_, String>("creator_id"),
            )
        };

        let bank_id = Uuid::new_v4().to_string();
        let description = input.description.clone();
        let row = state
            .db
            .query_one(
                "INSERT INTO question_banks (id, course_id, creator_id, name, description, status) \
                 VALUES ($1, $2, $3, $4, $5, 'ACTIVE'::\"BankStatus\") \
                 RETURNING id, name, description, status::text AS status",
                &[&bank_id, &course_id, &creator_id, &name, &description],
            )
            .await
            .map_err(internal_error)?;

        Ok(Json(QuestionBankDetailResponse {
            code: 200,
            message: "created".to_string(),
            data: QuestionBankData {
                id: row.get::<_, String>("id"),
                name: row.get::<_, String>("name"),
                description: row.get::<_, Option<String>>("description"),
                status: row.get::<_, String>("status").to_lowercase(),
                question_count: 0,
            },
        }))
    }

    /// 删除题库（题库下仍有题目时禁止删除）
    #[oai(path = "/online-testing/question-banks/:id", method = "delete")]
    async fn delete_question_bank(
        &self,
        state: Data<&AppState>,
        auth: BearerAuth,
        id: Path<String>,
    ) -> poem::Result<Json<BasicResponse>> {
        ensure_roles(&auth.0, &["super_admin", "admin"])?;

        let question_count = state
            .db
            .query_one(
                "SELECT COUNT(*)::bigint AS total FROM questions WHERE bank_id = $1",
                &[&id.0],
            )
            .await
            .map_err(internal_error)?
            .get::<_, i64>("total");
        if question_count > 0 {
            return Err(Error::from_string(
                "该题库下仍有题目，请先删除题目后再删除题库",
                StatusCode::CONFLICT,
            ));
        }

        let deleted = state
            .db
            .execute("DELETE FROM question_banks WHERE id = $1", &[&id.0])
            .await
            .map_err(internal_error)?;
        if deleted == 0 {
            return Err(Error::from_string("题库不存在", StatusCode::NOT_FOUND));
        }

        Ok(Json(BasicResponse {
            code: 200,
            message: "deleted".to_string(),
        }))
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

    /// 创建试卷草稿
    #[oai(path = "/online-testing/test-papers", method = "post")]
    async fn create_test_paper(
        &self,
        state: Data<&AppState>,
        auth: BearerAuth,
        input: Json<CreateTestPaperInput>,
    ) -> poem::Result<Json<TestPaperDetailResponse>> {
        ensure_roles(&auth.0, &["super_admin", "admin"])?;

        let title = input.title.trim();
        if title.is_empty() {
            return Err(bad_request_error("试卷标题不能为空"));
        }
        if input.duration_minutes <= 0 {
            return Err(bad_request_error("考试时长必须大于 0"));
        }
        if input.total_points.trim().is_empty() {
            return Err(bad_request_error("试卷总分不能为空"));
        }

        let (course_offering_id, creator_id) =
            resolve_or_create_course_offering(state.db.as_ref(), input.bank_id.as_deref()).await?;

        let paper_id = Uuid::new_v4().to_string();
        let is_random = input.is_random.unwrap_or(false);
        let row = state
            .db
            .query_one(
                "INSERT INTO test_papers \
                    (id, course_offering_id, creator_id, title, description, total_points, duration_minutes, start_time, end_time, is_random, status) \
                 VALUES \
                    ($1, $2, $3, $4, $5, $6::text::numeric, $7, $8::text::timestamp, $9::text::timestamp, $10, 'DRAFT'::\"PaperStatus\") \
                 RETURNING id, course_offering_id, creator_id, title, description, total_points::text AS total_points, \
                           duration_minutes, start_time::text AS start_time, end_time::text AS end_time, \
                          is_random, status::text AS status, 0::bigint AS question_count",
                &[
                    &paper_id,
                    &course_offering_id,
                    &creator_id,
                    &title,
                    &input.description,
                    &input.total_points,
                    &input.duration_minutes,
                    &input.start_time,
                    &input.end_time,
                    &is_random,
                ],
            )
            .await
            .map_err(internal_error)?;

        Ok(Json(TestPaperDetailResponse {
            code: 200,
            message: "created".to_string(),
            data: map_test_paper_row(&row),
        }))
    }

    /// 试卷列表
    #[oai(path = "/online-testing/test-papers", method = "get")]
    async fn list_test_papers(
        &self,
        state: Data<&AppState>,
        _auth: BearerAuth,
    ) -> poem::Result<Json<TestPaperListResponse>> {
        let rows = state
            .db
            .query(
                "SELECT tp.id, tp.course_offering_id, tp.creator_id, tp.title, tp.description, \
                        COALESCE(SUM(tq.points), tp.total_points)::text AS total_points, tp.duration_minutes, \
                        tp.start_time::text AS start_time, tp.end_time::text AS end_time, tp.is_random, tp.status::text AS status, \
                        COUNT(tq.id)::bigint AS question_count \
                 FROM test_papers tp \
                 LEFT JOIN test_questions tq ON tq.test_paper_id = tp.id \
                 GROUP BY tp.id, tp.course_offering_id, tp.creator_id, tp.title, tp.description, tp.total_points, \
                          tp.duration_minutes, tp.start_time, tp.end_time, tp.is_random, tp.status \
                 ORDER BY tp.id DESC",
                &[],
            )
            .await
            .map_err(internal_error)?;

        let data = rows.iter().map(map_test_paper_row).collect::<Vec<_>>();

        Ok(Json(TestPaperListResponse {
            code: 200,
            message: "success".to_string(),
            data,
        }))
    }

    /// 试卷详情（含已配置题目）
    #[oai(path = "/online-testing/test-papers/:id", method = "get")]
    async fn get_test_paper(
        &self,
        state: Data<&AppState>,
        _auth: BearerAuth,
        id: Path<String>,
    ) -> poem::Result<Json<TestPaperEditorResponse>> {
        let row = state
            .db
            .query_opt(
                "SELECT tp.id, tp.course_offering_id, tp.creator_id, tp.title, tp.description, \
                        COALESCE(SUM(tq.points), tp.total_points)::text AS total_points, tp.duration_minutes, \
                        tp.start_time::text AS start_time, tp.end_time::text AS end_time, tp.is_random, tp.status::text AS status, \
                        COUNT(tq.id)::bigint AS question_count \
                 FROM test_papers tp \
                 LEFT JOIN test_questions tq ON tq.test_paper_id = tp.id \
                 WHERE tp.id = $1 \
                 GROUP BY tp.id, tp.course_offering_id, tp.creator_id, tp.title, tp.description, tp.total_points, \
                          tp.duration_minutes, tp.start_time, tp.end_time, tp.is_random, tp.status",
                &[&id.0],
            )
            .await
            .map_err(internal_error)?
            .ok_or_else(|| Error::from_string("试卷不存在", StatusCode::NOT_FOUND))?;

        let paper = map_test_paper_row(&row);
        let questions = query_test_paper_questions(state.db.as_ref(), &id.0).await?;

        Ok(Json(TestPaperEditorResponse {
            code: 200,
            message: "success".to_string(),
            data: TestPaperEditorData { paper, questions },
        }))
    }

    /// 编辑试卷基础信息
    #[oai(path = "/online-testing/test-papers/:id", method = "put")]
    async fn update_test_paper(
        &self,
        state: Data<&AppState>,
        auth: BearerAuth,
        id: Path<String>,
        input: Json<UpdateTestPaperInput>,
    ) -> poem::Result<Json<TestPaperDetailResponse>> {
        ensure_roles(&auth.0, &["super_admin", "admin"])?;

        let title = input.title.trim();
        if title.is_empty() {
            return Err(bad_request_error("试卷标题不能为空"));
        }
        if input.duration_minutes <= 0 {
            return Err(bad_request_error("考试时长必须大于 0"));
        }
        if input.total_points.trim().is_empty() {
            return Err(bad_request_error("试卷总分不能为空"));
        }

        let row = state
            .db
            .query_opt(
                "UPDATE test_papers \
                 SET title = $2, \
                     description = $3, \
                     total_points = $4::text::numeric, \
                     duration_minutes = $5, \
                     is_random = $6, \
                     start_time = $7::text::timestamp, \
                     end_time = $8::text::timestamp \
                 WHERE id = $1 \
                 RETURNING id, course_offering_id, creator_id, title, description, total_points::text AS total_points, \
                           duration_minutes, start_time::text AS start_time, end_time::text AS end_time, \
                           is_random, status::text AS status, 0::bigint AS question_count",
                &[
                    &id.0,
                    &title,
                    &input.description,
                    &input.total_points,
                    &input.duration_minutes,
                    &input.is_random.unwrap_or(false),
                    &input.start_time,
                    &input.end_time,
                ],
            )
            .await
            .map_err(internal_error)?
            .ok_or_else(|| Error::from_string("试卷不存在", StatusCode::NOT_FOUND))?;

        let question_count = state
            .db
            .query_one(
                "SELECT COUNT(*)::bigint AS total FROM test_questions WHERE test_paper_id = $1",
                &[&id.0],
            )
            .await
            .map_err(internal_error)?
            .get::<_, i64>("total");

        let mut data = map_test_paper_row(&row);
        data.question_count = question_count;

        Ok(Json(TestPaperDetailResponse {
            code: 200,
            message: "updated".to_string(),
            data,
        }))
    }

    /// 手动从题库添加题目到试卷
    #[oai(path = "/online-testing/test-papers/:id/questions", method = "post")]
    async fn add_questions_to_test_paper(
        &self,
        state: Data<&AppState>,
        auth: BearerAuth,
        id: Path<String>,
        input: Json<AddPaperQuestionsInput>,
    ) -> poem::Result<Json<AddQuestionsResponse>> {
        ensure_roles(&auth.0, &["super_admin", "admin"])?;
        if input.question_ids.is_empty() {
            return Err(bad_request_error("请至少选择一道题目"));
        }

        let paper_exists = state
            .db
            .query_opt("SELECT id FROM test_papers WHERE id = $1", &[&id.0])
            .await
            .map_err(internal_error)?;
        if paper_exists.is_none() {
            return Err(Error::from_string("试卷不存在", StatusCode::NOT_FOUND));
        }

        let mut max_order = state
            .db
            .query_one(
                "SELECT COALESCE(MAX(order_num), 0) AS max_order FROM test_questions WHERE test_paper_id = $1",
                &[&id.0],
            )
            .await
            .map_err(internal_error)?
            .get::<_, i32>("max_order");

        let mut seen = HashSet::new();
        let mut added_count = 0;
        for question_id in &input.question_ids {
            if !seen.insert(question_id.clone()) {
                continue;
            }

            let exists_in_paper = state
                .db
                .query_opt(
                    "SELECT id FROM test_questions WHERE test_paper_id = $1 AND question_id = $2",
                    &[&id.0, question_id],
                )
                .await
                .map_err(internal_error)?;
            if exists_in_paper.is_some() {
                continue;
            }

            max_order += 1;
            let test_question_id = Uuid::new_v4().to_string();
            let inserted = state
                .db
                .execute(
                    "INSERT INTO test_questions (id, test_paper_id, question_id, order_num, points) \
                     SELECT $1, $2, q.id, $3, COALESCE($4::text::numeric, q.default_points) \
                     FROM questions q \
                     WHERE q.id = $5",
                    &[&test_question_id, &id.0, &max_order, &input.points_per_question, question_id],
                )
                .await
                .map_err(internal_error)?;
            if inserted > 0 {
                added_count += 1;
            }
        }

        Ok(Json(AddQuestionsResponse {
            code: 200,
            message: "added".to_string(),
            added_count,
        }))
    }

    /// 按条件从题库批量抽题并加入试卷
    #[oai(path = "/online-testing/test-papers/:id/auto-generate", method = "post")]
    async fn auto_generate_questions_for_test_paper(
        &self,
        state: Data<&AppState>,
        auth: BearerAuth,
        id: Path<String>,
        input: Json<AutoGeneratePaperQuestionsInput>,
    ) -> poem::Result<Json<AddQuestionsResponse>> {
        ensure_roles(&auth.0, &["super_admin", "admin"])?;
        if input.count <= 0 || input.count > 200 {
            return Err(bad_request_error("批量生成数量必须在 1 到 200 之间"));
        }

        let paper_exists = state
            .db
            .query_opt("SELECT id FROM test_papers WHERE id = $1", &[&id.0])
            .await
            .map_err(internal_error)?;
        if paper_exists.is_none() {
            return Err(Error::from_string("试卷不存在", StatusCode::NOT_FOUND));
        }

        let question_type = input
            .question_type
            .as_ref()
            .map(QuestionTypeDto::as_db_value)
            .map(str::to_string);
        let difficulty = input
            .difficulty
            .as_ref()
            .map(DifficultyDto::as_db_value)
            .map(str::to_string);
        let limit = i64::from(input.count);

        let candidates = state
            .db
            .query(
                "SELECT q.id \
                 FROM questions q \
                 WHERE q.bank_id = $1 \
                   AND ($2::text IS NULL OR q.question_type = $2::text::\"QuestionType\") \
                   AND ($3::text IS NULL OR q.difficulty = $3::text::\"Difficulty\") \
                   AND ($4::text IS NULL OR q.content ILIKE '%' || $4 || '%') \
                   AND NOT EXISTS ( \
                     SELECT 1 FROM test_questions tq \
                     WHERE tq.test_paper_id = $5 AND tq.question_id = q.id \
                   ) \
                 ORDER BY RANDOM() \
                 LIMIT $6",
                &[&input.bank_id, &question_type, &difficulty, &input.keyword, &id.0, &limit],
            )
            .await
            .map_err(internal_error)?;

        if candidates.is_empty() {
            return Err(bad_request_error("没有可加入试卷的题目（可能已全部加入或筛选条件过严）"));
        }

        let mut max_order = state
            .db
            .query_one(
                "SELECT COALESCE(MAX(order_num), 0) AS max_order FROM test_questions WHERE test_paper_id = $1",
                &[&id.0],
            )
            .await
            .map_err(internal_error)?
            .get::<_, i32>("max_order");

        let mut added_count = 0;
        for row in candidates {
            let question_id = row.get::<_, String>("id");
            max_order += 1;
            let test_question_id = Uuid::new_v4().to_string();
            state
                .db
                .execute(
                    "INSERT INTO test_questions (id, test_paper_id, question_id, order_num, points) \
                     SELECT $1, $2, q.id, $3, COALESCE($4::text::numeric, q.default_points) \
                     FROM questions q \
                     WHERE q.id = $5",
                    &[&test_question_id, &id.0, &max_order, &input.points_per_question, &question_id],
                )
                .await
                .map_err(internal_error)?;
            added_count += 1;
        }

        let message = if added_count < input.count {
            format!("部分生成：请求 {} 题，实际加入 {} 题", input.count, added_count)
        } else {
            "generated".to_string()
        };

        Ok(Json(AddQuestionsResponse {
            code: 200,
            message,
            added_count,
        }))
    }

    /// 从试卷移除已配置题目
    #[oai(path = "/online-testing/test-papers/:id/questions/:test_question_id", method = "delete")]
    async fn remove_question_from_test_paper(
        &self,
        state: Data<&AppState>,
        auth: BearerAuth,
        id: Path<String>,
        test_question_id: Path<String>,
    ) -> poem::Result<Json<BasicResponse>> {
        ensure_roles(&auth.0, &["super_admin", "admin"])?;

        let deleted = state
            .db
            .execute(
                "DELETE FROM test_questions WHERE id = $1 AND test_paper_id = $2",
                &[&test_question_id.0, &id.0],
            )
            .await
            .map_err(internal_error)?;
        if deleted == 0 {
            return Err(Error::from_string("试卷题目不存在", StatusCode::NOT_FOUND));
        }

        reorder_test_questions(state.db.as_ref(), &id.0).await?;

        Ok(Json(BasicResponse {
            code: 200,
            message: "deleted".to_string(),
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

        let (computed_answer, options) = build_answer_and_options(
            &input.question_type,
            input.option_count,
            &input.option_texts,
            &input.correct_option_orders,
        )?;
        let question_type = input.question_type.as_db_value().to_string();
        let difficulty = input
            .difficulty
            .as_ref()
            .map(DifficultyDto::as_db_value)
            .map(str::to_string);
        let answer = input.answer.clone().unwrap_or(computed_answer);
        let question_id = Uuid::new_v4().to_string();
        let params: [&(dyn ToSql + Sync); 9] = [
            &question_id,
            &input.bank_id,
            &question_type,
            &input.content,
            &answer,
            &input.explanation,
            &input.default_points,
            &difficulty,
            &input.knowledge_point,
        ];
        let question = state
            .db
            .query_one(
                "INSERT INTO questions \
                    (id, bank_id, question_type, content, answer, explanation, default_points, difficulty, knowledge_point, created_at, updated_at) \
                 VALUES \
                    ($1, $2, $3::text::\"QuestionType\", $4, $5, $6, $7::text::numeric, $8::text::\"Difficulty\", $9, NOW(), NOW()) \
                 RETURNING id, bank_id, question_type::text AS question_type, content, answer, explanation, \
                           default_points::text AS default_points, difficulty::text AS difficulty, \
                           knowledge_point, created_at::text AS created_at, updated_at::text AS updated_at",
                &params,
            )
            .await
            .map_err(internal_error)?;

        for (option_order, option_text, is_correct) in options {
                let option_id = Uuid::new_v4().to_string();
                let option_params: [&(dyn ToSql + Sync); 5] = [
                    &option_id,
                    &question_id,
                    &option_text,
                    &option_order,
                    &is_correct,
                ];
                state
                    .db
                    .execute(
                    "INSERT INTO question_options (id, question_id, option_text, option_order, is_correct) \
                     VALUES ($1, $2, $3, $4, $5)",
                    &option_params,
                )
                .await
                .map_err(internal_error)?;
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

        let (computed_answer, options) = build_answer_and_options(
            &input.question_type,
            input.option_count,
            &input.option_texts,
            &input.correct_option_orders,
        )?;
        let question_type = input.question_type.as_db_value().to_string();
        let difficulty = input
            .difficulty
            .as_ref()
            .map(DifficultyDto::as_db_value)
            .map(str::to_string);
        let answer = input.answer.clone().unwrap_or(computed_answer);
        let params: [&(dyn ToSql + Sync); 9] = [
            &id.0,
            &input.bank_id,
            &question_type,
            &input.content,
            &answer,
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
                     question_type = $3::text::\"QuestionType\", \
                     content = $4, \
                     answer = $5, \
                     explanation = $6, \
                     default_points = $7::text::numeric, \
                     difficulty = $8::text::\"Difficulty\", \
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

        let delete_params: [&(dyn ToSql + Sync); 1] = [&id.0];
        state
            .db
            .execute(
                "DELETE FROM question_options WHERE question_id = $1",
                &delete_params,
            )
            .await
            .map_err(internal_error)?;
        for (option_order, option_text, is_correct) in options {
                let option_id = Uuid::new_v4().to_string();
                let option_params: [&(dyn ToSql + Sync); 5] = [
                    &option_id,
                    &id.0,
                    &option_text,
                    &option_order,
                    &is_correct,
                ];
                state
                    .db
                    .execute(
                    "INSERT INTO question_options (id, question_id, option_text, option_order, is_correct) \
                     VALUES ($1, $2, $3, $4, $5)",
                    &option_params,
                )
                .await
                .map_err(internal_error)?;
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

    // ==================== 学生答题流程 ====================

    /// 发布试卷（将草稿状态改为已发布）
    #[oai(path = "/online-testing/test-papers/:id/publish", method = "post")]
    async fn publish_test_paper(
        &self,
        state: Data<&AppState>,
        auth: BearerAuth,
        id: Path<String>,
    ) -> poem::Result<Json<BasicResponse>> {
        ensure_roles(&auth.0, &["super_admin", "admin"])?;

        let row = state
            .db
            .query_opt(
                "SELECT status::text AS status FROM test_papers WHERE id = $1",
                &[&id.0],
            )
            .await
            .map_err(internal_error)?
            .ok_or_else(|| Error::from_string("试卷不存在", StatusCode::NOT_FOUND))?;

        let current_status = row.get::<_, String>("status");
        if current_status != "DRAFT" {
            return Err(bad_request_error("只能发布草稿状态的试卷"));
        }

        // 检查是否有题目
        let question_count: i64 = state
            .db
            .query_one(
                "SELECT COUNT(*)::bigint AS total FROM test_questions WHERE test_paper_id = $1",
                &[&id.0],
            )
            .await
            .map_err(internal_error)?
            .get("total");
        if question_count == 0 {
            return Err(bad_request_error("试卷没有题目，请先添加题目后再发布"));
        }

        state
            .db
            .execute(
                "UPDATE test_papers SET status = 'PUBLISHED'::\"PaperStatus\" WHERE id = $1",
                &[&id.0],
            )
            .await
            .map_err(internal_error)?;

        Ok(Json(BasicResponse {
            code: 200,
            message: "published".to_string(),
        }))
    }

    /// 关闭试卷（将已发布改为已关闭）
    #[oai(path = "/online-testing/test-papers/:id/close", method = "post")]
    async fn close_test_paper(
        &self,
        state: Data<&AppState>,
        auth: BearerAuth,
        id: Path<String>,
    ) -> poem::Result<Json<BasicResponse>> {
        ensure_roles(&auth.0, &["super_admin", "admin"])?;

        let row = state
            .db
            .query_opt(
                "SELECT status::text AS status FROM test_papers WHERE id = $1",
                &[&id.0],
            )
            .await
            .map_err(internal_error)?
            .ok_or_else(|| Error::from_string("试卷不存在", StatusCode::NOT_FOUND))?;

        let current_status = row.get::<_, String>("status");
        if current_status != "PUBLISHED" {
            return Err(bad_request_error("只能关闭已发布状态的试卷"));
        }

        state
            .db
            .execute(
                "UPDATE test_papers SET status = 'CLOSED'::\"PaperStatus\" WHERE id = $1",
                &[&id.0],
            )
            .await
            .map_err(internal_error)?;

        Ok(Json(BasicResponse {
            code: 200,
            message: "closed".to_string(),
        }))
    }

    /// 学生开始答题（获取试卷题目，创建答题记录）
    #[oai(path = "/online-testing/test-papers/:id/start", method = "post")]
    async fn start_exam(
        &self,
        state: Data<&AppState>,
        auth: BearerAuth,
        id: Path<String>,
    ) -> poem::Result<Json<StartExamResponse>> {
        ensure_roles(&auth.0, &["student"])?;
        let user_id = &auth.0.user_id;

        // 验证学生身份
        let student_row = state
            .db
            .query_opt(
                "SELECT user_id FROM students WHERE user_id = $1",
                &[&user_id],
            )
            .await
            .map_err(internal_error)?
            .ok_or_else(|| Error::from_string("只有学生可以答题", StatusCode::FORBIDDEN))?;
        let student_id: String = student_row.get("user_id");
        tracing::info!("学生 {} 开始答题试卷 {}", student_id, id.0);
        // 获取试卷信息
        let paper = state
            .db
            .query_opt(
                "SELECT id, title, duration_minutes, \
                        COALESCE((SELECT SUM(points) FROM test_questions WHERE test_paper_id = $1), total_points)::text AS total_points, \
                        start_time::text AS start_time, end_time::text AS end_time, status::text AS status \
                 FROM test_papers \
                 WHERE id = $1",
                &[&id.0],
            )
            .await
            .map_err(internal_error)?
            .ok_or_else(|| Error::from_string("试卷不存在", StatusCode::NOT_FOUND))?;
        let paper_status: String = paper.get("status");
        if paper_status != "PUBLISHED" {
            return Err(bad_request_error("该试卷当前不可作答"));
        }

        // 检查考试时间窗口
        if let (Some(start_str), Some(end_str)) = (
            paper.get::<_, Option<String>>("start_time"),
            paper.get::<_, Option<String>>("end_time"),
        ) {
            let now = chrono::Utc::now();
            let start = parse_db_timestamp(&start_str);
            let end = parse_db_timestamp(&end_str);
            if now < start {
                return Err(bad_request_error("考试尚未开始"));
            }
            if now > end {
                return Err(bad_request_error("考试已结束"));
            }
        } else {
            tracing::warn!("试卷 {} 没有设置考试时间窗口，默认允许作答", id.0);
        }

        // 检查是否已交卷
        let already_graded = state
            .db
            .query_opt(
                "SELECT id FROM test_results \
                 WHERE test_paper_id = $1 AND student_id = $2 AND status = 'GRADED'",
                &[&id.0, &student_id],
            )
            .await
            .map_err(internal_error)?;
        if already_graded.is_some() {
            return Err(bad_request_error("你已完成该试卷，无法再次作答"));
        }

        // 检查是否已有进行中的答题
        let existing = state
            .db
            .query_opt(
                "SELECT id, start_time::text AS start_time, time_spent_seconds \
                 FROM test_results \
                 WHERE test_paper_id = $1 AND student_id = $2 AND status = 'IN_PROGRESS'",
                &[&id.0, &student_id],
            )
            .await
            .map_err(internal_error)?;

        // 如果已有进行中的答题，恢复它
        if let Some(row) = existing {
            let existing_id: String = row.get("id");
            let existing_start: String = row.get("start_time");
            let elapsed = {
                let start_dt = parse_db_timestamp(&existing_start);
                (chrono::Utc::now() - start_dt).num_seconds() as i32
            };
            let duration_secs = paper.get::<_, i32>("duration_minutes") * 60;
            let remaining = (duration_secs - elapsed).max(0);
            // 加载题目（复用后面的查询逻辑，这里简化）
            let tq_rows = state.db.query(
                "SELECT tq.id AS test_question_id, tq.question_id, tq.order_num, tq.points::text AS points, \
                        q.question_type::text AS question_type, q.content \
                 FROM test_questions tq JOIN questions q ON q.id = tq.question_id \
                 WHERE tq.test_paper_id = $1 ORDER BY tq.order_num ASC, tq.id ASC",
                &[&id.0],
            ).await.map_err(internal_error)?;
            let mut questions = Vec::with_capacity(tq_rows.len());
            for tq_row in tq_rows {
                let qid: String = tq_row.get("question_id");
                let tqid: String = tq_row.get("test_question_id");
                let opts = state.db.query(
                    "SELECT id, option_text, option_order FROM question_options WHERE question_id = $1 ORDER BY option_order ASC",
                    &[&qid],
                ).await.map_err(internal_error)?;
                let options: Vec<TestPaperStudentOptionData> = opts.into_iter()
                    .map(|r| TestPaperStudentOptionData { id: r.get("id"), option_text: r.get("option_text"), option_order: r.get("option_order") })
                    .collect();
                questions.push(TestPaperStudentQuestionData {
                    test_question_id: tqid, question_id: qid,
                    question_type: parse_question_type(&tq_row.get::<_, String>("question_type")),
                    content: tq_row.get("content"), points: tq_row.get("points"),
                    order_num: tq_row.get("order_num"), options,
                });
            }
            return Ok(Json(StartExamResponse {
                code: 200, message: "resumed".to_string(),
                data: StartExamData {
                    paper_title: paper.get("title"),
                    duration_minutes: paper.get("duration_minutes"),
                    question_count: questions.len(),
                    total_points: paper.get("total_points"),
                    questions,
                    start_time: existing_start,
                    test_result_id: existing_id,
                    remaining_seconds: Some(remaining),
                    end_time: paper.get::<_, Option<String>>("end_time"),
                },
            }));
        }

        // 创建答题记录
        let test_result_id = Uuid::new_v4().to_string();
        let start_time_str = chrono::Utc::now().to_rfc3339();

        state
            .db
            .execute(
                "INSERT INTO test_results (id, test_paper_id, student_id, start_time, status) \
                 VALUES ($1, $2, $3, $4::text::timestamp, 'IN_PROGRESS')",
                &[&test_result_id, &id.0, &student_id, &start_time_str],
            )
            .await
            .map_err(internal_error)?;

        // 查询试卷题目（不含正确答案）
        let tq_rows = state
            .db
            .query(
                "SELECT tq.id AS test_question_id, tq.question_id, tq.order_num, tq.points::text AS points, \
                        q.question_type::text AS question_type, q.content \
                 FROM test_questions tq \
                 JOIN questions q ON q.id = tq.question_id \
                 WHERE tq.test_paper_id = $1 \
                 ORDER BY tq.order_num ASC, tq.id ASC",
                &[&id.0],
            )
            .await
            .map_err(internal_error)?;

        let mut questions = Vec::with_capacity(tq_rows.len());
        for tq_row in tq_rows {
            let question_id: String = tq_row.get("question_id");
            let test_question_id: String = tq_row.get("test_question_id");

            // 查询选项（不含 is_correct）
            let opt_rows = state
                .db
                .query(
                    "SELECT id, option_text, option_order \
                     FROM question_options \
                     WHERE question_id = $1 \
                     ORDER BY option_order ASC",
                    &[&question_id],
                )
                .await
                .map_err(internal_error)?;

            let options: Vec<TestPaperStudentOptionData> = opt_rows
                .into_iter()
                .map(|row| TestPaperStudentOptionData {
                    id: row.get("id"),
                    option_text: row.get("option_text"),
                    option_order: row.get("option_order"),
                })
                .collect();

            questions.push(TestPaperStudentQuestionData {
                test_question_id,
                question_id,
                question_type: parse_question_type(&tq_row.get::<_, String>("question_type")),
                content: tq_row.get("content"),
                points: tq_row.get("points"),
                order_num: tq_row.get("order_num"),
                options,
            });
        }

        let paper_title: String = paper.get("title");
        let duration_minutes: i32 = paper.get("duration_minutes");
        let total_points: String = paper.get("total_points");

        Ok(Json(StartExamResponse {
            code: 200,
            message: "success".to_string(),
            data: StartExamData {
                paper_title,
                duration_minutes,
                question_count: questions.len(),
                total_points,
                questions,
                start_time: start_time_str,
                test_result_id,
                remaining_seconds: None,
                end_time: paper.get::<_, Option<String>>("end_time"),
            },
        }))
    }

    /// 提交答案（自动评分）
    #[oai(path = "/online-testing/test-results/:id/submit", method = "post")]
    async fn submit_answers(
        &self,
        state: Data<&AppState>,
        auth: BearerAuth,
        id: Path<String>,
        input: Json<SubmitAnswersInput>,
    ) -> poem::Result<Json<SubmitExamResponse>> {
        ensure_roles(&auth.0, &["student"])?;
        let user_id = &auth.0.user_id;

        // 验证答题记录
        let result_row = state
            .db
            .query_opt(
                "SELECT tr.id, tr.test_paper_id, tr.student_id, tr.start_time::text AS start_time, \
                        tr.status::text AS status, \
                        tp.total_points::text AS total_points \
                 FROM test_results tr \
                 JOIN test_papers tp ON tp.id = tr.test_paper_id \
                 WHERE tr.id = $1",
                &[&id.0],
            )
            .await
            .map_err(internal_error)?
            .ok_or_else(|| Error::from_string("答题记录不存在", StatusCode::NOT_FOUND))?;

        let status: String = result_row.get("status");
        if status != "IN_PROGRESS" {
            return Err(bad_request_error("该答题已经提交或已结束"));
        }

        let student_id: String = result_row.get("student_id");
        if student_id != *user_id {
            return Err(Error::from_string("无权操作他人的答题", StatusCode::FORBIDDEN));
        }

        let test_paper_id: String = result_row.get("test_paper_id");
        let start_time: String = result_row.get("start_time");
        let paper_total_points: String = result_row.get("total_points");

        // 计算耗时
        let time_spent = {
            let start_dt = parse_db_timestamp(&start_time);
            (chrono::Utc::now() - start_dt).num_seconds() as i32
        };

        // 获取试卷的所有题目及其正确答案
        let tq_rows = state
            .db
            .query(
                "SELECT tq.id AS test_question_id, tq.question_id, tq.points::text AS points, \
                        q.question_type::text AS question_type, q.answer AS correct_answer, \
                        q.content \
                 FROM test_questions tq \
                 JOIN questions q ON q.id = tq.question_id \
                 WHERE tq.test_paper_id = $1 \
                 ORDER BY tq.order_num ASC, tq.id ASC",
                &[&test_paper_id],
            )
            .await
            .map_err(internal_error)?;

        // 构建正确答案映射
        let mut correct_map: HashMap<String, (String, String, String, String)> = HashMap::new();
        for row in &tq_rows {
            let tq_id: String = row.get("test_question_id");
            let correct: String = row.get("correct_answer");
            let qtype: String = row.get("question_type");
            let points: String = row.get("points");
            let content: String = row.get("content");
            correct_map.insert(tq_id, (correct, qtype, points, content));
        }

        // 构建学生答案映射
        let student_answers: HashMap<String, Option<String>> = input
            .answers
            .iter()
            .map(|item| (item.test_question_id.clone(), item.student_answer.clone()))
            .collect();

        // 逐题评分
        let mut graded_answers = Vec::new();
        let mut total_score = rust_decimal::Decimal::ZERO;
        let mut correct_count = 0i32;
        let mut graded_count = 0i32;

        for row in &tq_rows {
            let tq_id: String = row.get("test_question_id");
            let (correct_answer, qtype, points_str, content) = correct_map
                .get(&tq_id)
                .cloned()
                .unwrap_or_default();

            let student_answer = student_answers.get(&tq_id).cloned().flatten();

            let points: rust_decimal::Decimal = points_str.parse().unwrap_or(rust_decimal::Decimal::ZERO);

            let is_correct = match student_answer.as_deref() {
                Some(ans) => {
                    if qtype == "MULTI_CHOICE" {
                        // 多选题：排序后比对
                        let mut student_parts: Vec<&str> = ans.split(',').map(str::trim).filter(|s| !s.is_empty()).collect();
                        student_parts.sort_unstable();
                        let mut correct_parts: Vec<&str> = correct_answer.split(',').map(str::trim).filter(|s| !s.is_empty()).collect();
                        correct_parts.sort_unstable();
                        student_parts == correct_parts
                    } else {
                        // 单选/判断：直接比对
                        ans.trim() == correct_answer.trim()
                    }
                }
                None => false,
            };

            let score = if is_correct { points } else { rust_decimal::Decimal::ZERO };

            graded_answers.push(GradedAnswerData {
                test_question_id: tq_id.clone(),
                question_content: content,
                student_answer: student_answer.clone(),
                correct_answer,
                is_correct,
                score: score.to_string(),
                points: points_str,
            });

            total_score += score;
            if is_correct {
                correct_count += 1;
            }
            graded_count += 1;
        }

        // 保存答案到 answers 表
        for answer_item in &graded_answers {
            let answer_id = Uuid::new_v4().to_string();
            state
                .db
                .execute(
                    "INSERT INTO answers (id, test_result_id, test_question_id, student_answer, is_correct, score) \
                     VALUES ($1, $2, $3, $4, $5, $6::text::numeric)",
                    &[
                        &answer_id,
                        &id.0,
                        &answer_item.test_question_id,
                        &answer_item.student_answer,
                        &answer_item.is_correct,
                        &answer_item.score,
                    ],
                )
                .await
                .map_err(internal_error)?;
        }

        // 更新 test_results 状态
        let submit_now = chrono::Utc::now().to_rfc3339();
        let total_score_str = total_score.to_string();
        state
            .db
            .execute(
                "UPDATE test_results \
                 SET submit_time = $2::text::timestamptz, \
                     total_score = $3::text::numeric, \
                     status = 'GRADED', \
                     time_spent_seconds = $4 \
                 WHERE id = $1",
                &[&id.0, &submit_now, &total_score_str, &time_spent],
            )
            .await
            .map_err(internal_error)?;

        Ok(Json(SubmitExamResponse {
            code: 200,
            message: "submitted".to_string(),
            data: SubmitExamData {
                test_result_id: id.0.clone(),
                total_score: total_score.to_string(),
                total_points: paper_total_points,
                graded_count,
                correct_count,
                time_spent_seconds: Some(time_spent),
                answers: graded_answers,
            },
        }))
    }

    /// 学生查看自己的答题记录列表
    #[oai(path = "/online-testing/test-results/my", method = "get")]
    async fn list_my_results(
        &self,
        state: Data<&AppState>,
        auth: BearerAuth,
    ) -> poem::Result<Json<TestResultListResponse>> {
        ensure_roles(&auth.0, &["student"])?;
        let user_id = &auth.0.user_id;

        let rows = state
            .db
            .query(
                "SELECT tr.id, tr.test_paper_id, tp.title AS paper_title, \
                        tr.start_time::text AS start_time, \
                        tr.submit_time::text AS submit_time, \
                        tr.total_score::text AS total_score, \
                        tr.status::text AS status, \
                        tr.time_spent_seconds \
                 FROM test_results tr \
                 JOIN test_papers tp ON tp.id = tr.test_paper_id \
                 WHERE tr.student_id = $1 \
                 ORDER BY tr.start_time DESC",
                &[&user_id],
            )
            .await
            .map_err(internal_error)?;

        let data = rows
            .into_iter()
            .map(|row| TestResultListItemData {
                id: row.get("id"),
                test_paper_id: row.get("test_paper_id"),
                paper_title: row.get("paper_title"),
                start_time: row.get("start_time"),
                submit_time: row.get("submit_time"),
                total_score: row.get("total_score"),
                status: row.get::<_, String>("status").to_lowercase(),
                time_spent_seconds: row.get("time_spent_seconds"),
            })
            .collect();

        Ok(Json(TestResultListResponse {
            code: 200,
            message: "success".to_string(),
            data,
        }))
    }

    /// 查看某次答题的详细结果（含每题判分）
    #[oai(path = "/online-testing/test-results/:id", method = "get")]
    async fn get_test_result_detail(
        &self,
        state: Data<&AppState>,
        auth: BearerAuth,
        id: Path<String>,
    ) -> poem::Result<Json<TestResultDetailResponse>> {
        let user_id = &auth.0.user_id;
        let roles = &auth.0.roles;

        // 验证答题记录存在且归属正确（学生只能看自己的，教师和管理员可看任意）
        let result_row = state
            .db
            .query_opt(
                "SELECT tr.id, tr.test_paper_id, tr.student_id, \
                        tr.total_score::text AS total_score, \
                        tr.time_spent_seconds, \
                        tp.total_points::text AS total_points \
                 FROM test_results tr \
                 JOIN test_papers tp ON tp.id = tr.test_paper_id \
                 WHERE tr.id = $1",
                &[&id.0],
            )
            .await
            .map_err(internal_error)?
            .ok_or_else(|| Error::from_string("答题记录不存在", StatusCode::NOT_FOUND))?;

        let student_id: String = result_row.get("student_id");

        // 权限检查：学生只能看自己的
        if roles.iter().any(|r| r == "student") && student_id != *user_id {
            return Err(Error::from_string("无权查看他人的答题记录", StatusCode::FORBIDDEN));
        }

        let _test_paper_id: String = result_row.get("test_paper_id");
        let total_score: Option<String> = result_row.get("total_score");
        let time_spent: Option<i32> = result_row.get("time_spent_seconds");
        let paper_total_points: String = result_row.get("total_points");

        // 查询各题判分详情
        let answer_rows = state
            .db
            .query(
                "SELECT a.test_question_id, a.student_answer, a.is_correct, a.score::text AS score, \
                        tq.points::text AS points, tq.question_id, \
                        q.content AS question_content, q.answer AS correct_answer \
                 FROM answers a \
                 JOIN test_questions tq ON tq.id = a.test_question_id \
                 JOIN questions q ON q.id = tq.question_id \
                 WHERE a.test_result_id = $1 \
                 ORDER BY tq.order_num ASC, tq.id ASC",
                &[&id.0],
            )
            .await
            .map_err(internal_error)?;

        let mut answers = Vec::new();
        let mut correct_count = 0i32;
        let mut graded_count = 0i32;

        for row in answer_rows {
            let is_correct: bool = row.get("is_correct");
            if is_correct {
                correct_count += 1;
            }
            graded_count += 1;

            let score_val: rust_decimal::Decimal = row.get::<_, Option<String>>("score")
                .and_then(|s| s.parse().ok())
                .unwrap_or_default();

            answers.push(GradedAnswerData {
                test_question_id: row.get("test_question_id"),
                question_content: row.get("question_content"),
                student_answer: row.get("student_answer"),
                correct_answer: row.get("correct_answer"),
                is_correct,
                score: score_val.to_string(),
                points: row.get("points"),
            });
        }

        let total_score_str = total_score.unwrap_or_else(|| "0".to_string());

        Ok(Json(TestResultDetailResponse {
            code: 200,
            message: "success".to_string(),
            data: SubmitExamData {
                test_result_id: id.0.clone(),
                total_score: total_score_str,
                total_points: paper_total_points,
                graded_count,
                correct_count,
                time_spent_seconds: time_spent,
                answers,
            },
        }))
    }

    /// 教师/管理员查看某试卷的所有学生成绩
    #[oai(path = "/online-testing/test-papers/:id/results", method = "get")]
    async fn get_paper_results(
        &self,
        state: Data<&AppState>,
        auth: BearerAuth,
        id: Path<String>,
    ) -> poem::Result<Json<PaperResultsResponse>> {
        ensure_roles(&auth.0, &["super_admin", "admin", "teacher"])?;

        // 验证试卷存在
        let _paper = state
            .db
            .query_opt("SELECT id FROM test_papers WHERE id = $1", &[&id.0])
            .await
            .map_err(internal_error)?
            .ok_or_else(|| Error::from_string("试卷不存在", StatusCode::NOT_FOUND))?;

        let rows = state
            .db
            .query(
                "SELECT tr.id, tr.student_id, u.real_name AS student_name, \
                        tr.total_score::text AS total_score, tr.status::text AS status, \
                        tr.time_spent_seconds, tr.submit_time::text AS submit_time \
                 FROM test_results tr \
                 JOIN users u ON u.id = tr.student_id \
                 WHERE tr.test_paper_id = $1 \
                 ORDER BY tr.id DESC",
                &[&id.0],
            )
            .await
            .map_err(internal_error)?;

        let data = rows
            .into_iter()
            .map(|row| PaperResultItem {
                id: row.get("id"),
                student_id: row.get("student_id"),
                student_name: row.get("student_name"),
                total_score: row.get("total_score"),
                status: row.get::<_, String>("status").to_lowercase(),
                time_spent_seconds: row.get("time_spent_seconds"),
                submit_time: row.get("submit_time"),
            })
            .collect();

        Ok(Json(PaperResultsResponse { code: 200, message: "success".to_string(), data }))
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