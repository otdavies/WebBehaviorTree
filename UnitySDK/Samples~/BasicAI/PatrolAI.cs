using UnityEngine;
using WebBehaviorTree;

/// <summary>
/// Example: Simple patrol AI using a behavior tree designed in the web editor.
///
/// Setup:
/// 1. Design your patrol tree in the web editor (https://otdavies.github.io/WebBehaviorTree/)
/// 2. Export as JSON
/// 3. Drag the JSON file into Unity
/// 4. Assign it to the treeJson field
/// 5. Add waypoint transforms to the waypoints array
/// 6. Press Play!
/// </summary>
[RequireComponent(typeof(BehaviorTreeRunner))]
public class PatrolAI : MonoBehaviour
{
    [Header("Waypoints")]
    [Tooltip("Transform waypoints to patrol between")]
    public Transform[] waypoints;

    [Header("Movement")]
    public float moveSpeed = 3f;
    public float waypointReachDistance = 0.5f;

    private BehaviorTreeRunner treeRunner;
    private int currentWaypointIndex = 0;
    private bool isWaiting = false;
    private float waitTimer = 0f;

    void Start()
    {
        treeRunner = GetComponent<BehaviorTreeRunner>();

        // Register actions that the behavior tree can call
        // These action names must match the labels in your web-designed tree
        treeRunner.RegisterAction("Move to Waypoint", MoveToWaypoint);
        treeRunner.RegisterAction("Wait", Wait);
        treeRunner.RegisterAction("Next Waypoint", NextWaypoint);

        // Set up blackboard initial values
        treeRunner.Blackboard.Set("waypointIndex", 0);
        treeRunner.Blackboard.Set("waypointCount", waypoints.Length);

        // Start the tree
        treeRunner.StartTree();
    }

    /// <summary>
    /// Action: Move toward the current waypoint.
    /// Returns Success when we reach it, Running while moving.
    /// </summary>
    NodeStatus MoveToWaypoint()
    {
        if (waypoints.Length == 0)
        {
            Debug.LogWarning("No waypoints assigned!");
            return NodeStatus.Failure;
        }

        Transform targetWaypoint = waypoints[currentWaypointIndex];
        Vector3 direction = (targetWaypoint.position - transform.position).normalized;

        // Move toward waypoint
        transform.position += direction * moveSpeed * Time.deltaTime;

        // Check if we've reached it
        float distance = Vector3.Distance(transform.position, targetWaypoint.position);
        if (distance < waypointReachDistance)
        {
            return NodeStatus.Success;
        }

        return NodeStatus.Running;
    }

    /// <summary>
    /// Action: Wait for 1 second before continuing.
    /// </summary>
    NodeStatus Wait()
    {
        if (!isWaiting)
        {
            isWaiting = true;
            waitTimer = 0f;
        }

        waitTimer += Time.deltaTime;

        if (waitTimer >= 1f)
        {
            isWaiting = false;
            return NodeStatus.Success;
        }

        return NodeStatus.Running;
    }

    /// <summary>
    /// Action: Advance to the next waypoint (loops back to start).
    /// </summary>
    NodeStatus NextWaypoint()
    {
        currentWaypointIndex = (currentWaypointIndex + 1) % waypoints.Length;
        treeRunner.Blackboard.Set("waypointIndex", currentWaypointIndex);
        return NodeStatus.Success;
    }

    void OnDrawGizmos()
    {
        // Draw waypoints
        if (waypoints != null && waypoints.Length > 0)
        {
            Gizmos.color = Color.cyan;

            for (int i = 0; i < waypoints.Length; i++)
            {
                if (waypoints[i] == null) continue;

                // Draw waypoint sphere
                bool isCurrent = Application.isPlaying && i == currentWaypointIndex;
                Gizmos.color = isCurrent ? Color.green : Color.cyan;
                Gizmos.DrawWireSphere(waypoints[i].position, 0.5f);

                // Draw line to next waypoint
                int nextIndex = (i + 1) % waypoints.Length;
                if (waypoints[nextIndex] != null)
                {
                    Gizmos.color = Color.cyan;
                    Gizmos.DrawLine(waypoints[i].position, waypoints[nextIndex].position);
                }
            }
        }
    }
}
