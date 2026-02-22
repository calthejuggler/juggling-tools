use bytes::Bytes;

use crate::cache::file::FileCache;
use crate::cache::memory::fits_in_memory;
use crate::cache::redis::{RedisCache, fits_in_redis};
use crate::graph::GraphParams;
use crate::routes::graphs::compute_graph;

fn combinations(n: u64, k: u64) -> u64 {
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

    for num_balls in 1u8..=32 {
        for max_height in num_balls..=32 {
            let num_states = combinations(max_height as u64, num_balls as u64);
            if num_states > 10_000 {
                skipped += 1;
                continue;
            }

            for compact in [false, true] {
                let key = format!("{}-{}-{}", num_balls, max_height, compact);

                if file_cache.exists(&key).await {
                    cached += 1;
                    continue;
                }

                let params = GraphParams {
                    num_balls,
                    max_height,
                    compact,
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

    tracing::info!(
        event = "precompute_done",
        computed,
        cached,
        skipped,
        "pre-computation done"
    );
}
