/**
 * Popup Script for YouTube Detox Extension
 * Handles user interactions in the extension popup
 * Follows SOLID principles with clean separation of concerns
 */

/**
 * Constants
 */
const MESSAGE_TYPES = {
  CLOSE_SAVE_TABS: 'closeSaveTabs',
  REOPEN_ALL_TABS: 'reopenAllTabs',
  TOGGLE_EXTENSION: 'toggleExtension',
  GET_SAVED_TABS: 'getSavedTabs',
  DELETE_TAB: 'deleteTab',
  CLEAR_ALL_TABS: 'clearAllTabs',
  GET_EXTENSION_STATE: 'getExtensionState'
};

const UI_ELEMENTS = {
  closeSaveBtn: document.getElementById('closeSaveBtn'),
  reopenAllBtn: document.getElementById('reopenAllBtn'),
  actionText: document.getElementById('actionText'),
  actionSpinner: document.getElementById('actionSpinner'),
  openTabsCount: document.getElementById('openTabsCount'),
  savedTabsCount: document.getElementById('savedTabsCount'),
  extensionToggle: document.getElementById('extensionToggle'),
  statusMessage: document.getElementById('statusMessage'),
  savedTabsList: document.getElementById('savedTabsList'),
  clearAllTabsBtn: document.getElementById('clearAllTabsBtn')
};

/**
 * Utility Functions
 */
function extractVideoIdFromUrl(url) {
  try {
    const urlObj = new URL(url);
    let videoId = null;

    if (urlObj.hostname.includes('youtube.com')) {
      if (urlObj.pathname === '/watch') {
        videoId = urlObj.searchParams.get('v');
      } else if (urlObj.pathname.startsWith('/shorts/')) {
        videoId = urlObj.pathname.split('/shorts/')[1]?.split('?')[0];
      }
    } else if (urlObj.hostname === 'youtu.be') {
      videoId = urlObj.pathname.substring(1).split('?')[0];
    }

    // Validate video ID format (11 characters, alphanumeric + - and _)
    if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      return videoId;
    }
  } catch (error) {
    console.error('[YT Detox] Failed to extract video ID:', error);
  }
  
  return null;
}

function generateThumbnailUrl(videoId) {
  // Use mqdefault (320x180) which is reliable and good quality
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

async function sendMessage(message) {
  try {
    return await chrome.runtime.sendMessage(message);
  } catch (error) {
    console.error('[YT Detox] Message sending failed:', error);
    return { success: false, error: error.message };
  }
}

async function getYouTubeTabs() {
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

function showMessage(text, isError = false) {
  UI_ELEMENTS.statusMessage.textContent = text;
  UI_ELEMENTS.statusMessage.className = `status-message ${isError ? 'error' : ''}`;
  UI_ELEMENTS.statusMessage.style.display = 'block';
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
    UI_ELEMENTS.statusMessage.style.display = 'none';
  }, 3000);
}

function setLoading(isLoading) {
  if (isLoading) {
    document.body.classList.add('loading');
    UI_ELEMENTS.actionText.textContent = 'Processing...';
    UI_ELEMENTS.actionSpinner.style.display = 'block';
    UI_ELEMENTS.closeSaveBtn.disabled = true;
  } else {
    document.body.classList.remove('loading');
    UI_ELEMENTS.actionText.textContent = 'Close & Save YouTube Tabs';
    UI_ELEMENTS.actionSpinner.style.display = 'none';
    UI_ELEMENTS.closeSaveBtn.disabled = false;
  }
}

/**
 * Stats Manager
 * Handles updating and displaying statistics
 */
class StatsManager {
  constructor(reopenTabsManager = null) {
    this.openTabsCount = 0;
    this.savedTabsCount = 0;
    this.reopenTabsManager = reopenTabsManager;
  }

  /**
   * Update open tabs count
   */
  async updateOpenTabsCount() {
    try {
      const tabs = await getYouTubeTabs();
      this.openTabsCount = tabs.length;
      UI_ELEMENTS.openTabsCount.textContent = this.openTabsCount.toString();
    } catch (error) {
      console.error('[YT Detox] Failed to update open tabs count:', error);
      UI_ELEMENTS.openTabsCount.textContent = '?';
    }
  }

