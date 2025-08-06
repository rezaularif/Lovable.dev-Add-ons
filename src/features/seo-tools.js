/**
 * @fileoverview SEO tools feature for Lovable Add-ons Chrome extension.
 * This file provides functionality for managing SEO metadata for projects.
 */

(function() {
  'use strict';

  // Make sure LovableAddons namespace exists
  if (!window.LovableAddons) {
    console.error('LovableAddons namespace not found. Make sure namespace.js is loaded first.');
    return;
  }

  /**
   * SEO tools feature
   * @namespace LovableAddons.features.seoTools
   */
  const seoToolsFeature = (function() {
    // Public API
    return {
      /**
       * Escapes special characters for XML
       * @param {string} unsafe - The string to escape
       * @returns {string} - The escaped string
       */
      escapeXml: function(unsafe) {
        if (!unsafe) return '';
        return unsafe
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');
      },

      /**
       * Applies SEO content to the chat textarea without submitting
       * @param {string} content - The content to apply to the textarea
       * @returns {boolean} - Whether the operation was successful
       */
      applyToTextarea: function(content) {
        // Find the textarea using various selectors that might be present
        const textArea = document.querySelector('textarea') ||
                         document.querySelector('.cascade-prompt-form-prompt') ||
                         document.querySelector('textarea.chatinput-textarea');

        if (!textArea) {
          LovableAddons.utils.toast.showToast('Chat textarea not found', 'error');
          return false;
        }

        // Set the content to the textarea
        textArea.value = content;

        // Trigger input event to update any listeners
        const inputEvent = new Event('input', { bubbles: true });
        textArea.dispatchEvent(inputEvent);

        // Focus the textarea
        textArea.focus();

        // Show success toast
        LovableAddons.utils.toast.showToast('SEO content applied to textarea', 'success');
        return true;
      },

      /**
       * Adds an SEO button to the navigation bar on project pages
       * @returns {void}
       */
      addButton: function() {
        // Check if we're on a project page
        if (!window.location.href.includes('lovable.dev/projects')) return;

        // Check if our button already exists globally
        if (document.getElementById('lovable-addon-seo-button')) return;

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

        // Create SEO button
        const seoButton = document.createElement('button');
        seoButton.id = 'lovable-addon-seo-button';
        seoButton.className = 'whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none flex items-center justify-center h-fit focus-visible:ring-0 seo-button lovable-tooltip';
        seoButton.style.border = 'none';
        seoButton.style.borderRadius = '6px';
        seoButton.style.gap = '6px';
        seoButton.style.padding = '6px';
        seoButton.style.background = 'var(--lovable-button-bg-light, #272725)';
        seoButton.style.zIndex = '10'; // Ensure button is above other elements
        seoButton.style.position = 'relative'; // Enable z-index
        seoButton.style.marginRight = '8px'; // Add spacing to the right side
        seoButton.setAttribute('data-tooltip', 'Search Engine Optimization tools');

        // Add hover styles
        if (!document.querySelector('#seo-button-style')) {
          const style = document.createElement('style');
          style.id = 'seo-button-style';
          style.textContent = `
              .seo-button:hover {
                  background-color: var(--lovable-button-tertiary-hover, #5F5F5E) !important;
              }
          `;
          document.head.appendChild(style);
        }

        seoButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18"><title>chart-bar-trend-up</title><g fill="currentColor"><rect x="13.25" y="2.75" width="2.5" height="12.5" rx="1" ry="1" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></rect><rect x="7.75" y="7.75" width="2.5" height="7.5" rx="1" ry="1" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></rect><rect x="2.25" y="11.75" width="2.5" height="3.5" rx="1" ry="1" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></rect><polyline points="6.25 2.75 8.75 2.75 8.75 5.25" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></polyline><line x1="8.5" y1="3" x2="2.75" y2="8.75" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></line></g></svg>
        `;
        // Remove title attribute to prevent double tooltips
        // seoButton.title = 'Search Engine Optimization';

        // Add click handler
        seoButton.addEventListener('click', () => {
            this.showPopup();
        });

        // Add button to container
        buttonContainer.appendChild(seoButton);
      },

      /**
       * Shows the SEO popup with optimization suggestions
       * @returns {void}
       */
      showPopup: function() {
        // Remove any existing popup first
        const existingPopup = document.querySelector('.seo-popup-overlay');
        if (existingPopup) {
          document.body.removeChild(existingPopup);
        }

        // Store 'this' reference for event handlers
        const self = this;

        // Create popup container
        const popupOverlay = document.createElement('div');
        popupOverlay.className = 'seo-popup-overlay';
        popupOverlay.style.cssText = `
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
        styleElement.id = 'seo-tools-scrollbar-fix';
        styleElement.textContent = `
          body.lovable-popup-active {
            overflow: hidden !important;
            padding-right: 0 !important;
            margin-right: 0 !important;
          }

          .seo-popup-overlay {
            overflow: hidden !important;
          }
        `;
        document.head.appendChild(styleElement);

        const popup = document.createElement('div');
        popup.className = 'seo-popup';

        // Apply theme to popup
        if (LovableAddons.utils && LovableAddons.utils.dom &&
            typeof LovableAddons.utils.dom.prepareThemedPopup === 'function') {
          LovableAddons.utils.dom.prepareThemedPopup(popup);
        }

        popup.style.cssText = `
            padding: 16px;
            border-radius: var(--lovable-popup-border-radius, 12px);
            min-width: 500px;
            max-width: 850px;
            width: 90%;
            max-height: 80vh;
            border: none;
            display: flex;
            flex-direction: column;
            box-sizing: border-box;
            overflow-x: hidden;
        `;

        // Create header
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 1px solid #3F3F46;
            flex-shrink: 0;
        `;

        const title = document.createElement('h2');
        title.textContent = 'SEO Tools';
        title.style.cssText = `
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            color: var(--lovable-text-primary, #fff);
        `;

        const closeButton = document.createElement('button');
        closeButton.className = 'seo-popup-close';
        closeButton.style.cssText = `
            background: none;
            border: none;
            color: var(--lovable-text-secondary, #AAAAAA);
            cursor: pointer;
            padding: 4px;
        `;
        closeButton.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"></path>
            </svg>
        `;

        header.appendChild(title);
        header.appendChild(closeButton);
        popup.appendChild(header);

        // Create form container with scrollable area
        const scrollableContent = document.createElement('div');
        scrollableContent.style.cssText = `
            flex: 1;
            overflow-y: auto;
            min-height: 0;
            padding-right: 8px;
        `;

        const formContainer = document.createElement('div');
        formContainer.className = 'seo-popup-form';
        formContainer.style.cssText = `
            display: flex;
            gap: 20px;
            margin-bottom: 16px;
        `;

        // Left column: Form inputs
        const leftColumn = document.createElement('div');
        leftColumn.style.cssText = `
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 12px;
        `;

        // Title Tag input
        const titleGroup = document.createElement('div');
        titleGroup.className = 'seo-form-group';
        titleGroup.innerHTML = `
            <label for="seo-title" style="display: block; margin-bottom: 5px; font-size: 14px; color: var(--lovable-text-primary, #fff);">Title Tag</label>
            <div style="position: relative;">
                <input type="text" id="seo-title" class="seo-form-control" value="${document.title}" style="width: 100%; padding: 8px 12px; border-radius: 6px; border: 1px solid var(--lovable-border-color, #3F3F46); background: var(--lovable-highlight-color, #27272A); color: var(--lovable-text-primary, #fff); font-size: 14px; box-sizing: border-box;">
                <span id="seo-title-counter" style="position: absolute; right: 8px; top: 8px; font-size: 12px; color: var(--lovable-text-secondary, #AAAAAA);">${document.title.length}/60</span>
            </div>
        `;

        // Meta Description input
        const descGroup = document.createElement('div');
        descGroup.className = 'seo-form-group';
        descGroup.innerHTML = `
            <label for="seo-description" style="display: block; margin-bottom: 5px; font-size: 14px; color: var(--lovable-text-primary, #fff);">Meta Description</label>
            <div style="position: relative;">
                <textarea id="seo-description" class="seo-form-control" style="width: 100%; padding: 8px 12px; border-radius: 6px; border: 1px solid var(--lovable-border-color, #3F3F46); background: var(--lovable-highlight-color, #27272A); color: var(--lovable-text-primary, #fff); font-size: 14px; min-height: 80px; resize: vertical; box-sizing: border-box;"></textarea>
                <span id="seo-description-counter" style="position: absolute; right: 8px; top: 8px; font-size: 12px; color: var(--lovable-text-secondary, #AAAAAA);">0/160</span>
            </div>
        `;

        // Author input
        const authorGroup = document.createElement('div');
        authorGroup.className = 'seo-form-group';
        authorGroup.innerHTML = `
            <label for="seo-author" style="display: block; margin-bottom: 5px; font-size: 14px; color: var(--lovable-text-primary, #fff);">Author</label>
            <input type="text" id="seo-author" class="seo-form-control" style="width: 100%; padding: 8px 12px; border-radius: 6px; border: 1px solid var(--lovable-border-color, #3F3F46); background: var(--lovable-highlight-color, #27272A); color: var(--lovable-text-primary, #fff); font-size: 14px; box-sizing: border-box;">
        `;

        // Open Graph Image URL input
        const imageGroup = document.createElement('div');
        imageGroup.className = 'seo-form-group';
        imageGroup.innerHTML = `
            <label for="seo-og-image" style="display: block; margin-bottom: 5px; font-size: 14px; color: var(--lovable-text-primary, #fff);">Open Graph Image URL</label>
            <input type="text" id="seo-og-image" class="seo-form-control" placeholder="Enter image URL" style="width: 100%; padding: 8px 12px; border-radius: 6px; border: 1px solid var(--lovable-border-color, #3F3F46); background: var(--lovable-highlight-color, #27272A); color: var(--lovable-text-primary, #fff); font-size: 14px; box-sizing: border-box;">
            <div style="font-size: 11px; color: var(--lovable-text-secondary, #999999); margin-top: 4px;">Enter the URL of the image you want to use for Open Graph</div>
        `;

        // Keywords input
        const keywordsGroup = document.createElement('div');
        keywordsGroup.className = 'seo-form-group';
        keywordsGroup.innerHTML = `
            <label for="seo-keywords" style="display: block; margin-bottom: 5px; font-size: 14px; color: var(--lovable-text-primary, #fff);">Keywords (comma separated)</label>
            <input type="text" id="seo-keywords" class="seo-form-control" placeholder="keyword1, keyword2, keyword3" style="width: 100%; padding: 8px 12px; border-radius: 6px; border: 1px solid var(--lovable-border-color, #3F3F46); background: var(--lovable-highlight-color, #27272A); color: var(--lovable-text-primary, #fff); font-size: 14px; box-sizing: border-box;">
        `;

        leftColumn.appendChild(titleGroup);
        leftColumn.appendChild(descGroup);
        leftColumn.appendChild(authorGroup);
        leftColumn.appendChild(imageGroup);
        leftColumn.appendChild(keywordsGroup);

        // Right column: Preview
        const rightColumn = document.createElement('div');
        rightColumn.style.cssText = `
            flex: 1;
            display: flex;
            flex-direction: column;
        `;

        const previewLabel = document.createElement('div');
        previewLabel.style.cssText = `
            font-size: 12px;
            color: var(--lovable-text-secondary, #999999);
            margin-bottom: 12px;
        `;
        previewLabel.textContent = 'How your page will appear when shared:';

        // Unified Open Graph Preview
        const previewContainer = document.createElement('div');
        previewContainer.style.cssText = `
            background-color: #FFFFFF;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 2px rgba(0,0,0,0.2);
            color: #1A1A1A;
            width: 100%;
        `;

        // Preview Image
        const imagePreview = document.createElement('div');
        imagePreview.id = 'ogImagePreview';
        imagePreview.style.cssText = `
            height: 167px;
            background-color: #F0F2F5;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        imagePreview.innerHTML = `
            <div style="color: #8F939C; font-size: 14px; text-align: center;">
                <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                <div style="margin-top: 8px;">Preview Image</div>
            </div>
        `;

        // Content
        const previewContent = document.createElement('div');
        previewContent.style.cssText = `
            padding: 12px;
        `;

        // Domain
        const domainText = document.createElement('div');
        domainText.id = 'ogDomain';
        domainText.style.cssText = `
            font-size: 12px;
            color: #606770;
            margin-bottom: 6px;
            text-transform: uppercase;
        `;
        domainText.textContent = 'lovable.dev';

        // Title
        const titleText = document.createElement('div');
        titleText.id = 'ogTitle';
        titleText.style.cssText = `
            font-family: system-ui, -apple-system, BlinkMacSystemFont, '.SFNSText-Regular', sans-serif;
            font-size: 16px;
            font-weight: 600;
            line-height: 1.25;
            margin-bottom: 5px;
            color: #1D2129;
        `;
        titleText.textContent = document.title;

        // Description
        const descText = document.createElement('div');
        descText.id = 'ogDescription';
        descText.style.cssText = `
            font-size: 14px;
            line-height: 1.38;
            color: #606770;
            margin-bottom: 5px;
        `;
        descText.textContent = 'Your page description will appear here.';

        previewContent.appendChild(domainText);
        previewContent.appendChild(titleText);
        previewContent.appendChild(descText);

        previewContainer.appendChild(imagePreview);
        previewContainer.appendChild(previewContent);

        rightColumn.appendChild(previewLabel);
        rightColumn.appendChild(previewContainer);

        formContainer.appendChild(leftColumn);
        formContainer.appendChild(rightColumn);
        scrollableContent.appendChild(formContainer);
        popup.appendChild(scrollableContent);

        // Create footer with buttons at the bottom right corner
        const footer = document.createElement('div');
        footer.style.cssText = `
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid var(--lovable-border-color, #3F3F46);
            flex-shrink: 0;
        `;

        // Cancel button
        const cancelButton = document.createElement('button');
        cancelButton.className = 'seo-popup-cancel';
        cancelButton.style.cssText = `
            padding: 6px 12px;
            border-radius: 6px;
            border: 1px solid var(--lovable-border-color, #3F3F46);
            background: transparent;
            color: var(--lovable-text-primary, #fff);
            cursor: pointer;
            font-size: 14px;
        `;
        cancelButton.textContent = 'Cancel';

        // Apply button
        const applyButton = document.createElement('button');
        applyButton.className = 'seo-popup-apply';
        applyButton.style.cssText = `
            padding: 6px 12px;
            border-radius: 6px;
            border: 1px solid var(--lovable-border-color, #3F3F46);
            background: var(--lovable-button-secondary, #3F3F46);
            color: var(--lovable-text-primary, #fff);
            cursor: pointer;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 6px;
        `;
        applyButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Apply
        `;

        footer.appendChild(cancelButton);
        footer.appendChild(applyButton);
        popup.appendChild(footer);

        popupOverlay.appendChild(popup);
        document.body.appendChild(popupOverlay);

        // Apply theme to popup
        if (LovableAddons.utils && LovableAddons.utils.dom &&
            typeof LovableAddons.utils.dom.applyThemeToPopups === 'function') {
          LovableAddons.utils.dom.applyThemeToPopups();
        }

        // Add event listeners
        popupOverlay.addEventListener('click', (e) => {
            if (e.target === popupOverlay) {
                self.closePopup();
            }
        });

        closeButton.addEventListener('click', () => {
            self.closePopup();
        });

        cancelButton.addEventListener('click', () => {
            self.closePopup();
        });

        // Add keyboard support for the popup
        popupOverlay.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                self.closePopup();
            } else if (e.key === 'Enter' && e.ctrlKey) {
                applyButton.click();
            }
        });

        // Add hover effect for buttons
        const style = document.createElement('style');
        style.textContent = `
            .seo-popup-cancel:hover, .seo-popup-apply:hover {
                background-color: var(--lovable-button-secondary-hover, #2167DB) !important;
            }
            .seo-form-control:focus {
                outline: none;
                border-color: var(--lovable-button-secondary-hover, #2167DB);
            }
            .seo-popup button:hover {
                background-color: var(--lovable-button-secondary-hover, #2167DB) !important;
            }
        `;
        document.head.appendChild(style);

        // Add event listeners to update the Open Graph preview in real-time
        const ogTitle = popup.querySelector('#ogTitle');
        const ogDescription = popup.querySelector('#ogDescription');
        const ogImagePreview = popup.querySelector('#ogImagePreview');

        const titleInput = popup.querySelector('#seo-title');
        titleInput.addEventListener('input', () => {
          ogTitle.textContent = titleInput.value || 'Your Page Title';
        });

        const descInput = popup.querySelector('#seo-description');
        descInput.addEventListener('input', () => {
          ogDescription.textContent = descInput.value || 'Your page description will appear here.';
        });

        // Add image URL update functionality
        const imageInput = popup.querySelector('#seo-og-image');
        imageInput.addEventListener('input', () => {
          if (imageInput.value.trim()) {
            // If a valid URL is entered, update the image preview
            ogImagePreview.innerHTML = '';
            ogImagePreview.style.backgroundImage = `url('${imageInput.value.trim()}')`;
            ogImagePreview.style.backgroundSize = 'cover';
            ogImagePreview.style.backgroundPosition = 'center';
          } else {
            // If empty, show the placeholder
            ogImagePreview.style.backgroundImage = '';
            ogImagePreview.style.backgroundSize = '';
            ogImagePreview.style.backgroundPosition = '';
            ogImagePreview.innerHTML = `
              <div style="color: #8F939C; font-size: 14px; text-align: center;">
                <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                <div style="margin-top: 8px;">Preview Image</div>
              </div>
            `;
          }
        });

        // Update counters
        const titleCounter = popup.querySelector('#seo-title-counter');
        const descCounter = popup.querySelector('#seo-description-counter');

        titleInput.addEventListener('input', () => {
          titleCounter.textContent = `${titleInput.value.length}/60`;
        });

        descInput.addEventListener('input', () => {
          descCounter.textContent = `${descInput.value.length}/160`;
        });

        // Modify the Apply button handler
        applyButton.addEventListener('click', async () => {
            try {
                const titleInput = popup.querySelector('#seo-title');
                const descInput = popup.querySelector('#seo-description');
                const authorInput = popup.querySelector('#seo-author');
                const imageInput = popup.querySelector('#seo-og-image');

                const title = titleInput ? titleInput.value.trim() : '';
                const description = descInput ? descInput.value.trim() : '';
                const author = authorInput ? authorInput.value.trim() : '';
                const imageUrl = imageInput ? imageInput.value.trim() : '';

                let xmlContent = `Update the project's title and meta description to this. Don't change anything else in the project\n\n`;
                xmlContent += `<title>${self.escapeXml(title)}</title>\n`;
                xmlContent += `<meta name="description" content="${self.escapeXml(description)}">\n`;

                if (author) {
                    xmlContent += `<meta name="author" content="${self.escapeXml(author)}">\n`;
                }

                if (imageUrl) {
                    xmlContent += `<meta property="og:image" content="${self.escapeXml(imageUrl)}">\n`;
                    xmlContent += `<meta name="twitter:image" content="${self.escapeXml(imageUrl)}">\n`;
                }

                xmlContent += `<meta property="og:title" content="${self.escapeXml(title)}">\n`;
                xmlContent += `<meta property="og:description" content="${self.escapeXml(description)}">\n`;
                xmlContent += `<meta name="twitter:title" content="${self.escapeXml(title)}">\n`;
                xmlContent += `<meta name="twitter:description" content="${self.escapeXml(description)}">\n`;

                // Save values to storage for next time
                chrome.storage.local.set({
                    lastSeoTitle: title,
                    lastSeoDescription: description,
                    lastSeoAuthor: author,
                    lastImageUrl: imageUrl
                });

                // Apply the content to the textarea without submitting
                if (self.applyToTextarea(xmlContent)) {
                    self.closePopup();
                }
            } catch (error) {
                console.error('Error applying SEO content:', error);
                LovableAddons.utils.toast.showToast('Error applying SEO content', 'error');
            }
        });
      },

      /**
       * Closes the SEO popup
       * @returns {void}
       */
      closePopup: function() {
        const popupOverlay = document.querySelector('.seo-popup-overlay');
        if (popupOverlay) {
          document.body.removeChild(popupOverlay);
          // Remove the class that prevents scrolling
          document.body.classList.remove('lovable-popup-active');
          // Remove the style element
          const styleElement = document.getElementById('seo-tools-scrollbar-fix');
          if (styleElement) {
            styleElement.remove();
          }
        }
      },

      /**
       * Initializes the SEO tools feature
       * @returns {void}
       */
      init: function() {
        if (!window.location.href.includes('lovable.dev/projects')) return;

        // Add button with a slight delay to ensure DOM is ready
        setTimeout(() => {
          this.addButton();
        }, 300);

        // Use a simpler approach with a polling interval to check periodically
        setInterval(() => {
          // Only add if not already present
          if (!document.getElementById('lovable-addon-seo-button')) {
            this.addButton();
          }
        }, 2000); // Check every 2 seconds
      }
    };
  })();

  // Register the SEO tools feature with the LovableAddons namespace
  LovableAddons.registerFeature('seoTools', seoToolsFeature);

  // Initialize the feature when the DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    seoToolsFeature.init();
  });

})();
