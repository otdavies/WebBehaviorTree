using UnityEngine;

namespace WebBehaviorTree.Nodes
{
    /// <summary>
    /// Waits for a specified duration before succeeding.
    /// </summary>
    public class WaitNode : TreeNode
    {
        public float Duration { get; set; } = 1f;

        private float elapsedTime = 0f;

        protected override NodeStatus OnTick(Blackboard blackboard)
        {
            elapsedTime += Time.deltaTime;

            if (elapsedTime >= Duration)
            {
                elapsedTime = 0f;
                return NodeStatus.Success;
            }

            return NodeStatus.Running;
        }

        public override void Reset()
        {
            base.Reset();
            elapsedTime = 0f;
        }
    }
}
