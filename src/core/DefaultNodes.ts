import { NodeRegistry } from './NodeRegistry.js';
import { SequenceNode } from '../nodes/composites/SequenceNode.js';
import { SelectorNode } from '../nodes/composites/SelectorNode.js';
import { ParallelNode } from '../nodes/composites/ParallelNode.js';
import { InverterNode } from '../nodes/decorators/InverterNode.js';
import { RepeaterNode } from '../nodes/decorators/RepeaterNode.js';
import { UntilFailNode } from '../nodes/decorators/UntilFailNode.js';
import { UntilSuccessNode } from '../nodes/decorators/UntilSuccessNode.js';
import { StartNode } from '../nodes/decorators/StartNode.js';
import { ActionNode } from '../nodes/leaves/ActionNode.js';
import { WaitNode } from '../nodes/leaves/WaitNode.js';
import { GoToNode } from '../nodes/leaves/GoToNode.js';

/**
 * Registers all default node types with the NodeRegistry.
 * Call this once at application startup.
 */
export function registerDefaultNodes(): void {
    // Start Node (Root Entry Point)
    NodeRegistry.register({
        type: 'start',
        category: 'decorator',
        label: 'Start',
        description: 'The root entry point of the behavior tree',
        icon: 'fa-play',
        factory: () => new StartNode(),
        tags: ['root', 'start', 'entry', 'begin']
    });

    // Composite Nodes
    NodeRegistry.register({
        type: 'sequence',
        category: 'composite',
        label: 'Sequence',
        description: 'Executes children in order until one fails',
        icon: 'fa-arrow-right',
        factory: () => new SequenceNode(),
        tags: ['composite', 'control', 'sequence', 'and']
    });

    NodeRegistry.register({
        type: 'selector',
        category: 'composite',
        label: 'Selector',
        description: 'Executes children in order until one succeeds',
        icon: 'fa-question',
        factory: () => new SelectorNode(),
        tags: ['composite', 'control', 'selector', 'or', 'fallback']
    });

    NodeRegistry.register({
        type: 'parallel',
        category: 'composite',
        label: 'Parallel',
        description: 'Executes all children simultaneously',
        icon: 'fa-bars',
        factory: () => new ParallelNode(),
        tags: ['composite', 'control', 'parallel', 'concurrent']
    });

    // Decorator Nodes
    NodeRegistry.register({
        type: 'inverter',
        category: 'decorator',
        label: 'Inverter',
        description: 'Inverts the result of its child (SUCCESS ↔ FAILURE)',
        icon: 'fa-exchange-alt',
        factory: () => new InverterNode(),
        tags: ['decorator', 'inverter', 'not', 'flip']
    });

    NodeRegistry.register({
        type: 'repeater',
        category: 'decorator',
        label: 'Repeater',
        description: 'Repeats its child a specified number of times',
        icon: 'fa-redo',
        factory: () => new RepeaterNode(),
        tags: ['decorator', 'repeater', 'loop', 'repeat']
    });

    NodeRegistry.register({
        type: 'until-fail',
        category: 'decorator',
        label: 'Until Fail',
        description: 'Repeats its child until it fails',
        icon: 'fa-repeat',
        factory: () => new UntilFailNode(),
        tags: ['decorator', 'until', 'fail', 'loop']
    });

    NodeRegistry.register({
        type: 'until-success',
        category: 'decorator',
        label: 'Until Success',
        description: 'Repeats its child until it succeeds',
        icon: 'fa-repeat',
        factory: () => new UntilSuccessNode(),
        tags: ['decorator', 'until', 'success', 'loop']
    });

    // Leaf Nodes (Actions)
    NodeRegistry.register({
        type: 'action',
        category: 'leaf',
        label: 'Action',
        description: 'Custom programmable action with user-defined code',
        icon: 'fa-bolt',
        factory: () => new ActionNode(),
        tags: ['leaf', 'action', 'custom', 'code', 'programmable']
    });

    NodeRegistry.register({
        type: 'wait',
        category: 'leaf',
        label: 'Wait',
        description: 'Waits for a specified number of ticks',
        icon: 'fa-clock',
        factory: () => new WaitNode(),
        tags: ['leaf', 'action', 'wait', 'delay', 'timer', 'pause']
    });

    NodeRegistry.register({
        type: 'goto',
        category: 'leaf',
        label: 'GoTo',
        description: 'Executes another action node by name',
        icon: 'fa-arrow-right',
        factory: () => new GoToNode(),
        tags: ['leaf', 'action', 'goto', 'jump', 'call', 'delegate']
    });
}
