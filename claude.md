# Browser-Based Behavior Tree Editor - Architecture Design

## Project Overview
A browser-based visual behavior tree editor built with vanilla HTML, CSS, and TypeScript. Supports node-based editing with Monaco editor integration for custom node logic.

---

## Core Design Decisions

### 1. Execution Model
- **Tick-based execution**: Allows incremental operations to occur over multiple frames
- Each tick traverses the tree from root, executing nodes based on control flow
- Nodes can return RUNNING to maintain state across ticks

### 2. Node Implementation
- Nodes contain eval'd JavaScript code that returns success/failure/running
- Code can use external libraries (via window scope)
- Monaco editor provides full IDE experience for editing node logic
- Code has access to blackboard for data sharing

### 3. Save/Load System
- JSON file export/import for behavior trees
- Simple file download/upload mechanism
- Serializes entire tree structure, connections, and code

### 4. Default Node Types
**Composites:**
- Sequence: Executes children in order, fails on first failure
- Selector: Executes children in order, succeeds on first success
- Parallel: Executes all children simultaneously

**Decorators:**
- Inverter: Inverts child result (SUCCESS ↔ FAILURE)
- Repeater: Repeats child N times
- UntilFail: Repeats child until FAILURE
- UntilSuccess: Repeats child until SUCCESS

**Leaf Nodes:**
- Action: Generic user-defined node (edit via Monaco)
- Condition: User-defined condition check

### 5. Settings Panel
- Initially minimal - just needs to exist for future expansion
- Will contain environment/execution settings
- JSON import/export controls
- Visual preferences (grid, zoom limits, etc.)

### 6. Connection Types
- **Phase 1 (Current)**: Pure control flow connections
  - Parent → Child execution flow
  - Visual tree hierarchy
- **Phase 2 (Future)**: Data flow connections
  - Explicit data ports
  - Typed connections

### 7. Data Sharing (Blackboard)
- Key-value registry for inter-node communication
- Nodes can get/set data via blackboard
- Future: Ghost lines showing data dependencies between nodes
- Type-safe access with optional schema validation

---

## Architecture Overview

### Separation of Concerns

```
┌─────────────────────────────────────────────┐
│           Presentation Layer                │
│  (Canvas, Rendering, User Interaction)      │
├─────────────────────────────────────────────┤
│           Application Layer                 │
│  (Editor State, Selection, Monaco)          │
├─────────────────────────────────────────────┤
│           Domain Layer                      │
│  (Behavior Tree Logic, Nodes, Execution)    │
├─────────────────────────────────────────────┤
│           Infrastructure Layer              │
│  (Serialization, File I/O, Utils)           │
└─────────────────────────────────────────────┘
```

### Core Principles
1. **Domain independence**: Behavior tree logic has zero rendering dependencies
2. **Node extensibility**: Easy to add new node types via inheritance
3. **Clear interfaces**: Well-defined contracts between layers
4. **Functional core, imperative shell**: Pure logic, imperative I/O

---

## File Structure

