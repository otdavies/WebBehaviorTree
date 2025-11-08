# Unity Port - Quick Start Implementation Guide

This is a condensed, practical guide for implementing the Unity port. See `UNITY_PORT_ANALYSIS.md` for comprehensive analysis.

---

## TL;DR - What You Need to Know

**Complexity:** Medium-High (8-12 weeks)  
**Primary Challenge:** Learning Unity's GraphView API  
**Good News:** Unity handles 70% of the editor work for us  
**Bad News:** Runtime logic still needs full implementation

**Key Insight:** The web version's Monaco editor integration is NOT needed - Unity opens scripts automatically when you double-click nodes. This eliminates ~500 LOC and significant complexity.

---

## Architecture at a Glance

```
Web Version                    Unity Version
═══════════════               ═══════════════

TypeScript Classes      →     C# ScriptableObjects
Canvas API             →     GraphView (built-in!)
Monaco Editor          →     Visual Studio/Rider (no integration needed!)
HTML/CSS               →     USS (similar syntax)
localStorage           →     ScriptableObject assets + EditorPrefs
JSON serialization     →     Unity's JsonUtility + ScriptableObject
```

---

## Critical Design Decisions

### 1. Node Implementation: ScriptableObject (Not MonoBehaviour)

**Why:** Reusable, serializable assets. Can be shared between behavior trees.

```csharp
// ✅ Correct - Runtime/Core/TreeNode.cs
public abstract class TreeNode : ScriptableObject
{
    public string id;
    public string displayName;
    public List<TreeNode> children;
    
    public abstract NodeStatus Tick(Blackboard blackboard);
}

// ❌ Wrong - Don't use MonoBehaviour for nodes
public abstract class TreeNode : MonoBehaviour { } // NO!
```

### 2. Code Editing: External IDE (Not Embedded)

**Web Version:**
```typescript
// User edits code in Monaco editor
actionNode.code = `
    blackboard.set('key', 'value');
    return NodeStatus.SUCCESS;
`;
```

**Unity Version:**
```csharp
// User creates C# script and double-clicks in editor
[CreateAssetMenu(menuName = "AI/Actions/Custom Action")]
public class MyCustomAction : ActionNode
{
    protected override NodeStatus OnExecute(Blackboard blackboard)
    {
        blackboard.Set("key", "value");
        return NodeStatus.Success;
    }
}

// Editor automatically opens script in IDE on double-click
// No embedded code editor needed!
```

**Why:** 
- ✅ Full IDE features (IntelliSense, debugging, refactoring)
- ✅ Type safety at compile time
- ✅ Better performance
- ✅ No security concerns with dynamic code
- ✅ Professional workflow

### 3. Runtime Assembly: ZERO Editor Dependencies

**Critical:** Runtime code must work in builds without UnityEditor.

```csharp
// Runtime/BehaviorTree.Runtime.asmdef
{
    "name": "BehaviorTree.Runtime",
    "references": [],  // NO EDITOR REFERENCES!
    "includePlatforms": [],
    "excludePlatforms": [],
    "allowUnsafeCode": false
}

// Editor/BehaviorTree.Editor.asmdef
{
    "name": "BehaviorTree.Editor",
    "references": ["BehaviorTree.Runtime"],
    "includePlatforms": ["Editor"],  // Editor only!
    "allowUnsafeCode": false
}
```

---

## Phase 1: Runtime (Week 1-3)

### Minimal Working Example

