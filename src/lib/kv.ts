import { put, head, del } from '@vercel/blob';
import fs from 'fs';
import path from 'path';

export interface CacheData {
  aircraft: any[];
  components: any[];
  tasks: any[];
  snags: any[];
  flightLogs: any[];
  assemblies: any[];
  trainingRecords: any[];
  cofaResets?: any[];
  checkExtensions?: any[];
  lastUpdated: string;
}

const CACHE_BLOB_PATH = 'aircraft-cache.json';
const CACHE_FILE_PATH = path.join(process.cwd(), 'public', 'aca-cache.json');

/**
 * Read cache data from Vercel Blob
 */
export async function readCache(): Promise<CacheData | null> {
  try {
    console.log('readCache - Reading from Blob...');
    // Check if blob exists with cache busting
    const cacheBustedPath = `${CACHE_BLOB_PATH}?t=${Date.now()}`;
    const blobInfo = await head(cacheBustedPath);
    if (!blobInfo) {
      console.log('readCache - No blob found');
      return null;
    }

    console.log(`readCache - Blob URL: ${blobInfo.url}`);
    // Fetch the blob content with cache busting
    const cacheBustedUrl = `${blobInfo.url}?t=${Date.now()}`;
    console.log(`readCache - Cache-busted URL: ${cacheBustedUrl}`);
    const response = await fetch(cacheBustedUrl);
    if (!response.ok) {
      console.error(`readCache - Failed to fetch blob: ${response.status}`);
      return null;
    }

    const data = await response.json();
    console.log(`readCache - Loaded data with ${data.tasks?.length || 0} tasks`);
    return data;
  } catch (error) {
    console.error('readCache - Error reading from Blob:', error);
    return null;
  }
}

/**
 * Write cache data to Vercel Blob
 */
export async function writeCache(data: CacheData): Promise<boolean> {
  try {
    console.log('writeCache - Writing data to Blob...');
    const jsonString = JSON.stringify(data, null, 2);
    console.log(`writeCache - Data size: ${jsonString.length} characters`);
    console.log(`writeCache - Tasks count: ${data.tasks?.length || 0}`);
    
    const blob = await put(CACHE_BLOB_PATH, jsonString, {
      access: 'public',
      allowOverwrite: true, // Allow overwriting the existing cache file
    });

    console.log(`writeCache - Blob URL: ${blob.url}`);
    return !!blob.url;
  } catch (error) {
    console.error('writeCache - Error writing to Blob:', error);
    console.log('writeCache - Falling back to local file...');
    
    // Fallback to local file
    try {
      const jsonString = JSON.stringify(data, null, 2);
      fs.writeFileSync(CACHE_FILE_PATH, jsonString, 'utf8');
      console.log('writeCache - Successfully wrote to local file');
      return true;
    } catch (fileError) {
      console.error('writeCache - Error writing to local file:', fileError);
      return false;
    }
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
    assemblies: [],
    trainingRecords: [],
    cofaResets: [],
    checkExtensions: [],
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
    console.log(`updateCacheSection - Updating ${section} with ${data.length} items`);
    const currentCache = await readCache();
    if (!currentCache) {
      console.error('updateCacheSection - No current cache found');
      return false;
    }

    const updatedCache: CacheData = {
      ...currentCache,
      [section]: data,
      lastUpdated: new Date().toISOString()
    };

    console.log(`updateCacheSection - Writing updated cache for ${section}`);
    const result = await writeCache(updatedCache);
    console.log(`updateCacheSection - Write result: ${result}`);
    return result;
  } catch (error) {
    console.error('updateCacheSection - Error updating cache section:', error);
    return false;
  }
}
