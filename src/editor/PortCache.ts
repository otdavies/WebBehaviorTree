import { TreeNode } from '../core/TreeNode.js';
import { Vector2 } from '../utils/Vector2.js';
import { NodeRenderer } from './NodeRenderer.js';

/**
 * Represents a cached port with its world position and metadata
 */
interface CachedPort {
    node: TreeNode;
    type: 'input' | 'output';
    index: number;
    position: Vector2;
    isMultiPort?: boolean;
    clickRadius: number;
}

/**
 * Spatial grid cell containing ports
 */
interface GridCell {
    ports: CachedPort[];
}

/**
 * PortCache: Spatial indexing for fast port hit testing
 *
 * This class provides O(1) or O(log n) lookup for ports at a given position,
 * significantly improving performance over O(n) iteration through all nodes.
 *
 * The cache uses a spatial hash grid to partition space into cells. Each cell
 * contains only the ports that overlap with that cell's bounds, allowing for
 * fast spatial queries.
 *
 * **Performance:**
 * - Without cache: O(n) where n = number of nodes
 * - With cache: O(k) where k = average ports per grid cell (typically 1-2)
 *
 * **Cache Invalidation:**
 * The cache must be invalidated when:
 * 1. Nodes are added/removed
 * 2. Nodes are moved
 * 3. Viewport zoom changes (affects click radius in world space)
 * 4. Node children change (affects output ports)
 */
export class PortCache {
    private nodeRenderer: NodeRenderer;

    // Spatial grid configuration
    private readonly GRID_CELL_SIZE = 100; // World space units per cell

    // Cache state
    private grid: Map<string, GridCell> = new Map();
    private isValid: boolean = false;

    // Port click radius (updated based on zoom)
    private clickRadius: number = NodeRenderer.PORT_CLICK_RADIUS;

    constructor(nodeRenderer: NodeRenderer) {
        this.nodeRenderer = nodeRenderer;
    }

    /**
     * Rebuilds the entire port cache
     *
     * This should be called whenever nodes are added/removed/moved or
     * when the viewport zoom changes significantly.
     *
     * @param nodes - All nodes in the editor
     * @param zoom - Current viewport zoom level
     */
    public rebuild(nodes: TreeNode[], _zoom: number): void {
        this.grid.clear();
        this.clickRadius = NodeRenderer.PORT_CLICK_RADIUS;

        // Add all ports to the grid
        for (const node of nodes) {
            this.addNodePorts(node);
        }

        this.isValid = true;
    }

    /**
     * Invalidates the cache, forcing a rebuild on next query
     */
    public invalidate(): void {
        this.isValid = false;
    }

    /**
     * Checks if the cache is valid
     */
    public isValidCache(): boolean {
        return this.isValid;
    }

    /**
     * Finds a port at the given world position
     *
     * This uses the spatial grid for fast lookup, only checking ports
     * in nearby grid cells.
     *
     * @param point - World space position to check
     * @returns Port information if found, null otherwise
     */
    public getPortAtPoint(point: Vector2): { node: TreeNode; port: { type: 'input' | 'output'; index: number; isMultiPort?: boolean } } | null {
        if (!this.isValid) {
            return null; // Cache not built yet
        }

        // Get all cells that might contain the point (including neighboring cells for edge cases)
        const cellsToCheck = this.getCellsNearPoint(point, this.clickRadius);

        // Check all ports in these cells
        for (const cellKey of cellsToCheck) {
            const cell = this.grid.get(cellKey);
            if (!cell) continue;

            for (const cachedPort of cell.ports) {
                const distance = cachedPort.position.distanceTo(point);
                if (distance <= cachedPort.clickRadius) {
                    return {
                        node: cachedPort.node,
                        port: {
                            type: cachedPort.type,
                            index: cachedPort.index,
                            isMultiPort: cachedPort.isMultiPort
                        }
                    };
                }
            }
        }

        return null;
    }

    /**
     * Adds all ports for a given node to the spatial grid
     */
    private addNodePorts(node: TreeNode): void {
        // Add input port if node has inputs
        if (node.numInputs > 0) {
            const inputPos = this.nodeRenderer.getInputPortPosition(node, node.position);
            this.addPortToGrid({
                node,
                type: 'input',
                index: 0,
                position: inputPos,
                isMultiPort: node.inputPortType === 'multi',
                clickRadius: this.clickRadius
            });
        }

        // Add output ports
        if (node.category === 'composite' || node.category === 'decorator') {
            const isMultiPort = node.outputPortType === 'multi';
            const outputPositions = this.nodeRenderer.getOutputPortPositions(
                node,
                node.position,
                node.children.length,
                false
            );

            if (isMultiPort) {
                // For multi-ports, always add one port (even with 0 children)
                // Multi-ports always return at least one position
                if (outputPositions.length > 0) {
                    this.addPortToGrid({
                        node,
                        type: 'output',
                        index: 0,
                        position: outputPositions[0], // All positions are the same for multi-ports
                        isMultiPort: true,
                        clickRadius: this.clickRadius
                    });
                }
            } else {
                // For single ports, only add ports for existing children
                // (no port shown until you have at least one child)
                for (let i = 0; i < node.children.length; i++) {
                    this.addPortToGrid({
                        node,
                        type: 'output',
                        index: i,
                        position: outputPositions[i],
                        isMultiPort: false,
                        clickRadius: this.clickRadius
                    });
                }
            }
        }
    }

    /**
     * Adds a single port to all grid cells it overlaps with
     */
    private addPortToGrid(port: CachedPort): void {
        // Find all cells this port overlaps (considering its click radius)
        const cellKeys = this.getCellsNearPoint(port.position, port.clickRadius);

        for (const cellKey of cellKeys) {
            let cell = this.grid.get(cellKey);
            if (!cell) {
                cell = { ports: [] };
                this.grid.set(cellKey, cell);
            }
            cell.ports.push(port);
        }
    }

    /**
     * Gets all grid cell keys that might contain a point within a given radius
     *
     * This returns the cell containing the point plus all neighboring cells
     * that could potentially overlap with the search radius.
     *
     * @param point - Center point in world space
     * @param radius - Search radius
     * @returns Array of cell keys to check
     */
    private getCellsNearPoint(point: Vector2, radius: number): string[] {
        const cellSize = this.GRID_CELL_SIZE;

        // Calculate the bounding box of the search area
        const minX = Math.floor((point.x - radius) / cellSize);
        const maxX = Math.floor((point.x + radius) / cellSize);
        const minY = Math.floor((point.y - radius) / cellSize);
        const maxY = Math.floor((point.y + radius) / cellSize);

        const cellKeys: string[] = [];

        // Collect all cells in the bounding box
        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                cellKeys.push(this.getCellKey(x, y));
            }
        }

        return cellKeys;
    }

    /**
     * Generates a cell key from grid coordinates
     */
    private getCellKey(gridX: number, gridY: number): string {
        return `${gridX},${gridY}`;
    }

    /**
     * Gets statistics about the cache for debugging/monitoring
     */
    public getStats(): { totalCells: number; totalPorts: number; avgPortsPerCell: number } {
        let totalPorts = 0;
        for (const cell of this.grid.values()) {
            totalPorts += cell.ports.length;
        }

        return {
            totalCells: this.grid.size,
            totalPorts,
            avgPortsPerCell: this.grid.size > 0 ? totalPorts / this.grid.size : 0
        };
    }
}