```
BTWeb/
├── index.html                 # Main HTML entry point
├── claude.md                  # This file
├── tsconfig.json             # TypeScript configuration
├── package.json              # Dependencies (Monaco, TypeScript)
│
├── src/
│   ├── main.ts               # Application entry point
│   │
│   ├── core/                 # Domain Layer - Behavior Tree Logic
│   │   ├── BehaviorTree.ts   # Main tree orchestrator, tick loop
│   │   ├── TreeNode.ts       # Abstract base node class
│   │   ├── Blackboard.ts     # Key-value data registry
│   │   ├── NodeStatus.ts     # Enum: SUCCESS, FAILURE, RUNNING
│   │   └── NodeExecutor.ts   # Safely evals user code
│   │
│   ├── nodes/                # Concrete Node Implementations
│   │   ├── composites/
│   │   │   ├── SequenceNode.ts
│   │   │   ├── SelectorNode.ts
│   │   │   └── ParallelNode.ts
│   │   ├── decorators/
│   │   │   ├── InverterNode.ts
│   │   │   ├── RepeaterNode.ts
│   │   │   ├── UntilFailNode.ts
│   │   │   └── UntilSuccessNode.ts
│   │   └── leaves/
│   │       ├── ActionNode.ts
│   │       └── ConditionNode.ts
│   │
│   ├── editor/               # Presentation Layer - Visual Editor
│   │   ├── Canvas.ts         # Main canvas, viewport transform
│   │   ├── NodeRenderer.ts   # Draws individual nodes
│   │   ├── ConnectionRenderer.ts  # Draws bezier curves
│   │   ├── Grid.ts           # Background grid rendering
│   │   ├── SelectionManager.ts    # Multi-select, drag operations
│   │   ├── InteractionManager.ts  # Mouse/keyboard input
│   │   └── Viewport.ts       # Pan, zoom, screen-to-world transforms
│   │
│   ├── ui/                   # Application Layer - UI Components
│   │   ├── MonacoIntegration.ts   # Monaco editor setup
│   │   ├── CodeEditorPanel.ts     # Code editor overlay
│   │   ├── SettingsPanel.ts       # Settings sidebar
│   │   ├── Toolbar.ts             # Top toolbar (play/pause/step)
│   │   └── ContextMenu.ts         # Right-click menu
│   │
│   ├── state/                # Application State Management
│   │   ├── EditorState.ts    # Current editor state
│   │   └── History.ts        # Undo/redo system
│   │
│   └── utils/                # Infrastructure Layer
│       ├── Vector2.ts        # 2D vector math
│       ├── Serialization.ts  # JSON import/export
│       ├── FileIO.ts         # File download/upload
│       └── Colors.ts         # Color constants
│
└── styles/
    ├── main.css              # Global styles, layout
    ├── canvas.css            # Canvas-specific styles
    ├── nodes.css             # Node visual styling
    ├── panels.css            # Settings/editor panel styles
    └── toolbar.css           # Toolbar styles
```

---

## Core Components Detail

### 1. Domain Layer (Behavior Tree Core)

#### `BehaviorTree`
```typescript
class BehaviorTree {
  root: TreeNode | null
  blackboard: Blackboard
  status: 'idle' | 'running' | 'paused'

  tick(): NodeStatus
  start(): void
  stop(): void
  reset(): void
}
```

#### `TreeNode` (Abstract Base)
```typescript
abstract class TreeNode {
  id: string
  type: string
  label: string
  children: TreeNode[]

  // Execution
  abstract tick(blackboard: Blackboard): NodeStatus
  reset(): void

  // Metadata (for visual editor)
  position: Vector2
  icon: string
  color: string
  code?: string  // For ActionNodes
}
```

#### `Blackboard`
```typescript
class Blackboard {
  private data: Map<string, any>

  get<T>(key: string): T | undefined
  set<T>(key: string, value: T): void
  has(key: string): boolean
  clear(): void

  // For future data flow visualization
  getDependencies(nodeId: string): string[]
}
```

#### `NodeStatus` (Enum)
```typescript
enum NodeStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
  RUNNING = 'running',
  IDLE = 'idle'
}
```

#### `NodeExecutor`
```typescript
class NodeExecutor {
  // Safely evals user code with blackboard access
  execute(code: string, blackboard: Blackboard): NodeStatus

  // Wraps code in try-catch, provides error feedback
  // Sandboxes execution context
}
```

---

### 2. Node Implementations

#### Composite Nodes

**SequenceNode**: Ticks children in order
- Returns FAILURE on first child failure
- Returns RUNNING if any child returns RUNNING
- Returns SUCCESS only if all children succeed
- Use case: "Do A, then B, then C"

**SelectorNode**: Ticks children in order
- Returns SUCCESS on first child success
- Returns RUNNING if any child returns RUNNING
- Returns FAILURE only if all children fail
- Use case: "Try A, else try B, else try C"

