# Changelog

All notable changes to this project will be documented in this file.

## [2.1.3] - 2025-08-06

### Added
- **Intelligent Send Button Detection**: Waits for Lovable.dev's specific send button to be available and enabled
- **Minimal Dark UI Design**: Clean dark gray (#272725) queue items with white text
- **Keyboard Shortcuts**: Shift+Enter to add prompts to queue
- **Silent Operation**: Removed all intrusive toast notifications and popups
- **Smart Interference Prevention**: Automatically closes modals/overlays that block functionality
- **Real-time Status Indicators**: [NEXT/SENDING/FAILED] status on queue items
- **Robust Send Logic**: Waits up to 15 seconds for send button to become ready
- **Smart Page Detection**: Only activates on project pages (URLs with `/projects/`), never on homepage
- **Enhanced DOM Element Detection**: Multiple fallback strategies for finding chat elements
- **Automatic Retry Mechanism**: Chat interface detection with exponential backoff
- **Comprehensive Debugging System**: Detailed logging for troubleshooting
- **Proper Initialization Timing**: UI and keyboard handlers synchronized properly

### Fixed
- **Critical: First Prompt Registration Issue**: Fixed timing issue where first prompt wasn't being registered
- **Eliminated UI Freezing**: Removed green overlay and layout interference issues
- **Fixed Screen-blocking Elements**: No more blue modal overlays or toast popups
- **Resolved Send Button Detection**: Now properly finds Lovable.dev's send button with classes `flex size-6 items-center justify-center rounded-full bg-foreground text-background`
- **Send Button Availability**: Waits for button to be enabled (not disabled or opacity-50)
- **Prompt Queue Reliability**: Queue now correctly appears only on project pages
- **Improved Chat Element Detection**: Multiple fallback strategies for finding textarea and form elements
- **Fixed CSS Selector Compatibility**: Removed browser-specific selectors that caused issues
- **Resolved Performance Issues**: Optimized DOM observers with proper throttling

### Changed
- **Complete UI Redesign**: Minimal dark theme integration above chat input
- **Streamlined User Experience**: Simple numbered list (1., 2., 3...) with clean styling
- **Silent Feedback**: Visual-only status updates, no intrusive notifications
- **Non-blocking Implementation**: Fixed positioning and DOM insertion to prevent layout issues
- Updated DOM selectors to work with current Lovable.dev interface
- Improved throttling for mutation observers (max 4 times per second)
- Enhanced error handling with graceful degradation
- Optimized UI initialization timing and cleanup

### Performance
- Implemented throttled mutation observers to reduce CPU usage
- Added debounced rendering to prevent excessive DOM updates
- Optimized DOM queries with more efficient selectors
- Reduced memory footprint with proper cleanup on navigation

## [2.1.2] - Previous Release

### Features
- Initial prompt queue implementation
- Enhanced prompt tools
- SEO analysis utilities
- Prompt library system
- Code context awareness

### Core Infrastructure  
- Chrome Manifest V3 compliance
- Modular architecture with feature separation
- Global namespace system
- Theme detection and adaptation

## Development Notes

### Recent Technical Improvements
- **DOM Detection**: Switched from rigid selectors to flexible element detection
- **Browser Compatibility**: Removed unsupported CSS selectors (`:has()`, `:contains()`)
- **Performance Optimization**: Added proper throttling and debouncing
- **Error Handling**: Improved fallback mechanisms and retry logic
- **Debugging**: Enhanced logging for easier troubleshooting

### Architecture Changes
- Centralized feature initialization through namespace system  
- Improved separation of concerns between features
- Better state management and cleanup on navigation
- More robust DOM manipulation utilities
