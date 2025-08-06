# Quick Reference Guide

## 🚀 Prompt Queue - Quick Start

### Basic Usage
1. **Go to a Lovable.dev project** (URLs with `/projects/`)
2. **Type your prompt** in the chat input
3. **Press `Shift+Enter`** to add it to the queue
4. **Watch it process automatically** - no further action needed!

### Visual Indicators
- **Dark gray boxes** appear above chat input when prompts are queued
- **Numbers show queue position**: 1., 2., 3...
- **Status indicators**:
  - `[NEXT]` - Ready to be sent next
  - `[SENDING]` - Currently being processed  
  - `[FAILED]` - Error occurred, click × to remove or it will retry
- **× button** - Click to remove individual prompts

### Keyboard Shortcuts
- `Shift+Enter` - Add prompt to queue
- Regular `Enter` - Normal send (or auto-queue if system is busy)

## 🔧 Troubleshooting

### ❌ Queue Not Appearing?
1. ✅ **Check you're on a project page** (URL must contain `/projects/`)
2. ✅ **Wait 2-3 seconds** after page load before trying Shift+Enter
3. ✅ **Refresh the page** if needed
4. ✅ **Check extension is enabled** in chrome://extensions/

### ❌ First Prompt Not Working?
This was **fixed in v2.1.3**! If you still have issues:
1. Make sure you have the latest version (2.1.3)
2. Refresh the page and wait a moment before trying
3. Check browser console (F12) for error messages

### ❌ Prompts Not Sending?
This was **fixed in v2.1.3** with better send button detection! The queue now:
- Waits for the send button to be available
- Waits for it to be enabled (not grayed out)
- Retries automatically if needed

## 🎯 Best Practices

### Queue Management
- ✅ **Keep queues under 10 prompts** for best performance
- ✅ **Remove completed prompts** by clicking × button
- ✅ **Let failed prompts retry** or click × to remove them
- ✅ **Queue similar prompts together** for better workflow

### Writing Effective Prompts
- ✅ **Be specific and clear** about what you want
- ✅ **Include context** when needed
- ✅ **Break complex requests** into multiple prompts
- ✅ **Use consistent formatting** for similar tasks

## ⚙️ Settings & Configuration

### Extension Settings
1. Click extension icon in browser toolbar
2. Access side panel for advanced features
3. Configure Groq API key for prompt enhancement
4. Manage prompt library and templates

### Permissions
The extension only needs:
- **Storage** - For your settings and prompt library
- **Side Panel** - For the extension interface  
- **lovable.dev access** - To work on Lovable.dev pages

## 🔄 What's New in v2.1.3

### ✅ Major Fixes
- **First prompt registration** - Now works reliably
- **Send button detection** - Properly waits for Lovable.dev's interface
- **Timing issues** - Better synchronization of UI and functionality

### ✅ Improvements
- **Silent operation** - No more intrusive popups or notifications
- **Clean UI** - Minimal dark theme that doesn't interfere with your work
- **Smart detection** - Only appears on project pages, never homepage
- **Better performance** - Optimized for speed and reliability

## 📱 Browser Compatibility

### Supported
- ✅ **Chrome 88+** (recommended)
- ✅ **Chromium-based browsers** (Edge, Brave, etc.)
- ✅ **Latest versions** recommended for best performance

### Requirements
- Chrome extensions enabled
- JavaScript enabled
- Access to lovable.dev domain

## 🆘 Need Help?

### Quick Fixes
1. **Refresh** the Lovable.dev page
2. **Disable and re-enable** the extension
3. **Clear browser cache** for lovable.dev
4. **Restart browser** if needed

### Get Support
- 📖 [Full README](README.md) - Complete documentation
- 🔧 [Technical Docs](TECHNICAL_DOCUMENTATION.md) - For developers
- 🛠️ [Troubleshooting Guide](PROMPT_QUEUE_TROUBLESHOOTING.md) - Detailed help
- 🌐 [Chrome Web Store](https://chromewebstore.google.com/detail/lovabledev-add-ons/kbacddfmjjdomaadfckjdhclgaghmjpi) - Reviews and support

### Console Commands (Advanced)
Open browser console (F12) and try:
```javascript
// Check if extension is loaded
window.LovableAddons?.state?.promptQueue

// Manually add a prompt
window.LovableAddons.state.promptQueue.enqueue("Test prompt")

// Check queue status
console.log("Queue size:", window.LovableAddons.state.promptQueue.size)
```

---

**Version:** 2.1.3 | **Updated:** August 6, 2025 | **Made with ❤️ for Lovable.dev users**