```csharp
// 1. Runtime/Core/NodeStatus.cs
public enum NodeStatus { Idle, Running, Success, Failure }

// 2. Runtime/Core/TreeNode.cs
public abstract class TreeNode : ScriptableObject
{
    public string id = System.Guid.NewGuid().ToString();
    public List<TreeNode> children = new List<TreeNode>();
    
    public abstract NodeStatus Tick(Blackboard blackboard);
    
    public void AddChild(TreeNode child) => children.Add(child);
}

// 3. Runtime/Nodes/SequenceNode.cs
[CreateAssetMenu(menuName = "BehaviorTree/Sequence")]
public class SequenceNode : TreeNode
{
    public override NodeStatus Tick(Blackboard blackboard)
    {
        foreach (var child in children)
        {
            var status = child.Tick(blackboard);
            if (status == NodeStatus.Failure) return NodeStatus.Failure;
            if (status == NodeStatus.Running) return NodeStatus.Running;
        }
        return NodeStatus.Success;
    }
}

// 4. Runtime/Core/BehaviorTree.cs
public class BehaviorTree : MonoBehaviour
{
    public TreeNode rootNode;
    public Blackboard blackboard;
    public float tickRate = 10f;
    
    private float timer;
    
    void Update()
    {
        timer += Time.deltaTime;
        if (timer >= 1f / tickRate)
        {
            rootNode?.Tick(blackboard);
            timer = 0;
        }
    }
}

// 5. Runtime/Core/Blackboard.cs
[CreateAssetMenu(menuName = "BehaviorTree/Blackboard")]
public class Blackboard : ScriptableObject
{
    [System.Serializable]
    public class Entry
    {
        public string key;
        public string valueJson;
        public string typeName;
    }
    
    [SerializeField] private List<Entry> entries = new List<Entry>();
    private Dictionary<string, object> runtime = new Dictionary<string, object>();
    
    public void Set<T>(string key, T value)
    {
        runtime[key] = value;
    }
    
    public T Get<T>(string key, T defaultValue = default)
    {
        return runtime.TryGetValue(key, out var value) && value is T typed 
            ? typed : defaultValue;
    }
}
```

**Test it:**
```csharp
// Tests/Runtime/SequenceNodeTests.cs
[Test]
public void SequenceNode_AllChildrenSucceed_ReturnsSuccess()
{
    var sequence = ScriptableObject.CreateInstance<SequenceNode>();
    var child1 = ScriptableObject.CreateInstance<SuccessNode>();
    var child2 = ScriptableObject.CreateInstance<SuccessNode>();
    
    sequence.AddChild(child1);
    sequence.AddChild(child2);
    
    var blackboard = ScriptableObject.CreateInstance<Blackboard>();
    var result = sequence.Tick(blackboard);
    
    Assert.AreEqual(NodeStatus.Success, result);
}
```

---

## Phase 2: Editor Foundation (Week 4-6)

### Minimal GraphView Editor

```csharp
// Editor/BehaviorTreeEditorWindow.cs
using UnityEditor;
using UnityEngine;
using UnityEngine.UIElements;
using UnityEditor.Experimental.GraphView;

public class BehaviorTreeEditorWindow : EditorWindow
{
    [MenuItem("Window/Behavior Tree Editor")]
    public static void ShowWindow()
    {
        var window = GetWindow<BehaviorTreeEditorWindow>();
        window.titleContent = new GUIContent("Behavior Tree");
    }
    
    private BehaviorTreeGraphView graphView;
    
    private void CreateGUI()
    {
        // Create graph view
        graphView = new BehaviorTreeGraphView();
        graphView.StretchToParentSize();
        rootVisualElement.Add(graphView);
        
        // Add toolbar
        var toolbar = new Toolbar();
        toolbar.Add(new Button(SaveAsset) { text = "Save" });
        toolbar.Add(new Button(LoadAsset) { text = "Load" });
        rootVisualElement.Insert(0, toolbar);
    }
    
    private void SaveAsset() { /* ... */ }
    private void LoadAsset() { /* ... */ }
}

// Editor/BehaviorTreeGraphView.cs
using UnityEditor.Experimental.GraphView;
using UnityEngine;
using UnityEngine.UIElements;

public class BehaviorTreeGraphView : GraphView
{
    public BehaviorTreeGraphView()
    {
        // Setup manipulators (zoom, pan, drag, select)
        SetupZoom(ContentZoomer.DefaultMinScale, ContentZoomer.DefaultMaxScale);
        this.AddManipulator(new ContentDragger());
        this.AddManipulator(new SelectionDragger());
        this.AddManipulator(new RectangleSelector());
        
        // Add grid background
        var grid = new GridBackground();
        Insert(0, grid);
        grid.StretchToParentSize();
        
        // Context menu for creating nodes
        this.AddManipulator(new ContextualMenuManipulator(BuildContextMenu));
    }
    
    private void BuildContextMenu(ContextualMenuPopulateEvent evt)
    {
        var mousePos = this.ChangeCoordinatesTo(contentViewContainer, evt.localMousePosition);
        
        evt.menu.AppendAction("Create/Sequence Node", 
            _ => CreateNode<SequenceNode>(mousePos));
        evt.menu.AppendAction("Create/Selector Node", 
            _ => CreateNode<SelectorNode>(mousePos));
        evt.menu.AppendAction("Create/Action Node", 
            _ => CreateNode<ActionNode>(mousePos));
    }
    
    private void CreateNode<T>(Vector2 position) where T : TreeNode
    {
        var node = ScriptableObject.CreateInstance<T>();
        var visualNode = new BehaviorTreeNode(node);
        visualNode.SetPosition(new Rect(position, Vector2.zero));
        AddElement(visualNode);
    }
    
    public override List<Port> GetCompatiblePorts(Port startPort, NodeAdapter nodeAdapter)
    {
        // Return compatible ports for connections
        return ports.ToList().Where(endPort =>
            endPort.direction != startPort.direction &&
            endPort.node != startPort.node
        ).ToList();
    }
}

// Editor/BehaviorTreeNode.cs
using UnityEditor.Experimental.GraphView;
using UnityEngine;

public class BehaviorTreeNode : Node
{
    public TreeNode runtimeNode;
    
    public BehaviorTreeNode(TreeNode node)
    {
        this.runtimeNode = node;
        this.title = node.displayName;
        
        // Create input port (parent connection)
        var inputPort = InstantiatePort(Orientation.Vertical, Direction.Input, 
            Port.Capacity.Single, typeof(TreeNode));
        inputPort.portName = "Parent";
        inputContainer.Add(inputPort);
        
        // Create output ports (child connections)
        if (node is SequenceNode || node is SelectorNode)
        {
            var outputPort = InstantiatePort(Orientation.Vertical, Direction.Output, 
                Port.Capacity.Multi, typeof(TreeNode));
            outputPort.portName = "Children";
            outputContainer.Add(outputPort);
        }
        
        // Style based on type
        if (node is SequenceNode || node is SelectorNode)
            AddToClassList("composite-node");
        else if (node is ActionNode)
            AddToClassList("action-node");
        
        // Double-click to edit script
        RegisterCallback<MouseDownEvent>(OnDoubleClick);
        
        RefreshExpandedState();
        RefreshPorts();
    }
    
    private void OnDoubleClick(MouseDownEvent evt)
    {
        if (evt.clickCount == 2)
        {
            // Open the script in IDE
            var script = MonoScript.FromScriptableObject(runtimeNode);
            AssetDatabase.OpenAsset(script);
        }
    }
}
```

