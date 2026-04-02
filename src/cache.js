const NodeCache = require('node-cache')
const logger = require('./logger')

// Cache configuration with TTL in seconds
const CACHE_CONFIG = {
  stdTTL: 300, // Default 5 minutes
  checkperiod: 600, // Check for expired keys every 10 minutes
  useClones: false // Return references for better performance
}

// TTL presets for different data types
const TTL = {
  POST_LIST: 300, // 5 minutes
  POST_SINGLE: 600, // 10 minutes
  AUTHOR_LIST: 900, // 15 minutes
  AUTHOR_SINGLE: 900 // 15 minutes
}

// Cache namespace prefixes
const KEYS = {
  POST_LIST: (busqueda, pagina) => `posts:list:${busqueda}:${pagina}`,
  POST_SINGLE: (id) => `posts:${id}`,
  AUTHOR_LIST: 'authors:list',
  AUTHOR_SINGLE: (id) => `authors:${id}`
}

// Metrics tracking
let metrics = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0
}

const cache = new NodeCache(CACHE_CONFIG)

// Log cache statistics periodically in development
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    const stats = cache.getStats()
    logger.debug({
      hits: metrics.hits,
      misses: metrics.misses,
      hitRate: metrics.hits + metrics.misses > 0
        ? ((metrics.hits / (metrics.hits + metrics.misses)) * 100).toFixed(1) + '%'
        : '0%',
      keys: stats.keys,
      hits_internal: stats.hits,
      misses_internal: stats.misses
    }, 'Cache statistics')
  }, 60000) // Every minute
}

/**
 * Get a value from cache.
 * Returns { data, hit: boolean }
 */
function get(key) {
  const data = cache.get(key)
  if (data !== undefined) {
    metrics.hits++
    logger.debug({ key }, 'Cache HIT')
    return { data, hit: true }
  }
  metrics.misses++
  logger.debug({ key }, 'Cache MISS')
  return { data: undefined, hit: false }
}

/**
 * Set a value in cache with optional TTL.
 */
function set(key, data, ttl = CACHE_CONFIG.stdTTL) {
  cache.set(key, data, ttl)
  metrics.sets++
  logger.debug({ key, ttl }, 'Cache SET')
}

/**
 * Delete a single key from cache.
 */
function del(key) {
  cache.del(key)
  metrics.deletes++
  logger.debug({ key }, 'Cache DEL')
}

/**
 * Delete multiple keys matching a pattern.
 * node-cache doesn't support pattern matching, so we use keys() and filter.
 */
function delByPattern(pattern) {
  const keys = cache.keys()
  const matchingKeys = keys.filter(k => k.startsWith(pattern))
  if (matchingKeys.length > 0) {
    cache.del(matchingKeys)
    metrics.deletes += matchingKeys.length
    logger.debug({ pattern, count: matchingKeys.length }, 'Cache DEL by pattern')
  }
}

/**
 * Invalidate all post-related cache entries.
 */
function invalidatePosts() {
  delByPattern('posts:')
  logger.info('Cache invalidated: all posts')
}

/**
 * Invalidate all author-related cache entries.
 */
function invalidateAuthors() {
  delByPattern('authors:')
  logger.info('Cache invalidated: all authors')
}

/**
 * Get current cache metrics.
 */
function getMetrics() {
  return {
    ...metrics,
    hitRate: metrics.hits + metrics.misses > 0
      ? ((metrics.hits / (metrics.hits + metrics.misses)) * 100).toFixed(1) + '%'
      : '0%',
    keys: cache.keys().length,
    ...cache.getStats()
  }
}

/**
 * Flush all cache entries.
 */
function flushAll() {
  cache.flushAll()
  metrics = { hits: 0, misses: 0, sets: 0, deletes: 0 }
  logger.info('Cache flushed')
}

module.exports = {
  cache,
  get,
  set,
  del,
  delByPattern,
  invalidatePosts,
  invalidateAuthors,
  TTL,
  KEYS,
  getMetrics,
  flushAll
}
