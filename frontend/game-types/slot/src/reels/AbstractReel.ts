import { Engine, Logger } from "game-engine";
import { gsap } from "gsap";
import { Container, DestroyOptions, EventEmitter, Graphics } from "pixi.js";
import { ReelEvent, ReelEvents } from "../events";
import {
  AdrenalineSpinConfig,
  GameSpeedMode,
  ICascadeConfigs,
  MachineOptions,
  ReelOptions,
  ReelSpinParams,
  ReelStopParams,
  SymbolOptions,
} from "../interfaces";
import type { SlotSymbol } from "../SlotSymbol";
import { SymbolPool as ReelSymbolPool } from "../utils/SymbolPool";

export abstract class AbstractReel extends Container {
  spinTimeline: gsap.core.Timeline | null = null;
  public events: EventEmitter<ReelEvents> = new EventEmitter<ReelEvents>();
  public reelIndex: number;
  protected cellHeight: number;
  protected cellWidth: number;
  public readonly visibleCount: number;
  public readonly extraCount: number;
  protected symbolPool: ReelSymbolPool;
  protected spinDirection: "up" | "down";
  public reelSetList: string[];
  protected readonly symbolCfg: MachineOptions["symbolConfig"];
  public symbolList: SlotSymbol[] = [];
  public readonly adrenalineSpinConfig?: AdrenalineSpinConfig;
  protected cascadeTimeline: gsap.core.Timeline | null = null;
  protected readonly defaultReelLength: number;
  protected symbolIds: string[] = []; // Initial symbols to be displayed on the reel

  protected _isSpinning: boolean = false;
  protected _isStopping: boolean = false;
  protected _isForceStopped: boolean = false;
  protected _isIdle: boolean = true;
  protected _error: any = null; // Tracks any error that occurred during reel operations
  // Additional state tracking flags
  protected _isNudging: boolean = false;
  protected _isCascading: boolean = false;
  protected maskObject: Container | null = null;
  protected _shuffle: boolean;

  /**
   * Returns the current operational state of the reel
   * @returns An object containing the current state value: 'idle', 'spinning', 'stopping', or 'error'
   */
  get currentReelState(): {
    value: "idle" | "spinning" | "stopping" | "error";
  } {
    if (this._error) return { value: "error" };
    if (this._isSpinning) return { value: "spinning" };
    if (this._isStopping) return { value: "stopping" };
    if (this._isIdle) return { value: "idle" };
    return { value: "idle" }; // Default to idle if no other state is active
  }

  get isStopping(): boolean {
    return this._isStopping;
  }

  get isForceStopped(): boolean {
    return this._isForceStopped;
  }

  get displaySymbols(): SlotSymbol[] {
    return this.symbolList.slice(
      this.extraCount,
      this.extraCount + this.visibleCount
    );
  }

