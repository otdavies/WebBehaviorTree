/**
 * Toast: Simple toast notification system
 */
export class Toast {
    private static container: HTMLDivElement | null = null;
    private static currentToast: HTMLDivElement | null = null;
    private static hideTimeout: number | null = null;
    private static removeTimeout: number | null = null;

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

        // Clear existing timeouts
        if (this.hideTimeout !== null) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }

        if (this.removeTimeout !== null) {
            clearTimeout(this.removeTimeout);
            this.removeTimeout = null;
        }

        // Immediately remove existing toast from DOM if present
        if (this.currentToast) {
            if (this.currentToast.parentNode) {
                this.currentToast.parentNode.removeChild(this.currentToast);
            }
            this.currentToast = null;
        }

        // Create toast element
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;

        this.container!.appendChild(toast);
        this.currentToast = toast;

        // Trigger animation after a tiny delay
        setTimeout(() => {
            if (toast === this.currentToast) {
                toast.classList.add('show');
            }
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

        const toastToHide = this.currentToast;
        toastToHide.classList.remove('show');

        // Remove from DOM after animation
        this.removeTimeout = window.setTimeout(() => {
            if (toastToHide.parentNode) {
                toastToHide.parentNode.removeChild(toastToHide);
            }
            if (this.currentToast === toastToHide) {
                this.currentToast = null;
            }
        }, 300);
    }
}