  /**
   * Update saved tabs count
   */
  async updateSavedTabsCount() {
    try {
      const response = await sendMessage({
        type: MESSAGE_TYPES.GET_SAVED_TABS
      });

      if (response.success) {
        this.savedTabsCount = (response.tabs || []).length;
        UI_ELEMENTS.savedTabsCount.textContent = this.savedTabsCount.toString();
        
        // Update reopen button state
        if (this.reopenTabsManager) {
          this.reopenTabsManager.updateButtonState(this.savedTabsCount);
        }
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('[YT Detox] Failed to update saved tabs count:', error);
      UI_ELEMENTS.savedTabsCount.textContent = '?';
    }
  }

  /**
   * Update all stats
   */
  async updateAll() {
    await Promise.all([
      this.updateOpenTabsCount(),
      this.updateSavedTabsCount()
    ]);
  }
}

/**
 * Extension Toggle Manager
 * Handles the extension enable/disable toggle
 */
class ExtensionToggle {
  constructor() {
    this.isEnabled = true;
    this.setupEventListeners();
  }

  /**
   * Set up event listeners for the toggle
   */
  setupEventListeners() {
    // Click handler
    UI_ELEMENTS.extensionToggle.addEventListener('click', () => {
      this.toggle();
    });

    // Keyboard handler for accessibility
    UI_ELEMENTS.extensionToggle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  /**
   * Update the visual state of the toggle
   */
  updateVisualState() {
    if (this.isEnabled) {
      UI_ELEMENTS.extensionToggle.classList.add('enabled');
      UI_ELEMENTS.extensionToggle.setAttribute('aria-checked', 'true');
    } else {
      UI_ELEMENTS.extensionToggle.classList.remove('enabled');
      UI_ELEMENTS.extensionToggle.setAttribute('aria-checked', 'false');
    }
  }

  /**
   * Load current state from storage
   */
  async loadState() {
    try {
      const response = await sendMessage({
        type: MESSAGE_TYPES.GET_EXTENSION_STATE
      });

      if (response.success) {
        this.isEnabled = response.enabled;
        this.updateVisualState();
      }
    } catch (error) {
      console.error('[YT Detox] Failed to load extension state:', error);
    }
  }

  /**
   * Toggle the extension state
   */
  async toggle() {
    try {
      const response = await sendMessage({
        type: MESSAGE_TYPES.TOGGLE_EXTENSION
      });

      if (response.success) {
        this.isEnabled = response.enabled;
        this.updateVisualState();
        
        const statusText = this.isEnabled 
          ? 'Extension enabled' 
          : 'Extension disabled';
        showMessage(statusText);
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('[YT Detox] Failed to toggle extension:', error);
      showMessage('Failed to toggle extension', true);
    }
  }
}

/**
 * Saved Tabs List Manager
 * Handles displaying and managing saved tabs in popup
 */
class SavedTabsListManager {
  constructor() {
    this.setupEventListeners();
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    UI_ELEMENTS.clearAllTabsBtn.addEventListener('click', () => {
      this.clearAllTabs();
    });
  }

  /**
   * Format relative time for display
   * @param {string} isoString - ISO date string
   * @returns {string} Formatted relative time
   */
  formatRelativeTime(isoString) {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now - date;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
      return `${Math.floor(diffDays / 30)}m ago`;
    } catch {
      return 'Recently';
    }
  }

  /**
   * Create a saved tab item element
   * @param {Object} tab - Tab data
   * @returns {Element} Tab item element
   */
  createTabItem(tab) {
    const item = document.createElement('div');
    item.className = 'saved-tab-item';
    item.setAttribute('data-tab-id', tab.id);

    // Generate thumbnail on-demand from URL
    const videoId = extractVideoIdFromUrl(tab.url);
    const thumbnailUrl = videoId ? generateThumbnailUrl(videoId) : null;

    const thumbnailHtml = thumbnailUrl 
      ? `<img src="${thumbnailUrl}" alt="" loading="lazy">`
      : '📺';

    item.innerHTML = `
      <div class="saved-tab-thumbnail">${thumbnailHtml}</div>
      <div class="saved-tab-info">
        <a href="${tab.url}" class="saved-tab-title" title="${tab.title}" target="_blank">
          ${tab.title}
        </a>
        <div class="saved-tab-date">${this.formatRelativeTime(tab.savedAt)}</div>
      </div>
      <div class="saved-tab-actions">
        <button class="delete-tab-btn" data-action="delete" title="Delete tab">×</button>
      </div>
    `;

    // Add delete event listener
    const deleteBtn = item.querySelector('[data-action="delete"]');
    deleteBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.deleteTab(tab.id);
    });

