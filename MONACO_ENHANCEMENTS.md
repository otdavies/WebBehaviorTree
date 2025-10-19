# Monaco Code Editor Panel Enhancements

This document describes the enhancements made to the Monaco code editor panel in the Behavior Tree Editor.

## Overview

Four major enhancements have been added to improve the code editing experience:

1. **Horizontal Resizing** - Resize the editor panel width
2. **Ctrl+S Support** - Quick save with keyboard shortcut
3. **Deviation Indicator** - Visual feedback when code is modified
4. **Custom Node Catalog** - Save and reuse customized nodes

---

## 1. Horizontal Resizing

### Feature Description
The code editor panel can now be resized horizontally by dragging its left edge. This allows users to adjust the editor width based on their preference and screen size.

### How to Use
1. Open the code editor by double-clicking any leaf node (Action, Wait, GoTo)
2. Hover over the **left edge** of the panel
3. The cursor will change to a resize cursor (↔)
4. Click and drag left or right to resize
5. The panel width is constrained between 300px and 1200px

### Implementation Details
- **File Modified**: `src/ui/CodeEditorPanel.ts`
- **CSS Added**: `.panel-resize-handle` in `styles/panels.css`
- A resize handle element is dynamically created and inserted at the left edge
- Mouse events track dragging and update the panel width
- Visual feedback (color change) when hovering over the handle

---

## 2. Ctrl+S Support

### Feature Description
Pressing **Ctrl+S** (or Cmd+S on Mac) while editing code will:
1. Save the code to the current node
2. Trigger a full file save to localStorage
3. Show visual feedback that the save was successful

### How to Use
1. Open the code editor for any node
2. Make changes to the code
3. Press **Ctrl+S** (Windows/Linux) or **Cmd+S** (Mac)
4. The "Save" button will briefly show a checkmark indicating success
5. Your changes are saved both to the node AND to localStorage

### Implementation Details
- **File Modified**: `src/ui/CodeEditorPanel.ts`
- Monaco editor command binding added in `initializeMonaco()`
- `saveCodeAndFile()` method saves code and calls the `onSaveToFile` callback
- Callback is wired to `saveTree()` in `main.ts`
- Visual feedback shows "✓ Saved" for 1 second after saving

### Benefits
- Faster workflow - no need to click the Save button
- Muscle memory from other editors (VS Code, etc.)
- Automatically saves to localStorage, preventing data loss

---

## 3. Deviation Indicator

### Feature Description
A visual indicator appears in the editor panel header when the code has been modified from the default template. This helps users identify which nodes have custom code vs. default behavior.

### How to Use
The indicator appears automatically:
1. Open the code editor for a node with default code
2. Modify the code in any way
3. A **yellow warning badge** appears in the header: "⚠ Modified"
4. Hover over it to see the tooltip: "Code has been modified from default template"
5. The indicator disappears if you restore the code to the default template

