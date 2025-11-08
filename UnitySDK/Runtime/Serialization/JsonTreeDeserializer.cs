using System;
using System.Collections.Generic;
using UnityEngine;
using WebBehaviorTree.Nodes;

namespace WebBehaviorTree
{
    /// <summary>
    /// Deserializes behavior trees from JSON exported by the web editor.
    /// </summary>
    public static class JsonTreeDeserializer
    {
        /// <summary>
        /// Deserialize a behavior tree from JSON.
        /// </summary>
        /// <param name="json">JSON string exported from web editor</param>
        /// <param name="registeredActions">Dictionary of action name to implementation</param>
        /// <returns>Root node of the deserialized tree</returns>
        public static TreeNode Deserialize(string json, Dictionary<string, Func<NodeStatus>> registeredActions)
        {
            var data = JsonUtility.FromJson<TreeData>(json);

            if (data == null || data.tree == null || data.tree.nodes == null)
            {
                throw new Exception("Invalid JSON: missing tree structure");
            }

            // Create all nodes first
            var nodeMap = new Dictionary<string, TreeNode>();

            foreach (var nodeData in data.tree.nodes)
            {
                TreeNode node = CreateNode(nodeData, registeredActions);
                if (node != null)
                {
                    node.Id = nodeData.id;
                    node.Type = nodeData.type;
                    node.Label = nodeData.label;
                    nodeMap[nodeData.id] = node;
                }
            }

            // Connect children
            foreach (var nodeData in data.tree.nodes)
            {
                if (!nodeMap.TryGetValue(nodeData.id, out var parent))
                {
                    continue;
                }

                if (nodeData.children != null)
                {
                    foreach (var childId in nodeData.children)
                    {
                        if (nodeMap.TryGetValue(childId, out var child))
                        {
                            parent.Children.Add(child);
                        }
                        else
                        {
                            Debug.LogWarning($"Child node not found: {childId}");
                        }
                    }
                }
            }

            // Find root
            if (string.IsNullOrEmpty(data.tree.root))
            {
                throw new Exception("No root node specified in JSON");
            }

            if (!nodeMap.TryGetValue(data.tree.root, out var rootNode))
            {
                throw new Exception($"Root node not found: {data.tree.root}");
            }

            return rootNode;
        }

        private static TreeNode CreateNode(NodeData nodeData, Dictionary<string, Func<NodeStatus>> registeredActions)
        {
            switch (nodeData.type)
            {
                // Composites
                case "sequence":
                    return new SequenceNode();

                case "selector":
                    return new SelectorNode();

                case "parallel":
                    return new ParallelNode();

                // Decorators
                case "inverter":
                    return new InverterNode();

                case "repeater":
                    var repeater = new RepeaterNode();
                    // Try to get repeat count from config
                    if (nodeData.config != null && nodeData.config.repeatCount > 0)
                    {
                        repeater.RepeatCount = nodeData.config.repeatCount;
                    }
                    return repeater;

                case "start":
                    // Start node is just a pass-through decorator
                    return new SequenceNode(); // Execute its child

                // Actions
                case "action":
                case "customAction":
                    // Look up registered action by label
                    if (registeredActions != null && registeredActions.TryGetValue(nodeData.label, out var action))
                    {
                        return new ActionNode(action);
                    }
                    else
                    {
                        Debug.LogWarning($"Action '{nodeData.label}' not registered. Node will fail when executed.");
                        return new ActionNode(null);
                    }

                case "wait":
                    var wait = new WaitNode();
                    if (nodeData.config != null && nodeData.config.duration > 0)
                    {
                        wait.Duration = nodeData.config.duration;
                    }
                    return wait;

                default:
                    Debug.LogWarning($"Unknown node type: {nodeData.type}");
                    return null;
            }
        }

        // JSON data structures matching web editor format
        [Serializable]
        private class TreeData
        {
            public string version;
            public MetadataData metadata;
            public TreeStructure tree;
            public BlackboardData blackboard;
        }

        [Serializable]
        private class MetadataData
        {
            public string created;
            public string modified;
            public int nodeCount;
        }

        [Serializable]
        private class TreeStructure
        {
            public NodeData[] nodes;
            public string root;
        }

        [Serializable]
        private class NodeData
        {
            public string id;
            public string type;
            public string label;
            public string category;
            public PositionData position;
            public string icon;
            public string color;
            public string code;
            public ConfigData config;
            public string[] children;
        }

        [Serializable]
        private class PositionData
        {
            public float x;
            public float y;
        }

        [Serializable]
        private class ConfigData
        {
            public int repeatCount;
            public float duration;
        }

        [Serializable]
        private class BlackboardData
        {
            public Dictionary<string, object> initialValues;
        }
    }
}
