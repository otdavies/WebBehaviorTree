/**
 * FileIO: Utility functions for saving and loading files
 */
export class FileIO {
    private static readonly LOCALSTORAGE_KEY = 'behaviorTree_autosave';

    /**
     * Downloads data as a JSON file
     */
    public static downloadJSON(data: any, filename: string): void {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
    }

    /**
     * Triggers a file upload dialog
     * Returns a promise that resolves with the file contents
     */
    public static async loadJSON(): Promise<any> {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';

            input.addEventListener('change', async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (!file) {
                    reject(new Error('No file selected'));
                    return;
                }

                // Check file size (10MB limit)
                const MAX_FILE_SIZE = 10 * 1024 * 1024;
                if (file.size > MAX_FILE_SIZE) {
                    reject(new Error(
                        `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB ` +
                        `(maximum: 10MB)`
                    ));
                    return;
                }

                try {
                    const text = await file.text();

                    // Parse JSON
                    let data;
                    try {
                        data = JSON.parse(text);
                    } catch (parseError) {
                        reject(new Error('Invalid JSON format: ' + (parseError as Error).message));
                        return;
                    }

                    // Basic structure validation
                    if (!data || typeof data !== 'object') {
                        reject(new Error('Invalid file: root must be an object'));
                        return;
                    }

                    if (!data.version) {
                        reject(new Error('Invalid file: missing version field. This may not be a behavior tree file.'));
                        return;
                    }

                    resolve(data);
                } catch (error) {
                    reject(new Error('Failed to read file: ' + (error as Error).message));
                }
            });

            input.click();
        });
    }

    /**
     * Saves data to browser localStorage
     */
    public static saveToLocalStorage(data: any): { success: boolean; error?: string } {
        try {
            const json = JSON.stringify(data);

            // Check size before saving
            const sizeKB = new Blob([json]).size / 1024;
            if (sizeKB > 5000) {  // 5MB warning
                console.warn(`LocalStorage save size: ${sizeKB.toFixed(0)}KB (large data may fail)`);
            }

            localStorage.setItem(this.LOCALSTORAGE_KEY, json);
            return { success: true };
        } catch (error) {
            if ((error as any).name === 'QuotaExceededError') {
                return {
                    success: false,
                    error: 'Storage quota exceeded. Please download the file instead.'
                };
            }
            return {
                success: false,
                error: `Save failed: ${(error as Error).message}`
            };
        }
    }

    /**
     * Loads data from browser localStorage
     * Returns null if no saved data exists
     */
    public static loadFromLocalStorage(): any | null {
        try {
            const json = localStorage.getItem(this.LOCALSTORAGE_KEY);
            if (!json) {
                return null;
            }

            const data = JSON.parse(json);

            // Validate before returning
            if (!data.version) {
                console.warn('LocalStorage data missing version, may be corrupted');
                return null;
            }

            return data;
        } catch (error) {
            console.error('Failed to load from localStorage:', error);
            return null;
        }
    }

    /**
     * Clears the auto-saved data from localStorage
     */
    public static clearLocalStorage(): void {
        localStorage.removeItem(this.LOCALSTORAGE_KEY);
    }
}
