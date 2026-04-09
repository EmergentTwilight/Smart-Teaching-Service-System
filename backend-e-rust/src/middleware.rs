use std::{sync::Arc, time::Instant};

use jsonwebtoken::{decode, DecodingKey, Validation};
use poem::{
    http::{header, HeaderName, HeaderValue, StatusCode},
    web::Json,
    Endpoint, IntoResponse, Middleware, Request, Response,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Debug)]
pub struct RequestId(pub String);

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct JwtPayload {
    #[serde(rename = "userId")]
    pub user_id: String,
    pub username: String,
    pub roles: Vec<String>,
    pub exp: usize,
}

#[derive(Serialize)]
struct ErrorResponse {
    code: u16,
    message: String,
    #[serde(rename = "requestId", skip_serializing_if = "Option::is_none")]
    request_id: Option<String>,
}

fn make_error_response(
    status: StatusCode,
    message: impl Into<String>,
    request_id: Option<String>,
) -> Response {
    let body = ErrorResponse {
        code: status.as_u16(),
        message: message.into(),
        request_id,
    };
    (status, Json(body)).into_response()
}

pub struct RequestLoggerMiddleware;

impl<E: Endpoint> Middleware<E> for RequestLoggerMiddleware {
    type Output = RequestLoggerEndpoint<E>;

    fn transform(&self, ep: E) -> Self::Output {
        RequestLoggerEndpoint { ep }
    }
}

pub struct RequestLoggerEndpoint<E> {
    ep: E,
}

impl<E> Endpoint for RequestLoggerEndpoint<E>
where
    E: Endpoint,
    E::Output: IntoResponse,
{
    type Output = Response;

    fn call(
        &self,
        mut req: Request,
    ) -> impl std::future::Future<Output = poem::Result<Self::Output>> + Send {
        let request_id = Uuid::new_v4().to_string();
        let method = req.method().to_string();
        let path = req.uri().path().to_string();
        let start = Instant::now();
        let ep = &self.ep;

        req.extensions_mut().insert(RequestId(request_id.clone()));

        async move {
            let mut resp = ep.call(req).await?.into_response();

            if let Ok(header_value) = HeaderValue::from_str(&request_id) {
                resp.headers_mut()
                    .insert(HeaderName::from_static("x-request-id"), header_value);
            }

            tracing::info!(
                request_id = %request_id,
                method = %method,
                path = %path,
                status_code = resp.status().as_u16(),
                duration_ms = start.elapsed().as_millis(),
                "request completed"
            );

            Ok(resp)
        }
    }
}

pub struct ErrorTransformMiddleware;

impl<E: Endpoint> Middleware<E> for ErrorTransformMiddleware {
    type Output = ErrorTransformEndpoint<E>;

    fn transform(&self, ep: E) -> Self::Output {
        ErrorTransformEndpoint { ep }
    }
}

pub struct ErrorTransformEndpoint<E> {
    ep: E,
}

impl<E> Endpoint for ErrorTransformEndpoint<E>
where
    E: Endpoint,
    E::Output: IntoResponse,
{
    type Output = Response;

    fn call(
        &self,
        req: Request,
    ) -> impl std::future::Future<Output = poem::Result<Self::Output>> + Send {
        let request_id = req.extensions().get::<RequestId>().map(|v| v.0.clone());
        let ep = &self.ep;

        async move {
            match ep.call(req).await {
                Ok(resp) => Ok(resp.into_response()),
                Err(err) => {
                    let status = err.status();
                    tracing::error!(
                        request_id = ?request_id,
                        status_code = status.as_u16(),
                        error = %err,
                        "request failed"
                    );

                    Ok(make_error_response(status, err.to_string(), request_id))
                }
            }
        }
    }
}

#[derive(Clone)]
pub struct AuthMiddleware {
    jwt_secret: Arc<str>,
}

impl AuthMiddleware {
    pub fn new(jwt_secret: String) -> Self {
        Self {
            jwt_secret: Arc::from(jwt_secret),
        }
    }
}

impl<E: Endpoint> Middleware<E> for AuthMiddleware {
    type Output = AuthEndpoint<E>;

    fn transform(&self, ep: E) -> Self::Output {
        AuthEndpoint {
            ep,
            jwt_secret: self.jwt_secret.clone(),
        }
    }
}

pub struct AuthEndpoint<E> {
    ep: E,
    jwt_secret: Arc<str>,
}

impl<E> Endpoint for AuthEndpoint<E>
where
    E: Endpoint,
    E::Output: IntoResponse,
{
    type Output = Response;

    fn call(
        &self,
        mut req: Request,
    ) -> impl std::future::Future<Output = poem::Result<Self::Output>> + Send {
        let ep = &self.ep;
        let jwt_secret = self.jwt_secret.clone();

        async move {
            let request_id = req.extensions().get::<RequestId>().map(|v| v.0.clone());
            let auth_header = req
                .headers()
                .get(header::AUTHORIZATION)
                .and_then(|v| v.to_str().ok())
                .unwrap_or_default()
                .to_string();

            if !auth_header.starts_with("Bearer ") {
                return Ok(make_error_response(
                    StatusCode::UNAUTHORIZED,
                    "未提供认证令牌",
                    request_id,
                ));
            }

            let token = auth_header.trim_start_matches("Bearer ").trim();
            match decode::<JwtPayload>(
                token,
                &DecodingKey::from_secret(jwt_secret.as_bytes()),
                &Validation::default(),
            ) {
                Ok(data) => {
                    req.extensions_mut().insert(data.claims);
                    Ok(ep.call(req).await?.into_response())
                }
                Err(_) => Ok(make_error_response(
                    StatusCode::UNAUTHORIZED,
                    "无效或过期的令牌",
                    request_id,
                )),
            }
        }
    }
}

#[derive(Clone)]
pub struct RequireRolesMiddleware {
    roles: Arc<[String]>,
}

impl RequireRolesMiddleware {
    pub fn new<I, S>(roles: I) -> Self
    where
        I: IntoIterator<Item = S>,
        S: Into<String>,
    {
        Self {
            roles: roles.into_iter().map(Into::into).collect::<Vec<_>>().into(),
        }
    }
}

impl<E: Endpoint> Middleware<E> for RequireRolesMiddleware {
    type Output = RequireRolesEndpoint<E>;

    fn transform(&self, ep: E) -> Self::Output {
        RequireRolesEndpoint {
            ep,
            roles: self.roles.clone(),
        }
    }
}

pub struct RequireRolesEndpoint<E> {
    ep: E,
    roles: Arc<[String]>,
}

impl<E> Endpoint for RequireRolesEndpoint<E>
where
    E: Endpoint,
    E::Output: IntoResponse,
{
    type Output = Response;

    fn call(
        &self,
        req: Request,
    ) -> impl std::future::Future<Output = poem::Result<Self::Output>> + Send {
        let ep = &self.ep;
        let roles = self.roles.clone();
        async move {
            let request_id = req.extensions().get::<RequestId>().map(|v| v.0.clone());
            let claims = req.extensions().get::<JwtPayload>().cloned();
            let Some(user) = claims else {
                return Ok(make_error_response(
                    StatusCode::UNAUTHORIZED,
                    "未认证",
                    request_id,
                ));
            };

            let has_role = user
                .roles
                .iter()
                .any(|role| roles.iter().any(|v| v == role));
            if !has_role {
                return Ok(make_error_response(
                    StatusCode::FORBIDDEN,
                    "权限不足",
                    request_id,
                ));
            }

            Ok(ep.call(req).await?.into_response())
        }
    }
}
