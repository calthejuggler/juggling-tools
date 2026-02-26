use std::collections::HashMap;

use super::compute::compute_transitions;
use super::graph::{Params, ParamsError};
use super::state::State;

/// A state transition table.
///
/// An N×N matrix where rows are source states, columns are destination states,
/// and cells contain the throw height for that transition (or `None` if none exists).
#[derive(Debug)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
pub struct StateTable {
    /// All valid states, in the same order as the graph.
    pub states: Vec<State>,
    /// `cells[from_idx][to_idx]` = throw height or `None`.
    pub cells: Vec<Vec<Option<u8>>>,
    /// The ground state (lowest bits set).
    pub ground_state: State,
    /// The number of props this table was generated for.
    pub num_props: u8,
    /// The maximum throw height this table was generated for.
    pub max_height: u8,
}

/// Compute the state transition table for the given parameters.
///
/// Builds the N×N matrix directly from the shared [`compute_transitions`] intermediate.
///
/// # Errors
///
/// Returns a [`ParamsError`] if the parameters fail validation.
pub fn compute_table(params: &Params) -> Result<StateTable, ParamsError> {
    let ts = compute_transitions(params)?;

    let index_map: HashMap<_, _> = ts
        .states
        .iter()
        .enumerate()
        .map(|(i, s)| (s.bits(), i))
        .collect();

    let n = ts.states.len();
    let mut cells = vec![vec![None; n]; n];

    for t in &ts.transitions {
        if let (Some(&from_idx), Some(&to_idx)) = (
            index_map.get(&t.from().bits()),
            index_map.get(&t.to().bits()),
        ) && let Some(row) = cells.get_mut(from_idx)
            && let Some(cell) = row.get_mut(to_idx)
        {
            *cell = Some(t.throw_height());
        }
    }

    Ok(StateTable {
        states: ts.states,
        cells,
        ground_state: ts.ground_state,
        num_props: ts.num_props,
        max_height: ts.max_height,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::state_notation::compute_graph;

    fn params(num_props: u8, max_height: u8) -> Params {
        Params {
            num_props,
            max_height,
        }
    }

    #[test]
    fn test_table_dimensions() {
        let table = compute_table(&params(3, 5)).unwrap();
        let n = table.states.len();
        assert_eq!(n, 10); // C(5,3)
        assert_eq!(table.cells.len(), n);
        for row in &table.cells {
            assert_eq!(row.len(), n);
        }
    }

    #[test]
    fn test_cells_match_graph_edges() {
        let p = params(3, 5);
        let graph = compute_graph(&p).unwrap();
        let table = compute_table(&p).unwrap();

        let index_map: HashMap<_, _> = table
            .states
            .iter()
            .enumerate()
            .map(|(i, s)| (s.bits(), i))
            .collect();

        for edge in &graph.edges {
            let from_idx = *index_map.get(&edge.from.bits()).unwrap();
            let to_idx = *index_map.get(&edge.to.bits()).unwrap();
            assert_eq!(
                table.cells[from_idx][to_idx],
                Some(edge.throw_height),
                "cell [{from_idx}][{to_idx}] should be Some({})",
                edge.throw_height
            );
        }
    }

    #[test]
    fn test_none_for_non_transitions() {
        let table = compute_table(&params(3, 5)).unwrap();
        let p = params(3, 5);
        let graph = compute_graph(&p).unwrap();

        let index_map: HashMap<_, _> = table
            .states
            .iter()
            .enumerate()
            .map(|(i, s)| (s.bits(), i))
            .collect();

        let mut edge_set = std::collections::HashSet::new();
        for edge in &graph.edges {
            let from_idx = *index_map.get(&edge.from.bits()).unwrap();
            let to_idx = *index_map.get(&edge.to.bits()).unwrap();
            edge_set.insert((from_idx, to_idx));
        }

        let n = table.states.len();
        for from in 0..n {
            for to in 0..n {
                if !edge_set.contains(&(from, to)) {
                    assert_eq!(
                        table.cells[from][to], None,
                        "cell [{from}][{to}] should be None"
                    );
                }
            }
        }
    }

    #[test]
    fn test_ground_state_correctness() {
        let table = compute_table(&params(3, 5)).unwrap();
        assert_eq!(table.ground_state.bits(), 0b00111);
    }

    #[test]
    fn test_single_state() {
        let table = compute_table(&params(3, 3)).unwrap();
        assert_eq!(table.states.len(), 1);
        assert_eq!(table.cells.len(), 1);
        assert_eq!(table.cells[0].len(), 1);
        // Self-loop: throw height == max_height
        assert_eq!(table.cells[0][0], Some(3));
    }

    #[test]
    fn test_metadata() {
        let table = compute_table(&params(3, 5)).unwrap();
        assert_eq!(table.num_props, 3);
        assert_eq!(table.max_height, 5);
    }

    #[test]
    fn test_invalid_params() {
        assert!(compute_table(&params(5, 3)).is_err());
    }

    #[test]
    fn test_some_count_equals_edge_count() {
        let p = params(3, 5);
        let graph = compute_graph(&p).unwrap();
        let table = compute_table(&p).unwrap();

        let some_count: usize = table
            .cells
            .iter()
            .flat_map(|row| row.iter())
            .filter(|c| c.is_some())
            .count();
        assert_eq!(some_count, graph.edges.len());
    }
}
