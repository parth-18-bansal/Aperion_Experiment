/* eslint-disable @typescript-eslint/no-unused-vars */
import { Engine, Logger } from "game-engine";
import { gsap } from "gsap";
import {
  Container,
  Sprite,
  Texture,
  RenderTexture,
  Assets,
  BlurFilter,
  BlurFilterOptions,
} from "pixi.js";
import {
  ReelOptions,
  ReelSpinParams,
  ReelStopParams,
  SymbolOptions,
} from "../interfaces";
import { SymbolPool } from "../utils/SymbolPool";
import { AbstractReel } from "./AbstractReel";
import { GameSpeedMode } from "slot-game-ui";

/**
 * Represents a standard reel that spins vertically or horizontally.
 * Manages symbol arrangement, spin animations, stop animations, and cascading effects.
 */
export class NormalReel extends AbstractReel {
  // Strip sprite system properties
  private _stripIndex: number = 0; // Current index for strip sprites
  private _stripSprites: Sprite[] = []; // Array of strip sprites
  private _stripTextures: string[] = []; // Array of generated strip textures
  private _stripeBlur?: BlurFilterOptions;
  private _stripHeight: number = 0; // Height of each strip texture
  private _stripWidth: number = 0; // Width of each strip texture
  private _stripContainer!: Container; // Container for strip sprites

  constructor(
    options: ReelOptions,
    symbolPool: SymbolPool,
    defaultReelLengthFromMachine: number
  ) {
    super(options, symbolPool, defaultReelLengthFromMachine);

    // Initialize strip system
    this._stripContainer = new Container();
    this._stripContainer.visible = false; // Initially hidden

    // Calculate strip dimensions
    this._stripWidth = this.cellWidth;
    this._stripHeight =
      this.cellHeight * (this.visibleCount + this.extraCount * 2);

    this._stripTextures = options.stripes ?? []; // Use provided stripes if available
    this._stripeBlur = options.stripeBlur; // Optional blur effect for strips
    this.init(options.initialSymbols ?? []);
  }

  init(initialSymbols: string[]): void {
    super.init(initialSymbols);
    if (this._stripTextures.length === 0) {
      this.createStripTextures();
    }
    this.createStripSprites();
  }

  /**
   * Arranges symbols on the reel based on the current scroll offset and spin direction.
   * Handles wrapping of symbols for continuous scrolling with improved stability.
   */
  public arrangeSymbols(slide: number = 0): void {
    if (!this.reelSetList.length && !this.symbolList.length) return;

    // Normalize offset to always be positive
    this.symbolList.forEach((symbol, i) => {
      // Calculate position relative to extra count offset and scroll position
      const finalPos = (i - this.extraCount) * this.cellHeight;

      symbol.setPos(0, finalPos + slide);
      symbol.setVisible(true);
    });
  }

  /**
   * Arranges strip sprites based on scroll offset
   */
  private switchStripSprite(): void {
    if (this._stripSprites.length === 0) return;

    const sprite =
      this.spinDirection === "down"
        ? this._stripSprites.pop()
        : this._stripSprites.shift();
    if (sprite) {
      if (this.spinDirection === "down") {
        this._stripSprites.unshift(sprite);
        this._stripIndex = (this._stripIndex + 1) % this._stripTextures.length;
      } else {
        this._stripSprites.push(sprite);
        this._stripIndex = (this._stripIndex - 1) % this._stripTextures.length;
      }
      sprite.texture = Texture.from(this._stripTextures[this._stripIndex]);
      for (let i = 0; i < this._stripSprites.length; i++) {
        this._stripSprites[i].y =
          (i - 1) * this._stripHeight - this.extraCount * this.cellHeight;
        this._stripSprites[i].visible = true;
      }
    }
  }

  private setStripeInitialPositions(): void {
    this._stripIndex = 0; // Reset index for new spin
    for (let i = 0; i < this._stripSprites.length; i++) {
      this._stripSprites[i].y =
        (i - 1) * this._stripHeight - this.extraCount * this.cellHeight;
      this._stripSprites[i].visible = true;
    }
    this._stripSprites[1].visible = false;
  }

