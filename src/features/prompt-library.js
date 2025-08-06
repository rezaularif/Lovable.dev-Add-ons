/**
 * @fileoverview Prompt library feature for Lovable Add-ons Chrome extension.
 * This file provides functionality for saving and managing favorite prompts.
 */

(function() {
  'use strict';

  // Make sure LovableAddons namespace exists
  if (!window.LovableAddons) {
    console.error('LovableAddons namespace not found. Make sure namespace.js is loaded first.');
    return;
  }

  /**
   * Prompt library feature
   * @namespace LovableAddons.features.promptLibrary
   */
  const promptLibraryFeature = (function() {
    // Storage keys
    const STORAGE_KEYS = {
      FAVORITES: 'lovable_prompt_favorites',
      RECENT: 'lovable_prompt_recent',
      CUSTOM_PROMPTS: 'lovable_custom_prompts'
    };

    // Maximum number of recent templates to store
    const MAX_RECENT_TEMPLATES = 5;

    /**
     * Loads prompt templates from the config file
     * @returns {Promise<Array>} Array of prompt templates
     * @private
     */
    async function loadTemplates() {
      try {
        const url = chrome.runtime.getURL('config/promptTemplates.json');
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to load templates: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        return data.templates || [];
      } catch (error) {
        console.error('Error loading prompt templates:', error);
        LovableAddons.utils.toast.showToast('Error loading templates', 'error');
        return [];
      }
    }

    /**
     * Loads categories from the config file
     * @returns {Promise<Array>} Array of categories
     * @private
     */
    async function loadCategories() {
      try {
        const url = chrome.runtime.getURL('config/promptTemplates.json');
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to load categories: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        return data.categories || [];
      } catch (error) {
        console.error('Error loading categories:', error);
        return [];
      }
    }

    /**
     * Gets favorite templates from storage
     * @returns {Promise<Array>} Array of favorite template IDs
     * @private
     */
    async function getFavorites() {
      return new Promise(resolve => {
        chrome.storage.sync.get([STORAGE_KEYS.FAVORITES], result => {
          resolve(result[STORAGE_KEYS.FAVORITES] || []);
        });
      });
    }

    /**
     * Saves a template ID to favorites
     * @param {string} templateId - The ID of the template to save
     * @returns {Promise<void>}
     * @private
     */
    async function addToFavorites(templateId) {
      const favorites = await getFavorites();
      if (!favorites.includes(templateId)) {
        favorites.push(templateId);
        return new Promise(resolve => {
          chrome.storage.sync.set({ [STORAGE_KEYS.FAVORITES]: favorites }, resolve);
        });
      }
      return Promise.resolve();
    }

    /**
     * Removes a template ID from favorites
     * @param {string} templateId - The ID of the template to remove
     * @returns {Promise<void>}
     * @private
     */
    async function removeFromFavorites(templateId) {
      const favorites = await getFavorites();
      const updatedFavorites = favorites.filter(id => id !== templateId);
      return new Promise(resolve => {
        chrome.storage.sync.set({ [STORAGE_KEYS.FAVORITES]: updatedFavorites }, resolve);
      });
    }

    /**
     * Gets recently used templates from storage
     * @returns {Promise<Array>} Array of recent template IDs
     * @private
     */
    async function getRecentTemplates() {
      return new Promise(resolve => {
        chrome.storage.sync.get([STORAGE_KEYS.RECENT], result => {
          resolve(result[STORAGE_KEYS.RECENT] || []);
        });
      });
    }

    /**
     * Adds a template ID to recently used templates
     * @param {string} templateId - The ID of the template to add
     * @returns {Promise<void>}
     * @private
     */
    async function addToRecentTemplates(templateId) {
      const recentTemplates = await getRecentTemplates();

      // Remove the template if it already exists in the list
      const filteredTemplates = recentTemplates.filter(id => id !== templateId);

      // Add the template to the beginning of the list
      filteredTemplates.unshift(templateId);

      // Limit the list to MAX_RECENT_TEMPLATES
      const limitedTemplates = filteredTemplates.slice(0, MAX_RECENT_TEMPLATES);

      return new Promise(resolve => {
        chrome.storage.sync.set({ [STORAGE_KEYS.RECENT]: limitedTemplates }, resolve);
      });
    }

    /**
     * Gets custom prompts from storage
     * @returns {Promise<Array>} Array of custom prompts
     * @private
     */
    async function getCustomPrompts() {
      return new Promise(resolve => {
        chrome.storage.local.get([STORAGE_KEYS.CUSTOM_PROMPTS], result => {
          resolve(result[STORAGE_KEYS.CUSTOM_PROMPTS] || []);
        });
      });
    }

    /**
     * Adds a custom prompt to storage
     * @param {Object} prompt - The custom prompt to add
     * @returns {Promise<void>}
     * @private
     */
    async function addCustomPrompt(prompt) {
      const customPrompts = await getCustomPrompts();

      // Generate a unique ID for the custom prompt
      prompt.id = `custom-${Date.now()}`;
      prompt.isCustom = true;

      // Add the prompt to the list
      customPrompts.push(prompt);

      return new Promise(resolve => {
        chrome.storage.local.set({ [STORAGE_KEYS.CUSTOM_PROMPTS]: customPrompts }, resolve);
      });
    }

    /**
     * Removes a custom prompt from storage
     * @param {string} promptId - The ID of the custom prompt to remove
     * @returns {Promise<void>}
     * @private
     */
    async function removeCustomPrompt(promptId) {
      const customPrompts = await getCustomPrompts();
      const updatedPrompts = customPrompts.filter(prompt => prompt.id !== promptId);

      return new Promise(resolve => {
        chrome.storage.local.set({ [STORAGE_KEYS.CUSTOM_PROMPTS]: updatedPrompts }, resolve);
      });
    }

    /**
     * Updates a custom prompt in storage
     * @param {Object} updatedPrompt - The updated custom prompt
     * @returns {Promise<void>}
     * @private
     */
    async function updateCustomPrompt(updatedPrompt) {
      const customPrompts = await getCustomPrompts();
      const index = customPrompts.findIndex(prompt => prompt.id === updatedPrompt.id);

      if (index !== -1) {
        customPrompts[index] = updatedPrompt;
        return new Promise(resolve => {
          chrome.storage.local.set({ [STORAGE_KEYS.CUSTOM_PROMPTS]: customPrompts }, resolve);
        });
      }

      return Promise.resolve();
    }

    /**
     * Helper function to re-attach event listeners
     * @param {HTMLElement} popupForm - The popup form element
     * @param {Array} templates - The templates array
     * @param {Array} customPrompts - The custom prompts array
     * @param {Object} self - The this context
     * @returns {void}
     * @private
     */
    function reattachEventListeners(popupForm, templates, customPrompts, self) {
      // Re-attach event listeners for category filtering
      const categoryButtons = document.querySelectorAll('.category-filter-btn');
      categoryButtons.forEach(button => {
        button.addEventListener('click', function() {
          // Remove active class from all buttons
          categoryButtons.forEach(btn => {
            btn.classList.remove('active');
            btn.style.background = 'transparent';
            btn.style.color = 'var(--lovable-text-primary, #fff)';
            btn.style.borderColor = 'var(--lovable-border-color, #3F3F46)';
          });

          // Add active class to clicked button
          button.classList.add('active');
          button.style.background = 'var(--lovable-button-secondary, #3F3F46)';
          button.style.color = 'var(--lovable-text-primary, #fff)';

          // Render templates with selected category
          const searchInput = document.querySelector('input[type="text"][placeholder="Search templates..."]');
          const searchValue = searchInput ? searchInput.value : '';
          const templatesList = document.querySelector('.prompt-templates-list');

          // Get favorites and recent templates
          getFavorites().then(favs => {
            getRecentTemplates().then(recent => {
              self.renderTemplates(
                templatesList,
                [...templates, ...customPrompts],
                favs,
                recent,
                customPrompts,
                searchValue,
                button.dataset.category
              );
            });
          });
        });
      });

      // Re-attach event listener for search input
      const searchInput = document.querySelector('input[type="text"][placeholder="Search templates..."]');
      if (searchInput) {
        searchInput.addEventListener('input', function() {
          const activeCategoryBtn = document.querySelector('.category-filter-btn.active');
          const activeCategory = activeCategoryBtn ? activeCategoryBtn.dataset.category : 'all';
          const templatesList = document.querySelector('.prompt-templates-list');

          // Get favorites and recent templates
          getFavorites().then(favs => {
            getRecentTemplates().then(recent => {
              self.renderTemplates(
                templatesList,
                [...templates, ...customPrompts],
                favs,
                recent,
                customPrompts,
                searchInput.value,
                activeCategory
              );
            });
          });
        });
      }
    }

    // Public API
    return {
      /**
       * Adds a Prompt Library button to the navigation bar
       * @returns {void}
       */
      addButton: function() {
        // Check if our button already exists globally
        if (document.getElementById('lovable-addon-prompt-library')) return;

        // Find the target container with the specified class
        const targetContainer = document.querySelector('div.ml-auto.flex.w-full.justify-end.md\\:ml-0');
        if (!targetContainer) return;

        // Get or create the right-side container for our buttons
        let buttonContainer = targetContainer.querySelector('.lovable-addon-buttons');
        if (!buttonContainer) {
          // Create a container for our addon buttons if it doesn't exist
          buttonContainer = document.createElement('div');
          buttonContainer.className = 'lovable-addon-buttons flex gap-2 items-center ml-auto';
          targetContainer.appendChild(buttonContainer);
        }

        // Create Prompt Library button
        const promptLibraryButton = document.createElement('button');
        promptLibraryButton.id = 'lovable-addon-prompt-library';
        promptLibraryButton.className = 'whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none flex items-center justify-center h-fit focus-visible:ring-0 prompt-library-button lovable-tooltip';
        promptLibraryButton.style.border = 'none';
        promptLibraryButton.style.borderRadius = '6px';
        promptLibraryButton.style.gap = '6px';
        promptLibraryButton.style.padding = '6px';
        promptLibraryButton.style.background = 'var(--lovable-button-bg-light, #272725)';
        promptLibraryButton.style.zIndex = '10'; // Ensure button is above other elements
        promptLibraryButton.style.position = 'relative'; // Enable z-index
        promptLibraryButton.setAttribute('data-tooltip', 'Save and manage your favorite prompts');

        // Add hover styles for the button
        if (!document.querySelector('#prompt-library-button-style')) {
          const style = document.createElement('style');
          style.id = 'prompt-library-button-style';
          style.textContent = `
              .prompt-library-button:hover {
                  background-color: var(--lovable-button-tertiary-hover, #5F5F5E) !important;
              }
          `;
          document.head.appendChild(style);
        }

        promptLibraryButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18"><title>wand-sparkle</title><g fill="currentColor"><rect x="1.168" y="7.414" width="15.653" height="3.182" rx="1" ry="1" transform="translate(-3.733 8.998) rotate(-45)" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></rect><line x1="10.387" y1="5.363" x2="12.637" y2="7.613" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></line><path d="M7.243,3.492l-.946-.315-.316-.947c-.102-.306-.609-.306-.711,0l-.316,.947-.946,.315c-.153,.051-.257,.194-.257,.356s.104,.305,.257,.356l.946,.315,.316,.947c.051,.153,.194,.256,.355,.256s.305-.104,.355-.256l.316-.947,.946-.315c.153-.051,.257-.194,.257-.356s-.104-.305-.257-.356Z" fill="currentColor" data-stroke="none" stroke="none"></path><path d="M16.658,11.99l-1.263-.421-.421-1.263c-.137-.408-.812-.408-.949,0l-.421,1.263-1.263,.421c-.204,.068-.342,.259-.342,.474s.138,.406,.342,.474l1.263,.421,.421,1.263c.068,.204,.26,.342,.475,.342s.406-.138,.475-.342l.421-1.263,1.263-.421c.204-.068,.342-.259,.342-.474s-.138-.406-.342-.474Z" fill="currentColor" data-stroke="none" stroke="none"></path><circle cx="9.25" cy="1.75" r=".75" fill="currentColor" data-stroke="none" stroke="none"></circle></g></svg>
        `;
        // Remove title attribute to prevent double tooltips
        // promptLibraryButton.title = 'Save and manage your favorite prompts';

        // Add click handler for Prompt Library
        promptLibraryButton.addEventListener('click', () => {
          this.showPopup();
        });

        // Add button to container
        // Place before SEO button if it exists
        const seoButton = buttonContainer.querySelector('#lovable-addon-seo-button');
        if (seoButton) {
          buttonContainer.insertBefore(promptLibraryButton, seoButton);
        } else {
          buttonContainer.appendChild(promptLibraryButton);
        }
      },

      /**
       * Shows the Prompt Library popup
       * @returns {void}
       */
      showPopup: async function() {
        // Create popup container
        const popupContainer = document.createElement('div');
        popupContainer.className = 'prompt-library-popup-overlay';
        popupContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            transition: all 0.2s ease-in-out;
            box-sizing: border-box;
            overflow: hidden;
            margin: 0;
            padding: 0;
        `;

        // Add class to body to prevent scrolling
        document.body.classList.add('lovable-popup-active');

        // Ensure no scrollbars on the page
        const styleElement = document.createElement('style');
        styleElement.id = 'prompt-library-scrollbar-fix';
        styleElement.textContent = `
          body.lovable-popup-active {
            overflow: hidden !important;
            padding-right: 0 !important;
            margin-right: 0 !important;
          }

          .prompt-library-popup-overlay {
            overflow: hidden !important;
          }
        `;
        document.head.appendChild(styleElement);

        // Create popup form
        const popupForm = document.createElement('div');
        popupForm.className = 'prompt-library-popup-form';

        // Apply theme to popup
        if (LovableAddons.utils && LovableAddons.utils.dom &&
            typeof LovableAddons.utils.dom.prepareThemedPopup === 'function') {
          LovableAddons.utils.dom.prepareThemedPopup(popupForm);
        }

        popupForm.style.cssText = `
            padding: 16px;
            border-radius: var(--lovable-popup-border-radius, 12px);
            min-width: 500px;
            max-width: 700px;
            max-height: 80vh;
            overflow-y: auto;
            overflow-x: hidden;
            border: none;
            display: flex;
            flex-direction: column;
            box-sizing: border-box;
        `;

        // Load templates and categories
        const templates = await loadTemplates();
        const categories = await loadCategories();
        const favorites = await getFavorites();
        const recentTemplates = await getRecentTemplates();
        const customPrompts = await getCustomPrompts();

        if (templates.length === 0) {
          LovableAddons.utils.toast.showToast('No templates found', 'warning');
          return;
        }

        // Create header
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 1px solid #3F3F46;
        `;

        const title = document.createElement('h2');
        title.textContent = 'Prompt Library';
        title.style.cssText = `
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            color: var(--lovable-text-primary, #fff);
        `;

        header.appendChild(title);
        popupForm.appendChild(header);

        // Create search and filter section
        const searchContainer = document.createElement('div');
        searchContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-bottom: 16px;
        `;

        // Search input
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Search templates...';
        searchInput.style.cssText = `
            padding: 8px 12px;
            border-radius: 6px;
            border: 1px solid var(--lovable-border-color, #3F3F46);
            background: var(--lovable-highlight-color, #27272A);
            color: var(--lovable-text-primary, #fff);
            font-size: 14px;
            width: 100%;
        `;

        // Category filter
        const categoryFilter = document.createElement('div');
        categoryFilter.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 8px;
        `;

        // Add 'All' category
        const allCategoryBtn = document.createElement('button');
        allCategoryBtn.textContent = 'All';
        allCategoryBtn.dataset.category = 'all';
        allCategoryBtn.className = 'category-filter-btn active';
        allCategoryBtn.style.cssText = `
            padding: 4px 10px;
            border-radius: 4px;
            border: 1px solid var(--lovable-border-color, #3F3F46);
            background: var(--lovable-button-secondary, #3F3F46);
            color: var(--lovable-text-primary, #fff);
            font-size: 12px;
            cursor: pointer;
        `;

        categoryFilter.appendChild(allCategoryBtn);

        // Add 'Favorites' category
        const favoritesCategoryBtn = document.createElement('button');
        favoritesCategoryBtn.textContent = 'Favorites';
        favoritesCategoryBtn.dataset.category = 'favorites';
        favoritesCategoryBtn.className = 'category-filter-btn';
        favoritesCategoryBtn.style.cssText = `
            padding: 4px 10px;
            border-radius: 4px;
            border: 1px solid var(--lovable-border-color, #3F3F46);
            background: transparent;
            color: var(--lovable-text-primary, #fff);
            font-size: 12px;
            cursor: pointer;
        `;

        categoryFilter.appendChild(favoritesCategoryBtn);

        // Add 'Recent' category
        const recentCategoryBtn = document.createElement('button');
        recentCategoryBtn.textContent = 'Recent';
        recentCategoryBtn.dataset.category = 'recent';
        recentCategoryBtn.className = 'category-filter-btn';
        recentCategoryBtn.style.cssText = `
            padding: 4px 10px;
            border-radius: 4px;
            border: 1px solid var(--lovable-border-color, #3F3F46);
            background: transparent;
            color: var(--lovable-text-primary, #fff);
            font-size: 12px;
            cursor: pointer;
        `;

        categoryFilter.appendChild(recentCategoryBtn);

        // Add 'Custom Prompts' category
        const customCategoryBtn = document.createElement('button');
        customCategoryBtn.textContent = 'Custom Prompts';
        customCategoryBtn.dataset.category = 'custom';
        customCategoryBtn.className = 'category-filter-btn';
        customCategoryBtn.style.cssText = `
            padding: 4px 10px;
            border-radius: 4px;
            border: 1px solid var(--lovable-border-color, #3F3F46);
            background: transparent;
            color: var(--lovable-text-primary, #fff);
            font-size: 12px;
            cursor: pointer;
        `;

        categoryFilter.appendChild(customCategoryBtn);

        // Add other categories
        categories.forEach(category => {
          const categoryBtn = document.createElement('button');
          categoryBtn.textContent = category;
          categoryBtn.dataset.category = category;
          categoryBtn.className = 'category-filter-btn';
          categoryBtn.style.cssText = `
              padding: 4px 10px;
              border-radius: 4px;
              border: 1px solid var(--lovable-border-color, #3F3F46);
              background: transparent;
              color: var(--lovable-text-primary, #fff);
              font-size: 12px;
              cursor: pointer;
          `;

          categoryFilter.appendChild(categoryBtn);
        });

        searchContainer.appendChild(searchInput);
        searchContainer.appendChild(categoryFilter);
        popupForm.appendChild(searchContainer);

        // Create templates list
        const templatesList = document.createElement('div');
        templatesList.className = 'prompt-templates-list';
        templatesList.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-bottom: 16px;
            flex-grow: 1;
            overflow-y: auto;
            max-height: 400px;
            padding-right: 8px;
        `;

        // Initial render of all templates
        this.renderTemplates(templatesList, [...templates, ...customPrompts], favorites, recentTemplates, customPrompts);

        // Add event listener for search input
        searchInput.addEventListener('input', () => {
          const activeCategoryBtn = document.querySelector('.category-filter-btn.active');
          const activeCategory = activeCategoryBtn ? activeCategoryBtn.dataset.category : 'all';
          this.renderTemplates(templatesList, [...templates, ...customPrompts], favorites, recentTemplates, customPrompts, searchInput.value, activeCategory);
        });

        popupForm.appendChild(templatesList);

        // Create footer with buttons
        const footer = document.createElement('div');
        footer.style.cssText = `
            display: flex;
            justify-content: space-between;
            gap: 8px;
            margin-top: auto;
            padding-top: 16px;
            border-top: 1px solid #3F3F46;
        `;

        // Create Custom Prompt button
        const createPromptButton = document.createElement('button');
        createPromptButton.textContent = 'Create Custom Prompt';
        createPromptButton.style.cssText = `
            padding: 6px 12px;
            border-radius: 6px;
            border: 1px solid var(--lovable-border-color, #3F3F46);
            background: var(--lovable-button-secondary, #272725);
            color: var(--lovable-text-primary, #fff);
            cursor: pointer;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 6px;
        `;

        // Add plus icon
        createPromptButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Create Custom Prompt
        `;

        createPromptButton.addEventListener('click', () => {
          // Hide the templates list and show the custom prompt form
          this.showCustomPromptForm(popupForm, popupContainer, templates, customPrompts);
        });

        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.style.cssText = `
            padding: 6px 12px;
            border-radius: 6px;
            border: 1px solid var(--lovable-border-color, #3F3F46);
            background: transparent;
            color: var(--lovable-text-primary, #fff);
            cursor: pointer;
            font-size: 14px;
        `;

        cancelButton.addEventListener('click', () => {
          document.body.removeChild(popupContainer);
          // Remove the class that prevents scrolling
          document.body.classList.remove('lovable-popup-active');
          // Remove the style element
          const styleElement = document.getElementById('prompt-library-scrollbar-fix');
          if (styleElement) {
            styleElement.remove();
          }
        });

        footer.appendChild(createPromptButton);
        footer.appendChild(cancelButton);
        popupForm.appendChild(footer);

        // Add hover styles for buttons inside the popup
        const popupButtonsStyle = document.createElement('style');
        popupButtonsStyle.textContent = `
            .prompt-library-popup-form button:hover:not(.active) {
                background-color: var(--lovable-button-secondary-hover, #2167DB) !important;
            }
            .category-filter-btn:hover:not(.active) {
                background-color: var(--lovable-button-secondary-hover, #2167DB) !important;
            }
            .delete-btn:hover, .favorite-btn:hover, .edit-btn:hover {
                color: var(--lovable-button-secondary-hover, #2167DB) !important;
                transform: scale(1.1) !important;
                transition: color 0.2s ease-in-out, transform 0.2s ease-in-out !important;
            }
            
            .delete-btn:active, .favorite-btn:active, .edit-btn:active {
                transform: scale(0.95) !important;
            }

            /* Light theme specific styles for category filter buttons */
            [data-lovable-theme="light"] .category-filter-btn {
                color: var(--lovable-text-primary, rgba(0, 0, 0, 0.9)) !important;
                border-color: var(--lovable-border-color, rgba(0, 0, 0, 0.15)) !important;
            }

            [data-lovable-theme="light"] .category-filter-btn.active {
                background-color: var(--lovable-button-secondary, #EBEBEB) !important;
                color: var(--lovable-text-primary, rgba(0, 0, 0, 0.9)) !important;
            }

            [data-lovable-theme="light"] .category-filter-btn:hover:not(.active) {
                background-color: var(--lovable-button-secondary-hover, #C6E4FF) !important;
            }

            /* Override inline styles for active category buttons */
            .category-filter-btn.active {
                background-color: var(--lovable-button-secondary, #3F3F46) !important;
            }
        `;
        document.head.appendChild(popupButtonsStyle);

        // Add popup to DOM
        popupContainer.appendChild(popupForm);
        document.body.appendChild(popupContainer);

        // Apply theme to popup
        if (LovableAddons.utils && LovableAddons.utils.dom &&
            typeof LovableAddons.utils.dom.applyThemeToPopups === 'function') {
          LovableAddons.utils.dom.applyThemeToPopups();
        }

        // Now that buttons are in the DOM, add event listeners for category filtering
        const categoryButtons = document.querySelectorAll('.category-filter-btn');
        categoryButtons.forEach(button => {
          button.addEventListener('click', () => {
            // Remove active class from all buttons
            categoryButtons.forEach(btn => {
              btn.classList.remove('active');
              btn.style.background = 'transparent';
              // Ensure text color is properly set for inactive buttons
              btn.style.color = 'var(--lovable-text-primary, #fff)';
              // Ensure border color is properly set for inactive buttons
              btn.style.borderColor = 'var(--lovable-border-color, #3F3F46)';
            });

            // Add active class to clicked button
            button.classList.add('active');
            button.style.background = 'var(--lovable-button-secondary, #3F3F46)';
            button.style.color = 'var(--lovable-text-primary, #fff)';

            // Render templates with selected category
            this.renderTemplates(templatesList, [...templates, ...customPrompts], favorites, recentTemplates, customPrompts, searchInput.value, button.dataset.category);
          });
        });

        // Close on escape key
        document.addEventListener('keydown', function escHandler(e) {
          if (e.key === 'Escape') {
            document.body.removeChild(popupContainer);
            document.removeEventListener('keydown', escHandler);
            // Remove the class that prevents scrolling
            document.body.classList.remove('lovable-popup-active');
            // Remove the style element
            const styleElement = document.getElementById('prompt-library-scrollbar-fix');
            if (styleElement) {
              styleElement.remove();
            }
          }
        });

        // Close on outside click
        popupContainer.addEventListener('click', (e) => {
          if (e.target === popupContainer) {
            document.body.removeChild(popupContainer);
            // Remove the class that prevents scrolling
            document.body.classList.remove('lovable-popup-active');
            // Remove the style element
            const styleElement = document.getElementById('prompt-library-scrollbar-fix');
            if (styleElement) {
              styleElement.remove();
            }
          }
        });
      },

      /**
       * Renders templates based on filters
       * @param {HTMLElement} templatesList - The templates list element
       * @param {Array} templatesArray - The templates array
       * @param {Array} favorites - The favorites array
       * @param {Array} recentTemplates - The recent templates array
       * @param {Array} customPrompts - The custom prompts array
       * @param {string} searchTerm - The search term
       * @param {string} categoryFilter - The category filter
       * @returns {void}
       */
      renderTemplates: function(templatesList, templatesArray, favorites, recentTemplates, customPrompts, searchTerm = '', categoryFilter = 'all') {
        // Clear existing templates
        templatesList.innerHTML = '';

        // Filter templates based on search term and category
        let filteredTemplates = templatesArray;

        // Filter by category
        if (categoryFilter === 'favorites') {
          filteredTemplates = templatesArray.filter(template => favorites.includes(template.id));
        } else if (categoryFilter === 'recent') {
          filteredTemplates = recentTemplates
            .map(id => templatesArray.find(template => template.id === id))
            .filter(Boolean); // Remove undefined entries
        } else if (categoryFilter === 'custom') {
          filteredTemplates = customPrompts;
        } else if (categoryFilter !== 'all') {
          filteredTemplates = templatesArray.filter(template => template.category === categoryFilter);
        }

        // Filter by search term
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          filteredTemplates = filteredTemplates.filter(template =>
            template.name.toLowerCase().includes(term) ||
            template.content.toLowerCase().includes(term)
          );
        }

        // Show message if no templates match filters
        if (filteredTemplates.length === 0) {
          const noResults = document.createElement('div');
          noResults.textContent = 'No templates match your filters';
          noResults.style.cssText = `
              text-align: center;
              padding: 20px;
              color: var(--lovable-text-secondary, #A1A1AA);
          `;
          templatesList.appendChild(noResults);
          return;
        }

        // Render filtered templates
        filteredTemplates.forEach((template) => {
          const templateItem = document.createElement('div');
          templateItem.className = 'prompt-template-item';
          templateItem.style.cssText = `
              padding: 12px;
              border-radius: 6px;
              border: 1px solid var(--lovable-border-color, #3F3F46);
              cursor: pointer;
              transition: background-color 0.2s;
              position: relative;
          `;

          // Add hover effect
          templateItem.addEventListener('mouseover', () => {
            templateItem.style.backgroundColor = 'var(--lovable-highlight-color, #27272A)';
          });

          templateItem.addEventListener('mouseout', () => {
            templateItem.style.backgroundColor = 'transparent';
          });

          // Template header with name and favorite button
          const templateHeader = document.createElement('div');
          templateHeader.style.cssText = `
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 4px;
          `;

          const templateName = document.createElement('div');
          templateName.className = 'prompt-template-name';
          templateName.textContent = template.name;
          templateName.style.cssText = `
              font-weight: 500;
              color: var(--lovable-text-primary, #fff);
          `;

          // Category badge
          const categoryBadge = document.createElement('span');
          categoryBadge.textContent = template.category;
          categoryBadge.style.cssText = `
              font-size: 11px;
              padding: 2px 6px;
              border-radius: 4px;
              background: var(--lovable-button-secondary, #3F3F46);
              color: var(--lovable-text-primary, #fff);
              margin-left: 8px;
          `;
          templateName.appendChild(categoryBadge);

          // Actions container
          const actionsContainer = document.createElement('div');
          actionsContainer.style.cssText = `
              display: flex;
              align-items: center;
              gap: 8px;
          `;

          // Edit button for custom prompts
          if (template.isCustom) {
            const editBtn = document.createElement('button');
            editBtn.className = 'edit-btn';
            editBtn.style.cssText = `
                background: transparent;
                border: none;
                color: var(--lovable-text-secondary, #A1A1AA);
                cursor: pointer;
                font-size: 16px;
                padding: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: color 0.2s ease-in-out, background-color 0.2s ease-in-out;
            `;
            editBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
            `;
            editBtn.title = 'Edit custom prompt';

            // Add click handler for edit button
            const self = this;
            editBtn.addEventListener('click', async (e) => {
              e.stopPropagation(); // Prevent template from being applied

              // Always fetch the freshest custom prompts so we edit latest version
              const latestCustomPrompts = await getCustomPrompts();
              
              // Also fetch the latest templates
              const latestTemplates = await loadTemplates();

              // Ensure we edit the most up-to-date object instance by ID
              const latestTemplate = latestCustomPrompts.find(p => p.id === template.id) || template;

              // Resolve popup form and container from DOM
              const resolvedPopupForm = editBtn.closest('.prompt-library-popup-form');
              const popupContainer = editBtn.closest('.prompt-library-popup-overlay');

              if (!resolvedPopupForm || !popupContainer) {
                console.error('Prompt Library: popup elements not found for edit action');
                LovableAddons.utils.toast.showToast('Unable to open editor. Please try reopening the Prompt Library.', 'error');
                return;
              }

              // Show the edit custom prompt form with the latest data
              self.showEditCustomPromptForm(resolvedPopupForm, popupContainer, latestTemplate, latestTemplates, latestCustomPrompts);
            });

            actionsContainer.appendChild(editBtn);
          }

          // Delete button for custom prompts
          if (template.isCustom) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.style.cssText = `
                background: transparent;
                border: none;
                color: var(--lovable-text-secondary, #A1A1AA);
                cursor: pointer;
                font-size: 16px;
                padding: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: color 0.2s ease-in-out, background-color 0.2s ease-in-out;
            `;
            deleteBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            `;
            deleteBtn.title = 'Delete custom prompt';

            // Add click handler for delete button
            deleteBtn.addEventListener('click', async (e) => {
              e.stopPropagation(); // Prevent template from being applied

              if (confirm(`Are you sure you want to delete the custom prompt "${template.name}"?`)) {
                try {
                  await removeCustomPrompt(template.id);

                  // Get the updated list of custom prompts
                  const updatedCustomPrompts = await getCustomPrompts();

                  // Show success message
                  LovableAddons.utils.toast.showToast(`Deleted custom prompt: ${template.name}`, 'success');

                  // Re-render the templates with the updated custom prompts list
                  const searchInput = document.querySelector('input[type="text"][placeholder="Search templates..."]');
                  const searchValue = searchInput ? searchInput.value : '';
                  const activeCategoryBtn = document.querySelector('.category-filter-btn.active');
                  const categoryFilter = activeCategoryBtn ? activeCategoryBtn.dataset.category : 'all';

                  // Get current favorites and recent templates
                  const currentFavorites = await getFavorites();
                  const currentRecentTemplates = await getRecentTemplates();

                  // Re-render templates with updated data
                  this.renderTemplates(
                    templatesList,
                    templatesArray,
                    currentFavorites,
                    currentRecentTemplates,
                    updatedCustomPrompts,
                    searchValue,
                    categoryFilter
                  );
                } catch (error) {
                  console.error('Error deleting custom prompt:', error);
                  LovableAddons.utils.toast.showToast('Error deleting custom prompt', 'error');
                }
              }
            });

            actionsContainer.appendChild(deleteBtn);
          }

          // Favorite button
          const favoriteBtn = document.createElement('button');
          favoriteBtn.className = 'favorite-btn';
          favoriteBtn.style.cssText = `
              background: transparent;
              border: none;
              color: ${favorites.includes(template.id) ? '#FFD700' : 'var(--lovable-text-secondary, #A1A1AA)'};
              cursor: pointer;
              font-size: 16px;
              padding: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: color 0.2s ease-in-out, background-color 0.2s ease-in-out;
          `;
          favoriteBtn.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="${favorites.includes(template.id) ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
          `;
          favoriteBtn.title = favorites.includes(template.id) ? 'Remove from favorites' : 'Add to favorites';

          // Add click handler for favorite button
          const self = this;
          favoriteBtn.addEventListener('click', async function(e) {
            e.stopPropagation(); // Prevent template from being applied

            if (favorites.includes(template.id)) {
              await removeFromFavorites(template.id);
              favoriteBtn.style.color = 'var(--lovable-text-secondary, #A1A1AA)';
              favoriteBtn.innerHTML = `
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
              `;
              favoriteBtn.title = 'Add to favorites';
              LovableAddons.utils.toast.showToast(`Removed "${template.name}" from favorites`, 'info');
            } else {
              await addToFavorites(template.id);
              favoriteBtn.style.color = '#FFD700';
              favoriteBtn.innerHTML = `
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
              `;
              favoriteBtn.title = 'Remove from favorites';
              LovableAddons.utils.toast.showToast(`Added "${template.name}" to favorites`, 'success');
            }

            // Update favorites list
            const updatedFavorites = await getFavorites();
            // If we're in favorites view, re-render the templates
            const activeCategoryBtn = document.querySelector('.category-filter-btn.active');
            if (activeCategoryBtn && activeCategoryBtn.dataset.category === 'favorites') {
              self.renderTemplates(templatesList, templatesArray, updatedFavorites, recentTemplates, customPrompts, searchTerm, 'favorites');
            }
          });

          actionsContainer.appendChild(favoriteBtn);
          templateHeader.appendChild(templateName);
          templateHeader.appendChild(actionsContainer);

          const templatePreview = document.createElement('div');
          templatePreview.className = 'prompt-template-preview';
          templatePreview.textContent = template.content.length > 100
            ? template.content.substring(0, 100) + '...'
            : template.content;
          templatePreview.style.cssText = `
              font-size: 13px;
              color: var(--lovable-text-secondary, #A1A1AA);
              white-space: pre-wrap;
          `;

          templateItem.appendChild(templateHeader);
          templateItem.appendChild(templatePreview);

          // Add click handler to apply template
          const that = this;
          templateItem.addEventListener('click', function() {
            that.applyTemplate(template);
            document.body.removeChild(document.querySelector('.prompt-library-popup-overlay'));
            // Remove the class that prevents scrolling
            document.body.classList.remove('lovable-popup-active');
            // Remove the style element
            const styleElement = document.getElementById('prompt-library-scrollbar-fix');
            if (styleElement) {
              styleElement.remove();
            }
          });

          templatesList.appendChild(templateItem);
        });
      },

      /**
       * Shows the custom prompt form
       * @param {HTMLElement} popupForm - The popup form element
       * @param {HTMLElement} popupContainer - The popup container element
       * @param {Array} templates - The templates array
       * @param {Array} customPrompts - The custom prompts array
       * @returns {void}
       * @private
       */
      showCustomPromptForm: function(popupForm, popupContainer, templates, customPrompts) {
        // Save the original content to restore later if needed
        const originalContent = popupForm.innerHTML;

        // Clear the popup form
        popupForm.innerHTML = '';

        // Create header
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 1px solid #3F3F46;
        `;

        const title = document.createElement('h2');
        title.textContent = 'Create Custom Prompt';
        title.style.cssText = `
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            color: var(--lovable-text-primary, #fff);
        `;

        // Back button
        const backButton = document.createElement('button');
        backButton.className = 'prompt-library-back-btn';
        backButton.style.cssText = `
            background: transparent;
            border: none;
            color: var(--lovable-text-primary, #fff);
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 14px;
            padding: 4px 8px;
            border-radius: 4px;
        `;
        backButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Back
        `;

        const self = this;
        backButton.addEventListener('click', function() {
          // Restore the original content
          popupForm.innerHTML = originalContent;

          // Re-attach event listeners using helper function
          reattachEventListeners(popupForm, templates, customPrompts, self);
        });

        header.appendChild(backButton);
        header.appendChild(title);
        popupForm.appendChild(header);

        // Create form
        const form = document.createElement('form');
        form.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 16px;
        `;

        // Prompt name input
        const nameGroup = document.createElement('div');
        nameGroup.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 4px;
        `;

        const nameLabel = document.createElement('label');
        nameLabel.textContent = 'Prompt Name';
        nameLabel.style.cssText = `
            font-size: 14px;
            font-weight: 500;
            color: #fff;
        `;

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.placeholder = 'Enter a name for your prompt';
        nameInput.required = true;
        nameInput.style.cssText = `
            padding: 8px 12px;
            border-radius: 6px;
            border: 1px solid #3F3F46;
            background: #27272A;
            color: #fff;
            font-size: 14px;
        `;

        nameGroup.appendChild(nameLabel);
        nameGroup.appendChild(nameInput);

        // Category input
        const categoryGroup = document.createElement('div');
        categoryGroup.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 4px;
        `;

        const categoryLabel = document.createElement('label');
        categoryLabel.textContent = 'Category';
        categoryLabel.style.cssText = `
            font-size: 14px;
            font-weight: 500;
            color: #fff;
        `;

        const categoryInput = document.createElement('input');
        categoryInput.type = 'text';
        categoryInput.placeholder = 'Enter a category (e.g., Coding, Writing, etc.)';
        categoryInput.required = true;
        categoryInput.style.cssText = `
            padding: 8px 12px;
            border-radius: 6px;
            border: 1px solid #3F3F46;
            background: #27272A;
            color: #fff;
            font-size: 14px;
        `;

        categoryGroup.appendChild(categoryLabel);
        categoryGroup.appendChild(categoryInput);

        // Prompt content textarea
        const contentGroup = document.createElement('div');
        contentGroup.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 4px;
        `;

        const contentLabel = document.createElement('label');
        contentLabel.textContent = 'Prompt Content';
        contentLabel.style.cssText = `
            font-size: 14px;
            font-weight: 500;
            color: #fff;
        `;

        const contentTextarea = document.createElement('textarea');
        contentTextarea.placeholder = 'Enter your prompt content';
        contentTextarea.required = true;
        contentTextarea.rows = 8;
        contentTextarea.style.cssText = `
            padding: 8px 12px;
            border-radius: 6px;
            border: 1px solid #3F3F46;
            background: #27272A;
            color: #fff;
            font-size: 14px;
            resize: vertical;
            font-family: inherit;
        `;

        contentGroup.appendChild(contentLabel);
        contentGroup.appendChild(contentTextarea);

        // Form buttons
        const formButtons = document.createElement('div');
        formButtons.style.cssText = `
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            margin-top: 16px;
        `;

        const cancelFormButton = document.createElement('button');
        cancelFormButton.type = 'button';
        cancelFormButton.textContent = 'Cancel';
        cancelFormButton.className = 'prompt-library-form-btn';
        cancelFormButton.style.cssText = `
            padding: 6px 12px;
            border-radius: 6px;
            border: 1px solid #3F3F46;
            background: transparent;
            color: #fff;
            cursor: pointer;
            font-size: 14px;
        `;

        cancelFormButton.addEventListener('click', function() {
          // Restore the original content
          popupForm.innerHTML = originalContent;

          // Re-attach event listeners using helper function
          reattachEventListeners(popupForm, templates, customPrompts, self);
        });

        const saveButton = document.createElement('button');
        saveButton.type = 'submit';
        saveButton.textContent = 'Save Prompt';
        saveButton.className = 'prompt-library-form-btn';
        saveButton.style.cssText = `
            padding: 6px 12px;
            border-radius: 6px;
            border: 1px solid #3F3F46;
            background: #272725;
            color: #fff;
            cursor: pointer;
            font-size: 14px;
        `;

        formButtons.appendChild(cancelFormButton);
        formButtons.appendChild(saveButton);

        // Add form elements
        form.appendChild(nameGroup);
        form.appendChild(categoryGroup);
        form.appendChild(contentGroup);
        form.appendChild(formButtons);

        // Add form submission handler
        form.addEventListener('submit', async (e) => {
          e.preventDefault();

          // Get form values
          const name = nameInput.value.trim();
          const category = categoryInput.value.trim();
          const content = contentTextarea.value.trim();

          // Validate form
          if (!name || !category || !content) {
            LovableAddons.utils.toast.showToast('Please fill in all fields', 'error');
            return;
          }

          // Create custom prompt object
          const customPrompt = {
            name,
            category,
            content
          };

          try {
            // Add custom prompt to storage
            await addCustomPrompt(customPrompt);

            // Show success message
            LovableAddons.utils.toast.showToast('Custom prompt saved successfully', 'success');

            // Restore the original content (return to main view)
            popupForm.innerHTML = originalContent;

            // Get the updated list of custom prompts
            const updatedCustomPrompts = await getCustomPrompts();

            // Re-attach event listeners using helper function
            reattachEventListeners(popupForm, templates, updatedCustomPrompts, self);

            // Force re-render to reflect the new item immediately in any category
            const templatesList = document.querySelector('.prompt-templates-list');
            const favoritesNow = await getFavorites();
            const recentNow = await getRecentTemplates();
            const searchInputNow = document.querySelector('input[type="text"][placeholder="Search templates..."]');
            const activeCategoryBtnNow = document.querySelector('.category-filter-btn.active');
            const activeCategoryNow = activeCategoryBtnNow ? activeCategoryBtnNow.dataset.category : 'all';
            this.renderTemplates(
              templatesList,
              [...templates, ...updatedCustomPrompts],
              favoritesNow,
              recentNow,
              updatedCustomPrompts,
              searchInputNow ? searchInputNow.value : '',
              activeCategoryNow
            );

            // Select the 'Custom Prompts' category to show the newly added prompt
            const customPromptsButton = document.querySelector('.category-filter-btn[data-category="custom"]');
            if (customPromptsButton) {
              customPromptsButton.click();
            }
          } catch (error) {
            console.error('Error saving custom prompt:', error);
            LovableAddons.utils.toast.showToast('Error saving custom prompt', 'error');
          }
        });

        popupForm.appendChild(form);
      },

      /**
       * Shows the edit custom prompt form
       * @param {HTMLElement} popupForm - The popup form element
       * @param {HTMLElement} popupContainer - The popup container element
       * @param {Object} template - The template to edit
       * @param {Array} templates - The templates array
       * @param {Array} customPrompts - The custom prompts array
       * @returns {void}
       * @private
       */
      showEditCustomPromptForm: function(popupForm, popupContainer, template, templates, customPrompts) {
        // Make sure we have valid elements
        if (!popupForm || !popupContainer) {
          console.error('Invalid popup elements provided to showEditCustomPromptForm');
          LovableAddons.utils.toast.showToast('Unable to open editor', 'error');
          return;
        }
        
        // Save the original content to restore later if needed
        const originalContent = popupForm.innerHTML;

        // Clear the popup form
        popupForm.innerHTML = '';

        // Create header
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 1px solid #3F3F46;
        `;

        const title = document.createElement('h2');
        title.textContent = 'Edit Custom Prompt';
        title.style.cssText = `
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            color: var(--lovable-text-primary, #fff);
        `;

        // Back button
        const backButton = document.createElement('button');
        backButton.className = 'prompt-library-back-btn';
        backButton.style.cssText = `
            background: transparent;
            border: none;
            color: var(--lovable-text-primary, #fff);
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 14px;
            padding: 4px 8px;
            border-radius: 4px;
        `;
        backButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Back
        `;

        const self = this;
        backButton.addEventListener('click', async function() {
          // Restore the original content
          popupForm.innerHTML = originalContent;

          // Get fresh data
          const freshCustomPrompts = await getCustomPrompts();
          const freshTemplates = await loadTemplates();
          
          // Re-attach event listeners using helper function with fresh data
          reattachEventListeners(popupForm, freshTemplates, freshCustomPrompts, self);
        });

        header.appendChild(backButton);
        header.appendChild(title);
        popupForm.appendChild(header);

        // Create form
        const form = document.createElement('form');
        form.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 16px;
        `;

        // Prompt name input
        const nameGroup = document.createElement('div');
        nameGroup.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 4px;
        `;

        const nameLabel = document.createElement('label');
        nameLabel.textContent = 'Prompt Name';
        nameLabel.style.cssText = `
            font-size: 14px;
            font-weight: 500;
            color: #fff;
        `;

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.placeholder = 'Enter a name for your prompt';
        nameInput.required = true;
        nameInput.value = template.name; // Pre-populate with existing name
        nameInput.style.cssText = `
            padding: 8px 12px;
            border-radius: 6px;
            border: 1px solid #3F3F46;
            background: #27272A;
            color: #fff;
            font-size: 14px;
        `;

        nameGroup.appendChild(nameLabel);
        nameGroup.appendChild(nameInput);

        // Category input
        const categoryGroup = document.createElement('div');
        categoryGroup.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 4px;
        `;

        const categoryLabel = document.createElement('label');
        categoryLabel.textContent = 'Category';
        categoryLabel.style.cssText = `
            font-size: 14px;
            font-weight: 500;
            color: #fff;
        `;

        const categoryInput = document.createElement('input');
        categoryInput.type = 'text';
        categoryInput.placeholder = 'Enter a category (e.g., Coding, Writing, etc.)';
        categoryInput.required = true;
        categoryInput.value = template.category; // Pre-populate with existing category
        categoryInput.style.cssText = `
            padding: 8px 12px;
            border-radius: 6px;
            border: 1px solid #3F3F46;
            background: #27272A;
            color: #fff;
            font-size: 14px;
        `;

        categoryGroup.appendChild(categoryLabel);
        categoryGroup.appendChild(categoryInput);

        // Prompt content textarea
        const contentGroup = document.createElement('div');
        contentGroup.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 4px;
        `;

        const contentLabel = document.createElement('label');
        contentLabel.textContent = 'Prompt Content';
        contentLabel.style.cssText = `
            font-size: 14px;
            font-weight: 500;
            color: #fff;
        `;

        const contentTextarea = document.createElement('textarea');
        contentTextarea.placeholder = 'Enter your prompt content';
        contentTextarea.required = true;
        contentTextarea.rows = 8;
        contentTextarea.value = template.content; // Pre-populate with existing content
        contentTextarea.style.cssText = `
            padding: 8px 12px;
            border-radius: 6px;
            border: 1px solid #3F3F46;
            background: #27272A;
            color: #fff;
            font-size: 14px;
            resize: vertical;
            font-family: inherit;
        `;

        contentGroup.appendChild(contentLabel);
        contentGroup.appendChild(contentTextarea);

        // Form buttons
        const formButtons = document.createElement('div');
        formButtons.style.cssText = `
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            margin-top: 16px;
        `;

        const cancelFormButton = document.createElement('button');
        cancelFormButton.type = 'button';
        cancelFormButton.textContent = 'Cancel';
        cancelFormButton.className = 'prompt-library-form-btn';
        cancelFormButton.style.cssText = `
            padding: 6px 12px;
            border-radius: 6px;
            border: 1px solid #3F3F46;
            background: transparent;
            color: #fff;
            cursor: pointer;
            font-size: 14px;
        `;

        cancelFormButton.addEventListener('click', async function() {
          // Restore the original content
          popupForm.innerHTML = originalContent;

          // Get fresh data
          const freshCustomPrompts = await getCustomPrompts();
          const freshTemplates = await loadTemplates();
          
          // Re-attach event listeners using helper function with fresh data
          reattachEventListeners(popupForm, freshTemplates, freshCustomPrompts, self);
        });

        const saveButton = document.createElement('button');
        saveButton.type = 'submit';
        saveButton.textContent = 'Update Prompt';
        saveButton.className = 'prompt-library-form-btn';
        saveButton.style.cssText = `
            padding: 6px 12px;
            border-radius: 6px;
            border: 1px solid #3F3F46;
            background: #272725;
            color: #fff;
            cursor: pointer;
            font-size: 14px;
        `;

        formButtons.appendChild(cancelFormButton);
        formButtons.appendChild(saveButton);

        // Add form elements
        form.appendChild(nameGroup);
        form.appendChild(categoryGroup);
        form.appendChild(contentGroup);
        form.appendChild(formButtons);

        // Add form submission handler
        form.addEventListener('submit', async (e) => {
          e.preventDefault();

          // Get form values
          const name = nameInput.value.trim();
          const category = categoryInput.value.trim();
          const content = contentTextarea.value.trim();

          // Validate form
          if (!name || !category || !content) {
            LovableAddons.utils.toast.showToast('Please fill in all fields', 'error');
            return;
          }

          // Create updated custom prompt object
          const updatedPrompt = {
            id: template.id, // Keep the original ID
            name,
            category,
            content,
            isCustom: true // Ensure it remains marked as custom
          };

          try {
            // Update custom prompt in storage
            await updateCustomPrompt(updatedPrompt);

            // Show success message
            LovableAddons.utils.toast.showToast('Custom prompt updated successfully', 'success');

            // Restore the original content (return to main view)
            popupForm.innerHTML = originalContent;

            // Get the updated list of custom prompts and fresh templates
            const updatedCustomPrompts = await getCustomPrompts();
            const freshTemplates = await loadTemplates();

            // Re-attach event listeners using helper function with fresh data
            reattachEventListeners(popupForm, freshTemplates, updatedCustomPrompts, self);

            // Force re-render to reflect edits while staying in popup
            const templatesList = document.querySelector('.prompt-templates-list');
            const favoritesNow = await getFavorites();
            const recentNow = await getRecentTemplates();
            const searchInputNow = document.querySelector('input[type="text"][placeholder="Search templates..."]');
            const activeCategoryBtnNow = document.querySelector('.category-filter-btn.active');
            const activeCategoryNow = activeCategoryBtnNow ? activeCategoryBtnNow.dataset.category : 'all';
            this.renderTemplates(
              templatesList,
              [...templates, ...updatedCustomPrompts],
              favoritesNow,
              recentNow,
              updatedCustomPrompts,
              searchInputNow ? searchInputNow.value : '',
              activeCategoryNow
            );

            // Select the 'Custom Prompts' category to show the updated prompt
            const customPromptsButton = document.querySelector('.category-filter-btn[data-category="custom"]');
            if (customPromptsButton) {
              customPromptsButton.click();
            }
          } catch (error) {
            console.error('Error updating custom prompt:', error);
            LovableAddons.utils.toast.showToast('Error updating custom prompt', 'error');
          }
        });

        popupForm.appendChild(form);
      },

      /**
       * Applies a template to the chat textarea
       * @param {Object} template - The template to apply
       * @returns {void}
       */
      applyTemplate: async function(template) {
        const textArea = document.querySelector('textarea');
        if (!textArea) {
          LovableAddons.utils.toast.showToast('Chat textarea not found', 'error');
          return;
        }

        // Set the template content to the textarea
        textArea.value = template.content;

        // Trigger input event to update any listeners
        const inputEvent = new Event('input', { bubbles: true });
        textArea.dispatchEvent(inputEvent);

        // Focus the textarea
        textArea.focus();

        // Add to recently used templates if it has an ID
        if (template.id) {
          await addToRecentTemplates(template.id);
        }

        // Show success toast
        LovableAddons.utils.toast.showToast(`Applied template: ${template.name}`, 'success');
      },

      /**
       * Initializes the Prompt Library feature
       * @returns {void}
       */
      init: function() {
        // Add button with a slight delay to ensure DOM is ready
        setTimeout(() => {
          this.addButton();
        }, 500); // Slightly longer delay than SEO button to ensure ordering

        // Use a simpler approach with a polling interval to check periodically
        setInterval(() => {
          // Only add if not already present
          if (!document.getElementById('lovable-addon-prompt-library')) {
            this.addButton();
          }
        }, 2500); // Check every 2.5 seconds (staggered from SEO check)
      }
    };
  })();

  // Register the prompt library feature with the LovableAddons namespace
  LovableAddons.registerFeature('promptLibrary', promptLibraryFeature);

  // Initialize the feature when the DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    promptLibraryFeature.init();
  });

})();
