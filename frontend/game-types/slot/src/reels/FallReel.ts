import { Logger } from "game-engine";
import { gsap } from "gsap";
import { ReelOptions, ReelSpinParams, ReelStopParams } from "../interfaces";
import { SymbolPool } from "../utils/SymbolPool";
import { AbstractReel } from "./AbstractReel";
import { GameSpeedMode } from "slot-game-ui";

/**
 * Represents a standard reel that spins.
 * Manages symbol arrangement, spin animations, stop animations, and cascading effects.
 */
export class FallReel extends AbstractReel {
  stopTimeline: gsap.core.Timeline | null = null;

  // PROBLEM #6 FIX: Timeline state tracking for smart reset operations
  private activeTimelineCount: number = 0; // Reference counting instead of boolean

  constructor(
    options: ReelOptions,
    symbolPool: SymbolPool,
    defaultReelLengthFromMachine: number
  ) {
    super(options, symbolPool, defaultReelLengthFromMachine);
    this.init(options.initialSymbols ?? []);
  }

  protected performSpinAnimation(spinParams: ReelSpinParams): Promise<void> {
    return new Promise((resolve) => {
      // PROBLEM #6 FIX: Use smart reset instead of always resetting
      this.smartResetTimelines();

      const indices = this.getVisibleSymbolIndices();
      const staggerTime = 0.04;
      const { duration = 0.25, easeInType = "sine.in" } = spinParams;
      let count = 0;

      this.spinTimeline = this.createTimeline();

      for (const index of indices) {
        const symbol = this.symbolList[index];
        const targetY =
          symbol.y +
          this.cellHeight *
            this.visibleCount *
            (this.spinDirection === "down" ? 1 : -1);

        this.spinTimeline!.to(
          symbol,
          {
            y: targetY,
            ease: easeInType,
            duration: duration,
            onComplete: () => symbol.setVisible(false),
          },
          staggerTime * count
        );

        count++;
      }
      this.spinTimeline.play();
      this.spinTimeline!.eventCallback("onComplete", () => {
        this.spinTimeline!.kill();
        this.spinTimeline = null;
        this.onTimelineComplete(); // PROBLEM #6 FIX: Update state on completion
        resolve();
      });
    });
  }

  protected async performStopAnimation(params: ReelStopParams): Promise<void> {
    const isTurbo =
      (this.game.registry.get("gameSpeed") as GameSpeedMode) === "turbo";
    // PROBLEM #2 FIX: Early force stop detection for immediate animation adjustment
    const isForceStop =
      this._isForceStopped ||
      (params.stopDuration && params.stopDuration <= 0.1);
    const effectiveStopDuration =
      isForceStop || isTurbo ? 0.05 : params.stopDuration || 1.0;

    if (isForceStop) {
      Logger.log(
        `FallReel ${this.reelIndex}: Force stop detected, using minimal fall duration: ${effectiveStopDuration}`
      );
    }

    return new Promise((resolve, reject) => {
      // PROBLEM #6 FIX: Use smart reset for better performance
      this.smartResetTimelines();

      const indices = this.getVisibleSymbolIndices();
      const staggerTime = 0.06;
      const bounceOffset = 10;
      const { landingSymbols, stopEase = "sine.out" } = params;
      let count = 0;

      if (!landingSymbols || landingSymbols.length === 0) {
        Logger.warn(
          `Reel ${this.reelIndex}: No landing symbols provided for updateSymbolsAfterStop.`
        );
        return reject(new Error("Landing symbols not found"));
      }

      if (landingSymbols.length !== this.visibleCount) {
        Logger.error(
          `Reel ${this.reelIndex}: Landing symbols count (${landingSymbols.length}) does not match required total symbols (${this.visibleCount}).`
        );
        return reject(new Error("Invalid landing symbols provided for stop."));
      }

      this.updateSymbolList(landingSymbols);

      this.stopTimeline = this.createTimeline();

      for (const index of indices) {
        const symbol = this.symbolList[index];
        const offset =
          this.cellHeight *
          this.visibleCount *
          (this.spinDirection === "down" ? 1 : -1);
        const bounceDir = this.spinDirection === "down" ? 1 : -1;
        const initialY = symbol.y + offset;

        this.stopTimeline!.to(
          symbol,
          {
            y: initialY + bounceOffset * bounceDir,
            ease: stopEase,
            duration: effectiveStopDuration,
            onComplete: () => symbol.setVisible(true),
          },
          staggerTime * count
        );

        this.stopTimeline!.to(
          symbol,
          {
            y: initialY,
            duration: 0.08,
            ease: "sine.out",
          },
          staggerTime * count + effectiveStopDuration
        );

        count++;
      }
      this.stopTimeline.play();
      this.stopTimeline!.eventCallback("onComplete", () => {
        this.stopTimeline!.kill();
        this.stopTimeline = null;
        this.onTimelineComplete(); // PROBLEM #6 FIX: Update state on completion
        this.arrangeSymbols();
        resolve();
      });
    });
  }

