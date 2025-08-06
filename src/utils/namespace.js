/**
 * @fileoverview Global namespace for Lovable Add-ons Chrome extension.
 * This file defines the global LovableAddons namespace to avoid polluting
 * the global scope in content script environments.
 */

(function() {
  'use strict';

  /**
   * @namespace LovableAddons
   * @description Global namespace for all Lovable Add-ons functionality
   */
  window.LovableAddons = window.LovableAddons || {
    /**
     * @property {string} version - Current extension version
     */
    version: '2.0.0',

    /**
     * @property {Object} utils - Utility functions and helpers
     */
    utils: {},

    /**
     * @property {Object} features - Feature-specific modules and functionality
     */
    features: {},

    /**
     * @property {Object} config - Configuration settings
     */
    config: {},

    /**
     * @property {Object} state - Global state management
     */
    state: {},

    /**
     * @property {function} init - Initialize the extension
     * @returns {void}
     */
    init: function() {
      console.log(`Lovable Add-ons v${this.version} initialized`);
    },

    /**
     * @property {function} registerFeature - Register a new feature module
     * @param {string} name - Feature name
     * @param {Object} implementation - Feature implementation
     * @returns {void}
     */
    registerFeature: function(name, implementation) {
      if (!this.features[name]) {
        this.features[name] = implementation;
      } else {
        console.warn(`Feature '${name}' is already registered.`);
      }
    },

    /**
     * @property {function} registerUtility - Register a new utility module
     * @param {string} name - Utility name
     * @param {Object|Function} implementation - Utility implementation
     * @returns {void}
     */
    registerUtility: function(name, implementation) {
      if (!this.utils[name]) {
        this.utils[name] = implementation;
      } else {
        console.warn(`Utility '${name}' is already registered.`);
      }
    },

    /**
     * @property {function} getFeature - Get a registered feature
     * @param {string} name - Feature name
     * @returns {Object|null} The feature implementation or null if not found
     */
    getFeature: function(name) {
      return this.features[name] || null;
    }
  };

  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', function() {
    LovableAddons.init();
  });
})();
