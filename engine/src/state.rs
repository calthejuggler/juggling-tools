type Bits = u32;

#[derive(Copy, Clone, Eq, PartialEq, Hash, Debug, serde::Serialize)]
pub struct State(Bits);

impl State {
    pub fn new(bits: Bits, max_height: u8) -> Result<Self, String> {
        if max_height > 32 {
            return Err(format!("max_height {} exceeds 32", max_height));
        }
        if max_height < 32 && bits >> max_height != 0 {
            return Err(format!(
                "bits {:#b} has bits set above max_height {}",
                bits, max_height
            ));
        }
        Ok(State(bits))
    }

    pub fn bits(&self) -> Bits {
        self.0
    }

    pub fn ball_at(&self, pos: u8) -> bool {
        (self.0 >> pos) & 1 != 0
    }

    pub fn display(&self, max_height: u8) -> String {
        (0..max_height)
            .rev()
            .map(|i| if self.ball_at(i) { 'x' } else { '0' })
            .collect()
    }

    pub fn to_binary_string(self, max_height: u8) -> String {
        (0..max_height)
            .rev()
            .map(|i| if self.ball_at(i) { '1' } else { '0' })
            .collect()
    }

    pub fn generate(num_balls: u8, max_height: u8) -> Vec<State> {
        let mut states: Vec<State> = vec![];
        Self::backtrack(max_height, 0, num_balls, 0, &mut states);
        states
    }

    fn backtrack(max_height: u8, pos: u8, balls_left: u8, current: Bits, states: &mut Vec<State>) {
        let remaining = max_height - pos;
        if balls_left > remaining {
            return;
        }
        if pos == max_height {
            if balls_left == 0 {
                states.push(State(current));
            }
            return;
        }

        // Place '0' at this position
        Self::backtrack(max_height, pos + 1, balls_left, current, states);

        // Place '1' at this position
        if balls_left > 0 {
            Self::backtrack(
                max_height,
                pos + 1,
                balls_left - 1,
                current | (1 << (max_height - 1 - pos)),
                states,
            );
        }
    }
}
