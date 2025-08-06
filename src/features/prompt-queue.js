/**
 * @fileoverview Integrated Prompt Queue for Lovable Add-ons (Optimized).
 * 
 * Implements a seamlessly integrated prompt queue system that appears above the chat input with:
 * - Stacked visual prompt cards showing queue position and status
 * - Automatic sequential processing without manual intervention
 * - Smart visibility (only appears when prompts are queued)
 * - Real-time status indicators (next/sending/failed)
 * - Easy management with click-to-remove functionality
 * - Graceful error handling with clear visual feedback
 * 
 * Performance optimizations:
 * - Throttled mutation observers for better performance
 * - Debounced rendering to prevent excessive DOM updates
 * - Efficient DOM selectors for cross-browser compatibility
 * - Memory management with proper cleanup on navigation
 */
(function () {
  'use strict';

  if (!window.LovableAddons) {
    console.error('LovableAddons namespace not found. Make sure namespace.js is loaded first.');
    return;
  }

  /**
   * Simple event emitter (local)
   */
  function Emitter() {
    this._handlers = {};
  }
  Emitter.prototype.on = function (evt, fn) {
    (this._handlers[evt] = this._handlers[evt] || []).push(fn);
    return () => {
      this._handlers[evt] = (this._handlers[evt] || []).filter(h => h !== fn);
    };
  };
  Emitter.prototype.emit = function (evt, payload) {
    (this._handlers[evt] || []).forEach(fn => {
      try { fn(payload); } catch (e) { console.error(e); }
    });
  };

  /**
   * Queue states
   */
  const State = {
    IDLE: 'idle',
    RUNNING: 'running',
    ERRORED: 'errored'
  };

  /**
   * DOM selectors for lovable chat composer/buttons/messages.
   * Updated with cross-browser compatible selectors.
   */
  const SELECTORS = {
    // Primary composer elements - simplified selectors
    textArea: 'textarea',
    chatForm: 'form',
    // Native send/stop buttons - simplified selection
    nativeSendBtn: 'button[type="submit"]',
    alternativeSendBtn: 'button[aria-label*="Send"], button[title*="Send"]',
    nativeStopBtn: 'button[aria-label*="Stop"], button[title*="Stop"]',
    // Chat log where assistant messages appear
    chatLog: 'div[role="log"], .chat-messages, main'
  };

  /**
   * Utility: find first existing element by array of selectors (fallback chain)
   */
  function findFirst(selectors) {
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el) return el;
      } catch (e) {
        console.warn('Invalid selector:', sel);
      }
    }
    return null;
  }

  /**
   * PromptQueue core - restored working implementation with optimizations
   */
  const PromptQueue = {
    _state: State.IDLE,
    _queue: [],
    _emitter: new Emitter(),
    _currentPrompt: null,
    _lastError: null,
    _ui: null,
    _observer: null,
    _chatObserver: null,
    _keyboardHandler: null,
    _mainTextArea: null,
    _renderTimeout: null,
    _queueIndicator: null,

    get state() { return this._state; },
    get size() { return this._queue.length; },
    get current() { return this._currentPrompt; },

    init() {
      console.log('PromptQueue: Starting initialization...');
      
      // Only initialize on project pages, not homepage
      if (!this._isProjectPage()) {
        console.log('PromptQueue: Not a project page, skipping initialization');
        return;
      }
      
      console.log('PromptQueue: Project page detected, initializing...');
      this._observer = null;
      this._chatObserver = null;      
      
      // Build minimal UI above chat
      this._ensureUI();
      
      // Set up keyboard shortcuts
      this._setupKeyboardHandlers();
      
      // Expose singleton on namespace for other features if needed
      LovableAddons.state.promptQueue = this;
      
      console.log('PromptQueue: Initialization complete!');
    },

    on(evt, handler) { return this._emitter.on(evt, handler); },

    enqueue(text) {
      const trimmed = (text || '').trim();
      if (!trimmed) return;
      
      // Close any interfering overlays or modals
      this._closeInterferingElements();
      
      this._queue.push(trimmed);
      this._renderQueue();
      this._emitter.emit('queueChanged', this._queue.slice());
      
      // Always try to start processing immediately with a small delay
      setTimeout(() => {
        if (this._state === State.IDLE) {
          this._dequeueAndSend();
        }
      }, 500); // Small delay to ensure UI is ready
    },

    clearQueue() {
      this._queue = [];
      this._renderQueue();
      this._emitter.emit('queueChanged', []);
    },

    stop() {
      // Click native Stop if available - simplified approach
      const stopBtns = document.querySelectorAll('button');
      const stopBtn = Array.from(stopBtns).find(btn => {
        const text = btn.textContent?.toLowerCase() || '';
        const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
        return text.includes('stop') || ariaLabel.includes('stop');
      });
      if (stopBtn) stopBtn.click();
      // State will be updated by completion detection
    },

    retryLastError() {
      if (this._lastError && typeof this._lastError.prompt === 'string') {
        // Push failed prompt to front (priority retry)
        this._queue.unshift(this._lastError.prompt);
        this._lastError = null;
        this._setState(State.IDLE);
        this._dequeueAndSend();
      } else {
        // If no specific error to retry, just continue with queue
        this._lastError = null;
        this._setState(State.IDLE);
        if (this._queue.length > 0) {
          this._dequeueAndSend();
        }
      }
    },

    // Method to manually reset the queue and continue
    resetAndContinue() {
      console.log('PromptQueue: Manually resetting and continuing queue');
      this._lastError = null;
      this._setState(State.IDLE);
      if (this._queue.length > 0) {
        this._dequeueAndSend();
      }
    },

    // Internal
    
    _isProjectPage() {
      const url = window.location.href;
      const pathname = window.location.pathname;
      
      // Check if we're on a project page (has /projects/ in the URL)
      const isProjectURL = pathname.includes('/projects/');
      
      // Additional check: make sure we're not on the homepage
      const isHomepage = pathname === '/' || pathname === '' || pathname.endsWith('lovable.dev') || pathname.endsWith('lovable.dev/');
      
      // For project pages, also verify we have the right chat interface elements
      // (this helps distinguish between project chat and homepage chat)
      const hasProjectChat = isProjectURL && (
        document.querySelector('textarea#chatinput') || 
        document.querySelector('form textarea')
      );
      
      
      // Only show queue on actual project pages, never on homepage
      return isProjectURL && !isHomepage;
    },

    _ensureUI() {
      // Try to find the textarea for chat
      let textArea = document.querySelector('textarea');
      if (!textArea) {
        setTimeout(() => this._ensureUI(), 2000);
        return;
      }
      
      // Store reference to main textarea for keyboard handling
      this._mainTextArea = textArea;

      // Find the chat container - look for the form or parent container
      let chatContainer = textArea.closest('form');
      if (!chatContainer) {
        // Look for a parent div that likely contains the chat input
        chatContainer = textArea.parentElement;
        while (chatContainer && chatContainer !== document.body) {
          if (chatContainer.tagName === 'DIV' && chatContainer.children.length > 1) {
            break;
          }
          chatContainer = chatContainer.parentElement;
        }
      }
      
      if (!chatContainer) {
        chatContainer = textArea.parentElement;
      }

      // Avoid duplicate UI
      const existingQueueStack = document.querySelector('.lovable-queue-stack');
      if (existingQueueStack) {
        const existingList = existingQueueStack.querySelector('.queue-list');
        if (existingList) {
          this._ui = { 
            container: existingQueueStack,
            list: existingList
          };
          this._renderQueue();
          return;
        }
      }

      // Create minimal queue container that sits above the chat input
      const queueStack = document.createElement('div');
      queueStack.className = 'lovable-queue-stack';
      queueStack.style.cssText = `
        margin-bottom: 8px;
        display: none;
        font-family: inherit;
      `;

      // Queue list container - simple vertical list
      const list = document.createElement('div');
      list.className = 'queue-list';
      list.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 4px;
      `;

      queueStack.appendChild(list);
      
      // Insert above the chat input (before the chat container)
      chatContainer.insertBefore(queueStack, chatContainer.firstChild);

      // Store UI references
      this._ui = { 
        container: queueStack,
        list: list
      };
      
      this._renderQueue();
    },
    
    _addQueueIndicator() {
      // Add a small indicator that shows when queue is active
      const indicator = document.createElement('div');
      indicator.className = 'lovable-queue-indicator';
      indicator.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 8px 12px;
        background: rgba(0, 162, 234, 0.9);
        border: 1px solid rgba(0, 162, 234, 0.3);
        border-radius: 6px;
        color: white;
        font-size: 12px;
        font-weight: 500;
        z-index: 9999;
        display: none;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      `;
      indicator.textContent = 'Press Shift+Enter to queue prompt';
      
      // Insert into body to avoid layout issues
      document.body.appendChild(indicator);
      
      this._queueIndicator = indicator;
    },

    _setupKeyboardHandlers() {
      if (!this._mainTextArea) return;
      
      // Remove any existing listener
      if (this._keyboardHandler) {
        this._mainTextArea.removeEventListener('keydown', this._keyboardHandler);
      }
      
      // Create keyboard handler
      this._keyboardHandler = (e) => {
        const text = this._mainTextArea.value?.trim();
        
        // Shift+Enter: Add to queue
        if (e.shiftKey && e.key === 'Enter' && text) {
          e.preventDefault();
          e.stopPropagation();
          
          // Add to queue
          this.enqueue(text);
          
          // Clear the textarea
          this._mainTextArea.value = '';
          this._mainTextArea.dispatchEvent(new Event('input', { bubbles: true }));
          
          // Removed toast notification to avoid green feedback
          
          return false;
        }
        
        // Regular Enter: If system is busy, offer to queue
        if (!e.shiftKey && e.key === 'Enter' && text && this._state === State.RUNNING) {
          // Check if send button is disabled (system is busy)
          const sendBtn = this._findSendButton();
          if (sendBtn?.disabled) {
            e.preventDefault();
            e.stopPropagation();
            
            // Add to queue automatically
            this.enqueue(text);
            
            // Clear the textarea
            this._mainTextArea.value = '';
            this._mainTextArea.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Show toast
            LovableAddons.utils.toast?.showToast?.(`System busy - Added to queue: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`, 'info');
            
            return false;
          }
        }
      };
      
      // Add the event listener
      this._mainTextArea.addEventListener('keydown', this._keyboardHandler, true);
      
      // Update indicator based on state
      this._updateQueueIndicator();
    },
    
    _updateQueueIndicator() {
      if (!this._queueIndicator) return;
      
      if (this._state === State.RUNNING) {
        this._queueIndicator.style.display = 'block';
        this._queueIndicator.textContent = `System busy - Press Enter to queue | Queue: ${this._queue.length} prompt${this._queue.length !== 1 ? 's' : ''}`;
        this._queueIndicator.style.background = 'rgba(255, 193, 7, 0.2)';
        this._queueIndicator.style.borderColor = 'rgba(255, 193, 7, 0.3)';
        this._queueIndicator.style.color = '#ffc107';
      } else if (this._queue.length > 0) {
        this._queueIndicator.style.display = 'block';
        this._queueIndicator.textContent = `Queue: ${this._queue.length} prompt${this._queue.length !== 1 ? 's' : ''} ready | Press Shift+Enter to add more`;
        this._queueIndicator.style.background = 'rgba(34, 197, 94, 0.2)';
        this._queueIndicator.style.borderColor = 'rgba(34, 197, 94, 0.3)';
        this._queueIndicator.style.color = '#22c55e';
      } else {
        this._queueIndicator.style.display = 'none';
      }
    },

    _renderQueue() {
      if (!this._ui) return;
      
      // Debounce renders to prevent excessive DOM manipulation
      if (this._renderTimeout) {
        clearTimeout(this._renderTimeout);
      }
      
      this._renderTimeout = setTimeout(() => {
        this._doRenderQueue();
        this._renderTimeout = null;
      }, 16); // ~60fps max
    },
    
    _doRenderQueue() {
      if (!this._ui) return;
      const { container, list } = this._ui;
      
      // Show/hide the entire queue container based on whether there are items
      if (this._queue.length === 0) {
        container.style.display = 'none';
        return;
      } else {
        container.style.display = 'block';
      }
      
      // Clear list
      list.innerHTML = '';
      
      // Render queue items with minimal styling
      this._queue.forEach((prompt, idx) => {
        const item = document.createElement('div');
        item.className = 'queue-item';
        item.style.cssText = `
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 8px;
          background: #272725;
          border-radius: 4px;
          font-size: 12px;
          color: #fff;
        `;
        
        // Position number
        const position = document.createElement('span');
        position.style.cssText = `
          font-weight: bold;
          color: ${idx === 0 ? '#007acc' : '#666'};
        `;
        position.textContent = `${idx + 1}.`;
        
        // Prompt text
        const text = document.createElement('span');
        text.style.cssText = `
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        `;
        const displayText = prompt.length > 60 ? prompt.substring(0, 60) + '...' : prompt;
        text.textContent = displayText;
        text.title = prompt;
        
        // Status for first item
        if (idx === 0) {
          const status = document.createElement('span');
          status.style.cssText = `
            font-size: 10px;
            color: ${this._state === State.RUNNING ? '#007acc' : 
                     this._state === State.ERRORED ? '#cc7a00' : '#00cc66'};
            font-weight: bold;
          `;
          status.textContent = `[${this._state === State.RUNNING ? 'SENDING' : 
                                    this._state === State.ERRORED ? 'FAILED' : 'NEXT'}]`;
          item.appendChild(status);
        }
        
        // Remove button
        const remove = document.createElement('button');
        remove.style.cssText = `
          border: none;
          background: none;
          color: #999;
          cursor: pointer;
          font-size: 14px;
          padding: 0;
          width: 16px;
          height: 16px;
        `;
        remove.innerHTML = '×';
        remove.title = 'Remove';
        remove.addEventListener('click', (e) => {
          e.stopPropagation();
          this._removeQueueItem(idx);
        });
        
        // Assemble the item
        item.appendChild(position);
        item.appendChild(text);
        item.appendChild(remove);
        
        list.appendChild(item);
      });
    },
    
    // No longer needed for integrated UI
    
    _removeQueueItem(index) {
      this._queue.splice(index, 1);
      this._renderQueue();
      this._updateQueueIndicator();
      this._emitter.emit('queueChanged', this._queue.slice());
    },

    _setState(next, meta) {
      if (this._state === next) return;
      this._state = next;
      if (next !== State.ERRORED) this._lastError = null;
      this._renderQueue(); // Update queue display with new state
      this._updateQueueIndicator(); // Update indicator
      this._emitter.emit('stateChanged', { state: next, meta });
    },

    async _dequeueAndSend() {
      if (this._state !== State.IDLE) return;
      if (!this._queue.length) {
        this._setState(State.IDLE);
        return;
      }

      const prompt = this._queue.shift();
      this._renderQueue();

      try {
        this._currentPrompt = prompt;
        await this._sendPromptDom(prompt);
        // Success: continue with next
        this._currentPrompt = null;
        this._setState(State.IDLE);
        if (this._queue.length) {
          // brief yield to allow UI settle
          setTimeout(() => this._dequeueAndSend(), 200);
        }
      } catch (err) {
        console.error('Send failed:', err);
        this._lastError = { error: err, prompt };
        this._currentPrompt = null;
        this._setState(State.ERRORED, { error: err });
        // Removed error toast notification to avoid screen blocking
      }
    },

    /**
     * Send a prompt using DOM: fill textarea, click native send, wait for assistant reply or failure.
     */
    _sendPromptDom(prompt) {
      return new Promise((resolve, reject) => {
        const textArea = document.querySelector(SELECTORS.textArea);
        const sendBtn = this._findSendButton();

        if (!textArea || !sendBtn) {
          reject(new Error('Chat elements not found'));
          return;
        }

        console.log('PromptQueue: Sending prompt:', prompt);

        // Set prompt in textarea and trigger events
        textArea.value = prompt;
        textArea.dispatchEvent(new Event('input', { bubbles: true }));
        textArea.dispatchEvent(new Event('change', { bubbles: true }));

        // Wait a short moment for the UI to update
        setTimeout(() => {
          // Check if send button is enabled
          if (sendBtn.disabled) {
            console.log('PromptQueue: Send button is disabled');
            reject(new Error('Send button is disabled'));
            return;
          }

          // Set up completion detection before clicking
          this._setupCompletionDetection(resolve, reject);
          
          // Change state to running and click send
          this._setState(State.RUNNING);
          
          try {
            console.log('PromptQueue: Clicking send button');
            sendBtn.click();
          } catch (e) {
            console.error('PromptQueue: Error clicking send button:', e);
            reject(e);
          }
        }, 100); // Small delay to ensure textarea value is processed
      });
    },

    _findSendButton() {
      // Try multiple approaches to find the send button
      let sendBtn = null;
      
      // First try: look for buttons with send-related attributes
      sendBtn = document.querySelector('button[type="submit"]');
      if (sendBtn) return sendBtn;
      
      // Second try: look for buttons with send-related aria-labels or titles
      sendBtn = document.querySelector('button[aria-label*="Send"], button[title*="Send"]');
      if (sendBtn) return sendBtn;
      
      // Third try: look for any button that contains "Send" text
      const buttons = Array.from(document.querySelectorAll('button'));
      sendBtn = buttons.find(btn => {
        const text = btn.textContent?.toLowerCase() || '';
        const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
        return text.includes('send') || ariaLabel.includes('send');
      });
      if (sendBtn) return sendBtn;
      
      // Fourth try: look for buttons near the textarea
      const textArea = document.querySelector('textarea');
      if (textArea) {
        const form = textArea.closest('form');
        if (form) {
          sendBtn = form.querySelector('button:not([disabled])');
          if (sendBtn) return sendBtn;
        }
        
        // Look for buttons in the same container
        const container = textArea.parentElement;
        if (container) {
          sendBtn = container.querySelector('button:not([disabled])');
          if (sendBtn) return sendBtn;
        }
      }
      
      // Last try: any enabled button on the page (risky but better than nothing)
      sendBtn = document.querySelector('button:not([disabled])');
      return sendBtn;
    },

    _setupCompletionDetection(resolve, reject) {
      let isCompleted = false;
      const timeoutMs = 45000; // 45 seconds - more reasonable
      
      // Set up timeout
      const timeoutId = setTimeout(() => {
        if (!isCompleted) {
          isCompleted = true;
          cleanup();
          console.log('PromptQueue: Timeout waiting for completion, assuming finished');
          resolve(); // Treat timeout as completion and continue
        }
      }, timeoutMs);
      
      // Method to complete successfully
      const complete = () => {
        if (!isCompleted) {
          isCompleted = true;
          cleanup();
          console.log('PromptQueue: Prompt completed successfully');
          resolve();
        }
      };
      
      // Method to complete with error
      const fail = (error) => {
        if (!isCompleted) {
          isCompleted = true;
          cleanup();
          console.log('PromptQueue: Prompt failed:', error);
          reject(error);
        }
      };
      
      let cleanup;
      
      // Strategy 1: Watch for the send button to become enabled again
      const sendBtn = this._findSendButton();
      let sendBtnWasDisabled = false;
      
      const checkSendButton = () => {
        if (!sendBtn) return;
        
        if (sendBtn.disabled) {
          sendBtnWasDisabled = true;
        } else if (sendBtnWasDisabled) {
          // Button was disabled and now it's enabled again - likely completed
          console.log('PromptQueue: Send button re-enabled, assuming completion');
          setTimeout(complete, 500); // Small delay to ensure completion
        }
      };
      
      // Strategy 2: Watch for DOM changes that indicate completion
      const chatContainer = document.querySelector('main') || document.body;
      let initialChildCount = chatContainer ? chatContainer.querySelectorAll('*').length : 0;
      let hasSeenChanges = false;
      
      const mutationObserver = new MutationObserver((mutations) => {
        if (isCompleted) return;
        
        // Check if we've seen significant DOM changes
        const currentChildCount = chatContainer ? chatContainer.querySelectorAll('*').length : 0;
        if (currentChildCount > initialChildCount + 5) { // Threshold for "significant" change
          hasSeenChanges = true;
        }
        
        // Check send button state
        checkSendButton();
        
        // If we've seen changes and button is now enabled, likely done
        if (hasSeenChanges && sendBtn && !sendBtn.disabled) {
          console.log('PromptQueue: DOM changes detected and send button enabled');
          setTimeout(complete, 1000); // Longer delay to ensure response is complete
        }
      });
      
      // Strategy 3: Simple timer-based completion (primary strategy)
      // Most Lovable responses complete within 15-30 seconds
      let simpleTimeout = setTimeout(() => {
        if (!isCompleted) {
          console.log('PromptQueue: Simple timeout completion (15 seconds)');
          complete();
        }
      }, 15000); // 15 second simple completion
      
      // Strategy 4: Fallback timeout for longer responses
      let fallbackTimeout = setTimeout(() => {
        if (!isCompleted && hasSeenChanges) {
          console.log('PromptQueue: Fallback completion after DOM changes');
          complete();
        }
      }, 30000); // 30 second fallback
      
      // Start observing
      if (chatContainer) {
        mutationObserver.observe(chatContainer, {
          childList: true,
          subtree: true
        });
      }
      
      // Initial check
      setTimeout(checkSendButton, 1000);
      
      // Cleanup function
      cleanup = () => {
        clearTimeout(timeoutId);
        clearTimeout(simpleTimeout);
        clearTimeout(fallbackTimeout);
        try {
          mutationObserver.disconnect();
        } catch (e) {
          // Ignore disconnect errors
        }
      };
    },

    _setupChatCompletionObserver() {
      // No-op here because _sendPromptDom installs a short-lived observer per send.
      // But we also watch for global DOM to rebuild UI if composer re-renders.
    },

    _setupDomObserver() {
      if (this._observer) {
        try { this._observer.disconnect(); } catch (_) {}
      }
      
      // Use a throttled mutation observer to reduce performance impact
      let observerTimeout = null;
      this._observer = new MutationObserver((mutations) => {
        // Throttle observer callbacks to prevent excessive re-renders
        if (observerTimeout) return;
        
        observerTimeout = setTimeout(() => {
          observerTimeout = null;
          
          // Only react to significant changes
          const hasSignificantChanges = mutations.some(mutation => {
            // Only care about added/removed nodes that might affect our UI
            if (mutation.type === 'childList') {
              const hasFormChanges = Array.from(mutation.addedNodes).concat(Array.from(mutation.removedNodes))
                .some(node => {
                  if (node.nodeType === Node.ELEMENT_NODE) {
                    return node.matches('form, textarea, .lovable-queue-container') || 
                           node.querySelector('form, textarea, .lovable-queue-container');
                  }
                  return false;
                });
              return hasFormChanges;
            }
            return false;
          });
          
          if (hasSignificantChanges) {
            this._ensureUI();
          }
        }, 250); // Throttle to max 4 times per second
      });
      
      // Only observe the specific areas we care about, not the entire body
      const targetNode = document.querySelector('main') || document.body;
      this._observer.observe(targetNode, { 
        childList: true, 
        subtree: true,
        attributes: false // Don't observe attribute changes
      });
      
      // Navigation event listeners (keep these as they're lightweight)
      window.addEventListener('popstate', () => this._resetOnNav());
      window.addEventListener('pushstate', () => this._resetOnNav());
      window.addEventListener('replacestate', () => this._resetOnNav());
    },

    _resetOnNav() {
      // Clear queue and state on navigation to avoid leaking prompts across projects
      this._queue = [];
      this._currentPrompt = null;
      this._lastError = null;
      this._setState(State.IDLE);
      
      // Check if we should show/hide the UI based on new page
      if (this._isProjectPage()) {
        // We're on a project page, ensure UI is present
        setTimeout(() => this._ensureUI(), 100); // Small delay for DOM to settle
      } else {
        // We're not on a project page, remove UI if present
        this._cleanupUI();
      }
      
      if (this._ui) {
        this._renderQueue();
      }
    },
    
    _cleanupUI() {
      // Remove integrated queue UI when leaving project pages
      const existingQueueStack = document.querySelector('.lovable-queue-stack');
      if (existingQueueStack) {
        existingQueueStack.remove();
      }
      
      // Remove queue indicator
      if (this._queueIndicator) {
        this._queueIndicator.remove();
        this._queueIndicator = null;
      }
      
      // Remove keyboard handler
      if (this._mainTextArea && this._keyboardHandler) {
        this._mainTextArea.removeEventListener('keydown', this._keyboardHandler);
        this._keyboardHandler = null;
      }
      
      this._ui = null;
      this._mainTextArea = null;
      
      // Disconnect observers
      if (this._observer) {
        try { this._observer.disconnect(); } catch (_) {}
        this._observer = null;
      }
    },
    
    _closeInterferingElements() {
      // Close modals, overlays, or popups that might interfere
      const interfering = [
        // Common modal/overlay selectors
        '[role="dialog"]',
        '.modal',
        '.overlay', 
        '.popup',
        '.tooltip',
        // Look for elements with high z-index that might be overlays
        '[style*="z-index: 999"]',
        '[style*="z-index: 9999"]',
        // Common backdrop selectors
        '.backdrop',
        '.modal-backdrop',
        // Blue-ish colored overlays (like in the screenshot)
        '[style*="background"][style*="blue"]',
        '[style*="background-color"][style*="blue"]'
      ];
      
      interfering.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            // Try to find close button
            const closeBtn = el.querySelector('button[aria-label*="close"], button[aria-label*="Close"], .close, [data-dismiss]');
            if (closeBtn) {
              closeBtn.click();
              return;
            }
            
            // Try pressing escape key to close
            el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27 }));
            
            // If all else fails, try to hide it
            if (el.style.display !== 'none') {
              el.style.display = 'none';
            }
          });
        } catch (e) {
          // Ignore errors for individual selectors
        }
      });
      
      // Also try pressing Escape on the document to close any modal
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
    }
  };

  // Register as a feature for initialization entrypoint
  LovableAddons.registerFeature('promptQueue', {
    init() {
      PromptQueue.init();
    },
    getInstance() {
      return PromptQueue;
    }
  });

  // Auto-init when DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    PromptQueue.init();
  });

})();
