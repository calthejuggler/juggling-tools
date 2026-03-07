use axum::Extension;
use axum::body::Body;
use axum::extract::{Query, State as AxumState};
use axum::http::{StatusCode, header};
use axum::response::Response;
use bytes::Bytes;

use crate::cache::memory::fits_in_memory;
use crate::cache::redis::fits_in_redis;
use crate::logging::WideEventHandle;
use crate::params::StateNotationQuery;

pub async fn get_table_query(
    AxumState(app): AxumState<crate::AppState>,
    Query(params): Query<StateNotationQuery>,
    wide_event: Option<Extension<WideEventHandle>>,
) -> Result<Response, StatusCode> {
    build_table_response(app, params, wide_event.map(|e| e.0)).await
}

async fn build_table_response(
    app: crate::AppState,
    params: StateNotationQuery,
    wide_event: Option<WideEventHandle>,
) -> Result<Response, StatusCode> {
    params.validate()?;

    if let Some(ref we) = wide_event {
        let mut we = we.lock().unwrap();
        we.num_props = Some(params.num_props);
        we.max_height = Some(params.max_height);
        we.compact = Some(params.compact);
        we.reversed = Some(params.reversed);
    }

    let effective_reversed = !params.compact && params.reversed;
    let key = format!(
        "table-v{}-{}-{}-{}-{}",
        app.schema_version, params.num_props, params.max_height, params.compact, effective_reversed
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

    let data = tokio::task::spawn_blocking(move || compute_table(&params))
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

pub fn compute_table(params: &StateNotationQuery) -> Vec<u8> {
    use std::fmt::Write;

    let compact = params.compact;
    let max_height = params.max_height;
    let num_props = params.num_props;
    let reversed = params.reversed;

    let table = juggling_tools::state_notation::compute_table(&params.to_library_params())
        .expect("params should be validated before calling compute_table");

    let mut buf = String::with_capacity(4096);

    let write_state = |buf: &mut String, s: &juggling_tools::state_notation::State| {
        if compact {
            let _ = write!(buf, "{}", s.bits());
        } else {
            buf.push('"');
            if reversed {
                for i in 0..max_height {
                    buf.push(if s.prop_at(i) { '1' } else { '0' });
                }
            } else {
                for i in (0..max_height).rev() {
                    buf.push(if s.prop_at(i) { '1' } else { '0' });
                }
            }
            buf.push('"');
        }
    };

    buf.push_str("{\"states\":[");
    for (i, state) in table.states.iter().enumerate() {
        if i > 0 {
            buf.push(',');
        }
        write_state(&mut buf, state);
    }

    let n = table.states.len();

    buf.push_str("],\"cells\":[");
    for i in 0..n {
        if i > 0 {
            buf.push(',');
        }
        buf.push('[');
        for j in 0..n {
            if j > 0 {
                buf.push(',');
            }
            match table.cell(i, j) {
                Some(v) => {
                    let _ = write!(buf, "{v}");
                }
                None => buf.push_str("null"),
            }
        }
        buf.push(']');
    }

    buf.push_str("],\"ground_state\":");
    write_state(&mut buf, &table.ground_state);
    let _ = write!(
        buf,
        ",\"num_states\":{n},\"max_height\":{max_height},\"num_props\":{num_props}"
    );
    buf.push('}');

    buf.into_bytes()
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::Value;

    fn make_params(num_props: u8, max_height: u8, compact: bool) -> StateNotationQuery {
        StateNotationQuery {
            num_props,
            max_height,
            compact,
            reversed: false,
        }
    }

    fn parse(params: &StateNotationQuery) -> Value {
        let data = compute_table(params);
        serde_json::from_slice(&data).expect("invalid JSON")
    }

    #[test]
    fn test_compute_table_valid_json() {
        let params = make_params(3, 5, false);
        let data = compute_table(&params);
        let result: Result<Value, _> = serde_json::from_slice(&data);
        assert!(result.is_ok());
    }

    #[test]
    fn test_compute_table_has_required_fields() {
        let json = parse(&make_params(3, 5, false));
        for key in [
            "states",
            "cells",
            "ground_state",
            "num_states",
            "max_height",
            "num_props",
        ] {
            assert!(json.get(key).is_some(), "missing key: {}", key);
        }
    }

    #[test]
    fn test_compute_table_dimensions() {
        let json = parse(&make_params(3, 5, false));
        let num_states = json["num_states"].as_u64().unwrap() as usize;
        let states = json["states"].as_array().unwrap();
        let cells = json["cells"].as_array().unwrap();
        assert_eq!(num_states, 10);
        assert_eq!(states.len(), 10);
        assert_eq!(cells.len(), 10);
        for row in cells {
            assert_eq!(row.as_array().unwrap().len(), 10);
        }
    }

    #[test]
    fn test_compute_table_compact_states_are_integers() {
        let json = parse(&make_params(3, 5, true));
        let states = json["states"].as_array().unwrap();
        for state in states {
            assert!(
                state.is_number(),
                "compact state should be a number, got: {}",
                state
            );
        }
    }

    #[test]
    fn test_compute_table_non_compact_states_are_strings() {
        let json = parse(&make_params(3, 5, false));
        let states = json["states"].as_array().unwrap();
        for state in states {
            assert!(
                state.is_string(),
                "non-compact state should be a string, got: {}",
                state
            );
            let s = state.as_str().unwrap();
            assert_eq!(s.len(), 5);
            assert!(s.chars().all(|c| c == '0' || c == '1'));
        }
    }

    #[test]
    fn test_compute_table_cells_contain_valid_values() {
        let json = parse(&make_params(3, 5, false));
        let cells = json["cells"].as_array().unwrap();
        for row in cells {
            for cell in row.as_array().unwrap() {
                assert!(
                    cell.is_null() || cell.is_number(),
                    "cell should be null or number, got: {}",
                    cell
                );
            }
        }
    }

    #[test]
    fn test_compute_table_reversed() {
        let normal = parse(&make_params(3, 5, false));
        let reversed_params = StateNotationQuery {
            num_props: 3,
            max_height: 5,
            compact: false,
            reversed: true,
        };
        let reversed = parse(&reversed_params);

        let normal_states: Vec<&str> = normal["states"]
            .as_array()
            .unwrap()
            .iter()
            .map(|n| n.as_str().unwrap())
            .collect();
        let reversed_states: Vec<&str> = reversed["states"]
            .as_array()
            .unwrap()
            .iter()
            .map(|n| n.as_str().unwrap())
            .collect();

        for (n, r) in normal_states.iter().zip(reversed_states.iter()) {
            let expected: String = n.chars().rev().collect();
            assert_eq!(*r, expected.as_str());
        }
    }

    #[test]
    fn test_compute_table_single_state() {
        let json = parse(&make_params(3, 3, false));
        assert_eq!(json["num_states"].as_u64().unwrap(), 1);
        let cells = json["cells"].as_array().unwrap();
        assert_eq!(cells.len(), 1);
        assert_eq!(cells[0].as_array().unwrap().len(), 1);
        assert_eq!(cells[0][0].as_u64().unwrap(), 3); // self-loop with throw height = max_height
    }
}
