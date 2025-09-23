import { Engine, Logger } from "game-engine";
import { gsap } from "gsap";
import { ReelEvent } from "../events";
import {
  ICascadeConfigs,
  IndividualReelOptions,
  ReelClassConstructor,
  ReelOptions,
  ReelSpinParams,
  ReelStopParams,
} from "../interfaces";
import type { SlotSymbol } from "../SlotSymbol";
import { SymbolPool as ReelSymbolPool } from "../utils/SymbolPool";
import { AbstractReel } from "./AbstractReel";
import { NormalReel } from "./NormalReel"; // Default class for cell reels
import { GameSpeedMode } from "slot-game-ui";

/**
 * Represents a reel composed of individual cell reels.
 * Each cell acts as a mini-reel, allowing for more complex animations and behaviors.
 * This class orchestrates the operations of its child cell reels.
 */
export class IndividualReel extends AbstractReel {
  private cellReels: AbstractReel[] = []; // Array to hold the individual cell reels
  private readonly rowCount: number; // Number of rows in the grid of cell reels
  private readonly columnCount: number; // Number of columns in the grid of cell reels
  private readonly startDelay: number; // Delay between animations of consecutive cell reels
  private readonly cellReelClass: ReelClassConstructor; // Constructor for the type of reel to use for each cell
  private readonly initialCellSymbols?: string[]; // Optional initial symbols for each cell

  // PROBLEM #7 FIX: Cell symbol update overhead optimization
  private cellPositionCache: Map<number, { x: number; y: number }> = new Map();
  private lastUpdateTimestamp: number = 0;
  private updateThrottleMs: number = 16; // ~60fps throttling
  private pendingCellUpdates: Set<number> = new Set();
  private isUpdateScheduled: boolean = false;
  private batchUpdateTimeout: NodeJS.Timeout | null = null;

  /**
   * Constructs an IndividualReel instance.
   * @param options - Configuration options for the individual reel, including grid dimensions and cell behavior.
   * @param symbolPool - Pool for managing symbol instances, shared with cell reels.
   * @param defaultReelLengthFromMachine - Default length of the reel set, used by cell reels if not overridden.
   */
  constructor(
    options: IndividualReelOptions,
    symbolPool: ReelSymbolPool,
    defaultReelLengthFromMachine: number
  ) {
    const totalCells = (options.rowCount ?? 4) * (options.columnCount ?? 1);
    // Base options for the AbstractReel constructor, visibleCount is total cells.
    const baseOptions: ReelOptions = {
      ...options,
      visibleCount: totalCells,
    };
    super(baseOptions, symbolPool, defaultReelLengthFromMachine);

    this.rowCount = options.rowCount ?? 4;
    this.columnCount = options.columnCount ?? 1;
    this.startDelay = options.startDelay ?? 50; // Default delay if not provided
    this.cellReelClass = options.cellReelClass || NormalReel; // Default to NormalReel for cells
    this.initialCellSymbols = options.initialSymbols;

    // Validate initialCellSymbols length
    if (
      this.initialCellSymbols &&
      this.initialCellSymbols.length !== totalCells
    ) {
      Logger.warn(
        `IndividualReel ${this.reelIndex}: initialCellSymbols length does not match total cells. It will be ignored.`
      );
      this.initialCellSymbols = undefined;
    }

    this.createCellReels(options, defaultReelLengthFromMachine);
    this.arrangeSymbols(); // Initial arrangement of cell reels

    this.precomputeCellPositions(); // PROBLEM #7 FIX: Precompute positions
  }

  // PROBLEM #7 FIX: Precompute cell positions for O(1) lookup
  private precomputeCellPositions(): void {
    const totalCells = this.rowCount * this.columnCount;

    for (let i = 0; i < totalCells; i++) {
      const rowIndex = Math.floor(i / this.columnCount);
      const colIndex = i % this.columnCount;

      this.cellPositionCache.set(i, {
        x: colIndex * this.cellWidth,
        y: rowIndex * this.cellHeight,
      });
    }
  }

