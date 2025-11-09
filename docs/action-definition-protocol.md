# Action Definition Protocol (ADP)
## Two-Way Synchronization Between Web Editor and Unity SDK

**Version:** 1.0.0
**Date:** 2025-11-09
**Status:** Design Proposal

---

## Executive Summary

This document defines the **Action Definition Protocol (ADP)**, a standardized approach for synchronizing custom behavior tree action definitions between the web-based editor (TypeScript) and Unity SDK (C#).

### The Problem

Currently, there is no automated way to:
- Discover what actions Unity supports from the web editor
- Validate that web-designed trees will work in Unity
- Share rich metadata (parameters, descriptions, icons) between platforms
- Maintain synchronization as actions are added/modified

### The Solution

A **schema-based protocol** with:
1. **Shared Action Schema** (JSON) - Single source of truth for action definitions
2. **Unity Manifest Generator** - Auto-generates schema from C# code attributes
3. **Web Schema Import** - Validates and creates actions from schema
4. **Enhanced Serialization** - Round-trip with full type safety
5. **Validation** - Design-time and runtime validation

### Key Benefits

- ✅ **Automatic Discovery**: Unity actions automatically available in web editor
- ✅ **Type Safety**: Parameter types validated on both sides
- ✅ **Rich Metadata**: Icons, colors, descriptions, documentation
- ✅ **Version Control**: Schema file tracks action changes
- ✅ **No Manual Sync**: Manifest generation is automatic
- ✅ **Clear Communication**: Developers and designers have shared vocabulary

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     ACTION DEFINITION PROTOCOL                   │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐                              ┌────────────────┐
│   Unity C# Code  │                              │  Web Editor    │
│                  │                              │  (TypeScript)  │
│  [BehaviorAction]│                              │                │
│  class MyAction  │                              │                │
└────────┬─────────┘                              └────────▲───────┘
         │                                                 │
         │ 1. Reflection                          4. Import Schema
         │    Scan Attributes                        & Create Nodes
         ▼                                                 │
┌──────────────────┐         2. Generate          ┌───────┴────────┐
│ Manifest         │─────────────────────────────▶│ actions.schema │
│ Generator        │                               │     .json      │
│ (Unity Editor)   │◀──────────────────────────────│                │
└──────────────────┘    3. Validate & Update      └────────┬───────┘
                                                            │
                                                            │ 5. Export
         ┌──────────────────────────────────────────────────┘    Tree
         │                                                        with
         │ 6. Deserialize & Validate                         actionIds
         ▼
┌──────────────────┐
│ Unity Runtime    │
│ BehaviorTree     │
│ Runner           │
└──────────────────┘
```

---

## Action Schema Format

### Schema File: `actions.schema.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "version": "1.0.0",
  "metadata": {
    "generated": "2025-11-09T12:00:00Z",
    "generator": "unity-manifest-generator",
    "generatorVersion": "1.0.0",
    "projectName": "My Behavior Tree Project",
    "unityVersion": "2022.3.0f1"
  },
  "actions": [
    {
      "id": "patrol_waypoints",
      "label": "Patrol Waypoints",
      "description": "Move between a list of waypoint positions",
      "category": "movement",
      "icon": "fa-walking",
      "color": "#2ecc71",
      "version": "1.0.0",
      "tags": ["ai", "movement", "navigation"],

      "parameters": [
        {
          "name": "speed",
          "type": "number",
          "label": "Move Speed",
          "description": "Speed in meters per second",
          "defaultValue": 5.0,
          "min": 0,
          "max": 20,
          "unit": "m/s",
          "required": true
        },
        {
          "name": "waypointsKey",
          "type": "blackboard_reference",
          "label": "Waypoints Blackboard Key",
          "description": "Blackboard key containing waypoint array",
          "defaultValue": "patrolWaypoints",
          "required": true
        },
        {
          "name": "loopMode",
          "type": "select",
          "label": "Loop Mode",
          "options": [
            { "value": "loop", "label": "Loop" },
            { "value": "pingpong", "label": "Ping Pong" },
            { "value": "once", "label": "Once" }
          ],
          "defaultValue": "loop",
          "required": false
        }
      ],

      "platform": {
        "unity": {
          "implemented": true,
          "className": "PatrolWaypointsAction",
          "namespace": "MyGame.BehaviorTree.Actions",
          "assemblyName": "Assembly-CSharp",
          "requiresComponents": ["NavMeshAgent"]
        },
        "web": {
          "testable": true,
          "mockImplementation": "// Mock for web testing\nconst waypoints = blackboard.get(params.waypointsKey);\nreturn NodeStatus.Success;"
        }
      },

      "returnStates": ["Success", "Running", "Failure"],

      "documentation": {
        "usage": "Use this action to make AI patrol between predefined waypoints",
        "example": "Set 'patrolWaypoints' in blackboard to Vector3[] before calling",
        "notes": "Returns Running while moving, Success when complete, Failure if waypoints invalid"
      }
    }
  ]
}
```

### Parameter Types

| Type | Description | Web UI | Unity Type | Example |
|------|-------------|--------|------------|---------|
| `number` | Numeric value | Slider/Input | `float`, `int` | `5.0` |
| `string` | Text value | Text input | `string` | `"Hello"` |
| `boolean` | True/false | Checkbox | `bool` | `true` |
| `select` | Dropdown choice | Dropdown | `enum`, `string` | `"option1"` |
| `blackboard_reference` | Key name | Text input + suggestions | `string` | `"playerHealth"` |
| `vector2` | 2D position | X/Y inputs | `Vector2` | `{x: 1, y: 2}` |
| `vector3` | 3D position | X/Y/Z inputs | `Vector3` | `{x: 1, y: 2, z: 3}` |
| `color` | Color value | Color picker | `Color` | `"#FF0000"` |
| `asset_reference` | Unity asset | Path input | `string` (path) | `"Prefabs/Enemy"` |

---

## Unity Implementation

### 1. Attributes for Action Definition

```csharp
// Runtime/Attributes/BehaviorActionAttribute.cs
using System;

