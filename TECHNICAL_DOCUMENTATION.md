# Technical Documentation

## Extension Architecture

### Manifest V3 Compliance
The extension is built using Chrome's Manifest V3 specifications for enhanced security, performance, and future compatibility.

### File Structure
```
├── manifest.json                  # Extension configuration
├── content.js                     # Main content script loader
├── styles.css                     # Global styles
├── sidepanel.html                 # Side panel interface
├── popup.html                     # Extension popup
├── src/
│   ├── utils/
│   │   ├── namespace.js           # Global namespace and feature registry
│   │   ├── dom-utils.js           # DOM manipulation utilities
│   │   ├── toast.js               # Notification system
│   │   └── promptLoader.js        # Template loading utilities
│   ├── features/
│   │   ├── prompt-queue.js        # Main prompt queue implementation
│   │   ├── enhance-prompt.js      # AI prompt enhancement
│   │   ├── seo-tools.js           # SEO analysis tools
│   │   ├── prompt-library.js      # Prompt storage and management
│   │   └── code-context.js        # Code analysis features
│   ├── settings.js                # Settings management
│   ├── popup.js                   # Popup interface logic
│   └── sidepanel.js               # Side panel logic
├── config/
│   └── promptTemplates.json       # Default prompt templates
└── icons/                         # Extension icons
```

## Core Components

### 1. Namespace System (`namespace.js`)
Provides a centralized registry for all extension features and utilities.

**Key Functions:**
- `registerFeature(name, feature)` - Register a feature module
- `getFeature(name)` - Retrieve a registered feature
- `utils` - Global utilities namespace
- `state` - Shared state management

### 2. Prompt Queue (`prompt-queue.js`)
The main feature providing intelligent prompt queuing for Lovable.dev.

#### Architecture
```javascript
const PromptQueue = {
  // State management
  _state: State.IDLE,           // Current processing state
  _queue: [],                   // Array of queued prompts
  _currentPrompt: null,         // Currently processing prompt
  _lastError: null,             // Last error for retry functionality
  
  // UI management
  _ui: null,                    // UI element references
  _mainTextArea: null,          // Reference to chat textarea
  _keyboardHandler: null,       // Keyboard event handler
  
  // Performance optimization
  _renderTimeout: null,         // Debounced render timeout
  _observer: null,              // DOM mutation observer
  
  // Core methods
  init(),                       // Initialize the queue system
  enqueue(text),                // Add prompt to queue
  clearQueue(),                 // Clear all prompts
  stop(),                       // Stop current processing
  retryLastError(),             // Retry failed prompt
}
```

#### Key Features

**Smart Page Detection:**
```javascript
_isProjectPage() {
  const pathname = window.location.pathname;
  const isProjectURL = pathname.includes('/projects/');
  const isHomepage = pathname === '/' || pathname === '';
  return isProjectURL && !isHomepage;
}
```

**Intelligent Send Button Detection:**
```javascript
_findSendButton() {
  // Primary: Look for Lovable.dev's specific button classes
  let sendBtn = document.querySelector('button.flex.size-6.items-center.justify-center.rounded-full.bg-foreground.text-background');
  
  // Fallbacks for different UI states
  if (!sendBtn) sendBtn = document.querySelector('button.rounded-full.bg-foreground');
  if (!sendBtn) sendBtn = document.querySelector('button[type="submit"]');
  
  return sendBtn;
}
```

**Robust Send Logic:**
```javascript
_sendPromptDom(prompt) {
  return new Promise((resolve, reject) => {
    const waitForSendButton = (attempts = 0) => {
      // Wait up to 15 seconds for send button to be ready
      const maxAttempts = 30;
      
      // Check for textarea and send button
      const textArea = document.querySelector('textarea');
      const sendBtn = this._findSendButton();
      
      // Verify button is enabled (not disabled or opacity-50)
      const isDisabled = sendBtn?.disabled || 
                        sendBtn?.classList.contains('opacity-50');
      
      if (isDisabled && attempts < maxAttempts) {
        setTimeout(() => waitForSendButton(attempts + 1), 500);
        return;
      }
      
      // Button is ready, proceed with sending
      this._setupCompletionDetection(resolve, reject);
      sendBtn.click();
    };
    
    waitForSendButton();
  });
}
```

### 3. UI Integration

**Minimal Dark Theme:**
```css
.lovable-queue-stack {
  margin-bottom: 8px;
  display: none;
  font-family: inherit;
}

.queue-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: #272725;
  border-radius: 4px;
  font-size: 12px;
  color: #fff;
}
```

**Smart UI Positioning:**
The queue UI is inserted directly above the chat input container, ensuring it doesn't interfere with page layout.

### 4. Performance Optimizations

