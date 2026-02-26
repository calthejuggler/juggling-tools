use std::fmt;

use super::compute::compute_transitions;
use super::state::{MAX_MAX_HEIGHT, State};

/// Parameters for generating a state transition graph or table.
#[derive(Debug, Clone, Copy)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
pub struct Params {
    /// The number of props (balls) being juggled.
    pub num_props: u8,
    /// The maximum throw height (number of beat positions in each state).
    pub max_height: u8,
}

/// Errors that can occur when validating [`Params`].
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ParamsError {
    /// The requested `max_height` exceeds [`MAX_MAX_HEIGHT`].
    MaxHeightTooLarge,
    /// The requested `num_props` exceeds [`MAX_MAX_HEIGHT`].
    NumPropsTooLarge,
    /// `max_height` is less than `num_props`, which is impossible.
    MaxHeightLessThanNumProps,
}

impl fmt::Display for ParamsError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::MaxHeightTooLarge => write!(f, "max_height exceeds {MAX_MAX_HEIGHT}"),
            Self::NumPropsTooLarge => write!(f, "num_props exceeds {MAX_MAX_HEIGHT}"),
            Self::MaxHeightLessThanNumProps => write!(f, "max_height must be >= num_props"),
        }
    }
}

impl std::error::Error for ParamsError {}

impl Params {
    /// Validate that the parameters are within acceptable bounds.
    ///
    /// # Errors
    ///
    /// Returns a [`ParamsError`] if `max_height` or `num_props` exceed
    /// [`MAX_MAX_HEIGHT`], or if `max_height < num_props`.
    pub const fn validate(&self) -> Result<(), ParamsError> {
        if self.max_height > MAX_MAX_HEIGHT {
            return Err(ParamsError::MaxHeightTooLarge);
        }
        if self.num_props > MAX_MAX_HEIGHT {
            return Err(ParamsError::NumPropsTooLarge);
        }
        if self.max_height < self.num_props {
            return Err(ParamsError::MaxHeightLessThanNumProps);
        }
        Ok(())
    }
}

/// A single edge in the state transition graph.
#[derive(Debug, Copy, Clone)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
pub struct Edge {
    /// The source state of this edge.
    pub from: State,
    /// The destination state of this edge.
    pub to: State,
    /// The throw height that causes this transition.
    pub throw_height: u8,
}

/// A complete state transition graph for a given number of props and max throw height.
#[derive(Debug)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
pub struct StateGraph {
    /// All valid states in the graph.
    pub states: Vec<State>,
    /// All edges (transitions) between states.
    pub edges: Vec<Edge>,
    /// The ground state (lowest bits set) — the "default" juggling pattern.
    pub ground_state: State,
    /// The number of props this graph was generated for.
    pub num_props: u8,
    /// The maximum throw height this graph was generated for.
    pub max_height: u8,
}

/// Compute the full state transition graph for the given parameters.
///
/// # Errors
///
/// Returns a [`ParamsError`] if the parameters fail validation.
pub fn compute_graph(params: &Params) -> Result<StateGraph, ParamsError> {
    let ts = compute_transitions(params)?;

    let edges = ts
        .transitions
        .iter()
        .map(|t| Edge {
            from: t.from(),
            to: t.to(),
            throw_height: t.throw_height(),
        })
        .collect();

    Ok(StateGraph {
        ground_state: ts.ground_state,
        states: ts.states,
        edges,
        num_props: ts.num_props,
        max_height: ts.max_height,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn params(num_props: u8, max_height: u8) -> Params {
        Params {
            num_props,
            max_height,
        }
    }

    #[test]
    fn test_validate_accepts_valid_params() {
        assert!(params(3, 5).validate().is_ok());
    }

    #[test]
    fn test_validate_rejects_max_height_above_limit() {
        assert_eq!(
            params(3, MAX_MAX_HEIGHT + 1).validate().unwrap_err(),
            ParamsError::MaxHeightTooLarge
        );
    }

    #[test]
    fn test_validate_rejects_num_props_above_limit() {
        assert_eq!(
            params(MAX_MAX_HEIGHT + 1, 5).validate().unwrap_err(),
            ParamsError::NumPropsTooLarge
        );
    }

    #[test]
    fn test_validate_rejects_max_height_less_than_num_props() {
        assert_eq!(
            params(5, 3).validate().unwrap_err(),
            ParamsError::MaxHeightLessThanNumProps
        );
    }

    #[test]
    fn test_validate_accepts_equal_num_props_and_max_height() {
        assert!(params(5, 5).validate().is_ok());
    }

    #[test]
    fn test_compute_graph_state_count() {
        let graph = compute_graph(&params(3, 5)).unwrap();
        assert_eq!(graph.states.len(), 10); // C(5,3) = 10
    }

    #[test]
    fn test_compute_graph_edge_count() {
        let graph = compute_graph(&params(3, 5)).unwrap();
        // 3 props in 5 slots: 6 states with rightmost=1 produce 3 transitions each (18),
        // plus 4 states with rightmost=0 produce 1 each (4) = 22 total
        assert_eq!(graph.edges.len(), 22);
    }

    #[test]
    fn test_compute_graph_ground_state() {
        let graph = compute_graph(&params(3, 5)).unwrap();
        // Ground state is the lowest bits set: 0b00111
        assert_eq!(graph.ground_state.bits(), 0b00111);
    }

    #[test]
    fn test_compute_graph_metadata() {
        let graph = compute_graph(&params(3, 5)).unwrap();
        assert_eq!(graph.num_props, 3);
        assert_eq!(graph.max_height, 5);
    }

    #[test]
    fn test_compute_graph_single_state() {
        // num_props == max_height → only one state, one self-loop
        let graph = compute_graph(&params(3, 3)).unwrap();
        assert_eq!(graph.states.len(), 1);
        assert_eq!(graph.edges.len(), 1);
        assert_eq!(graph.edges[0].from, graph.edges[0].to);
    }

    #[test]
    fn test_compute_graph_edges_reference_valid_states() {
        let graph = compute_graph(&params(3, 5)).unwrap();
        let state_set: std::collections::HashSet<_> = graph.states.iter().collect();
        for edge in &graph.edges {
            assert!(
                state_set.contains(&edge.from),
                "edge from {:?} not in states",
                edge.from
            );
            assert!(
                state_set.contains(&edge.to),
                "edge to {:?} not in states",
                edge.to
            );
        }
    }

    #[test]
    fn test_compute_graph_preserves_prop_count() {
        let graph = compute_graph(&params(3, 5)).unwrap();
        for edge in &graph.edges {
            assert_eq!(
                edge.from.bits().count_ones(),
                edge.to.bits().count_ones(),
                "prop count changed: from {:?} to {:?}",
                edge.from,
                edge.to
            );
        }
    }

    #[test]
    fn test_compute_graph_invalid_params() {
        assert!(compute_graph(&params(5, 3)).is_err());
    }

    #[test]
    fn test_graph_params_error_display() {
        assert!(!ParamsError::MaxHeightTooLarge.to_string().is_empty());
        assert!(!ParamsError::NumPropsTooLarge.to_string().is_empty());
        assert!(
            !ParamsError::MaxHeightLessThanNumProps
                .to_string()
                .is_empty()
        );
    }
}
