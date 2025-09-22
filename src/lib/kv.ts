import { put, head, del } from '@vercel/blob';

export interface CacheData {
  aircraft: any[];
  components: any[];
  tasks: any[];
  snags: any[];
  flightLogs: any[];
  lastUpdated: string;
}

const CACHE_BLOB_PATH = 'aircraft-cache.json';

/**
 * Read cache data from Vercel Blob
 */
export async function readCache(): Promise<CacheData | null> {
  try {
    // Check if blob exists
    const blobInfo = await head(CACHE_BLOB_PATH);
    if (!blobInfo) {
      return null;
    }

    // Fetch the blob content
    const response = await fetch(blobInfo.url);
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error reading from Blob:', error);
    return null;
  }
}

/**
 * Write cache data to Vercel Blob
 */
export async function writeCache(data: CacheData): Promise<boolean> {
  try {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = await put(CACHE_BLOB_PATH, jsonString, {
      access: 'public',
      allowOverwrite: true, // Allow overwriting the existing cache file
      cacheControlMaxAge: 60, // Cache for 1 minute to allow updates
    });

    return !!blob.url;
  } catch (error) {
    console.error('Error writing to Blob:', error);
    return false;
  }
}

/**
 * Initialize cache with default data if it doesn't exist
 */
export async function initializeCache(): Promise<CacheData> {
  const existing = await readCache();
  if (existing) {
    return existing;
  }

  // Default cache structure
  const defaultCache: CacheData = {
    aircraft: [],
    components: [],
    tasks: [],
    snags: [],
    flightLogs: [],
    lastUpdated: new Date().toISOString()
  };

  await writeCache(defaultCache);
  return defaultCache;
}

/**
 * Update specific section of cache
 */
export async function updateCacheSection(
  section: keyof Omit<CacheData, 'lastUpdated'>,
  data: any[]
): Promise<boolean> {
  try {
    const currentCache = await readCache();
    if (!currentCache) {
      return false;
    }

    const updatedCache: CacheData = {
      ...currentCache,
      [section]: data,
      lastUpdated: new Date().toISOString()
    };

    return await writeCache(updatedCache);
  } catch (error) {
    console.error('Error updating cache section:', error);
    return false;
  }
}
