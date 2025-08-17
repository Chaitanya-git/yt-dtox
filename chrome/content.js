/**
 * Content Script for YouTube Detox Extension
 * Handles DOM manipulation, shorts blocking, and UI injection
 * Follows SOLID principles with clear separation of concerns
 */

/**
 * Constants and Configuration
 */
const MESSAGE_TYPES = {
  GET_SAVED_TABS: 'getSavedTabs',
  DELETE_TAB: 'deleteTab',
  CLEAR_ALL_TABS: 'clearAllTabs',
  GET_EXTENSION_STATE: 'getExtensionState'
};

const YOUTUBE_SELECTORS = {
  SHORTS_CONTAINERS: [
    '[is-shorts]',
    'ytd-shorts',
    'ytd-reel-video-renderer',
    'ytd-reel-shelf-renderer',
    '[aria-label*="Shorts"]',
    '[aria-label*="shorts"]',
    'ytd-rich-shelf-renderer[is-shorts]',
    'ytd-rich-item-renderer:has([aria-label*="Shorts"])'
  ],
  HOMEPAGE_CONTENT: '#contents',
  RECOMMENDED_VIDEOS: [
    'ytd-rich-grid-renderer',
    'ytd-item-section-renderer', 
    'ytd-rich-section-renderer',
    'ytd-continuation-item-renderer',
    '#primary #contents > *:first-child',
    'ytd-browse ytd-two-column-browse-results-renderer #primary #contents > *:first-child'
  ]
};

const URL_PATTERNS = {
  SHORTS_PAGE: /\/shorts\//,
  HOMEPAGE: /^https?:\/\/(www\.)?youtube\.com\/?(\?.*)?$/
};

