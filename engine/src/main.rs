mod cache;
mod graph;
mod logging;
mod routes;
mod state;
mod transition;

use std::path::PathBuf;

use axum::extract::Request;
use axum::http::StatusCode;
use axum::middleware::Next;
use axum::response::Response;
use bytes::Bytes;
use tracing_subscriber::EnvFilter;

use cache::file::FileCache;
use cache::redis::RedisCache;

#[derive(Clone)]
pub struct AppState {
    pub memory_cache: moka::future::Cache<String, Bytes>,
    pub redis_cache: Option<RedisCache>,
    pub file_cache: FileCache,
    pub schema_version: String,
}

async fn require_api_key(req: Request, next: Next) -> Result<Response, StatusCode> {
    let expected = std::env::var("ENGINE_API_KEY").unwrap_or_default();
    match req.headers().get("x-api-key") {
        Some(key) if key == expected.as_str() => Ok(next.run(req).await),
        _ => Err(StatusCode::UNAUTHORIZED),
    }
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .json()
        .with_env_filter(
            EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")),
        )
        .init();

    let cache_dir = std::env::var("CACHE_DIR").unwrap_or_else(|_| "/app/cache".to_string());
    let redis_url = std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://redis:6379".to_string());

    let memory_cache = cache::memory::build_memory_cache();
    let file_cache = FileCache::new(PathBuf::from(cache_dir)).await;

    let redis_cache = match RedisCache::new(&redis_url).await {
        Ok(rc) => {
            tracing::info!(event = "redis_connected", "connected to Redis");
            Some(rc)
        }
        Err(e) => {
            tracing::warn!(event = "redis_unavailable", error = %e, "Redis unavailable, running without it");
            None
        }
    };

    let schema_version = std::env::var("SCHEMA_VERSION").unwrap_or_else(|_| "1".into());

    let app_state = AppState {
        memory_cache,
        redis_cache,
        file_cache,
        schema_version,
    };

    let protected = routes::protected()
        .layer(axum::middleware::from_fn(require_api_key))
        .with_state(app_state.clone());

    let app = axum::Router::new()
        .nest("/v1", protected)
        .nest("/v1", routes::public())
        .layer(axum::middleware::from_fn(logging::wide_event_middleware));

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8000").await.unwrap();
    tracing::info!(
        event = "server_started",
        port = 8000,
        "listening on port 8000"
    );

    let precompute_state = app_state.clone();
    tokio::spawn(async move {
        cache::precompute::precompute(
            &precompute_state.memory_cache,
            precompute_state.redis_cache.as_ref(),
            &precompute_state.file_cache,
        )
        .await;
    });

    axum::serve(listener, app).await.unwrap();
}
