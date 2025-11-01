# Architecture Comparison: Web vs Unity

This document provides a visual comparison of the architectures.

---

## High-Level Architecture

### Web Version (Current)

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser Environment                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              User Interface (HTML/CSS)                │   │
│  │                                                        │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │   │
│  │  │ Toolbar  │  │Inspector │  │  Settings Panel  │   │   │
│  │  └──────────┘  └──────────┘  └──────────────────┘   │   │
│  │                                                        │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │           Canvas (2D Rendering)                │  │   │
│  │  │  • Custom node rendering                       │  │   │
│  │  │  • Custom connection rendering                 │  │   │
│  │  │  • Manual viewport management                  │  │   │
│  │  │  • Grid rendering                              │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │                                                        │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │         Monaco Editor (Code Editing)           │  │   │
│  │  │  • Embedded in browser                         │  │   │
│  │  │  • JavaScript code editing                     │  │   │
│  │  │  • Syntax highlighting                         │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         TypeScript Application Logic                  │   │
│  │                                                        │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │ Editor State Management                        │  │   │
│  │  │  • EditorState                                 │  │   │
│  │  │  • Operation History (Undo/Redo)              │  │   │
│  │  │  • Selection Manager                           │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │                                                        │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │ Core Behavior Tree Runtime                     │  │   │
│  │  │  • TreeNode (base class)                       │  │   │
│  │  │  • BehaviorTree (orchestrator)                 │  │   │
│  │  │  • NodeRegistry (factory)                      │  │   │
│  │  │  • Blackboard (shared state)                   │  │   │
│  │  │  • NodeExecutor (eval JavaScript code)         │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │                                                        │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │ Node Implementations                           │  │   │
│  │  │  • Composites (Sequence, Selector, Parallel)  │  │   │
│  │  │  • Decorators (Inverter, Repeater, etc.)      │  │   │
│  │  │  • Actions (ActionNode, Wait, GoTo)           │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Data Persistence                         │   │
│  │  • localStorage (auto-save)                          │   │
│  │  • JSON export/import                                │   │
│  │  • Custom node catalog                               │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Unity Version (Target)