  /**
   * Creates a new reel instance
   * @param options - Configuration options for the reel
   * @param symbolPool - Pool of symbols to draw from when populating the reel
   * @param defaultReelLengthFromMachine - Default length of the reel strip from the machine configuration
   */
  constructor(
    options: ReelOptions,
    symbolPool: ReelSymbolPool,
    defaultReelLengthFromMachine: number
  ) {
    super();
    Engine.Utils.ApplyCommonProperties(this as any, options);

    // Initialize reel properties from options
    this.reelIndex = options.reelIndex; // Position index of this reel within the slot machine
    this.cellHeight = options.cellHeight; // Height of each symbol cell
    this.cellWidth = options.cellWidth; // Width of each symbol cell
    this.visibleCount = options.visibleCount; // Number of visible symbols in the reel
    this.spinDirection = options.direction ?? "down"; // Direction in which the reel spins
    this.extraCount = options.extraCount ?? 1; // Additional symbols to load beyond visible area (for smooth spinning)
    this.symbolPool = symbolPool;
    this.adrenalineSpinConfig = options.adrenalineSpinConfig;
    this.defaultReelLength = defaultReelLengthFromMachine;
    this._shuffle = options.shuffle ?? true; // Whether to shuffle the reel set

    if (!options.symbolConfig) {
      Logger.error(
        `Reel ${this.reelIndex} was created without a symbolConfig in its options! This is required.`
      );
      this.symbolCfg = {};
    } else {
      this.symbolCfg = options.symbolConfig;
    }

    if (typeof options.reelSet === "number") {
      const reelLength = options.reelSet;
      const availableSymbolIds = Object.keys(this.symbolCfg);
      if (availableSymbolIds.length === 0) {
        Logger.error(
          `Reel ${this.reelIndex}: Cannot generate random reelSet of length ${reelLength} because symbolConfig is empty.`
        );
        this.reelSetList = Array(reelLength).fill("DEFAULT_SYMBOL_ID");
      } else {
        this.reelSetList = [];
        for (let i = 0; i < reelLength; i++) {
          const randomIndex = Math.floor(
            Math.random() * availableSymbolIds.length
          );
          this.reelSetList.push(availableSymbolIds[randomIndex]);
        }
      }
    } else if (Array.isArray(options.reelSet)) {
      this.reelSetList = [...options.reelSet];
    } else {
      const availableSymbolIds = Object.keys(this.symbolCfg);
      if (availableSymbolIds.length > 0) {
        const lengthToUse =
          this.defaultReelLength > 0 ? this.defaultReelLength : 20;
        this.reelSetList = [];
        for (let i = 0; i < lengthToUse; i++) {
          const randomIndex = Math.floor(
            Math.random() * availableSymbolIds.length
          );
          this.reelSetList.push(availableSymbolIds[randomIndex]);
        }
      } else {
        Logger.error(
          `Reel ${this.reelIndex}: reelSet not provided and no symbols found in symbolConfig to generate from. Defaulting to empty reelSetList.`
        );
        this.reelSetList = [];
      }
    }

    const maskGraphic = new Graphics();
    maskGraphic.rect(0, 0, this.cellWidth, this.cellHeight * this.visibleCount);
    if (options.useMask !== false) {
      maskGraphic.fill(0xffffff);
      this.maskObject = maskGraphic;
      this.mask = this.maskObject;
      this.addChild(this.maskObject);
    }
  }

  // Common validation utility
  protected _validateReelState(operation: string): void {
    if (!this._isIdle) {
      const error = `Cannot ${operation} while reel is not idle. Current state: spinning=${this._isSpinning}, stopping=${this._isStopping}, nudging=${this._isNudging}, cascading=${this._isCascading}`;
      Logger.warn(error);
      throw new Error(error);
    }
  }

  init(symbols: string[]): void {
    this.symbolIds = symbols;
    if (this.symbolIds.length === 0) {
      Logger.warn(
        `Reel ${this.reelIndex}: No initial symbols provided and reelSetList is empty. Initial symbols will be empty.`
      );
    }

    this.updateSymbolList(this.symbolIds);
  }

  public returnSelectedSymbolsToPool(
    symbolsToReturn: SlotSymbol[] = this.symbolList
  ): void {
    // PROBLEM #5 FIX: Optimized symbol return with batch operations
    if (symbolsToReturn.length === 0) return;

    // Batch collect symbols to return
    const symbolsToRemove: SlotSymbol[] = [];

    for (let i = symbolsToReturn.length - 1; i >= 0; i--) {
      const sym = symbolsToReturn[i];
      if (sym) {
        // Remove from display hierarchy if it's a child
        if (this.children.includes(sym as any)) {
          this.removeChild(sym as any);
        }
        symbolsToRemove.push(sym);
      }
    }

    // Batch return to pool
    symbolsToRemove.forEach((sym) => this.symbolPool.return(sym));

    // Clear the source array efficiently
    symbolsToReturn.length = 0;
  }

  // PROBLEM #5 FIX: Incremental symbol management methods for better performance

