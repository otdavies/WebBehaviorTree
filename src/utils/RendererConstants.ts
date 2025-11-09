/**
 * RendererConstants: Centralized constants for rendering-related magic numbers
 *
 * This file contains all layout dimensions, visual properties, and animation settings
 * used across the rendering system. These constants are separate from Theme.ts which
 * handles colors and core layout values.
 */

/**
 * Node rendering constants
 */
export const NodeConstants = {
    // Corner radius for rounded rectangles
    CORNER_RADIUS: 6,

    // Inner padding for node content
    INNER_PADDING: 8,

    // Margin for port width calculation
    PORT_WIDTH_MARGIN: 30,

    // Add port (+ button) radius - DEPRECATED, will be removed
    ADD_PORT_RADIUS: 6,

    // Icon display - DEPRECATED, icons removed
    ICON_OFFSET_X: 0,

    // Status indicator positioning
    STATUS_INDICATOR_OFFSET: 8, // Offset from corners
    STATUS_INDICATOR_RADIUS: 6,
} as const;

/**
 * Shadow and visual effect constants
 */
export const ShadowConstants = {
    // Selection shadow
    SELECTION_BLUR: 15,
    SELECTION_OFFSET_X: 0,
    SELECTION_OFFSET_Y: 0,

    // Hover shadow
    HOVER_BLUR: 8,
    HOVER_OFFSET_X: 0,
    HOVER_OFFSET_Y: 4,
    HOVER_OPACITY: 0.3,

    // Status indicator glow
    STATUS_RUNNING_BLUR: 15,
    STATUS_COMPLETED_BLUR: 10,
} as const;

/**
 * Node stroke (border) widths
 */
export const StrokeConstants = {
    // Node borders
    NODE_SELECTED: 3,
    NODE_NORMAL: 2,
    NODE_HOVER_HIGHLIGHT: 1,

    // Port borders
    PORT_BORDER: 2,

    // Icon drawing
    ICON_LINE: 2,
} as const;

/**
 * Progress bar constants (for composite nodes)
 */
export const ProgressBarConstants = {
    // Gradient color stops (RGB values, opacity set separately)
    GRADIENT_START_R: 52,
    GRADIENT_START_G: 152,
    GRADIENT_START_B: 219,
    GRADIENT_START_ALPHA: 0.3,

    GRADIENT_END_R: 52,
    GRADIENT_END_G: 152,
    GRADIENT_END_B: 219,
    GRADIENT_END_ALPHA: 0.5,
} as const;

/**
 * Icon drawing constants
 */
export const IconConstants = {
    // Icon size fractions (relative to icon size)
    SHAPE_FRACTION_THIRD: 1 / 3,
    SHAPE_FRACTION_QUARTER: 1 / 4,
    SHAPE_FRACTION_FIFTH: 1 / 5,
    SHAPE_FRACTION_SIXTH: 1 / 6,
    SHAPE_FRACTION_EIGHTH: 1 / 8,
    SHAPE_FRACTION_TENTH: 1 / 10,
    SHAPE_FRACTION_HALF: 1 / 2,

    // Line spacing for list icons
    LIST_LINE_SPACING: 1 / 4,
    LIST_LINE_HEIGHT: 2,
    LIST_LINE_COUNT: 3,

    // Plus symbol size
    PLUS_SIZE: 3,
} as const;

/**
 * Connection rendering constants
 */
export const ConnectionConstants = {
    // Bezier curve control point offset multiplier
    CONTROL_POINT_OFFSET: 0.5,

    // Line widths
    DEFAULT_LINE_WIDTH: 2,
    ACTIVE_LINE_WIDTH_BONUS: 1, // Added to default for active connections

    // Dash patterns
    DASH_PATTERN_LONG: 10,
    DASH_PATTERN_SHORT: 6,
    TEMPORARY_DASH_LONG: 5,
    TEMPORARY_DASH_SHORT: 5,
    RESIZE_HANDLE_DASH_LONG: 3,
    RESIZE_HANDLE_DASH_SHORT: 3,

    // Flow animation
    FLOW_SPEED: 60, // Pixels per second
    FLOW_DASH_RESET: 16, // Reset animation offset at this value

    // Flash animation
    FLASH_DURATION: 500, // Milliseconds
} as const;

/**
 * Shadow blur values for connections
 */
export const ConnectionShadowConstants = {
    ACTIVE_BLUR: 10,
    FLASH_MAX_BLUR: 20,
    FLASH_MAX_WIDTH_BONUS: 4,
} as const;

/**
 * Selection box constants
 */
export const SelectionConstants = {
    BOX_STROKE_WIDTH: 2,
    BOX_FILL_OPACITY: 0.1,
    BOX_DASH_LONG: 5,
    BOX_DASH_SHORT: 5,
} as const;

/**
 * Floating message constants
 */
export const FloatingMessageConstants = {
    // Default lifetime in milliseconds
    DEFAULT_LIFETIME: 2000,

    // Float velocity (negative = upward)
    VELOCITY_Y: -50,

    // Text rendering
    FONT_SIZE: 14,
    FONT_WEIGHT: 600,

    // Shadow for text
    SHADOW_OPACITY: 0.8,
    SHADOW_LINE_WIDTH: 3,
} as const;

/**
 * Viewport zoom constants
 */
export const ViewportConstants = {
    MIN_ZOOM: 0.1,
    MAX_ZOOM: 3.0,
    DEFAULT_ZOOM: 1.0,

    // Zoom delta multipliers (for mouse wheel)
    ZOOM_IN_DELTA: 1.1,
    ZOOM_OUT_DELTA: 0.9,
} as const;

/**
 * Grid rendering constants
 */
export const GridConstants = {
    DEFAULT_CELL_SIZE: 20, // Pixels at 100% zoom
    MAJOR_LINE_INTERVAL: 5, // Every 5th line is major
    LINE_WIDTH: 1, // Base line width (scaled by zoom)
} as const;

/**
 * Interaction constants
 */
export const InteractionConstants = {
    // Copy/paste offset
    PASTE_OFFSET_X: 50,
    PASTE_OFFSET_Y: 50,

    // Minimum drag distance for move operations
    MIN_DRAG_DISTANCE: 0.1,
} as const;

/**
 * Code editor panel constants
 */
export const EditorPanelConstants = {
    // Panel sizing
    MIN_WIDTH: 400,
    MAX_WIDTH: 1200,

    // Badge opacity
    BADGE_BACKGROUND_OPACITY: 0.1,

    // Button feedback duration
    BUTTON_FEEDBACK_DURATION: 1000,
    BUTTON_FEEDBACK_EXTENDED_DURATION: 2000,

    // Monaco editor focus delay
    EDITOR_FOCUS_DELAY: 100,
} as const;

/**
 * Status indicator pulse animation
 */
export const PulseAnimationConstants = {
    // Running status pulse
    PULSE_SPEED: 200, // Milliseconds per cycle
    PULSE_RADIUS_MIN: 2, // Added to base radius
    PULSE_RADIUS_MAX: 3, // Added to base radius + pulse min
    PULSE_OPACITY: 0.3,
} as const;

/**
 * Hover highlight constants
 */
export const HoverConstants = {
    HIGHLIGHT_OPACITY: 0.2,
    HIGHLIGHT_INSET: 1, // Pixels inset from edge
    HIGHLIGHT_RADIUS_REDUCTION: 1, // Reduce corner radius by this amount
} as const;

/**
 * Port click detection radius
 */
export const PortConstants = {
    // Already in Theme.layout, but keeping semantic names here for context
    CLICK_RADIUS_MULTIPLIER: 2.5, // Relative to port visual radius
} as const;
