// Settings management for Lovable Add-ons

class Settings {
    constructor() {
        this.initializeSettings();
    }

    async initializeSettings() {
        // Create settings UI
        this.createSettingsUI();
        // Load saved API key if exists
        await this.loadApiKey();
    }

    createSettingsUI() {
        const settingsContainer = document.createElement('div');
        settingsContainer.className = 'lovable-settings-container';
        settingsContainer.innerHTML = `
            <div class="lovable-settings-panel">
                <h3>Settings</h3>
                <div class="lovable-settings-section">
                    <label for="groqApiKey">GroqAI API Key:</label>
                    <input type="password" id="groqApiKey" placeholder="Enter your GroqAI API key">
                    <button id="saveApiKey">Save API Key</button>
                    <p class="lovable-settings-info">Your API key is stored securely and encrypted.</p>
                </div>
            </div>
        `;

        // Add settings button to the sidebar
        const settingsButton = document.createElement('button');
        settingsButton.className = 'lovable-settings-button';
        settingsButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97 0-.33-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49 1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98 0 .33.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 13.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5z"/></svg>';
        settingsButton.title = 'Settings';

        // Add click handler for settings button
        settingsButton.addEventListener('click', () => {
            settingsContainer.classList.toggle('show');
        });

        // Add save handler for API key
        settingsContainer.querySelector('#saveApiKey').addEventListener('click', () => {
            const apiKey = settingsContainer.querySelector('#groqApiKey').value;
            this.saveApiKey(apiKey);
        });

        // Append elements to the page
        document.body.appendChild(settingsContainer);
        document.querySelector('.lovable-sidebar').appendChild(settingsButton);
    }

    // Encrypt the API key before storing
    async encryptApiKey(apiKey) {
        const encoder = new TextEncoder();
        const data = encoder.encode(apiKey);
        const buffer = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(buffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    // Save API key to Chrome storage
    async saveApiKey(apiKey) {
        try {
            const encryptedKey = await this.encryptApiKey(apiKey);
            await chrome.storage.sync.set({ groqApiKey: encryptedKey });
            console.log('API key saved successfully');
        } catch (error) {
            console.error('Error saving API key:', error);
        }
    }

    // Load API key from Chrome storage
    async loadApiKey() {
        try {
            const result = await chrome.storage.sync.get(['groqApiKey']);
            if (result.groqApiKey) {
                document.querySelector('#groqApiKey').value = '••••••••';
            }
        } catch (error) {
            console.error('Error loading API key:', error);
        }
    }

    // Get API key for use in prompt enhancement
    async getApiKey() {
        try {
            const result = await chrome.storage.sync.get(['groqApiKey']);
            return result.groqApiKey || null;
        } catch (error) {
            console.error('Error getting API key:', error);
            return null;
        }
    }
}

const defaultSettings = {
    groqModel: 'mixtral-8x7b-32768',
    modelParams: {
        temperature: 0.7,
        max_completion_tokens: 1024,
        top_p: 1,
        stream: true,
        stop: null
    }
};

const modelConfigs = {
    'mixtral-8x7b-32768': {
        temperature: 0.7,
        max_completion_tokens: 1024,
        top_p: 1
    },
    'deepseek-r1-distill-llama-70b': {
        temperature: 0.7,
        max_completion_tokens: 1024,
        top_p: 1
    },
    'gemma2-9b-it': {
        temperature: 1.0,
        max_completion_tokens: 1024,
        top_p: 1
    },
    'llama-3.3-70b-versatile': {
        temperature: 1.0,
        max_completion_tokens: 1024,
        top_p: 1
    }
};

// Initialize settings
const settings = new Settings();
export default settings;