  /**
   * Adds a single symbol without full list regeneration
   * @param symbolId - ID of symbol to add
   * @param position - Position to insert (optional, defaults to end)
   */
  public addSingleSymbol(symbolId: string, position?: number): SlotSymbol {
    const overrideSymbolOptions = this.symbolCfg[symbolId] as
      | SymbolOptions
      | undefined;
    const symbol = this.symbolPool.get(symbolId, overrideSymbolOptions);

    this.addChild(symbol as any);

    if (
      position !== undefined &&
      position >= 0 &&
      position <= this.symbolList.length
    ) {
      this.symbolList.splice(position, 0, symbol);
    } else {
      this.symbolList.push(symbol);
    }

    return symbol;
  }

  /**
   * Removes a single symbol by reference
   * @param symbol - Symbol to remove
   */
  public removeSingleSymbol(symbol: SlotSymbol): boolean {
    const index = this.symbolList.indexOf(symbol);
    if (index === -1) return false;

    this.symbolList.splice(index, 1);
    if (this.children.includes(symbol as any)) {
      this.removeChild(symbol as any);
    }
    this.symbolPool.return(symbol);

    return true;
  }

  /**
   * Replaces a symbol at specific index without affecting other symbols
   * @param index - Index to replace
   * @param newSymbolId - New symbol ID
   */
  public replaceSymbolAtIndex(index: number, newSymbolId: string): boolean {
    if (index < 0 || index >= this.symbolList.length) return false;

    const oldSymbol = this.symbolList[index];
    const newSymbol = this.addSingleSymbol(newSymbolId);

    // Replace in array
    this.symbolList[index] = newSymbol;

    // Remove old symbol
    if (this.children.includes(oldSymbol as any)) {
      this.removeChild(oldSymbol as any);
    }
    this.symbolPool.return(oldSymbol);

    return true;
  }

  public abstract arrangeSymbols(): void;

  protected abstract performSpinAnimation(
    spinParams: ReelSpinParams,
    isAdrenalineSpin?: boolean
  ): Promise<void>;
  protected abstract performStopAnimation(
    params: ReelStopParams
  ): Promise<void>;

  public async spinReel(
    spinParams: ReelSpinParams,
    isAdrenalineSpin: boolean = false
  ): Promise<void> {
    if (this._isSpinning || this._isStopping) {
      Logger.warn(
        `Reel ${this.reelIndex} is already spinning or stopping. Spin request ignored.`
      );
      return Promise.reject(new Error("Reel busy"));
    }

    this._isIdle = false;
    this._isSpinning = true;
    this._isStopping = false;
    this._error = null;
    this._isForceStopped = false; // Reset force stop state

    this.events.emit(ReelEvent.REEL_SPIN_START, this);

    try {
      this.showMask(true);
      this.showExcessSymbols(true);
      await this.performSpinAnimation(spinParams, isAdrenalineSpin);
    } catch (error) {
      this._error = error;
      this._isSpinning = false;
      this._isIdle = true;
      this.events.emit(ReelEvent.REEL_ERROR, this, {
        message: (error as Error).message,
        originalError: error,
      });
      throw error;
    }
  }

  public async stopReel(stopParams: ReelStopParams): Promise<void> {
    if (!this._isSpinning) {
      Logger.warn(
        `Reel ${this.reelIndex} is not spinning. Stop request ignored.`
      );
      // return Promise.reject(new Error("Reel not spinning or already stopping"));
    }

    this._isStopping = true;

    this.events.emit(ReelEvent.REEL_STOP_START, this);

    try {
      // PROBLEM #2 FIX: Apply force stop parameters BEFORE performStopAnimation
      if (this._isForceStopped) {
        stopParams.stopDuration = 0.1; // Force stop should not have a duration
        stopParams.stopEase = "none"; // Force stop should not have easing
        Logger.log(
          `Reel ${this.reelIndex}: Force stop parameters applied - duration: ${stopParams.stopDuration}`
        );
      }

      await this.performStopAnimation(stopParams);
      // Update the displayed symbols on the reel to match the landingSymbols.
      this.updateSymbolList(stopParams.landingSymbols);

      this.showMask(false);
      this.showExcessSymbols(false);

      this._isStopping = false;
      this._isSpinning = false;

      this._isIdle = true;
      this._error = null;

      const visibleLandedSymbols = this.symbolList.slice(
        this.extraCount,
        this.extraCount + this.visibleCount
      );
      this.events.emit(
        ReelEvent.REEL_STOP_COMPLETE,
        this,
        visibleLandedSymbols
      );
    } catch (error) {
      this._error = error;
      this._isStopping = false;
      this._isSpinning = false;
      this._isIdle = true;
      this.events.emit(ReelEvent.REEL_ERROR, this, {
        message: (error as Error).message,
        originalError: error,
      });
      throw error;
    }
  }

