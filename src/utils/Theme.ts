/**
 * Centralized theme constants for the Behavior Tree Editor
 * All colors and visual constants should be defined here
 */
export const Theme = {
    // Canvas colors
    background: '#1E1E1E',
    grid: '#2D2D2D',

    // Node colors by type
    node: {
        composite: '#4A90E2',
        decorator: '#9B59B6',
        leaf: '#2ECC71'
    },

    // Execution status colors
    status: {
        success: '#27AE60',
        failure: '#E74C3C',
        running: '#F1C40F',
        idle: '#95A5A6'
    },

    // UI element colors
    ui: {
        connection: '#7F8C8D',
        selection: '#F39C12',
        hover: '#3498DB',
        port: '#BDC3C7'
    },

    // Layout constants
    layout: {
        nodeMinWidth: 180,
        nodeHeight: 80,
        portRadius: 8,
        portClickRadius: 20,
        outputPortSpacing: 40,
        iconSize: 24,
        fontSize: 14,
        statusIndicatorRadius: 8
    }
} as const;

export type ThemeType = typeof Theme;
