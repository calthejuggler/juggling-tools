use axum::http::StatusCode;
use juggling_tools::state_notation::{Bits, MAX_MAX_HEIGHT, State};
use serde::Deserialize;

#[derive(Deserialize)]
pub struct ThrowsQuery {
    pub state: Bits,
    pub max_height: u8,
    #[serde(default)]
    pub compact: bool,
    #[serde(default)]
    pub reversed: bool,
}

impl ThrowsQuery {
    pub fn validate(&self) -> Result<(), StatusCode> {
        if self.max_height > MAX_MAX_HEIGHT || self.max_height == 0 {
            return Err(StatusCode::BAD_REQUEST);
        }
        if self.max_height < MAX_MAX_HEIGHT && self.state >> self.max_height != 0 {
            return Err(StatusCode::BAD_REQUEST);
        }
        Ok(())
    }

    pub fn to_state(&self) -> State {
        State::new(self.state, self.max_height)
            .expect("params should be validated before calling to_state")
    }
}

#[derive(Deserialize)]
pub struct StateNotationQuery {
    pub num_props: u8,
    pub max_height: u8,
    #[serde(default)]
    pub compact: bool,
    #[serde(default)]
    pub reversed: bool,
}

impl StateNotationQuery {
    pub fn validate(&self) -> Result<(), StatusCode> {
        self.to_library_params()
            .validate()
            .map_err(|_| StatusCode::BAD_REQUEST)
    }

    pub fn to_library_params(&self) -> juggling_tools::state_notation::Params {
        juggling_tools::state_notation::Params {
            num_props: self.num_props,
            max_height: self.max_height,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn throws_params(state: Bits, max_height: u8) -> ThrowsQuery {
        ThrowsQuery {
            state,
            max_height,
            compact: false,
            reversed: false,
        }
    }

    #[test]
    fn test_throws_validate_accepts_valid_params() {
        assert!(throws_params(0b00111, 5).validate().is_ok());
    }

    #[test]
    fn test_throws_validate_accepts_zero_state() {
        assert!(throws_params(0, 5).validate().is_ok());
    }

    #[test]
    fn test_throws_validate_rejects_max_height_above_limit() {
        assert_eq!(
            throws_params(0, MAX_MAX_HEIGHT + 1).validate().unwrap_err(),
            StatusCode::BAD_REQUEST
        );
    }

    #[test]
    fn test_throws_validate_rejects_zero_max_height() {
        assert_eq!(
            throws_params(0, 0).validate().unwrap_err(),
            StatusCode::BAD_REQUEST
        );
    }

    #[test]
    fn test_throws_validate_rejects_state_bits_exceeding_max_height() {
        assert_eq!(
            throws_params(0b100000, 5).validate().unwrap_err(),
            StatusCode::BAD_REQUEST
        );
    }

    #[test]
    fn test_throws_validate_accepts_state_at_max_height_boundary() {
        // All bits set within max_height
        assert!(throws_params(0b11111, 5).validate().is_ok());
    }

    fn params(num_props: u8, max_height: u8) -> StateNotationQuery {
        StateNotationQuery {
            num_props,
            max_height,
            compact: false,
            reversed: false,
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
            StatusCode::BAD_REQUEST
        );
    }

    #[test]
    fn test_validate_rejects_num_props_above_limit() {
        assert_eq!(
            params(MAX_MAX_HEIGHT + 1, 5).validate().unwrap_err(),
            StatusCode::BAD_REQUEST
        );
    }

    #[test]
    fn test_validate_rejects_max_height_less_than_num_props() {
        assert_eq!(
            params(5, 3).validate().unwrap_err(),
            StatusCode::BAD_REQUEST
        );
    }

    #[test]
    fn test_validate_accepts_equal_num_props_and_max_height() {
        assert!(params(5, 5).validate().is_ok());
    }
}