**ParallelNode**: Ticks all children every tick
- Succeeds when N children succeed (configurable)
- Fails when too many children fail
- Use case: "Do multiple things at once"

#### Decorator Nodes

**InverterNode**: Single child
- SUCCESS → FAILURE
- FAILURE → SUCCESS
- RUNNING → RUNNING

**RepeaterNode**: Single child, repeat N times
- Configuration: `count: number`
- Keeps ticking child until count reached

**UntilFailNode**: Repeats until child fails
- Returns RUNNING while child succeeds
- Returns SUCCESS when child fails

**UntilSuccessNode**: Repeats until child succeeds
- Returns RUNNING while child fails
- Returns SUCCESS when child succeeds

#### Leaf Nodes

**ActionNode**: User-defined JavaScript
```typescript
class ActionNode extends TreeNode {
  code: string  // User's JavaScript

  tick(blackboard: Blackboard): NodeStatus {
    return NodeExecutor.execute(this.code, blackboard)
  }
}
```

User code template:
```javascript
// Access blackboard
const health = blackboard.get('health')
blackboard.set('lastAction', 'attack')

// Can use external libs
// const result = SomeLib.doSomething()

// Must return status
return NodeStatus.SUCCESS
// or: return NodeStatus.FAILURE
// or: return NodeStatus.RUNNING
```

---

### 3. Visual Editor (Canvas)

#### `Canvas`
- Main rendering surface (HTML5 Canvas)
- Manages viewport transformation (pan/zoom)
- Delegates rendering to specialized renderers
- 60 FPS render loop

```typescript
class Canvas {
  viewport: Viewport
  grid: Grid
  nodeRenderer: NodeRenderer
  connectionRenderer: ConnectionRenderer

  render(): void
  screenToWorld(point: Vector2): Vector2
  worldToScreen(point: Vector2): Vector2
}
```

