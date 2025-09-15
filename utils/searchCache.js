/**
 * Simple in-memory cache for search results
 * Implements LRU (Least Recently Used) eviction policy
 */
class SearchCache {
  constructor(maxSize = 50, ttl = 5 * 60 * 1000) { // 5 minutes TTL
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  // Generate cache key from search parameters
  generateKey(query, folderId, selectedFolder, selectedFileType, fileNameFilter) {
    return `${query}|${folderId}|${selectedFolder}|${selectedFileType}|${fileNameFilter}`;
  }

  // Get cached result
  get(query, folderId, selectedFolder, selectedFileType, fileNameFilter) {
    const key = this.generateKey(query, folderId, selectedFolder, selectedFileType, fileNameFilter);
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    // Check if expired
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, cached);
    
    return cached.data;
  }

  // Set cache entry
  set(query, folderId, selectedFolder, selectedFileType, fileNameFilter, data) {
    const key = this.generateKey(query, folderId, selectedFolder, selectedFileType, fileNameFilter);
    
    // Remove oldest entries if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // Clear all cache
  clear() {
    this.cache.clear();
  }

  // Get cache stats
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
export const searchCache = new SearchCache();