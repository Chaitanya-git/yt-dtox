/**
 * Background script for YouTube Detox extension
 * Handles tab management, storage operations, and message routing
 * Follows Single Responsibility Principle
 */

// Import utilities (Note: In MV3, we need to handle imports differently)
// For now, we'll duplicate essential constants and functions

const MESSAGE_TYPES = {
  CLOSE_SAVE_TABS: 'closeSaveTabs',
  REOPEN_ALL_TABS: 'reopenAllTabs',
  TOGGLE_EXTENSION: 'toggleExtension',
  GET_SAVED_TABS: 'getSavedTabs',
  DELETE_TAB: 'deleteTab',
  CLEAR_ALL_TABS: 'clearAllTabs',
  GET_EXTENSION_STATE: 'getExtensionState'
};

const STORAGE_KEYS = {
  SAVED_TABS: 'savedTabs',
  EXTENSION_ENABLED: 'extensionEnabled'
};

const CONFIG = {
  MAX_SAVED_TABS: 100
};

/**
 * Tab Management Service
 * Encapsulates all tab-related operations
 */
class TabManager {
  /**
   * Get all YouTube tabs across all windows
   * @returns {Promise<chrome.tabs.Tab[]>} Array of YouTube tabs
   */
  async getYouTubeTabs() {
    try {
      const tabs = await chrome.tabs.query({
        url: ['*://youtube.com/*', '*://*.youtube.com/*']
      });
      return tabs;
    } catch (error) {
      console.error('[YT Detox] Failed to query tabs:', error);
      return [];
    }
  }

  /**
   * Extract metadata from a tab
   * @param {chrome.tabs.Tab} tab - Browser tab object
   * @returns {Object} Tab metadata
   */
  extractTabMetadata(tab) {
    return {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      url: tab.url,
      title: tab.title?.replace(' - YouTube', '') || 'YouTube Video',
      channelName: this.extractChannelFromTitle(tab.title) || 'Unknown Channel',
      savedAt: new Date().toISOString()
    };
  }


  /**
   * Extract channel name from tab title
   * @param {string} title - Tab title
   * @returns {string} Channel name
   */
  extractChannelFromTitle(title) {
    if (!title) return null;
    
    // Common YouTube title patterns
    const patterns = [
      /^(.+?) - YouTube$/,
      /^(.+?) \| YouTube$/,
      /^(.+?) on YouTube$/
    ];

    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }


  /**
   * Close and save all YouTube tabs
   * @returns {Promise<Object>} Result with saved tabs count
   */
  async closeAndSaveAllTabs() {
    try {
      const tabs = await this.getYouTubeTabs();
      
      if (tabs.length === 0) {
        return { success: true, count: 0, message: 'No YouTube tabs to close' };
      }

      // Extract metadata from each tab (without thumbnails)
      const tabsMetadata = tabs.map(tab => this.extractTabMetadata(tab));
      
      // Save tabs to storage
      const saveResult = await StorageManager.saveTabs(tabsMetadata);
      
      if (saveResult.success) {
        // Close tabs after successful save
        const tabIds = tabs.map(tab => tab.id);
        await chrome.tabs.remove(tabIds);
        
        return {
          success: true,
          count: tabs.length,
          message: `Closed and saved ${tabs.length} YouTube tabs`
        };
      } else {
        throw new Error(saveResult.error);
      }
    } catch (error) {
      console.error('[YT Detox] Failed to close and save tabs:', error);
      return {
        success: false,
        count: 0,
        error: error.message
      };
    }
  }

  /**
   * Reopen all saved tabs
   * @returns {Promise<Object>} Result with reopened tabs count
   */
  async reopenAllTabs() {
    try {
      const savedTabs = await StorageManager.getSavedTabs();
      
      if (savedTabs.length === 0) {
        return { success: true, count: 0, message: 'No saved tabs to reopen' };
      }

      // Open each tab
      const openedTabs = [];
      for (const tab of savedTabs) {
        try {
          const newTab = await chrome.tabs.create({
            url: tab.url,
            active: false // Don't switch to each tab as it opens
          });
          openedTabs.push(newTab);
        } catch (error) {
          console.error('[YT Detox] Failed to open tab:', tab.url, error);
        }
      }

      return {
        success: true,
        count: openedTabs.length,
        message: `Reopened ${openedTabs.length} tabs`
      };
    } catch (error) {
      console.error('[YT Detox] Failed to reopen tabs:', error);
      return {
        success: false,
        count: 0,
        error: error.message
      };
    }
  }
}

/**
 * Storage Management Service
 * Handles all storage operations with error handling and data validation
 */
