/**
 * @fileoverview Toast notification utility for Lovable Add-ons Chrome extension.
 * This file provides a toast notification system for displaying temporary messages.
 */

(function() {
  'use strict';

  // Make sure LovableAddons namespace exists
  if (!window.LovableAddons) {
    console.error('LovableAddons namespace not found. Make sure namespace.js is loaded first.');
    return;
  }

  /**
   * Toast notification utility
   * @namespace LovableAddons.utils.toast
   */
  const toastUtils = {
    /**
     * Shows a toast notification with the specified message and type
     * @param {string} message - The message to display in the toast
     * @param {string} [type='info'] - The type of toast ('info', 'success', 'error', 'warning')
     * @returns {void}
     */
    showToast: function(message, type = 'info') {
      // Remove any existing toasts
      const existingToast = document.querySelector('.toast-notification');
      if (existingToast) {
        existingToast.remove();
      }

      const toast = document.createElement('div');
      toast.className = `toast-notification ${type}`;
      toast.textContent = message;
      document.body.appendChild(toast);

      // Force a reflow to ensure the animation works
      toast.offsetHeight;

      // Add show class to trigger animation
      requestAnimationFrame(() => {
        toast.classList.add('show');
      });

      // Remove the toast after delay
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, 2000);
    }
  };

  // Register the toast utilities with the LovableAddons namespace
  LovableAddons.registerUtility('toast', toastUtils);

})();
