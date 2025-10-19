import { Vector2 } from '../utils/Vector2.js';
import { FloatingMessageConstants } from '../utils/RendererConstants.js';

/**
 * FloatingMessage: MMO-style floating text that rises and fades out
 */
export class FloatingMessage {
    public position: Vector2;
    public text: string;
    public color: string;
    public lifetime: number;
    public maxLifetime: number;
    public velocity: Vector2;
    public isAlive: boolean = true;

    constructor(position: Vector2, text: string, color: string = '#FFFFFF', lifetime: number = FloatingMessageConstants.DEFAULT_LIFETIME) {
        this.position = position.clone();
        this.text = text;
        this.color = color;
        this.lifetime = lifetime;
        this.maxLifetime = lifetime;
        this.velocity = new Vector2(0, FloatingMessageConstants.VELOCITY_Y); // Float upwards
    }

    /**
     * Updates the message position and lifetime
     */
    public update(deltaTime: number): void {
        // Move upwards
        this.position = this.position.add(this.velocity.multiply(deltaTime / 1000));

        // Decay lifetime
        this.lifetime -= deltaTime;

        if (this.lifetime <= 0) {
            this.isAlive = false;
        }
    }

    /**
     * Gets the current opacity (fades out over lifetime)
     */
    public getOpacity(): number {
        return this.lifetime / this.maxLifetime;
    }

    /**
     * Renders the floating message
     */
    public render(ctx: CanvasRenderingContext2D): void {
        const opacity = this.getOpacity();

        ctx.save();

        // Draw text shadow for better visibility
        ctx.font = `${FloatingMessageConstants.FONT_WEIGHT} ${FloatingMessageConstants.FONT_SIZE}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Shadow
        ctx.strokeStyle = `rgba(0, 0, 0, ${opacity * FloatingMessageConstants.SHADOW_OPACITY})`;
        ctx.lineWidth = FloatingMessageConstants.SHADOW_LINE_WIDTH;
        ctx.strokeText(this.text, this.position.x, this.position.y);

        // Main text
        ctx.fillStyle = this.color.replace(')', `, ${opacity})`).replace('rgb', 'rgba');
        ctx.fillText(this.text, this.position.x, this.position.y);

        ctx.restore();
    }
}

/**
 * FloatingMessageManager: Manages all floating messages
 */
export class FloatingMessageManager {
    private messages: FloatingMessage[] = [];
    private lastUpdate: number = Date.now();

    /**
     * Adds a new floating message
     */
    public addMessage(position: Vector2, text: string, color: string = '#FFFFFF'): void {
        this.messages.push(new FloatingMessage(position, text, color));
    }

    /**
     * Updates all messages
     */
    public update(): void {
        const now = Date.now();
        const deltaTime = now - this.lastUpdate;
        this.lastUpdate = now;

        // Update all messages
        this.messages.forEach(msg => msg.update(deltaTime));

        // Remove dead messages
        this.messages = this.messages.filter(msg => msg.isAlive);
    }

    /**
     * Renders all messages
     */
    public render(ctx: CanvasRenderingContext2D): void {
        this.messages.forEach(msg => msg.render(ctx));
    }

    /**
     * Clears all messages
     */
    public clear(): void {
        this.messages = [];
    }
}
