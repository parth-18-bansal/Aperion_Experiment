import { Logger } from "../logger";
/**
 * Simple local storage utility that can safely get/set number, boolean and object values too
 * not only string as in plain localStorage.
 *
 * Provides type-safe access to localStorage with proper error handling and type conversion.
 */
export class StorageWrapper {
  /**
   * Get a string value from storage
   * @param key The key to retrieve
   * @returns The stored string value or undefined if not found
   */
  public getString(key: string) {
    return localStorage.getItem(key) ?? undefined;
  }

  /**
   * Set a string value to storage
   * @param key The key to store the value under
   * @param value The string value to store
   */
  public setString(key: string, value: string) {
    localStorage.setItem(key, value);
  }

  /**
   * Get a number value from storage or undefined if value can't be converted
   * @param key The key to retrieve
   * @returns The stored number value, null if conversion fails, or undefined if not found
   */
  public getNumber(key: string) {
    const str = this.getString(key) ?? undefined;
    const value = Number(str);
    return isNaN(value) ? null : value;
  }

  /**
   * Set a number value to storage
   * @param key The key to store the value under
   * @param value The number value to store
   */
  public setNumber(key: string, value: number) {
    this.setString(key, String(value));
  }

  /**
   * Get a boolean value from storage or undefined if value can't be converted
   * @param key The key to retrieve
   * @returns The stored boolean value or undefined if not found
   */
  public getBool(key: string) {
    const bool = localStorage.getItem(key);
    return bool ? Boolean(bool.toLowerCase()) : undefined;
  }

  /**
   * Set a boolean value to storage
   * @param key The key to store the value under
   * @param value The boolean value to store
   */
  public setBool(key: string, value: boolean) {
    localStorage.setItem(key, String(value));
  }

  /**
   * Get an object value from storage or undefined if value can't be parsed
   * @param key The key to retrieve
   * @returns The stored object or undefined if not found or parsing fails
   */
  public getObject(key: string) {
    const str = this.getString(key);
    if (!str) return undefined;
    try {
      return JSON.parse(str);
    } catch (e) {
      Logger.warn(e);
      return undefined;
    }
  }

  /**
   * Set an object value to storage
   * @param key The key to store the value under
   * @param value The object value to store (will be JSON stringified)
   */
  public setObject(key: string, value: Record<string, unknown>) {
    this.setString(key, JSON.stringify(value));
  }

  /**
   * Remove a value from storage
   * @param key The key to remove
   */
  public remove(key: string) {
    localStorage.removeItem(key);
  }

  /**
   * Clear all values from storage
   * Removes all items stored in localStorage
   */
  public clear() {
    localStorage.clear();
  }

  /**
   * Check if a value exists in storage
   * @param key The key to check
   * @returns True if the key exists, false otherwise
   */
  public has(key: string) {
    return localStorage.getItem(key) !== null;
  }

  /**
   * Get all keys from storage
   * @returns Array of all keys in localStorage
   */
  public keys() {
    return Object.keys(localStorage);
  }

  /**
   * Get all values from storage
   * @returns Array of all values in localStorage
   */
  public values() {
    return Object.values(localStorage);
  }

  /**
   * Get all entries from storage
   * @returns Array of objects containing key-value pairs
   */
  public entries() {
    return Object.entries(localStorage).map(([key, value]) => ({
      key,
      value,
    }));
  }

  /**
   * Get the size of storage
   * @returns The number of items in localStorage
   */
  public size() {
    return localStorage.length;
  }
}
