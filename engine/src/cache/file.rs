use std::path::PathBuf;
use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};

use tokio::fs;
use tokio::io::AsyncWriteExt;

const DEFAULT_MAX_CAPACITY: u64 = 2 * 1024 * 1024 * 1024; // 2 GB
const DEFAULT_MAX_ENTRY_SIZE: u64 = 5 * 1024 * 1024; // 5 MB
const ZSTD_LEVEL: i32 = 3;

#[derive(Clone)]
pub struct FileCache {
    dir: PathBuf,
    max_capacity: u64,
    max_entry_size: u64,
    total_size: Arc<AtomicU64>,
}

impl FileCache {
    pub async fn new(dir: PathBuf) -> Self {
        Self::with_limits(dir, DEFAULT_MAX_CAPACITY, DEFAULT_MAX_ENTRY_SIZE).await
    }

    pub async fn with_limits(dir: PathBuf, max_capacity: u64, max_entry_size: u64) -> Self {
        fs::create_dir_all(&dir).await.ok();
        let cache = FileCache {
            dir,
            max_capacity,
            max_entry_size,
            total_size: Arc::new(AtomicU64::new(0)),
        };
        cache.sync_total_size().await;
        cache
    }

    fn path(&self, key: &str) -> PathBuf {
        self.dir.join(key)
    }

    async fn sync_total_size(&self) {
        let mut entries = match fs::read_dir(&self.dir).await {
            Ok(e) => e,
            Err(_) => return,
        };

        let mut total: u64 = 0;
        while let Ok(Some(entry)) = entries.next_entry().await {
            if let Ok(meta) = entry.metadata().await
                && meta.is_file()
            {
                total += meta.len();
            }
        }
        self.total_size.store(total, Ordering::Relaxed);
    }

    pub async fn clear(&self) {
        let mut entries = match fs::read_dir(&self.dir).await {
            Ok(entries) => entries,
            Err(e) => {
                tracing::warn!(event = "cache_clear_failed", error = %e, "failed to read cache dir");
                return;
            }
        };

        let mut removed = 0u32;
        while let Ok(Some(entry)) = entries.next_entry().await {
            if fs::remove_file(entry.path()).await.is_ok() {
                removed += 1;
            }
        }

        self.total_size.store(0, Ordering::Relaxed);
        tracing::info!(event = "cache_cleared", removed, "cleared file cache");
    }

    pub async fn get(&self, key: &str) -> Option<Vec<u8>> {
        let compressed = fs::read(self.path(key)).await.ok()?;
        zstd::stream::decode_all(compressed.as_slice()).ok()
    }

    pub async fn exists(&self, key: &str) -> bool {
        self.path(key).exists()
    }

    pub async fn put(&self, key: &str, data: &[u8]) {
        let uncompressed_size = data.len() as u64;

        if uncompressed_size > self.max_entry_size {
            tracing::debug!(
                event = "cache_entry_too_large",
                key,
                size = uncompressed_size,
                max = self.max_entry_size,
                "skipping file cache for oversized entry"
            );
            return;
        }

        let compressed = match zstd::stream::encode_all(data, ZSTD_LEVEL) {
            Ok(c) => c,
            Err(e) => {
                tracing::warn!(event = "cache_compress_failed", key, error = %e);
                return;
            }
        };
        let disk_size = compressed.len() as u64;

        self.evict_if_needed(disk_size).await;

        let final_path = self.path(key);
        let tmp_path = self.dir.join(format!(".{key}.tmp"));

        let result = async {
            let mut f = fs::File::create(&tmp_path).await?;
            f.write_all(&compressed).await?;
            f.sync_all().await?;
            fs::rename(&tmp_path, &final_path).await
        }
        .await;

        if result.is_ok() {
            self.total_size.fetch_add(disk_size, Ordering::Relaxed);
        } else {
            fs::remove_file(&tmp_path).await.ok();
        }
    }