### USS Styling

```css
/* Editor/Resources/BehaviorTreeStyles.uss */

.composite-node {
    background-color: #4A90E2;
    border-color: #357ABD;
    border-width: 2px;
    border-radius: 5px;
}

.action-node {
    background-color: #50C878;
    border-color: #3CB371;
    border-width: 2px;
    border-radius: 5px;
}

.decorator-node {
    background-color: #7B68EE;
    border-color: #6A5ACD;
    border-width: 2px;
    border-radius: 5px;
}

/* Running state */
.node-running {
    border-color: #F1C40F;
    border-width: 4px;
}

/* Success state */
.node-success {
    border-color: #27AE60;
    border-width: 4px;
}

/* Failure state */
.node-failure {
    border-color: #E74C3C;
    border-width: 4px;
}
```

---

## Phase 3: Serialization (Week 7-8)

### Asset-based Persistence

```csharp
// Editor/BehaviorTreeAsset.cs
[CreateAssetMenu(menuName = "BehaviorTree/Behavior Tree Asset")]
public class BehaviorTreeAsset : ScriptableObject
{
    [System.Serializable]
    public class NodeData
    {
        public string id;
        public string type;
        public string displayName;
        public Vector2 position;
        public List<string> childIds;
    }
    
    [System.Serializable]
    public class EdgeData
    {
        public string parentId;
        public string childId;
    }
    
    public List<NodeData> nodes = new List<NodeData>();
    public List<EdgeData> edges = new List<EdgeData>();
    public string rootNodeId;
    
    public void SaveGraph(BehaviorTreeGraphView graphView)
    {
        nodes.Clear();
        edges.Clear();
        
        // Save nodes
        foreach (var element in graphView.graphElements)
        {
            if (element is BehaviorTreeNode btNode)
            {
                var nodeData = new NodeData
                {
                    id = btNode.runtimeNode.id,
                    type = btNode.runtimeNode.GetType().Name,
                    displayName = btNode.runtimeNode.displayName,
                    position = btNode.GetPosition().position
                };
                nodes.Add(nodeData);
            }
        }
        
        // Save connections
        foreach (var element in graphView.graphElements)
        {
            if (element is Edge edge)
            {
                var parentNode = edge.output.node as BehaviorTreeNode;
                var childNode = edge.input.node as BehaviorTreeNode;
                
                if (parentNode != null && childNode != null)
                {
                    edges.Add(new EdgeData
                    {
                        parentId = parentNode.runtimeNode.id,
                        childId = childNode.runtimeNode.id
                    });
                }
            }
        }
        
        EditorUtility.SetDirty(this);
        AssetDatabase.SaveAssets();
    }
    
    public void LoadGraph(BehaviorTreeGraphView graphView)
    {
        // Clear existing graph
        graphView.DeleteElements(graphView.graphElements);
        
        // Create nodes
        var nodeMap = new Dictionary<string, BehaviorTreeNode>();
        foreach (var nodeData in nodes)
        {
            var runtimeNode = CreateNodeByTypeName(nodeData.type);
            runtimeNode.id = nodeData.id;
            runtimeNode.displayName = nodeData.displayName;
            
            var visualNode = new BehaviorTreeNode(runtimeNode);
            visualNode.SetPosition(new Rect(nodeData.position, Vector2.zero));
            graphView.AddElement(visualNode);
            
            nodeMap[nodeData.id] = visualNode;
        }
        
        // Create connections
        foreach (var edgeData in edges)
        {
            var parentNode = nodeMap[edgeData.parentId];
            var childNode = nodeMap[edgeData.childId];
            
            var edge = parentNode.outputContainer.Q<Port>()
                .ConnectTo(childNode.inputContainer.Q<Port>());
            graphView.AddElement(edge);
        }
    }
    
    private TreeNode CreateNodeByTypeName(string typeName)
    {
        var type = System.Type.GetType(typeName);
        return ScriptableObject.CreateInstance(type) as TreeNode;
    }
}
```

