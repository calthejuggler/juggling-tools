use std::path::PathBuf;

use tokio::fs;
use tokio::io::AsyncWriteExt;

#[derive(Clone)]
pub struct FileCache {
    dir: PathBuf,
}

impl FileCache {
    pub async fn new(dir: PathBuf) -> Self {
        fs::create_dir_all(&dir).await.ok();
        FileCache { dir }
    }

    fn path(&self, key: &str) -> PathBuf {
        self.dir.join(key)
    }

    pub async fn get(&self, key: &str) -> Option<Vec<u8>> {
        fs::read(self.path(key)).await.ok()
    }

    pub async fn exists(&self, key: &str) -> bool {
        self.path(key).exists()
    }

    pub async fn put(&self, key: &str, data: &[u8]) {
        let final_path = self.path(key);
        let tmp_path = self.dir.join(format!(".{}.tmp", key));

        let result = async {
            let mut f = fs::File::create(&tmp_path).await?;
            f.write_all(data).await?;
            f.sync_all().await?;
            fs::rename(&tmp_path, &final_path).await
        }
        .await;

        if result.is_err() {
            fs::remove_file(&tmp_path).await.ok();
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
    async fn test_creates_directory() {
        let base = tempfile::tempdir().unwrap();
        let nested = base.path().join("a").join("b").join("c");
        let _cache = FileCache::new(nested.clone()).await;
        assert!(nested.exists());
    }
}
