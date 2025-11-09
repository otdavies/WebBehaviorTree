# Action Synchronization - Quick Reference

## The Problem

Currently, the web editor and Unity SDK don't communicate about what actions are available. This means:
- ❌ Web designers don't know what Unity actions exist
- ❌ No parameter validation before export
- ❌ Manual label matching is error-prone
- ❌ No way to discover action capabilities

## The Solution: Action Definition Protocol (ADP)

**Single Source of Truth**: `actions.schema.json` file that both platforms understand

```
Unity C# Actions → Manifest Generator → actions.schema.json → Web Editor
                                              ↓
                                    Unity Runtime Validation
```

## Quick Implementation Guide

### 1. Unity Developer Creates Action

```csharp
[BehaviorAction(
    Label = "Patrol",
    Description = "Patrol between waypoints",
    Icon = "fa-walking",
    Color = "#2ecc71",
    Category = "movement"
)]
public class PatrolAction : IAction
{
    [ActionParameter(Label = "Speed", DefaultValue = 5.0f, Min = 0f, Max = 20f)]
    public float Speed { get; set; } = 5.0f;

    public NodeStatus Execute(Blackboard blackboard)
    {
        // Your implementation
        return NodeStatus.Running;
    }
}
```

### 2. Generate Manifest

```
Unity Menu: Behavior Tree > Generate Action Manifest
Output: actions.schema.json (commit to version control)
```

### 3. Web Editor Auto-Imports

```typescript
// On app start
await actionSchemaManager.loadSchema('/actions.schema.json');

// Actions automatically appear in palette
// Parameters automatically generate UI
// Validation automatically runs
```

### 4. Export & Execute

```typescript
// Web exports tree with actionId references
tree.exportToJSON(); // Includes validation

// Unity deserializes and executes
BehaviorTreeRunner.LoadTree(json); // Validates against schema
```

## Key Files to Create

### Unity Side
- `Runtime/Attributes/BehaviorActionAttribute.cs`
- `Runtime/Attributes/ActionParameterAttribute.cs`
- `Runtime/Core/IAction.cs`
- `Editor/ActionManifestGenerator.cs`

### Web Side
- `src/core/ActionDefinition.ts`
- `src/core/ActionSchemaManager.ts`

### Shared
- `actions.schema.json` (generated, version controlled)

## Benefits at a Glance

| Feature | Before | After |
|---------|--------|-------|
| Action Discovery | ❌ Manual | ✅ Automatic |
| Parameter Validation | ❌ Runtime only | ✅ Design + Runtime |
| Type Safety | ❌ None | ✅ Both platforms |
| Documentation | ❌ Separate | ✅ Built-in |
| Version Sync | ❌ Manual | ✅ Automatic |
| Error Prevention | ❌ Find at runtime | ✅ Find at design time |

## Example Schema Entry

```json
{
  "id": "patrol_waypoints",
  "label": "Patrol Waypoints",
  "icon": "fa-walking",
  "color": "#2ecc71",
  "parameters": [
    {
      "name": "speed",
      "type": "number",
      "label": "Speed",
      "defaultValue": 5.0,
      "min": 0,
      "max": 20
    }
  ],
  "platform": {
    "unity": {
      "implemented": true,
      "className": "PatrolWaypointsAction"
    }
  }
}
```

## Implementation Timeline

- **Week 1**: Foundation (attributes, interfaces, basic generator)
- **Week 2**: Integration (deserializer, validation, export format)
- **Week 3**: Enhanced features (UI, auto-regeneration, documentation)
- **Week 4**: Polish (optimization, testing, migration tools)

## Common Workflows

### Adding New Action
1. Create C# class with `[BehaviorAction]` attribute
2. Add properties with `[ActionParameter]` attributes
3. Run manifest generator (automatic or manual)
4. Commit `actions.schema.json`
5. Web editor automatically picks up new action

### Using Action in Web
1. Open action palette
2. Search/filter for action
3. Drag onto canvas
4. Inspector shows parameter UI (auto-generated)
5. Set values, export tree
6. Validation runs automatically

### Executing in Unity
1. Import tree JSON
2. Validator checks against schema
3. Auto-register actions via reflection
4. Parameters injected from JSON
5. Tree executes with full type safety

## Parameter Types Supported

| Type | Web UI | Unity Type | Example |
|------|--------|------------|---------|
| `number` | Slider/Input | `float`, `int` | `5.0` |
| `string` | Text Input | `string` | `"Hello"` |
| `boolean` | Checkbox | `bool` | `true` |
| `select` | Dropdown | `enum` | `"option1"` |
| `blackboard_reference` | Text + Hints | `string` | `"playerHealth"` |
| `vector3` | X/Y/Z Inputs | `Vector3` | `{x:1, y:2, z:3}` |

## Migration from Old System

```csharp
// OLD: Manual registration by label
treeRunner.RegisterAction("Patrol", () => { ... });

// NEW: Automatic registration via attributes
[BehaviorAction(Label = "Patrol")]
public class PatrolAction : IAction { ... }
```

**Migration is gradual**: Old label-based system works as fallback.

## Validation Workflow

```typescript
// Before export
const result = actionSchemaManager.validateTree(tree);

if (!result.valid) {
  console.error("Validation failed:", result.errors);
  // Show errors to user
  return;
}

if (result.warnings.length > 0) {
  console.warn("Warnings:", result.warnings);
  // Show warnings to user
}

// Export tree
tree.exportToJSON();
```

## Best Practices

### DO ✅
- Always use `[BehaviorAction]` attribute on new actions
- Regenerate manifest after changes
- Commit `actions.schema.json` with code
- Validate before exporting trees
- Use descriptive parameter labels

### DON'T ❌
- Manually edit `actions.schema.json`
- Skip manifest regeneration
- Change parameter types without updating schema
- Export trees without validation
- Use JavaScript code in Unity (web testing only)

## Troubleshooting

**Q: Action not appearing in web editor?**
- Check manifest was regenerated
- Verify `actions.schema.json` is accessible
- Check browser console for load errors

**Q: Parameter validation failing?**
- Check parameter types match schema
- Verify required parameters have values
- Check min/max constraints

**Q: Unity can't find action?**
- Verify `[BehaviorAction]` attribute exists
- Check action implements `IAction` interface
- Confirm auto-registration is enabled

**Q: Schema version mismatch?**
- Pull latest `actions.schema.json`
- Regenerate manifest if needed
- Check tree's `schemaVersion` field

## Resources

- Full specification: `docs/action-definition-protocol.md`
- Example actions: `UnitySDK/Runtime/Actions/`
- Web implementation: `src/core/ActionSchemaManager.ts`
- Unity generator: `UnitySDK/Editor/ActionManifestGenerator.cs`

---

**Ready to implement?** Start with Phase 1 in the full specification document!
