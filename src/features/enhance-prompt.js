/**
 * @fileoverview Prompt enhancement feature for Lovable Add-ons Chrome extension.
 * This file provides functionality to enhance user prompts using the Groq API.
 */

(function() {
  'use strict';

  // Make sure LovableAddons namespace exists
  if (!window.LovableAddons) {
    console.error('LovableAddons namespace not found. Make sure namespace.js is loaded first.');
    return;
  }

  /**
   * Prompt enhancement feature
   * @namespace LovableAddons.features.enhancePrompt
   */
  const enhancePromptFeature = {
    /**
     * Enhances a prompt using the Groq API
     * @param {string} prompt - The prompt to enhance
     * @param {HTMLElement} [button] - Optional button element to show loading state
     * @returns {Promise<string>} The enhanced prompt
     */
    enhance: async function(prompt, button) {
      // Validate extension context first
      if (!chrome.runtime?.id) {
        throw new Error('Extension context invalidated. Please refresh the page.');
      }

      if (!prompt || typeof prompt !== 'string') {
        throw new Error('Invalid prompt: Please provide a valid text input');
      }

      let originalValue = '';
      let textArea = document.querySelector('textarea');
      if (!textArea) {
        throw new Error('Text area not found: Please refresh the page and try again');
      }

      try {
        // Store original value and disable textarea
        originalValue = textArea.value;
        textArea.disabled = true;
        
        // Add processing state
        if (button) {
          button.classList.add('processing');
        }
        
        // Get the API key from storage with context validation
        let apiKey;
        let model;
        try {
          const result = await chrome.storage.sync.get(['groqApiKey', 'groqModel']);
          apiKey = result.groqApiKey;
          model = result.groqModel || 'deepseek-r1-distill-llama-70b'; // Default to DeepSeek if not set
        } catch (storageError) {
          throw new Error('Extension context lost. Please refresh the page.');
        }
        
        if (!apiKey) {
          throw new Error('GroqAI API key not found. Please set it in the extension settings.');
        }

        // Add timeout to the fetch request
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout
  
        try {
          // Make API call to GroqAI with streaming support
          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: model,
              messages: [
                {
                  role: 'system',
                  content: 'You are a helpful assistant that improves prompts to be more effective, clear, and detailed. Focus on enhancing clarity, specificity, and context while maintaining the original intent.'
                },
                {
                  role: 'user',
                  content: `Please enhance this prompt to be more effective and detailed while maintaining its core meaning: ${prompt}`
                }
              ],
              temperature: 0.6,
              max_completion_tokens: 4096,
              top_p: 0.95,
              stream: true
            }),
            signal: controller.signal
          });

          clearTimeout(timeout);
    
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            if (response.status === 429) {
              throw new Error('Rate limit exceeded. Please wait a moment before trying again.');
            } else if (response.status === 401) {
              throw new Error('Invalid API key. Please check your API key in the extension settings.');
            } else {
              throw new Error(errorData.error?.message || `GroqAI API error: ${response.status} - ${response.statusText}`);
            }
          }

          const reader = response.body.getReader();
          let enhancedPrompt = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const jsonStr = line.slice(6).trim();
                  if (jsonStr === '[DONE]') continue;
                  const data = JSON.parse(jsonStr);
                  const content = data.choices[0]?.delta?.content || '';
                  enhancedPrompt += content;
                } catch (jsonError) {
                  console.error('Error parsing JSON chunk:', jsonError);
                  continue;
                }
              }
            }
          }

          if (!enhancedPrompt) {
            throw new Error('Received empty response from GroqAI');
          }
          
          // Remove thinking tags and their contents
          enhancedPrompt = enhancedPrompt.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
          
          return enhancedPrompt;
        } catch (fetchError) {
          if (fetchError.name === 'AbortError') {
            throw new Error('Request timed out. Please try again.');
          }
          throw fetchError;
        }
  
      } catch (error) {
        console.error('Error enhancing prompt:', error);
        const errorMessage = error.message || 'An unexpected error occurred';
        LovableAddons.utils.toast.showToast(`Error: ${errorMessage}`, 'error');
        return originalValue || prompt;
      } finally {
        // Reset loading state
        if (textArea) {
          textArea.disabled = false;
          textArea.focus();
        }
        if (button) {
          button.classList.remove('processing');
        }
      }
    },

    /**
     * Adds an enhance button to the chat interface
     * @returns {void}
     */
    addButton: function() {
      const chatForm = document.querySelector('form.p-2.flex.flex-col');
      if (!chatForm || chatForm.querySelector('.enhance-button')) return;

      const textArea = chatForm.querySelector('textarea');
      if (!textArea) return;

      const flexContainer = chatForm.querySelector('div.flex.gap-1.items-end.flex-wrap');
      if (!flexContainer) return;

      const enhanceButton = document.createElement('button');
      // Set the enhance button's class to match the two existing button classes
      enhanceButton.className = 'whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none hover:bg-accent hover:text-accent-foreground rounded-md flex items-center justify-center gap-1 px-2 py-1 h-fit focus-visible:ring-0 enhance-button';
      enhanceButton.title = 'Enhance Prompt (AI)';
      
      // Create SVG icon for the enhance button - using a "sparkle/enhance" icon
      const enhanceIcon = `
      <svg class="enhance-icon" viewBox="0 0 24 24">
          <path d="M12 3L13.5 8L18.5 9.5L13.5 11L12 16L10.5 11L5.5 9.5L10.5 8L12 3Z" />
          <path d="M19 16L20 19L22 20L20 21L19 24L18 21L16 20L18 19L19 16Z" />
          <path d="M5 16L6 19L8 20L6 21L5 24L4 21L2 20L4 19L5 16Z" />
      </svg>`;
      
      enhanceButton.innerHTML = `
          ${enhanceIcon}
          <span>Enhance</span>
      `;
      
      enhanceButton.addEventListener('click', async (e) => {
        e.preventDefault();
        const textArea = document.querySelector('textarea');
        if (!textArea || !textArea.value.trim()) {
          LovableAddons.utils.toast.showToast('Please enter some text to enhance', 'info');
          return;
        }

        const currentPrompt = textArea.value;
        enhanceButton.disabled = true;
        
        // Create loading SVG icon
        const loadingIcon = `
        <svg class="enhance-icon enhance-loading" viewBox="0 0 24 24">
            <path d="M12 3C16.97 3 21 7.03 21 12C21 16.97 16.97 21 12 21" />
            <path d="M12 21C7.03 21 3 16.97 3 12C3 7.03 7.03 3 12 3" />
        </svg>`;
        
        enhanceButton.innerHTML = `
            ${loadingIcon}
            <span>Loading...</span>
        `;
        
        try {
          const enhancedPrompt = await this.enhance(currentPrompt, enhanceButton);
          if (enhancedPrompt && enhancedPrompt !== currentPrompt) {
            textArea.value = enhancedPrompt;
            textArea.dispatchEvent(new Event('input', { bubbles: true }));
            textArea.style.height = 'auto';
            textArea.style.height = textArea.scrollHeight + 'px';
            LovableAddons.utils.toast.showToast('Prompt enhanced', 'success');
          }
        } catch (error) {
          console.error('Error in enhance button click:', error);
          LovableAddons.utils.toast.showToast(error.message, 'error');
        } finally {
          enhanceButton.disabled = false;
          enhanceButton.innerHTML = `
              ${enhanceIcon}
              <span>Enhance</span>
          `;
        }
      });

      flexContainer.prepend(enhanceButton);
    },

    /**
     * Initializes the enhance prompt feature
     * @returns {void}
     */
    init: function() {
      // Check if we should add the enhance button based on the current page
      if (LovableAddons.utils.dom.findChatContainer()) {
        this.addButton();
      }

      // Add mutation observer to detect when the chat container is added to the DOM
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'childList' && mutation.addedNodes.length) {
            if (LovableAddons.utils.dom.findChatContainer() && !document.querySelector('.enhance-button')) {
              this.addButton();
            }
          }
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });
    }
  };

  // Register the enhance prompt feature with the LovableAddons namespace
  LovableAddons.registerFeature('enhancePrompt', enhancePromptFeature);

  // Initialize the feature when the DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    enhancePromptFeature.init();
  });

})();