```
┌─────────────────────────────────────────────────────────────┐
│                      Unity Editor                             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Unity Editor Window (UI Toolkit)              │   │
│  │                                                        │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │   │
│  │  │ Toolbar  │  │Inspector │  │ Blackboard Panel │   │   │
│  │  └──────────┘  └──────────┘  └──────────────────┘   │   │
│  │                                                        │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │      GraphView (Built-in Unity Component)      │  │   │
│  │  │  ✅ Node rendering (automatic)                 │  │   │
│  │  │  ✅ Connection rendering (automatic)           │  │   │
│  │  │  ✅ Viewport management (automatic)            │  │   │
│  │  │  ✅ Grid rendering (automatic)                 │  │   │
│  │  │  ✅ Zoom/Pan/Select (automatic)                │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │                                                        │   │
│  │  ❌ No Monaco Editor Needed!                          │   │
│  │  ✅ Double-click opens Visual Studio/Rider           │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           C# Editor Scripts (Editor Assembly)         │   │
│  │                                                        │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │ Graph View Components                          │  │   │
│  │  │  • BehaviorTreeGraphView                       │  │   │
│  │  │  • BehaviorTreeNode (visual)                   │  │   │
│  │  │  • NodeSearchWindow                            │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │                                                        │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │ Editor Utilities                               │  │   │
│  │  │  • NodeRegistry (reflection-based)             │  │   │
│  │  │  • BehaviorTreeSerializer                      │  │   │
│  │  │  • USS Styler                                  │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ References (Editor → Runtime)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Unity Runtime (Runtime Assembly)             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         C# Runtime Scripts (Works in Builds!)         │   │
│  │                                                        │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │ Core Behavior Tree Runtime                     │  │   │
│  │  │  • TreeNode (ScriptableObject)                 │  │   │
│  │  │  • BehaviorTree (MonoBehaviour)                │  │   │
│  │  │  • Blackboard (ScriptableObject)               │  │   │
│  │  │  • NodeStatus (enum)                           │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │                                                        │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │ Node Implementations                           │  │   │
│  │  │  • Composites (Sequence, Selector, Parallel)  │  │   │
│  │  │  • Decorators (Inverter, Repeater, etc.)      │  │   │
│  │  │  • ActionNode (base class)                    │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │                                                        │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │ User-Defined Actions (User's C# Scripts)      │  │   │
│  │  │  • PatrolAction : ActionNode                   │  │   │
│  │  │  • AttackAction : ActionNode                   │  │   │
│  │  │  • FleeAction : ActionNode                     │  │   │
│  │  │  • etc...                                      │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Data Persistence                         │   │
│  │  • ScriptableObject assets (.asset files)            │   │
│  │  • JSON export/import (optional)                     │   │
│  │  • EditorPrefs (editor preferences)                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Mapping

### Runtime Components

| Web (TypeScript) | Unity (C#) | Notes |
|------------------|------------|-------|
| `TreeNode` (class) | `TreeNode` (ScriptableObject) | Asset-based |
| `BehaviorTree` (class) | `BehaviorTree` (MonoBehaviour) | Attached to GameObject |
| `Blackboard` (class) | `Blackboard` (ScriptableObject) | Serializable asset |
| `NodeStatus` (enum) | `NodeStatus` (enum) | Direct port |
| `NodeExecutor` (eval JS) | ❌ Removed | C# subclassing instead |

### Editor Components

| Web (TypeScript) | Unity (C#) | Notes |
|------------------|------------|-------|
| Custom Canvas rendering | `GraphView` (built-in) | ⬇️ ~1000 LOC saved |
| Monaco Editor | ❌ Removed | IDE handles editing |
| `EditorState` | `BehaviorTreeGraphView` | GraphView manages state |
| `OperationHistory` | `Undo` API (built-in) | ⬇️ ~200 LOC saved |
| CSS styling | USS (Unity Style Sheets) | Similar syntax |
| `NodeRenderer` | `Node` (GraphView) | Built-in rendering |
| `ConnectionRenderer` | `Edge` (GraphView) | Built-in rendering |

---

## Data Flow Comparison

### Web Version: Code Execution

```
User Action (Editor)
       │
       ▼
┌──────────────────┐
│ Monaco Editor    │ ← User writes JavaScript code
│  (in browser)    │
└──────────────────┘
       │
       ▼ Save code as string
┌──────────────────┐
│  ActionNode      │
│  code: string    │ ← Stored as JavaScript string
└──────────────────┘
       │
       ▼ Runtime execution
┌──────────────────┐
│ NodeExecutor     │
│ eval(code)       │ ← Dynamically evaluates JavaScript
└──────────────────┘
       │
       ▼
    Result
```

### Unity Version: Code Execution

```
User Action (Editor)
       │
       ▼
┌──────────────────┐
│ Visual Studio    │ ← User writes C# code
│  (External IDE)  │
└──────────────────┘
       │
       ▼ Compile
┌──────────────────┐
│ MyAction.cs      │ ← Compiled C# class
│ : ActionNode     │
└──────────────────┘
       │
       ▼ Unity compiles
┌──────────────────┐
│ MyAction.dll     │ ← Compiled assembly
│ (in build)       │
└──────────────────┘
       │
       ▼ Runtime execution
┌──────────────────┐
│ MyAction         │
│ OnExecute()      │ ← Direct method call (no eval)
└──────────────────┘
       │
       ▼
    Result