const CONFIG = {
  OVERLAY_CLASS: 'yt-detox-overlay',
  SAVED_TABS_CONTAINER_ID: 'yt-detox-saved-tabs',
  DEBOUNCE_DELAY: 1000, // Increased to reduce excessive processing
  OBSERVER_CONFIG: {
    childList: true,
    subtree: true,
    attributes: false
  }
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

function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

function safeQuerySelector(selector, context = document) {
  try {
    return context.querySelector(selector);
  } catch (error) {
    console.warn('[YT Detox] Invalid selector:', selector);
    return null;
  }
}

function safeQuerySelectorAll(selector, context = document) {
  try {
    return context.querySelectorAll(selector);
  } catch (error) {
    console.warn('[YT Detox] Invalid selector:', selector);
    return document.querySelectorAll('');
  }
}

function isShortsPage(url = window.location.href) {
  return URL_PATTERNS.SHORTS_PAGE.test(url);
}

function isHomePage(url = window.location.href) {
  return URL_PATTERNS.HOMEPAGE.test(url);
}

async function sendMessage(message) {
  try {
    return await chrome.runtime.sendMessage(message);
  } catch (error) {
    console.error('[YT Detox] Message sending failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Shorts Blocking Service
 * Handles identification and hiding of YouTube Shorts
 */
class ShortsBlocker {
  constructor() {
    this.hiddenShorts = new WeakSet();
    this.sessionVisible = new WeakSet();
  }

  /**
   * Find all shorts elements on the page
   * @returns {NodeList} Collection of shorts elements
   */
  findShortsElements() {
    const allShorts = [];
    
    for (const selector of YOUTUBE_SELECTORS.SHORTS_CONTAINERS) {
      const elements = safeQuerySelectorAll(selector);
      allShorts.push(...Array.from(elements));
    }

    // Deduplicate based on DOM element reference
    return [...new Set(allShorts)];
  }

  /**
   * Create overlay element for hiding shorts
   * @param {Element} shortsElement - The shorts element to overlay
   * @returns {Element} Overlay element
   */
  createOverlay(shortsElement) {
    const overlay = document.createElement('div');
    overlay.className = CONFIG.OVERLAY_CLASS;
    overlay.setAttribute('data-yt-detox', 'shorts-overlay');
    
    overlay.innerHTML = `
      <div class="yt-detox-overlay-content">
        <div class="yt-detox-overlay-title">YouTube Short Hidden</div>
        <button class="yt-detox-toggle-btn" type="button">
          Show Temporarily
        </button>
      </div>
    `;

    // Add click handler for toggle button
    const toggleBtn = overlay.querySelector('.yt-detox-toggle-btn');
    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleShortVisibility(shortsElement, overlay);
    });

    return overlay;
  }

  /**
   * Toggle visibility of a specific short
   * @param {Element} shortsElement - The shorts element
   * @param {Element} overlay - The overlay element
   */
  toggleShortVisibility(shortsElement, overlay) {
    if (this.sessionVisible.has(shortsElement)) {
      // Hide again
      shortsElement.style.display = 'none';
      overlay.style.display = 'flex';
      this.sessionVisible.delete(shortsElement);
    } else {
      // Show temporarily for this session
      shortsElement.style.display = '';
      overlay.style.display = 'none';
      this.sessionVisible.add(shortsElement);
    }
  }

  /**
   * Hide a single shorts element with overlay
   * @param {Element} shortsElement - Element to hide
   */
  hideShort(shortsElement) {
    // Skip if already processed
    if (this.hiddenShorts.has(shortsElement)) {
      return;
    }

    // Skip if temporarily visible in this session
    if (this.sessionVisible.has(shortsElement)) {
      return;
    }

    try {
      const overlay = this.createOverlay(shortsElement);
      
      // Insert overlay after the shorts element
      if (shortsElement.parentNode) {
        shortsElement.parentNode.insertBefore(overlay, shortsElement.nextSibling);
        shortsElement.style.display = 'none';
        
        this.hiddenShorts.add(shortsElement);
      }
    } catch (error) {
      console.error('[YT Detox] Error hiding short:', error);
    }
  }

  /**
   * Process all shorts on the current page
   */
  processShorts() {
    // Don't show overlays on shorts pages - user explicitly wants to watch shorts
    if (isShortsPage()) {
      return;
    }
    
    const shortsElements = this.findShortsElements();
    
    for (const shortsElement of shortsElements) {
      this.hideShort(shortsElement);
    }
  }

  /**
   * Reset session state (called on page navigation)
   */
  resetSession() {
    this.sessionVisible = new WeakSet();
  }
}

/**
 * Navigation Button Remover Service
 * Handles removing up/down arrow buttons on shorts pages
 */
class NavigationButtonRemover {
  constructor() {
    this.removedButtons = new WeakSet();
  }

  /**
   * Find and remove navigation buttons on shorts pages
   */
  removeNavigationButtons() {
    if (!isShortsPage()) return;

    // Common selectors for YouTube Shorts navigation buttons
    const navigationSelectors = [
      'button[aria-label*="Go to next video"]',
      'button[aria-label*="Go to previous video"]', 
      'button[aria-label*="Next video"]',
      'button[aria-label*="Previous video"]',
      '.navigation-button',
      '.shorts-navigation-button',
      '[data-title-no-tooltip*="Next"]',
      '[data-title-no-tooltip*="Previous"]',
      // Additional selectors for up/down arrows
      'button[title*="Next"]',
      'button[title*="Previous"]',
      '.ytp-button.ytp-next-button',
      '.ytp-button.ytp-prev-button'
    ];

    for (const selector of navigationSelectors) {
      const buttons = safeQuerySelectorAll(selector);
      for (const button of buttons) {
        if (!this.removedButtons.has(button)) {
          button.style.display = 'none';
          this.removedButtons.add(button);
        }
      }
    }
  }

  /**
   * Reset state for new page
   */
  reset() {
    this.removedButtons = new WeakSet();
  }
}

/**
 * Scroll Prevention Service
 * Handles disabling scroll on shorts pages
 */
class ScrollPreventer {
  constructor() {
    this.isActive = false;
    this.originalOverflow = '';
    this.boundPreventWheel = this.preventWheel.bind(this);
    this.boundPreventKeys = this.preventScrollKeys.bind(this);
  }

  /**
   * Prevent wheel scrolling
   * @param {WheelEvent} e - Wheel event
   */
  preventWheel(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  /**
   * Prevent keyboard scrolling
   * @param {KeyboardEvent} e - Keyboard event
   */
  preventScrollKeys(e) {
    const scrollKeys = [
      'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown',
      'Home', 'End', 'Space'
    ];
    
    if (scrollKeys.includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    }
  }

  /**
   * Enable scroll prevention
   */
  enable() {
    if (this.isActive) return;

    // Store original overflow style
    this.originalOverflow = document.body.style.overflow;
    
    // Disable scrolling
    document.body.style.overflow = 'hidden';
    
    // Add event listeners with high priority
    document.addEventListener('wheel', this.boundPreventWheel, { passive: false, capture: true });
    document.addEventListener('keydown', this.boundPreventKeys, { passive: false, capture: true });
    window.addEventListener('wheel', this.boundPreventWheel, { passive: false });
    window.addEventListener('keydown', this.boundPreventKeys, { passive: false });
    
    this.isActive = true;
  }

  /**
   * Disable scroll prevention
   */
  disable() {
    if (!this.isActive) return;

    // Restore original overflow style
    document.body.style.overflow = this.originalOverflow;
    
    // Remove event listeners
    document.removeEventListener('wheel', this.boundPreventWheel, { capture: true });
    document.removeEventListener('keydown', this.boundPreventKeys, { capture: true });
    window.removeEventListener('wheel', this.boundPreventWheel);
    window.removeEventListener('keydown', this.boundPreventKeys);
    
    this.isActive = false;
  }

  /**
   * Update based on current page
   */
  update() {
    if (isShortsPage()) {
      this.enable();
    } else {
      this.disable();
    }
  }
}

/**
 * Saved Tabs UI Service
 * Handles display of saved tabs on YouTube homepage
 */
class SavedTabsUI {
  constructor() {
    this.container = null;
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
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      return `${Math.floor(diffDays / 30)} months ago`;
    } catch {
      return 'Recently';
    }
  }

  /**
   * Create saved tab element
   * @param {Object} tab - Tab data
   * @returns {Element} Tab element
   */
  createTabElement(tab) {
    const tabElement = document.createElement('div');
    tabElement.className = 'yt-detox-saved-tab';
    tabElement.setAttribute('data-tab-id', tab.id);

    // Generate thumbnail on-demand from URL
    const videoId = extractVideoIdFromUrl(tab.url);
    const thumbnailUrl = videoId ? generateThumbnailUrl(videoId) : null;
    
    // Removed excessive logging to reduce console noise
    
    const thumbnailHtml = thumbnailUrl 
      ? `<img src="${thumbnailUrl}" alt="${tab.title}" loading="lazy" onerror="this.parentNode.innerHTML='<div class=\\"yt-detox-saved-tab-placeholder\\">📺</div>'">`
      : '<div class="yt-detox-saved-tab-placeholder">📺</div>';

    tabElement.innerHTML = `
      <div class="yt-detox-saved-tab-thumbnail">
        ${thumbnailHtml}
      </div>
      <div class="yt-detox-saved-tab-content">
        <a href="${tab.url}" class="yt-detox-saved-tab-title" title="${tab.title}">
          ${tab.title}
        </a>
        <div class="yt-detox-saved-tab-channel">${tab.channelName}</div>
        <div class="yt-detox-saved-tab-date">${this.formatRelativeTime(tab.savedAt)}</div>
        <div class="yt-detox-saved-tab-actions">
          <button class="yt-detox-delete-btn" data-action="delete" type="button">
            Delete
          </button>
        </div>
      </div>
    `;

    // Add event listeners
    const deleteBtn = tabElement.querySelector('[data-action="delete"]');
    deleteBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.deleteTab(tab.id);
    });

    return tabElement;
  }

  /**
   * Create empty state element
   * @returns {Element} Empty state element
   */
  createEmptyState() {
    const emptyState = document.createElement('div');
    emptyState.className = 'yt-detox-empty-state';
    emptyState.innerHTML = `
      <div class="yt-detox-empty-state-icon">📺</div>
      <div class="yt-detox-empty-state-title">No saved tabs yet</div>
      <div class="yt-detox-empty-state-description">
        Use the extension popup to close and save your YouTube tabs for later viewing.
      </div>
    `;
    return emptyState;
  }

  /**
   * Create the main container element
   * @returns {Element} Container element
   */
  createContainer() {
    const container = document.createElement('div');
    container.id = CONFIG.SAVED_TABS_CONTAINER_ID;
    container.innerHTML = `
      <div class="yt-detox-saved-tabs-header">
        <h2 class="yt-detox-saved-tabs-title">Your Saved YouTube Tabs</h2>
        <button class="yt-detox-clear-all-btn" data-action="clear-all" type="button">
          Clear All
        </button>
      </div>
      <div class="yt-detox-saved-tabs-grid"></div>
    `;

    // Add clear all event listener
    const clearAllBtn = container.querySelector('[data-action="clear-all"]');
    clearAllBtn.addEventListener('click', () => {
      this.clearAllTabs();
    });

    return container;
  }

  /**
   * Find insertion point for saved tabs UI
   * @returns {Element|null} Element to insert before
   */
  findInsertionPoint() {
    // Look for the main content area first
    const contentElement = safeQuerySelector(YOUTUBE_SELECTORS.HOMEPAGE_CONTENT);
    console.log('[YT Detox] Content element found:', !!contentElement);
    
    if (!contentElement) {
      console.log('[YT Detox] No #contents element found, trying alternative selectors');
      // Try alternative approaches if #contents is not found
      for (const selector of YOUTUBE_SELECTORS.RECOMMENDED_VIDEOS) {
        const element = safeQuerySelector(selector);
        if (element) {
          console.log('[YT Detox] Found insertion point with selector:', selector);
          return element;
        }
      }
      return null;
    }

    // Find the first recommended videos section within content
    for (const selector of YOUTUBE_SELECTORS.RECOMMENDED_VIDEOS) {
      const recommendedSection = safeQuerySelector(selector, contentElement);
      if (recommendedSection) {
        console.log('[YT Detox] Found insertion point with selector:', selector);
        return recommendedSection;
      }
    }
    
    // Fallback: insert at the beginning of content if no specific section found
    if (contentElement.firstElementChild) {
      console.log('[YT Detox] Using fallback insertion point: first child of #contents');
      return contentElement.firstElementChild;
    }
    
    console.log('[YT Detox] No suitable insertion point found');
    return null;
  }

  /**
   * Render saved tabs
   * @param {Array} tabs - Array of saved tabs
   */
  async renderTabs(tabs) {
    if (!this.container) {
      const insertionPoint = this.findInsertionPoint();
      
      if (!insertionPoint) {
        console.error('[YT Detox] Could not find insertion point for saved tabs');
        return;
      }

      this.container = this.createContainer();
      insertionPoint.parentNode.insertBefore(this.container, insertionPoint);
    }

    const grid = this.container.querySelector('.yt-detox-saved-tabs-grid');
    const clearAllBtn = this.container.querySelector('[data-action="clear-all"]');
    
    // Clear existing content
    grid.innerHTML = '';

    if (tabs.length === 0) {
      grid.appendChild(this.createEmptyState());
      clearAllBtn.style.display = 'none';
    } else {
      clearAllBtn.style.display = 'block';
      tabs.forEach(tab => {
        grid.appendChild(this.createTabElement(tab));
      });
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
        const tabElement = this.container?.querySelector(`[data-tab-id="${tabId}"]`);
        if (tabElement) {
          tabElement.remove();
        }
        
        // Refresh the display
        await this.refresh();
      }
    } catch (error) {
      console.error('[YT Detox] Failed to delete tab:', error);
    }
  }

  /**
   * Clear all tabs
   */
  async clearAllTabs() {
    try {
      const response = await sendMessage({
        type: MESSAGE_TYPES.CLEAR_ALL_TABS
      });

      if (response.success) {
        await this.refresh();
      }
    } catch (error) {
      console.error('[YT Detox] Failed to clear tabs:', error);
    }
  }

  /**
   * Refresh the saved tabs display
   */
  async refresh() {
    try {
      const response = await sendMessage({
        type: MESSAGE_TYPES.GET_SAVED_TABS
      });
      
      if (response.success) {
        const tabs = response.tabs || [];
        await this.renderTabs(tabs);
      } else {
        console.error('[YT Detox] Failed to get saved tabs:', response.error);
      }
    } catch (error) {
      console.error('[YT Detox] Failed to refresh tabs:', error);
    }
  }

  /**
   * Remove the UI from DOM
   */
  remove() {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }
}

