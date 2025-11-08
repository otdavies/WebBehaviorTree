namespace WebBehaviorTree.Nodes
{
    /// <summary>
    /// Executes children in order until one fails.
    /// Returns Success if all children succeed.
    /// Returns Failure if any child fails.
    /// Returns Running if a child is running.
    /// </summary>
    public class SequenceNode : TreeNode
    {
        private int currentChildIndex = 0;

        protected override NodeStatus OnTick(Blackboard blackboard)
        {
            for (int i = currentChildIndex; i < Children.Count; i++)
            {
                var childStatus = Children[i].Tick(blackboard);

                if (childStatus == NodeStatus.Failure)
                {
                    currentChildIndex = 0;
                    return NodeStatus.Failure;
                }

                if (childStatus == NodeStatus.Running)
                {
                    currentChildIndex = i;
                    return NodeStatus.Running;
                }
            }

            currentChildIndex = 0;
            return NodeStatus.Success;
        }

        public override void Reset()
        {
            base.Reset();
            currentChildIndex = 0;
        }
    }
}