namespace BehaviorTree.Runtime
{
    [AttributeUsage(AttributeTargets.Class)]
    public class BehaviorActionAttribute : Attribute
    {
        public string Label { get; set; }
        public string Description { get; set; }
        public string Icon { get; set; } = "fa-cog";
        public string Color { get; set; } = "#3498db";
        public string Category { get; set; } = "custom";
        public string[] Tags { get; set; } = Array.Empty<string>();
        public string Version { get; set; } = "1.0.0";
    }

    [AttributeUsage(AttributeTargets.Property | AttributeTargets.Field)]
    public class ActionParameterAttribute : Attribute
    {
        public string Label { get; set; }
        public string Description { get; set; }
        public object DefaultValue { get; set; }
        public float Min { get; set; } = float.MinValue;
        public float Max { get; set; } = float.MaxValue;
        public string Unit { get; set; }
        public bool Required { get; set; } = false;
        public string[] Options { get; set; } // For select type
    }
}
```

### 2. IAction Interface

```csharp
// Runtime/Core/IAction.cs
namespace BehaviorTree.Runtime
{
    public interface IAction
    {
        /// <summary>
        /// Called once when action starts
        /// </summary>
        void OnStart(Blackboard blackboard) { }

        /// <summary>
        /// Called every tick while action is running
        /// </summary>
        NodeStatus Execute(Blackboard blackboard);

        /// <summary>
        /// Called once when action completes
        /// </summary>
        void OnEnd(Blackboard blackboard, NodeStatus status) { }
    }
}
```

### 3. Example Action Implementation

```csharp
// Runtime/Actions/PatrolWaypointsAction.cs
using UnityEngine;
using UnityEngine.AI;

namespace BehaviorTree.Runtime.Actions
{
    [BehaviorAction(
        Label = "Patrol Waypoints",
        Description = "Move between a list of waypoint positions using NavMesh",
        Icon = "fa-walking",
        Color = "#2ecc71",
        Category = "movement",
        Tags = new[] { "ai", "movement", "navigation" },
        Version = "1.0.0"
    )]
    public class PatrolWaypointsAction : IAction
    {
        [ActionParameter(
            Label = "Move Speed",
            Description = "Speed in meters per second",
            DefaultValue = 5.0f,
            Min = 0f,
            Max = 20f,
            Unit = "m/s",
            Required = true
        )]
        public float Speed { get; set; } = 5.0f;

        [ActionParameter(
            Label = "Waypoints Blackboard Key",
            Description = "Blackboard key containing waypoint array",
            DefaultValue = "patrolWaypoints",
            Required = true
        )]
        public string WaypointsKey { get; set; } = "patrolWaypoints";

        [ActionParameter(
            Label = "Loop Mode",
            Description = "How to handle reaching the last waypoint",
            DefaultValue = "loop",
            Options = new[] { "loop", "pingpong", "once" }
        )]
        public string LoopMode { get; set; } = "loop";

        private NavMeshAgent agent;
        private Vector3[] waypoints;
        private int currentWaypointIndex = 0;
        private bool isReversing = false;

