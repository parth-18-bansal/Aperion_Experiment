import { Engine } from "game-engine";
import { Container, FederatedPointerEvent } from "pixi.js";
import { SymbolEvent } from "./events";
import { ISymbolVisual, SymbolOptions } from "./interfaces";

/**
 * Represents a single symbol on a slot machine reel.
 * Handles the visual representation, animations, and interactions of the symbol.
 */
export class SlotSymbol extends Container {
  public readonly id: string; // Unique identifier for this symbol
  public visual: ISymbolVisual; // Visual representation component of the symbol

  // Symbol properties
  public readonly symName?: string; // Display name of the symbol
  public readonly description?: string; // Description text for the symbol
  public readonly payouts?: { [count: string]: number }; // Payout values for different symbol counts
  public readonly isWild: boolean; // Whether this symbol acts as a wild symbol
  public readonly isScatter: boolean; // Whether this symbol acts as a scatter symbol
  public readonly isBonus: boolean; // Whether this symbol triggers bonus features

  private _options: SymbolOptions; // Configuration options for the symbol
  public isAnimating: boolean = false; // Flag indicating if the symbol is currently animating

  /**
   * Creates a new slot symbol instance
   * @param id - Unique identifier for the symbol
   * @param visual - Visual component that renders the symbol
   * @param options - Configuration options for the symbol
   */
  constructor(id: string, visual: ISymbolVisual, options: SymbolOptions) {
    super();
    this.id = id;
    this.visual = visual;
    this._options = options;

    // Initialize properties from options
    this.symName = options.symName || id;
    this.description = options.description;
    this.payouts = options.payouts;
    this.isWild = options.isWild || false;
    this.isScatter = options.isScatter || false;
    this.isBonus = options.isBonus || false;

    this.addChild(this.visual.displayObject as any);
    if (this.visual.cover) {
      this.addChild(this.visual.cover);
    }
    Engine.Utils.ApplyCommonProperties(this as any, this._options);

    // Add interaction handling if enabled
    if (this._options?.interactive) {
      this.on("pointertap", this.handlePointerTap, this);
    }
    this.playAnim("idle"); // Play the idle animation by default
  }

  /**
   * Handles pointer tap/click events on the symbol
   * @param event - The pointer event data
   */
  private handlePointerTap(event: FederatedPointerEvent): void {
    this.emit(SymbolEvent.CLICK, this, event);
  }

  /**
   * Sets the position of the symbol
   * @param x - X coordinate
   * @param y - Y coordinate
   */
  setPos(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  /**
   * Sets the visibility of the symbol
   * @param visible - Whether the symbol should be visible
   */
  setVisible(visible: boolean): void {
    this.visible = visible;
  }

  /**
   * Plays an animation on the symbol
   * @param animName - Name of the animation to play
   * @param loop - Whether the animation should loop (default: false)
   * @param onComplete - callback function to call when the animation completes
   * @param animSpeed - Animation speed multiplier (default: 1, -1 for immediate completion)
   */
  playAnim(
    animName: string,
    loop: boolean = false,
    onComplete?: () => void,
    animSpeed: number = 1
  ): void {
    this.isAnimating = true;
    this.emit(SymbolEvent.ANIMATION_START, this, animName, loop);
    this.visual.playAnim(
      animName,
      loop,
      () => {
        this.isAnimating = false;
        this.emit(SymbolEvent.ANIMATION_COMPLETE, this, animName);
        // If not looping and not the idle animation, return to idle
        /*if (!loop && animName !== "idle") {
          // Use different animation speeds based on symbol type
          this.playAnim(
            "idle",
            false,
            undefined,
            this.isWild || this.isScatter || this.isBonus ? 1 : -1
          );
        }*/
        if (onComplete) onComplete();
      },
      animSpeed
    );
  }

  /**
   * Stops the current animation
   */
  stopAnim(): void {
    this.visual.stopAnim();
    this.isAnimating = false;
  }

  /**
   * Cleans up resources and removes the symbol
   */
  destroy(): void {
    if (this._options?.interactive) {
      this.off("pointertap", this.handlePointerTap, this);
    }
    this.emit(SymbolEvent.DESTROY, this);
    this.visual.destroy();
    super.destroy({ children: true });
  }

  /**
   * Resets the symbol to its initial state
   * Usually called when returning the symbol to an object pool
   */
  public reset(): void {
    this.stopAnim();
    this.setVisible(false); // Make invisible when returning to the pool
    this.isAnimating = false;
    this.alpha = 1;
    this.scale.set(1);
    this.playAnim("idle", false, undefined, 0); // Return to idle animation when reset
  }
}
