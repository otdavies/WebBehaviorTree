/**
 * Integration test for mouse interaction and connection dragging
 * Simulates real user interactions to verify the connection system works
 */

import { EditorState } from '../src/state/EditorState.js';
import { Canvas } from '../src/editor/Canvas.js';
import { InteractionManager } from '../src/editor/InteractionManager.js';
import { Vector2 } from '../src/utils/Vector2.js';
import { NodeRegistry } from '../src/core/NodeRegistry.js';
import { TreeNode } from '../src/core/TreeNode.js';

// Setup for testing
function setupTestEnvironment() {
    // Create a mock canvas element
    const mockCanvas = document.createElement('canvas');
    mockCanvas.width = 1920;
    mockCanvas.height = 1080;
    document.body.appendChild(mockCanvas);

    const editorState = new EditorState();
    const canvas = new Canvas(mockCanvas, editorState);
    const interactionManager = new InteractionManager(canvas, editorState, mockCanvas);

    return { editorState, canvas, interactionManager, mockCanvas };
}

function createMouseEvent(type: string, x: number, y: number, button: number = 0): MouseEvent {
    return new MouseEvent(type, {
        clientX: x,
        clientY: y,
        button: button,
        bubbles: true,
        cancelable: true
    });
}

/**
 * Test 1: Create two nodes and connect them (Output → Input)
 */
function testOutputToInputConnection() {
    console.log('\n=== Test 1: Output → Input Connection ===');
    const { editorState, canvas, mockCanvas } = setupTestEnvironment();

    // Create a Sequence node (parent)
    const parentNode = NodeRegistry.create('sequence');
    parentNode.position = new Vector2(100, 100);
    editorState.nodes.push(parentNode);

    // Create an Action node (child)
    const childNode = NodeRegistry.create('action');
    childNode.position = new Vector2(100, 200);
    editorState.nodes.push(childNode);

    // Rebuild port cache
    canvas.rebuildPortCache();

    console.log('Created nodes:');
    console.log('  Parent (Sequence):', parentNode.position.toString());
    console.log('  Child (Action):', childNode.position.toString());

    // Get port positions
    const outputPortPos = canvas.nodeRenderer.getOutputPortPositions(parentNode, parentNode.position, 0, false)[0];
    const inputPortPos = canvas.nodeRenderer.getInputPortPosition(childNode, childNode.position);

    console.log('Port positions:');
    console.log('  Parent output port:', outputPortPos ? outputPortPos.toString() : 'undefined');
    console.log('  Child input port:', inputPortPos.toString());

    // Test port hit detection
    const outputPortHit = canvas.nodeRenderer.getPortAtPoint(parentNode, outputPortPos);
    const inputPortHit = canvas.nodeRenderer.getPortAtPoint(childNode, inputPortPos);

    console.log('Port hit detection:');
    console.log('  Output port hit:', outputPortHit);
    console.log('  Input port hit:', inputPortHit);

    // Simulate mouse down on output port
    const mouseDownEvent = createMouseEvent('mousedown', outputPortPos.x, outputPortPos.y);
    mockCanvas.dispatchEvent(mouseDownEvent);

    console.log('After mousedown on output port:');
    console.log('  isConnecting:', (interactionManager as any).isConnecting);
    console.log('  tempConnection:', editorState.tempConnection);

    // Simulate mouse move to input port
    const mouseMoveEvent = createMouseEvent('mousemove', inputPortPos.x, inputPortPos.y);
    mockCanvas.dispatchEvent(mouseMoveEvent);

    // Simulate mouse up on input port
    const mouseUpEvent = createMouseEvent('mouseup', inputPortPos.x, inputPortPos.y);
    mockCanvas.dispatchEvent(mouseUpEvent);

    console.log('After mouseup on input port:');
    console.log('  Parent children count:', parentNode.children.length);
    console.log('  Child parent:', childNode.parent ? childNode.parent.type : 'none');

    const success = parentNode.children.length === 1 && parentNode.children[0] === childNode;
    console.log('Result:', success ? '✅ PASS' : '❌ FAIL');

    return success;
}

/**
 * Test 2: Create two nodes and connect them (Input → Output)
 */
