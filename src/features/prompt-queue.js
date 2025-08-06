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
      this._initialized = false;
      
      // Build minimal UI above chat with callback for completion
      this._ensureUI(() => {
        // Set up keyboard shortcuts after UI is ready
        this._setupKeyboardHandlers();
        this._initialized = true;
        console.log('PromptQueue: Initialization complete!');
      });
      
      // Expose singleton on namespace for other features if needed
      LovableAddons.state.promptQueue = this;
    },

    on(evt, handler) { return this._emitter.on(evt, handler); },

    enqueue(text) {
      const trimmed = (text || '').trim();
      if (!trimmed) {
        console.warn('PromptQueue: Cannot enqueue empty text');
        return;
      }
      
      console.log('PromptQueue: Enqueuing prompt:', trimmed.substring(0, 50) + (trimmed.length > 50 ? '...' : ''));
      
      // Close any interfering overlays or modals
      this._closeInterferingElements();
      
      this._queue.push(trimmed);
      
      // Ensure UI is available before rendering
      if (!this._ui) {
        console.log('PromptQueue: UI not ready, ensuring UI first...');
        this._ensureUI(() => {
          this._renderQueue();
          this._emitter.emit('queueChanged', this._queue.slice());
          // Start processing after UI is ready, only if this is the first item
          if (this._queue.length === 1 && this._state === State.IDLE) {
            this._startProcessingWithDelay();
          }
        });
      } else {
        this._renderQueue();
        this._emitter.emit('queueChanged', this._queue.slice());
        // Start processing only if this is the first item in queue
        if (this._queue.length === 1 && this._state === State.IDLE) {
          this._startProcessingWithDelay();
        }
      }
    },
    
    _startProcessingWithDelay() {
      // Delay processing to ensure everything is ready
      setTimeout(() => {
        if (this._state === State.IDLE && this._queue.length > 0) {
          this._dequeueAndSend();
        }
      }, 1000); // Longer delay for first prompt to ensure chat is ready
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

    _ensureUI(callback) {
      // Try to find the textarea for chat
      let textArea = document.querySelector('textarea');
      if (!textArea) {
        setTimeout(() => this._ensureUI(callback), 2000);
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
          if (callback) callback();
          return;
        }
      }

      // Create minimal queue container that sits above the chat input
      const queueStack = document.createElement('div');
      queueStack.className = 'lovable-queue-stack';
      queueStack.style.cssText = `
        margin-bottom: 6px;
        display: none;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        width: 100%;
        flex: 1 1 100%;
        text-align: left !important;
        align-self: stretch;
        margin-left: 0 !important;
        margin-right: 0 !important;
        padding-left: 0 !important;
        padding-right: 0 !important;
        margin-top: 0 !important;
        padding-top: 0 !important;
        padding-bottom: 0 !important;
      `;

      // Queue list container - simple vertical list
      const list = document.createElement('div');
      list.className = 'queue-list';
      list.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 1px;
        align-items: flex-start !important;
        justify-content: flex-start !important;
        width: 100%;
        padding-left: 0 !important;
        padding-right: 0 !important;
        margin-left: 0 !important;
        margin-right: 0 !important;
        margin-top: 0 !important;
        margin-bottom: 0 !important;
        padding-top: 0 !important;
        padding-bottom: 0 !important;
        text-align: left !important;
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
      
      // Call the callback after UI is ready
      if (callback) callback();
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
            
            // No toast notification - silent operation
            
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
      
      // Add minimal hover styles if not already added
      if (!document.querySelector('#lovable-queue-minimal-styles')) {
        const minimalStyles = document.createElement('style');
        minimalStyles.id = 'lovable-queue-minimal-styles';
        minimalStyles.textContent = `
          .lovable-queue-remove:hover {
            opacity: 1 !important;
            color: rgba(255, 255, 255, 0.8) !important;
            background: rgba(255, 255, 255, 0.1) !important;
            transform: scale(1.1);
          }
          
          .lovable-queue-remove:active {
            transform: scale(0.95);
          }
          
          /* Global overrides to ensure left alignment */
          .lovable-queue-stack {
            display: block !important;
            width: 100% !important;
            padding-left: 0 !important;
            margin-left: 0 !important;
          }
          
          .queue-list {
            display: flex !important;
            flex-direction: column !important;
            align-items: stretch !important;
            justify-content: flex-start !important;
            width: 100% !important;
            padding-left: 0 !important;
            margin-left: 0 !important;
          }
          
          .lovable-queue-item {
            display: flex !important;
            align-items: center !important;
            justify-content: flex-start !important;
            width: 100% !important;
            text-align: left !important;
          }
          
          .lovable-queue-item > * {
            text-align: left !important;
          }
          
          .lovable-queue-remove {
            margin-left: auto !important;
            margin-right: 0 !important;
          }
          
          /* Shimmering animation for status */
          @keyframes shimmer {
            0% {
              opacity: 0.4;
              transform: translateX(0) scale(1);
            }
            25% {
              opacity: 0.7;
              transform: translateX(0.5px) scale(1.02);
            }
            50% {
              opacity: 1;
              transform: translateX(0) scale(1.05);
            }
            75% {
              opacity: 0.7;
              transform: translateX(-0.5px) scale(1.02);
            }
            100% {
              opacity: 0.4;
              transform: translateX(0) scale(1);
            }
          }
          
          .queue-status-shimmer {
            animation: shimmer 2s cubic-bezier(0.4, 0, 0.6, 1) infinite !important;
            will-change: opacity, transform;
          }
          
          /* Faster shimmer for sending state */
          .queue-status-sending {
            animation: shimmer 1s cubic-bezier(0.4, 0, 0.6, 1) infinite !important;
            will-change: opacity, transform;
          }
          
          /* Pulse animation for error state */
          @keyframes pulse-error {
            0% {
              opacity: 0.5;
              transform: scale(1);
            }
            50% {
              opacity: 1;
              transform: scale(1.02);
            }
            100% {
              opacity: 0.5;
              transform: scale(1);
            }
          }
          
          .queue-status-error {
            animation: pulse-error 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite !important;
            will-change: opacity, transform;
          }
        `;
        document.head.appendChild(minimalStyles);
      }
      
      // Render queue items with minimal styling
      this._queue.forEach((prompt, idx) => {
        const isFirst = idx === 0;
        console.log('PromptQueue: Rendering item', idx, 'isFirst:', isFirst, 'state:', this._state);
        
        const item = document.createElement('div');
        item.className = 'lovable-queue-item';
        item.style.cssText = `
          display: flex;
          align-items: center;
          gap: 0;
          padding: 4px 0;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.95);
          margin-bottom: 2px;
          margin-top: 0px;
          text-align: left !important;
          justify-content: flex-start !important;
          width: 100%;
          margin-left: 0 !important;
          margin-right: 0 !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          line-height: 1.3;
          min-height: 20px;
        `;
        
        // Position number
        const position = document.createElement('span');
        position.style.cssText = `
          font-size: 11px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.85);
          min-width: 20px;
          width: 20px;
          text-align: left !important;
          flex-shrink: 0;
          flex-grow: 0;
          display: inline-flex;
          align-items: center;
          margin-left: 0 !important;
          margin-right: 6px !important;
          padding-left: 0 !important;
          line-height: 1;
        `;
        position.textContent = `${idx + 1}.`;
        
        // Prompt text
        const text = document.createElement('span');
        text.style.cssText = `
          flex: 1 1 auto;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-weight: 500;
          text-align: left !important;
          display: block;
          margin-left: 0 !important;
          margin-right: 8px !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          line-height: 1.3;
          min-width: 0;
          color: rgba(255, 255, 255, 0.95);
        `;
        const displayText = prompt.length > 60 ? prompt.substring(0, 60) + '...' : prompt;
        text.textContent = displayText;
        text.title = prompt;
        
        // Remove button
        const remove = document.createElement('button');
        remove.className = 'lovable-queue-remove';
        remove.style.cssText = `
          border: none;
          background: transparent;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          font-size: 14px;
          padding: 2px;
          width: 18px;
          height: 18px;
          opacity: 0.7;
          flex-shrink: 0;
          text-align: center;
          margin-left: auto;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
          position: relative;
          z-index: 10;
          transition: all 0.2s ease;
        `;
        remove.innerHTML = '×';
        remove.title = 'Remove from queue';
        remove.type = 'button'; // Explicitly set button type
        
        // Add multiple event handlers to ensure it works
        remove.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('PromptQueue: Remove button clicked for index:', idx);
          this._removeQueueItem(idx);
        };
        
        // Also add mousedown handler as backup
        remove.onmousedown = (e) => {
          e.preventDefault();
          e.stopPropagation();
        };
        
        // Status for first item only (add after text, before remove button)
        let status = null;
        if (isFirst) {
          console.log('PromptQueue: Creating status element for first item, state:', this._state);
          status = document.createElement('span');
          status.style.cssText = `
            font-size: 10px;
            font-weight: 700;
            color: rgba(255, 255, 255, 1);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            flex-shrink: 0;
            flex-grow: 0;
            margin-left: 0 !important;
            margin-right: 8px !important;
            display: inline-block;
            line-height: 1;
            white-space: nowrap;
            min-width: 60px;
            transition: all 0.3s ease;
            opacity: 1;
          `;
          
          // Set color, text and animation class based on state
          if (this._state === State.RUNNING) {
            status.style.color = '#8D6FEB'; // Purple for sending
            status.textContent = '[SENDING]';
            status.className = 'queue-status-shimmer queue-status-sending';
          } else if (this._state === State.ERRORED) {
            status.style.color = '#dc3545'; // Red for failed
            status.textContent = '[FAILED]';
            status.className = 'queue-status-shimmer queue-status-error';
          } else {
            status.style.color = '#22c55e'; // Green for next
            status.textContent = '[NEXT]';
            status.className = 'queue-status-shimmer';
          }
          
          console.log('PromptQueue: Status text set to:', status.textContent);
        }
        
        // Assemble the item in correct order
        item.appendChild(position);
        if (status) {
          console.log('PromptQueue: Appending status element');
          item.appendChild(status);
        }
        item.appendChild(text);
        item.appendChild(remove);
        
        list.appendChild(item);
      });
    },
    
    // No longer needed for integrated UI
    
    _removeQueueItem(index) {
      console.log('PromptQueue: Removing item at index:', index, 'from queue of length:', this._queue.length);
      
      // Validate index
      if (index < 0 || index >= this._queue.length) {
        console.error('PromptQueue: Invalid index for removal:', index);
        return;
      }
      
      // Remove the item
      const removed = this._queue.splice(index, 1);
      console.log('PromptQueue: Removed item:', removed[0]?.substring(0, 50) + '...');
      
      // Update UI
      this._renderQueue();
      this._updateQueueIndicator();
      this._emitter.emit('queueChanged', this._queue.slice());
      
      // If we removed the first item while it was running, we need to handle that
      if (index === 0 && this._state === State.RUNNING) {
        console.log('PromptQueue: Removed currently running prompt, resetting state');
        this._currentPrompt = null;
        this._setState(State.IDLE);
        
        // Continue with the next prompt if any
        if (this._queue.length > 0) {
          setTimeout(() => this._dequeueAndSend(), 500);
        }
      }
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

      // Don't remove from queue yet - just peek at first item
      const prompt = this._queue[0];
      this._currentPrompt = prompt;
      
      // Mark as running but keep in queue
      this._setState(State.RUNNING);

      try {
        await this._sendPromptDom(prompt);
        // Success: NOW remove from queue
        this._queue.shift();
        this._currentPrompt = null;
        this._setState(State.IDLE);
        this._renderQueue();
        
        if (this._queue.length) {
          // brief yield to allow UI settle
          setTimeout(() => this._dequeueAndSend(), 200);
        } else {
          // Queue is now empty, ensure state is properly reset
          console.log('PromptQueue: Queue is now empty after processing last item');
          this._setState(State.IDLE);
        }
      } catch (err) {
        console.error('Send failed:', err);
        this._lastError = { error: err, prompt };
        this._currentPrompt = null;
        this._setState(State.ERRORED, { error: err });
        
        // Keep the prompt in queue since it failed
        // Don't remove it, let user retry or manually remove
        console.log('PromptQueue: Keeping failed prompt in queue for retry');
      }
    },

    /**
     * Send a prompt using DOM: fill textarea, click native send, wait for assistant reply or failure.
     */
    _sendPromptDom(prompt) {
      return new Promise((resolve, reject) => {
        console.log('PromptQueue: Starting to send prompt:', prompt.substring(0, 50) + '...');
        
        // Function to wait for send button to be available
        const waitForSendButton = (attempts = 0) => {
          const maxAttempts = 30; // 30 attempts * 500ms = 15 seconds max wait
          
          const textArea = document.querySelector(SELECTORS.textArea);
          const sendBtn = this._findSendButton();
          
          if (!textArea) {
            if (attempts < maxAttempts) {
              console.log('PromptQueue: Waiting for textarea...');
              setTimeout(() => waitForSendButton(attempts + 1), 500);
            } else {
              reject(new Error('Textarea not found after waiting'));
            }
            return;
          }
          
          // Set prompt in textarea and trigger events
          if (textArea.value !== prompt) {
            textArea.value = prompt;
            textArea.dispatchEvent(new Event('input', { bubbles: true }));
            textArea.dispatchEvent(new Event('change', { bubbles: true }));
          }
          
          if (!sendBtn) {
            if (attempts < maxAttempts) {
              console.log('PromptQueue: Waiting for send button to appear...');
              setTimeout(() => waitForSendButton(attempts + 1), 500);
            } else {
              reject(new Error('Send button not found after waiting'));
            }
            return;
          }
          
          // Check if send button is disabled or has disabled styles
          const isDisabled = sendBtn.disabled || 
                            sendBtn.classList.contains('disabled') ||
                            sendBtn.classList.contains('opacity-50') ||
                            sendBtn.style.opacity === '0.5';
          
          if (isDisabled) {
            if (attempts < maxAttempts) {
              console.log('PromptQueue: Send button is disabled, waiting...');
              setTimeout(() => waitForSendButton(attempts + 1), 500);
            } else {
              reject(new Error('Send button remained disabled after waiting'));
            }
            return;
          }
          
          // Send button is available and enabled!
          console.log('PromptQueue: Send button is ready, clicking now');
          
          // Set up completion detection before clicking
          this._setupCompletionDetection(resolve, reject);
          
          // Change state to running and click send
          this._setState(State.RUNNING);
          
          try {
            sendBtn.click();
            console.log('PromptQueue: Send button clicked successfully');
          } catch (e) {
            console.error('PromptQueue: Error clicking send button:', e);
            reject(e);
          }
        };
        
        // Start the process
        waitForSendButton();
      });
    },

    _findSendButton() {
      // Look for the specific send button with the Lovable.dev class structure
      // The button has classes: flex size-6 items-center justify-center rounded-full bg-foreground text-background
      let sendBtn = null;
      
      // Primary: Look for button with the specific Lovable classes
      sendBtn = document.querySelector('button.flex.size-6.items-center.justify-center.rounded-full.bg-foreground.text-background');
      if (sendBtn) return sendBtn;
      
      // Fallback: Look for any button with rounded-full and bg-foreground (key identifiers)
      sendBtn = document.querySelector('button.rounded-full.bg-foreground');
      if (sendBtn) return sendBtn;
      
      // Second fallback: look for submit button
      sendBtn = document.querySelector('button[type="submit"]');
      if (sendBtn) return sendBtn;
      
      // Third fallback: look for buttons with send-related aria-labels
      sendBtn = document.querySelector('button[aria-label*="Send"], button[title*="Send"]');
      if (sendBtn) return sendBtn;
      
      // Fourth fallback: look for any button near the textarea that isn't disabled
      const textArea = document.querySelector('textarea');
      if (textArea) {
        const form = textArea.closest('form');
        if (form) {
          sendBtn = form.querySelector('button:not([disabled])');
          if (sendBtn) return sendBtn;
        }
      }
      
      return null; // Return null if no send button found
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
          // If this is the last item in queue, use a shorter timeout
          const isLastItem = this._queue.length === 1;
          if (isLastItem) {
            console.log('PromptQueue: Last item in queue - using shorter timeout (10 seconds)');
          } else {
            console.log('PromptQueue: Simple timeout completion (15 seconds)');
          }
          complete();
        }
      }, this._queue.length === 1 ? 10000 : 15000); // Shorter timeout for last item
      
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
      
      // Initial check and periodic checking
      setTimeout(checkSendButton, 1000);
      
      // Check send button state periodically
      const checkInterval = setInterval(() => {
        if (isCompleted) {
          clearInterval(checkInterval);
          return;
        }
        
        // Re-find the send button in case it was recreated
        const currentSendBtn = this._findSendButton();
        if (currentSendBtn && !currentSendBtn.disabled && sendBtnWasDisabled) {
          console.log('PromptQueue: Send button found enabled during periodic check');
          clearInterval(checkInterval);
          setTimeout(complete, 500);
        }
      }, 500); // Check every 500ms
      
      // Cleanup function
      cleanup = () => {
        clearTimeout(timeoutId);
        clearTimeout(simpleTimeout);
        clearTimeout(fallbackTimeout);
        clearInterval(checkInterval);
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
