# Behavior Tree Templates

Pre-built behavior tree examples for common use cases.

## Unity Templates

Located in `templates/unity/`, these are designed specifically for Unity game development.

### patrol-ai.json
**Difficulty:** Beginner
**Description:** Simple patrol AI for Unity NavMesh agents
**Use Case:** Enemy patrol, NPC wandering

**What it demonstrates:**
- Basic patrol loop (move → wait → next waypoint)
- NavMesh agent movement
- Waypoint cycling
- Wait/delay actions

**Unity Actions to Implement:**
1. `Move to Waypoint` - Use NavMeshAgent.SetDestination()
2. `Next Waypoint` - Increment waypoint index

---

### combat-ai.json
**Difficulty:** Intermediate
**Description:** Enemy AI with patrol and combat behaviors
**Use Case:** Enemy AI, boss behaviors

**What it demonstrates:**
- Selector for behavior switching
- Detection → Chase → Attack sequence
- Fallback to patrol when no target
- Range-based decision making

**Unity Actions to Implement:**
1. `Detect Player` - Check distance to player
2. `Chase Player` - Move toward player with NavMesh
3. `Attack` - Trigger weapon/attack animation
4. `Move to Waypoint` - Patrol movement
5. `Next Waypoint` - Waypoint cycling

---

## How to Use Templates

### In Web Editor

1. Open https://otdavies.github.io/WebBehaviorTree/
2. File → Import
3. Select template JSON file
4. Modify as needed
5. Export for Unity

### In Unity

1. Import template JSON to Unity project
2. Create GameObject with BehaviorTreeRunner
3. Assign JSON to treeJson field
4. Implement action methods (see template code comments)
5. Test in Play mode

---

## Creating Your Own Templates

Templates are JSON files with this structure:

```json
{
  "version": "1.2",
  "metadata": {
    "name": "Template Name",
    "description": "Brief description",
    "created": "2025-01-01T00:00:00.000Z",
    "tags": ["tag1", "tag2"]
  },
  "tree": {
    "nodes": [ /* array of nodes */ ],
    "root": "node-id"
  },
  "blackboard": {
    "initialValues": { /* key-value pairs */ }
  }
}
```

**Tips:**
- Add descriptive comments in action node `code` fields
- Use meaningful labels
- Include blackboard initial values
- Add metadata tags for searchability
- Test template thoroughly before sharing

---

## Contributing Templates

Have a useful template? Submit a PR!

**Guidelines:**
- Follow the JSON structure above
- Include clear metadata (name, description, tags)
- Add code comments explaining Unity implementation
- Test with Unity SDK before submitting
- Update this README with your template description

---

**License:** MIT - Use freely in your projects!
