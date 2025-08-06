/**
 * @fileoverview Code Context feature for Lovable Add-ons Chrome extension.
 * This file provides functionality for copying code context from the current page.
 */

(function() {
  'use strict';

  // Make sure LovableAddons namespace exists
  if (!window.LovableAddons) {
    console.error('LovableAddons namespace not found. Make sure namespace.js is loaded first.');
    return;
  }

  /**
   * Code Context feature
   * @namespace LovableAddons.features.codeContext
   */
  const codeContextFeature = (function() {
    /**
     * Gets code context from the current page
     * @returns {string} The code context
     * @private
     */
    function getCodeContext() {
      // Find all code blocks on the page
      const codeBlocks = document.querySelectorAll('pre code, .code-block, .CodeMirror-code, .prism-code, code');
      let context = '';

      if (codeBlocks.length === 0) {
        return 'No code blocks found on this page.';
      }

      // Extract text from each code block
      codeBlocks.forEach((block, index) => {
        const blockText = block.textContent || block.innerText;
        if (blockText && blockText.trim()) {
          context += `--- Code Block ${index + 1} ---\n${blockText.trim()}\n\n`;
        }
      });

      return context || 'No code content found in the code blocks.';
    }

    /**
     * Copies text to clipboard
     * @param {string} text - The text to copy
     * @returns {Promise<boolean>} Whether the operation was successful
     * @private
     */
    async function copyToClipboard(text) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        console.error('Failed to copy text: ', err);

        // Fallback method
        try {
          const textArea = document.createElement('textarea');
          textArea.value = text;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          textArea.style.top = '-999999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          const success = document.execCommand('copy');
          document.body.removeChild(textArea);
          return success;
        } catch (err) {
          console.error('Fallback copy failed: ', err);
          return false;
        }
      }
    }

    // Public API
    return {
      /**
       * Adds a Code Context button to the navigation bar
       * @returns {void}
       */
      addButton: function() {
        // Find the target container with the specified class
        const targetContainer = document.querySelector('div.ml-auto.flex.w-full.justify-end.md\\:ml-0');
        if (!targetContainer) return;

        // Check if our button already exists globally
        if (document.getElementById('lovable-addon-code-context')) return;

        // Get or create the right-side container for our buttons
        let buttonContainer = targetContainer.querySelector('.lovable-addon-buttons');
        if (!buttonContainer) {
          // Create a container for our addon buttons if it doesn't exist
          buttonContainer = document.createElement('div');
          buttonContainer.className = 'lovable-addon-buttons flex gap-2 items-center ml-auto';
          targetContainer.appendChild(buttonContainer);
        }

        // Create Code Context button
        const codeContextButton = document.createElement('button');
        codeContextButton.id = 'lovable-addon-code-context';
        codeContextButton.className = 'whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none flex items-center justify-center h-fit focus-visible:ring-0 code-context-button lovable-tooltip';
        codeContextButton.style.border = 'none';
        codeContextButton.style.borderRadius = '6px';
        codeContextButton.style.gap = '6px';
        codeContextButton.style.padding = '6px';
        codeContextButton.style.background = 'var(--lovable-button-bg-light, #272725)';
        codeContextButton.style.zIndex = '10'; // Ensure button is above other elements
        codeContextButton.style.position = 'relative'; // Enable z-index
        codeContextButton.setAttribute('data-tooltip', 'Copy context from GitHub');

        // Add hover styles
        if (!document.querySelector('#code-context-button-style')) {
          const style = document.createElement('style');
          style.id = 'code-context-button-style';
          style.textContent = `
              .code-context-button:hover {
                  background-color: var(--lovable-button-tertiary-hover, #5F5F5E) !important;
              }
          `;
          document.head.appendChild(style);
        }

        codeContextButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18"><title>tasks-2</title><g fill="currentColor"><polyline points="8.247 11.5 9.856 13 13.253 8.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></polyline><rect x="5.25" y="5.25" width="11" height="11" rx="2" ry="2" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></rect><path d="M2.801,11.998L1.772,5.074c-.162-1.093,.592-2.11,1.684-2.272l6.924-1.029c.933-.139,1.81,.39,2.148,1.228" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></path></g></svg>
        `;
        // Remove title attribute to prevent double tooltips
        // codeContextButton.title = 'Copy context from GitHub';

        // Add click handler
        codeContextButton.addEventListener('click', () => {
          this.showPopup();
        });

        // Add button to container
        // Place after Prompt Library button if it exists
        const promptLibraryButton = buttonContainer.querySelector('#lovable-addon-prompt-library');
        if (promptLibraryButton) {
          buttonContainer.insertBefore(codeContextButton, promptLibraryButton.nextSibling);
        } else {
          // Place before SEO button if it exists
          const seoButton = buttonContainer.querySelector('#lovable-addon-seo-button');
          if (seoButton) {
            buttonContainer.insertBefore(codeContextButton, seoButton);
          } else {
            buttonContainer.appendChild(codeContextButton);
          }
        }
      },

      /**
       * Shows the Code Context popup with code blocks from the page
       * @returns {void}
       */
      showPopup: function() {
        // Remove any existing popup first
        const existingPopup = document.querySelector('.code-context-popup-overlay');
        if (existingPopup) {
          document.body.removeChild(existingPopup);
        }

        // Store 'this' reference for event handlers
        const self = this;

        // Create popup overlay
        const popupOverlay = document.createElement('div');
        popupOverlay.className = 'code-context-popup-overlay';
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
        styleElement.id = 'code-context-scrollbar-fix';
        styleElement.textContent = `
          body.lovable-popup-active {
            overflow: hidden !important;
            padding-right: 0 !important;
            margin-right: 0 !important;
          }

          .code-context-popup-overlay {
            overflow: hidden !important;
          }
        `;
        document.head.appendChild(styleElement);

        // Create popup
        const popup = document.createElement('div');
        popup.className = 'code-context-popup';

        // Apply theme to popup
        if (LovableAddons.utils && LovableAddons.utils.dom &&
            typeof LovableAddons.utils.dom.prepareThemedPopup === 'function') {
          LovableAddons.utils.dom.prepareThemedPopup(popup);
        }

        popup.style.cssText = `
            padding: 16px;
            border-radius: var(--lovable-popup-border-radius, 12px);
            min-width: 480px;
            max-width: 800px;
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
            margin-bottom: 12px;
            padding-bottom: 6px;
            border-bottom: 1px solid #3F3F46;
            flex-shrink: 0;
        `;

        const title = document.createElement('h2');
        title.textContent = 'Copy Code Context';
        title.style.cssText = `
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            color: var(--lovable-text-primary, #fff);
        `;

        const closeButton = document.createElement('button');
        closeButton.className = 'code-context-popup-close';
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

        // Create content area (scrollable)
        const contentArea = document.createElement('div');
        contentArea.style.cssText = `
            flex-grow: 1;
            overflow-y: auto;
            margin-bottom: 12px;
        `;

        // Create GitHub connection section
        const githubSection = document.createElement('div');
        githubSection.className = 'github-connection-section';
        githubSection.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 6px;
            margin-bottom: 12px;
        `;

        // Instructions for GitHub token
        const tokenInstructions = document.createElement('div');
        tokenInstructions.style.cssText = `
            margin-bottom: 8px;
            font-size: 12px;
            color: var(--lovable-text-secondary, #AAAAAA);
            line-height: 1.3;
        `;
        tokenInstructions.innerHTML = `
            To copy your GitHub repository as XML, you'll need a personal access token with <b>repo</b> scope permission ticked. <a href="https://github.com/settings/tokens/new" target="_blank" style="color: #64B5F6; text-decoration: underline;">Generate a token here</a>.
        `;

        // Access Token Input
        const tokenLabel = document.createElement('label');
        tokenLabel.htmlFor = 'github-access-token';
        tokenLabel.textContent = 'GitHub Access Token:';
        tokenLabel.style.fontSize = '13px';
        const tokenInput = document.createElement('input');
        tokenInput.type = 'password';
        tokenInput.id = 'github-access-token';
        tokenInput.placeholder = 'Paste your GitHub token here (fine-grained with repo access)';
        tokenInput.style.cssText = `
            width: 100%;
            padding: 5px 8px;
            border-radius: 4px;
            border: 1px solid var(--lovable-border-color, #3F3F46);
            background: var(--lovable-highlight-color, #27272A);
            color: var(--lovable-text-primary, #E4E4E7);
            font-size: 13px;
            box-sizing: border-box;
            margin-bottom: 6px;
        `;

        // Repository Selection Dropdown (initially hidden/disabled)
        const repoSelectLabel = document.createElement('label');
        repoSelectLabel.htmlFor = 'github-repo-select';
        repoSelectLabel.textContent = 'Select Repository:';
        repoSelectLabel.style.fontSize = '13px';
        const repoSelect = document.createElement('select');
        repoSelect.id = 'github-repo-select';
        repoSelect.disabled = true; // Disabled until token is verified and repos loaded
        repoSelect.style.cssText = `
            width: 100%;
            padding: 5px 8px;
            border-radius: 4px;
            border: 1px solid var(--lovable-border-color, #3F3F46);
            background: var(--lovable-highlight-color, #27272A);
            color: var(--lovable-text-primary, #E4E4E7);
            font-size: 13px;
            box-sizing: border-box;
        `;
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Connect with your token to see repositories...';
        repoSelect.appendChild(defaultOption);

        // Button Container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 6px;
            margin-top: 6px;
            align-items: center;
        `;

        // Connect Button
        const connectGithubButton = document.createElement('button');
        connectGithubButton.id = 'connect-github-button';
        connectGithubButton.className = 'code-context-connect-button';
        connectGithubButton.textContent = 'Connect & Load Repos';
        connectGithubButton.style.cssText = `
            padding: 4px 10px;
            border-radius: 4px;
            border: 1px solid var(--lovable-border-color, #3F3F46);
            background: var(--lovable-button-secondary, #3F3F46);
            color: var(--lovable-text-primary, #fff);
            cursor: pointer;
            font-size: 13px;
        `;
        connectGithubButton.addEventListener('mouseover', () => connectGithubButton.style.backgroundColor = 'var(--lovable-button-secondary-hover, #2167DB)');
        connectGithubButton.addEventListener('mouseout', () => connectGithubButton.style.backgroundColor = 'var(--lovable-button-secondary, #3F3F46)');

        // Disconnect Button (initially hidden)
        const disconnectGithubButton = document.createElement('button');
        disconnectGithubButton.id = 'disconnect-github-button';
        disconnectGithubButton.className = 'code-context-disconnect-button';
        disconnectGithubButton.textContent = 'Disconnect';
        disconnectGithubButton.style.cssText = `
            padding: 4px 10px;
            border-radius: 4px;
            border: 1px solid #8B0000;
            background: transparent;
            color: #FF6347;
            cursor: pointer;
            font-size: 13px;
            display: none;
        `;
        disconnectGithubButton.addEventListener('mouseover', () => disconnectGithubButton.style.backgroundColor = '#FF634739');
        disconnectGithubButton.addEventListener('mouseout', () => disconnectGithubButton.style.backgroundColor = 'transparent');

        // Status Indicator (Optional)
        const statusIndicator = document.createElement('span');
        statusIndicator.id = 'github-status-indicator';
        statusIndicator.textContent = 'Not Connected';
        statusIndicator.style.cssText = 'color: #AAAAAA; margin-left: 6px; font-size: 13px;';

        // Append elements
        githubSection.appendChild(tokenInstructions);
        githubSection.appendChild(tokenLabel);
        githubSection.appendChild(tokenInput);
        githubSection.appendChild(repoSelectLabel);
        githubSection.appendChild(repoSelect);
        buttonContainer.appendChild(connectGithubButton);
        buttonContainer.appendChild(disconnectGithubButton);
        buttonContainer.appendChild(statusIndicator);
        githubSection.appendChild(buttonContainer);

        // Create Export Repository button
        const exportRepoButton = document.createElement('button');
        exportRepoButton.id = 'export-repo-button';
        exportRepoButton.className = 'code-context-export-button';
        exportRepoButton.textContent = 'Copy Codebase as XML';
        exportRepoButton.style.cssText = `
            padding: 4px 10px;
            border-radius: 4px;
            border: 1px solid var(--lovable-border-color, #3F3F46);
            background: var(--lovable-button-secondary, #3F3F46);
            color: var(--lovable-text-primary, #fff);
            cursor: pointer;
            font-size: 13px;
            margin-top: 8px;
            display: none;
        `;
        exportRepoButton.addEventListener('mouseover', () => exportRepoButton.style.backgroundColor = 'var(--lovable-button-secondary-hover, #2167DB)');
        exportRepoButton.addEventListener('mouseout', () => exportRepoButton.style.backgroundColor = 'var(--lovable-button-secondary, #3F3F46)');

        // Add event listener for export button
        exportRepoButton.addEventListener('click', async () => {
            const selectedRepo = repoSelect.value;
            const token = tokenInput.value || localStorage.getItem('github_token');
            const selectedFormat = document.querySelector('input[name="export-format"]:checked').value;
            const fileFilter = document.getElementById('file-filter-input').value.trim();

            // Parse file extensions filter
            const fileExtensions = fileFilter ?
                fileFilter.split(',').map(ext => ext.trim().toLowerCase()) :
                [];

            if (!selectedRepo || !token) {
                LovableAddons.utils.toast.showToast('Please select a repository and provide a valid token', 'error');
                return;
            }

            try {
                // Update UI
                exportRepoButton.disabled = true;
                exportRepoButton.textContent = 'Copying...';

                // Show filter status if applicable
                const filterStatus = fileExtensions.length > 0 ?
                    ` (Filtered: ${fileExtensions.join(', ')})` : '';

                statusIndicator.textContent = `Copying...${filterStatus}`;
                statusIndicator.style.color = '#FFA500'; // Orange

                // Create a cancellable operation object
                const cancelToken = { cancelled: false };

                // Fetch repository data based on selected format
                let content;
                if (selectedFormat === 'xml') {
                    content = await self.fetchRepoAsXml(selectedRepo, token, cancelToken, fileExtensions);
                } else {
                    content = await self.fetchRepoAsMarkdown(selectedRepo, token, cancelToken, fileExtensions);
                }

                // Copy to clipboard
                const success = await copyToClipboard(content);

                // Update UI
                exportRepoButton.disabled = false;
                exportRepoButton.textContent = `Copy Codebase as ${selectedFormat.toUpperCase()}`;

                if (success) {
                    statusIndicator.textContent = `Connected: ${selectedRepo.split('/').pop()}`;
                    statusIndicator.style.color = '#4CAF50'; // Green
                    LovableAddons.utils.toast.showToast(`Codebase copied as ${selectedFormat.toUpperCase()} to clipboard!`, 'success');
                } else {
                    statusIndicator.textContent = 'Copy failed';
                    statusIndicator.style.color = '#FF6347'; // Red
                    LovableAddons.utils.toast.showToast('Failed to copy to clipboard', 'error');
                }
            } catch (error) {
                console.error('Error copying repository:', error);
                exportRepoButton.disabled = false;
                exportRepoButton.textContent = `Copy Codebase as ${selectedFormat.toUpperCase()}`;
                statusIndicator.textContent = 'Copy failed';
                statusIndicator.style.color = '#FF6347'; // Red
                LovableAddons.utils.toast.showToast(`Copy failed: ${error.message}`, 'error');
            }
        });

        // Add file filter option
        const filterContainer = document.createElement('div');
        filterContainer.style.cssText = `
            margin-top: 8px;
            font-size: 13px;
            display: none;
        `;

        const filterLabel = document.createElement('label');
        filterLabel.textContent = 'Filter files (comma-separated extensions, e.g., js,py,html):';
        filterLabel.style.cssText = `
            display: block;
            margin-bottom: 4px;
            color: #AAAAAA;
        `;

        const filterInput = document.createElement('input');
        filterInput.id = 'file-filter-input';
        filterInput.type = 'text';
        filterInput.placeholder = 'e.g., js,py,html or leave empty for all files';
        filterInput.style.cssText = `
            width: 100%;
            padding: 5px 8px;
            border-radius: 4px;
            border: 1px solid #3F3F46;
            background: #27272A;
            color: #E4E4E7;
            font-size: 13px;
            box-sizing: border-box;
            margin-bottom: 8px;
        `;

        filterContainer.appendChild(filterLabel);
        filterContainer.appendChild(filterInput);

        // Add format selection
        const formatSelectionContainer = document.createElement('div');
        formatSelectionContainer.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
            margin-top: 8px;
            font-size: 13px;
            display: none;
        `;

        const formatLabel = document.createElement('span');
        formatLabel.textContent = 'Format:';
        formatLabel.style.color = '#AAAAAA';

        const xmlFormatOption = document.createElement('label');
        xmlFormatOption.style.cssText = `
            display: flex;
            align-items: center;
            gap: 4px;
            cursor: pointer;
        `;
        const xmlRadio = document.createElement('input');
        xmlRadio.type = 'radio';
        xmlRadio.name = 'export-format';
        xmlRadio.value = 'xml';
        xmlRadio.checked = true;
        xmlFormatOption.appendChild(xmlRadio);
        xmlFormatOption.appendChild(document.createTextNode('XML'));

        const markdownFormatOption = document.createElement('label');
        markdownFormatOption.style.cssText = `
            display: flex;
            align-items: center;
            gap: 4px;
            cursor: pointer;
        `;
        const markdownRadio = document.createElement('input');
        markdownRadio.type = 'radio';
        markdownRadio.name = 'export-format';
        markdownRadio.value = 'markdown';
        markdownFormatOption.appendChild(markdownRadio);
        markdownFormatOption.appendChild(document.createTextNode('Markdown'));

        formatSelectionContainer.appendChild(formatLabel);
        formatSelectionContainer.appendChild(xmlFormatOption);
        formatSelectionContainer.appendChild(markdownFormatOption);

        // Add event listeners for format selection to update button text
        xmlRadio.addEventListener('change', function() {
            if (this.checked) {
                exportRepoButton.textContent = 'Copy Codebase as XML';
            }
        });

        markdownRadio.addEventListener('change', function() {
            if (this.checked) {
                exportRepoButton.textContent = 'Copy Codebase as Markdown';
            }
        });

        githubSection.appendChild(exportRepoButton);
        githubSection.appendChild(filterContainer);
        githubSection.appendChild(formatSelectionContainer);

        // Add GitHub section to content area
        contentArea.appendChild(githubSection);

        // Add content area to popup
        popup.appendChild(contentArea);

        // Add footer with ignored files info
        const ignoredFiles = [
            'bun.lockb',
            '.gitignore',
            'package-lock.json',
            'yarn.lock',
            'pnpm-lock.yaml',
            '.DS_Store',
            'Thumbs.db'
        ];

        const popupFooter = document.createElement('div');
        popupFooter.style.cssText = `
            margin-top: 12px;
            padding-top: 8px;
            border-top: 1px solid #3F3F46;
            font-size: 11px;
            color: #666666;
            text-align: center;
        `;
        popupFooter.textContent = `Ignored files: ${ignoredFiles.join(', ')}`;
        popup.appendChild(popupFooter);

        // Add event listener for repo selection change
        repoSelect.addEventListener('change', function() {
            const selectedRepo = this.value;
            if (selectedRepo) {
                exportRepoButton.style.display = 'block';
                filterContainer.style.display = 'block';
                formatSelectionContainer.style.display = 'flex';
                statusIndicator.textContent = `Selected: ${selectedRepo.split('/').pop()}`;
                statusIndicator.style.color = '#64B5F6'; // Blue
            } else {
                exportRepoButton.style.display = 'none';
                filterContainer.style.display = 'none';
                formatSelectionContainer.style.display = 'none';
                statusIndicator.textContent = 'Connected';
                statusIndicator.style.color = '#4CAF50'; // Green
            }
        });

        // Function to update UI based on connection status
        const updateGithubUI = (isConnected, selectedRepo = '', isLoading = false) => {
            tokenInput.disabled = isConnected;
            connectGithubButton.style.display = isConnected ? 'none' : 'inline-block';
            disconnectGithubButton.style.display = isConnected ? 'inline-block' : 'none';
            repoSelect.disabled = !isConnected || isLoading;

            if (isConnected) {
                tokenInput.style.backgroundColor = '#3a3a3d'; // Indicate disabled
                statusIndicator.textContent = selectedRepo ?
                  `Connected: ${selectedRepo.split('/').pop()}` : 'Connected';
                statusIndicator.style.color = '#4CAF50'; // Green
                if (!selectedRepo) {
                    repoSelect.querySelector('option').textContent = 'Select a repository...';
                }
            } else {
                tokenInput.style.backgroundColor = '#27272A'; // Normal background
                repoSelect.innerHTML = ''; // Clear dropdown
                const defaultOpt = document.createElement('option');
                defaultOpt.value = '';
                defaultOpt.textContent = 'Enter token and connect first...';
                repoSelect.appendChild(defaultOpt);
                statusIndicator.textContent = 'Not Connected';
                statusIndicator.style.color = '#AAAAAA';
            }

            if (isLoading) {
                statusIndicator.textContent = 'Loading repos...';
                statusIndicator.style.color = '#FFA500'; // Orange
                connectGithubButton.disabled = true;
                connectGithubButton.textContent = 'Connecting...';
            } else {
                connectGithubButton.disabled = false;
                connectGithubButton.textContent = 'Connect & Load Repos';
            }
        };

        // Load saved GitHub credentials and update UI
        chrome.storage.local.get(['githubAccessToken', 'githubSelectedRepo'], (result) => {
            if (result.githubAccessToken) {
                tokenInput.value = result.githubAccessToken;
                updateGithubUI(true, result.githubSelectedRepo);
                // If connected, automatically try to load repos
                self.fetchAndPopulateRepos(result.githubAccessToken, result.githubSelectedRepo);

                // Show export button if repo is selected
                if (result.githubSelectedRepo && exportRepoButton) {
                    exportRepoButton.style.display = 'block';
                    formatSelectionContainer.style.display = 'flex';
                }
            } else {
                updateGithubUI(false);
            }
        });

        // Add event listener for the connect button
        connectGithubButton.addEventListener('click', () => {
            const token = tokenInput.value.trim();
            if (!token) {
                LovableAddons.utils.toast.showToast('Please enter a GitHub Access Token.', 'warning');
                return;
            }
            updateGithubUI(false, '', true); // Show loading state
            self.connectToGithub(token); // Pass only token now
        });

        // Add event listener for the disconnect button
        disconnectGithubButton.addEventListener('click', () => {
            self.disconnectFromGithub();
            updateGithubUI(false);
        });

        // Create footer with buttons
        const footer = document.createElement('div');
        footer.style.cssText = `
            display: flex;
            justify-content: flex-end;
            gap: 6px;
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid #3F3F46;
            flex-shrink: 0;
        `;

        // Cancel button
        const cancelButton = document.createElement('button');
        cancelButton.className = 'code-context-popup-cancel';
        cancelButton.style.cssText = `
            padding: 4px 10px;
            border-radius: 4px;
            border: 1px solid var(--lovable-border-color, #3F3F46);
            background: transparent;
            color: var(--lovable-text-primary, #fff);
            cursor: pointer;
            font-size: 13px;
        `;
        cancelButton.textContent = 'Cancel';

        footer.appendChild(cancelButton);
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
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                self.closePopup();
            }
        });

        // Add hover effect for buttons
        const style = document.createElement('style');
        style.id = 'code-context-popup-style';
        style.textContent = `
            .code-context-popup-cancel:hover {
                background-color: var(--lovable-button-secondary-hover, #2167DB) !important;
            }
            .code-context-popup button:hover:not(:disabled) {
                background-color: var(--lovable-button-secondary-hover, #2167DB) !important;
            }
            .code-context-export-button:hover {
                background-color: var(--lovable-button-secondary-hover, #2167DB) !important;
            }
            .github-connection-section input:focus,
            .github-connection-section select:focus {
                outline: none;
                border-color: var(--lovable-button-secondary-hover, #2167DB);
            }

            /* Light theme specific styles for buttons */
            [data-lovable-theme="light"] .code-context-export-button,
            [data-lovable-theme="light"] .code-context-connect-button {
                background-color: var(--lovable-button-secondary, #EBEBEB) !important;
                color: var(--lovable-text-primary, rgba(0, 0, 0, 0.9)) !important;
                border-color: var(--lovable-border-color, rgba(0, 0, 0, 0.15)) !important;
            }

            [data-lovable-theme="light"] .code-context-export-button:hover,
            [data-lovable-theme="light"] .code-context-connect-button:hover {
                background-color: var(--lovable-button-secondary-hover, #C6E4FF) !important;
            }

            /* Light theme specific styles for cancel button */
            [data-lovable-theme="light"] .code-context-popup-cancel {
                color: var(--lovable-text-primary, rgba(0, 0, 0, 0.9)) !important;
                border-color: var(--lovable-border-color, rgba(0, 0, 0, 0.15)) !important;
            }

            [data-lovable-theme="light"] .code-context-popup-cancel:hover {
                background-color: var(--lovable-button-secondary-hover, #C6E4FF) !important;
            }
        `;
        document.head.appendChild(style);
      },

      /**
       * Closes the Code Context popup
       * @returns {void}
       */
      closePopup: function() {
        const popupOverlay = document.querySelector('.code-context-popup-overlay');
        if (popupOverlay) {
          document.body.removeChild(popupOverlay);
          // Remove the class that prevents scrolling
          document.body.classList.remove('lovable-popup-active');
          // Remove the style element
          const styleElement = document.getElementById('code-context-scrollbar-fix');
          if (styleElement) {
            styleElement.remove();
          }
        }
      },

      /**
       * Connects to GitHub using provided credentials and saves them.
       * @param {string} token - The GitHub Personal Access Token.
       * @returns {void}
       * @private // Assuming this might become part of the internal API
       */
      connectToGithub: function(token) {
        if (!token) {
          LovableAddons.utils.toast.showToast('Please provide a GitHub Access Token.', 'warning');
          return;
        }

        // Save the token first
        chrome.storage.local.set({ githubAccessToken: token }, () => {
          if (chrome.runtime.lastError) {
            console.error('Error saving GitHub token:', chrome.runtime.lastError);
            LovableAddons.utils.toast.showToast('Error saving GitHub token.', 'error');
          } else {
            console.log('GitHub token saved successfully.');
            // Now fetch repositories
            this.fetchAndPopulateRepos(token);
          }
        });
      },

      /**
       * Disconnects from GitHub by removing saved credentials
       * @returns {void}
       */
      disconnectFromGithub: function() {
        chrome.storage.local.remove(['githubAccessToken', 'githubSelectedRepo'], () => {
          if (chrome.runtime.lastError) {
            console.error('Error removing GitHub credentials:', chrome.runtime.lastError);
            LovableAddons.utils.toast.showToast('Error disconnecting from GitHub.', 'error');
          } else {
            console.log('GitHub credentials removed successfully.');
            LovableAddons.utils.toast.showToast('Disconnected from GitHub.', 'success');
          }
        });
      },

      /**
       * Fetches repositories from GitHub and populates the dropdown
       * @param {string} token - The GitHub Personal Access Token
       * @param {string} selectedRepo - The currently selected repository (if any)
       * @returns {void}
       */
      fetchAndPopulateRepos: function(token, selectedRepo = '') {
        if (!token) {
          console.error('No GitHub token provided for fetching repositories.');
          return;
        }

        // Find the repo select dropdown in the current popup
        const repoSelect = document.getElementById('github-repo-select');
        if (!repoSelect) {
          console.error('Repository select element not found in the DOM.');
          return;
        }

        // Update UI to show loading state
        const statusIndicator = document.getElementById('github-status-indicator');
        if (statusIndicator) {
          statusIndicator.textContent = 'Loading repositories...';
          statusIndicator.style.color = '#FFA500'; // Orange
        }

        // Disable the dropdown while loading
        repoSelect.disabled = true;
        repoSelect.innerHTML = '<option value="">Loading repositories...</option>';

        // Fetch repositories from GitHub API
        fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        })
        .then(response => {
          if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
          }
          return response.json();
        })
        .then(repos => {
          // Clear existing options
          repoSelect.innerHTML = '';

          // Add default option
          const defaultOption = document.createElement('option');
          defaultOption.value = '';
          defaultOption.textContent = 'Select a repository...';
          repoSelect.appendChild(defaultOption);

          // Sort repositories alphabetically
          repos.sort((a, b) => a.full_name.localeCompare(b.full_name));

          // Add repositories to dropdown
          repos.forEach(repo => {
            const option = document.createElement('option');
            option.value = repo.full_name; // owner/repo format
            option.textContent = repo.full_name;

            // Select the previously selected repo if it exists
            if (selectedRepo && repo.full_name === selectedRepo) {
              option.selected = true;
            }

            repoSelect.appendChild(option);
          });

          // Enable the dropdown
          repoSelect.disabled = false;

          // Update UI to show connected state
          if (statusIndicator) {
            statusIndicator.textContent = selectedRepo ?
              `Connected: ${selectedRepo.split('/').pop()}` : 'Connected';
            statusIndicator.style.color = '#4CAF50'; // Green
          }

          // Update the connect button visibility
          const connectButton = document.getElementById('connect-github-button');
          const disconnectButton = document.getElementById('disconnect-github-button');

          if (connectButton) connectButton.style.display = 'none';
          if (disconnectButton) disconnectButton.style.display = 'inline-block';

          LovableAddons.utils.toast.showToast(`Loaded ${repos.length} repositories.`, 'success');
        })
        .catch(error => {
          console.error('Error fetching GitHub repositories:', error);

          // Clear and reset the dropdown
          repoSelect.innerHTML = '';
          const errorOption = document.createElement('option');
          errorOption.value = '';
          errorOption.textContent = 'Error loading repositories';
          repoSelect.appendChild(errorOption);

          // Update status indicator
          if (statusIndicator) {
            statusIndicator.textContent = 'Connection failed';
            statusIndicator.style.color = '#FF6347'; // Red
          }

          // Show error toast
          LovableAddons.utils.toast.showToast('Failed to fetch repositories. Check your token and try again.', 'error');

          // Remove invalid token
          this.disconnectFromGithub();
        });
      },

      /**
       * Cache for repository data to avoid redundant fetching
       * @type {Object}
       * @private
       */
      _repoCache: {},

      /**
       * Fetches all files from a GitHub repository and formats them as XML
       * @param {string} repoFullName - The full name of the repository (owner/repo)
       * @param {string} token - The GitHub access token
       * @param {Object} [cancelToken] - Optional object with cancelled property to check for cancellation
       * @param {string[]} [fileExtensions] - Optional array of file extensions to filter by
       * @returns {Promise<string>} - Promise resolving to XML string
       */
      fetchRepoAsXml: async function(repoFullName, token, cancelToken = { cancelled: false }, fileExtensions = []) {
        if (!repoFullName || !token) {
          throw new Error('Repository name and token are required');
        }

        try {
          // Check cache first - include file extensions in cache key
          const extensionsKey = fileExtensions.length > 0 ? `_${fileExtensions.join('_')}` : '';
          const cacheKey = `${repoFullName}_xml${extensionsKey}`;
          if (this._repoCache[cacheKey]) {
            console.log('Using cached repository data for XML export');
            // Update UI to show we're using cached data
            const statusIndicator = document.getElementById('github-status-indicator');
            if (statusIndicator) {
              statusIndicator.textContent = 'Using cached data...';
              statusIndicator.style.color = '#64B5F6'; // Blue
            }
            return this._repoCache[cacheKey];
          }

          // First, get the default branch
          const repoResponse = await fetch(`https://api.github.com/repos/${repoFullName}`, {
            headers: {
              'Authorization': `token ${token}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          });

          if (!repoResponse.ok) {
            throw new Error(`Failed to fetch repository info: ${repoResponse.status}`);
          }

          const repoData = await repoResponse.json();
          const defaultBranch = repoData.default_branch;

          // Get the tree recursively (all files in the repo)
          const treeResponse = await fetch(`https://api.github.com/repos/${repoFullName}/git/trees/${defaultBranch}?recursive=1`, {
            headers: {
              'Authorization': `token ${token}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          });

          if (!treeResponse.ok) {
            throw new Error(`Failed to fetch repository tree: ${treeResponse.status}`);
          }

          const treeData = await treeResponse.json();

          // Start building XML
          let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
          xml += `<repository name="${repoFullName}" exported="${new Date().toISOString()}">\n`;

          // Files to ignore
          const ignoredFiles = [
            'bun.lockb',
            '.gitignore',
            'package-lock.json',
            'yarn.lock',
            'pnpm-lock.yaml',
            '.DS_Store',
            'Thumbs.db'
          ];

          // Process only blob items (files, not directories) and filter out ignored files
          const fileItems = treeData.tree.filter(item => {
            // Skip directories and ignored files
            if (item.type !== 'blob') return false;

            // Check if the file is in the ignore list
            const fileName = item.path.split('/').pop();
            if (ignoredFiles.includes(fileName)) return false;

            // Apply extension filter if provided
            if (fileExtensions.length > 0) {
              const extension = fileName.split('.').pop().toLowerCase();
              if (!fileExtensions.includes(extension)) return false;
            }

            return true;
          });

          // Sort files by path for better organization
          fileItems.sort((a, b) => a.path.localeCompare(b.path));

          // Track progress
          let processedFiles = 0;
          const totalFiles = fileItems.length;
          let lastProgressUpdate = Date.now();

          // Create a progress bar in the UI
          const statusIndicator = document.getElementById('github-status-indicator');
          if (statusIndicator) {
            statusIndicator.innerHTML = `
              <div style="display: flex; flex-direction: column; gap: 4px; width: 100%;">
                <div>Copying: 0% (0/${totalFiles})</div>
                <div style="width: 100%; background: #333; height: 4px; border-radius: 2px;">
                  <div id="progress-bar" style="width: 0%; background: #4CAF50; height: 100%; border-radius: 2px; transition: width 0.3s;"></div>
                </div>
              </div>
            `;
          }

          // Use adaptive batch sizing based on repository size
          // Larger repos use larger batches for better performance
          const batchSize = totalFiles > 500 ? 15 : (totalFiles > 200 ? 10 : 5);

          // Store all file contents for faster processing
          const fileContents = {};

          // Process files in batches to avoid rate limiting
          for (let i = 0; i < fileItems.length; i += batchSize) {
            // Check for cancellation between batches
            if (cancelToken.cancelled) {
              console.log('XML export operation cancelled');
              throw new Error('Operation cancelled by user');
            }

            const batch = fileItems.slice(i, i + batchSize);

            // Process batch in parallel
            const batchResults = await Promise.all(batch.map(async (file) => {
              try {
                // Skip binary files and very large files
                if (this.isBinaryPath(file.path) || file.size > 1000000) {
                  processedFiles++;
                  return `  <file path="${this.escapeXml(file.path)}" type="binary" size="${file.size}" />\n`;
                }

                // Fetch file content
                const contentResponse = await fetch(`https://api.github.com/repos/${repoFullName}/contents/${file.path}?ref=${defaultBranch}`, {
                  headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                  }
                });

                if (!contentResponse.ok) {
                  processedFiles++;
                  return `  <file path="${this.escapeXml(file.path)}" error="Failed to fetch content" />\n`;
                }

                const contentData = await contentResponse.json();

                // GitHub API returns content as base64
                // Use a more efficient base64 decoding approach
                const content = this._decodeBase64(contentData.content);

                // Store content for potential reuse
                fileContents[file.path] = content;

                // More efficient empty line removal
                const cleanedContent = this._removeEmptyLines(content);

                processedFiles++;

                // Update progress in UI less frequently to improve performance
                const now = Date.now();
                if (now - lastProgressUpdate > 200 || processedFiles === totalFiles) {
                  lastProgressUpdate = now;
                  const progressPercent = Math.round((processedFiles / totalFiles) * 100);

                  if (statusIndicator) {
                    statusIndicator.querySelector('div').textContent = `Copying: ${progressPercent}% (${processedFiles}/${totalFiles})`;
                    const progressBar = document.getElementById('progress-bar');
                    if (progressBar) {
                      progressBar.style.width = `${progressPercent}%`;
                    }
                  }
                }

                return `  <file path="${this.escapeXml(file.path)}">\n    <![CDATA[${cleanedContent}]]>\n  </file>\n`;
              } catch (error) {
                console.error(`Error processing file ${file.path}:`, error);
                return `  <file path="${this.escapeXml(file.path)}" error="${this.escapeXml(error.message)}" />\n`;
              }
            }));

            // Add batch results to XML
            xml += batchResults.join('');
          }

          xml += `</repository>`;
          return xml;
        } catch (error) {
          console.error('Error fetching repository as XML:', error);
          throw error;
        }
      },

      /**
       * Fetches all files from a GitHub repository and formats them as Markdown
       * @param {string} repoFullName - The full name of the repository (owner/repo)
       * @param {string} token - The GitHub access token
       * @param {Object} [cancelToken] - Optional object with cancelled property to check for cancellation
       * @param {string[]} [fileExtensions] - Optional array of file extensions to filter by
       * @returns {Promise<string>} - Promise resolving to Markdown string
       */
      fetchRepoAsMarkdown: async function(repoFullName, token, cancelToken = { cancelled: false }, fileExtensions = []) {
        if (!repoFullName || !token) {
          throw new Error('Repository name and token are required');
        }

        try {
          // Check cache first - include file extensions in cache key
          const extensionsKey = fileExtensions.length > 0 ? `_${fileExtensions.join('_')}` : '';
          const cacheKey = `${repoFullName}_markdown${extensionsKey}`;
          if (this._repoCache[cacheKey]) {
            console.log('Using cached repository data for Markdown export');
            // Update UI to show we're using cached data
            const statusIndicator = document.getElementById('github-status-indicator');
            if (statusIndicator) {
              statusIndicator.textContent = 'Using cached data...';
              statusIndicator.style.color = '#64B5F6'; // Blue
            }
            return this._repoCache[cacheKey];
          }

          // First, get the default branch
          const repoResponse = await fetch(`https://api.github.com/repos/${repoFullName}`, {
            headers: {
              'Authorization': `token ${token}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          });

          if (!repoResponse.ok) {
            throw new Error(`Failed to fetch repository info: ${repoResponse.status}`);
          }

          const repoData = await repoResponse.json();
          const defaultBranch = repoData.default_branch;

          // Get the tree recursively (all files in the repo)
          const treeResponse = await fetch(`https://api.github.com/repos/${repoFullName}/git/trees/${defaultBranch}?recursive=1`, {
            headers: {
              'Authorization': `token ${token}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          });

          if (!treeResponse.ok) {
            throw new Error(`Failed to fetch repository tree: ${treeResponse.status}`);
          }

          const treeData = await treeResponse.json();

          // Start building Markdown
          let markdown = `# ${repoFullName}\n\n`;

          // Files to ignore
          const ignoredFiles = [
            'bun.lockb',
            '.gitignore',
            'package-lock.json',
            'yarn.lock',
            'pnpm-lock.yaml',
            '.DS_Store',
            'Thumbs.db'
          ];

          // Process only blob items (files, not directories) and filter out ignored files
          const fileItems = treeData.tree.filter(item => {
            // Skip directories and ignored files
            if (item.type !== 'blob') return false;

            // Check if the file is in the ignore list
            const fileName = item.path.split('/').pop();
            if (ignoredFiles.includes(fileName)) return false;

            // Apply extension filter if provided
            if (fileExtensions.length > 0) {
              const extension = fileName.split('.').pop().toLowerCase();
              if (!fileExtensions.includes(extension)) return false;
            }

            return true;
          });

          // Sort files by path for better organization
          fileItems.sort((a, b) => a.path.localeCompare(b.path));

          // Track progress
          let processedFiles = 0;
          const totalFiles = fileItems.length;
          let lastProgressUpdate = Date.now();

          // Create a progress bar in the UI
          const statusIndicator = document.getElementById('github-status-indicator');
          if (statusIndicator) {
            statusIndicator.innerHTML = `
              <div style="display: flex; flex-direction: column; gap: 4px; width: 100%;">
                <div>Copying: 0% (0/${totalFiles})</div>
                <div style="width: 100%; background: #333; height: 4px; border-radius: 2px;">
                  <div id="progress-bar" style="width: 0%; background: #4CAF50; height: 100%; border-radius: 2px; transition: width 0.3s;"></div>
                </div>
              </div>
            `;
          }

          // Use adaptive batch sizing based on repository size
          // Larger repos use larger batches for better performance
          const batchSize = totalFiles > 500 ? 15 : (totalFiles > 200 ? 10 : 5);

          // Store all file contents for faster processing
          const fileContents = {};

          // Process files in batches to avoid rate limiting
          for (let i = 0; i < fileItems.length; i += batchSize) {
            // Check for cancellation between batches
            if (cancelToken.cancelled) {
              console.log('Markdown export operation cancelled');
              throw new Error('Operation cancelled by user');
            }

            const batch = fileItems.slice(i, i + batchSize);

            // Process batch in parallel
            const batchResults = await Promise.all(batch.map(async (file) => {
              // Check for cancellation within batch processing
              if (cancelToken.cancelled) {
                return '';
              }

              try {
                // Skip binary files and very large files
                if (this.isBinaryPath(file.path) || file.size > 1000000) {
                  processedFiles++;
                  return `### ${this.escapeMarkdown(file.path)}\n*Binary file (${file.size} bytes)*\n\n`;
                }

                // Fetch file content
                const contentResponse = await fetch(`https://api.github.com/repos/${repoFullName}/contents/${file.path}?ref=${defaultBranch}`, {
                  headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                  }
                });

                if (!contentResponse.ok) {
                  processedFiles++;
                  return `### ${this.escapeMarkdown(file.path)}\n*Failed to fetch content*\n\n`;
                }

                const contentData = await contentResponse.json();

                // Check if we already have this file's content from a previous XML export
                let content;
                if (fileContents[file.path]) {
                  content = fileContents[file.path];
                } else {
                  // GitHub API returns content as base64
                  content = this._decodeBase64(contentData.content);

                  // Store for potential reuse
                  fileContents[file.path] = content;
                }

                // More efficient empty line removal
                const cleanedContent = this._removeEmptyLines(content);

                processedFiles++;

                // Update progress in UI less frequently to improve performance
                const now = Date.now();
                if (now - lastProgressUpdate > 200 || processedFiles === totalFiles) {
                  lastProgressUpdate = now;
                  const progressPercent = Math.round((processedFiles / totalFiles) * 100);

                  if (statusIndicator) {
                    statusIndicator.querySelector('div').textContent = `Copying: ${progressPercent}% (${processedFiles}/${totalFiles})`;
                    const progressBar = document.getElementById('progress-bar');
                    if (progressBar) {
                      progressBar.style.width = `${progressPercent}%`;
                    }
                  }
                }

                return `### ${this.escapeMarkdown(file.path)}\n\`\`\`${this.getLanguageFromPath(file.path)}\n${cleanedContent}\n\`\`\`\n\n`;
              } catch (error) {
                console.error(`Error processing file ${file.path}:`, error);
                return `### ${this.escapeMarkdown(file.path)}\n*Error: ${this.escapeMarkdown(error.message)}*\n\n`;
              }
            }));

            // Add batch results to Markdown
            markdown += batchResults.join('');
          }

          // Cache the result
          this._repoCache[cacheKey] = markdown;

          return markdown;
        } catch (error) {
          console.error('Error fetching repository as Markdown:', error);
          throw error;
        }
      },

      /**
       * Checks if a file path is likely to be a binary file
       * @param {string} path - File path
       * @returns {boolean} - True if likely binary
       */
      isBinaryPath: function(path) {
        const binaryExtensions = [
          '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico', '.webp',
          '.mp3', '.mp4', '.wav', '.ogg', '.flac', '.avi', '.mov',
          '.zip', '.tar', '.gz', '.rar', '.7z',
          '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
          '.exe', '.dll', '.so', '.dylib',
          '.ttf', '.otf', '.woff', '.woff2'
        ];

        const lowercasePath = path.toLowerCase();
        return binaryExtensions.some(ext => lowercasePath.endsWith(ext));
      },

      /**
       * Escapes special characters for XML
       * @param {string} str - String to escape
       * @returns {string} - Escaped string
       */
      escapeXml: function(str) {
        return str
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');
      },

      /**
       * Escapes special characters for Markdown
       * @param {string} str - String to escape
       * @returns {string} - Escaped string
       */
      escapeMarkdown: function(str) {
        return str
          .replace(/#/g, '\\#')
          .replace(/\*/g, '\\*')
          .replace(/_/g, '\\_')
          .replace(/{/g, '\\{')
          .replace(/}/g, '\\}')
          .replace(/\[/g, '\\[')
          .replace(/\]/g, '\\]')
          .replace(/\(/g, '\\(')
          .replace(/\)/g, '\\)')
          .replace(/~/g, '\\~')
          .replace(/`/g, '\\`');
      },

      /**
       * More efficient base64 decoder
       * @param {string} base64 - Base64 encoded string
       * @returns {string} - Decoded string
       * @private
       */
      _decodeBase64: function(base64) {
        try {
          // Use built-in atob but handle padding issues
          base64 = base64.replace(/\s/g, ''); // Remove whitespace
          return atob(base64);
        } catch (e) {
          console.error('Base64 decoding error:', e);
          // Fallback to manual decoding if needed
          return atob(base64.replace(/\s/g, ''));
        }
      },

      /**
       * More efficient empty line removal
       * @param {string} content - Content to process
       * @returns {string} - Content without empty lines
       * @private
       */
      _removeEmptyLines: function(content) {
        // Use a more efficient approach than split/filter/join
        return content.replace(/^\s*[\r\n]/gm, '');
      },

      /**
       * Gets the language from a file path
       * @param {string} path - File path
       * @returns {string} - Language name
       */
      getLanguageFromPath: function(path) {
        const languageExtensions = {
          '.js': 'javascript',
          '.ts': 'typescript',
          '.jsx': 'jsx',
          '.tsx': 'tsx',
          '.py': 'python',
          '.java': 'java',
          '.cpp': 'cpp',
          '.c': 'c',
          '.php': 'php',
          '.rb': 'ruby',
          '.swift': 'swift',
          '.go': 'go',
          '.rs': 'rust',
          '.kt': 'kotlin',
          '.scala': 'scala',
          '.sql': 'sql',
          '.css': 'css',
          '.scss': 'scss',
          '.sass': 'sass',
          '.less': 'less',
          '.html': 'html',
          '.md': 'markdown',
        };

        const extension = path.split('.').pop().toLowerCase();
        return languageExtensions[`.${extension}`] || 'text';
      },

      /**
       * Initializes the Code Context feature
       * @returns {void}
       */
      init: function() {
        // Add the button when the DOM is fully loaded
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', () => {
            this.addButton();
          });
        } else {
          this.addButton();
        }

        // Add the button when navigating between pages
        const observer = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
              this.addButton();
            }
          }
        });

        // Start observing the document body for DOM changes
        observer.observe(document.body, { childList: true, subtree: true });
      }
    };
  })();

  // Register the Code Context feature with the LovableAddons namespace
  LovableAddons.registerFeature('codeContext', codeContextFeature);

  // Initialize the feature when the document is ready
  document.addEventListener('DOMContentLoaded', () => {
    LovableAddons.features.codeContext.init();
  });

})();
