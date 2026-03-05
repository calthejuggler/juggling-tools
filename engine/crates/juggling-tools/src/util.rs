use crate::state_notation::Bits;

/// Table dimension: covers binomial coefficients C(n, k) for all n, k ≤ [`Bits::BITS`].
const TABLE_SIZE: usize = Bits::BITS as usize + 1;

/// Build Pascal's triangle at compile time.
#[allow(clippy::indexing_slicing)]
const fn build_binomial_table() -> [[u64; TABLE_SIZE]; TABLE_SIZE] {
    let mut table = [[0u64; TABLE_SIZE]; TABLE_SIZE];
    let mut n = 0usize;
    while n < TABLE_SIZE {
        table[n][0] = 1;
        let mut k = 1usize;
        while k <= n {
            table[n][k] = table[n - 1][k - 1].saturating_add(table[n - 1][k]);
            k += 1;
        }
        n += 1;
    }
    table
}

/// Precomputed Pascal's triangle for binomial coefficient lookups.
static BINOMIAL: [[u64; TABLE_SIZE]; TABLE_SIZE] = build_binomial_table();

/// Look up the binomial coefficient C(n, k).
///
/// Uses the precomputed table for n <= [`Bits::BITS`], falls back to iterative
/// computation otherwise.
pub fn binom(n: u8, k: u8) -> u64 {
    BINOMIAL
        .get(n as usize)
        .and_then(|row| row.get(k as usize))
        .copied()
        .unwrap_or_else(|| combinations(u64::from(n), u64::from(k)))
}

/// Compute the binomial coefficient C(n, k).
///
/// Returns 0 when `k > n`. Uses saturating multiplication to avoid overflow on large inputs.
pub fn combinations(n: u64, k: u64) -> u64 {
    if k > n {
        return 0;
    }
    let k = k.min(n - k);
    let mut result: u64 = 1;
    for i in 0..k {
        result = result.saturating_mul(n - i) / (i + 1);
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_combinations_basic_values() {
        assert_eq!(combinations(5, 2), 10);
        assert_eq!(combinations(10, 3), 120);
        assert_eq!(combinations(6, 3), 20);
        assert_eq!(combinations(4, 2), 6);
    }

    #[test]
    fn test_combinations_edge_cases() {
        assert_eq!(combinations(5, 0), 1);
        assert_eq!(combinations(5, 5), 1);
        assert_eq!(combinations(3, 5), 0);
    }

    #[test]
    fn test_combinations_symmetry() {
        for n in 0..=10 {
            for k in 0..=n {
                assert_eq!(
                    combinations(n, k),
                    combinations(n, n - k),
                    "C({},{}) != C({},{})",
                    n,
                    k,
                    n,
                    n - k
                );
            }
        }
    }

    #[test]
    fn test_combinations_large_values_no_panic() {
        let _ = combinations(64, 32);
    }

    #[test]
    fn test_binom_matches_combinations() {
        for n in 0..=32u8 {
            for k in 0..=n {
                assert_eq!(
                    binom(n, k),
                    combinations(u64::from(n), u64::from(k)),
                    "binom({},{}) != combinations({},{})",
                    n,
                    k,
                    n,
                    k
                );
            }
        }
    }

    #[test]
    fn test_binom_k_greater_than_n() {
        assert_eq!(binom(3, 5), 0, "C(3,5) should be 0");
    }

    #[test]
    fn test_binom_known_values() {
        assert_eq!(binom(5, 3), 10, "C(5,3)");
        assert_eq!(binom(10, 3), 120, "C(10,3)");
        assert_eq!(binom(0, 0), 1, "C(0,0)");
        assert_eq!(binom(32, 16), 601_080_390, "C(32,16)");
    }
}
