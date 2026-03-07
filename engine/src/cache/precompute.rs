use bytes::Bytes;

use crate::cache::file::FileCache;
use crate::cache::memory::fits_in_memory;
use crate::cache::redis::{RedisCache, fits_in_redis};
use crate::params::StateNotationQuery;
use crate::routes::graphs::compute_graph;
use crate::routes::table::compute_table;

pub(crate) use juggling_tools::util::combinations;

use juggling_tools::state_notation::MAX_MAX_HEIGHT;

pub async fn precompute(
    memory_cache: &moka::future::Cache<String, Bytes>,
    redis_cache: Option<&RedisCache>,
    file_cache: &FileCache,
    schema_version: &str,
) {
    let mut computed = 0u32;
    let mut skipped = 0u32;
    let mut cached = 0u32;

    for num_props in 1u8..=MAX_MAX_HEIGHT {
        for max_height in num_props..=MAX_MAX_HEIGHT {
            let num_states = combinations(max_height as u64, num_props as u64);
            if num_states > 15_000 {
                skipped += 1;
                continue;
            }

            for compact in [false, true] {
                // For compact mode, reversed has no effect (integers are direction-agnostic),
                // so only precompute reversed=false. For non-compact, precompute both.
                let reversed_variants: &[bool] = if compact { &[false] } else { &[false, true] };

                for &reversed in reversed_variants {
                    let effective_reversed = !compact && reversed;

                    let graph_key = format!(
                        "v{schema_version}-{num_props}-{max_height}-{compact}-{effective_reversed}"
                    );
                    if file_cache.exists(&graph_key).await {
                        cached += 1;
                    } else {
                        let params = StateNotationQuery {
                            num_props,
                            max_height,
                            compact,
                            reversed,
                        };
                        let data = tokio::task::spawn_blocking(move || compute_graph(&params))
                            .await
                            .expect("compute_graph panicked");

                        file_cache.put(&graph_key, &data).await;
                        if let Some(rc) = redis_cache
                            && fits_in_redis(&data)
                        {
                            rc.put(&graph_key, &data).await;
                        }
                        if fits_in_memory(&data) {
                            memory_cache
                                .insert(graph_key.clone(), Bytes::from(data))
                                .await;
                        }
                        computed += 1;
                    }

                    let table_key = format!(
                        "table-v{schema_version}-{num_props}-{max_height}-{compact}-{effective_reversed}"
                    );
                    if file_cache.exists(&table_key).await {
                        cached += 1;
                    } else {
                        let params = StateNotationQuery {
                            num_props,
                            max_height,
                            compact,
                            reversed,
                        };
                        let data = tokio::task::spawn_blocking(move || compute_table(&params))
                            .await
                            .expect("compute_table panicked");

                        file_cache.put(&table_key, &data).await;
                        if let Some(rc) = redis_cache
                            && fits_in_redis(&data)
                        {
                            rc.put(&table_key, &data).await;
                        }
                        if fits_in_memory(&data) {
                            memory_cache
                                .insert(table_key.clone(), Bytes::from(data))
                                .await;
                        }
                        computed += 1;
                    }
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
