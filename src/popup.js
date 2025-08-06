// Popup window functionality for Lovable Add-ons

document.addEventListener('DOMContentLoaded', () => {
    const apiKeyInput = document.getElementById('groqApiKey');
    const modelSelect = document.getElementById('groqModel');
    const saveButton = document.getElementById('saveSettings');
    const successMessage = document.getElementById('successMessage');
    const apiKeyError = document.getElementById('apiKeyError');
    let existingApiKey = null;

    // SVG icons for the button states
    const saveIcon = `
        <svg class="save-icon" viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 6L9 17l-5-5"/>
        </svg>
    `;
    
    const removeIcon = `
        <svg class="remove-icon" viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
    `;

    // Function to show error message
    const showError = (message) => {
        apiKeyError.textContent = message;
        apiKeyError.hidden = false;
        apiKeyInput.setAttribute('aria-invalid', 'true');
        successMessage.classList.remove('show');
    };

    // Function to clear error message
    const clearError = () => {
        apiKeyError.textContent = '';
        apiKeyError.hidden = true;
        apiKeyInput.removeAttribute('aria-invalid');
    };

    // Function to update button state
    const updateButtonState = (hasKey) => {
        if (hasKey) {
            saveButton.innerHTML = `${removeIcon}<span>Remove API Key</span>`;
            saveButton.classList.add('remove');
            saveButton.setAttribute('aria-label', 'Remove API key');
        } else {
            saveButton.innerHTML = `${saveIcon}<span>Save</span>`;
            saveButton.classList.remove('remove');
            saveButton.setAttribute('aria-label', 'Save API key');
        }
    };

    // Load saved settings
    chrome.storage.sync.get(['groqApiKey', 'groqModel'], (result) => {
        if (result.groqApiKey) {
            existingApiKey = result.groqApiKey;
            apiKeyInput.value = '••••••••';
            updateButtonState(true);
        } else {
            updateButtonState(false);
        }
        if (result.groqModel) {
            modelSelect.value = result.groqModel;
        }
    });

    // Function to show success message
    const showSuccessMessage = (message = 'Settings saved successfully') => {
        successMessage.textContent = message;
        successMessage.hidden = false;
        successMessage.classList.add('show');
        setTimeout(() => {
            successMessage.classList.remove('show');
            setTimeout(() => {
                successMessage.hidden = true;
            }, 300);
        }, 2000);
    };

    // Function to validate API key
    const validateApiKey = (key) => {
        if (!key) return 'Please enter an API key';
        if (!key.startsWith('gsk_')) return 'Invalid API key format';
        if (key.length < 8) return 'API key is too short';
        return null;
    };

    // Function to save settings
    const saveSettings = async (newApiKey = null) => {
        try {
            clearError();
            const apiKeyToSave = newApiKey || (apiKeyInput.value === '••••••••' ? existingApiKey : apiKeyInput.value);
            
            const error = validateApiKey(apiKeyToSave);
            if (error) {
                showError(error);
                return;
            }

            await chrome.storage.sync.set({
                groqApiKey: apiKeyToSave,
                groqModel: modelSelect.value
            });

            showSuccessMessage();

            if (newApiKey) {
                existingApiKey = newApiKey;
                apiKeyInput.value = '••••••••';
                updateButtonState(true);
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            showError('Failed to save settings. Please try again.');
        }
    };

    // Function to remove API key
    const removeApiKey = async () => {
        try {
            clearError();
            await chrome.storage.sync.remove('groqApiKey');
            existingApiKey = null;
            apiKeyInput.value = '';
            updateButtonState(false);
            showSuccessMessage('API key removed successfully');
        } catch (error) {
            console.error('Error removing API key:', error);
            showError('Failed to remove API key. Please try again.');
        }
    };

    // Auto-save when model is changed
    modelSelect.addEventListener('change', () => {
        if (existingApiKey) {
            saveSettings();
        }
    });

    // Handle save/remove button click
    saveButton.addEventListener('click', () => {
        if (saveButton.classList.contains('remove')) {
            removeApiKey();
        } else {
            const newApiKey = apiKeyInput.value !== '••••••••' ? apiKeyInput.value : null;
            if (newApiKey) {
                saveSettings(newApiKey);
            }
        }
    });

    // Handle Enter key in input
    apiKeyInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !saveButton.classList.contains('remove')) {
            saveButton.click();
        }
    });

    // Show/hide API key on focus/blur
    apiKeyInput.addEventListener('focus', () => {
        clearError();
        if (apiKeyInput.value === '••••••••' && existingApiKey) {
            apiKeyInput.value = existingApiKey;
        }
    });

    apiKeyInput.addEventListener('blur', () => {
        if (existingApiKey && apiKeyInput.value === existingApiKey) {
            apiKeyInput.value = '••••••••';
        }
    });

    // Handle input changes
    apiKeyInput.addEventListener('input', () => {
        clearError();
        const hasValue = apiKeyInput.value.length > 0 && apiKeyInput.value !== '••••••••';
        updateButtonState(hasValue ? false : !!existingApiKey);
    });

    // Function to filter prompts based on search input
    const filterPrompts = (searchText) => {
        const promptElements = document.querySelectorAll('.prompt-item');
        const searchLower = searchText.toLowerCase();
        
        promptElements.forEach(element => {
            const promptName = element.querySelector('.prompt-name').textContent.toLowerCase();
            const promptContent = element.querySelector('.prompt-content').textContent.toLowerCase();
            
            if (promptName.includes(searchLower) || promptContent.includes(searchLower)) {
                element.style.display = '';
            } else {
                element.style.display = 'none';
            }
        });
    };

    // Initialize search functionality
    const searchInput = document.getElementById('promptSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterPrompts(e.target.value);
        });
    }
});