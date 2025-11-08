namespace WebBehaviorTree
{
    /// <summary>
    /// Status returned by a behavior tree node after execution.
    /// </summary>
    public enum NodeStatus
    {
        /// <summary>Node has not been executed yet.</summary>
        Idle,

        /// <summary>Node is still executing and needs more time.</summary>
        Running,

        /// <summary>Node completed successfully.</summary>
        Success,

        /// <summary>Node failed to complete its task.</summary>
        Failure
    }
}
