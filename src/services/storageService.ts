import { db } from '../db/db';
import type { AppSettings } from '../types/settings';
import { DEFAULT_SETTINGS } from '../types/settings';

/**
 * Loads a setting value from IndexedDB.
 * Returns the default value if the key has never been set.
 */
export async function getSetting<K extends keyof AppSettings>(
  key: K,
): Promise<AppSettings[K]> {
  const record = await db.settings.get(key);
  if (record === undefined) return DEFAULT_SETTINGS[key];
  return record.value as AppSettings[K];
}

/**
 * Saves a setting value to IndexedDB.
 */
export async function setSetting<K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K],
): Promise<void> {
  await db.settings.put({ key, value, updatedAt: new Date() });
}

/**
 * Loads all settings, merging with defaults for any missing keys.
 */
export async function getAllSettings(): Promise<AppSettings> {
  const records = await db.settings.toArray();
  const stored = Object.fromEntries(records.map((r) => [r.key, r.value])) as Partial<AppSettings>;
  return { ...DEFAULT_SETTINGS, ...stored };
}

/**
 * Saves multiple settings at once.
 */
export async function saveSettings(updates: Partial<AppSettings>): Promise<void> {
  const now = new Date();
  const records = Object.entries(updates).map(([key, value]) => ({ key, value, updatedAt: now }));
  await db.settings.bulkPut(records);
}

/**
 * Requests persistent storage from the browser.
 * Persistent storage is not evicted automatically by the browser.
 * Returns true if granted, false otherwise.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  return navigator.storage.persist();
}

/**
 * Checks if persistent storage is granted.
 */
export async function isPersistentStorageGranted(): Promise<boolean> {
  if (!navigator.storage?.persisted) return false;
  return navigator.storage.persisted();
}

/**
 * Estimates current storage usage and quota.
 */
export async function getStorageEstimate(): Promise<StorageEstimate | null> {
  if (!navigator.storage?.estimate) return null;
  return navigator.storage.estimate();
}
