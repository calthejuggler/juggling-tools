use axum::http::StatusCode;
use serde::Deserialize;

#[derive(Deserialize)]
pub struct GraphParams {
    pub num_props: u8,
    pub max_height: u8,
    #[serde(default)]
    pub compact: bool,
    #[serde(default)]
    pub reversed: bool,
}

impl GraphParams {
    pub fn validate(&self) -> Result<(), StatusCode> {
        if self.max_height > 32 {
            return Err(StatusCode::BAD_REQUEST);
        }
        if self.num_props > 32 {
            return Err(StatusCode::BAD_REQUEST);
        }
        if self.max_height < self.num_props {
            return Err(StatusCode::BAD_REQUEST);
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn params(num_props: u8, max_height: u8) -> GraphParams {
        GraphParams {
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
    fn test_validate_rejects_max_height_above_32() {
        assert_eq!(
            params(3, 33).validate().unwrap_err(),
            StatusCode::BAD_REQUEST
        );
    }

    #[test]
    fn test_validate_rejects_num_props_above_32() {
        assert_eq!(
            params(33, 5).validate().unwrap_err(),
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