Benefits:
✅ Type-safe (compile-time checks)
✅ Faster (no interpretation)
✅ Debuggable (breakpoints work)
✅ IntelliSense (full IDE support)
```

---

## Serialization Comparison

### Web Version

```json
{
  "version": "1.2",
  "tree": {
    "nodes": [
      {
        "id": "node-123",
        "type": "action",
        "label": "My Action",
        "position": { "x": 100, "y": 200 },
        "code": "blackboard.set('key', 'value');\nreturn NodeStatus.SUCCESS;",
        "children": []
      }
    ]
  },
  "customNodes": [
    {
      "type": "custom_walk",
      "label": "Walk",
      "code": "// Custom walk logic...",
      "version": 1
    }
  ]
}
```

### Unity Version

```json
{
  "version": "1.0",
  "tree": {
    "nodes": [
      {
        "id": "node-123",
        "type": "MyWalkAction",
        "label": "Walk Action",
        "position": { "x": 100, "y": 200 },
        "scriptPath": "Assets/Scripts/AI/MyWalkAction.cs",
        "children": []
      }
    ]
  }
}
```

**Key Difference:** Unity stores reference to C# script, not code string.

---

## Node Type System

### Web Version: Dynamic Registration

```typescript
// At startup, register node types
NodeRegistry.register({
    type: 'sequence',
    category: 'composite',
    label: 'Sequence',
    description: 'Execute children until one fails',
    icon: 'fa-arrow-right',
    factory: () => new SequenceNode(),
    tags: ['composite', 'control', 'sequence']
});

// For custom nodes, user defines code at runtime:
const customNode = new CustomActionNode('my_action', 'My Action', 
    'blackboard.set("x", 1); return NodeStatus.SUCCESS;'
);
```

### Unity Version: Reflection-based Discovery

```csharp
// Nodes auto-discovered via Reflection
[CreateAssetMenu(menuName = "BehaviorTree/Sequence")]
[NodeInfo(
    Category = NodeCategory.Composite,
    Description = "Execute children until one fails",
    Icon = "sequence_icon"
)]
public class SequenceNode : TreeNode
{
    // Implementation...
}

// For custom nodes, user creates C# subclass:
[CreateAssetMenu(menuName = "MyGame/AI/Walk Action")]
public class MyWalkAction : ActionNode
{
    protected override NodeStatus OnExecute(Blackboard blackboard)
    {
        blackboard.Set("x", 1);
        return NodeStatus.Success;
    }
}

// Editor automatically discovers this via:
var nodeTypes = TypeCache.GetTypesDerivedFrom<TreeNode>();
```

---

## Execution Model

### Web Version: Tick Loop

```typescript
class BehaviorTree {
    private tickInterval: number;
    private tickRate: number = 10; // ticks per second
    
    start() {
        this.tickInterval = setInterval(() => {
            this.tick();
        }, 1000 / this.tickRate);
    }
    
    tick() {
        if (this.root) {
            const status = this.root.tick(this.blackboard);
            // ... handle status
        }
    }
}
```

### Unity Version: MonoBehaviour Update

```csharp
public class BehaviorTree : MonoBehaviour
{
    public TreeNode rootNode;
    public Blackboard blackboard;
    public float tickRate = 10f;
    
    private float tickTimer;
    
    void Update()
    {
        tickTimer += Time.deltaTime;
        if (tickTimer >= 1f / tickRate)
        {
            Tick();
            tickTimer = 0;
        }
    }
    
    NodeStatus Tick()
    {
        if (rootNode != null)
        {
            return rootNode.Tick(blackboard);
        }
        return NodeStatus.Idle;
    }
}
```

**Similar execution model, but Unity's Update() provides the game loop.**

---

## Port Complexity Analysis

### Features Removed (Simpler)

| Feature | LOC Saved | Complexity Removed |
|---------|-----------|-------------------|
| Monaco Editor integration | ~500 | High |
| Custom canvas rendering | ~800 | High |
| Custom viewport management | ~200 | Medium |
| Connection rendering | ~150 | Medium |
| Grid rendering | ~100 | Low |
| Custom undo/redo system | ~200 | Medium |
| **Total Removed** | **~1950** | **Significant** |

### Features Added (Unity-Specific)

| Feature | LOC Added | Complexity Added |
|---------|-----------|------------------|
| ScriptableObject serialization | ~150 | Low |
| GraphView integration | ~400 | Medium |
| USS styling | ~200 | Low |
| Assembly definition setup | ~0 | Low |
| **Total Added** | **~750** | **Manageable** |

### Net Complexity

**Web Version:** ~5,000 LOC  
**Unity Version:** ~3,800 LOC  
**Reduction:** ~24% less code

---

## Side-by-Side: Creating a Node

### Web Version

```typescript
// 1. Define node class
export class PatrolNode extends ActionNode {
    constructor() {
        super('patrol', 'Patrol');
        this.code = `
            const waypoints = blackboard.get('waypoints') || [];
            const currentIndex = blackboard.get('patrolIndex') || 0;
            
            // Move to waypoint logic...
            blackboard.set('patrolIndex', (currentIndex + 1) % waypoints.length);
            
            return NodeStatus.SUCCESS;
        `;
    }
}

