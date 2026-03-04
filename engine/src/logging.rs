use std::sync::{Arc, Mutex};
use std::time::Instant;

use axum::extract::Request;
use axum::middleware::Next;
use axum::response::Response;

#[derive(Default)]
pub struct WideEvent {
    pub num_props: Option<u8>,
    pub max_height: Option<u8>,
    pub compact: Option<bool>,
    pub reversed: Option<bool>,
    pub cache_hit_tier: Option<&'static str>,
    pub response_bytes: Option<usize>,
    pub error: Option<String>,
}

pub type WideEventHandle = Arc<Mutex<WideEvent>>;

pub async fn wide_event_middleware(mut req: Request, next: Next) -> Response {
    let request_id = req
        .headers()
        .get("x-request-id")
        .and_then(|v| v.to_str().ok())
        .map(String::from)
        .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
    let method = req.method().to_string();
    let path = req.uri().path().to_string();
    let query = req.uri().query().unwrap_or("").to_string();
    let commit_sha = option_env!("COMMIT_SHA").unwrap_or("unknown");
    let start = Instant::now();

    let wide_event: WideEventHandle = Arc::new(Mutex::new(WideEvent::default()));
    req.extensions_mut().insert(wide_event.clone());

    let response = next.run(req).await;

    let status = response.status().as_u16();
    let duration_ms = start.elapsed().as_secs_f64() * 1000.0;

    let we = wide_event.lock().unwrap();

    if status >= 400 {
        tracing::error!(
            service = "engine",
            version = env!("CARGO_PKG_VERSION"),
            commit_sha,
            request_id,
            method,
            path,
            query,
            status,
            duration_ms,
            num_props = we.num_props,
            max_height = we.max_height,
            compact = we.compact,
            reversed = we.reversed,
            cache_hit_tier = we.cache_hit_tier,
            response_bytes = we.response_bytes,
            error = we.error,
            "request"
        );
    } else {
        tracing::info!(
            service = "engine",
            version = env!("CARGO_PKG_VERSION"),
            commit_sha,
            request_id,
            method,
            path,
            query,
            status,
            duration_ms,
            num_props = we.num_props,
            max_height = we.max_height,
            compact = we.compact,
            reversed = we.reversed,
            cache_hit_tier = we.cache_hit_tier,
            response_bytes = we.response_bytes,
            error = we.error,
            "request"
        );
    }

    response
}