        public void OnStart(Blackboard blackboard)
        {
            agent = blackboard.Get<NavMeshAgent>("agent");
            waypoints = blackboard.Get<Vector3[]>(WaypointsKey);

            if (agent != null)
            {
                agent.speed = Speed;
            }

            currentWaypointIndex = 0;
            isReversing = false;
        }

        public NodeStatus Execute(Blackboard blackboard)
        {
            if (agent == null || waypoints == null || waypoints.Length == 0)
            {
                Debug.LogError("PatrolWaypoints: Invalid setup");
                return NodeStatus.Failure;
            }

            // Check if reached current waypoint
            if (!agent.pathPending && agent.remainingDistance <= agent.stoppingDistance)
            {
                // Move to next waypoint
                if (!AdvanceToNextWaypoint())
                {
                    return NodeStatus.Success; // Completed patrol
                }
            }

            // Set destination
            agent.SetDestination(waypoints[currentWaypointIndex]);
            return NodeStatus.Running;
        }

        private bool AdvanceToNextWaypoint()
        {
            switch (LoopMode)
            {
                case "loop":
                    currentWaypointIndex = (currentWaypointIndex + 1) % waypoints.Length;
                    return true;

                case "pingpong":
                    if (isReversing)
                    {
                        currentWaypointIndex--;
                        if (currentWaypointIndex <= 0)
                        {
                            currentWaypointIndex = 0;
                            isReversing = false;
                        }
                    }
                    else
                    {
                        currentWaypointIndex++;
                        if (currentWaypointIndex >= waypoints.Length - 1)
                        {
                            currentWaypointIndex = waypoints.Length - 1;
                            isReversing = true;
                        }
                    }
                    return true;

                case "once":
                    currentWaypointIndex++;
                    return currentWaypointIndex < waypoints.Length;

                default:
                    return false;
            }
        }

        public void OnEnd(Blackboard blackboard, NodeStatus status)
        {
            if (agent != null)
            {
                agent.ResetPath();
            }
        }
    }
}
```

### 4. Manifest Generator (Editor Tool)

```csharp
// Editor/ActionManifestGenerator.cs
using UnityEngine;
using UnityEditor;
using System;
using System.Linq;
using System.Reflection;
using System.Collections.Generic;
using System.IO;

namespace BehaviorTree.Editor
{
    public class ActionManifestGenerator : EditorWindow
    {
        [MenuItem("Behavior Tree/Generate Action Manifest")]
        public static void GenerateManifest()
        {
            var manifest = CreateManifest();
            SaveManifest(manifest);
            AssetDatabase.Refresh();
            Debug.Log($"Action manifest generated: {manifest.Actions.Count} actions");
        }

        private static ActionManifest CreateManifest()
        {
            var manifest = new ActionManifest
            {
                Version = "1.0.0",
                Metadata = new ManifestMetadata
                {
                    Generated = DateTime.UtcNow.ToString("o"),
                    Generator = "unity-manifest-generator",
                    GeneratorVersion = "1.0.0",
                    ProjectName = Application.productName,
                    UnityVersion = Application.unityVersion
                },
                Actions = new List<ActionDefinition>()
            };

            // Find all types with BehaviorActionAttribute
            var actionTypes = AppDomain.CurrentDomain.GetAssemblies()
                .SelectMany(assembly => assembly.GetTypes())
                .Where(type => type.GetCustomAttribute<BehaviorActionAttribute>() != null)
                .Where(type => typeof(IAction).IsAssignableFrom(type));

            foreach (var actionType in actionTypes)
            {
                manifest.Actions.Add(CreateActionDefinition(actionType));
            }

            return manifest;
        }

        private static ActionDefinition CreateActionDefinition(Type actionType)
        {
            var attr = actionType.GetCustomAttribute<BehaviorActionAttribute>();

            var definition = new ActionDefinition
            {
                Id = GenerateId(actionType.Name),
                Label = attr.Label,
                Description = attr.Description,
                Icon = attr.Icon,
                Color = attr.Color,
                Category = attr.Category,
                Version = attr.Version,
                Tags = attr.Tags.ToList(),
                Parameters = ExtractParameters(actionType),
                Platform = new PlatformInfo
                {
                    Unity = new UnityPlatformInfo
                    {
                        Implemented = true,
                        ClassName = actionType.Name,
                        Namespace = actionType.Namespace,
                        AssemblyName = actionType.Assembly.GetName().Name
                    },
                    Web = new WebPlatformInfo
                    {
                        Testable = false // Can be enhanced later
                    }
                },
                ReturnStates = new List<string> { "Success", "Running", "Failure" }
            };

            return definition;
        }