/**
 * Main Extension Controller
 * Orchestrates all extension functionality
 */
class YouTubeDetoxController {
  constructor() {
    this.shortsBlocker = new ShortsBlocker();
    this.scrollPreventer = new ScrollPreventer();
    this.navigationButtonRemover = new NavigationButtonRemover();
    this.savedTabsUI = new SavedTabsUI();
    this.observer = null;
    this.extensionEnabled = true;
    this.currentUrl = window.location.href;
    this.isProcessing = false; // Prevent overlapping processing

    // Debounced processing function
    this.debouncedProcess = debounce(() => this.processPage(), CONFIG.DEBOUNCE_DELAY);
  }

  /**
   * Initialize the extension
   */
  async initialize() {
    try {
      // Check if extension is enabled
      const stateResponse = await sendMessage({
        type: MESSAGE_TYPES.GET_EXTENSION_STATE
      });
      
      this.extensionEnabled = stateResponse.success ? stateResponse.enabled : true;

      if (!this.extensionEnabled) {
        return;
      }

      // Set up mutation observer for dynamic content
      this.setupMutationObserver();

      // Set up navigation listener for YouTube's SPA
      this.setupNavigationListener();

      // Initial page processing
      this.processPage();

    } catch (error) {
      console.error('[YT Detox] Initialization failed:', error);
    }
  }

