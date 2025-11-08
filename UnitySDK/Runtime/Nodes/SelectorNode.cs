namespace WebBehaviorTree.Nodes
{
    /// <summary>
    /// Executes children in order until one succeeds.
    /// Returns Success if any child succeeds.
    /// Returns Failure if all children fail.
    /// Returns Running if a child is running.
    /// </summary>
    public class SelectorNode : TreeNode
    {
        private int currentChildIndex = 0;

        protected override NodeStatus OnTick(Blackboard blackboard)
        {
            for (int i = currentChildIndex; i < Children.Count; i++)
            {
                var childStatus = Children[i].Tick(blackboard);

                if (childStatus == NodeStatus.Success)
                {
                    currentChildIndex = 0;
                    return NodeStatus.Success;
                }

                if (childStatus == NodeStatus.Running)
                {
                    currentChildIndex = i;
                    return NodeStatus.Running;
                }
            }

            currentChildIndex = 0;
            return NodeStatus.Failure;
        }

        public override void Reset()
        {
            base.Reset();
            currentChildIndex = 0;
        }
    }
}
