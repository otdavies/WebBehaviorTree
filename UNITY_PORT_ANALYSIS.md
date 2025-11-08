# Unity Port Analysis: WebBehaviorTree to Unity Graph Toolkit

## Executive Summary

This document provides a comprehensive analysis of porting the WebBehaviorTree editor to Unity using the Unity Graph Toolkit (UI Toolkit GraphView). The analysis includes architecture mapping, complexity estimates, and a surgical implementation approach.

**Complexity Estimate: Medium-High (8-12 weeks for full-featured implementation)**

The port is highly feasible with Unity's GraphView providing most visual node editing capabilities out-of-the-box. The main work involves:
1. Core behavior tree runtime in C# (2-3 weeks)
2. GraphView editor integration (3-4 weeks)
3. Node type system and serialization (2-3 weeks)
4. Testing and polish (1-2 weeks)

---

## Table of Contents

1. [Current Architecture Analysis](#current-architecture-analysis)
2. [Unity Architecture Mapping](#unity-architecture-mapping)
3. [Core Components Port Strategy](#core-components-port-strategy)
4. [Implementation Phases](#implementation-phases)
5. [Complexity Breakdown](#complexity-breakdown)
6. [Design Decisions & Trade-offs](#design-decisions--trade-offs)
7. [Minimal Feature Set](#minimal-feature-set)
8. [Risk Assessment](#risk-assessment)

---

## Current Architecture Analysis

### Core Technology Stack (Web)
```
TypeScript/JavaScript
├── Canvas API (rendering)
├── Monaco Editor (code editing) ❌ NOT NEEDED - Unity handles this
├── HTML/CSS (UI styling)
└── Browser APIs (file I/O, localStorage)
```

### Key Architectural Patterns

#### 1. **Node System** ⭐ Core Pattern
```typescript
abstract class TreeNode {
    // Identity & Display
    id: string
    type: string
    label: string
    category: 'composite' | 'decorator' | 'leaf'
    
    // Execution
    abstract tick(blackboard: Blackboard): NodeStatus
    
    // Hierarchy
    children: TreeNode[]
    parent: TreeNode | null
    
    // Editor Properties
    position: Vector2
    icon: string
    color: string
    code?: string  // For leaf nodes
}
```

**Key Insight:** Clean separation between runtime (tick logic) and editor (visual properties). This maps perfectly to Unity's ScriptableObject pattern.

#### 2. **Node Registry Pattern** ⭐ Extensibility Core
```typescript
class NodeRegistry {
    static register(registration: NodeRegistration): void
    static create(type: string): TreeNode
    static getByCategory(category): NodeRegistration[]
}
```

**Key Insight:** Centralized factory pattern for node creation. Unity can use Reflection + Attributes for auto-registration.

#### 3. **Operation Pattern (Undo/Redo)** ⭐ Professional Polish
```typescript
interface Operation {
    execute(): void
    undo(): void
    canExecute(): boolean
}

class OperationHistory {
    execute(operation: Operation): void
    undo(): void
    redo(): void
}
```

**Key Insight:** All editor actions (add node, connect, move) are operations. Unity has `Undo.RecordObject()` built-in, but operation pattern provides better control.

#### 4. **Blackboard (Shared State)** ⭐ Runtime Data
```typescript
class Blackboard {
    private data: Map<string, any>
    set(key: string, value: any): void
    get<T>(key: string): T | undefined
}
```

**Key Insight:** Simple key-value store shared across all nodes during execution. Unity equivalent: Dictionary<string, object> or ScriptableObject-based.

#### 5. **Node Categories & Execution Patterns**

**Composites** (Parent nodes with multiple children):
- `SequenceNode`: Execute children until one fails (AND logic)
- `SelectorNode`: Execute children until one succeeds (OR logic)
- `ParallelNode`: Execute all children simultaneously

**Decorators** (Single child, modify behavior):
- `InverterNode`: Flip child result
- `RepeaterNode`: Repeat child N times
- `StartNode`: Root entry point (special decorator)

**Leaves** (Actions, no children):
- `ActionNode`: User-programmable JavaScript ➜ **Unity: C# MonoBehaviour methods**
- `WaitNode`: Pause execution for N ticks
- `GoToNode`: Jump to another action by name

### Current Feature Set

✅ **Core Features:**
- Visual node graph editor with drag-and-drop
- Real-time execution with tick-based system
- Node connection with automatic child ordering
- Undo/redo for all operations
- JSON serialization (save/load)
- Custom user-defined nodes
- Blackboard system for shared state
- Status visualization (success/failure/running/idle)
- Grid snapping
- Node inspector panel
- Monaco code editor for action nodes ❌ NOT NEEDED

✅ **Advanced Features:**
- Multiple Start nodes (execute left-to-right)
- Library system for reusable custom nodes
- Version management for node definitions
- Port caching for performance
- Floating messages during execution
- Context menu for quick node creation
- Parameter system for nodes

---

## Unity Architecture Mapping

### Technology Stack Translation

| Web Technology | Unity Equivalent | Notes |
|---------------|------------------|-------|
| TypeScript | C# | Direct translation, better type safety |
| Canvas API | UI Toolkit GraphView | Unity's official graph solution |
| Monaco Editor | Visual Studio / Rider | Unity opens scripts automatically ✅ |
| HTML/CSS | USS (Unity Style Sheets) | Similar to CSS |
| localStorage | EditorPrefs + JSON files | Unity standard |
| Vitest (testing) | Unity Test Framework | NUnit-based |

### Core Class Mapping

#### Runtime Classes (Runtime Assembly)

```csharp
// Core/TreeNode.cs
public abstract class TreeNode : ScriptableObject
{
    // Identity
    public string id;
    public string nodeType;
    public string displayName;
    public NodeCategory category;
    
    // Execution
    public abstract NodeStatus Tick(Blackboard blackboard);
    public virtual void Reset() { }
    
    // Hierarchy
    public List<TreeNode> children = new List<TreeNode>();
    [System.NonSerialized] public TreeNode parent;
    
    // Configuration
    public Dictionary<string, object> parameters;
}

// Core/NodeStatus.cs
public enum NodeStatus
{
    Idle,
    Running,
    Success,
    Failure
}

// Core/BehaviorTree.cs
public class BehaviorTree : MonoBehaviour
{
    public TreeNode rootNode;
    public Blackboard blackboard;
    
    public float tickRate = 10f; // ticks per second
    private float tickTimer;
    
    void Update()
    {
        if (isRunning)
        {
            tickTimer += Time.deltaTime;
            if (tickTimer >= 1f / tickRate)
            {
                Tick();
                tickTimer = 0;
            }
        }
    }
    
    public NodeStatus Tick()
    {
        if (rootNode != null)
            return rootNode.Tick(blackboard);
        return NodeStatus.Idle;
    }
}

// Core/Blackboard.cs
public class Blackboard : ScriptableObject
{
    [SerializeField]
    private Dictionary<string, object> data = new Dictionary<string, object>();
    
    public void Set<T>(string key, T value) { data[key] = value; }
    public T Get<T>(string key) { /* ... */ }
}
```

#### Editor Classes (Editor Assembly)

```csharp
// Editor/BehaviorTreeGraphView.cs
public class BehaviorTreeGraphView : GraphView
{
    private BehaviorTreeAsset asset;
    
    public BehaviorTreeGraphView(BehaviorTreeAsset asset)
    {
        this.asset = asset;
        
        // Setup graph view features
        SetupZoom(ContentZoomer.DefaultMinScale, ContentZoomer.DefaultMaxScale);
        
        this.AddManipulator(new ContentDragger());
        this.AddManipulator(new SelectionDragger());
        this.AddManipulator(new RectangleSelector());
        this.AddManipulator(new ContextualMenuManipulator(BuildContextMenu));
        
        // Grid background
        var grid = new GridBackground();
        Insert(0, grid);
        grid.StretchToParentSize();
        
        // Undo/redo support
        Undo.undoRedoPerformed += OnUndoRedo;
    }
    
    public override List<Port> GetCompatiblePorts(Port startPort, NodeAdapter nodeAdapter)
    {
        // Connection validation logic
    }
    
    private void BuildContextMenu(ContextualMenuPopulateEvent evt)
    {
        // Build node creation menu from NodeRegistry
    }
}

// Editor/BehaviorTreeNode.cs (Visual node representation)
public class BehaviorTreeNode : Node
{
    public TreeNode runtimeNode; // Link to ScriptableObject
    
    public Port inputPort;
    public List<Port> outputPorts = new List<Port>();
    
    public BehaviorTreeNode(TreeNode runtimeNode)
    {
        this.runtimeNode = runtimeNode;
        title = runtimeNode.displayName;
        
        // Create ports based on node category
        CreatePorts();
        
        // Style based on category
        ApplyNodeStyle();
        
        // Double-click to edit code (for ActionNode)
        RegisterCallback<MouseDownEvent>(OnDoubleClick);
    }
    
    private void OnDoubleClick(MouseDownEvent evt)
    {
        if (evt.clickCount == 2 && runtimeNode is ActionNode actionNode)
        {
            // Open the C# script in Unity editor
            AssetDatabase.OpenAsset(actionNode.scriptAsset);
        }
    }
}

// Editor/BehaviorTreeEditorWindow.cs
public class BehaviorTreeEditorWindow : EditorWindow
{
    [MenuItem("Window/Behavior Tree Editor")]
    public static void OpenWindow()
    {
        var window = GetWindow<BehaviorTreeEditorWindow>();
        window.titleContent = new GUIContent("Behavior Tree");
    }
    
    private BehaviorTreeGraphView graphView;
    private BehaviorTreeAsset currentAsset;
    
    private void CreateGUI()
    {
        // Create toolbar
        var toolbar = new Toolbar();
        rootVisualElement.Add(toolbar);
        
        // Create graph view
        graphView = new BehaviorTreeGraphView(currentAsset);
        graphView.StretchToParentSize();
        rootVisualElement.Add(graphView);
        
        // Load asset if one is selected
        if (Selection.activeObject is BehaviorTreeAsset asset)
        {
            LoadAsset(asset);
        }
    }
}
```

### Node Implementation Examples

#### Composite Node (Sequence)
```csharp
// Runtime/Nodes/Composites/SequenceNode.cs
[CreateAssetMenu(menuName = "Behavior Tree/Composites/Sequence")]
public class SequenceNode : TreeNode
{
    private int currentChildIndex = 0;
    
    public override NodeStatus Tick(Blackboard blackboard)
    {
        for (int i = currentChildIndex; i < children.Count; i++)
        {
            var childStatus = children[i].Tick(blackboard);
            
            if (childStatus == NodeStatus.Failure)
            {
                currentChildIndex = 0;
                return NodeStatus.Failure;
            }
            
            if (childStatus == NodeStatus.Running)
            {
                currentChildIndex = i;
                return NodeStatus.Running;
            }
        }
        
        currentChildIndex = 0;
        return NodeStatus.Success;
    }
    
    public override void Reset()
    {
        base.Reset();
        currentChildIndex = 0;
    }
}
```

#### Action Node (User-Defined)
```csharp
// Runtime/Nodes/Actions/ActionNode.cs
public abstract class ActionNode : TreeNode
{
    // User implements this in their own scripts
    protected abstract NodeStatus OnExecute(Blackboard blackboard);
    
    public override NodeStatus Tick(Blackboard blackboard)
    {
        return OnExecute(blackboard);
    }
}

// Example user implementation:
// Scripts/MyActions/PatrolAction.cs
[CreateAssetMenu(menuName = "My Game/Actions/Patrol")]
public class PatrolAction : ActionNode
{
    public Transform[] waypoints;
    private int currentWaypoint = 0;
    
    protected override NodeStatus OnExecute(Blackboard blackboard)
    {
        // User's custom logic here
        var agent = blackboard.Get<NavMeshAgent>("agent");
        
        if (agent.remainingDistance < 0.5f)
        {
            currentWaypoint = (currentWaypoint + 1) % waypoints.Length;
            agent.SetDestination(waypoints[currentWaypoint].position);
            return NodeStatus.Success;
        }
        
        return NodeStatus.Running;
    }
}
```

---

## Core Components Port Strategy

### 1. Runtime Components (Priority: CRITICAL)

**Location:** `Assets/BehaviorTree/Runtime/`

These run at game runtime and have ZERO editor dependencies.

```
Runtime/
├── Core/
│   ├── TreeNode.cs              [150 LOC] - Base node class
│   ├── NodeStatus.cs            [10 LOC]  - Enum
│   ├── BehaviorTree.cs          [200 LOC] - Main execution controller
│   ├── Blackboard.cs            [100 LOC] - Shared state
│   └── NodeCategory.cs          [10 LOC]  - Enum
├── Nodes/
│   ├── Composites/
│   │   ├── SequenceNode.cs      [60 LOC]
│   │   ├── SelectorNode.cs      [60 LOC]
│   │   └── ParallelNode.cs      [80 LOC]
│   ├── Decorators/
│   │   ├── InverterNode.cs      [40 LOC]
│   │   ├── RepeaterNode.cs      [50 LOC]
│   │   └── StartNode.cs         [50 LOC]
│   └── Actions/
│       ├── ActionNode.cs        [80 LOC]  - Base class
│       ├── WaitNode.cs          [50 LOC]
│       └── ConditionalNode.cs   [60 LOC]
└── Utilities/
    └── NodeExtensions.cs        [50 LOC]

Total Runtime LOC: ~1,010 lines
Estimated Time: 2-3 weeks
```

**Key Decisions:**
- Use `ScriptableObject` for nodes (serializable, asset-based)
- Use `MonoBehaviour` for BehaviorTree (attached to GameObjects)
- Runtime assembly has NO UnityEditor references

### 2. Editor Components (Priority: HIGH)

**Location:** `Assets/BehaviorTree/Editor/`

Editor-only code for visual editing.

```
Editor/
├── Graph/
│   ├── BehaviorTreeGraphView.cs           [400 LOC] - Main graph
│   ├── BehaviorTreeNode.cs                [250 LOC] - Visual node
│   ├── BehaviorTreeEdge.cs                [80 LOC]  - Visual connection
│   └── NodeSearchWindow.cs                [150 LOC] - Context menu search
├── Windows/
│   ├── BehaviorTreeEditorWindow.cs        [350 LOC] - Main window
│   ├── BlackboardView.cs                  [200 LOC] - Blackboard panel
│   └── InspectorView.cs                   [180 LOC] - Node inspector
├── Serialization/
│   ├── BehaviorTreeAsset.cs               [200 LOC] - ScriptableObject asset
│   ├── BehaviorTreeSerializer.cs          [300 LOC] - JSON import/export
│   └── GraphViewStateSaver.cs             [150 LOC] - Save view state
├── Utilities/
│   ├── NodeRegistry.cs                    [200 LOC] - Auto-registration
│   ├── NodeStyler.cs                      [150 LOC] - USS styling
│   └── IconProvider.cs                    [100 LOC] - Node icons
└── Resources/
    └── BehaviorTreeStyles.uss             [300 LOC] - USS styles

Total Editor LOC: ~2,510 lines
Estimated Time: 3-4 weeks
```

**Key Decisions:**
- Extend Unity's `GraphView` class (don't reinvent the wheel)
- Use USS for styling (similar to web's CSS)
- Auto-discover node types via Reflection + Attributes
- Support undo/redo via Unity's `Undo` API

### 3. Testing (Priority: MEDIUM)

```
Tests/
├── Runtime/
│   ├── TreeNodeTests.cs         [300 LOC]
│   ├── CompositeNodesTests.cs   [400 LOC]
│   └── BlackboardTests.cs       [200 LOC]
└── Editor/
    ├── SerializationTests.cs    [250 LOC]
    └── NodeRegistryTests.cs     [150 LOC]

Total Test LOC: ~1,300 lines
Estimated Time: 1-2 weeks
```

---

## Implementation Phases

### Phase 1: Runtime Foundation (Week 1-3)

**Goal:** Working behavior tree execution without editor.

**Tasks:**
1. ✅ Create project structure
   - Runtime and Editor assembly definitions
   - Namespace organization
2. ✅ Implement core runtime classes
   - TreeNode abstract class
   - NodeStatus enum
   - BehaviorTree MonoBehaviour
   - Blackboard
3. ✅ Implement node types
   - 3 composites (Sequence, Selector, Parallel)
   - 3 decorators (Inverter, Repeater, Start)
   - 2 actions (Wait, base ActionNode)
4. ✅ Write unit tests
   - Test all node execution logic
   - Test blackboard operations
   - Test tree traversal
5. ✅ Create simple programmatic test scene
   - Build tree in code
   - Execute and verify

**Success Criteria:**
- Can create a tree programmatically
- Tree executes correctly
- All tests pass

**Risk:** Low - This is straightforward C# translation.

### Phase 2: Editor Foundation (Week 4-6)

**Goal:** Basic visual editor with node creation and connections.

**Tasks:**
1. ✅ Setup GraphView basics
   - Create BehaviorTreeEditorWindow
   - Create BehaviorTreeGraphView
   - Setup grid, zoom, pan
2. ✅ Implement node visualization
   - BehaviorTreeNode class
   - Port creation (input/output)
   - Node styling (colors by category)
3. ✅ Implement node registry
   - Auto-discover node types via Reflection
   - Attributes for metadata (icon, category, description)
4. ✅ Context menu for node creation
   - Search window integration
   - Category-based grouping
5. ✅ Basic serialization
   - BehaviorTreeAsset ScriptableObject
   - Save/load graph structure
   - Preserve node positions

**Success Criteria:**
- Can open editor window
- Can add nodes via context menu
- Can connect nodes
- Can save/load to asset
- Visual feedback works

**Risk:** Medium - Unity GraphView has learning curve, but well-documented.

### Phase 3: Advanced Editor Features (Week 7-9)

**Goal:** Polish and professional features.

**Tasks:**
1. ✅ Undo/redo integration
   - Use Unity's Undo API
   - Support all operations
2. ✅ Blackboard panel
   - View/edit variables
   - Type support (int, float, string, bool, Object)
3. ✅ Inspector panel
   - Show selected node properties
   - Edit parameters
4. ✅ Execution visualization
   - Highlight running nodes
   - Show success/failure states
   - Animation for node status changes
5. ✅ Import/Export
   - JSON export (compatible with web version)
   - JSON import with validation

**Success Criteria:**
- Undo/redo works flawlessly
- Can edit blackboard variables
- Can see execution in real-time
- Professional polish level

**Risk:** Medium - Execution visualization requires runtime → editor communication.

### Phase 4: User Experience & Documentation (Week 10-12)

**Goal:** Production-ready tool.

**Tasks:**
1. ✅ Script generation wizard
   - Create new ActionNode subclass
   - Template generation
2. ✅ USS styling refinement
   - Match web version aesthetics
   - Dark/light theme support
3. ✅ Documentation
   - Quick start guide
   - API documentation
   - Example projects
4. ✅ Sample library
   - Common action nodes
   - Example behavior trees
5. ✅ Performance optimization
   - Port caching (if needed)
   - Large graph handling
6. ✅ Final testing
   - Edge case testing
   - Performance testing
   - User testing

**Success Criteria:**
- Professional documentation
- Clear examples
- Optimized performance
- Ready for production use

**Risk:** Low - Polish phase, no major technical challenges.

---

## Complexity Breakdown

### Lines of Code Estimate

| Component | LOC | Complexity | Time |
|-----------|-----|------------|------|
| Runtime Core | 1,010 | Low | 2-3 weeks |
| Editor Core | 2,510 | Medium-High | 3-4 weeks |
| Testing | 1,300 | Low-Medium | 1-2 weeks |
| Documentation | 500 | Low | 1 week |
| **Total** | **5,320** | **Medium-High** | **8-12 weeks** |

### Complexity Factors

**Easy (Low Complexity):**
- ✅ Runtime node logic (direct TypeScript → C# translation)
- ✅ Basic data structures (blackboard, node status)
- ✅ Unit testing (Unity Test Framework is excellent)
- ✅ ScriptableObject serialization (Unity built-in)

**Moderate (Medium Complexity):**
- ⚠️ GraphView setup (learning curve, but well-documented)
- ⚠️ USS styling (similar to CSS but with quirks)
- ⚠️ Node registry with Reflection
- ⚠️ Undo/redo integration

**Challenging (High Complexity):**
- ⚠️ Runtime → Editor communication (execution visualization)
- ⚠️ Graph serialization with positions
- ⚠️ Port compatibility validation
- ⚠️ Connection routing and visual polish

**Removed Complexity (vs Web Version):**
- ✅ No custom rendering (GraphView handles it)
- ✅ No Monaco integration (Unity opens scripts)
- ✅ No viewport math (GraphView handles it)
- ✅ No custom context menu (Unity's search window)

---

## Design Decisions & Trade-offs

### 1. ScriptableObject vs MonoBehaviour for Nodes

**Decision:** Use ScriptableObject

**Rationale:**
- ✅ Serializable assets (can be reused)
- ✅ No GameObject overhead
- ✅ Can be created in editor
- ✅ Matches Unity's prefab philosophy
- ❌ Slightly more complex than MonoBehaviour

**Alternative:** MonoBehaviour nodes
- Would require GameObject per node
- More runtime overhead
- Less reusable

### 2. Code Editing: Monaco vs Unity Editor

**Decision:** Let Unity handle script editing

**Rationale:**
- ✅ Users already have preferred IDE
- ✅ Full IntelliSense support
- ✅ Debugging support
- ✅ No need to embed editor
- ✅ Professional workflow
- ❌ Can't edit inline (acceptable trade-off)

**Implementation:**
```csharp
// Double-click on ActionNode opens its C# script
void OnDoubleClick()
{
    if (node is ActionNode action)
    {
        AssetDatabase.OpenAsset(action.scriptAsset);
    }
}
```

### 3. Custom Nodes: Dynamic Code vs Subclassing

**Decision:** Use C# subclassing (not dynamic code)

**Web Version:**
```typescript
// User writes JavaScript code at runtime
actionNode.code = `
    blackboard.set('key', 'value');
    return NodeStatus.SUCCESS;
`;
```

**Unity Version:**
```csharp
// User creates C# subclass
[CreateAssetMenu(menuName = "My Game/Actions/CustomAction")]
public class CustomAction : ActionNode
{
    protected override NodeStatus OnExecute(Blackboard blackboard)
    {
        blackboard.Set("key", "value");
        return NodeStatus.Success;
    }
}
```

**Rationale:**
- ✅ Type-safe
- ✅ Debuggable
- ✅ Full C# features
- ✅ Better performance
- ✅ Unity standard practice
- ❌ Requires recompilation (acceptable)

### 4. Blackboard: Generic vs Typed

**Decision:** Generic Dictionary<string, object> with type helpers

**Implementation:**
```csharp
public class Blackboard : ScriptableObject
{
    [SerializeField]
    private SerializableDictionary<string, object> data;
    
    public void Set<T>(string key, T value)
    {
        data[key] = value;
    }
    
    public T Get<T>(string key, T defaultValue = default)
    {
        if (data.TryGetValue(key, out var value) && value is T typed)
            return typed;
        return defaultValue;
    }
}
```

**Rationale:**
- ✅ Flexible like web version
- ✅ Type-safe access
- ✅ Easy to use
- ⚠️ Boxing overhead (acceptable for AI)

### 5. GraphView: Custom vs Unity's

**Decision:** Extend Unity's GraphView

**Rationale:**
- ✅ Zoom/pan built-in
- ✅ Selection built-in
- ✅ Undo/redo support
- ✅ Serialization helpers
- ✅ Professional appearance
- ✅ Well-tested
- ❌ Less control (acceptable trade-off)

### 6. Styling: USS vs Procedural

**Decision:** Use USS (Unity Style Sheets)

**Rationale:**
- ✅ Similar to web's CSS
- ✅ Easy to tweak
- ✅ Theme support
- ✅ Designer-friendly
- ✅ Hot-reload in editor

**Example USS:**
```css
/* BehaviorTreeStyles.uss */
.node-composite {
    background-color: #4A90E2;
    border-color: #357ABD;
    border-width: 2px;
}

.node-decorator {
    background-color: #7B68EE;
    border-color: #6A5ACD;
}

.node-action {
    background-color: #50C878;
    border-color: #3CB371;
}

.node-running {
    border-color: #F1C40F;
    border-width: 3px;
}
```

---

## Minimal Feature Set

For a tight, high-quality initial release:

### Must-Have (MVP)
1. ✅ Runtime execution system
   - All node types (3 composites, 3 decorators, base action)
   - Blackboard
   - Tick-based execution
2. ✅ Visual editor
   - GraphView with nodes
   - Connection creation
   - Context menu for adding nodes
3. ✅ Serialization
   - Save/load to ScriptableObject asset
   - Preserve graph layout
4. ✅ Basic inspector
   - View node properties
   - Edit node name
5. ✅ Undo/redo
   - All operations reversible

### Should-Have (Polish)
1. ✅ Blackboard panel
   - View/edit variables
2. ✅ Execution visualization
   - Highlight running nodes
3. ✅ USS styling
   - Professional appearance
4. ✅ Documentation
   - Quick start guide
   - API reference

### Nice-to-Have (Future)
1. ⏳ JSON import/export (web compatibility)
2. ⏳ Debugger integration
3. ⏳ Performance profiler
4. ⏳ Node search/filter
5. ⏳ Minimap
6. ⏳ Custom node icons

### Explicitly Removed (Not Needed)
1. ❌ Monaco editor (Unity handles code editing)
2. ❌ Custom canvas renderer (GraphView handles)
3. ❌ Viewport math (GraphView handles)
4. ❌ Connection renderer (GraphView handles)
5. ❌ Grid renderer (GraphView handles)
6. ❌ Toast messages (Unity has Debug.Log)

---

## Risk Assessment

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| GraphView learning curve | Medium | Medium | Start with Unity samples, allocate time |
| Runtime→Editor communication | Medium | High | Use ScriptableObject events, EditorApplication.update |
| Serialization issues | Low | High | Use Unity's built-in, add tests early |
| Performance with large graphs | Low | Medium | Profile early, use spatial partitioning if needed |
| USS styling quirks | Low | Low | Reference Unity's samples, iterate |

### Scope Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Feature creep | High | High | Stick to minimal feature set, prioritize ruthlessly |
| Over-engineering | Medium | Medium | KISS principle, surgical changes only |
| Compatibility issues | Low | Medium | Test with Unity LTS versions |

### Schedule Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Underestimated complexity | Medium | High | Add 20% buffer, track progress weekly |
| Unity API changes | Low | Medium | Target LTS version (2022.3 or 2023.2) |
| Integration issues | Medium | Medium | Test early and often |

---

## Recommended Approach

### Step 1: Spike (2-3 days)
Before committing to full implementation:
1. Create minimal GraphView prototype
2. Create 1-2 runtime nodes
3. Test basic serialization
4. Validate architecture decisions

**Go/No-Go Decision Point:** If spike succeeds, proceed to full implementation.

### Step 2: Vertical Slice (1 week)
Build one complete feature end-to-end:
1. One composite node (Sequence)
2. One action node (Wait)
3. Visual editor with these 2 nodes
4. Save/load
5. Execute in play mode

**Success Criteria:** Can build and run a simple tree.

### Step 3: Horizontal Expansion (4-6 weeks)
Add remaining nodes and features:
1. Week 1-2: All runtime nodes + tests
2. Week 3-4: Full editor features
3. Week 5-6: Polish + documentation

### Step 4: Iteration (2-3 weeks)
User feedback and refinement:
1. Internal testing
2. Fix issues
3. Performance optimization
4. Documentation updates

---

## Implementation Guidelines

### Code Quality Standards
- ✅ Follow Unity C# coding conventions
- ✅ XML documentation for all public APIs
- ✅ Unit tests for runtime logic (>80% coverage)
- ✅ Clear separation: Runtime vs Editor assemblies
- ✅ No warnings, no errors

### Performance Targets
- ✅ Support 500+ nodes in editor (smooth editing)
- ✅ Support 100+ nodes at runtime (60 FPS)
- ✅ < 100ms save/load time for typical trees
- ✅ < 1ms per tick for typical trees

### Architectural Principles
1. **Separation of Concerns:** Runtime has NO editor dependencies
2. **KISS:** Use Unity's built-in tools where possible
3. **Testability:** All runtime logic must be unit-testable
4. **Extensibility:** Easy to add new node types
5. **Performance:** Profile early, optimize as needed

---

## Unity Version Requirements

**Minimum:** Unity 2022.3 LTS (recommended)
**Target:** Unity 2023.2+ (for latest GraphView features)

**Required Packages:**
```json
{
  "dependencies": {
    "com.unity.ui": "1.0.0",        // UI Toolkit
    "com.unity.test-framework": "1.3.0"  // Testing
  }
}
```

---

## File Structure

```
Assets/
└── BehaviorTree/
    ├── Runtime/
    │   ├── Core/
    │   │   ├── TreeNode.cs
    │   │   ├── NodeStatus.cs
    │   │   ├── NodeCategory.cs
    │   │   ├── BehaviorTree.cs
    │   │   └── Blackboard.cs
    │   ├── Nodes/
    │   │   ├── Composites/
    │   │   │   ├── SequenceNode.cs
    │   │   │   ├── SelectorNode.cs
    │   │   │   └── ParallelNode.cs
    │   │   ├── Decorators/
    │   │   │   ├── InverterNode.cs
    │   │   │   ├── RepeaterNode.cs
    │   │   │   └── StartNode.cs
    │   │   └── Actions/
    │   │       ├── ActionNode.cs
    │   │       ├── WaitNode.cs
    │   │       └── ConditionalNode.cs
    │   └── BehaviorTree.Runtime.asmdef
    ├── Editor/
    │   ├── Graph/
    │   │   ├── BehaviorTreeGraphView.cs
    │   │   ├── BehaviorTreeNode.cs
    │   │   ├── BehaviorTreeEdge.cs
    │   │   └── NodeSearchWindow.cs
    │   ├── Windows/
    │   │   ├── BehaviorTreeEditorWindow.cs
    │   │   ├── BlackboardView.cs
    │   │   └── InspectorView.cs
    │   ├── Serialization/
    │   │   ├── BehaviorTreeAsset.cs
    │   │   ├── BehaviorTreeSerializer.cs
    │   │   └── GraphViewStateSaver.cs
    │   ├── Utilities/
    │   │   ├── NodeRegistry.cs
    │   │   ├── NodeStyler.cs
    │   │   └── IconProvider.cs
    │   ├── Resources/
    │   │   └── BehaviorTreeStyles.uss
    │   └── BehaviorTree.Editor.asmdef
    ├── Tests/
    │   ├── Runtime/
    │   │   ├── TreeNodeTests.cs
    │   │   ├── CompositeNodesTests.cs
    │   │   ├── DecoratorNodesTests.cs
    │   │   └── BlackboardTests.cs
    │   └── Editor/
    │       ├── SerializationTests.cs
    │       └── NodeRegistryTests.cs
    └── Documentation~/
        ├── QuickStart.md
        ├── API.md
        └── Examples.md
```

---

## Comparison: Web vs Unity

| Feature | Web Implementation | Unity Implementation | Complexity |
|---------|-------------------|---------------------|------------|
| **Rendering** | Custom Canvas API | GraphView (built-in) | ⬇️ Much Simpler |
| **Nodes** | TypeScript classes | ScriptableObjects | ➡️ Similar |
| **Execution** | Tick loop | MonoBehaviour Update | ➡️ Similar |
| **Code Editing** | Monaco embedded | External IDE | ⬇️ Simpler |
| **Connections** | Custom rendering | GraphView edges | ⬇️ Much Simpler |
| **Serialization** | JSON + localStorage | ScriptableObject + JSON | ➡️ Similar |
| **Undo/Redo** | Custom Operation pattern | Unity's Undo API | ⬇️ Simpler |
| **Styling** | CSS | USS | ➡️ Similar |
| **Testing** | Vitest | Unity Test Framework | ➡️ Similar |

**Overall:** Unity version is 30-40% less code due to built-in GraphView features.

---

## Conclusion

### Feasibility: ✅ Highly Feasible

The port to Unity is very achievable and will result in a cleaner, more maintainable solution than the web version in many ways. Unity's GraphView provides excellent out-of-the-box functionality for node editing, and C#'s type safety will catch many bugs at compile time.

### Recommended Timeline: 8-12 weeks

- **Week 1-3:** Runtime foundation
- **Week 4-6:** Editor foundation
- **Week 7-9:** Advanced features
- **Week 10-12:** Polish & documentation

### Key Success Factors

1. ✅ **Start with a spike** (2-3 days) to validate GraphView approach
2. ✅ **Build vertical slice** (1 week) to prove end-to-end flow
3. ✅ **Strict scope control** - resist feature creep
4. ✅ **Test early and often** - especially runtime logic
5. ✅ **Leverage Unity's tools** - don't reinvent the wheel

### Effort Distribution

```
Runtime Logic:        25% (Straightforward C# translation)
GraphView Editor:     40% (Learning curve, but well-supported)
Serialization:        10% (Unity's built-in + JSON)
Testing:             15% (Critical for quality)
Documentation:       10% (Essential for adoption)
```

### Risk Level: Medium

Most risks are manageable with proper planning and spikes. The GraphView learning curve is the primary technical challenge, but Unity's documentation and community support are excellent.

### Recommendation: Proceed with Implementation

This is a well-scoped project with clear architecture, reasonable complexity, and high value. The existing web implementation provides a solid blueprint, and Unity's tools will simplify many aspects.

**Next Steps:**
1. Create Unity project
2. Setup assembly definitions
3. Implement vertical slice (1 week)
4. Review and iterate

---

## Appendix: Key Unity APIs

### GraphView
```csharp
using UnityEditor.Experimental.GraphView;

// Main classes:
- GraphView              // Base graph container
- Node                   // Visual node representation
- Port                   // Input/output connection points
- Edge                   // Visual connection
- GridBackground         // Grid rendering
- MiniMap               // Minimap view

// Manipulators:
- ContentZoomer         // Zoom with mouse wheel
- ContentDragger        // Pan with middle mouse
- SelectionDragger      // Drag selected nodes
- RectangleSelector     // Box select
```

### UI Toolkit
```csharp
using UnityEngine.UIElements;

// Core classes:
- VisualElement         // Base UI element
- Button, Label, etc.   // Standard controls
- USS (Unity Style Sheets) // Styling

// Layout:
- Flexbox (similar to CSS)
```

### Serialization
```csharp
using UnityEngine;
using UnityEditor;

// Core classes:
- ScriptableObject      // Serializable asset
- JsonUtility          // JSON serialization
- EditorJsonUtility    // Editor-safe JSON
```

### Undo System
```csharp
using UnityEditor;

// Key APIs:
- Undo.RecordObject()           // Record state before change
- Undo.RegisterCreatedObjectUndo() // Track new objects
- Undo.DestroyObjectImmediate() // Undoable delete
```

---

## References

1. **Unity GraphView Documentation**
   - https://docs.unity3d.com/Manual/UIE-Graph-View.html

2. **Unity UI Toolkit**
   - https://docs.unity3d.com/Manual/UIElements.html

3. **Unity USS Styling**
   - https://docs.unity3d.com/Manual/UIE-USS.html

4. **Unity Dialogue Graph Sample**
   - Good reference for GraphView implementation
   - https://github.com/Unity-Technologies/UnityCsReference/tree/master/Modules/GraphViewEditor

5. **Unity Test Framework**
   - https://docs.unity3d.com/Packages/com.unity.test-framework@latest

---

**Document Version:** 1.0  
**Date:** 2025-11-01  
**Author:** AI Code Agent  
**Status:** Ready for Review
