use bytes::Bytes;
use moka::future::Cache;

const MAX_CAPACITY: u64 = 256 * 1024 * 1024; // 256 MB
const MAX_ENTRY_SIZE: u32 = 1024 * 1024; // 1 MB

pub fn build_memory_cache() -> Cache<String, Bytes> {
    Cache::builder()
        .max_capacity(MAX_CAPACITY)
        .weigher(|_key: &String, value: &Bytes| -> u32 {
            value.len().try_into().unwrap_or(u32::MAX)
        })
        .build()
}

pub fn fits_in_memory(data: &[u8]) -> bool {
    data.len() <= MAX_ENTRY_SIZE as usize
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fits_in_memory_boundary() {
        let at_limit = vec![0u8; MAX_ENTRY_SIZE as usize];
        assert!(fits_in_memory(&at_limit));

        let over_limit = vec![0u8; MAX_ENTRY_SIZE as usize + 1];
        assert!(!fits_in_memory(&over_limit));

        assert!(fits_in_memory(&[]));
    }
}
