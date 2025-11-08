# WebBehaviorTree Unity SDK

Runtime SDK for executing behavior trees designed in the [WebBehaviorTree editor](https://otdavies.github.io/WebBehaviorTree/).

## Features

- ✅ **Design in Browser** - Use the web editor for fast, visual tree design
- ✅ **Execute in Unity** - Import JSON and run trees with full Unity integration
- ✅ **Simple API** - Register actions with lambdas or methods
- ✅ **Blackboard System** - Share data between nodes
- ✅ **Debug Visualization** - Gizmos show tree status at runtime
- ✅ **Lightweight** - Zero dependencies, ~1500 LOC

## Quick Start

### 1. Install the Package

**Option A: Unity Package Manager (Recommended)**
```
1. Open Window > Package Manager
2. Click "+" > "Add package from git URL"
3. Enter: https://github.com/otdavies/WebBehaviorTree.git?path=/UnitySDK
```

**Option B: Manual Install**
```
1. Download this repository
2. Copy the UnitySDK folder into your Assets folder
```

### 2. Design Your Tree

1. Open the [WebBehaviorTree Editor](https://otdavies.github.io/WebBehaviorTree/)
2. Create your behavior tree visually
3. Export as JSON (File > Export)

### 3. Import to Unity

1. Drag the exported JSON file into your Unity project
2. Create a GameObject and add the `BehaviorTreeRunner` component
3. Assign the JSON file to the `treeJson` field

### 4. Register Actions

```csharp
using UnityEngine;
using WebBehaviorTree;

public class MyAI : MonoBehaviour
{
    private BehaviorTreeRunner treeRunner;

    void Start()
    {
        treeRunner = GetComponent<BehaviorTreeRunner>();

        // Register actions that match your tree's action node labels
        treeRunner.RegisterAction("Patrol", () => {
            // Your patrol logic here
            navAgent.SetDestination(GetNextWaypoint());
            return NodeStatus.Running;
        });

        treeRunner.RegisterAction("Attack", () => {
            weapon.Fire(target);
            return NodeStatus.Success;
        });

        // Start execution
        treeRunner.StartTree();
    }
}
```

### 5. Run!

Press Play and watch your behavior tree execute in Unity.

## Core Concepts

### Node Status

Every node returns one of four status values:

- `Idle` - Not yet executed
- `Running` - Still executing, needs more time
- `Success` - Completed successfully
- `Failure` - Failed to complete

### Node Types

**Composites** (execute children):
- `Sequence` - Runs children until one fails (AND logic)
- `Selector` - Runs children until one succeeds (OR logic)
- `Parallel` - Runs all children simultaneously

**Decorators** (modify child behavior):
- `Inverter` - Flips Success/Failure
- `Repeater` - Repeats child N times

**Actions** (leaf nodes):
- `Action` - Custom Unity code (registered)
- `Wait` - Pauses for duration

### Blackboard

Share data between nodes:

```csharp
// Set values
treeRunner.Blackboard.Set("target", enemyTransform);
treeRunner.Blackboard.Set("health", 100);

// Get values
var target = treeRunner.Blackboard.Get<Transform>("target");
var health = treeRunner.Blackboard.Get<int>("health", defaultValue: 100);
```

## Example: Patrol AI

See `Samples~/BasicAI/PatrolAI.cs` for a complete example.

**Web Editor Design:**
```
Start → Sequence
  ├─ Move to Waypoint
  ├─ Wait
  └─ Next Waypoint
```

**Unity Implementation:**
```csharp
treeRunner.RegisterAction("Move to Waypoint", () => {
    Vector3 target = waypoints[currentIndex].position;
    transform.position = Vector3.MoveTowards(transform.position, target, speed * Time.deltaTime);
    return Vector3.Distance(transform.position, target) < 0.1f
        ? NodeStatus.Success
        : NodeStatus.Running;
});

treeRunner.RegisterAction("Wait", () => {
    waitTimer += Time.deltaTime;
    if (waitTimer >= 1f) {
        waitTimer = 0f;
        return NodeStatus.Success;
    }
    return NodeStatus.Running;
});

treeRunner.RegisterAction("Next Waypoint", () => {
    currentIndex = (currentIndex + 1) % waypoints.Length;
    return NodeStatus.Success;
});
```

## Workflow

### Recommended Development Flow

1. **Design** - Build your tree in the web editor (fast iteration)
2. **Export** - Save as JSON
3. **Import** - Drag into Unity
4. **Implement** - Register actions with Unity code
5. **Test** - Run in Play mode
6. **Iterate** - Modify in web editor, re-import

**Why this workflow?**
- Web editor provides instant visual feedback
- No Unity compilation wait times
- Easy to share trees with team
- Version control friendly (JSON diffs)

## API Reference

### BehaviorTreeRunner

Main component that executes the tree.

```csharp
public class BehaviorTreeRunner : MonoBehaviour
{
    // Configuration
    public TextAsset treeJson;              // The tree JSON file
    public float ticksPerSecond = 10f;      // Execution rate
    public bool isRunning = false;          // Is tree running?

    // Runtime access
    public Blackboard Blackboard { get; }   // Shared data
    public TreeNode RootNode { get; }       // Root of tree
    public NodeStatus CurrentStatus { get; } // Overall status

    // Methods
    void RegisterAction(string name, Func<NodeStatus> action);
    void LoadTree();
    void StartTree();
    void StopTree();
    NodeStatus ManualTick();
}
```

### Blackboard

Shared data storage.

```csharp
public class Blackboard
{
    void Set<T>(string key, T value);
    T Get<T>(string key, T defaultValue = default);
    bool Has(string key);
    void Remove(string key);
    void Clear();
}
```

## Advanced Usage

### Custom Tick Rate

Control execution frequency:

```csharp
treeRunner.ticksPerSecond = 30f; // 30 updates per second
```

### Manual Ticking

For custom control:

```csharp
treeRunner.isRunning = false; // Disable auto-tick
NodeStatus status = treeRunner.ManualTick(); // Tick manually
```

### Debug Visualization

The runner draws a Gizmo showing tree status:
- **Gray** - Idle
- **Yellow** - Running
- **Green** - Success
- **Red** - Failure

## Troubleshooting

### "Action not registered" warning

**Problem:** You designed an action in the web editor but didn't register it in Unity.

**Solution:** Ensure action labels match exactly:
```csharp
// Web editor: Action node labeled "Patrol"
treeRunner.RegisterAction("Patrol", PatrolAction);
```

### JSON fails to load

**Problem:** Invalid JSON or version mismatch.

**Solution:**
- Re-export from web editor
- Check Unity console for specific error
- Validate JSON structure

### Tree doesn't execute

**Problem:** Tree not started or no root node.

**Solution:**
```csharp
treeRunner.StartTree(); // Don't forget to start!
```

## Performance

**Benchmarks** (Unity 2022.3, 60 FPS):
- 10 nodes: ~0.01ms per tick
- 100 nodes: ~0.1ms per tick
- 1000 nodes: ~1ms per tick

**Recommendations:**
- Keep trees under 100 nodes for best performance
- Use lower tick rates (5-10 TPS) for non-critical AI
- Avoid expensive operations in action callbacks

## Roadmap

- [ ] Visual debugger (highlight active nodes in Unity)
- [ ] Custom inspector for BehaviorTreeRunner
- [ ] Blackboard inspector (view/edit values at runtime)
- [ ] Export to C# (generate code from JSON)
- [ ] Async action support
- [ ] Subtree support (nested trees)

## Contributing

Contributions welcome! This is an open-source project.

**Areas we'd love help with:**
- Additional node types
- Better debugging tools
- Performance optimizations
- Documentation improvements
- Example scenes

## License

MIT License - See LICENSE file for details.

## Links

- **Web Editor:** https://otdavies.github.io/WebBehaviorTree/
- **GitHub:** https://github.com/otdavies/WebBehaviorTree
- **Issues:** https://github.com/otdavies/WebBehaviorTree/issues

---

**Made with ❤️ for the Unity community**
