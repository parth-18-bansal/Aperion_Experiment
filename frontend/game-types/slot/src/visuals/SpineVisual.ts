import { Spine, TrackEntry } from "@esotericsoftware/spine-pixi-v8"; // to use the pixi-spine library
import { Engine, Logger } from "game-engine";
import { Sprite, Texture } from "pixi.js";
import { ISymbolVisual } from "../interfaces";

/**
 * Implements a visual representation of a slot symbol using Spine animations
 * This class wraps a Spine object to provide standardized animation controls
 */
export class SpineVisual implements ISymbolVisual {
  public displayObject: Spine; // Reference to the Spine object for direct access
  public cover: Sprite | undefined; // Optional sprite object if used as a fallback
  private processedAnims: { [key: string]: string } = {}; // Maps animation keys to actual spine animation names
  private onComplete: ((entry: TrackEntry) => void) | undefined; // Callback for animation completion
  private onInnerComplete: ((entry: TrackEntry) => void) | undefined; // Callback for animation completion

  /**
   * Creates a new SpineVisual instance
   * @param options - Configuration options for the Spine object
   * @param anims - Animation mapping between animation keys and spine animation names
   */
  constructor(
    options: Engine.SpineOptions,
    anims: {
      [key: string]: string[] | Texture[] | Texture | string;
    } = {}
  ) {
    // Create the Spine display object from the provided options
    this.displayObject = Spine.from(options);
    // Apply the specified skin if provided
    if (options.skin) {
      this.displayObject.skeleton.setSkinByName(options.skin);
    }
    // Apply common PIXI properties while excluding spine-specific properties
    Engine.Utils.ApplyCommonProperties(this.displayObject, options, undefined, {
      skeleton: true,
      atlas: true,
    });

    // Initialize animation mappings
    this.processedAnims = {};
    // Process animation definitions
    for (const animKey in anims) {
      const animValue = anims[animKey];
      let animToSet = "EMPTY"; // Default animation name

      if (typeof animValue === "string") {
        animToSet = animValue;
      } else if (
        Array.isArray(animValue) &&
        animValue.length > 0 &&
        typeof animValue[0] === "string"
      ) {
        animToSet = animValue[0];
      }
      // If animValue is Texture or an array of Texture, animToSet remains "EMPTY"
      this.processedAnims[animKey] = animToSet;
    }

    this.cover = undefined; // Initialize spriteObject as undefined
    if (options.cover) {
      this.cover = Sprite.from(
        typeof options.cover.texture === "string"
          ? Texture.from(options.cover.texture)
          : options.cover.texture || Texture.EMPTY
      );
      // Apply common PIXI properties while excluding spine-specific properties
      Engine.Utils.ApplyCommonProperties(this.cover, options.cover, undefined, {
        texture: true,
      });
      this.displayObject.addChild(this.cover); // Add the sprite to the container
    }
    this.displayObject.addChild(this.displayObject); // Add the Spine object to the container
  }

  setPos(x: number, y: number): void {
    this.displayObject.x = x;
    this.displayObject.y = y;
  }

  setVisible(visible: boolean): void {
    this.displayObject.visible = visible;
  }

  playAnim(
    animName: string,
    loop: boolean,
    onComplete?: (entry: TrackEntry) => void,
    animSpeed: number = 1
  ): void {
    if (!this.processedAnims[animName]) {
      Logger.warn(`Animation not found: ${animName}`);
      if (onComplete) onComplete(null as any);
      this.switchTo("sprite"); // Switch to sprite visibility if animation not found
      return;
    } else {
      this.switchTo("spine");
      if (this.displayObject.state.getCurrent(0)) {
        this.stopAnim(); // Stop any currently playing animation before starting a new one
      }

      this.onComplete = onComplete || undefined;
      this.onInnerComplete = () => {
        if (this.displayObject.state.getCurrent(0)?.loop === false) {
          this.stopAnim(); // Stop the animation when it completes
        }
      };
      this.displayObject.state.addListener({
        complete: this.onInnerComplete,
      });
      this.displayObject.state.setAnimation(
        0,
        this.processedAnims[animName],
        loop
      );
      this.displayObject.state.timeScale = animSpeed;
    }
  }

  protected switchTo(type: "spine" | "sprite"): void {
    if (this.cover) {
      this.cover.visible = type === "sprite";
      this.displayObject.visible = type === "spine";
      if (this.displayObject.state && type === "sprite") {
        this.displayObject.state.timeScale = 0;
      }
    } else {
      this.displayObject.visible = true;
    }
    this.displayObject.autoUpdate = type === "spine";
  }

  stopAnim(): void {
    // First remove the listener to prevent double callback
    if (this.onInnerComplete) {
      this.displayObject.state.removeListener({
        complete: this.onInnerComplete,
      });
    }

    // Call the callback after clearing to indicate forced completion
    if (this.onComplete) {
      const callback = this.onComplete;
      this.onComplete = undefined; // Clear before calling to prevent re-entry
      callback(this.displayObject.state.getCurrent(0) as TrackEntry); // Call with null to indicate forced stop
    }
    // Clear the current animation track
    this.displayObject.state.clearTrack(0);
    this.onInnerComplete = undefined; // Clear the inner completion callback
    this.switchTo("sprite");
  }

  destroy(): void {
    this.stopAnim();
    this.displayObject.destroy();
  }
}
