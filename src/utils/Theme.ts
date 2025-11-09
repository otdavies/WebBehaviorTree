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
        activeConnection: '#00D9FF', // Bright cyan for active execution flow
        selection: '#F39C12',
        hover: '#3498DB',
        port: '#BDC3C7'
    },

    // Layout constants
    layout: {
        nodeMinWidth: 120,
        nodeHeight: 50,
        portRadius: 6,
        portClickRadius: 15,
        outputPortSpacing: 30,
        multiPortWidth: 24,  // Width of multi-ports (wide connection ports)
        multiPortHeight: 8,  // Height of multi-ports
        iconSize: 0,  // Icons removed for sleeker design
        fontSize: 13,
        statusIndicatorRadius: 6
    }
} as const;

export type ThemeType = typeof Theme;
