/**
 * @fileoverview DOM utility functions for Lovable Add-ons Chrome extension.
 * This file provides DOM manipulation and detection utilities used across
 * the extension.
 */

(function() {
  'use strict';

  // Make sure LovableAddons namespace exists
  if (!window.LovableAddons) {
    console.error('LovableAddons namespace not found. Make sure namespace.js is loaded first.');
    return;
  }

  /**
   * DOM utility functions
   * @namespace LovableAddons.utils.dom
   */
  const domUtils = {
    /**
     * Finds the chat container element in various UI patterns
     * @returns {HTMLElement|null} The chat container element or null if not found
     */
    findChatContainer: function() {
      return document.querySelector(
        'div.ChatMessageContainer, ' +
        'form.p-2.flex.flex-col, ' +
        'div[role="log"], ' +
        'div.chat-container, ' +
        'div.chat-messages'
      );
    },

    /**
     * Determines if the UI should be injected based on page context
     * @returns {boolean} True if UI should be injected, false otherwise
     */
    shouldInjectUI: function() {
      // Check if we're on a project page (URL contains /projects/)
      const isProjectPage = window.location.pathname.includes('/projects/');

      return isProjectPage &&
             !document.querySelector('.lovable-ui-container') &&
             this.findChatContainer() !== null;
    },

    /**
     * Detects the current theme (light or dark) from the Lovable site
     * @returns {string} 'light' or 'dark'
     */
    detectTheme: function() {
      // First check if Lovable has a theme indicator
      const lovableThemeIndicator = document.documentElement.getAttribute('data-theme') ||
                                   document.body.getAttribute('data-theme');

      if (lovableThemeIndicator) {
        return lovableThemeIndicator.includes('light') ? 'light' : 'dark';
      }

      // Check for light theme indicators in the DOM
      const hasLightThemeIndicators = document.body.classList.contains('light') ||
                                     document.documentElement.classList.contains('light') ||
                                     document.body.style.backgroundColor === '#ffffff' ||
                                     document.body.style.backgroundColor === 'rgb(255, 255, 255)';

      if (hasLightThemeIndicators) {
        return 'light';
      }

      // Check if the background color is light
      const bodyBgColor = window.getComputedStyle(document.body).backgroundColor;
      if (bodyBgColor) {
        // Extract RGB values
        const rgbMatch = bodyBgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (rgbMatch) {
          const [_, r, g, b] = rgbMatch.map(Number);
          // Calculate brightness (simple formula: average of RGB)
          const brightness = (r + g + b) / 3;
          if (brightness > 128) {
            return 'light';
          }
        }
      }

      // Check system preference as fallback
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light';
      }

      // Default to dark theme
      return 'dark';
    },

    /**
     * Applies the current theme to the extension UI
     * @returns {void}
     */
    applyTheme: function() {
      const theme = this.detectTheme();
      document.documentElement.setAttribute('data-lovable-theme', theme);

      // Apply theme to any existing popups
      this.applyThemeToPopups();

      // Set up a MutationObserver to detect theme changes
      this.setupThemeObserver();
    },

    /**
     * Sets up a MutationObserver to detect theme changes
     * @returns {void}
     */
    setupThemeObserver: function() {
      // Check if observer is already set up
      if (this._themeObserver) return;

      const self = this;

      // Create a MutationObserver to watch for theme changes
      this._themeObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          if (mutation.type === 'attributes' &&
              mutation.attributeName === 'data-theme' ||
              mutation.attributeName === 'class') {
            // Theme might have changed, reapply theme
            self.applyTheme();
          }
        });
      });

      // Start observing the document body for theme changes
      this._themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme', 'class']
      });

      // Also observe the body for theme changes
      this._themeObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ['data-theme', 'class']
      });
    },

    /**
     * Applies theme to all popup elements
     * @returns {void}
     */
    applyThemeToPopups: function() {
      // Find all popup elements
      const popups = document.querySelectorAll('.lovable-popup, .code-context-popup, .prompt-library-popup-form');

      if (popups.length === 0) return;

      const theme = this.detectTheme();

      popups.forEach(popup => {
        // Add theme class to popup
        popup.setAttribute('data-lovable-theme', theme);

        // Apply theme-specific styles
        if (theme === 'light') {
          popup.style.background = 'var(--lovable-bg-secondary, #F5F5F5)';
          popup.style.color = 'var(--lovable-text-primary, rgba(0, 0, 0, 0.9))';

          // Update input fields
          const inputs = popup.querySelectorAll('input, select, textarea');
          inputs.forEach(input => {
            input.style.background = 'var(--lovable-highlight-color, rgba(0, 0, 0, 0.05))';
            input.style.color = 'var(--lovable-text-primary, rgba(0, 0, 0, 0.9))';
            input.style.borderColor = 'var(--lovable-border-color, rgba(0, 0, 0, 0.15))';
          });

          // Update buttons
          const buttons = popup.querySelectorAll('button:not(.category-filter-btn)');
          buttons.forEach(button => {
            if (button.classList.contains('lovable-button') ||
                button.classList.contains('prompt-library-button') ||
                button.classList.contains('code-context-button')) {
              // Skip buttons that already have theme-specific styles
              return;
            }

            // Only update background if it's not already set to a specific color
            if (button.style.background === 'transparent' ||
                button.style.background === '' ||
                button.style.background.includes('#3F3F46')) {
              button.style.background = 'var(--lovable-button-secondary, #EBEBEB)';
            }

            button.style.color = 'var(--lovable-text-primary, rgba(0, 0, 0, 0.9))';
            button.style.borderColor = 'var(--lovable-border-color, rgba(0, 0, 0, 0.15))';
          });
        } else {
          // Dark theme
          popup.style.background = 'var(--lovable-bg-secondary, #1C1C1C)';
          popup.style.color = 'var(--lovable-text-primary, rgba(255, 255, 255, 0.9))';
        }
      });
    },

    /**
     * Prepares a popup element with theme support
     * @param {HTMLElement} popup - The popup element to prepare
     * @returns {HTMLElement} - The prepared popup element
     */
    prepareThemedPopup: function(popup) {
      // Add lovable-popup class for easier targeting
      popup.classList.add('lovable-popup');

      // Set theme attribute
      const theme = this.detectTheme();
      popup.setAttribute('data-lovable-theme', theme);

      // Apply initial theme
      if (theme === 'light') {
        popup.style.background = 'var(--lovable-bg-secondary, #F5F5F5)';
        popup.style.color = 'var(--lovable-text-primary, rgba(0, 0, 0, 0.9))';
      } else {
        popup.style.background = 'var(--lovable-bg-secondary, #1C1C1C)';
        popup.style.color = 'var(--lovable-text-primary, rgba(255, 255, 255, 0.9))';
      }

      return popup;
    }
  };

  // Register the DOM utilities with the LovableAddons namespace
  LovableAddons.registerUtility('dom', domUtils);

})();
