# YouTube Detox Extension - Product Requirements Document

## Overview
A Firefox extension designed to prevent YouTube doomscrolling by blocking YouTube Shorts and providing tab management features to encourage mindful YouTube usage.

## Core Features

### 1. YouTube Shorts Blocking

#### 1.1 Feed Shorts Hiding
- **Behavior**: Hide YouTube Shorts in all YouTube feeds (homepage, search results, channel pages, etc.)
- **UI**: Replace shorts with opaque overlay blocks containing a toggle button
- **Toggle Functionality**: 
  - Button on overlay allows temporary visibility for current page session
  - Shorts hide again on page refresh or navigation away/back
  - No persistent state - always defaults to hidden

#### 1.2 Shorts Page Scroll Prevention
- **Behavior**: Completely disable scrolling on `/shorts/` URLs
- **Implementation**: Prevent both mouse wheel and keyboard scrolling
- **User Experience**: No visual indicators or messages about disabled scrolling
- **Scope**: No option to re-enable scrolling - completely locked

### 2. YouTube Tab Management

#### 2.1 Tab Collection
- **Trigger**: Extension popup button labeled "Close & Save YouTube Tabs"
- **Behavior**: 
  - Closes all open YouTube tabs across all windows
  - Saves list of closed tabs with metadata (title, URL, thumbnail if available)
  - Stores data persistently in extension storage

#### 2.2 Saved Tabs Display
- **Location**: YouTube homepage, displayed above default recommended videos
- **Content**: Grid/list showing saved YouTube tabs with:
  - Video thumbnail
  - Video title
  - Channel name
  - Clickable links to reopen videos
- **Management**: Delete/clear buttons for individual tabs or entire list

### 3. Extension Interface

#### 3.1 Browser Extension Popup
- **Primary Action**: "Close & Save YouTube Tabs" button
- **Secondary**: Basic on/off toggle for entire extension
- **Status**: Show count of currently saved tabs

#### 3.2 Settings
- **Scope**: Minimal settings approach
- **Controls**: Simple on/off toggle only
- **No**: Complex preference panels or granular controls

## Technical Requirements

### 4. Browser Compatibility
- **Target**: Firefox only
- **Manifest**: Manifest V2 or V3 (Firefox supports both)

### 5. Scope & Permissions
- **Domain**: youtube.com only
- **Exclusions**: No youtube.music.com, no embedded videos on other sites
- **Permissions**:
  - `tabs` (for tab management)
  - `storage` (for saving tab data)
  - `activeTab` (for content script injection)
  - Host permission for `*://youtube.com/*`

### 6. Data Storage
- **Method**: Firefox extension storage API
- **Data Persistence**: Saved tabs persist across browser sessions
- **Data Structure**:
  ```json
  {
    "savedTabs": [
      {
        "id": "unique_id",
        "url": "youtube.com/watch?v=...",
        "title": "Video Title",
        "channelName": "Channel Name",
        "thumbnail": "thumbnail_url",
        "savedAt": "timestamp"
      }
    ]
  }
  ```

## User Experience Flow

### 7. Installation & Setup
1. User installs extension from Firefox Add-ons store
2. Extension automatically activates on youtube.com
3. No setup required - works immediately

### 8. Daily Usage Flow
1. User visits YouTube - shorts are automatically hidden with overlay
2. User can temporarily show shorts using overlay button if needed
3. When ready to close YouTube tabs, clicks extension button
4. All YouTube tabs close and are saved
5. Next YouTube visit shows saved tabs above recommendations
6. User can click saved tabs to reopen or delete unwanted ones

## Success Metrics
- Reduction in average YouTube session time
- Decreased navigation to shorts URLs
- User retention and continued usage of extension
- Positive user feedback on doomscroll prevention

## Future Considerations
- Time-based usage tracking
- Custom categories for saved tabs
- Export/import functionality for tab lists
- Support for YouTube Music (if requested)

## Technical Architecture

### 9. Extension Components
- **Background Script**: Tab management, storage operations
- **Content Script**: DOM manipulation for shorts hiding, saved tabs display
- **Popup**: User interface for tab management
- **Manifest**: Permissions and extension configuration

### 10. Key Implementation Areas
- CSS selectors for identifying YouTube Shorts elements
- Scroll prevention without breaking other page functionality
- Efficient tab closure and metadata extraction
- DOM injection for saved tabs display without breaking YouTube's SPA navigation