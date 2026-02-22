use axum::body::Body;
use axum::extract::{Query, State as AxumState};
use axum::http::{StatusCode, header};
use axum::response::Response;
use axum::Extension;
use bytes::Bytes;

use crate::cache::memory::fits_in_memory;
use crate::cache::redis::fits_in_redis;
use crate::graph::GraphParams;
use crate::logging::WideEventHandle;
use crate::state::State;
use crate::transition::Transition;

pub async fn get_graph_query(
    AxumState(app): AxumState<crate::AppState>,
    Query(params): Query<GraphParams>,
    wide_event: Option<Extension<WideEventHandle>>,
) -> Result<Response, StatusCode> {
    build_graph_response(app, params, wide_event.map(|e| e.0)).await
}

async fn build_graph_response(
    app: crate::AppState,
    params: GraphParams,
    wide_event: Option<WideEventHandle>,
) -> Result<Response, StatusCode> {
    params.validate()?;

    if let Some(ref we) = wide_event {
        let mut we = we.lock().unwrap();
        we.num_balls = Some(params.num_balls);
        we.max_height = Some(params.max_height);
        we.compact = Some(params.compact);
    }

    let key = format!(
        "{}-{}-{}",
        params.num_balls, params.max_height, params.compact
    );

    if let Some(data) = app.memory_cache.get(&key).await {
        if let Some(ref we) = wide_event {
            let mut we = we.lock().unwrap();
            we.cache_hit_tier = Some("memory");
            we.response_bytes = Some(data.len());
        }
        return ok_response(Body::from(data));
    }

    if let Some(ref rc) = app.redis_cache
        && let Some(data) = rc.get(&key).await
    {
        if fits_in_memory(&data) {
            app.memory_cache
                .insert(key.clone(), Bytes::from(data.clone()))
                .await;
        }
        if let Some(ref we) = wide_event {
            let mut we = we.lock().unwrap();
            we.cache_hit_tier = Some("redis");
            we.response_bytes = Some(data.len());
        }
        return ok_response(Body::from(data));
    }

    if let Some(data) = app.file_cache.get(&key).await {
        if let Some(ref rc) = app.redis_cache
            && fits_in_redis(&data)
        {
            rc.put(&key, &data).await;
        }
        if fits_in_memory(&data) {
            app.memory_cache
                .insert(key.clone(), Bytes::from(data.clone()))
                .await;
        }
        if let Some(ref we) = wide_event {
            let mut we = we.lock().unwrap();
            we.cache_hit_tier = Some("file");
            we.response_bytes = Some(data.len());
        }
        return ok_response(Body::from(data));
    }

    let data = tokio::task::spawn_blocking(move || compute_graph(&params))
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    app.file_cache.put(&key, &data).await;
    if let Some(ref rc) = app.redis_cache
        && fits_in_redis(&data)
    {
        rc.put(&key, &data).await;
    }
    if fits_in_memory(&data) {
        app.memory_cache
            .insert(key, Bytes::from(data.clone()))
            .await;
    }

    if let Some(ref we) = wide_event {
        let mut we = we.lock().unwrap();
        we.cache_hit_tier = Some("none");
        we.response_bytes = Some(data.len());
    }

    ok_response(Body::from(data))
}

fn ok_response(body: Body) -> Result<Response, StatusCode> {
    Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, "application/json")
        .body(body)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

pub fn compute_graph(params: &GraphParams) -> Vec<u8> {
    let compact = params.compact;
    let max_height = params.max_height;
    let num_balls = params.num_balls;

    let states = State::generate(num_balls, max_height);
    let num_nodes = states.len();

    let state_value = |s: &State| -> String {
        if compact {
            s.bits().to_string()
        } else {
            format!("\"{}\"", s.to_binary_string(max_height))
        }
    };

    let mut buf = String::with_capacity(4096);

    buf.push_str("{\"nodes\":[");

    for (i, state) in states.iter().enumerate() {
        if i > 0 {
            buf.push(',');
        }
        buf.push_str(&state_value(state));
    }

    buf.push_str("],\"edges\":[");

    let mut num_edges: usize = 0;
    let mut first_edge = true;

    for state in &states {
        let transitions = Transition::from_state(*state, max_height);
        for t in &transitions {
            if !first_edge {
                buf.push(',');
            }
            first_edge = false;
            num_edges += 1;

            buf.push_str("{\"from\":");
            buf.push_str(&state_value(&t.from()));
            buf.push_str(",\"to\":");
            buf.push_str(&state_value(&t.to()));
            buf.push_str(",\"throw_height\":");
            buf.push_str(&t.throw_height().to_string());
            buf.push('}');
        }
    }

    buf.push_str("],\"num_nodes\":");
    buf.push_str(&num_nodes.to_string());
    buf.push_str(",\"num_edges\":");
    buf.push_str(&num_edges.to_string());
    buf.push_str(",\"max_height\":");
    buf.push_str(&max_height.to_string());
    buf.push_str(",\"num_balls\":");
    buf.push_str(&num_balls.to_string());
    buf.push('}');

    buf.into_bytes()
}