    return item;
  }

  /**
   * Render saved tabs list
   * @param {Array} tabs - Array of saved tabs
   */
  async renderTabs(tabs) {
    const container = UI_ELEMENTS.savedTabsList;
    
    // Clear existing content
    container.innerHTML = '';

    if (tabs.length === 0) {
      container.innerHTML = '<div class="empty-tabs-message">No saved tabs yet</div>';
      UI_ELEMENTS.clearAllTabsBtn.style.display = 'none';
      return;
    }

    UI_ELEMENTS.clearAllTabsBtn.style.display = 'block';
    
    // Show only the 5 most recent tabs in popup
    const recentTabs = tabs.slice(0, 5);
    
    for (const tab of recentTabs) {
      container.appendChild(this.createTabItem(tab));
    }

    // Show count if there are more tabs
    if (tabs.length > 5) {
      const moreElement = document.createElement('div');
      moreElement.className = 'empty-tabs-message';
      moreElement.textContent = `+${tabs.length - 5} more tabs`;
      moreElement.style.padding = '8px';
      moreElement.style.fontSize = '10px';
      moreElement.style.color = '#999';
      container.appendChild(moreElement);
    }
  }

  /**
   * Delete a specific tab
   * @param {string} tabId - ID of tab to delete
   */
  async deleteTab(tabId) {
    try {
      const response = await sendMessage({
        type: MESSAGE_TYPES.DELETE_TAB,
        tabId
      });

      if (response.success) {
        // Remove the tab element from DOM
        const tabElement = document.querySelector(`[data-tab-id="${tabId}"]`);
        if (tabElement) {
          tabElement.remove();
        }
        
        // Refresh the display
        await this.refresh();
        showMessage('Tab deleted');
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('[YT Detox] Failed to delete tab:', error);
      showMessage('Failed to delete tab', true);
    }
  }

  /**
   * Clear all tabs
   */
  async clearAllTabs() {
    if (!confirm('Are you sure you want to clear all saved tabs?')) {
      return;
    }

    try {
      const response = await sendMessage({
        type: MESSAGE_TYPES.CLEAR_ALL_TABS
      });

      if (response.success) {
        await this.refresh();
        showMessage('All tabs cleared');
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('[YT Detox] Failed to clear tabs:', error);
      showMessage('Failed to clear tabs', true);
    }
  }

  /**
   * Refresh the saved tabs list
   */
  async refresh() {
    try {
      const response = await sendMessage({
        type: MESSAGE_TYPES.GET_SAVED_TABS
      });

      if (response.success) {
        await this.renderTabs(response.tabs || []);
      }
    } catch (error) {
      console.error('[YT Detox] Failed to refresh saved tabs list:', error);
    }
  }
}

/**
 * Reopen Tabs Manager
 * Handles reopening all saved YouTube tabs
 */
class ReopenTabsManager {
  constructor(savedTabsListManager) {
    this.savedTabsListManager = savedTabsListManager;
    this.setupEventListeners();
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    UI_ELEMENTS.reopenAllBtn.addEventListener('click', () => {
      this.reopenAllTabs();
    });
  }

  /**
   * Reopen all saved tabs
   */
  async reopenAllTabs() {
    try {
      // Check if there are saved tabs first
      const response = await sendMessage({
        type: MESSAGE_TYPES.GET_SAVED_TABS
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to get saved tabs');
      }

      const tabs = response.tabs || [];
      
      if (tabs.length === 0) {
        showMessage('No saved tabs to reopen');
        return;
      }

      // Send message to background script
      const reopenResponse = await sendMessage({
        type: MESSAGE_TYPES.REOPEN_ALL_TABS
      });

      if (reopenResponse.success) {
        const message = `Reopened ${reopenResponse.count} tab${reopenResponse.count === 1 ? '' : 's'}`;
        showMessage(message);
        
        // Refresh the saved tabs list
        await this.savedTabsListManager.refresh();
      } else {
        throw new Error(reopenResponse.error || 'Failed to reopen tabs');
      }
    } catch (error) {
      console.error('[YT Detox] Failed to reopen tabs:', error);
      showMessage('Failed to reopen tabs', true);
    }
  }

  /**
   * Update button state based on saved tabs count
   */
  updateButtonState(savedTabsCount) {
    if (savedTabsCount === 0) {
      UI_ELEMENTS.reopenAllBtn.disabled = true;
      UI_ELEMENTS.reopenAllBtn.textContent = 'No Tabs to Reopen';
    } else {
      UI_ELEMENTS.reopenAllBtn.disabled = false;
      UI_ELEMENTS.reopenAllBtn.textContent = `Reopen All ${savedTabsCount} Tabs`;
    }
  }
}

/**
 * Tab Manager
 * Handles closing and saving YouTube tabs
 */
class TabManager {
  constructor(statsManager, savedTabsListManager) {
    this.statsManager = statsManager;
    this.savedTabsListManager = savedTabsListManager;
    this.setupEventListeners();
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    UI_ELEMENTS.closeSaveBtn.addEventListener('click', () => {
      this.closeAndSaveTabs();
    });
  }

  /**
   * Close and save all YouTube tabs
   */
  async closeAndSaveTabs() {
    setLoading(true);

    try {
      // Check if there are any YouTube tabs first
      const tabs = await getYouTubeTabs();
      
      if (tabs.length === 0) {
        showMessage('No YouTube tabs to close');
        return;
      }

      // Send message to background script
      const response = await sendMessage({
        type: MESSAGE_TYPES.CLOSE_SAVE_TABS
      });

      if (response.success) {
        const message = response.count > 0 
          ? `Closed and saved ${response.count} tab${response.count === 1 ? '' : 's'}`
          : 'No tabs to close';
        
        showMessage(message);
        
        // Update stats and saved tabs list after successful operation
        await this.statsManager.updateAll();
        await this.savedTabsListManager.refresh();
      } else {
        throw new Error(response.error || 'Failed to close and save tabs');
      }
    } catch (error) {
      console.error('[YT Detox] Failed to close and save tabs:', error);
      showMessage('Failed to close and save tabs', true);
    } finally {
      setLoading(false);
    }
  }
}

/**
 * Popup Controller
 * Main controller that orchestrates all popup functionality
 */
class PopupController {
  constructor() {
    this.savedTabsListManager = new SavedTabsListManager();
    this.reopenTabsManager = new ReopenTabsManager(this.savedTabsListManager);
    this.statsManager = new StatsManager(this.reopenTabsManager);
    this.extensionToggle = new ExtensionToggle();
    this.tabManager = new TabManager(this.statsManager, this.savedTabsListManager);
  }

  /**
   * Initialize the popup
   */
  async initialize() {
    try {
      // Load extension state
      await this.extensionToggle.loadState();
      
      // Update stats and saved tabs list
      await this.statsManager.updateAll();
      await this.savedTabsListManager.refresh();
      
      // Set up periodic stats updates
      this.setupPeriodicUpdates();
      
    } catch (error) {
      console.error('[YT Detox] Popup initialization failed:', error);
      showMessage('Failed to initialize popup', true);
    }
  }

  /**
   * Set up periodic updates for stats
   */
  setupPeriodicUpdates() {
    // Update open tabs count every 2 seconds
    setInterval(() => {
      this.statsManager.updateOpenTabsCount();
    }, 2000);
  }
}

/**
 * Error Handler
 * Global error handling for the popup
 */
function setupGlobalErrorHandler() {
  window.addEventListener('error', (event) => {
    console.error('[YT Detox] Popup error:', event.error);
    showMessage('An unexpected error occurred', true);
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('[YT Detox] Unhandled promise rejection:', event.reason);
    showMessage('An unexpected error occurred', true);
  });
}

/**
 * Initialize the popup when DOM is ready
 */
function initializePopup() {
  // Set up global error handling
  setupGlobalErrorHandler();
  
  // Initialize the popup controller
  const controller = new PopupController();
  controller.initialize();
}

// Start initialization when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePopup);
} else {
  initializePopup();
}