**Throttled DOM Observers:**
```javascript
_setupDomObserver() {
  let observerTimeout = null;
  this._observer = new MutationObserver((mutations) => {
    if (observerTimeout) return;
    
    observerTimeout = setTimeout(() => {
      observerTimeout = null;
      // Process mutations...
    }, 250); // Max 4 times per second
  });
}
```

**Debounced Rendering:**
```javascript
_renderQueue() {
  if (this._renderTimeout) clearTimeout(this._renderTimeout);
  
  this._renderTimeout = setTimeout(() => {
    this._doRenderQueue();
    this._renderTimeout = null;
  }, 16); // ~60fps max
}
```

## Event System

### Internal Events
The prompt queue uses an internal event emitter for state management:

```javascript
// Event emission
this._emitter.emit('stateChanged', { state: next, meta });
this._emitter.emit('queueChanged', this._queue.slice());

// Event listening
queue.on('stateChanged', (event) => {
  console.log('Queue state:', event.state);
});
```

### Keyboard Events
```javascript
_keyboardHandler = (e) => {
  const text = this._mainTextArea.value?.trim();
  
  // Shift+Enter: Add to queue
  if (e.shiftKey && e.key === 'Enter' && text) {
    e.preventDefault();
    e.stopPropagation();
    this.enqueue(text);
    this._mainTextArea.value = '';
    return false;
  }
  
  // Regular Enter: Auto-queue if system busy
  if (!e.shiftKey && e.key === 'Enter' && text && this._state === State.RUNNING) {
    const sendBtn = this._findSendButton();
    if (sendBtn?.disabled) {
      e.preventDefault();
      this.enqueue(text);
      this._mainTextArea.value = '';
      return false;
    }
  }
};
```

## Error Handling

### Graceful Degradation
The extension includes comprehensive error handling:

```javascript
try {
  await this._sendPromptDom(prompt);
  // Success: remove from queue
  this._queue.shift();
  this._setState(State.IDLE);
} catch (err) {
  // Error: keep prompt in queue for retry
  this._lastError = { error: err, prompt };
  this._setState(State.ERRORED, { error: err });
}
```

### Completion Detection Strategies
Multiple strategies ensure reliable completion detection:

1. **Send Button State Monitoring** - Watch for button re-enabling
2. **DOM Change Detection** - Monitor for significant DOM updates
3. **Timer-based Completion** - 15-second primary timeout
4. **Fallback Timeout** - 30-second maximum timeout

## Security Considerations

### Content Security Policy
The extension follows strict CSP guidelines:
- No inline scripts or styles
- All resources loaded from extension package
- Secure API key storage using Chrome's storage API

### Permissions
Minimal permissions requested:
- `storage` - For settings and prompt library
- `sidePanel` - For extension interface
- `host_permissions` - Limited to `*.lovable.dev` domains

## Testing

### Manual Testing Checklist
1. **Page Detection**: Verify queue only appears on project pages
2. **Keyboard Shortcuts**: Test Shift+Enter functionality
3. **UI Integration**: Ensure no layout interference
4. **Send Logic**: Verify prompts send reliably
5. **Error Recovery**: Test retry functionality
6. **Performance**: Monitor for memory leaks or excessive CPU usage

### Debug Mode
Enable detailed logging:
```javascript
localStorage.setItem('lovable-addons-debug', 'true');
```

### Console Testing
```javascript
// Access queue instance
const queue = window.LovableAddons?.state?.promptQueue;

// Test operations
queue?.enqueue('Test prompt');
queue?.clearQueue();
queue?.retryLastError();
```

## Browser Compatibility

### Chrome Requirements
- Chrome 88+ (Manifest V3 support)
- Modern JavaScript features (ES6+)
- CSS Grid and Flexbox support

### Cross-browser Considerations
- Avoided browser-specific CSS selectors (`:has()`, `:contains()`)
- Used standard DOM APIs
- Polyfills not required for target browsers

## Development Workflow

### Local Development
1. Load extension in developer mode
2. Enable debug logging
3. Test on Lovable.dev project pages
4. Monitor console for errors
5. Use Chrome DevTools for performance profiling

### Deployment
1. Update version in `manifest.json`
2. Update `CHANGELOG.md`
3. Test thoroughly
4. Package for Chrome Web Store
5. Submit for review

## API Integration

### Groq API (Enhanced Prompts)
- Secure API key storage
- Error handling for rate limits
- Context-aware prompt enhancement

### Chrome Extension APIs
- `chrome.storage` for persistent data
- `chrome.sidePanel` for UI
- Content scripts for page interaction

## Future Enhancements

### Planned Features
- Prompt templates with variables
- Batch prompt processing
- Export/import functionality
- Advanced filtering and search

### Technical Improvements
- Service worker implementation
- Better caching strategies
- Enhanced analytics
- Improved accessibility

---

**Last Updated:** August 6, 2025  
**Version:** 2.1.3  
**Target Browser:** Chrome 88+
