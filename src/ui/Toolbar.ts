import { BehaviorTree } from '../core/BehaviorTree.js';

/**
 * Toolbar: Manages the top toolbar UI and controls
 */
export class Toolbar {
    private behaviorTree: BehaviorTree;

    private btnPlay: HTMLButtonElement;
    private btnPause: HTMLButtonElement;
    private btnStep: HTMLButtonElement;
    private btnReset: HTMLButtonElement;
    private btnSettings: HTMLButtonElement;

    private tickRateSlider: HTMLInputElement;
    private tickRateValue: HTMLSpanElement;

    public onSettingsClick?: () => void;

    constructor(behaviorTree: BehaviorTree) {
        this.behaviorTree = behaviorTree;

        // Get DOM elements
        this.btnPlay = document.getElementById('btn-play') as HTMLButtonElement;
        this.btnPause = document.getElementById('btn-pause') as HTMLButtonElement;
        this.btnStep = document.getElementById('btn-step') as HTMLButtonElement;
        this.btnReset = document.getElementById('btn-reset') as HTMLButtonElement;
        this.btnSettings = document.getElementById('btn-settings') as HTMLButtonElement;

        this.tickRateSlider = document.getElementById('tick-rate-slider') as HTMLInputElement;
        this.tickRateValue = document.getElementById('tick-rate-value') as HTMLSpanElement;

        this.setupEventListeners();
        this.updateUI();
    }

    /**
     * Sets up event listeners
     */
    private setupEventListeners(): void {
        this.btnPlay.addEventListener('click', () => {
            this.behaviorTree.start();
            this.updateUI();
        });

        this.btnPause.addEventListener('click', () => {
            this.behaviorTree.pause();
            this.updateUI();
        });

        this.btnStep.addEventListener('click', () => {
            this.behaviorTree.step();
            this.updateUI();
        });

        this.btnReset.addEventListener('click', () => {
            this.behaviorTree.stop();
            this.updateUI();
        });

        this.btnSettings.addEventListener('click', () => {
            if (this.onSettingsClick) {
                this.onSettingsClick();
            }
        });

        this.tickRateSlider.addEventListener('input', () => {
            const rate = parseInt(this.tickRateSlider.value);
            this.behaviorTree.setTickRate(rate);
            this.tickRateValue.textContent = rate.toString();
        });

        // Update UI when tree state changes
        this.behaviorTree.onStateChange(() => {
            this.updateUI();
        });
    }

    /**
     * Updates the UI based on current state
     */
    private updateUI(): void {
        const state = this.behaviorTree.state;

        // Update button states
        this.btnPlay.classList.toggle('active', state === 'running');
        this.btnPause.classList.toggle('active', state === 'paused');

        // Disable play when running
        this.btnPlay.disabled = state === 'running';
        this.btnPause.disabled = state !== 'running';
    }
}
