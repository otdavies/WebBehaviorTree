/**
 * Simple 2D vector class for position, velocity, and general math operations.
 */
export class Vector2 {
    constructor(
        public x: number = 0,
        public y: number = 0
    ) {}

    /**
     * Creates a copy of this vector
     */
    clone(): Vector2 {
        return new Vector2(this.x, this.y);
    }

    /**
     * Adds another vector to this one
     */
    add(other: Vector2): Vector2 {
        return new Vector2(this.x + other.x, this.y + other.y);
    }

    /**
     * Subtracts another vector from this one
     */
    subtract(other: Vector2): Vector2 {
        return new Vector2(this.x - other.x, this.y - other.y);
    }

    /**
     * Multiplies this vector by a scalar
     */
    multiply(scalar: number): Vector2 {
        return new Vector2(this.x * scalar, this.y * scalar);
    }

    /**
     * Divides this vector by a scalar
     */
    divide(scalar: number): Vector2 {
        if (scalar === 0) {
            console.warn('Division by zero in Vector2');
            return new Vector2(0, 0);
        }
        return new Vector2(this.x / scalar, this.y / scalar);
    }

    /**
     * Returns the length (magnitude) of this vector
     */
    length(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    /**
     * Returns the squared length (faster than length())
     */
    lengthSquared(): number {
        return this.x * this.x + this.y * this.y;
    }

    /**
     * Returns a normalized version of this vector (length = 1)
     */
    normalize(): Vector2 {
        const len = this.length();
        if (len === 0) return new Vector2(0, 0);
        return this.divide(len);
    }

    /**
     * Returns the distance to another vector
     */
    distanceTo(other: Vector2): number {
        return this.subtract(other).length();
    }

    /**
     * Returns the dot product with another vector
     */
    dot(other: Vector2): number {
        return this.x * other.x + this.y * other.y;
    }

    /**
     * Linearly interpolates between this vector and another
     */
    lerp(other: Vector2, t: number): Vector2 {
        return new Vector2(
            this.x + (other.x - this.x) * t,
            this.y + (other.y - this.y) * t
        );
    }

    /**
     * Sets the values of this vector
     */
    set(x: number, y: number): void {
        this.x = x;
        this.y = y;
    }

    /**
     * Checks if this vector equals another
     */
    equals(other: Vector2): boolean {
        return this.x === other.x && this.y === other.y;
    }

    /**
     * Returns a string representation
     */
    toString(): string {
        return `Vector2(${this.x.toFixed(2)}, ${this.y.toFixed(2)})`;
    }

    /**
     * Creates a vector from an object with x and y properties
     */
    static from(obj: { x: number; y: number }): Vector2 {
        return new Vector2(obj.x, obj.y);
    }

    /**
     * Creates a zero vector
     */
    static zero(): Vector2 {
        return new Vector2(0, 0);
    }

    /**
     * Creates a vector with both components set to 1
     */
    static one(): Vector2 {
        return new Vector2(1, 1);
    }
}
