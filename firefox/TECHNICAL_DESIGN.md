# YouTube Detox Extension - Technical Design Document

## System Architecture

### Core Components
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Background    │◄──►│  Content Script │◄──►│   Extension     │
│     Script      │    │   (youtube.com) │    │     Popup       │
│                 │    │                 │    │                 │
│ • Tab mgmt      │    │ • DOM manip     │    │ • User actions  │
│ • Storage ops   │    │ • Shorts hiding │    │ • Status display│
│ • Message hub   │    │ • Scroll block  │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         └───────────────────────┼─────────────────────────────────
                                 ▼
                    ┌─────────────────────────┐
                    │   Browser Storage API   │
                    │                         │
                    │ • savedTabs[]           │
                    │ • extensionEnabled      │
                    └─────────────────────────┘
```

## Component Breakdown

### 1. Manifest (manifest.json)
- **Purpose**: Extension configuration and permissions
- **Key Elements**:
  - Manifest V3 (future-proof for Firefox)
  - Host permissions: `*://youtube.com/*`
  - Storage, tabs, activeTab permissions
  - Background script and content script declarations

### 2. Background Script (background.js)
- **Responsibilities**:
  - Handle tab closure and metadata extraction
  - Manage browser storage operations
  - Process messages from popup and content scripts
- **Key Functions**:
  ```javascript
  async function closeAndSaveYouTubeTabs()
  async function saveTabData(tabs)
  function handleExtensionToggle()
  ```

### 3. Content Script (content.js)
- **Injection**: All YouTube pages
- **Responsibilities**:
  - Hide YouTube Shorts with overlay UI
  - Prevent scrolling on `/shorts/` URLs
  - Inject saved tabs UI on homepage
  - Handle overlay toggle interactions
- **Key Functions**:
  ```javascript
  function hideShorts()
  function preventScrolling()
  function injectSavedTabsUI()
  function createOverlay(shortsElement)
  ```

### 4. Extension Popup (popup.html + popup.js)
- **Purpose**: User interface for primary actions
- **Elements**:
  - "Close & Save YouTube Tabs" button
  - Extension on/off toggle
  - Saved tabs counter
- **Interactions**: Send messages to background script

## Implementation Strategy

### Phase 1: Core Infrastructure
1. **Manifest setup** with minimal permissions
2. **Background script** for tab management
3. **Basic content script** injection
4. **Simple popup** with primary button

### Phase 2: Shorts Blocking
1. **YouTube DOM selectors** identification
2. **Overlay creation** and styling
3. **Toggle functionality** (session-only persistence)
4. **Scroll prevention** on shorts pages

### Phase 3: Tab Management
1. **Storage schema** implementation
2. **Tab closure and saving** logic
3. **Homepage UI injection** for saved tabs
4. **Delete/clear functionality**

## Key Technical Decisions

### 1. YouTube Element Detection
```javascript
// Robust selectors for YouTube Shorts
const SHORTS_SELECTORS = [
  '[is-shorts]',                    // Main shorts container
  'ytd-shorts',                     // Shorts component
  'ytd-reel-video-renderer',        // Individual short
  '[aria-label*="Shorts"]'          // Accessibility fallback
];
```

### 2. Scroll Prevention Strategy
```javascript
// Disable scrolling without breaking page functionality
function disableScrolling() {
  if (window.location.pathname.includes('/shorts/')) {
    document.body.style.overflow = 'hidden';
    window.addEventListener('wheel', preventDefault, { passive: false });
    window.addEventListener('keydown', preventScrollKeys);
  }
}
```

### 3. Storage Schema
```javascript
// Minimal, efficient data structure
const storageSchema = {
  savedTabs: [
    {
      id: 'timestamp_hash',          // Simple ID generation
      url: 'full_youtube_url',
      title: 'video_title',
      channelName: 'channel_name',
      thumbnail: 'thumbnail_url',    // Optional
      savedAt: 'iso_timestamp'
    }
  ],
  extensionEnabled: true             // Global toggle
};
```

### 4. Message Passing Architecture
```javascript
// Simple message types for component communication
const MESSAGE_TYPES = {
  CLOSE_SAVE_TABS: 'closeSaveTabs',
  TOGGLE_EXTENSION: 'toggleExtension',
  GET_SAVED_TABS: 'getSavedTabs',
  DELETE_TAB: 'deleteTab',
  CLEAR_ALL_TABS: 'clearAllTabs'
};
```

## Performance Considerations

### DOM Manipulation Efficiency
- **MutationObserver** for dynamic content detection
- **Debounced** DOM queries to avoid excessive processing
- **CSS-only** overlays where possible

### Memory Management
- **Lazy loading** of saved tabs thumbnails
- **Storage limits** (max 100 saved tabs to prevent bloat)
- **Cleanup** of stale data on extension startup

### YouTube SPA Compatibility
- **Navigation listeners** for YouTube's client-side routing
- **Re-injection** of functionality on page changes
- **Event delegation** for dynamically added elements

## Error Handling

### Graceful Degradation
- Content script injection failures → Silent fallback
- Storage quota exceeded → Oldest tabs auto-removal
- YouTube DOM changes → Fallback selectors

### User Experience
- **No error dialogs** for failed operations
- **Retry mechanisms** for network-dependent operations
- **Consistent behavior** across Firefox versions

## Testing Strategy

### Unit Testing
- Storage operations (save/retrieve/delete)
- Message passing between components
- DOM manipulation functions

### Integration Testing
- Extension loading and permissions
- Cross-component communication
- Storage persistence across sessions

### Manual Testing
- Various YouTube page types (home, watch, shorts, search)
- Edge cases (no internet, corrupted storage)
- Performance with large numbers of saved tabs

## Deployment Considerations

### Firefox Add-ons Store
- **Manifest validation** for store requirements
- **Privacy policy** for data collection (none in this case)
- **Screenshots** and description for store listing

### Version Management
- **Semantic versioning** (1.0.0 for initial release)
- **Migration scripts** for future storage schema changes
- **Backward compatibility** considerations

## File Structure
```
yt-dtox/
├── manifest.json           # Extension configuration
├── background.js          # Tab management and storage
├── content.js            # YouTube page manipulation
├── popup.html            # Extension popup UI
├── popup.js             # Popup interaction logic
├── styles.css           # Overlay and UI styling
├── icons/               # Extension icons (16, 48, 128px)
└── README.md           # Installation and usage
```

## Security Considerations

### Content Security Policy
- **Inline scripts avoided** (separate JS files)
- **Minimal permissions** requested
- **No external resources** loaded

### Data Privacy
- **Local storage only** (no external servers)
- **No user tracking** or analytics
- **Minimal data collection** (only YouTube URLs and titles)

This design prioritizes simplicity, reliability, and user privacy while delivering the core functionality outlined in the PRD.