---

## Key Differences from Web Version

| Feature | Web Implementation | Unity Implementation | Impact |
|---------|-------------------|---------------------|--------|
| **Code Editing** | Monaco editor embedded | External IDE | ⬇️ 500 LOC removed |
| **Rendering** | Custom Canvas API | GraphView | ⬇️ 1000 LOC removed |
| **Node Types** | Dynamic factory | Reflection + Attributes | ➡️ Similar complexity |
| **Serialization** | JSON + localStorage | ScriptableObject + JSON | ➡️ Similar |
| **Undo/Redo** | Custom operations | Unity's Undo API | ⬇️ Simpler |
| **Styling** | CSS | USS | ➡️ Similar |

**Total LOC Reduction:** ~1500 lines (30% less code)

---

## Common Pitfalls to Avoid

### ❌ Don't: Mix Runtime and Editor Code

```csharp
// WRONG - Runtime code referencing editor
public class TreeNode : ScriptableObject
{
    #if UNITY_EDITOR
    public Vector2 editorPosition;  // ❌ Don't store editor data in runtime class
    #endif
}

// RIGHT - Separate editor data
public class BehaviorTreeNode : Node  // Editor-only class
{
    public Vector2 editorPosition;    // ✅ Editor data in editor class
    public TreeNode runtimeNode;      // Reference to runtime data
}
```

### ❌ Don't: Use MonoBehaviour for Nodes

```csharp
// WRONG
public class SequenceNode : MonoBehaviour  // ❌ Requires GameObject
{
    // ...
}

// RIGHT
public class SequenceNode : ScriptableObject  // ✅ Lightweight asset
{
    // ...
}
```

### ❌ Don't: Forget Assembly Definitions

```csharp
// Your project MUST have:
// 1. Runtime/BehaviorTree.Runtime.asmdef (NO editor refs)
// 2. Editor/BehaviorTree.Editor.asmdef (refs Runtime, editor-only platform)

// Without these, Unity will include editor code in builds!
```

### ❌ Don't: Try to Embed Monaco Editor

```csharp
// ❌ NO! You don't need this!
public class CodeEditorPanel : VisualElement
{
    private void EmbedMonacoEditor() { /* DON'T DO THIS */ }
}

// ✅ YES! Just open the script
private void OnDoubleClick()
{
    AssetDatabase.OpenAsset(MonoScript.FromScriptableObject(node));
}
```

---

## Testing Strategy

### Unit Tests (Runtime)

