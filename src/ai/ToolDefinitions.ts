import { ModelInterface, OperationResult } from './ModelInterface.js';

/**
 * OpenRouter tool definition structure (OpenAI-compatible format)
 */
export interface OpenRouterTool {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: {
            type: 'object';
            properties: Record<string, any>;
            required: string[];
        };
    };
}

/**
 * Tool call from Claude
 */
export interface ToolCall {
    name: string;
    args: Record<string, any>;
}

/**
 * Tool definitions that map to ModelInterface operations
 *
 * These tools allow Claude to interact with the behavior tree editor
 * programmatically. All operations go through the Operation pattern
 * for proper undo/redo support.
 */
export const TOOL_DEFINITIONS: OpenRouterTool[] = [
    // ========================================================================
    // NODE OPERATIONS
    // ========================================================================

    {
        type: 'function',
        function: {
            name: 'create_node',
            description: 'Creates a new node in the behavior tree at the specified position. Use this to add new nodes of any type (composite, decorator, or leaf).',
            parameters: {
                type: 'object',
                properties: {
                    type: {
                        type: 'string',
                        description: 'Node type to create',
                        enum: [
                            'sequence',
                            'selector',
                            'parallel',
                            'inverter',
                            'repeater',
                            'until-fail',
                            'until-success',
                            'start',
                            'action',
                            'wait',
                            'goto'
                        ]
                    },
                    position: {
                        type: 'object',
                        description: 'Position in world space (canvas coordinates)',
                        properties: {
                            x: { type: 'number', description: 'X coordinate' },
                            y: { type: 'number', description: 'Y coordinate' }
                        },
                        required: ['x', 'y']
                    },
                    label: {
                        type: 'string',
                        description: 'Optional custom label for the node. If not provided, uses default label based on type.'
                    },
                    code: {
                        type: 'string',
                        description: 'Optional JavaScript code for action nodes. Should return NodeStatus.SUCCESS, FAILURE, or RUNNING.'
                    }
                },
                required: ['type', 'position']
            }
        }
    },

    {
        type: 'function',
        function: {
            name: 'delete_node',
            description: 'Deletes a node from the behavior tree by its ID. This will also disconnect the node from its parent and children.',
            parameters: {
                type: 'object',
                properties: {
                    nodeId: {
                        type: 'string',
                        description: 'ID of the node to delete'
                    }
                },
                required: ['nodeId']
            }
        }
    },

    {
        type: 'function',
        function: {
            name: 'update_node_code',
            description: 'Updates the JavaScript code of an action node. If nodeId is not provided, updates the node currently open in the code editor. The code should use the blackboard API and return a NodeStatus.',
            parameters: {
                type: 'object',
                properties: {
                    nodeId: {
                        type: 'string',
                        description: 'ID of the node to update. If omitted, updates the currently open node in the code editor.'
                    },
                    code: {
                        type: 'string',
                        description: 'New JavaScript code. Should use blackboard.get()/set() and return NodeStatus.SUCCESS/FAILURE/RUNNING.'
                    }
                },
                required: ['code']
            }
        }
    },

    {
        type: 'function',
        function: {
            name: 'update_node_label',
            description: 'Updates the display label of a node. Use this to give nodes meaningful names.',
            parameters: {
                type: 'object',
                properties: {
                    nodeId: {
                        type: 'string',
                        description: 'ID of the node to update'
                    },
                    label: {
                        type: 'string',
                        description: 'New label text'
                    }
                },
                required: ['nodeId', 'label']
            }
        }
    },

    {
        type: 'function',
        function: {
            name: 'move_node',
            description: 'Moves a node to a new position on the canvas. Useful for organizing the tree layout.',
            parameters: {
                type: 'object',
                properties: {
                    nodeId: {
                        type: 'string',
                        description: 'ID of the node to move'
                    },
                    position: {
                        type: 'object',
                        description: 'New position in world space',
                        properties: {
                            x: { type: 'number', description: 'X coordinate' },
                            y: { type: 'number', description: 'Y coordinate' }
                        },
                        required: ['x', 'y']
                    }
                },
                required: ['nodeId', 'position']
            }
        }
    },

    {
        type: 'function',
        function: {
            name: 'duplicate_node',
            description: 'Creates a copy of an existing node with an optional position offset.',
            parameters: {
                type: 'object',
                properties: {
                    nodeId: {
                        type: 'string',
                        description: 'ID of the node to duplicate'
                    },
                    offset: {
                        type: 'object',
                        description: 'Optional position offset from original node (defaults to {x: 50, y: 50})',
                        properties: {
                            x: { type: 'number', description: 'X offset' },
                            y: { type: 'number', description: 'Y offset' }
                        },
                        required: ['x', 'y']
                    }
                },
                required: ['nodeId']
            }
        }
    },

    // ========================================================================
    // CONNECTION OPERATIONS
    // ========================================================================

    {
        type: 'function',
        function: {
            name: 'connect_nodes',
            description: 'Connects a child node to a parent node. Creates a parent-child relationship in the behavior tree.',
            parameters: {
                type: 'object',
                properties: {
                    parentId: {
                        type: 'string',
                        description: 'ID of the parent node'
                    },
                    childId: {
                        type: 'string',
                        description: 'ID of the child node'
                    },
                    index: {
                        type: 'number',
                        description: 'Optional index in parent\'s children array. If not specified, adds to end.'
                    }
                },
                required: ['parentId', 'childId']
            }
        }
    },

    {
        type: 'function',
        function: {
            name: 'disconnect_node',
            description: 'Disconnects a node from its parent. The node remains in the tree but becomes unconnected.',
            parameters: {
                type: 'object',
                properties: {
                    nodeId: {
                        type: 'string',
                        description: 'ID of the node to disconnect from its parent'
                    }
                },
                required: ['nodeId']
            }
        }
    },

    // ========================================================================
    // SELECTION OPERATIONS
    // ========================================================================

    {
        type: 'function',
        function: {
            name: 'select_nodes',
            description: 'Selects one or more nodes in the editor. Selected nodes are highlighted visually.',
            parameters: {
                type: 'object',
                properties: {
                    nodeIds: {
                        type: 'array',
                        description: 'Array of node IDs to select',
                        items: { type: 'string' }
                    },
                    addToSelection: {
                        type: 'boolean',
                        description: 'Whether to add to current selection (true) or replace it (false). Default: false'
                    }
                },
                required: ['nodeIds']
            }
        }
    },

    {
        type: 'function',
        function: {
            name: 'deselect_all',
            description: 'Clears all node selections in the editor.',
            parameters: {
                type: 'object',
                properties: {},
                required: []
            }
        }
    },

    // ========================================================================
    // VIEWPORT OPERATIONS
    // ========================================================================

    {
        type: 'function',
        function: {
            name: 'pan_viewport',
            description: 'Pans the viewport by the specified offset. Useful for navigating to different areas of the tree.',
            parameters: {
                type: 'object',
                properties: {
                    x: {
                        type: 'number',
                        description: 'X offset in screen space (pixels)'
                    },
                    y: {
                        type: 'number',
                        description: 'Y offset in screen space (pixels)'
                    }
                },
                required: ['x', 'y']
            }
        }
    },

    {
        type: 'function',
        function: {
            name: 'set_zoom',
            description: 'Sets the viewport zoom level. 1.0 = 100%, 2.0 = 200%, 0.5 = 50%.',
            parameters: {
                type: 'object',
                properties: {
                    zoom: {
                        type: 'number',
                        description: 'Zoom level (typically between 0.1 and 3.0)'
                    }
                },
                required: ['zoom']
            }
        }
    },

    {
        type: 'function',
        function: {
            name: 'focus_node',
            description: 'Centers the viewport on a specific node.',
            parameters: {
                type: 'object',
                properties: {
                    nodeId: {
                        type: 'string',
                        description: 'ID of the node to focus on'
                    }
                },
                required: ['nodeId']
            }
        }
    },

    // ========================================================================
    // TREE EXECUTION OPERATIONS
    // ========================================================================

    {
        type: 'function',
        function: {
            name: 'play_tree',
            description: 'Starts executing the behavior tree from the root node.',
            parameters: {
                type: 'object',
                properties: {},
                required: []
            }
        }
    },

    {
        type: 'function',
        function: {
            name: 'pause_tree',
            description: 'Pauses the currently running behavior tree execution.',
            parameters: {
                type: 'object',
                properties: {},
                required: []
            }
        }
    },

    {
        type: 'function',
        function: {
            name: 'step_tree',
            description: 'Executes exactly one tick of the behavior tree. Useful for debugging step-by-step.',
            parameters: {
                type: 'object',
                properties: {},
                required: []
            }
        }
    },

    {
        type: 'function',
        function: {
            name: 'reset_tree',
            description: 'Resets the behavior tree execution state. Clears all node statuses and resets the tick count.',
            parameters: {
                type: 'object',
                properties: {},
                required: []
            }
        }
    },

    // ========================================================================
    // QUERY OPERATIONS
    // ========================================================================

    {
        type: 'function',
        function: {
            name: 'get_node',
            description: 'Retrieves detailed information about a specific node by its ID.',
            parameters: {
                type: 'object',
                properties: {
                    nodeId: {
                        type: 'string',
                        description: 'ID of the node to query'
                    }
                },
                required: ['nodeId']
            }
        }
    },

    {
        type: 'function',
        function: {
            name: 'get_available_node_types',
            description: 'Returns a list of all available node types that can be created, including their categories, descriptions, and icons.',
            parameters: {
                type: 'object',
                properties: {},
                required: []
            }
        }
    },

    {
        type: 'function',
        function: {
            name: 'get_execution_state',
            description: 'Gets the current execution state of the behavior tree, including whether it\'s running, tick count, and root node.',
            parameters: {
                type: 'object',
                properties: {},
                required: []
            }
        }
    },

    {
        type: 'function',
        function: {
            name: 'get_open_node',
            description: 'Gets the node currently open in the code editor panel. Use this to see which node the user is actively editing.',
            parameters: {
                type: 'object',
                properties: {},
                required: []
            }
        }
    }
];

