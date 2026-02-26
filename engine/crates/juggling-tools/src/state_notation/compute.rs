use super::graph::{Params, ParamsError};
use super::state::State;
use super::transition::Transition;

/// All valid states and transitions for a given set of [`Params`].
#[derive(Debug)]
pub struct TransitionSet {
    /// All valid states for the given parameters.
    pub states: Vec<State>,
    /// All transitions between those states.
    pub transitions: Vec<Transition>,
    /// The ground state (lowest bits set) — the "default" juggling pattern.
    pub ground_state: State,
    /// The number of props this was generated for.
    pub num_props: u8,
    /// The maximum throw height this was generated for.
    pub max_height: u8,
}

/// Compute all states and transitions for the given parameters.
///
/// # Errors
///
/// Returns a [`ParamsError`] if the parameters fail validation.
pub fn compute_transitions(params: &Params) -> Result<TransitionSet, ParamsError> {
    params.validate()?;

    let states = State::generate(params.num_props, params.max_height);

    let transitions: Vec<_> = states
        .iter()
        .flat_map(|state| Transition::from_state(*state, params.max_height))
        .collect();

    Ok(TransitionSet {
        // State::generate with validated params (num_props <= max_height) always produces
        // at least one state (the ground state), so index 0 is always valid.
        #[allow(clippy::indexing_slicing)]
        ground_state: states[0],
        states,
        transitions,
        num_props: params.num_props,
        max_height: params.max_height,
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
    fn test_state_count() {
        let ts = compute_transitions(&params(3, 5)).unwrap();
        assert_eq!(ts.states.len(), 10); // C(5,3) = 10
    }

    #[test]
    fn test_transition_count() {
        let ts = compute_transitions(&params(3, 5)).unwrap();
        assert_eq!(ts.transitions.len(), 22);
    }

    #[test]
    fn test_ground_state() {
        let ts = compute_transitions(&params(3, 5)).unwrap();
        assert_eq!(ts.ground_state.bits(), 0b00111);
    }

    #[test]
    fn test_metadata() {
        let ts = compute_transitions(&params(3, 5)).unwrap();
        assert_eq!(ts.num_props, 3);
        assert_eq!(ts.max_height, 5);
    }

    #[test]
    fn test_invalid_params() {
        assert!(compute_transitions(&params(5, 3)).is_err());
    }

    #[test]
    fn test_single_state() {
        let ts = compute_transitions(&params(3, 3)).unwrap();
        assert_eq!(ts.states.len(), 1);
        assert_eq!(ts.transitions.len(), 1);
    }

    #[test]
    fn test_transitions_reference_valid_states() {
        let ts = compute_transitions(&params(3, 5)).unwrap();
        let state_set: std::collections::HashSet<_> = ts.states.iter().collect();
        for t in &ts.transitions {
            assert!(
                state_set.contains(&t.from()),
                "transition from {:?} not in states",
                t.from()
            );
            assert!(
                state_set.contains(&t.to()),
                "transition to {:?} not in states",
                t.to()
            );
        }
    }

    #[test]
    fn test_preserves_prop_count() {
        let ts = compute_transitions(&params(3, 5)).unwrap();
        for t in &ts.transitions {
            assert_eq!(
                t.from().bits().count_ones(),
                t.to().bits().count_ones(),
                "prop count changed: from {:?} to {:?}",
                t.from(),
                t.to()
            );
        }
    }
}