  showMask(value: boolean) {
    this.mask = value && this.maskObject ? this.maskObject : null;
    if (this.maskObject) {
      this.maskObject.visible = value;
    }
  }

  showExcessSymbols(value: boolean) {
    // PROBLEM #3 FIX: Show excess symbols based on value
    if (value) {
      Logger.log(`Reel ${this.reelIndex}: Showing excess symbols.`);
      this.symbolList.forEach((symbol) => {
        symbol.setVisible(true);
      });
    } else {
      Logger.log(`Reel ${this.reelIndex}: Hiding excess symbols.`);
      this.symbolList.forEach((symbol, index) => {
        if (
          index < this.extraCount ||
          index >= this.extraCount + this.visibleCount
        ) {
          symbol.setVisible(false);
        }
      });
    }
  }

  forceStop(): void {
    // PROBLEM #2 FIX: Enhanced force stop with immediate state validation
    if (!this._isSpinning && !this._isStopping) {
      Logger.warn(
        `Reel ${this.reelIndex}: Force stop called but reel is not spinning or stopping. Current state: ${this.currentReelState.value}`
      );
      return;
    }

    if (this._isForceStopped) {
      Logger.log(`Reel ${this.reelIndex}: Already force stopped.`);
      return;
    }

    this._isForceStopped = true; // Set force stop flag
    Logger.log(
      `Reel ${this.reelIndex}: Force stop flag set. Current animation will use minimal duration.`
    );
  }

  refresh(landingSymbols: string[]) {
    Logger.log(`Reel ${this.reelIndex}: Refreshing reel with new symbols.`);

    this.symbolIds = landingSymbols;
    this.updateSymbolList(landingSymbols);
  }

  public updateSymbolList(landingSymbols: string[]): void {
    if (!landingSymbols || landingSymbols.length === 0) {
      Logger.warn(
        `Reel ${this.reelIndex}: No landing symbols provided for updateSymbolsAfterStop.`
      );
      return;
    }

    if (landingSymbols.length !== this.visibleCount) {
      Logger.error(
        `Reel ${this.reelIndex}: Landing symbols count (${landingSymbols.length}) does not match required total symbols (${this.visibleCount}).`
      );
      return;
    }

    const generatedSymbols: string[] = [];
    for (
      let i = -this.extraCount;
      i < this.visibleCount + this.extraCount;
      i++
    ) {
      if (i >= 0 && i < this.visibleCount) {
        generatedSymbols[i + this.extraCount] = landingSymbols[i];
      } else {
        generatedSymbols[i + this.extraCount] =
          this.reelSetList[(i + this.extraCount) % this.reelSetList.length];
      }
    }

    landingSymbols = generatedSymbols;

    // PROBLEM #5 FIX: Optimized symbol update with reuse strategy
    const existingSymbols = this.symbolList;
    const newSymbols: SlotSymbol[] = [];
    const symbolsToReturn: SlotSymbol[] = [];

    // Try to reuse existing symbols where possible
    for (let i = 0; i < landingSymbols.length; i++) {
      const targetSymbolId = landingSymbols[i];
      let reuseSymbol: SlotSymbol | null = null;

      // Look for existing symbol with same ID that can be reused
      for (let j = 0; j < existingSymbols.length; j++) {
        const existingSymbol = existingSymbols[j];
        if (existingSymbol && existingSymbol.label === targetSymbolId) {
          reuseSymbol = existingSymbol;
          existingSymbols[j] = null as any; // Mark as used
          break;
        }
      }

      if (reuseSymbol) {
        newSymbols.push(reuseSymbol);
      } else {
        // Create new symbol if no reusable one found
        const overrideSymbolOptions = this.symbolCfg[targetSymbolId] as
          | SymbolOptions
          | undefined;
        const newSymbol = this.symbolPool.get(
          targetSymbolId,
          overrideSymbolOptions
        );
        newSymbols.push(newSymbol);
        this.addChild(newSymbol as any);
      }
    }

    // Collect unused existing symbols for return
    existingSymbols.forEach((symbol) => {
      if (symbol) {
        symbolsToReturn.push(symbol);
      }
    });

    this.symbolList = newSymbols;
    this.arrangeSymbols();
    this.returnSelectedSymbolsToPool(symbolsToReturn);

    const visibleLandedSymbols = this.symbolList.slice(
      this.extraCount,
      this.extraCount + this.visibleCount
    );
    this.events.emit(ReelEvent.REEL_LANDING, this, visibleLandedSymbols);
  }