#### `NodeRenderer`
- Draws individual nodes as rounded rectangles
- Icons (Font Awesome or SVG)
- Input port (top), output ports (bottom)
- Color-coded by type:
  - Composite: Blue (#4A90E2)
  - Decorator: Purple (#9B59B6)
  - Leaf: Green (#2ECC71)
- Status indicator (success=green, failure=red, running=yellow)

#### `ConnectionRenderer`
- Bezier curves from parent output to child input
- Smooth curves for better aesthetics
- Hover highlights
- Color matches execution state

#### `Viewport`
- Pan: Middle mouse drag or Space + drag
- Zoom: Mouse wheel (centered on cursor)
- Bounds limiting (optional)
- Smooth interpolation for pan/zoom

#### `SelectionManager`
- Single select: Left click node
- Multi-select: Ctrl + click
- Box select: Drag in empty space
- Delete: Delete key
- Drag selected nodes

#### `InteractionManager`
- Mouse events → editor actions
- Keyboard shortcuts
- Double-click → Open Monaco editor
- Right-click → Context menu

---

### 4. Monaco Editor Integration

#### Setup
- Load from CDN (no build step needed)
- TypeScript/JavaScript language support
- Theme: VS Dark

#### `CodeEditorPanel`
- Overlay panel (slides in from right)
- Shows node's current code
- Save button → updates node
- ESC to close

#### Auto-complete Context
Provide type definitions for:
- `blackboard` object
- `NodeStatus` enum
- Common utility functions

---

### 5. Settings Panel

#### Initial Features
- **File Operations**
  - Export JSON
  - Import JSON
  - Clear tree

- **Execution Controls**
  - Play/Pause
  - Step (single tick)
  - Reset
  - Tick rate slider

- **Visual Settings** (future)
  - Grid snap
  - Zoom limits
  - Theme

---

## Visual Design

### Node Appearance
```
┌─────────────────┐
│   ╔═══╗         │  ← Input port (circle)
│   ║ ⚙ ║ Label   │  ← Icon + Label
│   ╚═══╝         │
│                 │
│   ○  ○  ○       │  ← Output ports (circles)
└─────────────────┘
```

### Connection Curves
- Cubic bezier curves
- Control points offset vertically for nice curves
- Animated flow when tree is executing (optional)

### Grid
- Subtle dot grid or line grid
- Snap-to-grid option (in settings)

### Color Palette
```
Background:     #1E1E1E (dark)
Grid:           #2D2D2D
Nodes:
  - Composite:  #4A90E2 (blue)
  - Decorator:  #9B59B6 (purple)
  - Leaf:       #2ECC71 (green)
Connections:    #7F8C8D (gray)
Selection:      #F39C12 (orange)
Status:
  - Success:    #27AE60
  - Failure:    #E74C3C
  - Running:    #F1C40F
```

---

## Interaction Patterns

### Canvas Interactions
| Input | Action |
|-------|--------|
| Left Click Node | Select node |
| Ctrl + Left Click | Add to selection |
| Left Drag Empty | Box select |
| Left Drag Node | Move selected nodes |
| Middle Drag | Pan canvas |
| Space + Drag | Pan canvas |
| Scroll Wheel | Zoom (cursor-centered) |
| Double Click Node | Edit code (Monaco) |
| Right Click | Context menu |
| Delete Key | Delete selected |
| Ctrl+C | Copy selected |
| Ctrl+V | Paste |
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |

### Creating Connections
1. Click output port of parent
2. Drag to input port of child
3. Release to create connection
4. ESC to cancel

### Creating Nodes
1. Right-click empty space
2. Context menu shows node types
3. Click to create at cursor position

---

## Serialization Format

### JSON Structure
```json
{
  "version": "1.0",
  "metadata": {
    "created": "2025-10-18T...",
    "modified": "2025-10-18T..."
  },
  "tree": {
    "nodes": [
      {
        "id": "node-1",
        "type": "SequenceNode",
        "label": "Main Sequence",
        "position": { "x": 100, "y": 200 },
        "children": ["node-2", "node-3"]
      },
      {
        "id": "node-2",
        "type": "ActionNode",
        "label": "Custom Action",
        "position": { "x": 150, "y": 300 },
        "code": "return NodeStatus.SUCCESS",
        "children": []
      }
    ],
    "root": "node-1"
  },
  "blackboard": {
    "initialValues": {
      "health": 100,
      "score": 0
    }
  }
}
```

---

## Execution Flow

### Tick Cycle
1. User clicks "Play" or "Step"
2. `BehaviorTree.tick()` called
3. Root node's `tick()` called
4. Recursively ticks children based on node type
5. Each node returns status
6. Blackboard updated by node code
7. Visual feedback (node colors) updated
8. Repeat on next frame (if playing)

### Code Execution Safety
```typescript
// Wrap user code in safe context
function executeUserCode(code: string, blackboard: Blackboard): NodeStatus {
  try {
    const fn = new Function('blackboard', 'NodeStatus', code)
    const result = fn(blackboard, NodeStatus)

    // Validate result
    if (!Object.values(NodeStatus).includes(result)) {
      console.error('Invalid return value')
      return NodeStatus.FAILURE
    }

    return result
  } catch (error) {
    console.error('Code execution error:', error)
    return NodeStatus.FAILURE
  }
}
```

---

## Development Phases

### Phase 1: Foundation (First Priority)
- [ ] Basic TypeScript setup, build configuration
- [ ] Core behavior tree classes (TreeNode, BehaviorTree, Blackboard)
- [ ] NodeStatus enum
- [ ] Basic HTML canvas setup
- [ ] Viewport (pan, zoom)
- [ ] Grid rendering

### Phase 2: Node Types
- [ ] Implement all composite nodes
- [ ] Implement all decorator nodes
- [ ] Implement ActionNode with code execution
- [ ] Node factory/registry system

### Phase 3: Visual Editor
- [ ] Node rendering (boxes, icons, ports)
- [ ] Connection rendering (bezier curves)
- [ ] Selection system (single, multi, box)
- [ ] Drag & drop nodes
- [ ] Create connections

### Phase 4: Monaco Integration
- [ ] Load Monaco from CDN
- [ ] Code editor panel UI
- [ ] Edit node code
- [ ] Syntax highlighting, auto-complete

### Phase 5: Execution & Playback
- [ ] Play/Pause/Step controls
- [ ] Tick loop implementation
- [ ] Visual execution feedback (node colors)
- [ ] Blackboard inspector

### Phase 6: Settings & I/O
- [ ] Settings panel UI
- [ ] JSON export
- [ ] JSON import
- [ ] Save/load to file

### Phase 7: Polish
- [ ] Undo/redo system
- [ ] Context menus
- [ ] Keyboard shortcuts
- [ ] Error handling & validation
- [ ] Performance optimization

---

## Technical Considerations

### TypeScript Configuration
- Target ES2020+
- Strict mode enabled
- Module system: ES modules
- Source maps for debugging

### Build Setup
- Simple build: `tsc` only (no bundler initially)
- Watch mode for development
- Serve with simple HTTP server (e.g., `python -m http.server`)

### Monaco Loading
```html
<script src="https://cdn.jsdelivr.net/npm/monaco-editor@latest/min/vs/loader.js"></script>
<script>
  require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@latest/min/vs' }})
  require(['vs/editor/editor.main'], () => {
    // Monaco ready
  })
</script>
```

### Performance Targets
- 60 FPS rendering (even with 100+ nodes)
- Smooth pan/zoom
- Instant node selection
- Lazy rendering (cull off-screen nodes)

### Browser Support
- Modern browsers only (Chrome, Firefox, Safari, Edge)
- ES2020+ features OK
- No IE11 support needed

---

## Future Enhancements (Post-MVP)

### Data Flow Visualization
- Explicit data ports on nodes
- Typed connections (number, string, boolean, object)
- Ghost lines showing blackboard dependencies
- Data inspector on hover

### Advanced Node Types
- SubTree: Embed another behavior tree
- RandomSelector: Random child selection
- RandomSequence: Shuffled sequence
- Wait: Delay node

### Debugging Tools
- Breakpoints on nodes
- Step through execution
- Blackboard watch variables
- Execution history/timeline

### Collaboration
- Multi-user editing
- Comments on nodes
- Version control integration

### Export Options
- Export to different formats (XML, YAML)
- Code generation (generate TypeScript class)
- Visual export (PNG, SVG)

---

## Success Criteria

The MVP is successful when:
1. ✅ Can create all node types via UI
2. ✅ Can connect nodes to build tree hierarchy
3. ✅ Can pan, zoom, select, drag nodes smoothly
4. ✅ Can double-click node to edit code in Monaco
5. ✅ Can execute tree (play/pause/step)
6. ✅ Visual feedback shows execution state
7. ✅ Can save/load trees as JSON
8. ✅ Settings panel accessible and functional
9. ✅ Code is clean, well-structured, maintainable
10. ✅ No external UI libraries (pure HTML/CSS/TS)

---

## Resources & References

### Behavior Trees
- [Behavior Trees for Robotics](https://arxiv.org/abs/1709.00084)
- [GDC: Building a Better Centaur](https://www.youtube.com/watch?v=6VBCXvfNlCM)

### Node Editors
- [Rete.js](https://rete.js.org/) - Reference for node editor patterns
- [Nodl](https://github.com/emilwidlund/nodl) - Minimalist node editor

### Canvas Rendering
- [Canvas Deep Dive - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial)

### Monaco Editor
- [Monaco Editor Docs](https://microsoft.github.io/monaco-editor/)
- [Monaco TypeScript Integration](https://microsoft.github.io/monaco-editor/playground.html)

---

## Notes
- This document is a living spec - will evolve as we build
- Priority: Rock solid foundation over feature completeness
- Code quality > Speed of delivery
- Everything should be testable and extensible
