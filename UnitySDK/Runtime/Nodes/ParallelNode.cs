namespace WebBehaviorTree.Nodes
{
    /// <summary>
    /// Executes all children simultaneously.
    /// Returns Success if all children succeed.
    /// Returns Failure if any child fails.
    /// Returns Running if any child is running.
    /// </summary>
    public class ParallelNode : TreeNode
    {
        protected override NodeStatus OnTick(Blackboard blackboard)
        {
            bool anyRunning = false;

            foreach (var child in Children)
            {
                var childStatus = child.Tick(blackboard);

                if (childStatus == NodeStatus.Failure)
                {
                    return NodeStatus.Failure;
                }

                if (childStatus == NodeStatus.Running)
                {
                    anyRunning = true;
                }
            }

            return anyRunning ? NodeStatus.Running : NodeStatus.Success;
        }
    }
}
