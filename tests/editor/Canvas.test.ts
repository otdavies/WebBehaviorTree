import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Canvas } from '../../src/editor/Canvas.js';
import { EditorState } from '../../src/state/EditorState.js';
import { NodeRegistry } from '../../src/core/NodeRegistry.js';
import { registerDefaultNodes } from '../../src/core/DefaultNodes.js';
import { Vector2 } from '../../src/utils/Vector2.js';

/**
 * Canvas Rendering Tests
 *
 * These tests verify that the Canvas rendering system works correctly.
 * They use a mock canvas context to track drawing operations without
 * requiring a browser environment.
 */

describe('Canvas', () => {
    let canvas: Canvas;
    let editorState: EditorState;
    let mockCanvasElement: HTMLCanvasElement;
    let mockContext: MockCanvasContext;
    let drawingCallCount: number;

    // Mock canvas context that tracks drawing operations
    class MockCanvasContext {
        public drawCalls: string[] = [];
        public fillRectCalls: number = 0;
        public strokeRectCalls: number = 0;
        public arcCalls: number = 0;
        public fillTextCalls: number = 0;
        public beginPathCalls: number = 0;
        public fillStyle: string = '#000000';
        public strokeStyle: string = '#000000';
        public lineWidth: number = 1;
        public font: string = '10px sans-serif';
        public shadowBlur: number = 0;
        public shadowOffsetX: number = 0;
        public shadowOffsetY: number = 0;
        public shadowColor: string = 'transparent';
        public globalAlpha: number = 1;
        public textAlign: string = 'left';
        public textBaseline: string = 'alphabetic';

        clearRect(x: number, y: number, width: number, height: number) {
            this.drawCalls.push(`clearRect(${x},${y},${width},${height})`);
        }

        fillRect(x: number, y: number, width: number, height: number) {
            this.fillRectCalls++;
            this.drawCalls.push(`fillRect`);
        }

        strokeRect(x: number, y: number, width: number, height: number) {
            this.strokeRectCalls++;
            this.drawCalls.push(`strokeRect`);
        }

        arc(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
            this.arcCalls++;
            this.drawCalls.push(`arc`);
        }

        fillText(text: string, x: number, y: number) {
            this.fillTextCalls++;
            this.drawCalls.push(`fillText("${text}")`);
        }

        beginPath() {
            this.beginPathCalls++;
            this.drawCalls.push(`beginPath`);
        }

        fill() { this.drawCalls.push('fill'); }
        stroke() { this.drawCalls.push('stroke'); }
        closePath() { this.drawCalls.push('closePath'); }
        moveTo(x: number, y: number) { this.drawCalls.push('moveTo'); }
        lineTo(x: number, y: number) { this.drawCalls.push('lineTo'); }
        bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number) {
            this.drawCalls.push('bezierCurveTo');
        }
        quadraticCurveTo(cpx: number, cpy: number, x: number, y: number) {
            this.drawCalls.push('quadraticCurveTo');
        }
        setTransform(a: number, b: number, c: number, d: number, e: number, f: number) {
            this.drawCalls.push('setTransform');
        }
        translate(x: number, y: number) { this.drawCalls.push('translate'); }
        scale(x: number, y: number) { this.drawCalls.push('scale'); }
        save() { this.drawCalls.push('save'); }
        restore() { this.drawCalls.push('restore'); }
        setLineDash(segments: number[]) { this.drawCalls.push('setLineDash'); }
        clip() { this.drawCalls.push('clip'); }
        measureText(text: string) {
            return { width: text.length * 8 };
        }

        resetTracking() {
            this.drawCalls = [];
            this.fillRectCalls = 0;
            this.strokeRectCalls = 0;
            this.arcCalls = 0;
            this.fillTextCalls = 0;
            this.beginPathCalls = 0;
        }
    }

    beforeEach(() => {
        // Mock browser APIs
        global.window = {
            devicePixelRatio: 1,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn()
        } as any;

        global.requestAnimationFrame = ((callback: any) => {
            return setTimeout(callback, 16) as any;
        }) as any;

        global.cancelAnimationFrame = ((id: any) => {
            clearTimeout(id);
        }) as any;

        // Register default nodes
        registerDefaultNodes();

        // Create mock canvas element
        mockContext = new MockCanvasContext();
        mockCanvasElement = {
            width: 800,
            height: 600,
            getContext: () => mockContext as any,
            getBoundingClientRect: () => ({
                left: 0,
                top: 0,
                width: 800,
                height: 600,
                right: 800,
                bottom: 600,
                x: 0,
                y: 0,
                toJSON: () => ({})
            })
        } as any;

        // Create editor state and canvas
        editorState = new EditorState();
        canvas = new Canvas(mockCanvasElement, editorState);
        drawingCallCount = 0;
    });

    afterEach(() => {
        if (canvas) {
            canvas.dispose();
        }
    });

    describe('Basic Rendering', () => {
        it('should render when render() is called', () => {
            // Create a simple node
            const node = NodeRegistry.create('action')!;
            node.position = new Vector2(400, 300);
            editorState.addNode(node);

            // Reset tracking after setup
            mockContext.resetTracking();

            // Call render
            canvas.render();

            // Verify drawing operations occurred
            expect(mockContext.drawCalls.length).toBeGreaterThan(0);
            expect(mockContext.clearRect).toBeDefined();

            // Should have drawn the node (which includes shapes and text)
            expect(mockContext.fillRectCalls + mockContext.arcCalls).toBeGreaterThan(0);
        });

        it('should render nodes in the scene', () => {
            // Add multiple nodes
            const node1 = NodeRegistry.create('action')!;
            node1.position = new Vector2(200, 200);
            node1.label = 'Test1';

            const node2 = NodeRegistry.create('sequence')!;
            node2.position = new Vector2(400, 200);
            node2.label = 'Test2';

            editorState.addNode(node1);
            editorState.addNode(node2);

            mockContext.resetTracking();
            canvas.render();

            // Should have drawn shapes for both nodes
            expect(mockContext.fillRectCalls + mockContext.arcCalls).toBeGreaterThan(2);

            // Should have drawn text for labels
            expect(mockContext.fillTextCalls).toBeGreaterThan(0);
        });

    });

    describe('Render Loop', () => {
        it('should call render() when render loop is active', async () => {
            // Track render calls
            let renderCallCount = 0;
            const originalRender = canvas.render.bind(canvas);
            canvas.render = () => {
                renderCallCount++;
                originalRender();
            };

            // Start rendering
            canvas.startRendering();

            // Wait for a few frames (using setTimeout to allow requestAnimationFrame to run)
            await new Promise(resolve => setTimeout(resolve, 100));

            // Should have rendered multiple times
            expect(renderCallCount).toBeGreaterThan(2);

            // Stop rendering
            canvas.stopRendering();

            // Record current count
            const countAfterStop = renderCallCount;

            // Wait again
            await new Promise(resolve => setTimeout(resolve, 100));

            // Should not have rendered more after stopping
            expect(renderCallCount).toBe(countAfterStop);
        });

        it('should continue rendering on every frame (regression test for dirty flag bug)', () => {
            // This test specifically catches the dirty flag bug that broke rendering
            // Use fake timers to control requestAnimationFrame

            vi.useFakeTimers();

            const node = NodeRegistry.create('action')!;
            node.position = new Vector2(400, 300);
            editorState.addNode(node);

            // Track how many times render() is called
            let renderCount = 0;
            const originalRender = canvas.render.bind(canvas);
            canvas.render = function() {
                renderCount++;
                originalRender();
            };

            canvas.startRendering();

            // Advance through 10 frames (16ms each = 160ms total)
            for (let i = 0; i < 10; i++) {
                vi.advanceTimersByTime(16);
            }

            canvas.stopRendering();

            // Should have rendered at least 8 times (allowing for timing variations)
            // This would fail if dirty flag optimization broke rendering after first frame
            expect(renderCount).toBeGreaterThanOrEqual(8);

            vi.useRealTimers();
        });
    });

    describe('Viewport Integration', () => {
        it('should render with viewport transformation', () => {
            const node = NodeRegistry.create('action')!;
            node.position = new Vector2(400, 300);
            editorState.addNode(node);

            // Pan viewport
            canvas.viewport.offset = new Vector2(100, 50);

            mockContext.resetTracking();
            canvas.render();

            // Should include transformation calls
            const hasTransform = mockContext.drawCalls.some(
                call => call.includes('setTransform') || call.includes('translate')
            );
            expect(hasTransform).toBe(true);
        });
    });

    describe('Node Visibility (Viewport Culling)', () => {
        it('should skip rendering nodes outside viewport', () => {
            // Add node far outside viewport
            const farNode = NodeRegistry.create('action')!;
            farNode.position = new Vector2(10000, 10000);
            farNode.label = 'FarAway';

            // Add node inside viewport
            const nearNode = NodeRegistry.create('action')!;
            nearNode.position = new Vector2(400, 300);
            nearNode.label = 'Near';

            editorState.addNode(farNode);
            editorState.addNode(nearNode);

            mockContext.resetTracking();
            canvas.render();

            // Should have drawn something (the near node)
            expect(mockContext.drawCalls.length).toBeGreaterThan(0);

            // The far node should be culled, so we shouldn't see its label
            const drewFarNodeLabel = mockContext.drawCalls.some(
                call => call.includes('FarAway')
            );
            expect(drewFarNodeLabel).toBe(false);
        });
    });

    describe('Connection Rendering', () => {
        it('should render connections between nodes', () => {
            const parent = NodeRegistry.create('sequence')!;
            parent.position = new Vector2(400, 200);

            const child = NodeRegistry.create('action')!;
            child.position = new Vector2(400, 400);

            editorState.addNode(parent);
            editorState.addNode(child);
            editorState.connectNodes(parent, child);

            mockContext.resetTracking();
            canvas.render();

            // Connections use bezier curves
            const hasBezierCurve = mockContext.drawCalls.some(
                call => call.includes('bezierCurveTo')
            );
            expect(hasBezierCurve).toBe(true);
        });
    });

    describe('Performance Characteristics', () => {
        it('should handle many nodes efficiently', () => {
            // Add 50 nodes
            for (let i = 0; i < 50; i++) {
                const node = NodeRegistry.create('action')!;
                node.position = new Vector2(
                    100 + (i % 10) * 100,
                    100 + Math.floor(i / 10) * 100
                );
                editorState.addNode(node);
            }

            const startTime = performance.now();
            canvas.render();
            const endTime = performance.now();

            const renderTime = endTime - startTime;

            // Rendering 50 nodes should take less than 50ms (even in test environment)
            expect(renderTime).toBeLessThan(50);
            console.log(`Rendered 50 nodes in ${renderTime.toFixed(2)}ms`);
        });
    });
});