  /**
   * Creates and initializes the individual cell reels.
   * @param options - The options passed to the IndividualReel constructor.
   * @param defaultReelLengthFromMachine - Default reel length for cell reels.
   */
  private createCellReels(
    options: IndividualReelOptions,
    defaultReelLengthFromMachine: number
  ): void {
    const totalCells = this.rowCount * this.columnCount;
    for (let i = 0; i < totalCells; i++) {
      // Get specific configuration for this cell, or default cell config, or empty object.
      const cellSpecificConfig =
        options.reelConfigs?.[i] || options.reelDefaultConfig || {};
      const cellReelOptions: ReelOptions = {
        ...cellSpecificConfig, // Spread specific cell config
        reelIndex: i, // Index of the cell reel itself
        cellHeight: this.cellHeight, // Inherit cell dimensions
        cellWidth: this.cellWidth,
        visibleCount: 1, // Each cell reel shows 1 symbol
        extraCount: cellSpecificConfig.extraCount ?? 1, // Default extraCount for cell reel,
        symbolConfig: cellSpecificConfig.symbolConfig || this.symbolCfg, // Inherit symbol config or use cell-specific
        reelSet: cellSpecificConfig.reelSet || this.reelSetList, // Inherit reel set or use cell-specific
        initialSymbols:
          this.initialCellSymbols && this.initialCellSymbols[i].length > 0
            ? [this.initialCellSymbols[i]]
            : [], // Set the initial symbols
        adrenalineSpinConfig:
          cellSpecificConfig.adrenalineSpinConfig || this.adrenalineSpinConfig, // Inherit adrenaline config
      };

      // Instantiate the cell reel using the specified or default class
      const cellReel = new this.cellReelClass(
        cellReelOptions,
        this.symbolPool, // Share the symbol pool
        defaultReelLengthFromMachine
      );
      this.cellReels.push(cellReel);
      this.addChild(cellReel as any); // Add cell reel to the display hierarchy
    }
    this.updateOwnSymbolListFromCells(); // Populate this IndividualReel's symbolList
  }

  // PROBLEM #7 FIX: Batch symbol updates with throttling
  private scheduleBatchSymbolUpdate(): void {
    if (this.isUpdateScheduled || this.pendingCellUpdates.size === 0) {
      return;
    }

    const now = performance.now();
    const timeSinceLastUpdate = now - this.lastUpdateTimestamp;

    if (timeSinceLastUpdate >= this.updateThrottleMs) {
      this.performBatchSymbolUpdate();
    } else {
      this.isUpdateScheduled = true;
      const delay = this.updateThrottleMs - timeSinceLastUpdate;

      this.batchUpdateTimeout = setTimeout(() => {
        this.performBatchSymbolUpdate();
      }, delay);
    }
  }

  // PROBLEM #7 FIX: Efficient batch symbol update
  private performBatchSymbolUpdate(): void {
    if (this.pendingCellUpdates.size === 0) {
      this.isUpdateScheduled = false;
      return;
    }

    const updatesArray = Array.from(this.pendingCellUpdates);
    this.pendingCellUpdates.clear();

    // Batch update all pending cells
    const newSymbolList: SlotSymbol[] = new Array(this.symbolList.length);

    for (const cellIndex of updatesArray) {
      const cellReel = this.cellReels[cellIndex];
      if (
        cellReel &&
        cellReel.symbolList &&
        cellReel.symbolList.length > cellReel.extraCount
      ) {
        const visibleSymbol = cellReel.symbolList[cellReel.extraCount];
        if (visibleSymbol) {
          newSymbolList[cellIndex] = visibleSymbol;
        }
      }
    }

    // Update main symbol list efficiently
    updatesArray.forEach((index) => {
      if (newSymbolList[index]) {
        this.symbolList[index] = newSymbolList[index];
      }
    });

    this.lastUpdateTimestamp = performance.now();
    this.isUpdateScheduled = false;
    this.batchUpdateTimeout = null;
  }

  // PROBLEM #7 FIX: Optimized cell update queue
  private queueCellUpdate(cellIndex: number): void {
    this.pendingCellUpdates.add(cellIndex);
    this.scheduleBatchSymbolUpdate();
  }

  /**
   * Updates this IndividualReel's main symbolList based on the visible symbols of its cell reels.
   * The symbolList of IndividualReel represents the collection of currently visible symbols from all cells.
   */
  private updateOwnSymbolListFromCells(): void {
    // Queue all cells for update instead of immediate processing
    for (let i = 0; i < this.cellReels.length; i++) {
      this.queueCellUpdate(i);
    }
  }

