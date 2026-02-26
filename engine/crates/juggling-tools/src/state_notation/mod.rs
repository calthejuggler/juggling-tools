/// Shared computation core: states + transitions intermediate.
mod compute;
/// State transition graph generation from validated parameters.
mod graph;
/// Juggling state representation using bit-packed notation.
mod state;
/// State transition table generation.
mod table;
/// Transitions between juggling states (throws and catches).
mod transition;

pub use compute::{TransitionSet, compute_transitions};
pub use graph::{Edge, Params, ParamsError, StateGraph, compute_graph};
pub use state::{Bits, MAX_MAX_HEIGHT, State};
pub use table::{StateTable, compute_table};
pub use transition::Transition;
