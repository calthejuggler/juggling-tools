use std::fmt::Display;

use crate::state::State;

#[derive(Debug, serde::Serialize)]
pub struct Transition {
    from: State,
    to: State,
    throw_height: u8,
    max_height: u8,
}

impl Display for Transition {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "{} ({})",
            self.to.display(self.max_height),
            self.throw_height
        )
    }
}

impl Transition {
    pub fn from(&self) -> State {
        self.from
    }

    pub fn to(&self) -> State {
        self.to
    }

    pub fn throw_height(&self) -> u8 {
        self.throw_height
    }

    pub fn from_state(state: State, max_height: u8) -> Vec<Transition> {
        let mut transitions: Vec<Transition> = vec![];

        let rightmost = state.bits() & 1 != 0;
        let shifted = state.bits() >> 1;

        if !rightmost {
            transitions.push(Transition {
                from: state,
                to: State::new(shifted, max_height).unwrap(),
                throw_height: 0,
                max_height,
            });
        } else {
            for bit_pos in 0..max_height {
                if (shifted >> bit_pos) & 1 == 0 {
                    let new_bits = shifted | (1 << bit_pos);
                    let throw_height = bit_pos + 1;

                    transitions.push(Transition {
                        from: state,
                        to: State::new(new_bits, max_height).unwrap(),
                        throw_height,
                        max_height,
                    });
                }
            }
        }

        transitions
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn state(bits: u32, max_height: u8) -> State {
        State::new(bits, max_height).unwrap()
    }

    #[test]
    fn test_no_prop_landing_single_transition() {
        let s = state(0b110, 3);
        let transitions = Transition::from_state(s, 3);
        assert_eq!(transitions.len(), 1);
        assert_eq!(transitions[0].throw_height(), 0);
        assert_eq!(transitions[0].to().bits(), 0b011);
    }

    #[test]
    fn test_prop_landing_single_empty_slot() {
        let s = state(0b111, 3);
        let transitions = Transition::from_state(s, 3);
        assert_eq!(transitions.len(), 1);
        assert_eq!(transitions[0].throw_height(), 3);
        assert_eq!(transitions[0].to().bits(), 0b111);
    }

    #[test]
    fn test_prop_landing_multiple_transitions() {
        let s = state(0b00111, 5);
        let transitions = Transition::from_state(s, 5);
        assert_eq!(transitions.len(), 3);
        let heights: Vec<u8> = transitions.iter().map(|t| t.throw_height()).collect();
        assert_eq!(heights, vec![3, 4, 5]);
        let destinations: Vec<u32> = transitions.iter().map(|t| t.to().bits()).collect();
        assert_eq!(destinations, vec![0b00111, 0b01011, 0b10011]);
    }

    #[test]
    fn test_skips_occupied_positions() {
        let s = state(0b10101, 5);
        let transitions = Transition::from_state(s, 5);
        let heights: Vec<u8> = transitions.iter().map(|t| t.throw_height()).collect();
        assert_eq!(heights, vec![1, 3, 5]);
        let destinations: Vec<u32> = transitions.iter().map(|t| t.to().bits()).collect();
        assert_eq!(destinations, vec![0b01011, 0b01110, 0b11010]);
    }

    #[test]
    fn test_throw_height_calculation() {
        let s = state(0b10101, 5);
        let transitions = Transition::from_state(s, 5);
        for t in &transitions {
            let shifted = s.bits() >> 1;
            let diff = t.to().bits() ^ shifted;
            let bit_pos = diff.trailing_zeros() as u8;
            assert_eq!(t.throw_height(), bit_pos + 1);
        }
    }

    #[test]
    fn test_preserves_prop_count() {
        let max_height = 5;
        let states = crate::state::State::generate(3, max_height);
        for s in &states {
            let transitions = Transition::from_state(*s, max_height);
            for t in &transitions {
                assert_eq!(
                    t.from().bits().count_ones(),
                    t.to().bits().count_ones(),
                    "prop count changed: from {:b} to {:b}",
                    t.from().bits(),
                    t.to().bits()
                );
            }
        }
    }

    #[test]
    fn test_to_states_within_bounds() {
        let max_height: u8 = 5;
        let states = crate::state::State::generate(3, max_height);
        for s in &states {
            let transitions = Transition::from_state(*s, max_height);
            for t in &transitions {
                assert_eq!(
                    t.to().bits() >> max_height,
                    0,
                    "to state {:b} exceeds max_height {}",
                    t.to().bits(),
                    max_height
                );
            }
        }
    }

    #[test]
    fn test_display_format() {
        let s = state(0b111, 3);
        let transitions = Transition::from_state(s, 3);
        let display = format!("{}", transitions[0]);
        assert_eq!(display, "xxx (3)");
    }

    #[test]
    fn test_ground_state_transitions() {
        let s = state(0b00111, 5);
        let transitions = Transition::from_state(s, 5);
        let mut heights: Vec<u8> = transitions.iter().map(|t| t.throw_height()).collect();
        heights.sort();
        assert_eq!(heights, vec![3, 4, 5]);
    }

    #[test]
    fn test_all_states_have_transitions() {
        let max_height = 5;
        let states = crate::state::State::generate(3, max_height);
        for s in &states {
            let transitions = Transition::from_state(*s, max_height);
            assert!(
                !transitions.is_empty(),
                "state {:b} has no transitions",
                s.bits()
            );
        }
    }
}