    async fn evict_if_needed(&self, incoming_size: u64) {
        if self.total_size.load(Ordering::Relaxed) + incoming_size <= self.max_capacity {
            return;
        }

        let mut entries = match fs::read_dir(&self.dir).await {
            Ok(e) => e,
            Err(_) => return,
        };

        let mut files: Vec<(PathBuf, u64, std::time::SystemTime)> = Vec::new();
        while let Ok(Some(entry)) = entries.next_entry().await {
            if let Ok(meta) = entry.metadata().await
                && meta.is_file()
            {
                let modified = meta.modified().unwrap_or(std::time::UNIX_EPOCH);
                files.push((entry.path(), meta.len(), modified));
            }
        }

        files.sort_by_key(|(_, _, modified)| *modified);

        let mut current_size = self.total_size.load(Ordering::Relaxed);
        let target = self.max_capacity.saturating_sub(incoming_size);
        let mut evicted = 0u32;
        let mut evicted_bytes = 0u64;

        for (path, size, _) in &files {
            if current_size <= target {
                break;
            }
            if path
                .file_name()
                .and_then(|n| n.to_str())
                .is_some_and(|n| n.starts_with('.') && n.ends_with(".tmp"))
            {
                continue;
            }
            if fs::remove_file(path).await.is_ok() {
                current_size = current_size.saturating_sub(*size);
                evicted += 1;
                evicted_bytes += size;
            }
        }

        self.total_size.store(current_size, Ordering::Relaxed);

        if evicted > 0 {
            tracing::info!(
                event = "cache_eviction",
                evicted,
                evicted_bytes,
                remaining_bytes = current_size,
                "evicted oldest file cache entries"
            );
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    async fn temp_cache() -> (FileCache, tempfile::TempDir) {
        let dir = tempfile::tempdir().unwrap();
        let cache = FileCache::new(dir.path().to_path_buf()).await;
        (cache, dir)
    }

    async fn temp_cache_with_limits(
        max_capacity: u64,
        max_entry_size: u64,
    ) -> (FileCache, tempfile::TempDir) {
        let dir = tempfile::tempdir().unwrap();
        let cache =
            FileCache::with_limits(dir.path().to_path_buf(), max_capacity, max_entry_size).await;
        (cache, dir)
    }

    #[tokio::test]
    async fn test_put_and_get() {
        let (cache, _dir) = temp_cache().await;
        cache.put("key1", b"hello world").await;
        let data = cache.get("key1").await.unwrap();
        assert_eq!(data, b"hello world");
    }

    #[tokio::test]
    async fn test_get_missing_key() {
        let (cache, _dir) = temp_cache().await;
        assert!(cache.get("nonexistent").await.is_none());
    }

    #[tokio::test]
    async fn test_exists() {
        let (cache, _dir) = temp_cache().await;
        assert!(!cache.exists("key1").await);
        cache.put("key1", b"data").await;
        assert!(cache.exists("key1").await);
    }

    #[tokio::test]
    async fn test_overwrite() {
        let (cache, _dir) = temp_cache().await;
        cache.put("key1", b"first").await;
        cache.put("key1", b"second").await;
        let data = cache.get("key1").await.unwrap();
        assert_eq!(data, b"second");
    }

    #[tokio::test]
    async fn test_clear() {
        let (cache, _dir) = temp_cache().await;
        cache.put("key1", b"data1").await;
        cache.put("key2", b"data2").await;
        assert!(cache.exists("key1").await);
        assert!(cache.exists("key2").await);

        cache.clear().await;

        assert!(!cache.exists("key1").await);
        assert!(!cache.exists("key2").await);
        assert_eq!(cache.total_size.load(Ordering::Relaxed), 0);
    }

    #[tokio::test]
    async fn test_creates_directory() {
        let base = tempfile::tempdir().unwrap();
        let nested = base.path().join("a").join("b").join("c");
        let _cache = FileCache::new(nested.clone()).await;
        assert!(nested.exists());
    }

    #[tokio::test]
    async fn test_rejects_oversized_entry() {
        let (cache, _dir) = temp_cache_with_limits(1024, 10).await;
        cache.put("big", &[0u8; 11]).await;
        assert!(!cache.exists("big").await);
    }

    #[tokio::test]
    async fn test_accepts_entry_at_limit() {
        let (cache, _dir) = temp_cache_with_limits(1024, 10).await;
        cache.put("exact", &[0u8; 10]).await;
        assert!(cache.exists("exact").await);
    }

    #[tokio::test]
    async fn test_eviction_when_capacity_exceeded() {
        let compressed_size = zstd::stream::encode_all(&[1u8; 20][..], ZSTD_LEVEL)
            .unwrap()
            .len() as u64;
        let capacity = compressed_size * 2 + compressed_size / 2;

        let (cache, _dir) = temp_cache_with_limits(capacity, 1024).await;

        cache.put("a", &[1u8; 20]).await;
        tokio::time::sleep(std::time::Duration::from_millis(50)).await;
        cache.put("b", &[2u8; 20]).await;

        assert!(cache.exists("a").await);
        assert!(cache.exists("b").await);

        tokio::time::sleep(std::time::Duration::from_millis(50)).await;
        cache.put("c", &[3u8; 20]).await;

        assert!(!cache.exists("a").await, "oldest entry should be evicted");
        assert!(cache.exists("b").await);
        assert!(cache.exists("c").await);
    }

    #[tokio::test]
    async fn test_total_size_tracks_correctly() {
        let (cache, _dir) = temp_cache_with_limits(4096, 1024).await;
        assert_eq!(cache.total_size.load(Ordering::Relaxed), 0);

        cache.put("a", &[0u8; 10]).await;
        let after_a = cache.total_size.load(Ordering::Relaxed);
        assert!(after_a > 0, "size should increase after put");

        cache.put("b", &[0u8; 20]).await;
        let after_b = cache.total_size.load(Ordering::Relaxed);
        assert!(after_b > after_a, "size should increase after second put");

        cache.clear().await;
        assert_eq!(cache.total_size.load(Ordering::Relaxed), 0);
    }
}