  /**
   * @description Nudges the reel (shift one position) in a specified direction, adding a new symbol and adjusting existing symbols.
   * @param nudgeDirection Direction to nudge ("up", "down").
   * @param newSymbolId ID of the new symbol to add.
   * @returns A promise that resolves when the nudge operation is complete.
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
      `Reel ${this.reelIndex}: Starting nudge in direction ${nudgeDirection} with symbol ${newSymbolId}`
    );

    try {
      const newSymbol = this.symbolPool.get(
        newSymbolId,
        this.symbolCfg[newSymbolId] as SymbolOptions
      );
      newSymbol.setVisible(true);
      if (nudgeDirection === "down") {
        newSymbol.setPos(0, -this.cellHeight); // Position the new symbol above the visible symbols for downward nudges
      } else if (nudgeDirection === "up") {
        newSymbol.setPos(0, this.visibleCount * this.cellHeight); // Position the new symbol below the visible symbols for upward nudges
      }
      this.addChild(newSymbol as any);

      let symbolToRemoveFromStage: SlotSymbol | null = null;
      if (nudgeDirection === "down") {
        symbolToRemoveFromStage = this.symbolList[this.symbolList.length - 1];
        // Insert new symbols above the visible symbol indexes
        this.symbolList = [
          ...this.symbolList.slice(0, this.extraCount),
          newSymbol,
          ...this.symbolList.slice(this.extraCount, this.symbolList.length - 1),
        ];
      } else {
        symbolToRemoveFromStage = this.symbolList[0];
        // Insert new symbols below the visible symbol indexes
        this.symbolList = [
          ...this.symbolList.slice(1, this.visibleCount + this.extraCount),
          newSymbol,
          ...this.symbolList.slice(
            this.visibleCount + this.extraCount,
            this.symbolList.length
          ),
        ];
      }

      const nudges: Promise<void>[] = [];

      this.symbolList.forEach((symbol, index) => {
        // Do not nudge the hidden symbols
        if (nudgeDirection === "down") {
          if (
            index < this.extraCount ||
            index > this.visibleCount + this.extraCount + 1
          )
            return;
        } else if (nudgeDirection === "up") {
          if (
            index < this.extraCount - 1 ||
            index > this.visibleCount + this.extraCount
          )
            return;
        }

        const targetY =
          nudgeDirection === "down"
            ? symbol.y + this.cellHeight
            : symbol.y - this.cellHeight;

        const nudgeTween = gsap.timeline().to(symbol, {
          y: targetY,
          duration: 0.3,
          ease: "power2.in",
        });

        nudges.push(
          new Promise((resolve) => {
            nudgeTween.eventCallback("onComplete", resolve);
          })
        );
      });

      this.showMask(true); // Show mask during nudge
      this.showExcessSymbols(true); // Show excess symbols during nudge
      await Promise.all(nudges);
      this.returnSelectedSymbolsToPool([symbolToRemoveFromStage]);
      this.arrangeSymbols();

      // Emit nudge complete event
      this.events.emit(ReelEvent.REEL_NUDGE_COMPLETE, this);
      Logger.log(`Reel ${this.reelIndex}: Nudge completed successfully`);
    } catch (error) {
      Logger.error(`Reel ${this.reelIndex}: Error during nudge:`, error);
      this.events.emit(ReelEvent.REEL_ERROR, this, {
        message: (error as Error).message,
        originalError: error,
      });
      throw error;
    } finally {
      this.showMask(false); // Hide mask after nudge
      this.showExcessSymbols(false); // Hide excess symbols after nudge
      // STATE MANAGEMENT: Restore idle state after nudge processing
      this._isNudging = false;
      this._isIdle = true;
      Logger.log(
        `Reel ${this.reelIndex} returned to idle state after nudge processing.`
      );
    }
  }

  /**
   * Performs a cascade animation where winning symbols are removed and new symbols fall into place.
   * @param extract - Indices of the winning symbols (relative to visible symbols).
   * @param insert - IDs of the new symbols to replace the winning ones.
   * @returns A promise that resolves when the cascade animation is complete.
   */
  public async cascade(
    extract: number[],
    insert: string[],
    animationName: string = "win-cascade",
    cascadeConfigs?: ICascadeConfigs
  ): Promise<void> {
    // STATE MANAGEMENT: Use validation and set flags
    this._validateReelState("cascade");

    this._isIdle = false;
    this._isCascading = true;

    try {
      this.events.emit(ReelEvent.REEL_CASCADE_START, this, extract, insert);

      this.showMask(true); // Show mask during cascade
      this.showExcessSymbols(true); // Hide excess symbols during cascade
      // PROBLEM #1 FIX: Await cascade animation completion before state restore
      await this.animateCascadeWin(
        extract,
        insert,
        animationName,
        cascadeConfigs
      );
    } finally {
      this.showMask(false); // Hide mask after cascade
      this.showExcessSymbols(false); // Hide excess symbols after cascade
      // STATE MANAGEMENT: Restore idle state after cascade processing
      this._isCascading = false;
      this._isIdle = true;
      Logger.log(
        `Reel ${this.reelIndex} returned to idle state after cascade processing.`
      );
    }
  }