/**
 * Executes a tool call by routing it to the appropriate ModelInterface method
 *
 * @param toolCall - Tool call from Claude with name and arguments
 * @param modelInterface - ModelInterface instance to execute operations on
 * @returns Result of the operation
 */
export async function executeToolCall(
    toolCall: ToolCall,
    modelInterface: ModelInterface
): Promise<OperationResult> {
    const { name, args } = toolCall;

    try {
        switch (name) {
            // Node operations
            case 'create_node':
                return modelInterface.createNode(
                    args.type,
                    args.position,
                    args.label,
                    args.code
                );

            case 'delete_node':
                return modelInterface.deleteNode(args.nodeId);

            case 'update_node_code':
                // If nodeId is provided, use it. Otherwise, use open node
                return args.nodeId
                    ? modelInterface.updateNodeCode(args.nodeId, args.code)
                    : modelInterface.updateNodeCode(args.code);

            case 'update_node_label':
                return modelInterface.updateNodeLabel(args.nodeId, args.label);

            case 'move_node':
                return modelInterface.moveNode(args.nodeId, args.position);

            case 'duplicate_node':
                return modelInterface.duplicateNode(args.nodeId, args.offset);

            // Connection operations
            case 'connect_nodes':
                return modelInterface.connectNodes(
                    args.parentId,
                    args.childId,
                    args.index
                );

            case 'disconnect_node':
                return modelInterface.disconnectNode(args.nodeId);

            // Selection operations
            case 'select_nodes':
                return modelInterface.selectNodes(
                    args.nodeIds,
                    args.addToSelection
                );

            case 'deselect_all':
                return modelInterface.deselectAll();

            // Viewport operations
            case 'pan_viewport':
                return modelInterface.panViewport(args.x, args.y);

            case 'set_zoom':
                return modelInterface.setZoom(args.zoom);

            case 'focus_node':
                return modelInterface.focusNode(args.nodeId);

            // Tree execution operations
            case 'play_tree':
                return modelInterface.playTree();

            case 'pause_tree':
                return modelInterface.pauseTree();

            case 'step_tree':
                return modelInterface.stepTree();

            case 'reset_tree':
                return modelInterface.resetTree();

            // Query operations
            case 'get_node':
                return modelInterface.getNode(args.nodeId);

            case 'get_available_node_types':
                return modelInterface.getAvailableNodeTypes();

            case 'get_execution_state':
                return modelInterface.getExecutionState();

            case 'get_open_node':
                return modelInterface.getOpenNode();

            default:
                return {
                    success: false,
                    error: `Unknown tool: ${name}`
                };
        }
    } catch (error) {
        return {
            success: false,
            error: `Tool execution failed: ${(error as Error).message}`
        };
    }
}
