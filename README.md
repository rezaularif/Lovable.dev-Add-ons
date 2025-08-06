# Lovable.dev Add-ons

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-2.1.3-blue.svg)](https://github.com/yourusername/lovable-dev-addons/releases)
[![Chrome Web Store](https://img.shields.io/badge/Chrome-Web%20Store-blue.svg)](https://chrome.google.com/webstore)

A powerful Chrome extension that enhances your Lovable.dev development workflow with essential productivity tools and utilities. Built with vanilla JavaScript following Chrome's Manifest V3 specifications for optimal performance and security.

## ✨ Features

### 🚀 Prompt Queue
- **Smart Queuing System**: Queue multiple prompts while one is processing on project pages
- **Minimal Dark UI**: Clean dark gray (#272725) queue items with white text
- **Keyboard Shortcuts**: Press `Shift+Enter` to add prompts to queue
- **Automatic Processing**: Sequential prompt execution with 500ms delay
- **Real-time Status**: Visual indicators showing [NEXT/SENDING/FAILED] status
- **Silent Operation**: No intrusive notifications or popups
- **Smart Visibility**: Queue only appears when prompts are queued (zero UI clutter)

### 🤖 Enhanced Prompt Tools
- **AI-Powered Enhancement**: Groq API integration for prompt optimization
- **Context-Aware Processing**: Intelligent prompt analysis and improvement
- **Error Handling**: Robust error recovery with user-friendly feedback
- **Secure API Management**: Encrypted storage of API keys

### 📚 Prompt Library
- **Save & Organize**: Store your best prompts for reuse
- **Template System**: Pre-built prompt templates for common tasks
- **Quick Access**: Easy insertion of saved prompts
- **Project Organization**: Folder-based prompt management

### 🔍 SEO Tools
- **Built-in Analysis**: Comprehensive SEO analysis utilities
- **Metadata Management**: Easy handling of SEO metadata
- **Content Optimization**: Tools for improving content SEO
- **XML Escaping**: Safe handling of special characters

### 💻 Code Context
- **Enhanced Analysis**: Advanced code context awareness
- **Smart Detection**: Automatic code pattern recognition
- **Integration Ready**: Seamless integration with Lovable.dev interface

## 🚀 Installation

### From Chrome Web Store (Recommended)
1. Visit the [Chrome Web Store listing](https://chrome.google.com/webstore/detail/lovabledev-add-ons/)
2. Click "Add to Chrome"
3. Confirm the installation when prompted
4. The extension icon will appear in your browser toolbar

### Manual Installation (Developer Mode)
1. Download the latest release from the [Releases page](https://github.com/yourusername/lovable-dev-addons/releases)
2. Extract the downloaded ZIP file to a folder
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode" using the toggle in the top-right corner
5. Click "Load unpacked" and select the extracted folder
6. The extension will be installed and ready to use

## 🛠 Usage

### Prompt Queue
The Prompt Queue feature automatically activates on Lovable.dev project pages:

1. **Navigate to a Project**: Open any project on Lovable.dev
2. **Add Prompts**: Type your prompt and press `Shift+Enter` to add it to the queue
3. **Visual Feedback**: Queue items appear above the chat input with:
   - Numbered positions (1., 2., 3...)
   - Prompt preview (truncated to ~60 characters)
   - Status indicators for the active prompt
   - Remove buttons (×) for individual management
4. **Automatic Processing**: Prompts are sent sequentially without manual intervention
5. **Error Recovery**: Failed prompts show retry options

### Enhanced Prompt
1. **Setup API Key**: Configure your Groq API key in the extension settings
2. **Write Prompt**: Enter your prompt in the chat textarea
3. **Enhance**: Use the enhancement feature to optimize your prompt
4. **Review**: The enhanced prompt will replace your original text

### SEO Tools
1. **Access Tools**: Use the SEO analysis features from the extension interface
2. **Analyze Content**: Run SEO analysis on your project content
3. **Apply Suggestions**: Implement recommended optimizations
4. **Export Data**: Generate SEO reports and metadata

### Prompt Library
1. **Save Prompts**: Store frequently used prompts in your library
2. **Organize**: Create folders and tags for better organization
3. **Quick Insert**: Access saved prompts with a single click
4. **Template Usage**: Use pre-built templates for common scenarios

## ⚙️ Configuration

### API Key Setup
1. Click the extension icon in your browser toolbar
2. Navigate to Settings
3. Enter your Groq API key (encrypted and stored securely)
4. Save the configuration

### Permissions
The extension requires the following permissions:
- **Storage**: For saving settings and prompt library
- **Side Panel**: For the extension interface
- **Host Permissions**: Access to `*.lovable.dev` domains

## 🏗️ Technical Architecture

### Manifest V3 Compliance
- Built using Chrome's latest extension manifest format
- Enhanced security and performance
- Service worker-based background processing

### Core Components
- **Content Scripts**: Inject functionality into Lovable.dev pages
- **Side Panel**: Dedicated interface for extension features
- **Settings Management**: Secure storage and encryption
- **Event System**: Internal communication and state management

### Performance Optimizations
- **Throttled Observers**: Efficient DOM monitoring (max 4 times/second)
- **Debounced Rendering**: Prevents excessive UI updates
- **Memory Management**: Proper cleanup on navigation
- **Optimized Selectors**: Efficient DOM queries

## 🔧 Development

### Project Structure
```
├── manifest.json              # Extension manifest
├── src/
│   ├── features/
│   │   ├── prompt-queue.js     # Prompt queuing system
│   │   ├── enhance-prompt.js   # AI prompt enhancement
│   │   ├── seo-tools.js        # SEO analysis tools
│   │   ├── prompt-library.js   # Prompt management
│   │   └── code-context.js     # Code analysis
│   ├── utils/
│   │   ├── namespace.js        # Global namespace
│   │   ├── dom-utils.js        # DOM utilities
│   │   ├── toast.js            # Notification system
│   │   └── promptLoader.js     # Template loader
│   ├── popup.js                # Extension popup
│   ├── sidepanel.js            # Side panel interface
│   └── settings.js             # Settings management
├── config/
│   └── promptTemplates.json    # Prompt templates
├── docs/                       # Documentation
├── icons/                      # Extension icons
└── styles.css                  # Global styles
```

### Building from Source
1. Clone the repository
2. Install dependencies (if any)
3. Load the extension in developer mode
4. Test functionality on Lovable.dev

## 📋 Changelog

### Version 2.1.3 (Latest)
- **Major UI Redesign**: Minimal dark theme integration
- **Enhanced Performance**: Optimized DOM observers and rendering
- **Silent Operation**: Removed intrusive notifications
- **Smart Interference Prevention**: Auto-closes blocking modals
- **Improved Reliability**: Better error handling and recovery

### Previous Versions
- **2.1.2**: Initial prompt queue implementation
- **2.0.0**: Fixed UI layout issues and improved CSS handling
- **1.9.1**: Previous stable version
- **1.5.1**: Removed search and color picker functionality
- **1.5.0**: Initial version with all features

## 🤝 Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Development Guidelines
- Follow existing code style and patterns
- Add comments for complex functionality
- Test on multiple browser versions
- Ensure Manifest V3 compliance

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Troubleshooting
- **Extension not working**: Refresh the Lovable.dev page and try again
- **API errors**: Check your Groq API key configuration
- **UI issues**: Disable and re-enable the extension
- **Performance problems**: Clear browser cache and restart

### Getting Help
- Check the [documentation](docs/)
- Review [troubleshooting guides](PROMPT_QUEUE_TROUBLESHOOTING.md)
- Report issues on GitHub
- Contact support through the Chrome Web Store

## 🔗 Links

- [Chrome Web Store](https://chrome.google.com/webstore/detail/lovabledev-add-ons/)
- [GitHub Repository](https://github.com/yourusername/lovable-dev-addons)
- [Documentation](docs/)
- [Lovable.dev](https://lovable.dev)

---

**Made with ❤️ for the Lovable.dev community**
