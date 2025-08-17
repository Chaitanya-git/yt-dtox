/**
 * Shared utilities and constants for YouTube Detox extension
 * Following DRY principle by centralizing common functionality
 */

// Message types for inter-component communication
export const MESSAGE_TYPES = {
  CLOSE_SAVE_TABS: 'closeSaveTabs',
  TOGGLE_EXTENSION: 'toggleExtension',
  GET_SAVED_TABS: 'getSavedTabs',
  DELETE_TAB: 'deleteTab',
  CLEAR_ALL_TABS: 'clearAllTabs',
  GET_EXTENSION_STATE: 'getExtensionState'
};

// Storage keys
export const STORAGE_KEYS = {
  SAVED_TABS: 'savedTabs',
  EXTENSION_ENABLED: 'extensionEnabled'
};

// YouTube selectors - centralized for maintainability
export const YOUTUBE_SELECTORS = {
  SHORTS_CONTAINERS: [
    '[is-shorts]',
    'ytd-shorts',
    'ytd-reel-video-renderer',
    'ytd-reel-shelf-renderer',
    '[aria-label*="Shorts"]',
    '[aria-label*="shorts"]',
    'ytd-rich-shelf-renderer[is-shorts]'
  ],
  HOMEPAGE_CONTENT: '#contents',
  RECOMMENDED_VIDEOS: 'ytd-rich-grid-renderer, ytd-item-section-renderer'
};

// URL patterns
export const URL_PATTERNS = {
  SHORTS_PAGE: /\/shorts\//,
  YOUTUBE_DOMAIN: /^https?:\/\/(www\.)?youtube\.com/
};

// Configuration constants
export const CONFIG = {
  MAX_SAVED_TABS: 100,
  OVERLAY_CLASS: 'yt-detox-overlay',
  SAVED_TABS_CONTAINER_ID: 'yt-detox-saved-tabs',
  DEBOUNCE_DELAY: 300
};

/**
 * Utility functions following SOLID principles
 */

/**
 * Debounce function to prevent excessive DOM operations
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

/**
 * Generate unique ID for saved tabs
 * @returns {string} Unique identifier
 */
export function generateTabId() {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate YouTube URL
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid YouTube URL
 */
export function isValidYouTubeUrl(url) {
  return URL_PATTERNS.YOUTUBE_DOMAIN.test(url);
}

/**
 * Check if current page is a shorts page
 * @param {string} url - Current page URL
 * @returns {boolean} True if shorts page
 */
export function isShortsPage(url = window.location.href) {
  return URL_PATTERNS.SHORTS_PAGE.test(url);
}

/**
 * Safely query selector with error handling
 * @param {string} selector - CSS selector
 * @param {Element} context - Context element (default: document)
 * @returns {Element|null} Found element or null
 */
export function safeQuerySelector(selector, context = document) {
  try {
    return context.querySelector(selector);
  } catch (error) {
    console.warn('[YT Detox] Invalid selector:', selector, error);
    return null;
  }
}

/**
 * Safely query all elements with error handling
 * @param {string} selector - CSS selector
 * @param {Element} context - Context element (default: document)
 * @returns {NodeList} Found elements or empty NodeList
 */
export function safeQuerySelectorAll(selector, context = document) {
  try {
    return context.querySelectorAll(selector);
  } catch (error) {
    console.warn('[YT Detox] Invalid selector:', selector, error);
    return document.querySelectorAll(''); // Empty NodeList
  }
}

/**
 * Extract video metadata from YouTube page
 * @param {string} url - Video URL
 * @returns {Object} Video metadata
 */
export function extractVideoMetadata(url) {
  const title = document.title.replace(' - YouTube', '');
  const channelElement = safeQuerySelector('ytd-channel-name a, #owner-name a, .ytd-channel-name a');
  const thumbnailElement = safeQuerySelector('meta[property="og:image"]');
  
  return {
    id: generateTabId(),
    url,
    title: title || 'YouTube Video',
    channelName: channelElement?.textContent?.trim() || 'Unknown Channel',
    thumbnail: thumbnailElement?.content || '',
    savedAt: new Date().toISOString()
  };
}

/**
 * Send message to background script with error handling
 * @param {Object} message - Message object
 * @returns {Promise} Promise resolving to response
 */
export async function sendMessage(message) {
  try {
    return await chrome.runtime.sendMessage(message);
  } catch (error) {
    console.error('[YT Detox] Message sending failed:', error);
    throw error;
  }
}

/**
 * Get data from storage with error handling
 * @param {string|string[]} keys - Storage keys
 * @returns {Promise<Object>} Storage data
 */
export async function getStorageData(keys) {
  try {
    return await chrome.storage.local.get(keys);
  } catch (error) {
    console.error('[YT Detox] Storage read failed:', error);
    return {};
  }
}

/**
 * Set data in storage with error handling
 * @param {Object} data - Data to store
 * @returns {Promise<void>}
 */
export async function setStorageData(data) {
  try {
    await chrome.storage.local.set(data);
  } catch (error) {
    console.error('[YT Detox] Storage write failed:', error);
    throw error;
  }
}