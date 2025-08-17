# YouTube Detox Extension

A Firefox extension designed to help users break free from YouTube doomscrolling by blocking shorts and providing mindful tab management.

## Features

- **YouTube Shorts Blocking**: Automatically hides YouTube Shorts in feeds with optional temporary visibility toggle
- **Scroll Prevention**: Completely disables scrolling on YouTube Shorts pages to prevent endless scrolling
- **Tab Management**: Close and save all YouTube tabs with one click, then view them later on the homepage
- **Mindful Browsing**: Encourages intentional YouTube usage rather than mindless consumption

## Installation

### For Development

1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd yt-dtox
   ```

2. Open Firefox and navigate to `about:debugging`

3. Click "This Firefox" → "Load Temporary Add-on"

4. Select the `manifest.json` file from the project directory

### For Distribution

1. Package the extension:
   ```bash
   zip -r yt-dtox.zip . -x "*.git*" "PRD.md" "TECHNICAL_DESIGN.md" "CLAUDE.md" "README.md"
   ```

2. Upload to Firefox Add-ons store or install manually

## Usage

### Shorts Blocking
- YouTube Shorts are automatically hidden with opaque overlays
- Click "Show Temporarily" on any overlay to reveal shorts for the current session
- Shorts are hidden again when you refresh or navigate away

### Scroll Prevention
- Scrolling is completely disabled on `/shorts/` pages
- No way to re-enable scrolling - enforcement is absolute
- Helps break the infinite scroll habit

### Tab Management
1. Click the extension icon in the toolbar
2. Click "Close & Save YouTube Tabs" to close all YouTube tabs and save them
3. Visit YouTube homepage to see your saved tabs above recommendations
4. Click saved tabs to reopen them or delete unwanted ones

## Technical Details

### Architecture
- **Background Script**: Handles tab management and storage operations
- **Content Script**: Manipulates YouTube DOM for shorts blocking and UI injection
- **Extension Popup**: Provides user interface for tab management and settings

### Browser Compatibility
- **Target**: Firefox only (Manifest V3)
- **Permissions**: `tabs`, `storage`, `activeTab`, `*://youtube.com/*`

### Data Storage
- All data stored locally using Firefox storage API
- No external servers or tracking
- Automatic cleanup (max 100 saved tabs)

## Privacy

This extension:
- ✅ Stores data locally only
- ✅ No external network requests
- ✅ No user tracking or analytics
- ✅ Minimal permissions requested
- ✅ Open source code

## Development

### Project Structure
```
yt-dtox/
├── manifest.json          # Extension configuration
├── background.js         # Tab management service worker
├── content.js           # YouTube page manipulation
├── popup.html           # Extension popup interface
├── popup.js            # Popup interaction logic
├── styles.css          # UI styling
├── utils.js            # Shared utilities
└── icons/              # Extension icons
```

### Code Quality
- Follows SOLID principles
- Implements DRY and KISS patterns
- Comprehensive error handling
- Accessibility features included
- Responsive design support

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes following the existing code style
4. Test thoroughly in Firefox
5. Submit a pull request

## License

[Insert License Information]

## Support

For issues or feature requests, please visit the project repository.