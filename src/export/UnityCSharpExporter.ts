import { TreeNode } from '../core/TreeNode.js';
import { BehaviorTree } from '../core/BehaviorTree.js';

/**
 * Exports behavior tree to Unity C# code with action registration stubs.
 */
export class UnityCSharpExporter {
    /**
     * Generate Unity C# MonoBehaviour with action registration code
     */
    public static export(tree: BehaviorTree): string {
        const allNodes = tree.getAllNodes();
        const actionNodes = allNodes.filter(node =>
            node.type === 'action' || node.type === 'customAction'
        );

        const className = 'GeneratedBehaviorTreeAI';
        const distinctActions = this.getDistinctActionNames(actionNodes);

        return this.generateClassCode(className, distinctActions);
    }

    /**
     * Get unique action names from action nodes
     */
    private static getDistinctActionNames(actionNodes: TreeNode[]): string[] {
        const names = new Set<string>();
        actionNodes.forEach(node => {
            if (node.label && node.label.trim()) {
                names.add(node.label);
            }
        });
        return Array.from(names).sort();
    }

    /**
     * Generate complete C# class with action registration
     */
    private static generateClassCode(className: string, actionNames: string[]): string {
        const actionRegistrations = actionNames
            .map(name => this.generateActionRegistration(name))
            .join('\n        ');

        const actionMethods = actionNames
            .map(name => this.generateActionMethod(name))
            .join('\n\n    ');

        return `using UnityEngine;
using WebBehaviorTree;

/// <summary>
/// Generated behavior tree AI implementation.
///
/// Setup:
/// 1. Attach this script to a GameObject
/// 2. Add BehaviorTreeRunner component
/// 3. Assign your exported JSON to treeJson field
/// 4. Implement the action methods below
/// 5. Press Play!
/// </summary>
[RequireComponent(typeof(BehaviorTreeRunner))]
public class ${className} : MonoBehaviour
{
    [Header("Configuration")]
    [Tooltip("Add your configuration fields here")]
    public float moveSpeed = 5f;

    private BehaviorTreeRunner treeRunner;

    void Start()
    {
        treeRunner = GetComponent<BehaviorTreeRunner>();

        // Register all actions from your behavior tree
        ${actionRegistrations}

        // Initialize blackboard values
        InitializeBlackboard();

        // Start the tree
        treeRunner.StartTree();
    }

    void InitializeBlackboard()
    {
        // Set initial blackboard values here
        // Example:
        // treeRunner.Blackboard.Set("player", playerTransform);
        // treeRunner.Blackboard.Set("health", 100);
    }

    // ===== Action Implementations =====
    // Implement these methods to define your AI behavior
    // Each method should return NodeStatus.Success, Failure, or Running

    ${actionMethods}
}
`;
    }

    /**
     * Generate action registration line
     */
    private static generateActionRegistration(actionName: string): string {
        const methodName = this.toMethodName(actionName);
        return `treeRunner.RegisterAction("${actionName}", ${methodName});`;
    }

    /**
     * Generate action method stub
     */
    private static generateActionMethod(actionName: string): string {
        const methodName = this.toMethodName(actionName);
        const comment = this.generateActionComment(actionName);

        return `${comment}
    NodeStatus ${methodName}()
    {
        // TODO: Implement ${actionName} behavior

        // Example:
        // if (/* condition met */)
        //     return NodeStatus.Success;
        //
        // if (/* still working */)
        //     return NodeStatus.Running;
        //
        // if (/* failed */)
        //     return NodeStatus.Failure;

        Debug.LogWarning("${actionName} not implemented yet!");
        return NodeStatus.Failure;
    }`;
    }

    /**
     * Generate XML documentation comment for action
     */
    private static generateActionComment(actionName: string): string {
        return `/// <summary>
    /// Action: ${actionName}
    /// </summary>`;
    }

    /**
     * Convert action name to valid C# method name
     */
    private static toMethodName(actionName: string): string {
        // Remove special characters and convert to PascalCase
        return actionName
            .split(/[\s\-_]+/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join('')
            .replace(/[^a-zA-Z0-9]/g, '');
    }

    /**
     * Generate C# action registration code only (for existing classes)
     */
    public static exportActionRegistrations(tree: BehaviorTree): string {
        const allNodes = tree.getAllNodes();
        const actionNodes = allNodes.filter(node =>
            node.type === 'action' || node.type === 'customAction'
        );

        const distinctActions = this.getDistinctActionNames(actionNodes);

        if (distinctActions.length === 0) {
            return '// No action nodes found in tree';
        }

        const registrations = distinctActions
            .map(name => {
                const methodName = this.toMethodName(name);
                return `treeRunner.RegisterAction("${name}", ${methodName});`;
            })
            .join('\n');

        return `// Register these actions in your Start() method:\n${registrations}`;
    }
}
