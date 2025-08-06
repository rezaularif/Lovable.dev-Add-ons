/**
 * Utility function to load system prompts from the config file
 * @returns {Promise<Object>} The prompts configuration object
 */
export async function loadSystemPrompts() {
  try {
    const response = await fetch(chrome.runtime.getURL('config/prompts.json'));
    const prompts = await response.json();
    return prompts;
  } catch (error) {
    console.error('Error loading system prompts:', error);
    return null;
  }
}

/**
 * Get a specific prompt by its type
 * @param {string} type - The type of prompt to retrieve (e.g., 'chatPrompt', 'searchPrompt')
 * @returns {Promise<string|null>} The requested prompt or null if not found
 */
export async function getPrompt(type) {
  try {
    const prompts = await loadSystemPrompts();
    return prompts?.systemPrompts?.[type] || null;
  } catch (error) {
    console.error(`Error getting prompt for type ${type}:`, error);
    return null;
  }
}