### Implementation Details
- **File Modified**: `src/ui/CodeEditorPanel.ts`
- **CSS Added**: `.deviation-indicator` in `styles/panels.css`
- The indicator is dynamically created in `setupDeviationIndicator()`
- `updateDeviationIndicator()` compares current code with default template
- Updates automatically on every code change (Monaco `onDidChangeModelContent`)
- Yellow color scheme (#F1C40F) for warning/attention

### Visual Design
```
┌─────────────────────────────────────────────────┐
│ [Code Icon] Edit Node Code  [⚠ Modified]  [×]  │
└─────────────────────────────────────────────────┘
```

---

## 4. Custom Node Catalog (Versioning & Reusability)

### Feature Description
Users can save customized nodes as reusable templates in a custom node catalog. These custom nodes:
- Are stored in browser localStorage
- Are included in JSON export/import
- Appear in the context menu alongside default nodes
- Can be instantiated multiple times with the same custom code

### How to Use

#### Saving a Node to the Catalog
1. Create an action node and customize its code
2. Open the code editor (double-click the node)
3. Click the **"Save to Catalog"** button (bookmark icon)
4. Enter a name for your custom node (e.g., "Attack Enemy")
5. Optionally enter a description
6. Click OK

Your custom node is now saved and can be reused!

#### Creating Instances of Custom Nodes
1. Right-click on the canvas to open the context menu
2. Custom nodes appear in the menu with their custom names
3. Click to create a new instance
4. The new node automatically has the saved custom code

#### Managing Custom Nodes
- **Storage**: Custom nodes are stored in `localStorage` under `behaviorTree_customNodes`
- **Export**: Custom nodes are included in JSON exports (in the `customNodes` field)
- **Import**: When importing a JSON file with custom nodes, they are automatically restored
- **Persistence**: Custom nodes survive browser refreshes and are reloaded on startup

### Implementation Details

#### New Files Created
1. **`src/utils/CustomNodeCatalog.ts`**
   - Manages custom node definitions
   - Save/load to localStorage
   - Export/import with JSON
   - Methods:
     - `saveCustomNode()` - Save a new custom node
     - `getAllCustomNodes()` - Get all custom nodes
     - `deleteCustomNode()` - Remove a custom node
     - `importCustomNodes()` - Load from JSON
     - `exportCustomNodes()` - Export to JSON

2. **`src/nodes/leaves/CustomActionNode.ts`**
   - Extends TreeNode like ActionNode
   - Initialized with pre-defined code from catalog
   - Executes the stored custom code

#### Modified Files
1. **`src/ui/CodeEditorPanel.ts`**
   - Added "Save to Catalog" button
   - `saveToCatalog()` method prompts for name/description
   - Calls `CustomNodeCatalog.saveCustomNode()`

2. **`src/core/NodeRegistry.ts`**
   - Added `unregister()` and `has()` methods
   - Allows dynamic registration/unregistration of node types

3. **`src/main.ts`**
   - Initialize `CustomNodeCatalog` on startup
   - `registerCustomNodesFromCatalog()` registers custom nodes with NodeRegistry
   - Export/import functions include custom nodes in JSON
   - Version bumped to 1.2 for custom node support

4. **`src/utils/FileIO.ts`**
   - No changes needed - already supports arbitrary JSON structure

### Data Structure

#### Custom Node Definition
```typescript
interface CustomNodeDefinition {
    type: string;              // e.g., "custom_attack_enemy"
    label: string;             // e.g., "Attack Enemy"
    description: string;       // e.g., "Attacks the nearest enemy"
    code: string;              // The custom JavaScript code
    icon: string;              // Font Awesome icon class
    category: 'leaf' | 'decorator' | 'composite';
    tags?: string[];           // For search/filtering
    version?: number;          // Version number (for future updates)
    createdAt?: string;        // ISO timestamp
}
```

#### JSON Export Format (v1.2)
```json
{
  "version": "1.2",
  "metadata": { ... },
  "tree": { ... },
  "blackboard": { ... },
  "customNodes": [
    {
      "type": "custom_attack_enemy",
      "label": "Attack Enemy",
      "description": "Attacks the nearest enemy",
      "code": "// Custom code here...",
      "icon": "fa-bolt",
      "category": "leaf",
      "tags": ["attack", "enemy", "custom"],
      "version": 1,
      "createdAt": "2025-10-19T12:34:56.789Z"
    }
  ]
}
```

### Use Cases

#### Example 1: Creating a "Log Message" Node
```javascript
// 1. Create an action node
// 2. Edit the code:
const message = params.message || 'Default message';
console.log(`[${nodeId}] ${message}`);
return NodeStatus.SUCCESS;

// 3. Save to catalog as "Log Message"
// 4. Add a parameter in the inspector: "message" (string)
// 5. Reuse this node throughout your tree for logging
```

#### Example 2: Creating a "Wait Random" Node
```javascript
// 1. Create an action node
// 2. Edit the code:
if (tick === 0) {
    const minWait = params.minTicks || 5;
    const maxWait = params.maxTicks || 15;
    const waitTicks = Math.floor(Math.random() * (maxWait - minWait + 1)) + minWait;
    blackboard.set(`${nodeId}_waitTicks`, waitTicks);
}

const waitTicks = blackboard.get(`${nodeId}_waitTicks`);
if (tick < waitTicks) {
    return NodeStatus.RUNNING;
}

blackboard.set(`${nodeId}_waitTicks`, null);
return NodeStatus.SUCCESS;

// 3. Save to catalog as "Wait Random"
// 4. Add parameters: minTicks, maxTicks
// 5. Reuse for random delays in your behavior tree
```

---

## CSS Styles Added

### `styles/panels.css`

```css
/* Panel Resize Handle */
.panel-resize-handle {
    position: absolute;
    left: 0;
    top: 0;
    width: 8px;
    height: 100%;
    cursor: ew-resize;
    z-index: 10;
    background: transparent;
    transition: background-color 0.2s ease;
}

.panel-resize-handle:hover {
    background-color: var(--accent-primary);
    opacity: 0.3;
}

/* Deviation Indicator */
.deviation-indicator {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    background-color: rgba(241, 196, 15, 0.15);
    border: 1px solid rgba(241, 196, 15, 0.4);
    border-radius: 4px;
    color: #F1C40F;
    font-size: 12px;
    font-weight: 600;
}
```

---

## Technical Architecture

### Component Interaction Flow

```
┌─────────────────────────────────────────────────────────┐
│                     User Interaction                     │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              CodeEditorPanel (UI Layer)                  │
│  - Shows Monaco editor                                   │
│  - Handles resize, deviation indicator                   │
│  - "Save to Catalog" button                              │
└───────────────────────┬─────────────────────────────────┘
                        │
            ┌───────────┴───────────┐
            ▼                       ▼
┌──────────────────────┐  ┌──────────────────────┐
│  CustomNodeCatalog   │  │    NodeExecutor      │
│  - Stores custom     │  │  - Gets default code │
│    node definitions  │  │  - Validates code    │
│  - localStorage      │  └──────────────────────┘
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│    NodeRegistry      │
│  - Registers custom  │
│    nodes dynamically │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   CustomActionNode   │
│  - Executes custom   │
│    code from catalog │
└──────────────────────┘
```

### Data Flow

1. **Save to Catalog**:
   ```
   User clicks "Save to Catalog"
   → CodeEditorPanel.saveToCatalog()
   → CustomNodeCatalog.saveCustomNode()
   → localStorage updated
   → NodeRegistry.register() called
   → Custom node now available in context menu
   ```

2. **Create Custom Node Instance**:
   ```
   User selects custom node from context menu
   → createNode() in main.ts
   → NodeRegistry.create()
   → CustomActionNode instantiated with stored code
   → Node added to canvas
   ```

3. **Export/Import**:
   ```
   User clicks "Export JSON"
   → exportTree() in main.ts
   → CustomNodeCatalog.exportCustomNodes()
   → Included in JSON file

   User imports JSON
   → importTree() in main.ts
   → CustomNodeCatalog.importCustomNodes()
   → registerCustomNodesFromCatalog()
   → Custom nodes restored
   ```

---

## Benefits

### Developer Experience
- **Faster iteration**: Save time by not rewriting common logic
- **Consistency**: Ensure all instances of a behavior use the same code
- **Shareability**: Export and share trees with custom nodes
- **Organization**: Clear visual feedback on which nodes are customized

### User Workflow
1. Prototype behaviors with default nodes
2. Customize code as needed
3. Save successful patterns to catalog
4. Build complex trees by composing custom nodes
5. Share entire projects (including custom nodes) via JSON export

### Technical Advantages
- **Modular**: Custom nodes are self-contained definitions
- **Persistent**: Stored in localStorage and JSON exports
- **Extensible**: Easy to add more metadata (icons, parameters, etc.)
- **Type-safe**: TypeScript ensures proper structure

---

## Future Enhancements

Potential improvements for the custom node system:

1. **Visual Catalog Browser**
   - Dedicated panel showing all custom nodes
   - Search and filter capabilities
   - Preview code without creating instances
   - Edit existing custom node definitions

2. **Parameter Templates**
   - Save parameter definitions with custom nodes
   - Auto-create parameters when instantiating custom nodes

3. **Categories and Tags**
   - Organize custom nodes into categories
   - Filter by tags in context menu
   - Color-coding for different types

4. **Version Management**
   - Track version history of custom nodes
   - Update all instances when definition changes
   - Diff viewer for code changes

5. **Import/Export Library**
   - Separate custom node library files
   - Community sharing of custom nodes
   - Import from URLs or local files

6. **Code Templates**
   - Provide common patterns as starting templates
   - Wizard for creating new custom nodes
   - Code snippets library

---

## Troubleshooting

### Custom nodes don't appear after saving
- Check browser console for errors
- Verify localStorage is enabled in your browser
- Check that `CustomNodeCatalog.initialize()` was called
- Refresh the page to reload custom nodes

### Resize handle not visible
- Ensure CSS was compiled/loaded correctly
- Check that `.panel-resize-handle` styles are applied
- Verify the element exists in the DOM

### Deviation indicator not updating
- Ensure Monaco editor's `onDidChangeModelContent` event is firing
- Check that default code is being retrieved correctly
- Verify `updateDeviationIndicator()` is being called

### Ctrl+S not working
- Check that Monaco command binding was added in `initializeMonaco()`
- Verify `onSaveToFile` callback is set in `main.ts`
- Check browser console for JavaScript errors

---

## File Summary

### Files Created (New)
- `src/utils/CustomNodeCatalog.ts` - Custom node catalog management
- `src/nodes/leaves/CustomActionNode.ts` - Custom action node implementation
- `MONACO_ENHANCEMENTS.md` - This documentation file

### Files Modified (Enhanced)
- `src/ui/CodeEditorPanel.ts` - Resize, deviation indicator, save to catalog
- `src/core/NodeRegistry.ts` - Dynamic registration support
- `src/main.ts` - Custom node integration and export/import
- `styles/panels.css` - New CSS for resize handle and deviation indicator

### Files Unchanged (No modifications needed)
- `src/utils/FileIO.ts` - Already supports arbitrary JSON
- `index.html` - No changes to HTML structure needed
- All other node types - Custom nodes are additive

---

## Conclusion

These enhancements significantly improve the code editing experience in the Behavior Tree Editor:

1. **Horizontal resizing** provides flexibility for different screen sizes
2. **Ctrl+S support** speeds up the workflow and prevents data loss
3. **Deviation indicator** gives instant visual feedback on code modifications
4. **Custom node catalog** enables reusability and sharing of custom behaviors

All features work together seamlessly and are fully integrated with the existing export/import system. Custom nodes are a powerful way to build a library of reusable behaviors specific to your project's needs.
