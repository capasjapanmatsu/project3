/**
 * Safe storage utility to handle localStorage and sessionStorage access
 * with proper error handling and fallbacks
 */

/**
 * Check if storage is available in the current environment
 * @param type - The type of storage to check ('localStorage' or 'sessionStorage')
 * @returns boolean indicating if the storage is available
 */
export function isStorageAvailable(type: 'localStorage' | 'sessionStorage'): boolean {
  try {
    const storage = window[type];
    const testKey = '__storage_test__';
    storage.setItem(testKey, testKey);
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * In-memory fallback storage when browser storage is not available
 */
const memoryStorage: Record<string, string> = {};

/**
 * Safely get an item from storage with fallback to memory storage
 * @param key - The key to retrieve
 * @param storageType - The type of storage to use ('localStorage' or 'sessionStorage')
 * @returns The stored value or null if not found
 */
export function safeGetItem(key: string, storageType: 'localStorage' | 'sessionStorage' = 'localStorage'): string | null {
  try {
    if (isStorageAvailable(storageType)) {
      return window[storageType].getItem(key);
    } else {
      return memoryStorage[key] || null;
    }
  } catch (e) {
    console.warn(`Error accessing ${storageType}:`, e);
    return memoryStorage[key] || null;
  }
}

/**
 * Safely set an item in storage with fallback to memory storage
 * @param key - The key to set
 * @param value - The value to store
 * @param storageType - The type of storage to use ('localStorage' or 'sessionStorage')
 * @returns boolean indicating if the operation was successful
 */
export function safeSetItem(key: string, value: string, storageType: 'localStorage' | 'sessionStorage' = 'localStorage'): boolean {
  try {
    if (isStorageAvailable(storageType)) {
      window[storageType].setItem(key, value);
      return true;
    } else {
      memoryStorage[key] = value;
      return true;
    }
  } catch (e) {
    console.warn(`Error writing to ${storageType}:`, e);
    memoryStorage[key] = value;
    return false;
  }
}

/**
 * Safely remove an item from storage with fallback to memory storage
 * @param key - The key to remove
 * @param storageType - The type of storage to use ('localStorage' or 'sessionStorage')
 * @returns boolean indicating if the operation was successful
 */
export function safeRemoveItem(key: string, storageType: 'localStorage' | 'sessionStorage' = 'localStorage'): boolean {
  try {
    if (isStorageAvailable(storageType)) {
      window[storageType].removeItem(key);
      return true;
    } else {
      delete memoryStorage[key];
      return true;
    }
  } catch (e) {
    console.warn(`Error removing from ${storageType}:`, e);
    delete memoryStorage[key];
    return false;
  }
}
