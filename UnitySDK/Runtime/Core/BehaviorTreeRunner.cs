using System;
using System.Collections.Generic;
using UnityEngine;

namespace WebBehaviorTree
{
    /// <summary>
    /// MonoBehaviour that executes a behavior tree imported from the web editor.
    /// </summary>
    public class BehaviorTreeRunner : MonoBehaviour
    {
        [Header("Configuration")]
        [Tooltip("JSON file exported from the WebBehaviorTree editor")]
        public TextAsset treeJson;

        [Tooltip("Number of times to execute the tree per second")]
        [Range(1f, 60f)]
        public float ticksPerSecond = 10f;

        [Header("Runtime State")]
        [Tooltip("Is the tree currently running?")]
        public bool isRunning = false;

        /// <summary>Shared data storage for the behavior tree.</summary>
        public Blackboard Blackboard { get; private set; } = new Blackboard();

        /// <summary>Root node of the behavior tree.</summary>
        public TreeNode RootNode { get; private set; }

        /// <summary>Current execution status of the tree.</summary>
        public NodeStatus CurrentStatus { get; private set; } = NodeStatus.Idle;

        private float tickTimer = 0f;
        private Dictionary<string, Func<NodeStatus>> registeredActions = new Dictionary<string, Func<NodeStatus>>();

        /// <summary>
        /// Register a Unity-specific action implementation.
        /// Call this in Start() to bind actions to your Unity code.
        /// </summary>
        /// <param name="actionName">Name of the action node from the web editor</param>
        /// <param name="action">Function to execute when this action runs</param>
        public void RegisterAction(string actionName, Func<NodeStatus> action)
        {
            registeredActions[actionName] = action;
        }

        /// <summary>
        /// Load and parse the behavior tree from JSON.
        /// Called automatically on Start if treeJson is assigned.
        /// </summary>
        public void LoadTree()
        {
            if (treeJson == null)
            {
                Debug.LogError("No behavior tree JSON assigned to BehaviorTreeRunner!", this);
                return;
            }

            try
            {
                RootNode = JsonTreeDeserializer.Deserialize(treeJson.text, registeredActions);
                Debug.Log($"Loaded behavior tree: {RootNode?.Label ?? "Unknown"}");
            }
            catch (Exception e)
            {
                Debug.LogError($"Failed to load behavior tree: {e.Message}", this);
            }
        }

        /// <summary>
        /// Start executing the behavior tree.
        /// </summary>
        public void StartTree()
        {
            if (RootNode == null)
            {
                Debug.LogWarning("Cannot start tree - no root node loaded", this);
                return;
            }

            isRunning = true;
            RootNode.Reset();
            Blackboard.Clear();
            CurrentStatus = NodeStatus.Idle;
        }

        /// <summary>
        /// Stop executing the behavior tree.
        /// </summary>
        public void StopTree()
        {
            isRunning = false;
            CurrentStatus = NodeStatus.Idle;
        }

        /// <summary>
        /// Execute one tick of the behavior tree manually.
        /// Useful for testing or custom timing control.
        /// </summary>
        public NodeStatus ManualTick()
        {
            if (RootNode == null)
            {
                return NodeStatus.Idle;
            }

            CurrentStatus = RootNode.Tick(Blackboard);
            return CurrentStatus;
        }

        void Start()
        {
            LoadTree();
        }

        void Update()
        {
            if (!isRunning || RootNode == null)
            {
                return;
            }

            tickTimer += Time.deltaTime;
            float tickInterval = 1f / ticksPerSecond;

            if (tickTimer >= tickInterval)
            {
                tickTimer = 0f;
                ManualTick();
            }
        }

        void OnDrawGizmos()
        {
            if (RootNode == null)
            {
                return;
            }

            // Draw a visual indicator showing tree status
            Gizmos.color = CurrentStatus switch
            {
                NodeStatus.Success => Color.green,
                NodeStatus.Failure => Color.red,
                NodeStatus.Running => Color.yellow,
                _ => Color.gray
            };

            Gizmos.DrawWireSphere(transform.position + Vector3.up * 2f, 0.3f);
        }
    }
}
