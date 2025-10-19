/**
 * Toast: Simple toast notification system
 */
export class Toast {
    private static container: HTMLDivElement | null = null;
    private static currentToast: HTMLDivElement | null = null;
    private static hideTimeout: number | null = null;

    /**
     * Initializes the toast container
     */
    private static initContainer(): void {
        if (this.container) return;

        this.container = document.createElement('div');
        this.container.className = 'toast-container';
        document.body.appendChild(this.container);
    }

    /**
     * Shows a toast notification
     */
    public static show(message: string, duration: number = 2000): void {
        this.initContainer();

        // Clear existing toast
        if (this.currentToast) {
            this.hide();
        }

        // Clear existing timeout
        if (this.hideTimeout !== null) {
            clearTimeout(this.hideTimeout);
        }

        // Create toast element
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;

        this.container!.appendChild(toast);
        this.currentToast = toast;

        // Trigger animation after a tiny delay
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        // Auto-hide after duration
        this.hideTimeout = window.setTimeout(() => {
            this.hide();
        }, duration);
    }

    /**
     * Hides the current toast
     */
    private static hide(): void {
        if (!this.currentToast) return;

        this.currentToast.classList.remove('show');

        // Remove from DOM after animation
        setTimeout(() => {
            if (this.currentToast && this.currentToast.parentNode) {
                this.currentToast.parentNode.removeChild(this.currentToast);
            }
            this.currentToast = null;
        }, 300);
    }
}