class StorageManager {
  /**
   * Get saved tabs from storage
   * @returns {Promise<Array>} Array of saved tabs
   */
  static async getSavedTabs() {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.SAVED_TABS);
      return result[STORAGE_KEYS.SAVED_TABS] || [];
    } catch (error) {
      console.error('[YT Detox] Failed to get saved tabs:', error);
      return [];
    }
  }

  /**
   * Save tabs to storage with deduplication and limits
   * @param {Array} newTabs - Array of tab metadata
   * @returns {Promise<Object>} Save operation result
   */
  static async saveTabs(newTabs) {
    try {
      const existingTabs = await this.getSavedTabs();
      
      // Merge and deduplicate tabs (by URL)
      const allTabs = [...existingTabs];
      const existingUrls = new Set(existingTabs.map(tab => tab.url));
      
      for (const newTab of newTabs) {
        if (!existingUrls.has(newTab.url)) {
          allTabs.push(newTab);
        }
      }

      // Enforce storage limits (keep most recent)
      const limitedTabs = allTabs
        .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt))
        .slice(0, CONFIG.MAX_SAVED_TABS);

      await chrome.storage.local.set({
        [STORAGE_KEYS.SAVED_TABS]: limitedTabs
      });

      return { success: true, count: limitedTabs.length };
    } catch (error) {
      console.error('[YT Detox] Failed to save tabs:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a specific saved tab
   * @param {string} tabId - ID of tab to delete
   * @returns {Promise<Object>} Delete operation result
   */
  static async deleteTab(tabId) {
    try {
      const savedTabs = await this.getSavedTabs();
      const filteredTabs = savedTabs.filter(tab => tab.id !== tabId);
      
      await chrome.storage.local.set({
        [STORAGE_KEYS.SAVED_TABS]: filteredTabs
      });

      return {
        success: true,
        deleted: savedTabs.length - filteredTabs.length > 0
      };
    } catch (error) {
      console.error('[YT Detox] Failed to delete tab:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clear all saved tabs
   * @returns {Promise<Object>} Clear operation result
   */
  static async clearAllTabs() {
    try {
      await chrome.storage.local.set({
        [STORAGE_KEYS.SAVED_TABS]: []
      });

      return { success: true };
    } catch (error) {
      console.error('[YT Detox] Failed to clear tabs:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get extension enabled state
   * @returns {Promise<boolean>} Extension enabled state
   */
  static async getExtensionState() {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.EXTENSION_ENABLED);
      return result[STORAGE_KEYS.EXTENSION_ENABLED] !== false; // Default to true
    } catch (error) {
      console.error('[YT Detox] Failed to get extension state:', error);
      return true; // Default to enabled
    }
  }

  /**
   * Toggle extension enabled state
   * @returns {Promise<Object>} Toggle operation result
   */
  static async toggleExtension() {
    try {
      const currentState = await this.getExtensionState();
      const newState = !currentState;
      
      await chrome.storage.local.set({
        [STORAGE_KEYS.EXTENSION_ENABLED]: newState
      });

      return { success: true, enabled: newState };
    } catch (error) {
      console.error('[YT Detox] Failed to toggle extension:', error);
      return { success: false, error: error.message };
    }
  }
}

/**
 * Message Router
 * Handles communication between extension components
 */
class MessageRouter {
  constructor() {
    this.tabManager = new TabManager();
    this.setupMessageListener();
  }

  /**
   * Set up message listener for popup and content script communications
   */
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender)
        .then(response => sendResponse(response))
        .catch(error => sendResponse({ success: false, error: error.message }));
      
      // Return true to indicate async response
      return true;
    });
  }

  /**
   * Route messages to appropriate handlers
   * @param {Object} message - Message object
   * @param {Object} sender - Message sender info
   * @returns {Promise<Object>} Message response
   */
  async handleMessage(message, sender) {
    try {
      switch (message.type) {
        case MESSAGE_TYPES.CLOSE_SAVE_TABS:
          return await this.tabManager.closeAndSaveAllTabs();

        case MESSAGE_TYPES.REOPEN_ALL_TABS:
          return await this.tabManager.reopenAllTabs();

        case MESSAGE_TYPES.GET_SAVED_TABS:
          const tabs = await StorageManager.getSavedTabs();
          return { success: true, tabs };

        case MESSAGE_TYPES.DELETE_TAB:
          return await StorageManager.deleteTab(message.tabId);

        case MESSAGE_TYPES.CLEAR_ALL_TABS:
          return await StorageManager.clearAllTabs();

        case MESSAGE_TYPES.TOGGLE_EXTENSION:
          return await StorageManager.toggleExtension();

        case MESSAGE_TYPES.GET_EXTENSION_STATE:
          const enabled = await StorageManager.getExtensionState();
          return { success: true, enabled };

        default:
          return { success: false, error: 'Unknown message type' };
      }
    } catch (error) {
      console.error('[YT Detox] Message handling error:', error);
      return { success: false, error: error.message };
    }
  }
}

/**
 * Initialize background script
 */
function initialize() {
  console.log('[YT Detox] Background script initialized');
  
  // Set up message routing
  new MessageRouter();

  // Set default extension state on install
  chrome.runtime.onInstalled.addListener(async () => {
    try {
      const { extensionEnabled } = await chrome.storage.local.get(STORAGE_KEYS.EXTENSION_ENABLED);
      if (extensionEnabled === undefined) {
        await chrome.storage.local.set({
          [STORAGE_KEYS.EXTENSION_ENABLED]: true,
          [STORAGE_KEYS.SAVED_TABS]: []
        });
      }
    } catch (error) {
      console.error('[YT Detox] Initialization error:', error);
    }
  });
}

// Start the background script
initialize();