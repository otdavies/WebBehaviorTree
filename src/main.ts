/**
 * Behavior Tree Editor - Main Entry Point
 *
 * AI Setup:
 *
 * Uses OpenRouter (https://openrouter.ai) for AI integration.
 * OpenRouter supports CORS natively - no proxy needed!
 *
 * Setup:
 *   1. Get an API key from https://openrouter.ai
 *   2. Set API key in Settings → AI Assistant
 *   3. Optionally select a different model (default: anthropic/claude-3.5-sonnet)
 */

import { Application } from './Application.js';

/**
 * Initializes the application
 */
function initializeApp(): void {
    try {
        const app = new Application();
        app.initialize();
    } catch (error) {
        console.error('Failed to initialize application:', error);
    }
}

// Wait for DOM and Monaco to be ready
window.addEventListener('DOMContentLoaded', () => {
    // Check if Monaco is already loaded
    if ((window as any).monacoLoaded) {
        initializeApp();
    } else {
        // Wait for Monaco to load
        window.addEventListener('monaco-loaded', initializeApp);
    }
});
