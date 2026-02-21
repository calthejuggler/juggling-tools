use axum::Json;
use axum::body::Body;
use axum::http::{StatusCode, header};
use axum::response::Response;
use tokio::sync::mpsc;
use tokio_stream::wrappers::ReceiverStream;

use crate::graph::GraphParams;
use crate::state::State;
use crate::transition::Transition;

pub async fn get_graph(Json(params): Json<GraphParams>) -> Result<Response, StatusCode> {
    params.validate()?;

    let (tx, rx) = mpsc::channel::<Result<String, std::io::Error>>(32);

    tokio::spawn(async move {
        let _ = stream_graph(tx, params).await;
    });

    let stream = ReceiverStream::new(rx);
    let body = Body::from_stream(stream);

    Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, "application/json")
        .body(body)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

async fn stream_graph(
    tx: mpsc::Sender<Result<String, std::io::Error>>,
    params: GraphParams,
) -> Result<(), ()> {
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

        if buf.len() >= 4096 {
            let chunk = std::mem::take(&mut buf);
            buf.reserve(4096);
            if tx.send(Ok(chunk)).await.is_err() {
                return Err(());
            }
        }
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

            if buf.len() >= 4096 {
                let chunk = std::mem::take(&mut buf);
                buf.reserve(4096);
                if tx.send(Ok(chunk)).await.is_err() {
                    return Err(());
                }
            }
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

    if !buf.is_empty() {
        let _ = tx.send(Ok(buf)).await;
    }

    Ok(())
}
