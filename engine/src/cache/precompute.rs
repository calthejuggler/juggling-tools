use bytes::Bytes;

use crate::cache::file::FileCache;
use crate::cache::memory::fits_in_memory;
use crate::cache::redis::{RedisCache, fits_in_redis};
use crate::graph::GraphParams;
use crate::routes::graphs::compute_graph;

pub(crate) fn combinations(n: u64, k: u64) -> u64 {
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

pub async fn precompute(
    memory_cache: &moka::future::Cache<String, Bytes>,
    redis_cache: Option<&RedisCache>,
    file_cache: &FileCache,
) {
    let mut computed = 0u32;
    let mut skipped = 0u32;
    let mut cached = 0u32;

    for num_props in 1u8..=32 {
        for max_height in num_props..=32 {
            let num_states = combinations(max_height as u64, num_props as u64);
            if num_states > 10_000 {
                skipped += 1;
                continue;
            }

            for compact in [false, true] {
                // For compact mode, reversed has no effect (integers are direction-agnostic),
                // so only precompute reversed=false. For non-compact, precompute both.
                let reversed_variants: &[bool] = if compact { &[false] } else { &[false, true] };

                for &reversed in reversed_variants {
                    let effective_reversed = !compact && reversed;
                    let key = format!(
                        "{}-{}-{}-{}",
                        num_props, max_height, compact, effective_reversed
                    );

                    if file_cache.exists(&key).await {
                        cached += 1;
                        continue;
                    }

                    let params = GraphParams {
                        num_props,
                        max_height,
                        compact,
                        reversed,
                    };

                    let data = tokio::task::spawn_blocking(move || compute_graph(&params))
                        .await
                        .expect("compute_graph panicked");

                    file_cache.put(&key, &data).await;

                    if let Some(rc) = redis_cache
                        && fits_in_redis(&data)
                    {
                        rc.put(&key, &data).await;
                    }

                    if fits_in_memory(&data) {
                        memory_cache.insert(key.clone(), Bytes::from(data)).await;
                    }

                    computed += 1;
                }
            }
        }
    }

    tracing::info!(
        event = "precompute_done",
        computed,
        cached,
        skipped,
        "pre-computation done"
    );
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
}
