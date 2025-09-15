/**
 * Search Analytics Utility
 * Tracks search performance and user behavior
 */
class SearchAnalytics {
  constructor() {
    this.searches = [];
    this.maxEntries = 100;
  }

  // Track a search query
  trackSearch(query, resultCount, responseTime, isLiveSearch = false) {
    const searchEntry = {
      id: Date.now() + Math.random(),
      query: query.trim(),
      resultCount,
      responseTime,
      isLiveSearch,
      timestamp: new Date().toISOString(),
      queryLength: query.trim().length,
      isMultiQuery: query.includes(',')
    };

    this.searches.unshift(searchEntry);
    
    // Keep only recent searches
    if (this.searches.length > this.maxEntries) {
      this.searches = this.searches.slice(0, this.maxEntries);
    }

    // Log performance metrics
    if (typeof window !== 'undefined' && window.console) {
      console.log(`🔍 Search Analytics:`, {
        query: searchEntry.query,
        results: resultCount,
        time: `${responseTime}ms`,
        type: isLiveSearch ? 'Live' : 'Full'
      });
    }

    return searchEntry;
  }

  // Get search statistics
  getStats() {
    if (this.searches.length === 0) {
      return {
        totalSearches: 0,
        averageResponseTime: 0,
        averageResults: 0,
        popularQueries: [],
        recentSearches: []
      };
    }

    const totalSearches = this.searches.length;
    const averageResponseTime = Math.round(
      this.searches.reduce((sum, s) => sum + s.responseTime, 0) / totalSearches
    );
    const averageResults = Math.round(
      this.searches.reduce((sum, s) => sum + s.resultCount, 0) / totalSearches
    );

    // Get popular queries (by frequency)
    const queryFrequency = {};
    this.searches.forEach(search => {
      const normalizedQuery = search.query.toLowerCase();
      queryFrequency[normalizedQuery] = (queryFrequency[normalizedQuery] || 0) + 1;
    });

    const popularQueries = Object.entries(queryFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([query, count]) => ({ query, count }));

    const recentSearches = this.searches.slice(0, 10);

    return {
      totalSearches,
      averageResponseTime,
      averageResults,
      popularQueries,
      recentSearches,
      liveSearchCount: this.searches.filter(s => s.isLiveSearch).length,
      multiQueryCount: this.searches.filter(s => s.isMultiQuery).length
    };
  }

  // Get performance insights
  getPerformanceInsights() {
    const stats = this.getStats();
    const insights = [];

    if (stats.averageResponseTime > 2000) {
      insights.push({
        type: 'warning',
        message: `Average response time is ${stats.averageResponseTime}ms. Consider optimizing search queries.`
      });
    }

    if (stats.averageResults < 5) {
      insights.push({
        type: 'info',
        message: 'Low average result count. Users might need help with search terms.'
      });
    }

    if (stats.liveSearchCount > stats.totalSearches * 0.8) {
      insights.push({
        type: 'success',
        message: 'High live search usage indicates good user experience.'
      });
    }

    return insights;
  }

  // Clear analytics data
  clear() {
    this.searches = [];
  }

  // Export data for analysis
  exportData() {
    return {
      searches: this.searches,
      stats: this.getStats(),
      insights: this.getPerformanceInsights(),
      exportedAt: new Date().toISOString()
    };
  }
}

// Export singleton instance
export const searchAnalytics = new SearchAnalytics();