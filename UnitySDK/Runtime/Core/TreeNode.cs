using System.Collections.Generic;

namespace WebBehaviorTree
{
    /// <summary>
    /// Base class for all behavior tree nodes.
    /// Override Tick() to implement node-specific behavior.
    /// </summary>
    public abstract class TreeNode
    {
        /// <summary>Unique identifier for this node.</summary>
        public string Id { get; set; }

        /// <summary>Type identifier from the web editor.</summary>
        public string Type { get; set; }

        /// <summary>Display label for this node.</summary>
        public string Label { get; set; }

        /// <summary>Child nodes to execute.</summary>
        public List<TreeNode> Children { get; set; } = new List<TreeNode>();

        /// <summary>Current execution status.</summary>
        public NodeStatus Status { get; protected set; } = NodeStatus.Idle;

        /// <summary>
        /// Execute this node. Override to implement custom behavior.
        /// </summary>
        /// <param name="blackboard">Shared data storage</param>
        /// <returns>Status after execution</returns>
        public virtual NodeStatus Tick(Blackboard blackboard)
        {
            Status = OnTick(blackboard);
            return Status;
        }

        /// <summary>
        /// Override this method to implement node-specific logic.
        /// </summary>
        protected abstract NodeStatus OnTick(Blackboard blackboard);

        /// <summary>
        /// Reset this node to its initial state.
        /// Called when the tree restarts.
        /// </summary>
        public virtual void Reset()
        {
            Status = NodeStatus.Idle;
            foreach (var child in Children)
            {
                child.Reset();
            }
        }
    }
}
