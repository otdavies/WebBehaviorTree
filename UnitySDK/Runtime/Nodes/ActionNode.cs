using System;

namespace WebBehaviorTree.Nodes
{
    /// <summary>
    /// Action node that executes a registered Unity function.
    /// Actions are registered via BehaviorTreeRunner.RegisterAction().
    /// </summary>
    public class ActionNode : TreeNode
    {
        private readonly Func<NodeStatus> action;

        public ActionNode(Func<NodeStatus> action)
        {
            this.action = action;
        }

        protected override NodeStatus OnTick(Blackboard blackboard)
        {
            if (action == null)
            {
                UnityEngine.Debug.LogWarning($"Action '{Label}' not registered!");
                return NodeStatus.Failure;
            }

            return action.Invoke();
        }
    }
}