  /**
   * Set up mutation observer for dynamic content changes
   */
  setupMutationObserver() {
    this.observer = new MutationObserver((mutations) => {
      if (!this.extensionEnabled) return;
      
      // Filter out mutations caused by our own extension
      const relevantMutations = mutations.filter(mutation => {
        // Skip mutations in our own containers
        if (mutation.target.closest('#yt-detox-saved-tabs') || 
            mutation.target.closest('.yt-detox-overlay') ||
            mutation.target.hasAttribute('data-yt-detox')) {
          return false;
        }
        
        // Skip mutations where we added nodes with our classes
        if (mutation.addedNodes) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.id === 'yt-detox-saved-tabs' ||
                  node.classList?.contains('yt-detox-overlay') ||
                  node.hasAttribute?.('data-yt-detox')) {
                return false;
              }
            }
          }
        }
        
        return true;
      });
      
      // Only process if there are relevant mutations
      if (relevantMutations.length > 0) {
        this.debouncedProcess();
      }
    });

    this.observer.observe(document.body, CONFIG.OBSERVER_CONFIG);
  }

  /**
   * Set up navigation listener for YouTube's SPA routing
   */
  setupNavigationListener() {
    // Listen for URL changes (YouTube SPA navigation)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      setTimeout(() => this.handleNavigation(), 0);
    }.bind(this);

    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      setTimeout(() => this.handleNavigation(), 0);
    }.bind(this);

    // Listen for popstate events
    window.addEventListener('popstate', () => {
      setTimeout(() => this.handleNavigation(), 0);
    });
  }

  /**
   * Handle navigation events
   */
  handleNavigation() {
    const newUrl = window.location.href;
    
    if (newUrl !== this.currentUrl) {
      this.currentUrl = newUrl;
      
      // Reset session state
      this.shortsBlocker.resetSession();
      this.navigationButtonRemover.reset();
      
      // Remove existing saved tabs UI
      this.savedTabsUI.remove();
      
      // Process new page
      setTimeout(() => this.processPage(), 100);
    }
  }

  /**
   * Process the current page based on its type
   */
  processPage() {
    if (!this.extensionEnabled || this.isProcessing) return;

    this.isProcessing = true;
    
    try {
      // Handle scroll prevention for shorts pages
      this.scrollPreventer.update();

      // Remove navigation buttons on shorts pages
      this.navigationButtonRemover.removeNavigationButtons();

      // Process shorts blocking on all pages (except shorts pages)
      this.shortsBlocker.processShorts();

      // Show saved tabs UI on homepage
      if (isHomePage()) {
        console.log('[YT Detox] On homepage, showing saved tabs UI');
        this.savedTabsUI.refresh();
      } else {
        console.log('[YT Detox] Not on homepage, current URL:', window.location.href);
      }

    } catch (error) {
      console.error('[YT Detox] Page processing error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
    
    this.scrollPreventer.disable();
    this.savedTabsUI.remove();
  }
}

/**
 * Initialize the extension when DOM is ready
 */
function initializeExtension() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      new YouTubeDetoxController().initialize();
    });
  } else {
    new YouTubeDetoxController().initialize();
  }
}

// Start the extension
initializeExtension();