  /** To animate and hide winning symbols */
  private async animateCascadeWin(
    extract: number[] = [],
    insert: string[] = [],
    animationName: string = "win-cascade",
    cascadeConfigs?: ICascadeConfigs
  ): Promise<void> {
    const winningSymbolsOnReelObjects = this.getActualSymbolIndices(extract)
      .map((i) => this.symbolList[i])
      .filter(Boolean) as SlotSymbol[];

    if (winningSymbolsOnReelObjects.length === 0) {
      // No winning symbols to animate, proceed directly to completion
      await this.onAllAnimationsComplete(extract, insert, cascadeConfigs);
      return;
    }

    const gameSpeed = this.game.registry.get("gameSpeed") as GameSpeedMode;
    const isTurbo = gameSpeed && gameSpeed === "turbo";
    // PROBLEM #1 FIX: Promise-based animation completion tracking
    await new Promise<void>((resolve) => {
      let completedCount = 0;
      const total = winningSymbolsOnReelObjects.length;

      winningSymbolsOnReelObjects.forEach((symbol) => {
        symbol.playAnim(
          animationName,
          false,
          () => {
            symbol.setVisible(false); // Hide the symbol after animation
            completedCount++;
            if (completedCount === total) {
              // All symbol animations are complete
              resolve();
            }
          },
          isTurbo ? 3 : 1
        );
      });
    });

    // Now proceed to cascade drop animation
    await this.onAllAnimationsComplete(extract, insert, cascadeConfigs);
  }

