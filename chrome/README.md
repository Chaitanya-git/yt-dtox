# YouTube Detox Extension - Chrome Version

A Chrome extension designed to help users break free from YouTube doomscrolling by blocking shorts and providing mindful tab management.

## Features

- **YouTube Shorts Blocking**: Automatically hides YouTube Shorts in feeds with optional temporary visibility toggle
- **Scroll Prevention**: Completely disables scrolling on YouTube Shorts pages to prevent endless scrolling
- **Tab Management**: Close and save all YouTube tabs with one click, then view them later on the homepage
- **Mindful Browsing**: Encourages intentional YouTube usage rather than mindless consumption

## Installation

### For Development

1. Clone this repository and navigate to the Chrome version:
   ```bash
   git clone <repository-url>
   cd yt-dtox/chrome
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" (toggle in top right)

4. Click "Load unpacked" and select the `chrome/` directory

### For Distribution

1. Package the extension:
   ```bash
   # From the chrome/ directory
   cd chrome/
   zip -r yt-dtox-chrome.zip . -x "*.git*" "README.md"
   ```

2. Upload to Chrome Web Store or install manually

## Chrome-Specific Features

### Manifest V3 Compatibility
- Uses Chrome's service worker architecture
- Optimized for Chrome's extension API
- Full compatibility with latest Chrome versions

### Development Tools
```bash
# Load extension for testing
# 1. Open chrome://extensions/
# 2. Enable Developer mode
# 3. Click "Load unpacked"
# 4. Select this directory

# Package for Chrome Web Store
zip -r yt-dtox-chrome.zip . -x "README.md" "*.zip"
```

## Key Differences from Firefox Version

- **Manifest Format**: Uses Chrome Manifest V3 with `service_worker`
- **API Compatibility**: Optimized for Chrome extension APIs
- **Installation**: Uses Chrome Web Store or Developer mode loading

## Browser Compatibility

- **Target**: Chrome 88+ (Manifest V3 support)
- **Permissions**: `tabs`, `storage`, `activeTab`, `*://youtube.com/*`

## Usage

Same as Firefox version:

1. **Shorts Blocking**: Automatically hidden with temporary reveal option
2. **Scroll Prevention**: Complete scroll blocking on `/shorts/` pages  
3. **Tab Management**: Save/restore YouTube tabs via extension popup

## Privacy & Security

- ✅ Local storage only - no external servers
- ✅ No user tracking or analytics
- ✅ Minimal permissions requested
- ✅ Open source code

## Technical Architecture

- **Background Service Worker**: Tab management and storage operations
- **Content Script**: YouTube DOM manipulation and UI injection
- **Extension Popup**: User interface for controls and settings

## Development

### File Structure
```
chrome/
├── manifest.json          # Chrome Manifest V3 configuration
├── background.js          # Service worker for tab management
├── content.js            # YouTube page manipulation
├── popup.html            # Extension popup interface
├── popup.js             # Popup interaction logic
├── styles.css           # UI styling
├── utils.js             # Shared utilities
└── icons/               # Extension icons
```

### Testing Checklist
- [ ] Extension loads without errors in Chrome
- [ ] Shorts blocking works on YouTube homepage/search
- [ ] No shorts blocking on `/shorts/` pages (scroll prevention only)
- [ ] Tab save/restore functionality working
- [ ] Popup interface responds correctly
- [ ] No console errors or performance issues

## Contributing

1. Fork the repository
2. Create a feature branch
3. Test thoroughly in Chrome
4. Follow existing code patterns
5. Submit a pull request

## License

[Insert License Information]