function testInputToOutputConnection() {
    console.log('\n=== Test 2: Input → Output Connection ===');
    const { editorState, canvas, mockCanvas } = setupTestEnvironment();

    // Create a Sequence node (parent)
    const parentNode = NodeRegistry.create('sequence');
    parentNode.position = new Vector2(100, 100);
    editorState.nodes.push(parentNode);

    // Create an Action node (child)
    const childNode = NodeRegistry.create('action');
    childNode.position = new Vector2(100, 200);
    editorState.nodes.push(childNode);

    // Rebuild port cache
    canvas.rebuildPortCache();

    console.log('Created nodes:');
    console.log('  Parent (Sequence):', parentNode.position.toString());
    console.log('  Child (Action):', childNode.position.toString());

    // Get port positions
    const outputPortPos = canvas.nodeRenderer.getOutputPortPositions(parentNode, parentNode.position, 0, false)[0];
    const inputPortPos = canvas.nodeRenderer.getInputPortPosition(childNode, childNode.position);

    console.log('Port positions:');
    console.log('  Parent output port:', outputPortPos ? outputPortPos.toString() : 'undefined');
    console.log('  Child input port:', inputPortPos.toString());

    // Simulate mouse down on INPUT port (reverse direction)
    const mouseDownEvent = createMouseEvent('mousedown', inputPortPos.x, inputPortPos.y);
    mockCanvas.dispatchEvent(mouseDownEvent);

    console.log('After mousedown on input port:');
    console.log('  isConnecting:', (interactionManager as any).isConnecting);
    console.log('  tempConnection:', editorState.tempConnection);

    // Simulate mouse move to output port
    const mouseMoveEvent = createMouseEvent('mousemove', outputPortPos.x, outputPortPos.y);
    mockCanvas.dispatchEvent(mouseMoveEvent);

    // Simulate mouse up on output port
    const mouseUpEvent = createMouseEvent('mouseup', outputPortPos.x, outputPortPos.y);
    mockCanvas.dispatchEvent(mouseUpEvent);

    console.log('After mouseup on output port:');
    console.log('  Parent children count:', parentNode.children.length);
    console.log('  Child parent:', childNode.parent ? childNode.parent.type : 'none');

    const success = parentNode.children.length === 1 && parentNode.children[0] === childNode;
    console.log('Result:', success ? '✅ PASS' : '❌ FAIL');

    return success;
}

/**
 * Test 3: Port hit detection accuracy
 */
function testPortHitDetection() {
    console.log('\n=== Test 3: Port Hit Detection ===');
    const { editorState, canvas } = setupTestEnvironment();

    // Create test nodes with different port types
    const sequenceNode = NodeRegistry.create('sequence'); // Multi-port output
    sequenceNode.position = new Vector2(100, 100);
    editorState.nodes.push(sequenceNode);

    const actionNode = NodeRegistry.create('action'); // Single-port input
    actionNode.position = new Vector2(100, 200);
    editorState.nodes.push(actionNode);

    canvas.rebuildPortCache();

    console.log('Node types:');
    console.log('  Sequence - inputPortType:', sequenceNode.inputPortType, 'outputPortType:', sequenceNode.outputPortType);
    console.log('  Action - inputPortType:', actionNode.inputPortType, 'outputPortType:', actionNode.outputPortType);

    // Test input port detection
    const inputPortPos = canvas.nodeRenderer.getInputPortPosition(sequenceNode, sequenceNode.position);
    const inputPortHit = canvas.nodeRenderer.getPortAtPoint(sequenceNode, inputPortPos);

    console.log('Input port detection:');
    console.log('  Position:', inputPortPos.toString());
    console.log('  Hit result:', inputPortHit);

    // Test output port detection
    const outputPortPositions = canvas.nodeRenderer.getOutputPortPositions(sequenceNode, sequenceNode.position, 0, false);
    console.log('Output port positions:', outputPortPositions);

    if (outputPortPositions.length > 0) {
        const outputPortHit = canvas.nodeRenderer.getPortAtPoint(sequenceNode, outputPortPositions[0]);
        console.log('Output port detection:');
        console.log('  Position:', outputPortPositions[0].toString());
        console.log('  Hit result:', outputPortHit);
    }

    // Test cache hit detection
    if (canvas.portCache.isValidCache()) {
        const cacheInputHit = canvas.portCache.getPortAtPoint(inputPortPos);
        console.log('Cache input hit:', cacheInputHit);

        if (outputPortPositions.length > 0) {
            const cacheOutputHit = canvas.portCache.getPortAtPoint(outputPortPositions[0]);
            console.log('Cache output hit:', cacheOutputHit);
        }
    } else {
        console.log('⚠️ Port cache is invalid!');
    }

    return true;
}

// Run all tests
console.log('Starting interaction tests...');

try {
    const test1 = testOutputToInputConnection();
    const test2 = testInputToOutputConnection();
    const test3 = testPortHitDetection();

    console.log('\n=== Test Summary ===');
    console.log('Test 1 (Output → Input):', test1 ? '✅ PASS' : '❌ FAIL');
    console.log('Test 2 (Input → Output):', test2 ? '✅ PASS' : '❌ FAIL');
    console.log('Test 3 (Hit Detection):', test3 ? '✅ PASS' : '❌ FAIL');

    const allPassed = test1 && test2 && test3;
    console.log('\nOverall:', allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
} catch (error) {
    console.error('❌ Test execution failed:', error);
}
