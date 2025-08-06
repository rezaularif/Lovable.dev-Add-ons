/**
 * @fileoverview Main initialization script for Lovable Add-ons Chrome extension.
 * This file initializes all features and sets up observers for DOM changes.
 */

(() => {
  'use strict';

  /**
   * Injects UI controls container for additional features
   * @returns {void}
   */
  function injectUIControls() {
    const existingControls = document.querySelector('.lovable-controls');
    if (existingControls) return;

    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'lovable-controls';
    controlsContainer.setAttribute('aria-label', 'Chat controls');

    const targetElement = document.querySelector('nav');
    if (targetElement) {
      targetElement.appendChild(controlsContainer);
    }
  }

  /**
   * Initializes all extension features
   * @returns {void}
   */
  function initializeExtension() {
    // Make sure LovableAddons namespace exists
    if (!window.LovableAddons) {
      console.error('LovableAddons namespace not found. Make sure namespace.js is loaded first.');
      return;
    }

    // Initialize theme detection first
    if (LovableAddons.utils && LovableAddons.utils.dom &&
        typeof LovableAddons.utils.dom.applyTheme === 'function') {
      LovableAddons.utils.dom.applyTheme();
    }

    // Check if UI should be injected
    if (LovableAddons.utils.dom.shouldInjectUI()) {
      injectUIControls();
    }

    // Initialize all features
    try {
      // Add enhance prompt button
      if (LovableAddons.features.enhancePrompt && typeof LovableAddons.features.enhancePrompt.addButton === 'function') {
        LovableAddons.features.enhancePrompt.addButton();
      }

      // Add SEO tools button
      if (LovableAddons.features.seoTools && typeof LovableAddons.features.seoTools.addButton === 'function') {
        LovableAddons.features.seoTools.addButton();
      }

      // Add prompt library button
      if (LovableAddons.features.promptLibrary && typeof LovableAddons.features.promptLibrary.addButton === 'function') {
        LovableAddons.features.promptLibrary.addButton();
      }

      // Initialize Prompt Queue feature (adds queue UI and button state machine)
      if (LovableAddons.getFeature && LovableAddons.getFeature('promptQueue')) {
        const promptQueue = LovableAddons.getFeature('promptQueue');
        if (typeof promptQueue.init === 'function') {
          promptQueue.init();
        }
      }
    } catch (error) {
      console.error('Error initializing Lovable Add-ons features:', error);
    }
  }

  /**
   * Sets up mutation observer to detect DOM changes
   * @returns {MutationObserver} The mutation observer instance
   */
  function setupMutationObserver() {
    // Disconnect existing observer if it exists
    if (window._lovableObserver) {
      window._lovableObserver.disconnect();
    }

    // Create new observer
    const observer = new MutationObserver((mutations) => {
      // Check if UI should be injected
      if (LovableAddons && LovableAddons.utils && LovableAddons.utils.dom &&
          typeof LovableAddons.utils.dom.shouldInjectUI === 'function' &&
          LovableAddons.utils.dom.shouldInjectUI()) {
        injectUIControls();
      }

      // Re-initialize features on significant DOM changes
      const significantChanges = mutations.some(mutation =>
        mutation.type === 'childList' &&
        (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0)
      );

      if (significantChanges) {
        initializeExtension();
      }
    });

    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false
    });

    // Store observer reference
    window._lovableObserver = observer;

    return observer;
  }

  /**
   * Sets up theme detection and observation
   * @returns {void}
   */
  function setupThemeDetection() {
    // Apply theme initially
    if (LovableAddons && LovableAddons.utils && LovableAddons.utils.dom &&
        typeof LovableAddons.utils.dom.applyTheme === 'function') {
      LovableAddons.utils.dom.applyTheme();
    }

    // Set up theme change detection
    const themeObserver = new MutationObserver(() => {
      if (LovableAddons && LovableAddons.utils && LovableAddons.utils.dom &&
          typeof LovableAddons.utils.dom.applyTheme === 'function') {
        LovableAddons.utils.dom.applyTheme();
      }
    });

    // Observe document and body for class and attribute changes
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme', 'style']
    });

    themeObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'data-theme', 'style']
    });

    // Store observer reference
    window._lovableThemeObserver = themeObserver;

    // Also listen for system theme changes
    if (window.matchMedia) {
      const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      colorSchemeQuery.addEventListener('change', () => {
        if (LovableAddons && LovableAddons.utils && LovableAddons.utils.dom &&
            typeof LovableAddons.utils.dom.applyTheme === 'function') {
          LovableAddons.utils.dom.applyTheme();
        }
      });
    }
  }

  /**
   * Prevents unwanted scrollbars on the page
   * @returns {void}
   */
  function preventScrollbars() {
    // Add a style element to prevent scrollbars
    const styleElement = document.createElement('style');
    styleElement.id = 'lovable-scrollbar-fix';
    styleElement.textContent = `
      body {
        overflow-x: hidden !important;
      }

      #root, main, .app-container, #__next, .flex.flex-col.min-h-screen, .flex.min-h-screen.flex-col {
        overflow-x: hidden !important;
        max-width: 100vw !important;
        box-sizing: border-box !important;
      }

      /* Ensure no element causes horizontal overflow */
      * {
        max-width: 100vw;
      }
    `;
    document.head.appendChild(styleElement);
  }

  /**
   * Main initialization function
   * @returns {void}
   */
  function main() {
    // Prevent scrollbars first
    preventScrollbars();

    // Initialize extension
    initializeExtension();

    // Set up mutation observer
    setupMutationObserver();

    // Set up theme detection
    setupThemeDetection();

    // Listen for navigation events
    window.addEventListener('popstate', initializeExtension);
    window.addEventListener('pushstate', initializeExtension);
    window.addEventListener('replacestate', initializeExtension);
  }

  // Run main function when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
  } else {
    main();
  }
})();