  /** To play the cascade animation where symbols shifts down filling empty spaces */
  private async onAllAnimationsComplete(
    extract: number[] = [],
    insert: string[] = [],
    cascadeConfigs?: ICascadeConfigs
  ): Promise<void> {
    const symbolsToRemoveFromStage: SlotSymbol[] = [];
    // Map visible indices to actual indices in symbolList and sort descending for safe removal.
    const actualWinningIndicesInSymbolList = this.getActualSymbolIndices(
      extract
    ).sort((a, b) => b - a);

    // Remove winning symbols from symbolList.
    for (const listIndex of actualWinningIndicesInSymbolList) {
      if (this.symbolList[listIndex]) {
        const removedSymbol = this.symbolList.splice(listIndex, 1)[0];
        symbolsToRemoveFromStage.push(removedSymbol); // Keep track for returning to pool.
      }
    }

    symbolsToRemoveFromStage.forEach((sym) => sym.setVisible(false)); // Hide before returning to pool.
    // Create new symbols to add.
    const newSymbolsToAdd: SlotSymbol[] = insert.map((id) => {
      const sym = this.symbolPool.get(id, this.symbolCfg[id] as SymbolOptions);
      sym.setPos(0, -this.cellHeight);
      this.addChild(sym as any); // Add to display hierarchy.
      return sym;
    });

    // Add new symbols to the top of the visible symbols
    this.symbolList.splice(this.extraCount, 0, ...newSymbolsToAdd);

    // Ensure symbolList has the correct number of symbols.
    const requiredSymbolCount = this.visibleCount + this.extraCount * 2;
    if (this.symbolList.length > requiredSymbolCount) {
      // Remove excess symbols from the end.
      const excessSymbols = this.symbolList.splice(requiredSymbolCount);
      excessSymbols.forEach((sym) => this.symbolPool.return(sym));
      this.removeChild(...(excessSymbols as any)); // Remove from display hierarchy.
    } else if (
      this.symbolList.length < requiredSymbolCount &&
      this.reelSetList.length > 0 // Only add if reelSetList is available.
    ) {
      // Fill up with random symbols if not enough, adding to the start (top).
      while (this.symbolList.length < requiredSymbolCount) {
        const randomSymId =
          this.reelSetList[Math.floor(Math.random() * this.reelSetList.length)];
        const sym = this.symbolPool.get(
          randomSymId,
          this.symbolCfg[randomSymId] as SymbolOptions
        );
        sym.setVisible(false);
        this.addChild(sym as any);
        this.symbolList.unshift(sym); // Add to the beginning.
      }
    }

    // PROBLEM #1 FIX: Promise-based cascade animation completion
    return new Promise<void>((resolve) => {
      this.playCascadeAnimation(
        extract,
        symbolsToRemoveFromStage,
        cascadeConfigs,
        resolve
      );
    });
  }

  private playCascadeAnimation(
    winningSymbolIndices: number[] = [],
    symbolsToRemoveFromStage: SlotSymbol[] = [],
    cascadeConfigs?: ICascadeConfigs,
    onComplete?: () => void
  ): void {
    if (
      this.reelSetList.length === 0 ||
      this.symbolList.length === 0 ||
      winningSymbolIndices.length === 0
    ) {
      if (onComplete) onComplete();
      return;
    }

    this.cascadeTimeline = gsap.timeline();
    const cascadeDuration = cascadeConfigs?.dropDuration || 0.3;
    const cascadeStagger = cascadeConfigs?.staggerDelay || 0.04;
    const cascadeEasing = cascadeConfigs?.easing || "power1";

    this.symbolList.forEach((symbol, i) => {
      if (i < this.extraCount || i >= this.extraCount + this.visibleCount) {
        return; // Skip the hidden syms, they don't need to be animated
      }

      const finalPixelPos = (i - this.extraCount) * this.cellHeight;

      let currentY = symbol.y ?? 0;

      //  Adjust currentY for vertical reels for new symbols
      if (i !== 0 && i <= winningSymbolIndices.length) {
        currentY = -this.cellHeight;
      }

      const needsAnimation = Math.abs(currentY - finalPixelPos) > 1;

      if (needsAnimation) {
        // Animate from either offscreen or current position
        symbol.setVisible(true); // Ensure visible before animation

        if (this.cascadeTimeline) {
          this.cascadeTimeline.fromTo(
            symbol,
            {
              y: currentY <= finalPixelPos ? currentY : -this.cellHeight,
            },
            {
              y: finalPixelPos,
              duration: cascadeDuration,
              ease: cascadeEasing,
            },
            (this.symbolList.length - i) * cascadeStagger
          );
        }
      } else {
        // No animation needed; just place it immediately
        symbol.setPos(0, finalPixelPos);
        symbol.setVisible(true);
      }
    });

    this.cascadeTimeline.call(() => {
      // Return removed symbols to the pool after new symbols are in place.
      this.returnSelectedSymbolsToPool(symbolsToRemoveFromStage);
      this.arrangeSymbols();
      this.events.emit(
        ReelEvent.REEL_CASCADE_COMPLETE,
        this,
        this.symbolList.slice(
          // Emit only the visible symbols.
          this.extraCount,
          this.extraCount + this.visibleCount
        )
      );
      // Call completion callback
      if (onComplete) onComplete();
    });
  }

