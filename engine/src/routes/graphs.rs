use axum::Extension;
use axum::body::Body;
use axum::extract::{Query, State as AxumState};
use axum::http::{StatusCode, header};
use axum::response::Response;
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
        we.num_props = Some(params.num_props);
        we.max_height = Some(params.max_height);
        we.compact = Some(params.compact);
    }

    let key = format!(
        "{}-{}-{}",
        params.num_props, params.max_height, params.compact
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
    let num_props = params.num_props;

    let states = State::generate(num_props, max_height);
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
    buf.push_str(",\"num_props\":");
    buf.push_str(&num_props.to_string());
    buf.push('}');

    buf.into_bytes()
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::Value;

    fn make_params(num_props: u8, max_height: u8, compact: bool) -> GraphParams {
        GraphParams {
            num_props,
            max_height,
            compact,
        }
    }

    fn parse(params: &GraphParams) -> Value {
        let data = compute_graph(params);
        serde_json::from_slice(&data).expect("invalid JSON")
    }

    #[test]
    fn test_compute_graph_valid_json() {
        let params = make_params(3, 5, false);
        let data = compute_graph(&params);
        let result: Result<Value, _> = serde_json::from_slice(&data);
        assert!(result.is_ok());
    }

    #[test]
    fn test_compute_graph_has_required_fields() {
        let json = parse(&make_params(3, 5, false));
        for key in [
            "nodes",
            "edges",
            "num_nodes",
            "num_edges",
            "max_height",
            "num_props",
        ] {
            assert!(json.get(key).is_some(), "missing key: {}", key);
        }
    }

    #[test]
    fn test_compute_graph_node_count_matches() {
        use crate::cache::precompute::combinations;
        let params = make_params(3, 5, false);
        let json = parse(&params);
        let num_nodes = json["num_nodes"].as_u64().unwrap() as usize;
        let nodes = json["nodes"].as_array().unwrap();
        let expected = combinations(5, 3) as usize;
        assert_eq!(num_nodes, expected);
        assert_eq!(nodes.len(), expected);
    }

    #[test]
    fn test_compute_graph_edge_count_matches() {
        let json = parse(&make_params(3, 5, false));
        let num_edges = json["num_edges"].as_u64().unwrap() as usize;
        let edges = json["edges"].as_array().unwrap();
        // 3 props in 5 slots: 6 states with rightmost=1 produce 3 transitions each (18),
        // plus 4 states with rightmost=0 produce 1 each (4) = 22 total
        assert_eq!(num_edges, 22);
        assert_eq!(edges.len(), 22);
    }

    #[test]
    fn test_compute_graph_compact_nodes_are_integers() {
        let json = parse(&make_params(3, 5, true));
        let nodes = json["nodes"].as_array().unwrap();
        for node in nodes {
            assert!(
                node.is_number(),
                "compact node should be a number, got: {}",
                node
            );
        }
    }

    #[test]
    fn test_compute_graph_non_compact_nodes_are_strings() {
        let json = parse(&make_params(3, 5, false));
        let nodes = json["nodes"].as_array().unwrap();
        for node in nodes {
            assert!(
                node.is_string(),
                "non-compact node should be a string, got: {}",
                node
            );
            let s = node.as_str().unwrap();
            assert_eq!(s.len(), 5, "binary string should match max_height");
            assert!(
                s.chars().all(|c| c == '0' || c == '1'),
                "node string should contain only '0' and '1', got: {}",
                s
            );
        }
    }

    #[test]
    fn test_compute_graph_edge_structure() {
        let json = parse(&make_params(3, 5, false));
        let edges = json["edges"].as_array().unwrap();
        for edge in edges {
            assert!(edge.get("from").is_some(), "edge missing 'from'");
            assert!(edge.get("to").is_some(), "edge missing 'to'");
            assert!(
                edge.get("throw_height").is_some(),
                "edge missing 'throw_height'"
            );
        }
    }

    #[test]
    fn test_compute_graph_edges_reference_valid_nodes() {
        let json = parse(&make_params(3, 5, false));
        let nodes: std::collections::HashSet<&Value> =
            json["nodes"].as_array().unwrap().iter().collect();
        let edges = json["edges"].as_array().unwrap();
        for edge in edges {
            let from = &edge["from"];
            let to = &edge["to"];
            assert!(nodes.contains(from), "edge 'from' {} not in nodes", from);
            assert!(nodes.contains(to), "edge 'to' {} not in nodes", to);
        }
    }

    #[test]
    fn test_compute_graph_single_state() {
        // num_props == max_height → only one state (all bits set), one self-loop
        let json = parse(&make_params(3, 3, false));
        assert_eq!(json["num_nodes"].as_u64().unwrap(), 1);
        assert_eq!(json["num_edges"].as_u64().unwrap(), 1);
        let edge = &json["edges"].as_array().unwrap()[0];
        assert_eq!(edge["from"], edge["to"], "single state should self-loop");
    }
}
