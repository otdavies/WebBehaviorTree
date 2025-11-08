namespace WebBehaviorTree.Nodes
{
    /// <summary>
    /// Inverts the result of its child.
    /// Success becomes Failure, Failure becomes Success.
    /// Running remains Running.
    /// </summary>
    public class InverterNode : TreeNode
    {
        protected override NodeStatus OnTick(Blackboard blackboard)
        {
            if (Children.Count == 0)
            {
                return NodeStatus.Failure;
            }

            var childStatus = Children[0].Tick(blackboard);

            return childStatus switch
            {
                NodeStatus.Success => NodeStatus.Failure,
                NodeStatus.Failure => NodeStatus.Success,
                _ => childStatus
            };
        }
    }
}