// 2. Register in NodeRegistry
NodeRegistry.register({
    type: 'patrol',
    category: 'leaf',
    label: 'Patrol',
    description: 'Patrol between waypoints',
    icon: 'fa-route',
    factory: () => new PatrolNode(),
    tags: ['action', 'movement', 'patrol']
});

// 3. Use in editor
// User right-clicks canvas → selects "Patrol" → node created
// User double-clicks node → Monaco editor opens with code
```

### Unity Version

```csharp
// 1. Define node class in separate C# file
// Assets/Scripts/AI/Actions/PatrolAction.cs
using UnityEngine;

[CreateAssetMenu(menuName = "AI/Actions/Patrol")]
public class PatrolAction : ActionNode
{
    [SerializeField] private Transform[] waypoints;
    private int currentIndex = 0;
    
    protected override NodeStatus OnExecute(Blackboard blackboard)
    {
        var agent = blackboard.Get<NavMeshAgent>("agent");
        
        if (agent.remainingDistance < 0.5f)
        {
            currentIndex = (currentIndex + 1) % waypoints.Length;
            agent.SetDestination(waypoints[currentIndex].position);
        }
        
        return NodeStatus.Running;
    }
}

// 2. NO registration needed - auto-discovered via Reflection!

// 3. Use in editor
// User right-clicks canvas → searches "Patrol" → node created
// User double-clicks node → Visual Studio opens PatrolAction.cs
```

**Unity is cleaner:** No manual registration, full IDE support, type-safe.

---

## Assembly Structure

### Unity Assembly Definitions

```
Assets/BehaviorTree/
├── Runtime/
│   └── BehaviorTree.Runtime.asmdef
│       {
│         "name": "BehaviorTree.Runtime",
│         "references": [],
│         "includePlatforms": [],
│         "excludePlatforms": []
│       }
│
└── Editor/
    └── BehaviorTree.Editor.asmdef
        {
          "name": "BehaviorTree.Editor",
          "references": ["BehaviorTree.Runtime"],
          "includePlatforms": ["Editor"],
          "excludePlatforms": []
        }
```

**Critical:** Runtime assembly has NO editor dependencies. This ensures:
- ✅ Runtime code works in builds
- ✅ Faster compilation
- ✅ Clear separation of concerns
- ✅ No editor bloat in builds

---

## Key Takeaways

### What Makes Unity Version Simpler

1. **GraphView handles most editor work:**
   - Node rendering
   - Connection rendering
   - Viewport management
   - Selection/dragging
   - Undo/redo basics

2. **No embedded code editor needed:**
   - Unity opens external IDE
   - Full debugging support
   - IntelliSense works
   - Type safety

3. **Built-in serialization:**
   - ScriptableObject handles it
   - No custom JSON parsing for nodes
   - AssetDatabase integration

4. **Type safety:**
   - Compile-time error checking
   - No runtime eval() errors
   - Refactoring works

### What's More Complex in Unity

1. **Learning GraphView API:**
   - Medium learning curve
   - Good documentation
   - Many samples available

2. **Assembly definitions:**
   - Must separate Runtime/Editor
   - Critical for builds

3. **USS styling:**
   - Similar to CSS but different
   - Hot-reload helps

### Overall Assessment

**Unity version is 20-30% simpler** due to built-in tooling, with the added benefit of:
- ✅ Better performance (no eval)
- ✅ Better debugging
- ✅ Better IDE support
- ✅ Type safety
- ✅ Professional workflow

---

## Recommended Reading Order

1. Read this document first (architecture overview)
2. Read `UNITY_PORT_ANALYSIS.md` (detailed analysis)
3. Read `UNITY_QUICK_START.md` (implementation guide)
4. Start implementing!

---

**Document Version:** 1.0  
**Date:** 2025-11-01  
**Status:** Complete