        private static List<ParameterDefinition> ExtractParameters(Type actionType)
        {
            var parameters = new List<ParameterDefinition>();

            var properties = actionType.GetProperties(BindingFlags.Public | BindingFlags.Instance)
                .Where(p => p.GetCustomAttribute<ActionParameterAttribute>() != null);

            foreach (var prop in properties)
            {
                var attr = prop.GetCustomAttribute<ActionParameterAttribute>();

                parameters.Add(new ParameterDefinition
                {
                    Name = ToCamelCase(prop.Name),
                    Type = MapParameterType(prop.PropertyType),
                    Label = attr.Label,
                    Description = attr.Description,
                    DefaultValue = attr.DefaultValue,
                    Min = attr.Min != float.MinValue ? (float?)attr.Min : null,
                    Max = attr.Max != float.MaxValue ? (float?)attr.Max : null,
                    Unit = attr.Unit,
                    Required = attr.Required,
                    Options = attr.Options?.Select(o => new OptionDefinition
                    {
                        Value = o,
                        Label = o
                    }).ToList()
                });
            }

            return parameters;
        }

        private static string MapParameterType(Type type)
        {
            if (type == typeof(float) || type == typeof(int) || type == typeof(double))
                return "number";
            if (type == typeof(bool))
                return "boolean";
            if (type == typeof(string))
                return "string";
            if (type == typeof(Vector2))
                return "vector2";
            if (type == typeof(Vector3))
                return "vector3";
            if (type == typeof(Color))
                return "color";

            return "string"; // Default fallback
        }

        private static string GenerateId(string className)
        {
            // Convert "PatrolWaypointsAction" to "patrol_waypoints"
            return string.Concat(className.Replace("Action", "")
                .Select((x, i) => i > 0 && char.IsUpper(x) ? "_" + x : x.ToString()))
                .ToLower();
        }

        private static string ToCamelCase(string pascalCase)
        {
            if (string.IsNullOrEmpty(pascalCase)) return pascalCase;
            return char.ToLower(pascalCase[0]) + pascalCase.Substring(1);
        }

        private static void SaveManifest(ActionManifest manifest)
        {
            string json = JsonUtility.ToJson(manifest, prettyPrint: true);
            string path = Path.Combine(Application.dataPath, "../actions.schema.json");
            File.WriteAllText(path, json);
        }
    }

    // Data structures for manifest
    [Serializable]
    public class ActionManifest
    {
        public string Version;
        public ManifestMetadata Metadata;
        public List<ActionDefinition> Actions;
    }

    [Serializable]
    public class ManifestMetadata
    {
        public string Generated;
        public string Generator;
        public string GeneratorVersion;
        public string ProjectName;
        public string UnityVersion;
    }

    [Serializable]
    public class ActionDefinition
    {
        public string Id;
        public string Label;
        public string Description;
        public string Category;
        public string Icon;
        public string Color;
        public string Version;
        public List<string> Tags;
        public List<ParameterDefinition> Parameters;
        public PlatformInfo Platform;
        public List<string> ReturnStates;
    }

    [Serializable]
    public class ParameterDefinition
    {
        public string Name;
        public string Type;
        public string Label;
        public string Description;
        public object DefaultValue;
        public float? Min;
        public float? Max;
        public string Unit;
        public bool Required;
        public List<OptionDefinition> Options;
    }

    [Serializable]
    public class OptionDefinition
    {
        public string Value;
        public string Label;
    }

    [Serializable]
    public class PlatformInfo
    {
        public UnityPlatformInfo Unity;
        public WebPlatformInfo Web;
    }

    [Serializable]
    public class UnityPlatformInfo
    {
        public bool Implemented;
        public string ClassName;
        public string Namespace;
        public string AssemblyName;
    }

    [Serializable]
    public class WebPlatformInfo
    {
        public bool Testable;
        public string MockImplementation;
    }
}
```

---

## Web Editor Implementation

### 1. TypeScript Interfaces

```typescript
// src/core/ActionDefinition.ts

export interface ActionSchema {
  $schema: string;
  version: string;
  metadata: SchemaMetadata;
  actions: ActionDefinition[];
}

export interface SchemaMetadata {
  generated: string;
  generator: string;
  generatorVersion: string;
  projectName: string;
  unityVersion?: string;
}

export interface ActionDefinition {
  id: string;
  label: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  version: string;
  tags: string[];
  parameters: ParameterDefinition[];
  platform: PlatformInfo;
  returnStates: string[];
  documentation?: DocumentationInfo;
}

export interface ParameterDefinition {
  name: string;
  type: 'number' | 'string' | 'boolean' | 'select' | 'blackboard_reference' | 'vector2' | 'vector3' | 'color';
  label: string;
  description?: string;
  defaultValue: any;
  min?: number;
  max?: number;
  unit?: string;
  required: boolean;
  options?: Array<{ value: any; label: string }>;
}

