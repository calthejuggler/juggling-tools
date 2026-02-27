use axum::Extension;
use axum::body::Body;
use axum::extract::Query;
use axum::http::{StatusCode, header};
use axum::response::Response;

use crate::logging::WideEventHandle;
use crate::params::ThrowsQuery;

pub async fn get_throws_query(
    Query(params): Query<ThrowsQuery>,
    wide_event: Option<Extension<WideEventHandle>>,
) -> Result<Response, StatusCode> {
    params.validate()?;

    if let Some(ref we) = wide_event {
        let mut we = we.lock().unwrap();
        we.max_height = Some(params.max_height);
        we.compact = Some(params.compact);
        we.reversed = Some(params.reversed);
    }

    let state = params.to_state();
    let throws = juggling_tools::state_notation::compute_throws(state, params.max_height)
        .map_err(|_| StatusCode::BAD_REQUEST)?;

    let data = serialize_throws(&params, &throws);

    Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(data))
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

fn serialize_throws(
    params: &ThrowsQuery,
    throws: &[juggling_tools::state_notation::Throw],
) -> Vec<u8> {
    let compact = params.compact;
    let max_height = params.max_height;
    let reversed = params.reversed;

    let state_value = |s: &juggling_tools::state_notation::State| -> String {
        if compact {
            s.bits().to_string()
        } else {
            let binary = s.to_binary_string(max_height);
            let display = if reversed {
                binary.chars().rev().collect::<String>()
            } else {
                binary
            };
            format!("\"{}\"", display)
        }
    };

    let source_state = params.to_state();

    let mut buf = String::with_capacity(512);

    buf.push_str("{\"throws\":[");
    for (i, t) in throws.iter().enumerate() {
        if i > 0 {
            buf.push(',');
        }
        buf.push_str("{\"height\":");
        buf.push_str(&t.height().to_string());
        buf.push_str(",\"destination\":");
        buf.push_str(&state_value(&t.destination()));
        buf.push('}');
    }

    buf.push_str("],\"state\":");
    buf.push_str(&state_value(&source_state));
    buf.push_str(",\"max_height\":");
    buf.push_str(&max_height.to_string());
    buf.push_str(",\"num_throws\":");
    buf.push_str(&throws.len().to_string());
    buf.push('}');

    buf.into_bytes()
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::Value;

    fn make_params(
        state: juggling_tools::state_notation::Bits,
        max_height: u8,
        compact: bool,
    ) -> ThrowsQuery {
        ThrowsQuery {
            state,
            max_height,
            compact,
            reversed: false,
        }
    }

    fn compute_and_serialize(params: &ThrowsQuery) -> Vec<u8> {
        let state = params.to_state();
        let throws =
            juggling_tools::state_notation::compute_throws(state, params.max_height).unwrap();
        serialize_throws(params, &throws)
    }

    fn parse(params: &ThrowsQuery) -> Value {
        let data = compute_and_serialize(params);
        serde_json::from_slice(&data).expect("invalid JSON")
    }

    #[test]
    fn test_valid_json() {
        let params = make_params(0b00111, 5, false);
        let data = compute_and_serialize(&params);
        let result: Result<Value, _> = serde_json::from_slice(&data);
        assert!(result.is_ok());
    }

    #[test]
    fn test_has_required_fields() {
        let json = parse(&make_params(0b00111, 5, false));
        for key in ["throws", "state", "max_height", "num_throws"] {
            assert!(json.get(key).is_some(), "missing key: {}", key);
        }
    }

    #[test]
    fn test_throw_structure() {
        let json = parse(&make_params(0b00111, 5, false));
        let throws = json["throws"].as_array().unwrap();
        for t in throws {
            assert!(t.get("height").is_some(), "throw missing 'height'");
            assert!(
                t.get("destination").is_some(),
                "throw missing 'destination'"
            );
        }
    }

    #[test]
    fn test_num_throws_matches() {
        let json = parse(&make_params(0b00111, 5, false));
        let num_throws = json["num_throws"].as_u64().unwrap() as usize;
        let throws = json["throws"].as_array().unwrap();
        assert_eq!(num_throws, throws.len());
    }

    #[test]
    fn test_ground_state_3_5_has_three_throws() {
        let json = parse(&make_params(0b00111, 5, false));
        assert_eq!(json["num_throws"].as_u64().unwrap(), 3);
        let throws = json["throws"].as_array().unwrap();
        let heights: Vec<u64> = throws
            .iter()
            .map(|t| t["height"].as_u64().unwrap())
            .collect();
        assert_eq!(heights, vec![3, 4, 5]);
    }

    #[test]
    fn test_compact_state_is_integer() {
        let json = parse(&make_params(0b00111, 5, true));
        assert!(
            json["state"].is_number(),
            "compact state should be a number, got: {}",
            json["state"]
        );
        assert_eq!(json["state"].as_u64().unwrap(), 7);
    }

    #[test]
    fn test_compact_destinations_are_integers() {
        let json = parse(&make_params(0b00111, 5, true));
        let throws = json["throws"].as_array().unwrap();
        for t in throws {
            assert!(
                t["destination"].is_number(),
                "compact destination should be a number, got: {}",
                t["destination"]
            );
        }
    }

    #[test]
    fn test_non_compact_state_is_string() {
        let json = parse(&make_params(0b00111, 5, false));
        assert!(
            json["state"].is_string(),
            "non-compact state should be a string, got: {}",
            json["state"]
        );
        assert_eq!(json["state"].as_str().unwrap(), "00111");
    }

    #[test]
    fn test_non_compact_destinations_are_strings() {
        let json = parse(&make_params(0b00111, 5, false));
        let throws = json["throws"].as_array().unwrap();
        for t in throws {
            assert!(
                t["destination"].is_string(),
                "non-compact destination should be a string, got: {}",
                t["destination"]
            );
            let s = t["destination"].as_str().unwrap();
            assert_eq!(s.len(), 5);
            assert!(s.chars().all(|c| c == '0' || c == '1'));
        }
    }

    #[test]
    fn test_reversed_non_compact() {
        let normal = parse(&make_params(0b00111, 5, false));
        let reversed_params = ThrowsQuery {
            state: 0b00111,
            max_height: 5,
            compact: false,
            reversed: true,
        };
        let reversed = parse(&reversed_params);

        let normal_state = normal["state"].as_str().unwrap();
        let reversed_state = reversed["state"].as_str().unwrap();
        let expected: String = normal_state.chars().rev().collect();
        assert_eq!(reversed_state, expected.as_str());
    }

    #[test]
    fn test_reversed_compact_is_identical() {
        let normal = parse(&make_params(0b00111, 5, true));
        let reversed_params = ThrowsQuery {
            state: 0b00111,
            max_height: 5,
            compact: true,
            reversed: true,
        };
        let reversed = parse(&reversed_params);
        assert_eq!(normal, reversed);
    }

    #[test]
    fn test_zero_throw_when_no_prop_landing() {
        // state 0b110 (bits 1,2 set) in max_height=3: rightmost bit is 0, so only a zero-throw
        let json = parse(&make_params(0b110, 3, true));
        assert_eq!(json["num_throws"].as_u64().unwrap(), 1);
        let throws = json["throws"].as_array().unwrap();
        assert_eq!(throws[0]["height"].as_u64().unwrap(), 0);
    }

    #[test]
    fn test_empty_state() {
        let json = parse(&make_params(0, 5, true));
        assert_eq!(json["num_throws"].as_u64().unwrap(), 1);
        let throws = json["throws"].as_array().unwrap();
        assert_eq!(throws[0]["height"].as_u64().unwrap(), 0);
    }
}
