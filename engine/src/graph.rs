use axum::http::StatusCode;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};

use crate::{state::State, transition::Transition};

#[derive(Deserialize, Serialize)]
pub struct GraphParams {
    pub num_balls: u8,
    pub max_height: u8,
    #[serde(default)]
    pub compact: bool,
}

impl GraphParams {
    pub fn validate(&self) -> Result<(), StatusCode> {
        if self.max_height > 32 {
            return Err(StatusCode::BAD_REQUEST);
        }
        if self.num_balls > 32 {
            return Err(StatusCode::BAD_REQUEST);
        }
        if self.max_height < self.num_balls {
            return Err(StatusCode::BAD_REQUEST);
        }
        Ok(())
    }
}

#[derive(Serialize)]
pub struct Graph {
    nodes: Vec<State>,
    edges: Vec<Transition>,
    max_height: u8,
    num_balls: u8,
}

impl Graph {
    pub fn new(params: &GraphParams) -> Self {
        let states = State::generate(params.num_balls, params.max_height);

        let edges: Vec<Transition> = states
            .iter()
            .flat_map(|s| Transition::from_state(*s, params.max_height))
            .collect();

        Self {
            nodes: states,
            edges,
            max_height: params.max_height,
            num_balls: params.num_balls,
        }
    }

    pub fn to_json(&self, compact: bool) -> Value {
        let state_value = |s: &State| -> Value {
            if compact {
                json!(s.bits())
            } else {
                json!(s.to_binary_string(self.max_height))
            }
        };

        json!({
            "nodes": self.nodes.iter().map(state_value).collect::<Vec<_>>(),
            "edges": self.edges.iter().map(|e| json!({
                "from": state_value(&e.from()),
                "to": state_value(&e.to()),
                "throw_height": e.throw_height(),
            })).collect::<Vec<_>>(),
            "num_nodes": self.nodes.len(),
            "num_edges": self.edges.len(),
            "max_height": self.max_height,
            "num_balls": self.num_balls,
        })
    }
}