  /**
   * Arranges the cell reels within the IndividualReel's container.
   * Positions each cell reel in a grid layout.
   */
  public arrangeSymbols(): void {
    for (let i = 0; i < this.cellReels.length; i++) {
      const cellReel = this.cellReels[i];
      const cachedPosition = this.cellPositionCache.get(i);

      if (cachedPosition) {
        // Use cached position for O(1) lookup
        cellReel.x = cachedPosition.x;
        cellReel.y = cachedPosition.y;
      } else {
        // Fallback to calculation if cache miss (shouldn't happen)
        const rowIndex = Math.floor(i / this.columnCount);
        const colIndex = i % this.columnCount;
        cellReel.x = colIndex * this.cellWidth;
        cellReel.y = rowIndex * this.cellHeight;
      }
    }
  }

  /**
   * Performs the spin animation by triggering spin on all cell reels.
   * Applies a delay between cell animations if configured.
   * @param spinParams - Parameters for the spin animation, passed to cell reels.
   * @param isAdrenalineSpin - Flag for adrenaline mode, passed to cell reels.
   */
  protected async performSpinAnimation(
    spinParams: ReelSpinParams,
    isAdrenalineSpin?: boolean
  ): Promise<void> {
    const spinPromises: Promise<void>[] = [];
    for (let i = 0; i < this.cellReels.length; i++) {
      const cellReel = this.cellReels[i];
      const promise = (async () => {
        // Apply delay if configured and not the first cell
        if (this.startDelay > 0 && i > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, this.startDelay * i)
          );
        }
        await cellReel.spinReel(spinParams, isAdrenalineSpin);
      })();
      spinPromises.push(promise);
    }
    await Promise.all(spinPromises);
    // Emit REEL_SPIN_LOOP once all cells have started their spin animation sequence.
    // The meaning of "loopCount" for IndividualReel might differ from NormalReel.
    // Here, it signifies that the collective spin sequence has been initiated.
    if (this.currentReelState.value === "spinning") {
      this.events.emit(ReelEvent.REEL_SPIN_LOOP, this); // Emitting with loopCount 1 as a general signal
    }
  }

  /**
   * Performs the stop animation by triggering stop on all cell reels.
   * Distributes landing symbols to respective cell reels.
   * @param params - Parameters for the stop animation, including landing symbols for each cell.
   */
  protected async performStopAnimation(params: ReelStopParams): Promise<void> {
    const isTurbo = (this.game.registry.get("gameSpeed") as GameSpeedMode) === "turbo";
    // PROBLEM #2 FIX: Early force stop detection for immediate animation adjustment
    const isForceStop =
      this._isForceStopped ||
      (params.stopDuration && params.stopDuration <= 0.1);
    const effectiveStopDuration = (isForceStop || isTurbo)
      ? 0.1
      : params.stopDuration || 1.0;
    const effectiveStopEase = (isForceStop || isTurbo)
      ? "none"
      : params.stopEase || "power2.out";

    if (isForceStop) {
      Logger.log(
        `IndividualReel ${this.reelIndex}: Force stop detected, using minimal animation - duration: ${effectiveStopDuration}, ease: ${effectiveStopEase}`
      );
    }

    const stopPromises: Promise<void>[] = [];
    for (let i = 0; i < this.cellReels.length; i++) {
      const cellReel = this.cellReels[i];

      const cellStopParams = {
        landingSymbols: [params.landingSymbols[i]], // PROBLEM #4 FIX: Use array index instead of cellReel.reelIndex
        stopDuration: effectiveStopDuration,
        stopEase: effectiveStopEase,
      };

      const promise = (async () => {
        // Apply delay if configured and not the first cell
        if (this.startDelay > 0 && i > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, this.startDelay * i)
          );
        }
        await cellReel.stopReel(cellStopParams);
      })();
      stopPromises.push(promise);
    }
    await Promise.all(stopPromises);
    // After all cells stop, update the main symbol list and emit landing event.
    // This is handled by the SlotMachine calling updateSymbolsAfterStop.
  }

  /**
   * Adds symbols to each cell reel.
   * This typically means replacing the current symbols in each cell.
   * @param symbolIds - An array of symbol IDs, one for each cell.
   */
  public addSymbols(symbolIds: string[]): void {
    if (symbolIds.length !== this.cellReels.length) {
      Logger.warn("IndividualReel: addSymbols input length mismatch.");
      return;
    }

    // Batch process all cell reel updates
    const updatePromises: Promise<void>[] = [];

    this.cellReels.forEach((cellReel, i) => {
      updatePromises.push(
        new Promise<void>((resolve) => {
          cellReel.addSymbols([symbolIds[i]]);
          this.queueCellUpdate(i);
          resolve();
        })
      );
    });

    // Wait for all updates to be queued
    Promise.all(updatePromises).then(() => {
      // Force immediate batch update if needed
      if (this.pendingCellUpdates.size > 0) {
        this.performBatchSymbolUpdate();
      }
    });
  }

  public init(symbolIds: string[]): void {
    this.cellReels.forEach((cellReel, i) => {
      cellReel.init([symbolIds[i]]);
    });
    this.updateOwnSymbolListFromCells(); // Refresh the IndividualReel's symbolList
  }

  /**
   * Updates the IndividualReel's symbol list after all cell reels have stopped.
   * Emits the REEL_LANDING event.
   * @param landingSymbols - The array of symbols that landed on each cell (unused here, as cells manage their own).
   */
  public updateSymbolList(landingSymbols: string[]): void {
    // landingSymbols parameter might be redundant if cells update themselves correctly.
    // The primary action is to refresh the composite symbol list.
    if (landingSymbols.length !== this.cellReels.length) {
      Logger.warn(
        "IndividualReel: updateSymbolList input length mismatch. This might indicate an issue."
      );
    }

    // Clear any pending updates before processing new ones
    this.pendingCellUpdates.clear();
    if (this.batchUpdateTimeout) {
      clearTimeout(this.batchUpdateTimeout);
      this.batchUpdateTimeout = null;
    }

    // Queue all cell updates
    for (let i = 0; i < this.cellReels.length; i++) {
      this.queueCellUpdate(i);
    }

    // Force immediate batch update for stop operation
    this.performBatchSymbolUpdate();

    this.events.emit(ReelEvent.REEL_LANDING, this, this.symbolList);
  }

  /**
   * Performs a cascade operation on the individual cells.
   * This is a simplified placeholder implementation. A full cascade on individual cells
   * might involve more complex logic per cell or coordinated animations.
   * @param winningSymbolIndices - Indices of the cells (0 to totalCells-1) that have winning symbols.
   * @param newSymbolIds - New symbol IDs to replace the winning symbols, one for each winning cell.
   */
  public async cascade(
    winningSymbolIndices: number[], // These are indices of the cellReels
    newSymbolIds: string[], // Corresponding new symbols for those cells
    animationName: string = "win-cascade",
    cascadeConfigs?: ICascadeConfigs
  ): Promise<void> {
    // STATE MANAGEMENT: Use validation and set flags
    this._validateReelState("cascade");

    this._isIdle = false;
    this._isCascading = true;

    try {
      Logger.warn(
        `IndividualReel ${this.reelIndex}: Cascade feature is a placeholder.`,
        { winningSymbolIndices, newSymbolIds }
      );

      if (winningSymbolIndices.length !== newSymbolIds.length) {
        const errorMsg =
          "Cascade error: winningSymbolIndices and newSymbolIds length mismatch.";
        Logger.error(errorMsg);
        this.events.emit(ReelEvent.REEL_ERROR, this, { message: errorMsg });
        return Promise.reject(new Error(errorMsg));
      }

      this.events.emit(
        ReelEvent.REEL_CASCADE_START,
        this,
        winningSymbolIndices,
        newSymbolIds
      );

      const replacementPromises: Promise<void>[] = [];
      for (let i = 0; i < winningSymbolIndices.length; i++) {
        const cellIndex = winningSymbolIndices[i]; // Index of the cellReel to cascade
        const newSymbolId = newSymbolIds[i]; // New symbol for this cell

        if (this.cellReels[cellIndex]) {
          const cellReel = this.cellReels[cellIndex];
          // This placeholder directly replaces the symbol with a fade effect.
          // A true cascade on a cellReel might involve its own spin/drop animation.
          const p = new Promise<void>((resolve) => {
            // Get the current visible symbol's display object from the cell reel
            const oldSymbolDisplay = (
              cellReel.symbolList[cellReel.extraCount] as any
            )?.displayObject; // Assuming SlotSymbol has displayObject // Accessing displayObject, might need type assertion or safer access

            if (oldSymbolDisplay) {
              gsap
                .to(oldSymbolDisplay, {
                  alpha: 0, // Fade out old symbol
                  duration: 0.3,
                })
                .then(() => {
                  // Replace symbol in the cell reel's strip
                  const strip = [];
                  for (let k = 0; k < 1 + 2 * cellReel.extraCount; k++) {
                    strip.push(
                      k === cellReel.extraCount ? newSymbolId : newSymbolId // Simplified: fill strip with new symbol
                    );
                  }
                  cellReel.addSymbols(strip); // Update cell's symbol list

                  // Animate new symbol appearing
                  const newSymbolDisplay = (
                    cellReel.symbolList[cellReel.extraCount] as any
                  )?.displayObject;
                  if (newSymbolDisplay) {
                    newSymbolDisplay.alpha = 0; // Start transparent
                    gsap.to(newSymbolDisplay, {
                      alpha: 1, // Fade in new symbol
                      duration: 0.3,
                      onComplete: resolve,
                    });
                  } else {
                    resolve(); // No display object to animate
                  }
                });
            } else {
              // If no old symbol display, just add the new one and try to animate
              const strip = [];
              for (let k = 0; k < 1 + 2 * cellReel.extraCount; k++) {
                strip.push(
                  k === cellReel.extraCount ? newSymbolId : newSymbolId
                );
              }
              cellReel.addSymbols(strip);
              const newSymbolDisplay =
                cellReel.symbolList[cellReel.extraCount]?.visual.displayObject; // Accessing via visual property
              if (newSymbolDisplay) {
                newSymbolDisplay.alpha = 0;
                gsap.to(newSymbolDisplay, {
                  alpha: 1,
                  duration: 0.3,
                  onComplete: resolve,
                });
              } else {
                resolve();
              }
            }
          });
          replacementPromises.push(p);
        }
      }

      await Promise.all(replacementPromises);
      this.updateOwnSymbolListFromCells(); // Update the main symbol list
      this.events.emit(ReelEvent.REEL_CASCADE_COMPLETE, this, this.symbolList);
    } finally {
      // STATE MANAGEMENT: Restore idle state after cascade processing
      this._isCascading = false;
      this._isIdle = true;
      Logger.log(
        `Reel ${this.reelIndex} returned to idle state after cascade processing.`
      );
    }
  }

  /**
   * Performs a nudge operation on the individual cells.
   * This nudges specific cell reels in the specified direction with new symbols.
   * @param newSymbolId - The new symbol ID to add during nudge
   * @param nudgeDirection - The direction to nudge ("up", "down")
   */
  public async nudge(
    newSymbolId: string,
    nudgeDirection: "up" | "down" = "down"
  ): Promise<void> {
    // STATE MANAGEMENT: Use validation and set flags
    this._validateReelState("nudge");

    this._isIdle = false;
    this._isNudging = true;

    // Emit nudge start event
    this.events.emit(ReelEvent.REEL_NUDGE_START, this, nudgeDirection);
    Logger.log(
      `IndividualReel ${this.reelIndex}: Starting nudge in direction ${nudgeDirection} with symbol ${newSymbolId}`
    );

    try {
      // For IndividualReel, we'll nudge all cell reels with the same symbol and direction
      // This can be customized to nudge specific cells based on requirements
      const nudgePromises: Promise<void>[] = [];

      for (let i = 0; i < this.cellReels.length; i++) {
        const cellReel = this.cellReels[i];

        const promise = (async () => {
          // Apply delay if configured and not the first cell
          if (this.startDelay > 0 && i > 0) {
            await new Promise((resolve) =>
              setTimeout(resolve, this.startDelay * i)
            );
          }

          Logger.log(
            `IndividualReel ${this.reelIndex}: Nudging cell ${i} in direction ${nudgeDirection}`
          );
          await cellReel.nudge(newSymbolId, nudgeDirection);
        })();

        nudgePromises.push(promise);
      }

      // Wait for all cell reels to complete their nudge animations
      await Promise.all(nudgePromises);

      // Update the main symbol list after all nudges are complete
      this.updateOwnSymbolListFromCells();

      // Emit nudge complete event
      this.events.emit(ReelEvent.REEL_NUDGE_COMPLETE, this);
      Logger.log(
        `IndividualReel ${this.reelIndex}: Nudge completed successfully`
      );
    } catch (error) {
      Logger.error(
        `IndividualReel ${this.reelIndex}: Error during nudge:`,
        error
      );
      this.events.emit(ReelEvent.REEL_ERROR, this, {
        message: (error as Error).message,
        originalError: error,
      });
      throw error;
    } finally {
      // STATE MANAGEMENT: Restore idle state after nudge processing
      this._isNudging = false;
      this._isIdle = true;
      Logger.log(
        `IndividualReel ${this.reelIndex} returned to idle state after nudge processing.`
      );
    }
  }

  /**
   * Performs a nudge operation on specific cell reels.
   * This allows for more granular control over which cells get nudged.
   * @param cellIndices - Array of cell indices to nudge (0 to totalCells-1)
   * @param newSymbolIds - Array of new symbol IDs, one for each cell being nudged
   * @param nudgeDirection - The direction to nudge ("up", "down")
   */
  public async nudgeSpecificCells(
    cellIndices: number[],
    newSymbolIds: string[],
    nudgeDirection: "up" | "down" = "down"
  ): Promise<void> {
    // STATE MANAGEMENT: Use validation and set flags
    this._validateReelState("nudge specific cells");

    if (cellIndices.length !== newSymbolIds.length) {
      const errorMsg =
        "Nudge error: cellIndices and newSymbolIds length mismatch.";
      Logger.error(errorMsg);
      this.events.emit(ReelEvent.REEL_ERROR, this, { message: errorMsg });
      throw new Error(errorMsg);
    }

    this._isIdle = false;
    this._isNudging = true;

    // Emit nudge start event
    this.events.emit(ReelEvent.REEL_NUDGE_START, this, nudgeDirection);
    Logger.log(
      `IndividualReel ${this.reelIndex}: Starting specific cell nudge on ${cellIndices.length} cells in direction ${nudgeDirection}`
    );

    try {
      const nudgePromises: Promise<void>[] = [];

      for (let i = 0; i < cellIndices.length; i++) {
        const cellIndex = cellIndices[i];
        const newSymbolId = newSymbolIds[i];

        if (this.cellReels[cellIndex]) {
          const cellReel = this.cellReels[cellIndex];

          const promise = (async () => {
            // Apply delay if configured
            if (this.startDelay > 0 && i > 0) {
              await new Promise((resolve) =>
                setTimeout(resolve, this.startDelay * i)
              );
            }

            Logger.log(
              `IndividualReel ${this.reelIndex}: Nudging cell ${cellIndex} in direction ${nudgeDirection} with symbol ${newSymbolId}`
            );
            await cellReel.nudge(newSymbolId, nudgeDirection);
          })();

          nudgePromises.push(promise);
        } else {
          Logger.warn(
            `IndividualReel ${this.reelIndex}: Cell ${cellIndex} not found for nudge.`
          );
        }
      }

      // Wait for all specified cell reels to complete their nudge animations
      await Promise.all(nudgePromises);

      // Update the main symbol list after all nudges are complete
      this.updateOwnSymbolListFromCells();

      // Emit nudge complete event
      this.events.emit(ReelEvent.REEL_NUDGE_COMPLETE, this);
      Logger.log(
        `IndividualReel ${this.reelIndex}: Specific cell nudge completed successfully`
      );
    } catch (error) {
      Logger.error(
        `IndividualReel ${this.reelIndex}: Error during specific cell nudge:`,
        error
      );
      this.events.emit(ReelEvent.REEL_ERROR, this, {
        message: (error as Error).message,
        originalError: error,
      });
      throw error;
    } finally {
      // STATE MANAGEMENT: Restore idle state after nudge processing
      this._isNudging = false;
      this._isIdle = true;
      Logger.log(
        `IndividualReel ${this.reelIndex} returned to idle state after specific cell nudge processing.`
      );
    }
  }

  /**
   * Destroys the IndividualReel and all its child cell reels.
   * Cleans up resources and removes event listeners.
   */
  public destroy(): void {
    // PROBLEM #7 FIX: Clean up batch update resources
    if (this.batchUpdateTimeout) {
      clearTimeout(this.batchUpdateTimeout);
      this.batchUpdateTimeout = null;
    }

    this.pendingCellUpdates.clear();
    this.cellPositionCache.clear();
    this.isUpdateScheduled = false;

    this.cellReels.forEach((cellReel) => cellReel.destroy());
    this.cellReels = [];
    super.destroy();
  }
}
