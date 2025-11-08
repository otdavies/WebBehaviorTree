using System.Collections.Generic;

namespace WebBehaviorTree
{
    /// <summary>
    /// Shared data storage for behavior tree nodes.
    /// Allows nodes to communicate by reading and writing values.
    /// </summary>
    public class Blackboard
    {
        private readonly Dictionary<string, object> data = new Dictionary<string, object>();

        /// <summary>
        /// Set a value in the blackboard.
        /// </summary>
        public void Set<T>(string key, T value)
        {
            data[key] = value;
        }

        /// <summary>
        /// Get a value from the blackboard.
        /// Returns the default value if the key doesn't exist or type doesn't match.
        /// </summary>
        public T Get<T>(string key, T defaultValue = default)
        {
            if (data.TryGetValue(key, out var value) && value is T typed)
            {
                return typed;
            }
            return defaultValue;
        }

        /// <summary>
        /// Check if a key exists in the blackboard.
        /// </summary>
        public bool Has(string key)
        {
            return data.ContainsKey(key);
        }

        /// <summary>
        /// Remove a key from the blackboard.
        /// </summary>
        public void Remove(string key)
        {
            data.Remove(key);
        }

        /// <summary>
        /// Clear all data from the blackboard.
        /// </summary>
        public void Clear()
        {
            data.Clear();
        }

        /// <summary>
        /// Get all keys currently in the blackboard.
        /// </summary>
        public IEnumerable<string> Keys => data.Keys;
    }
}
