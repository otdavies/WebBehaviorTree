import { TreeNode } from '../core/TreeNode.js';
import { ParameterDefinition } from '../core/NodeParameter.js';

/**
 * InspectorPanel: Unity-style inspector for viewing and editing node properties
 */
export class InspectorPanel {
    private panel: HTMLElement;
    private currentNode: TreeNode | null = null;

    public onParameterChange?: (node: TreeNode, paramName: string, value: any) => void;

    constructor() {
        // Panel will be created in the HTML
        this.panel = document.getElementById('inspector-panel')!;
    }

    /**
     * Shows the inspector for a specific node
     */
    public inspect(node: TreeNode | null): void {
        this.currentNode = node;
        this.render();
    }

    /**
     * Refreshes the current inspector view
     */
    public refresh(): void {
        if (this.currentNode) {
            this.render();
        }
    }

    /**
     * Renders the inspector content
     */
    private render(): void {
        if (!this.currentNode) {
            this.panel.innerHTML = `
                <div class="inspector-empty">
                    <i class="fas fa-info-circle"></i>
                    <p>Select a node to inspect</p>
                </div>
            `;
            return;
        }

        const node = this.currentNode;

        let html = `
            <div class="inspector-header">
                <i class="fas ${node.icon}" style="color: ${node.color}"></i>
                <div class="inspector-title">
                    <div class="inspector-node-type">${node.type.toUpperCase()}</div>
                    <div class="inspector-node-label">${node.label}</div>
                </div>
            </div>

            <div class="inspector-section">
                <div class="inspector-section-title">Properties</div>
                <div class="inspector-property">
                    <label>ID</label>
                    <input type="text" value="${node.id}" readonly />
                </div>
                <div class="inspector-property">
                    <label>Label</label>
                    <input type="text" value="${node.label}" id="inspector-label" />
                </div>
                <div class="inspector-property">
                    <label>Position</label>
                    <div class="inspector-property-row">
                        <input type="number" value="${node.position.x.toFixed(1)}" readonly style="width: 45%;" />
                        <input type="number" value="${node.position.y.toFixed(1)}" readonly style="width: 45%;" />
                    </div>
                </div>
            </div>
        `;

        // Add parameters section if the node has any
        const paramDefs = node.parameters.getDefinitions();
        if (paramDefs.size > 0) {
            html += '<div class="inspector-section">';
            html += '<div class="inspector-section-title">Parameters</div>';

            paramDefs.forEach((def, name) => {
                html += this.renderParameter(name, def, node.parameters.get(name));
            });

            html += '</div>';
        }

        // Add children count for composite/decorator nodes
        if (node.category !== 'leaf') {
            html += `
                <div class="inspector-section">
                    <div class="inspector-section-title">Children</div>
                    <div class="inspector-property">
                        <label>Count</label>
                        <input type="number" value="${node.children.length}" readonly />
                    </div>
                </div>
            `;
        }

        this.panel.innerHTML = html;

        // Attach event listeners
        this.attachEventListeners();
    }

    /**
     * Renders a single parameter input
     */
    private renderParameter(name: string, def: ParameterDefinition, value: any): string {
        const inputId = `inspector-param-${name}`;

        let inputHtml = '';

        switch (def.type) {
            case 'number':
                inputHtml = `
                    <input
                        type="number"
                        id="${inputId}"
                        value="${value}"
                        ${def.min !== undefined ? `min="${def.min}"` : ''}
                        ${def.max !== undefined ? `max="${def.max}"` : ''}
                    />
                `;
                break;

            case 'string':
                inputHtml = `
                    <input
                        type="text"
                        id="${inputId}"
                        value="${value}"
                    />
                `;
                break;

            case 'boolean':
                inputHtml = `
                    <input
                        type="checkbox"
                        id="${inputId}"
                        ${value ? 'checked' : ''}
                    />
                `;
                break;

            case 'select':
                inputHtml = `
                    <select id="${inputId}">
                        ${def.options?.map(opt => `
                            <option value="${opt}" ${opt === value ? 'selected' : ''}>
                                ${opt}
                            </option>
                        `).join('')}
                    </select>
                `;
                break;
        }

        return `
            <div class="inspector-property">
                <label title="${def.description || ''}">${def.label}</label>
                ${inputHtml}
            </div>
        `;
    }

    /**
     * Attaches event listeners to inspector inputs
     */
    private attachEventListeners(): void {
        if (!this.currentNode) return;

        // Label input
        const labelInput = document.getElementById('inspector-label') as HTMLInputElement;
        if (labelInput) {
            labelInput.addEventListener('change', () => {
                if (this.currentNode) {
                    this.currentNode.label = labelInput.value;
                }
            });
        }

        // Parameter inputs
        const paramDefs = this.currentNode.parameters.getDefinitions();
        paramDefs.forEach((def, name) => {
            const input = document.getElementById(`inspector-param-${name}`) as HTMLInputElement;
            if (!input) return;

            const handleChange = () => {
                if (!this.currentNode) return;

                let value: any;
                if (def.type === 'boolean') {
                    value = input.checked;
                } else if (def.type === 'number') {
                    value = parseFloat(input.value);
                } else {
                    value = input.value;
                }

                this.currentNode.parameters.set(name, value);

                if (this.onParameterChange) {
                    this.onParameterChange(this.currentNode, name, value);
                }
            };

            if (def.type === 'boolean') {
                input.addEventListener('change', handleChange);
            } else {
                input.addEventListener('input', handleChange);
            }
        });
    }
}