  /**
   * Performs the spin animation for the reel.
   * @param params - Parameters for the spin animation.
   * @param isAdrenaline - Flag indicating if adrenaline mode is active, potentially affecting spin speed.
   * @returns A promise that resolves when the spin animation setup is complete.
   */
  protected async performSpinAnimation(
    params: ReelSpinParams,
    isAdrenaline: boolean = false
  ): Promise<void> {
    return new Promise((resolve) => {
      const isTurbo =
        (this.game.registry.get("gameSpeed") as GameSpeedMode) === "turbo";
      if (this.spinTimeline && this.spinTimeline.isActive()) {
        this.spinTimeline.kill();
      }
      if (this.reelSetList.length === 0) {
        Logger.warn(
          `Reel ${this.reelIndex}: Cannot play spin animation, reelSetList is empty.`
        );
        return resolve(); // Resolve immediately if no symbols to spin.
      }

      const speedMultiplier =
        isAdrenaline && this.adrenalineSpinConfig?.speedMultiplier
          ? this.adrenalineSpinConfig.speedMultiplier
          : 1;

      if (!this.spinTimeline) {
        this.spinTimeline = gsap.timeline();
      }
      this.spinTimeline.clear();
      this.spinTimeline.timeScale(speedMultiplier);

      if (this._shuffle) {
        // Shuffle the reel set list if shuffle is enabled
        this.shuffleArray(this._stripTextures);
      }

      this.setStripeInitialPositions();
      // Enable strip mode for smooth spinning
      this._stripContainer.visible = true;
      if (this._stripContainer.parent === null) {
        this.addChild(this._stripContainer); // Add strip container to the reel if not already
      }

      const easeInDuration = isTurbo ? 0.2 : params.easeInDuration ?? 1;
      const easeInType = params.easeInType ?? "power1.inOut";
      const finalReelY =
        this.spinDirection === "down" ? this._stripHeight : -this._stripHeight;

      // Ease-in phase
      this.spinTimeline.fromTo(
        this._stripContainer,
        { y: 0 },
        {
          y: finalReelY,
          duration: easeInDuration,
          ease: easeInType,
          callbackScope: this,
          onUpdate: () => {
            this.arrangeSymbols(this._stripContainer.y);
          },
          onComplete: () => {
            this.symbolList.forEach((symbol) => {
              symbol.setVisible(false);
            });
            this.switchStripSprite(); // Update strip sprites after ease-in
            resolve();
          },
        }
      );

      const totalSpinTime = isTurbo ? 0.2 : params.duration ?? 1;
      const spinEase = params.spinEase ?? "none";
      this.spinTimeline.fromTo(
        this._stripContainer,
        { y: 0 },
        {
          y: finalReelY,
          duration: totalSpinTime,
          ease: spinEase,
          callbackScope: this,
          onRepeat: () => {
            this.switchStripSprite(); // Update strip sprites during animation.
          },
          repeat: -1,
        }
      );
      this.spinTimeline.play();
    });
  }

  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  /**
   * Performs the stop animation for the reel.
   * @param params - Parameters for the stop animation, including landing symbols.
   * @returns A promise that resolves when the stop animation is complete.
   */
  protected async performStopAnimation(params: ReelStopParams): Promise<void> {
    const {
      landingSymbols,
      stopDuration = 1.0,
      stopEase = "power2.out",
    } = params;
    const isTurbo =
      (this.game.registry.get("gameSpeed") as GameSpeedMode) === "turbo";

    // PROBLEM #2 FIX: Early force stop detection for immediate animation adjustment
    const effectiveStopDuration =
      this._isForceStopped || isTurbo ? 0.1 : stopDuration;
    const effectiveStopEase =
      this._isForceStopped || isTurbo ? "none" : stopEase;

    if (this._isForceStopped) {
      Logger.log(
        `NormalReel ${this.reelIndex}: Force stop detected, using minimal animation duration: ${effectiveStopDuration}`
      );
    }

    // Validation for landing symbols
    if (!landingSymbols || landingSymbols.length === 0) {
      Logger.warn(
        `NormalReel ${this.reelIndex}: No landing symbols provided for stop animation.`
      );
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      //this.spinTimeline.progress(1);
      if (!this.spinTimeline) {
        this.spinTimeline = gsap.timeline();
      }
      this.spinTimeline.pause();
      this.spinTimeline.clear(); // Clear any previous animations

      //this.spinTimeline.pause(); // Clear any previous animations
      if (this.reelSetList.length === 0) {
        Logger.warn(
          `Reel ${this.reelIndex}: Cannot play stop animation, reelSetList is empty.`
        );
        return reject(new Error("reelSetList is empty for stop."));
      }

      if (!landingSymbols || landingSymbols.length !== this.visibleCount) {
        Logger.error(
          `Reel ${this.reelIndex}: Landing symbols are required and must match total symbol count (${this.visibleCount}). Received: ${landingSymbols?.length}`
        );
        return reject(new Error("Invalid landing symbols provided for stop."));
      }

      this.updateSymbolList(landingSymbols);
      const finalY =
        this.spinDirection === "down" ? this._stripHeight : -this._stripHeight;
      this.spinTimeline.to(this._stripContainer, {
        y: finalY * 2,
        duration: effectiveStopDuration,
        ease: effectiveStopEase,
        callbackScope: this,
        onUpdate: () => {
          this.arrangeSymbols(this._stripContainer.y - finalY * 2);
        },
        onComplete: () => {
          this.switchStripSprite();
          this._stripContainer.visible = false; // Hide strip container after stop
          if (this._stripContainer.parent) {
            this.removeChild(this._stripContainer);
          }
          resolve();
        },
      });
      this.spinTimeline.timeScale(1);
      this.spinTimeline.play();
    });
  }

  /**
   * Creates strip textures from the reel set list
   * Each strip contains visibleCount + extraCount * 2 symbols
   */
  private createStripTextures(): void {
    if (this.reelSetList.length === 0) return;

    this._stripTextures = [];
    const symbolsPerStrip = this.visibleCount + this.extraCount * 2;

    for (
      let stripIndex = 0;
      stripIndex < this.reelSetList.length;
      stripIndex += symbolsPerStrip
    ) {
      this._stripTextures.push(
        this.generateStripTexture(stripIndex, symbolsPerStrip)
      );
    }

    if (this._shuffle) {
      // Shuffle the reel set list if shuffle is enabled
      this.shuffleArray(this._stripTextures);
    }
  }

  /**
   * Generates a single strip texture from symbol textures
   */
  private generateStripTexture(
    startIndex: number,
    symbolCount: number
  ): string {
    // Generate texture name from symbol IDs
    const symbolIds: string[] = [];
    for (let i = 0; i < symbolCount; i++) {
      const symbolIndex = (startIndex + i) % this.reelSetList.length;
      const symbolId = this.reelSetList[symbolIndex];
      symbolIds.push(symbolId);
    }

    const textureName = `strip_${symbolIds.join("-")}`;

    // Check if texture already exists in cache
    try {
      const existingTexture = Assets.cache.get(textureName);
      if (existingTexture) {
        Logger.log(`Strip texture cache hit: ${textureName}`);
        return textureName;
      }
    } catch {
      // Texture doesn't exist yet, create it
    }

    Logger.log(`Creating new strip texture: ${textureName}`);

    const renderTexture = RenderTexture.create({
      width: this._stripWidth,
      height: this._stripHeight,
    });

    const tempContainer = new Container();

    for (let i = 0; i < symbolCount; i++) {
      const symbolIndex = (startIndex + i) % this.reelSetList.length;
      const symbolId = this.reelSetList[symbolIndex];

      // Get symbol texture - this might need adjustment based on your symbol system
      const symbolOptions = this.symbolCfg[symbolId] as SymbolOptions;
      const symbol = this.symbolPool.get(symbolId, symbolOptions);

      // Position symbol in the strip
      symbol.setPos(0, i * this.cellHeight);
      tempContainer.addChild(symbol as any);
    }

    if (this._stripeBlur) {
      tempContainer.filters = [new BlurFilter(this._stripeBlur)];
    }

    // Render the container to texture
    const game = (this as any).game || Engine.getEngine();
    if (game && game.renderer) {
      game.renderer.render({ container: tempContainer, target: renderTexture });
    } else {
      Logger.warn("Renderer not available for strip texture generation");
    }

    // Clean up temporary symbols
    tempContainer.children.forEach((child) => {
      this.symbolPool.return(child as any);
    });
    tempContainer.removeChildren();
    tempContainer.filters = [];
    tempContainer.destroy();

    // Add the texture to cache using Assets.cache
    Assets.cache.set(textureName, renderTexture);

    return textureName;
  }

  /**
   * Creates and positions the 3 strip sprites
   */
  private createStripSprites(): void {
    if (!this._stripContainer || this._stripTextures.length === 0) return;

    // Clear existing strip sprites
    this.clearStripSprites();

    for (let i = 0; i < 3; i++) {
      const sprite = new Sprite(Texture.from(this._stripTextures[i]));

      this._stripSprites.push(sprite);
      this._stripContainer.addChild(sprite);
    }

    this.setStripeInitialPositions();
  }

  /**
   * Clears all strip sprites and textures
   */
  private clearStripSprites(): void {
    if (this._stripContainer) {
      this._stripContainer.removeChildren();
    }

    this._stripSprites = [];
  }

  /**
   * Cleans up resources, kills active timelines, and calls the superclass destroy method.
   */
  /**
   * Cleans up resources, kills active timelines, and calls the superclass destroy method.
   */
  public destroy(): void {
    // Reset tracking variables
    if (this.spinTimeline && this.spinTimeline.isActive()) {
      this.spinTimeline.kill();
    }
    if (this.cascadeTimeline && this.cascadeTimeline.isActive()) {
      this.cascadeTimeline.kill();
    }

    // Clean up strip resources
    this.clearStripSprites();
    if (this._stripContainer) {
      this._stripContainer.destroy();
    }
    this.cascadeTimeline = null;
    super.destroy();
  }
}