export interface PlatformInfo {
  unity: {
    implemented: boolean;
    className: string;
    namespace: string;
    assemblyName: string;
  };
  web: {
    testable: boolean;
    mockImplementation?: string;
  };
}

export interface DocumentationInfo {
  usage: string;
  example: string;
  notes: string;
}
```

### 2. Action Schema Manager

```typescript
// src/core/ActionSchemaManager.ts

import { ActionSchema, ActionDefinition, ParameterDefinition } from './ActionDefinition';
import { NodeRegistry } from './NodeRegistry';
import { ActionNode } from '../nodes/leaves/ActionNode';

class ActionSchemaManager {
  private schema: ActionSchema | null = null;
  private actionMap: Map<string, ActionDefinition> = new Map();
  private schemaVersion: string = '';

  /**
   * Load action schema from JSON file
   */
  async loadSchema(path: string): Promise<void> {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to load schema: ${response.statusText}`);
      }

      this.schema = await response.json();
      this.schemaVersion = this.schema.version;

      // Build action lookup map and register with NodeRegistry
      this.schema.actions.forEach(action => {
        this.actionMap.set(action.id, action);
        this.registerActionInNodeRegistry(action);
      });

      console.log(`✅ Loaded ${this.schema.actions.length} action definitions (v${this.schemaVersion})`);

      // Log Unity vs Web-only actions
      const unityActions = this.schema.actions.filter(a => a.platform.unity?.implemented);
      const webOnlyActions = this.schema.actions.filter(a => !a.platform.unity?.implemented);
      console.log(`   - Unity-ready: ${unityActions.length}`);
      console.log(`   - Web-only: ${webOnlyActions.length}`);

    } catch (error) {
      console.error('Failed to load action schema:', error);
      throw error;
    }
  }

  /**
   * Register action in NodeRegistry so it appears in palette
   */
  private registerActionInNodeRegistry(def: ActionDefinition): void {
    NodeRegistry.register({
      type: `action_${def.id}`,
      category: 'leaf',
      label: def.label,
      description: def.description,
      icon: def.icon,
      tags: def.tags,
      factory: () => this.createActionNode(def.id)!
    });
  }

  /**
   * Create an ActionNode instance from schema definition
   */
  createActionNode(actionId: string): ActionNode | null {
    const def = this.actionMap.get(actionId);
    if (!def) {
      console.error(`Unknown action ID: ${actionId}`);
      return null;
    }

    const node = new ActionNode();
    node.type = 'action';
    node.label = def.label;
    node.icon = def.icon;
    node.color = def.color;
    node.config.actionId = actionId;
    node.config.unityClass = def.platform.unity?.className;
    node.config.parameters = {};

    // Initialize parameters from schema
    def.parameters.forEach(param => {
      node.parameters.define(param.name, {
        type: param.type as any,
        label: param.label,
        description: param.description,
        defaultValue: param.defaultValue,
        min: param.min,
        max: param.max,
        unit: param.unit,
        required: param.required,
        options: param.options
      });

      // Set default value in config
      node.config.parameters[param.name] = param.defaultValue;
    });

    // Use mock implementation for web testing if available
    if (def.platform.web?.mockImplementation) {
      node.code = def.platform.web.mockImplementation;
    }

    return node;
  }

  /**
   * Get action definition by ID
   */
  getActionDefinition(actionId: string): ActionDefinition | undefined {
    return this.actionMap.get(actionId);
  }

  /**
   * Get all available actions, optionally filtered
   */
  getAvailableActions(filter?: {
    category?: string;
    tags?: string[];
    unityOnly?: boolean;
  }): ActionDefinition[] {
    let actions = Array.from(this.actionMap.values());

    if (filter?.category) {
      actions = actions.filter(a => a.category === filter.category);
    }

    if (filter?.tags && filter.tags.length > 0) {
      actions = actions.filter(a =>
        filter.tags!.some(tag => a.tags.includes(tag))
      );
    }

    if (filter?.unityOnly) {
      actions = actions.filter(a => a.platform.unity?.implemented);
    }

    return actions;
  }

  /**
   * Validate a behavior tree against the action schema
   */
  validateTree(tree: BehaviorTree): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!this.schema) {
      errors.push('No action schema loaded');
      return { valid: false, errors, warnings };
    }

    tree.getAllNodes().forEach(node => {
      if (node.type === 'action') {
        const actionId = node.config.actionId;

        if (!actionId) {
          warnings.push(`Action node "${node.label}" has no actionId (old format?)`);
          return;
        }

        const def = this.actionMap.get(actionId);

        if (!def) {
          errors.push(`Unknown action: ${node.label} (${actionId})`);
          return;
        }

        // Warn if not Unity-compatible
        if (!def.platform.unity?.implemented) {
          warnings.push(
            `Action "${node.label}" is web-only and will not work in Unity`
          );
        }

        // Validate parameters
        def.parameters.forEach(param => {
          const value = node.config.parameters?.[param.name];

          if (param.required && (value === undefined || value === null)) {
            errors.push(
              `Missing required parameter "${param.label}" on action "${node.label}"`
            );
          }

          // Type validation
          if (value !== undefined && value !== null) {
            if (!this.validateParameterType(value, param)) {
              errors.push(
                `Invalid type for parameter "${param.label}" on action "${node.label}"`
              );
            }
          }
        });
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate parameter value matches expected type
   */
  private validateParameterType(value: any, param: ParameterDefinition): boolean {
    switch (param.type) {
      case 'number':
        if (typeof value !== 'number') return false;
        if (param.min !== undefined && value < param.min) return false;
        if (param.max !== undefined && value > param.max) return false;
        return true;

      case 'string':
      case 'blackboard_reference':
        return typeof value === 'string';

      case 'boolean':
        return typeof value === 'boolean';

      case 'select':
        if (param.options) {
          return param.options.some(opt => opt.value === value);
        }
        return true;

      case 'vector2':
        return value && typeof value.x === 'number' && typeof value.y === 'number';

      case 'vector3':
        return value &&
               typeof value.x === 'number' &&
               typeof value.y === 'number' &&
               typeof value.z === 'number';

      default:
        return true;
    }
  }

  /**
   * Get schema version
   */
  getSchemaVersion(): string {
    return this.schemaVersion;
  }

  /**
   * Check if schema is loaded
   */
  isLoaded(): boolean {
    return this.schema !== null;
  }
}

// Export singleton instance
export const actionSchemaManager = new ActionSchemaManager();

// Validation result type
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
```

### 3. Enhanced Tree Export

```typescript
// src/core/BehaviorTree.ts (modifications)

export class BehaviorTree {
  // ... existing code ...

  exportToJSON(): string {
    const data = {
      version: "1.2",
      schemaVersion: actionSchemaManager.getSchemaVersion(),
      metadata: {
        name: this.metadata.name,
        description: this.metadata.description,
        created: this.metadata.created,
        modified: new Date().toISOString(),
        tags: this.metadata.tags,
        requiredActions: this.extractRequiredActions()
      },
      tree: {
        nodes: this.nodes.map(node => this.serializeNode(node)),
        root: this.root?.id
      },
      blackboard: {
        initialValues: this.blackboard.getInitialValues()
      }
    };

    return JSON.stringify(data, null, 2);
  }

  private extractRequiredActions(): Array<{ id: string; version: string; unityClass: string }> {
    const requiredActions = new Set<string>();

    this.getAllNodes().forEach(node => {
      if (node.type === 'action' && node.config.actionId) {
        requiredActions.add(node.config.actionId);
      }
    });

    return Array.from(requiredActions).map(actionId => {
      const def = actionSchemaManager.getActionDefinition(actionId);
      return {
        id: actionId,
        version: def?.version || '1.0.0',
        unityClass: def?.platform.unity?.className || ''
      };
    });
  }

  private serializeNode(node: TreeNode): any {
    const data: any = {
      id: node.id,
      type: node.type,
      label: node.label,
      category: node.category,
      position: node.position,
      icon: node.icon,
      color: node.color,
      children: node.children.map(c => c.id)
    };

    // For action nodes, include actionId and parameters
    if (node.type === 'action') {
      data.config = {
        actionId: node.config.actionId,
        unityClass: node.config.unityClass,
        parameters: node.config.parameters || {}
      };

      // Include JavaScript code for web testing (Unity ignores this)
      if (node.code) {
        data.code = node.code;
      }
    } else if (node.config && Object.keys(node.config).length > 0) {
      data.config = node.config;
    }

    return data;
  }
}
```

---

## Enhanced Unity Deserializer

```csharp
// Runtime/Serialization/JsonTreeDeserializer.cs (enhanced)

public static class JsonTreeDeserializer
{
    public static TreeNode Deserialize(string json, Blackboard blackboard)
    {
        TreeData data = JsonUtility.FromJson<TreeData>(json);

        // Validate against schema if available
        if (ActionRegistry.Instance != null)
        {
            var validation = ActionRegistry.Instance.ValidateTree(data);
            if (!validation.IsValid)
            {
                Debug.LogError($"Tree validation failed:\n{string.Join("\n", validation.Errors)}");
            }
            if (validation.Warnings.Count > 0)
            {
                Debug.LogWarning($"Tree validation warnings:\n{string.Join("\n", validation.Warnings)}");
            }
        }

        // Build node hierarchy
        Dictionary<string, TreeNode> nodeMap = new Dictionary<string, TreeNode>();
        foreach (var nodeData in data.Tree.Nodes)
        {
            TreeNode node = CreateNode(nodeData, blackboard);
            if (node != null)
            {
                nodeMap[nodeData.Id] = node;
            }
        }

        // Link children
        foreach (var nodeData in data.Tree.Nodes)
        {
            if (nodeMap.TryGetValue(nodeData.Id, out TreeNode parent))
            {
                foreach (string childId in nodeData.Children)
                {
                    if (nodeMap.TryGetValue(childId, out TreeNode child))
                    {
                        parent.AddChild(child);
                    }
                }
            }
        }

        return nodeMap.TryGetValue(data.Tree.Root, out TreeNode root) ? root : null;
    }

    private static TreeNode CreateNode(NodeData nodeData, Blackboard blackboard)
    {
        switch (nodeData.Type)
        {
            case "sequence":
                return new SequenceNode { Id = nodeData.Id, Label = nodeData.Label };

            case "selector":
                return new SelectorNode { Id = nodeData.Id, Label = nodeData.Label };

            case "parallel":
                return new ParallelNode { Id = nodeData.Id, Label = nodeData.Label };

            case "inverter":
                return new InverterNode { Id = nodeData.Id, Label = nodeData.Label };

            case "repeater":
                int repeatCount = nodeData.Config?.repeatCount ?? -1;
                return new RepeaterNode(repeatCount) { Id = nodeData.Id, Label = nodeData.Label };

            case "wait":
                float duration = nodeData.Config?.duration ?? 1.0f;
                return new WaitNode(duration) { Id = nodeData.Id, Label = nodeData.Label };

            case "action":
                return CreateActionNode(nodeData, blackboard);

            default:
                Debug.LogWarning($"Unknown node type: {nodeData.Type}");
                return null;
        }
    }

    private static TreeNode CreateActionNode(NodeData nodeData, Blackboard blackboard)
    {
        string actionId = nodeData.Config?.actionId;

        if (string.IsNullOrEmpty(actionId))
        {
            // Fallback to old label-based system
            Debug.LogWarning($"Action node has no actionId, falling back to label: {nodeData.Label}");
            return new ActionNode(nodeData.Label, blackboard)
            {
                Id = nodeData.Id,
                Label = nodeData.Label
            };
        }

        // Get action instance from registry
        IAction action = ActionRegistry.Instance?.GetAction(actionId);
        if (action == null)
        {
            Debug.LogError($"Action not found: {actionId}");
            return null;
        }

        // Inject parameters into action instance
        InjectParameters(action, nodeData.Config?.parameters);

        return new EnhancedActionNode(actionId, action, blackboard)
        {
            Id = nodeData.Id,
            Label = nodeData.Label
        };
    }

    private static void InjectParameters(IAction action, Dictionary<string, object> parameters)
    {
        if (parameters == null) return;

        var actionType = action.GetType();
        foreach (var kvp in parameters)
        {
            var property = actionType.GetProperty(ToPascalCase(kvp.Key));
            if (property != null && property.CanWrite)
            {
                try
                {
                    object value = Convert.ChangeType(kvp.Value, property.PropertyType);
                    property.SetValue(action, value);
                }
                catch (Exception ex)
                {
                    Debug.LogError($"Failed to inject parameter {kvp.Key}: {ex.Message}");
                }
            }
        }
    }

    private static string ToPascalCase(string camelCase)
    {
        if (string.IsNullOrEmpty(camelCase)) return camelCase;
        return char.ToUpper(camelCase[0]) + camelCase.Substring(1);
    }
}

// Runtime/Serialization/TreeData.cs (data structures)
[Serializable]
public class TreeData
{
    public string Version;
    public string SchemaVersion;
    public MetadataData Metadata;
    public TreeStructure Tree;
    public BlackboardData Blackboard;
}

[Serializable]
public class MetadataData
{
    public string Name;
    public string Description;
    public string Created;
    public string Modified;
    public List<string> Tags;
    public List<RequiredActionData> RequiredActions;
}

[Serializable]
public class RequiredActionData
{
    public string Id;
    public string Version;
    public string UnityClass;
}

[Serializable]
public class TreeStructure
{
    public List<NodeData> Nodes;
    public string Root;
}

[Serializable]
public class NodeData
{
    public string Id;
    public string Type;
    public string Label;
    public string Category;
    public List<string> Children;
    public NodeConfig Config;
}

[Serializable]
public class NodeConfig
{
    public string actionId;
    public string unityClass;
    public Dictionary<string, object> parameters;
    public int repeatCount;
    public float duration;
}
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1)
- [ ] Create Unity attribute classes
- [ ] Create IAction interface
- [ ] Build manifest generator (basic reflection)
- [ ] Create TypeScript schema interfaces
- [ ] Build ActionSchemaManager (web)
- [ ] Test round-trip with 1 example action

### Phase 2: Integration (Week 2)
- [ ] Enhanced Unity deserializer with parameter injection
- [ ] ActionRegistry with auto-registration
- [ ] Web validation before export
- [ ] Update tree export format
- [ ] Migration tool for existing trees
- [ ] Test with 5+ diverse actions

### Phase 3: Polish (Week 3)
- [ ] Unity Editor manifest generator window
- [ ] Automatic manifest regeneration
- [ ] Enhanced parameter editors (web)
- [ ] Action palette with schema data
- [ ] Documentation tooltips
- [ ] Performance optimization

### Phase 4: Advanced (Week 4)
- [ ] Version compatibility checking
- [ ] Schema diff viewer
- [ ] Action templates/snippets
- [ ] Mock implementations for web testing
- [ ] CI/CD integration
- [ ] Comprehensive testing

---

## Migration Strategy

### For Existing Projects

1. **Backup**: Export all existing trees to JSON
2. **Generate Schema**: Run manifest generator on Unity actions
3. **Update Trees**: Migration tool adds `actionId` to action nodes
4. **Validate**: Run validation to ensure compatibility
5. **Test**: Verify all trees execute correctly
6. **Commit**: Version control the schema file

### Backward Compatibility

- Old format (label-based) still works as fallback
- Deserializer checks for `actionId` first, falls back to label
- Web editor can still create label-based actions if needed
- Migration can be gradual (project-by-project)

---

## Best Practices

### For Unity Developers

1. **Use Attributes**: Always use `[BehaviorAction]` on new actions
2. **Document Parameters**: Provide clear labels and descriptions
3. **Regenerate Often**: Run manifest generator after action changes
4. **Version Control Schema**: Commit `actions.schema.json` with code
5. **Test Parameters**: Ensure parameter types match web expectations

### For Web Designers

1. **Load Schema First**: Always import latest schema before editing
2. **Validate Before Export**: Run validation to catch issues early
3. **Use Unity-Ready Actions**: Prefer actions with Unity badge
4. **Test Web Implementations**: Use mock JavaScript for logic testing
5. **Request New Actions**: Use formal request workflow for missing actions

### For Teams

1. **Schema as Contract**: Treat schema as API contract between teams
2. **Version Compatibility**: Check schema version before importing trees
3. **Regular Sync**: Pull latest schema frequently
4. **Communication**: Discuss new actions before implementation
5. **Documentation**: Keep action documentation up-to-date

---

## Frequently Asked Questions

### Q: Can I still use JavaScript actions in Unity?
**A**: No, Unity executes C# implementations. JavaScript is for web testing only.

### Q: What happens if Unity action is missing?
**A**: Validation will show error. Tree won't load. Implement action or remove from tree.

### Q: Can I modify parameters in web editor?
**A**: Yes, but they must match the schema definition. Custom parameters require Unity changes.

### Q: How do I version actions?
**A**: Use `Version` property in `[BehaviorAction]`. Schema tracks version per action.

### Q: Can web editor create new actions?
**A**: Yes, but they're web-only (JavaScript). For Unity, request developer implementation.

### Q: What about custom node types (not actions)?
**A**: Current solution focuses on actions. Custom composites/decorators need code changes.

### Q: Performance impact of reflection?
**A**: Minimal. Reflection runs once at startup or manifest generation, not per tick.

### Q: Can I have project-specific actions?
**A**: Yes! Schema is per-project. Different projects = different schemas.

---

## Conclusion

The **Action Definition Protocol** provides a robust, scalable solution for synchronizing custom action definitions between the web editor and Unity SDK. By using a schema-based approach with automatic manifest generation, we achieve:

- **True Two-Way Communication**: Unity → Schema → Web → Tree → Unity
- **Type Safety**: Parameters validated on both platforms
- **Developer Productivity**: Attribute-based API is simple and clear
- **Designer Empowerment**: Full visibility into available actions
- **Team Alignment**: Shared vocabulary and documentation

This architecture enables teams to work efficiently across the web/Unity boundary while maintaining code quality and preventing runtime errors.

---

**Next Steps**: Review this proposal, provide feedback, and begin Phase 1 implementation.
