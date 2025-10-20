# Browser-Based Behavior Tree Editor

Visual behavior tree editor built with vanilla TypeScript, HTML5 Canvas, and Monaco editor.

## Architecture Layers

```
Presentation  → editor/     (Canvas, rendering, interaction)
Application   → ui/         (Monaco, panels, toolbar)
              → state/      (Editor state management)
              → actions/    (Operation pattern implementations)
Domain        → core/       (Behavior tree logic, execution)
              → nodes/      (Node type implementations)
Infrastructure→ utils/      (File I/O, serialization, helpers)
```

## Core Principles

1. **Domain Independence**: Behavior tree logic has zero rendering dependencies
2. **Operation Pattern**: All mutations go through Operation objects (undo/redo ready)
3. **Spatial Indexing**: PortCache uses grid-based O(1) hit detection for performance
4. **Viewport Culling**: Only render visible nodes (optimized for large trees)
5. **Constants Extraction**: Magic numbers live in RendererConstants.ts

## File Organization

```
src/
├── core/           Domain logic - BehaviorTree, TreeNode, Blackboard, NodeExecutor
├── nodes/          Composites (Sequence/Selector/Parallel), Decorators, Leaves
├── editor/         Canvas, Viewport, Renderers, SelectionManager, PortCache
├── ui/             Panels (Code/Settings/Inspector), Toolbar, Toast, ContextMenu
├── state/          EditorState (central state management)
├── actions/        Operations for nodes, connections, tree (Operation pattern)
└── utils/          Vector2, FileIO, VersionManager, Theme, RendererConstants
```

## Key Components

**BehaviorTree**: Tick-based execution, traverses from root each frame
**TreeNode**: Abstract base, all nodes inherit (tick returns SUCCESS/FAILURE/RUNNING)
**Blackboard**: Key-value registry for inter-node data sharing
**NodeExecutor**: Safely evals user JavaScript with blackboard access
**Canvas**: Main render loop, delegates to NodeRenderer/ConnectionRenderer
**Viewport**: Pan/zoom transforms (middle-drag or space+drag to pan)
**PortCache**: Grid-based spatial index for fast port hit testing (100x speedup)
**Operation**: Base class for undoable mutations (execute/undo pattern)

## Node Types

**Composites**: Sequence (AND), Selector (OR), Parallel (concurrent)
**Decorators**: Inverter, Repeater, UntilFail/Success, Start (tree root)
**Leaves**: Action (custom code), Wait, GoTo, CustomAction

## User Code Template

```javascript
// User writes JavaScript in Monaco editor
const value = blackboard.get('myKey')
blackboard.set('result', value * 2)
return NodeStatus.SUCCESS  // or FAILURE, RUNNING
```

## Interaction

| Action | Input |
|--------|-------|
| Pan | Middle-drag or Space+drag |
| Zoom | Mouse wheel (cursor-centered) |
| Select | Left-click node |
| Multi-select | Ctrl+click |
| Move | Drag selected nodes |
| Edit code | Double-click node |
| Context menu | Right-click |
| Connect | Drag from parent output to child input |

## Data Format

JSON serialization via VersionManager handles migrations between versions.
FileIO handles download/upload. Format includes nodes, connections, positions, code.

## Development Workflow

**Build**: `npm run build` (TypeScript → dist/)
**Watch**: `npm run watch`
**Test**: `npm test` (Vitest)
**Serve**: Serve `index.html` via any HTTP server

## AI Assistant

Optional AI chat integration using OpenRouter.ai
- Supports Claude, GPT-4, and 300+ models
- Users bring their own API key
- See README.md for setup

## Code Conventions

**Imports**: Explicit imports, no barrel exports
**Naming**: PascalCase classes, camelCase methods/variables
**Constants**: Extract magic numbers to RendererConstants.ts
**Console**: Use sparingly - keep error/warn only, remove debug statements
**Comments**: Explain why, not what (code should be self-documenting)

## Git Commit Rules

**IMPORTANT**: Keep commit messages under 10 words. Never include email addresses or Co-Authored-By tags.

Examples:
- "Add viewport culling for performance"
- "Fix port hit detection bug"
- "Extract magic numbers to constants"

## Performance Optimizations

**Viewport Culling**: Only render nodes in visible area (Canvas.ts)
**Port Cache**: Grid-based spatial indexing for O(1) port queries (PortCache.ts)
**Lazy Rendering**: Skip off-screen connections and grid dots
**Constants**: Pre-calculate values in RendererConstants vs runtime math

## Testing

Tests live in `tests/` mirroring `src/` structure.
Focus: Core logic (BehaviorTree, nodes), rendering (Canvas, NodeRenderer), operations.
Run `npm test` before committing to catch regressions.

## Monaco Integration

Loaded from CDN (no bundler needed). TypeScript/JavaScript support with custom type definitions for blackboard and NodeStatus. Editor panel slides in from right on double-click.

## Theme System

Centralized in Theme.ts. Dark theme with color-coded nodes:
- Composite: Blue
- Decorator: Purple
- Leaf: Green
- Status colors: Green (success), Red (failure), Yellow (running)