  /**
   * Converts relative indices of winning symbols to actual indices in the symbolList.
   * @param indices - Relative indices of winning symbols (relative to visible symbols).
   * @returns Actual indices adjusted for extraCount.
   */
  public getActualSymbolIndices(indices: number[]): number[] {
    return indices.map((i) => i + this.extraCount);
  }

  public destroy(options?: DestroyOptions): void {
    // Reset all state flags
    this._isSpinning = false;
    this._isStopping = false;
    this._isForceStopped = false;
    this._isNudging = false;
    this._isCascading = false;
    this._isIdle = true;

    this.returnSelectedSymbolsToPool();
    super.destroy(options);
  }

  /**
   * Adds symbols to the current reel set list
   * @param symbolsToAdd - Array of symbol IDs to add
   * @param position - Position to insert symbols ('start', 'end', or specific index)
   */
  public addToReelSet(
    symbolsToAdd: string[],
    position: "start" | "end" | number = "end"
  ): void {
    if (!symbolsToAdd || symbolsToAdd.length === 0) {
      Logger.warn(
        `Reel ${this.reelIndex}: No symbols provided to add to reel set`
      );
      return;
    }

    Logger.log(
      `Reel ${this.reelIndex}: Adding ${symbolsToAdd.length} symbols to reel set at position: ${position}`
    );

    // Determine insertion index
    let insertIndex: number;
    if (position === "start") {
      insertIndex = 0;
    } else if (position === "end") {
      insertIndex = this.reelSetList.length;
    } else if (typeof position === "number") {
      insertIndex = Math.max(0, Math.min(position, this.reelSetList.length));
    } else {
      Logger.error(
        `Reel ${this.reelIndex}: Invalid position type: ${position}`
      );
      return;
    }

    // Insert symbols at the specified position
    this.reelSetList.splice(insertIndex, 0, ...symbolsToAdd);

    Logger.log(
      `Reel ${this.reelIndex}: Successfully added symbols. New reel set length: ${this.reelSetList.length}`
    );
  }

  /**
   * Removes symbols from the current reel set list
   * @param symbolsToRemove - Array of symbol IDs to remove (removes all occurrences)
   * @param removeCount - Number of occurrences to remove per symbol (default: all)
   */
  public removeFromReelSet(
    symbolsToRemove: string[],
    removeCount: number = 0
  ): void {
    if (!symbolsToRemove || symbolsToRemove.length === 0) {
      Logger.warn(
        `Reel ${this.reelIndex}: No symbols provided to remove from reel set`
      );
      return;
    }

    Logger.log(
      `Reel ${
        this.reelIndex
      }: Removing symbols from reel set: ${symbolsToRemove.join(", ")}`
    );

    const originalLength = this.reelSetList.length;

    symbolsToRemove.forEach((symbolId) => {
      let removedCount = 0;
      const maxToRemove = removeCount === 0 ? Infinity : removeCount;

      for (
        let i = this.reelSetList.length - 1;
        i >= 0 && removedCount < maxToRemove;
        i--
      ) {
        if (this.reelSetList[i] === symbolId) {
          this.reelSetList.splice(i, 1);
          removedCount++;
        }
      }

      if (removedCount > 0) {
        Logger.log(
          `Reel ${this.reelIndex}: Removed ${removedCount} occurrences of symbol '${symbolId}'`
        );
      }
    });

    Logger.log(
      `Reel ${this.reelIndex}: Reel set length changed from ${originalLength} to ${this.reelSetList.length}`
    );
  }
}