  // PROBLEM #6 FIX: Timeline completion callback with reference counting
  private onTimelineComplete(): void {
    this.activeTimelineCount = Math.max(0, this.activeTimelineCount - 1);
    Logger.log(
      `FallReel ${this.reelIndex}: Timeline completed, active count: ${this.activeTimelineCount}`
    );
  }

  // PROBLEM #6 FIX: Force stop with smart timeline handling
  public forceStop(): void {
    super.forceStop();
    this.smartResetTimelines();
  }

  private getVisibleSymbolIndices(): number[] {
    const start = this.extraCount;
    const end = this.extraCount + this.visibleCount;
    const indices = [];

    for (let i = start; i < end; i++) {
      indices.push(i);
    }

    return this.spinDirection === "down" ? indices.reverse() : indices;
  }

  /**
   * Arranges symbols on the reel based on the current scroll offset and spin direction.
   * Handles wrapping of symbols for continuous scrolling.
   */
  public arrangeSymbols(): void {
    if (!this.reelSetList.length && !this.symbolList.length) return;

    this.symbolList.forEach((symbol, i) => {
      const pos = (i - this.extraCount) * this.cellHeight;
      symbol.setPos(0, pos);
      symbol.setVisible(true);
    });
  }

  // PROBLEM #6 FIX: Smart timeline reset with reference counting
  private smartResetTimelines(): void {
    // Only reset if there are actually active timelines
    if (this.activeTimelineCount <= 0) {
      return;
    }

    let resetCount = 0;

    // Check and reset all possible active timelines
    if (this.spinTimeline && this.spinTimeline.isActive()) {
      this.spinTimeline.kill();
      this.spinTimeline = null;
      resetCount++;
    }

    if (this.stopTimeline && this.stopTimeline.isActive()) {
      this.stopTimeline.kill();
      this.stopTimeline = null;
      resetCount++;
    }

    if (this.cascadeTimeline && this.cascadeTimeline.isActive()) {
      this.cascadeTimeline.kill();
      this.cascadeTimeline = null;
      resetCount++;
    }

    if (resetCount > 0) {
      // Decrease count by number of timelines actually reset
      this.activeTimelineCount = Math.max(
        0,
        this.activeTimelineCount - resetCount
      );
      Logger.log(
        `FallReel ${this.reelIndex}: Smart timeline reset performed, reset ${resetCount} timelines, remaining: ${this.activeTimelineCount}`
      );
    }
  }

  // PROBLEM #6 FIX: Timeline creation with reference counting
  private createTimeline(): gsap.core.Timeline {
    this.activeTimelineCount++;
    Logger.log(
      `FallReel ${this.reelIndex}: Timeline created, active count: ${this.activeTimelineCount}`
    );
    return gsap.timeline();
  }

  /**
   * Cleans up resources, kills active timelines, and calls the superclass destroy method.
   */
  public destroy(): void {
    // PROBLEM #6 FIX: Use smart reset in destroy for cleanup
    this.smartResetTimelines();
    super.destroy();
  }
}
