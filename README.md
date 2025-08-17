# YouTube Detox Extension

A cross-browser extension designed to help users break free from YouTube doomscrolling by blocking shorts and providing mindful tab management.

![YouTube Detox Icon](firefox/icons/icon.ico)

## 🎯 Features

- **YouTube Shorts Blocking**: Automatically hides YouTube Shorts in feeds with optional temporary visibility toggle
- **Scroll Prevention**: Completely disables scrolling on YouTube Shorts pages to prevent endless scrolling
- **Tab Management**: Close and save all YouTube tabs with one click, then view them later on the homepage
- **Reopen All Tabs**: Quickly restore all saved YouTube tabs
- **Mindful Browsing**: Encourages intentional YouTube usage rather than mindless consumption

## 🌐 Browser Support

| Browser | Version | Status | Directory |
|---------|---------|--------|-----------|
| **Firefox** | 88+ | ✅ Ready | [`/firefox`](firefox/) |
| **Chrome** | 88+ | ✅ Ready | [`/chrome`](chrome/) |

## 🚀 Quick Start

### Firefox Installation
```bash
# Clone repository
git clone <repository-url>
cd yt-dtox/firefox

# Load in Firefox
# 1. Open Firefox → about:debugging
# 2. Click "This Firefox" → "Load Temporary Add-on"
# 3. Select manifest.json
```

### Chrome Installation
```bash
# Navigate to Chrome version
cd yt-dtox/chrome

# Load in Chrome
# 1. Open Chrome → chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked" → Select chrome/ directory
```

## 📁 Project Structure

```
yt-dtox/
├── README.md                  # This file
├── CLAUDE.md                  # Development guidelines
├── firefox/                   # Firefox extension
│   ├── manifest.json         # Firefox Manifest V3
│   ├── background.js         # Tab management service
│   ├── content.js           # YouTube DOM manipulation
│   ├── popup.html/js        # Extension popup
│   ├── styles.css          # UI styling
│   ├── utils.js            # Shared utilities
│   ├── icons/              # Extension icons
│   └── README.md           # Firefox-specific docs
├── chrome/                   # Chrome extension
│   ├── manifest.json        # Chrome Manifest V3
│   ├── background.js        # Service worker
│   ├── content.js          # YouTube DOM manipulation
│   ├── popup.html/js       # Extension popup
│   ├── styles.css         # UI styling
│   ├── utils.js           # Shared utilities
│   ├── icons/             # Extension icons
│   └── README.md          # Chrome-specific docs
└── icons/                   # Shared icon resources
```

## 🎮 How It Works

### 1. Shorts Blocking
- YouTube Shorts are automatically hidden with opaque overlays
- Click "Show Temporarily" to reveal shorts for the current session
- Shorts are hidden again when you refresh or navigate away
- **No blocking on `/shorts/` pages** - only scroll prevention

### 2. Scroll Prevention
- Scrolling is completely disabled on YouTube `/shorts/` pages
- Prevents both mouse wheel and keyboard arrow key scrolling
- No way to re-enable - enforcement is absolute to break the habit

### 3. Tab Management
1. Click the extension icon in your browser toolbar
2. Click "Close & Save YouTube Tabs" to save all open YouTube tabs
3. Visit YouTube homepage to see saved tabs displayed above recommendations
4. Click saved tabs to reopen them or delete unwanted ones
5. Use "Reopen All Tabs" to quickly restore all saved tabs

## 🔧 Technical Architecture

### Core Components
- **Background Script**: Handles tab management, storage operations, and message routing
- **Content Script**: Injected into YouTube pages for DOM manipulation and UI injection
- **Extension Popup**: User interface for tab management and extension controls

### Key Differences Between Versions

| Feature | Firefox | Chrome |
|---------|---------|--------|
| **Manifest** | `background.scripts` | `background.service_worker` |
| **Format** | Manifest V3 (Firefox-compatible) | Manifest V3 (Chrome-native) |
| **Installation** | `about:debugging` | `chrome://extensions/` |
| **Store** | Firefox Add-ons | Chrome Web Store |

### Data Storage
- All data stored locally using browser storage APIs
- No external servers or tracking
- Automatic cleanup (max 100 saved tabs)
- Deduplication by URL to prevent duplicates

## 🛡️ Privacy & Security

This extension:
- ✅ **Local storage only** - no external servers
- ✅ **No user tracking** or analytics
- ✅ **No network requests** - all functionality is local
- ✅ **Minimal permissions** - only what's necessary
- ✅ **Open source** - transparent code
- ✅ **No data collection** - respects user privacy

## 🔒 Permissions Explained

| Permission | Purpose | Usage |
|------------|---------|-------|
| `storage` | Save tab data locally | Store saved tabs and settings |
| `tabs` | Access tab information | Close/save/reopen YouTube tabs |
| `activeTab` | Current tab access | Extract tab metadata |
| `*://youtube.com/*` | YouTube access | Inject content scripts |

## 🧪 Development

### Prerequisites
- Firefox 88+ or Chrome 88+
- Basic understanding of browser extensions
- Git for version control

### Development Workflow
```bash
# Clone repository
git clone <repository-url>
cd yt-dtox

# Choose your browser
cd firefox/  # or cd chrome/

# Make changes and test
# Reload extension in browser after changes
```

### Testing Checklist
- [ ] Extension loads without manifest errors
- [ ] Shorts blocking works on homepage/search (but not `/shorts/` pages)
- [ ] Scroll prevention works on `/shorts/` pages
- [ ] Tab save/restore functionality working
- [ ] Popup interface responds correctly
- [ ] No console errors or infinite loops
- [ ] Thumbnails display correctly
- [ ] All buttons function as expected

## 📦 Distribution

### Firefox Add-ons Store
```bash
cd firefox/
zip -r yt-dtox-firefox.zip . -x "*.git*" "README.md" "*.py" "*.md"
```

### Chrome Web Store
```bash
cd chrome/
zip -r yt-dtox-chrome.zip . -x "*.git*" "README.md" "*.js" "*.md"
```

## 🐛 Known Issues & Solutions

### Firefox-Specific
- **Manifest compatibility**: Uses `background.scripts` instead of `service_worker`
- **Icon format**: Supports ICO files natively

### Chrome-Specific
- **Service worker**: Uses proper Manifest V3 service worker format
- **Performance**: Optimized for Chrome's extension architecture

### Common Issues
- **Infinite loops**: Fixed with mutation observer filtering
- **Wrong thumbnails**: Now generated on-demand from video IDs
- **Scroll prevention**: Enhanced with capture phase listeners

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Test** thoroughly in both Firefox and Chrome
4. **Follow** existing code patterns and architecture
5. **Submit** a pull request

### Code Style
- Follow existing class-based architecture
- Implement comprehensive error handling
- Use meaningful variable and function names
- Add comments for complex logic
- Maintain compatibility across both browser versions

## 📄 License

[Insert License Information]

## 📞 Support

- **Issues**: Report bugs and feature requests via GitHub Issues
- **Documentation**: See browser-specific READMEs in `/firefox` and `/chrome` directories
- **Development**: Check `CLAUDE.md` for detailed development guidelines

## 🏆 Acknowledgments

- Built with privacy-first principles
- Inspired by digital wellness initiatives
- Designed for mindful YouTube consumption

---

**Made with ❤️ for a healthier internet experience**