```csharp
// Tests/Runtime/SequenceNodeTests.cs
using NUnit.Framework;
using UnityEngine;

public class SequenceNodeTests
{
    [Test]
    public void Sequence_FirstChildFails_ReturnsFailure()
    {
        var sequence = ScriptableObject.CreateInstance<SequenceNode>();
        var failNode = CreateNode(NodeStatus.Failure);
        var successNode = CreateNode(NodeStatus.Success);
        
        sequence.AddChild(failNode);
        sequence.AddChild(successNode);
        
        var blackboard = ScriptableObject.CreateInstance<Blackboard>();
        var result = sequence.Tick(blackboard);
        
        Assert.AreEqual(NodeStatus.Failure, result);
    }
    
    private TreeNode CreateNode(NodeStatus returnStatus)
    {
        var node = ScriptableObject.CreateInstance<MockNode>();
        node.statusToReturn = returnStatus;
        return node;
    }
}

// Helper mock node for testing
public class MockNode : TreeNode
{
    public NodeStatus statusToReturn;
    
    public override NodeStatus Tick(Blackboard blackboard)
    {
        return statusToReturn;
    }
}
```

### Integration Tests (Editor)

```csharp
// Tests/Editor/SerializationTests.cs
using NUnit.Framework;
using UnityEngine;
using UnityEditor;

public class SerializationTests
{
    [Test]
    public void SaveLoad_PreservesGraphStructure()
    {
        // Create asset
        var asset = ScriptableObject.CreateInstance<BehaviorTreeAsset>();
        
        // Create simple tree
        var sequence = ScriptableObject.CreateInstance<SequenceNode>();
        var action = ScriptableObject.CreateInstance<ActionNode>();
        sequence.AddChild(action);
        
        // Create graph view and save
        var graphView = new BehaviorTreeGraphView();
        var sequenceNode = new BehaviorTreeNode(sequence);
        var actionNode = new BehaviorTreeNode(action);
        graphView.AddElement(sequenceNode);
        graphView.AddElement(actionNode);
        
        asset.SaveGraph(graphView);
        
        // Load into new graph view
        var newGraphView = new BehaviorTreeGraphView();
        asset.LoadGraph(newGraphView);
        
        // Verify structure
        Assert.AreEqual(2, newGraphView.nodes.ToList().Count);
    }
}
```

---

## Performance Considerations

### Target Benchmarks

- ✅ **Editor:** Handle 500+ nodes smoothly (60 FPS)
- ✅ **Runtime:** 100+ nodes with 60 FPS gameplay
- ✅ **Serialization:** < 100ms for typical trees
- ✅ **Tick:** < 1ms per tree tick

### Optimization Tips

1. **Port Caching** (if needed):
```csharp
private Dictionary<TreeNode, Port> portCache = new Dictionary<TreeNode, Port>();
```

2. **Dirty Flags:**
```csharp
public class TreeNode : ScriptableObject
{
    [System.NonSerialized] private bool isDirty = true;
    
    public void MarkDirty() => isDirty = true;
}
```

3. **Object Pooling** (for large graphs):
```csharp
private static Stack<BehaviorTreeNode> nodePool = new Stack<BehaviorTreeNode>();
```

---

## Minimum Viable Product (MVP)

For initial release, include:

1. ✅ **Runtime (2 weeks)**
   - TreeNode base class
   - 3 composite nodes (Sequence, Selector, Parallel)
   - 2 decorator nodes (Inverter, Repeater)
   - ActionNode base class
   - Blackboard
   - BehaviorTree MonoBehaviour

2. ✅ **Editor (3 weeks)**
   - GraphView window
   - Node creation/deletion
   - Connection creation
   - Save/Load to asset
   - Basic styling

3. ✅ **Polish (1 week)**
   - Undo/redo
   - Node inspector
   - Documentation
   - Example scene

**Total MVP:** 6 weeks

---

## Next Steps

1. **Spike (3 days):** Validate GraphView approach
2. **Vertical Slice (1 week):** Build one complete flow
3. **Iterate:** Add features incrementally
4. **Test:** Continuous testing throughout

---

## Resources

- **Unity GraphView Docs:** https://docs.unity3d.com/Manual/UIE-Graph-View.html
- **UI Toolkit Docs:** https://docs.unity3d.com/Manual/UIElements.html
- **USS Reference:** https://docs.unity3d.com/Manual/UIE-USS.html
- **Unity Forum - GraphView:** https://forum.unity.com/forums/ui-toolkit.178/

---

## Questions to Answer in Spike

1. Can GraphView handle 500+ nodes smoothly?
2. How to style nodes with USS?
3. How to serialize graph layout?
4. How to integrate runtime execution visualization?
5. How to handle undo/redo for graph operations?

---

**Ready to Start:** Create Unity project and implement vertical slice! 🚀
