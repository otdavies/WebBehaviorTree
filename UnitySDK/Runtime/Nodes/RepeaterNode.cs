namespace WebBehaviorTree.Nodes
{
    /// <summary>
    /// Repeats its child a specified number of times.
    /// Returns Success when all repetitions complete successfully.
    /// Returns Failure if any repetition fails.
    /// </summary>
    public class RepeaterNode : TreeNode
    {
        public int RepeatCount { get; set; } = 1;

        private int currentRepetition = 0;

        protected override NodeStatus OnTick(Blackboard blackboard)
        {
            if (Children.Count == 0)
            {
                return NodeStatus.Success;
            }

            var childStatus = Children[0].Tick(blackboard);

            if (childStatus == NodeStatus.Running)
            {
                return NodeStatus.Running;
            }

            if (childStatus == NodeStatus.Failure)
            {
                currentRepetition = 0;
                return NodeStatus.Failure;
            }

            // Child succeeded
            currentRepetition++;

            if (currentRepetition >= RepeatCount)
            {
                currentRepetition = 0;
                return NodeStatus.Success;
            }

            // Reset child for next repetition
            Children[0].Reset();
            return NodeStatus.Running;
        }

        public override void Reset()
        {
            base.Reset();
            currentRepetition = 0;
        }
    }
}
