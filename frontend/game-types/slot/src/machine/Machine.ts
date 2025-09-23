import { Engine, Logger } from "game-engine";
import { Container, EventEmitter, Graphics } from "pixi.js";
import { MachineEvent, MachineEvents, ReelEvent } from "../events";
import {
  AdrenalineSpinConfig,
  CascadeRunnerOptions,
  ICascadeConfigs,
  IMachine,
  MachineOptions,
  MachineSpinParams,
  MachineStopParams,
  NudgeRunnerOptions,
  ReelClassConstructor,
  ReelOptions,
} from "../interfaces";
import { AbstractReel, FallReel, IndividualReel, NormalReel } from "../reels";
import { SymbolPool } from "../utils/SymbolPool";
import { SlotSymbol } from "../SlotSymbol";

export class Machine extends Container implements IMachine {
  public events: EventEmitter<MachineEvents> =
    new EventEmitter<MachineEvents>();
  public reels: AbstractReel[] = [];
  public reelSpinDelay!: number;
  public reelStopDelay!: number;
  public defaultReelSet: string[] = [];
  private _reelsByIndex: Map<number, AbstractReel> = new Map();
  private _machineCfg!: MachineOptions["machineConfig"];
  private _globalSymbolCfg!: MachineOptions["symbolConfig"];
  private _symbolPoolInstance!: SymbolPool;
  private _defaultAdrenalineSpinConfig?: AdrenalineSpinConfig;
  private _defaultSpinParams!: MachineSpinParams;
  private _defaultStopParams!: MachineStopParams;
  private _defaultShuffleReels!: boolean;
  private _defaultReelLength!: number;
  private _maskObject: Container | null = null;
  private _showMask: boolean = false;
  private _showExcess: boolean = false;
  private _isIdle: boolean = true;
  private _isSpinning: boolean = false;
  // Flag indicating whether the machine is waiting for server response to provide stop positions
  private _isWaitingForStopData: boolean = false;
  // Flag indicating whether a force stop has been requested for the current spin
  private _isForceStopped: boolean = false;
  // Counter tracking how many reels still need to stop
  private _reelsExpectedToStop: number = 0;
  // Nudge and cascade state tracking
  private _isNudging: boolean = false;
  private _isCascading: boolean = false;

  // Parameters for stopping the reels, including final symbol positions
  private _pendingStopParams: MachineStopParams | null = null;

  // Timers for individual reel stops
  private _activeReelStopTimers: Map<number, NodeJS.Timeout> = new Map();

  /**
   * Creates a new slot machine instance
   * @param options - Configuration options for the machine
   */
  constructor(options: MachineOptions) {
    super();

    // Initialize machine configuration using shared method
    this._updateMachineConfiguration(options);

    // Create initial reels with configuration
    this._createReelsFromConfiguration(options);

    // Arrange reels
    this.arrangeReels();

    // Add reels to display
    this.reels.forEach((reel) => this.addChild(reel as any));

    // Setup mask using shared method
    this._updateMask(options.machineConfig);

    this.showMask(false);
    this.showExcessSymbols(false);

    Logger.log("Machine created.");
  }

  // PROBLEM #2 FIX: Common validation utility
  private _validateMachineState(operation: string): void {
    if (!this._isIdle) {
      const error = `Cannot ${operation} while machine is not idle. Current state: spinning=${this._isSpinning}, nudging=${this._isNudging}, cascading=${this._isCascading}`;
      Logger.warn(error);
      throw new Error(error);
    }
  }

  private createReelFromConfig(
    config: MachineOptions["reelConfig"][number],
    reelIndex: number
  ): AbstractReel | null {
    const reelSpecificOptions = config.options || {};
    const effectiveSymbolConfigForReel =
      reelSpecificOptions.symbolConfig || this._globalSymbolCfg;
    const reelSetDefinition = reelSpecificOptions.reelSet;
    const adrenalineConfig =
      reelSpecificOptions.adrenalineSpinConfig ||
      this._defaultAdrenalineSpinConfig;

    const reelOptions: ReelOptions = {
      ...reelSpecificOptions,
      reelIndex: reelIndex,
      cellHeight: reelSpecificOptions.cellHeight ?? this._machineCfg.cellHeight,
      cellWidth: reelSpecificOptions.cellWidth ?? this._machineCfg.cellWidth,
      visibleCount:
        reelSpecificOptions.visibleCount ?? this._machineCfg.visibleCount,
      reelSet: reelSetDefinition,
      symbolConfig: effectiveSymbolConfigForReel,
      adrenalineSpinConfig: adrenalineConfig,
      extraCount: reelSpecificOptions.extraCount ?? 1,
      direction: reelSpecificOptions.direction ?? "down",
      initialSymbols: reelSpecificOptions.initialSymbols,
      shuffle: reelSpecificOptions.shuffle ?? this._defaultShuffleReels,
    };

    let ReelClassToUse: ReelClassConstructor;
    switch (config.type) {
      case "normal":
        ReelClassToUse = NormalReel;
        break;
      case "individual":
        ReelClassToUse = IndividualReel as unknown as ReelClassConstructor;
        break;
      case "fall":
        ReelClassToUse = FallReel;
        break;
      default:
        Logger.warn(
          `Unknown reel type: ${config.type}. Defaulting to NormalReel.`
        );
        if (typeof config.type !== "string") {
          ReelClassToUse = config.type;
        } else {
          ReelClassToUse = NormalReel;
        }
        break;
    }

    try {
      return new ReelClassToUse(
        reelOptions,
        this._symbolPoolInstance,
        this._defaultReelLength
      );
    } catch (error) {
      Logger.error(
        `Failed to create reel of type ${config.type} with index ${reelIndex}:`,
        error
      );
      return null;
    }
  }

  public addReel(
    reelConfigOrInstance: AbstractReel | MachineOptions["reelConfig"][number],
    atIndex?: number
  ): AbstractReel | null {
    // PROBLEM #2 FIX: Use common validation
    try {
      this._validateMachineState("add reel");
    } catch (error) {
      Logger.warn("Add reel request ignored:", (error as Error).message);
      return null;
    }

    let newReelInstance: AbstractReel | null = null;
    const targetArrayIndex =
      atIndex !== undefined && atIndex >= 0 && atIndex <= this.reels.length
        ? atIndex
        : this.reels.length;

    const newReelLogicalIndex = targetArrayIndex;

    if (reelConfigOrInstance instanceof AbstractReel) {
      newReelInstance = reelConfigOrInstance;
      newReelInstance.reelIndex = newReelLogicalIndex;
    } else {
      newReelInstance = this.createReelFromConfig(
        reelConfigOrInstance,
        newReelLogicalIndex
      );
    }

    if (newReelInstance) {
      this.reels.splice(targetArrayIndex, 0, newReelInstance);
      newReelInstance.events.on(
        ReelEvent.REEL_STOP_COMPLETE,
        this._handleReelStop,
        this
      );

      // PROBLEM #4 FIX: Update indices for all affected reels and rebuild map
      this._reelsByIndex.clear();
      for (let i = targetArrayIndex + 1; i < this.reels.length; i++) {
        this.reels[i].reelIndex = i;
      }
      // Rebuild the map with updated indices
      this.reels.forEach((reel) => {
        this._reelsByIndex.set(reel.reelIndex, reel);
      });

      this.addChild(newReelInstance as any);

      // PROBLEM #6 FIX: Use incremental positioning instead of full arrangeReels
      this._repositionReelsFromIndex(targetArrayIndex);

      this.events.emit(
        MachineEvent.MACHINE_REEL_ADDED,
        this,
        newReelInstance,
        this.reels.length
      );
      Logger.log(
        `Reel ${newReelInstance.reelIndex} added. New reel count: ${this.reels.length}`
      );
    }
    return newReelInstance;
  }

  public removeReel(reelArrayIndexToRemove: number): AbstractReel | null {
    // PROBLEM #2 FIX: Use common validation
    try {
      this._validateMachineState("remove reel");
    } catch (error) {
      Logger.warn("Remove reel request ignored:", (error as Error).message);
      return null;
    }

    if (
      reelArrayIndexToRemove < 0 ||
      reelArrayIndexToRemove >= this.reels.length
    ) {
      Logger.warn(
        `Cannot remove reel. Array index ${reelArrayIndexToRemove} is out of bounds.`
      );
      return null;
    }

    const removedReel = this.reels.splice(reelArrayIndexToRemove, 1)[0];

    if (removedReel) {
      removedReel.off(ReelEvent.REEL_STOP_COMPLETE, this._handleReelStop, this);
      this.removeChild(removedReel as any);
      removedReel.destroy();

      // PROBLEM #4 FIX: Update indices for remaining reels and rebuild map
      this._reelsByIndex.clear();
      for (let i = reelArrayIndexToRemove; i < this.reels.length; i++) {
        this.reels[i].reelIndex = i;
      }
      // Rebuild the map with updated indices
      this.reels.forEach((reel) => {
        this._reelsByIndex.set(reel.reelIndex, reel);
      });

      // PROBLEM #6 FIX: Use incremental positioning instead of full arrangeReels
      this._repositionReelsFromIndex(reelArrayIndexToRemove);

      this.events.emit(
        MachineEvent.MACHINE_REEL_REMOVED,
        this,
        removedReel.reelIndex,
        this.reels.length
      );
      Logger.log(
        `Reel with logical index ${removedReel.reelIndex} removed. New reel count: ${this.reels.length}`
      );
      return removedReel;
    }
    return null;
  }

  private arrangeReels(): void {
    // PROBLEM #6 FIX: Optimized to avoid unnecessary operations
    if (this.reels.length === 0) {
      return;
    }

    this.reels.sort((a, b) => a.reelIndex - b.reelIndex);

    // Position all reels efficiently using our new method
    this._repositionReelsFromIndex(0);
  }
  refresh(symbols: string[][]): void {
    if (!this._isIdle) {
      Logger.warn("Machine is not idle. Refresh request ignored.");
      return;
    }
    // PROBLEM #2 FIX: Use common validation
    try {
      this._validateMachineState("refresh reels");
    } catch (error) {
      Logger.warn("Refresh request ignored:", (error as Error).message);
      return;
    }

    if (this.reels.length === 0) {
      Logger.warn("No reels to refresh.");
      return;
    }
    this.arrangeReels();
    this.reels.forEach((reel) => {
      reel.refresh(
        symbols[reel.reelIndex] || symbols[this.reels.indexOf(reel)]
      );
    });
    this.showExcessSymbols(false);
  }
  public spinMachine(
    spinParams?: MachineSpinParams,
    isAdrenalineSpin: boolean = false
  ): void {
    if (!this._isIdle) {
      Logger.warn("Machine is not idle. Spin request ignored.");
      return;
    }

    this._isIdle = false;
    this._isSpinning = true;
    this._isWaitingForStopData = true;
    this._reelsExpectedToStop = this.reels.length;
    this._isForceStopped = false; // Reset force stop flag at the start of a new spin
    this._pendingStopParams = null;

    this.events.emit(MachineEvent.MACHINE_SPIN_REQUESTED, this);
    Logger.log(
      `Machine spin started. Expecting ${this._reelsExpectedToStop} reels to spin.`
    );

    if (this.reels.length === 0) {
      Logger.log("No reels to spin.");
      this._tryFinalizeSpinCycle();
      return;
    }

    this.showMask(true);
    let delay = 0;
    const reelSpinDelay = spinParams?.reelSpinDelay ?? this.reelSpinDelay;
    this.reels.forEach((reel, index) => {
      setTimeout(async () => {
        if (!this._isSpinning) {
          return;
        }
        try {
          Logger.log(`Machine: Initiating spin for reel ${reel.reelIndex}`);
          await reel.spinReel(
            { ...this._defaultSpinParams, ...spinParams },
            isAdrenalineSpin
          );
          if (index === this.reels.length - 1) {
            this.events.emit(MachineEvent.MACHINE_REELS_SPINNING, this);
          }
        } catch (error) {
          Logger.error(`Reel ${reel.reelIndex} failed to start spin:`, error);
          this._handleReelSpinOrStopError(reel, "spin");
        }
      }, delay);
      delay += reelSpinDelay * 1000; // Convert to milliseconds
    });
  }

  public provideStopData(stopParams: MachineStopParams): void {
    if (!this._isSpinning) {
      Logger.warn("Machine is not spinning. Cannot provide stop data.");
      return;
    }
    if (!this._isWaitingForStopData) {
      Logger.warn(
        "Machine is not waiting for stop data (already provided or spin ended prematurely)."
      );
      return;
    }

    stopParams = { ...this._defaultStopParams, ...stopParams };
    this._pendingStopParams = stopParams;
    this._isWaitingForStopData = false;
    Logger.log("Machine received stop data. Proceeding to stop reels.");

    // PROBLEM #3 FIX: Check force stop status before timer operations
    const isForceStopping = this._isForceStopped;
    if (isForceStopping) {
      Logger.log(
        "Force stop is active. Stopping reels immediately and simultaneously."
      );
    }

    // PROBLEM #5 FIX: Simplified timer cleanup using only Map
    this._activeReelStopTimers.forEach((timerId) => {
      clearTimeout(timerId);
    });
    this._activeReelStopTimers.clear();

    if (this.reels.length === 0) {
      this._tryFinalizeSpinCycle();
      return;
    }

    this.events.emit(MachineEvent.MACHINE_REEL_STOP_INITIATED, this);
    let cumulativeDelay = 0;
    const reelStopDelay = stopParams.reelStopDelay ?? this.reelStopDelay;
    this.reels.forEach((reel) => {
      // PROBLEM #3 FIX: Use captured force stop state for consistent timing
      const individualReelEffectiveDelay = isForceStopping
        ? 0
        : cumulativeDelay;

      const timerId = setTimeout(async () => {
        const reelSpecificLandingSymbols =
          this._pendingStopParams?.landingSymbols[reel.reelIndex] ||
          this._pendingStopParams?.landingSymbols[this.reels.indexOf(reel)];

        if (reelSpecificLandingSymbols) {
          try {
            const params = {
              ...this._pendingStopParams, // Use the stored _pendingStopParams
              landingSymbols: reelSpecificLandingSymbols,
              // PROBLEM #3 FIX: Use captured force stop state for consistent parameters
              stopDuration: isForceStopping ? 0.1 : stopParams.stopDuration,
              stopEase: isForceStopping ? "none" : stopParams.stopEase,
            };
            if (isForceStopping) {
              reel.forceStop();
            }
            await reel.stopReel(params);
            this._activeReelStopTimers.delete(reel.reelIndex);
            this.events.emit(MachineEvent.MACHINE_REEL_STOPPED, reel, this);
          } catch (error) {
            Logger.error(`Reel ${reel.reelIndex} failed to stop:`, error);
            this._handleReelSpinOrStopError(reel, "stop");
          }
        } else {
          Logger.warn(
            `No stop data provided for reel ${reel.reelIndex}. It may stop naturally or cause issues.`
          );
          this._handleReelSpinOrStopError(reel, "stop_data_missing");
        }
      }, individualReelEffectiveDelay);
      this._activeReelStopTimers.set(reel.reelIndex, timerId);

      // Only increment cumulativeDelay if not force stopping, to achieve staggered stops.
      // PROBLEM #3 FIX: Use captured force stop state for consistent delay calculation
      if (!isForceStopping) {
        cumulativeDelay += reelStopDelay * 1000; // Convert to milliseconds
      }
    });
    this._tryFinalizeSpinCycle();
  }

  /**
   * Initiates a force stop of the machine.
   * If stop data has not yet been received, it flags the machine to stop reels immediately once data arrives.
   * If stop data has been received and reels are stopping with delays, it cancels those delays and stops all reels simultaneously.
   */
  public forceStop(): void {
    if (!this._isSpinning) {
      Logger.warn("Machine is not spinning. Force stop request ignored.");
      return;
    }

    if (this._isForceStopped) {
      Logger.log("Machine is already force stopping.");
      return;
    }

    // PROBLEM #3 FIX: Set force stop flag immediately to prevent race condition
    this._isForceStopped = true;
    Logger.log("Force stop triggered and flag set immediately.");

    // Emit force stop event
    this.events.emit(MachineEvent.MACHINE_FORCE_STOP_REQUESTED, this);

    // If stop data has already been provided and reels are in the process of stopping (possibly with delays)
    if (
      !this._isWaitingForStopData &&
      this._pendingStopParams &&
      this._activeReelStopTimers.size > 1
    ) {
      Logger.log(
        "Stop data available. Forcing all remaining reels to stop immediately."
      );

      // PROBLEM #3 FIX: Process all pending timers immediately in force stop scenario
      this._activeReelStopTimers.forEach((timeId) => {
        clearTimeout(timeId);
      });
      this._activeReelStopTimers.clear();

      this.reels.forEach((reel) => {
        // We assume AbstractReel's stopReel method can handle being called to expedite
        // an ongoing stop or is idempotent if the reel has already fully stopped.
        // It should only emit REEL_STOP_COMPLETE once per spin cycle for that reel.
        const reelSpecificLandingSymbols =
          this._pendingStopParams!.landingSymbols[reel.reelIndex] ||
          this._pendingStopParams!.landingSymbols[this.reels.indexOf(reel)];

        if (reelSpecificLandingSymbols) {
          try {
            Logger.log(
              `Force stopping reel ${reel.reelIndex} immediately (override).`
            );
            reel.forceStop();
            if (!reel.isStopping) {
              reel.stopReel({
                ...this._pendingStopParams,
                landingSymbols: reelSpecificLandingSymbols,
                stopDuration: 0.1, // Very fast
                stopEase: "none",
              });
              this.events.emit(MachineEvent.MACHINE_REEL_STOPPED, reel, this);
            } else if (
              reel.spinTimeline &&
              reel.spinTimeline.isActive() &&
              reel.spinTimeline.progress() < 0.8
            ) {
              reel.spinTimeline.progress(0.8);
            }
          } catch (error) {
            Logger.error(
              `Reel ${reel.reelIndex} failed to force stop (override):`,
              error
            );
            // Rely on existing error handling or _handleReelSpinOrStopError if needed
          }
        } else {
          Logger.warn(
            `No stop data for reel ${reel.reelIndex} during force stop. It may not stop correctly.`
          );
          // This case implies _pendingStopParams might be malformed or reelIndex is off.
          // Consider if _handleReelSpinOrStopError is appropriate here.
        }
      });
      // PROBLEM #5 FIX: Removed duplicate timer cleanup (only using Map now)
    } else if (this._isWaitingForStopData) {
      // PROBLEM #3 FIX: Immediately force stop all reels if still waiting for stop data
      Logger.log(
        "Still waiting for stop data. Force stopping all reels immediately."
      );
      this.reels.forEach((reel) => {
        reel.forceStop();
      });
    }
  }

  private _handleReelStop(): void {
    if (!this._isSpinning) {
      return;
    }

    this._reelsExpectedToStop = Math.max(0, this._reelsExpectedToStop - 1);
    Logger.log(
      `Reel stopped. Reels remaining to stop: ${this._reelsExpectedToStop}`
    );
    this._tryFinalizeSpinCycle();
  }

  private _handleReelSpinOrStopError(
    reel: AbstractReel,
    phase: "spin" | "stop" | "stop_data_missing"
  ): void {
    if (!this._isSpinning) {
      return;
    }
    Logger.warn(`Error during ${phase} phase for reel ${reel.reelIndex}.`);
    this._reelsExpectedToStop = Math.max(0, this._reelsExpectedToStop - 1);
    this._tryFinalizeSpinCycle();
  }

  private _tryFinalizeSpinCycle(): void {
    if (
      this._isSpinning &&
      this._reelsExpectedToStop === 0 &&
      !this._isWaitingForStopData
    ) {
      this._performFinalizeSpinCycle();
    } else if (
      this._isSpinning &&
      this._reelsExpectedToStop === 0 &&
      this._isWaitingForStopData
    ) {
      Logger.log(
        "All reels have stopped/failed, but still waiting for stop data to formally finalize."
      );
    }
  }

  private _performFinalizeSpinCycle(): void {
    if (!this._isSpinning && this._isIdle) {
      return;
    }

    Logger.log("Finalizing spin cycle.");
    this._isSpinning = false;
    this._isIdle = true;
    this._isWaitingForStopData = false;
    // this._isForceStopped remains true until next spin, or could be reset here if desired.
    // Current logic resets it at spinMachine, which is fine.
    // PROBLEM #5 FIX: Simplified timer cleanup using only Map
    this._activeReelStopTimers.forEach((timerId) => {
      clearTimeout(timerId);
    });
    this._activeReelStopTimers.clear();

    this.events.emit(
      MachineEvent.MACHINE_ALL_REELS_STOPPED,
      this,
      this._pendingStopParams?.landingSymbols || []
    );
    this._pendingStopParams = null;
    Logger.log("Machine spin cycle complete. Machine is now idle.");
    this.showMask(false);
  }

  /**
   * Triggers a nudge on the specified reel.
   * This method is a placeholder and should be implemented in the specific reel classes.
   * @param reelIndex - The index of the reel to nudge.
   * @param nudgeDirection - The direction of the nudge (up, down, left, right).
   * @param newSymbolId - The ID of the new symbol to apply after the nudge.
   */
  public async triggerNudgeOnReel(
    reelIndex: number,
    newSymbolId: string,
    nudgeDirection: "up" | "down" = "down"
  ): Promise<void> {
    // PROBLEM #2 FIX: Use common validation and state management
    this._validateMachineState("trigger nudge");

    // Emit nudge start event
    this.events.emit(
      MachineEvent.MACHINE_NUDGE_START,
      this,
      reelIndex,
      nudgeDirection,
      newSymbolId
    );

    try {
      await this._triggerNudgeOnReelInternal(
        reelIndex,
        newSymbolId,
        nudgeDirection
      );
      // Emit nudge complete event
      this.events.emit(MachineEvent.MACHINE_NUDGE_COMPLETE, this);
    } catch (error) {
      Logger.error(`Machine: Error during nudge on reel ${reelIndex}:`, error);
      throw error;
    } finally {
      // STATE MANAGEMENT: Restore idle state after nudge processing
      this._isIdle = true;
      this._isNudging = false;
      Logger.log("Machine returned to idle state after nudge processing.");
    }
  }

  /**
   * Internal nudge method without state validation - used by multiple nudges
   * @private
   */
  private async _triggerNudgeOnReelInternal(
    reelIndex: number,
    newSymbolId: string,
    nudgeDirection: "up" | "down" = "down"
  ): Promise<void> {
    const reel = this.reels.find((r) => r.reelIndex === reelIndex);

    if (!reel) {
      Logger.warn(`Machine: Reel ${reelIndex} not found for nudge.`);
      throw new Error(`Reel ${reelIndex} not found for nudge.`);
    }

    // STATE MANAGEMENT: Set machine as not idle during nudge processing
    this._isIdle = false;
    this._isNudging = true;

    Logger.log(
      `Machine: Starting nudge on reel ${reelIndex} in direction ${nudgeDirection} with symbol ${newSymbolId}`
    );

    try {
      await reel.nudge(newSymbolId, nudgeDirection);
      Logger.log(`Machine: Nudge completed on reel ${reelIndex}`);
    } catch (error) {
      Logger.error(`Machine: Error during nudge on reel ${reelIndex}:`, error);
      throw error;
    } finally {
      // STATE MANAGEMENT: Restore idle state after nudge processing
      this._isNudging = false;
      this._isIdle = true;
      Logger.log("Machine returned to idle state after nudge processing.");
    }
  }

  /**
   * Triggers multiple nudges with specified options (sequential or parallel)
   * @param nudgeData - Array of nudge data for each reel
   * @param nudgeOptions - Options for how to execute nudges (sequential/parallel)
   */
  public async triggerMultipleReelNudges(
    nudgeData: Array<{
      index: number;
      symbol: string;
      direction?: "up" | "down";
    }>,
    nudgeOptions: NudgeRunnerOptions = { sequential: false }
  ): Promise<void> {
    // PROBLEM #2 FIX: Use common validation
    this._validateMachineState("trigger multiple nudges");

    if (!nudgeData || nudgeData.length === 0) {
      Logger.log("No nudge data provided for multiple nudges.");
      return;
    }

    const sequential = nudgeOptions.sequential ?? false;
    const delayBetweenNudges = nudgeOptions.delayBetweenReels ?? 0;

    // STATE MANAGEMENT: Set machine as not idle during multiple nudges processing
    this._isIdle = false;
    this._isNudging = true;

    Logger.log(
      `Triggering ${nudgeData.length} nudges in ${
        sequential ? "sequential" : "parallel"
      } mode`
    );

    // Emit nudge start event
    this.events.emit(MachineEvent.MACHINE_NUDGE_START, this);

    try {
      if (sequential) {
        // Execute nudges one by one
        for (let i = 0; i < nudgeData.length; i++) {
          const nudge = nudgeData[i];

          Logger.log(
            `Executing nudge ${i + 1}/${nudgeData.length} on reel ${
              nudge.index
            }`
          );

          await this._triggerNudgeOnReelInternal(
            nudge.index,
            nudge.symbol,
            nudge.direction || "down"
          );

          // Add delay between nudges if specified and not the last nudge
          if (delayBetweenNudges > 0 && i < nudgeData.length - 1) {
            await new Promise((resolve) =>
              setTimeout(resolve, delayBetweenNudges * 1000)
            );
          }
        }
      } else {
        // Execute nudges in parallel with optional delays
        const nudgePromises = nudgeData.map((nudge, index) => {
          const delay = delayBetweenNudges * index * 1000; // Convert to milliseconds

          return new Promise<void>((resolve, reject) => {
            setTimeout(async () => {
              try {
                Logger.log(
                  `Executing parallel nudge ${index + 1}/${
                    nudgeData.length
                  } on reel ${nudge.index}`
                );

                await this._triggerNudgeOnReelInternal(
                  nudge.index,
                  nudge.symbol,
                  nudge.direction || "down"
                );

                resolve();
              } catch (error) {
                reject(error);
              }
            }, delay);
          });
        });

        // Wait for all nudges to complete
        await Promise.all(nudgePromises);
      }

      this.events.emit(MachineEvent.MACHINE_NUDGE_COMPLETE, this);
      Logger.log("All nudges completed successfully");
    } catch (error) {
      Logger.error("Error during multiple nudges:", error);
      throw error;
    } finally {
      // STATE MANAGEMENT: Restore idle state after multiple nudges processing
      this._isNudging = false;
      this._isIdle = true;
      Logger.log(
        "Machine returned to idle state after multiple nudges processing."
      );
    }
  }

  /**
   * Triggers a cascade on the specified reel
   * @param reelIndex - The index of the reel to cascade
   * @param extract - The indices of the winning symbols on the reel
   * @param insert - The IDs of the new symbols to apply in the cascade
   */
  public async triggerCascadeOnReel(
    reelIndex: number,
    extract: number[],
    insert: string[],
    animationName?: string,
    cascadeConfigs?: ICascadeConfigs
  ): Promise<void> {
    // PROBLEM #2 FIX: Use common validation and state management
    this._validateMachineState("trigger cascade");

    // Emit cascade start event
    this.events.emit(
      MachineEvent.MACHINE_CASCADE_START,
      this,
      reelIndex,
      extract,
      insert
    );

    this.showMask(true);

    try {
      await this._triggerCascadeOnReelInternal(
        reelIndex,
        extract,
        insert,
        animationName,
        cascadeConfigs
      );
      // Emit cascade complete event for multiple cascades
      this.events.emit(MachineEvent.MACHINE_CASCADE_COMPLETE, this);
    } catch (error) {
      Logger.error(
        `Machine: Error during cascade on reel ${reelIndex}:`,
        error
      );
      throw error;
    } finally {
      // STATE MANAGEMENT: Restore idle state after cascade processing
      this._isIdle = true;
      this.showMask(false);
      Logger.log("Machine returned to idle state after cascade processing.");
    }
  }

  /**
   * Internal cascade method without state validation - used by multiple cascades
   * @private
   */
  private async _triggerCascadeOnReelInternal(
    reelIndex: number,
    extract: number[],
    insert: string[],
    animationName?: string,
    cascadeConfigs?: ICascadeConfigs
  ): Promise<void> {
    const reel = this._reelsByIndex.get(reelIndex);

    if (!reel) {
      Logger.warn(`Machine: Reel ${reelIndex} not found for cascade.`);
      throw new Error(`Reel ${reelIndex} not found for cascade.`);
    }

    // STATE MANAGEMENT: Set machine as not idle during cascade processing
    this._isIdle = false;
    this._isCascading = true;

    Logger.log(
      `Machine: Starting cascade on reel ${reelIndex} with ${extract.length} winning symbols`
    );

    try {
      await reel.cascade(extract, insert, animationName, cascadeConfigs);
      Logger.log(`Machine: Cascade completed on reel ${reelIndex}`);
    } catch (error) {
      Logger.error(
        `Machine: Error during cascade on reel ${reelIndex}:`,
        error
      );
      throw error;
    } finally {
      // STATE MANAGEMENT: Restore idle state after cascade processing
      this._isCascading = false;
      this._isIdle = true;
      Logger.log("Machine returned to idle state after cascade processing.");
    }
  }

  /**
   * Triggers multiple cascades with specified options (sequential or parallel)
   * @param cascadeData - Array of cascade data for each reel
   * @param cascadeOptions - Options for how to execute cascades (sequential/parallel)
   */
  public async triggerMultipleCascades(
    cascadeData: {
      [reelIndex: number]: {
        extract: number[]; // Positions to remove symbols
        insert: string[]; // New symbols to insert
      };
    },
    cascadeOptions: CascadeRunnerOptions = { sequential: false },
    animationName?: string // Optional animation name for the cascade
  ): Promise<void> {
    // PROBLEM #2 FIX: Use common validation
    this._validateMachineState("trigger multiple cascades");

    if (!cascadeData || Object.keys(cascadeData).length === 0) {
      Logger.log("No cascade data provided for multiple cascades.");
      return;
    }

    const sequential = cascadeOptions.sequential ?? false;
    const delayBetweenCascades = cascadeOptions.delayBetweenReels ?? 0;

    // STATE MANAGEMENT: Set machine as not idle during multiple cascades processing
    this._isIdle = false;
    this._isCascading = true;
    const targetReels: string[] = Object.keys(cascadeData);

    Logger.log(
      `Triggering ${targetReels.length} cascades in ${
        sequential ? "sequential" : "parallel"
      } mode`
    );

    this.events.emit(MachineEvent.MACHINE_CASCADE_START, this);

    this.showMask(true);
    try {
      if (sequential) {
        // Execute cascades one by one
        for (let i = 0; i < targetReels.length; i++) {
          const reelIndex = parseInt(targetReels[i], 10);
          const cascade = cascadeData[reelIndex];

          Logger.log(
            `Executing cascade ${i + 1}/${
              targetReels.length
            } on reel ${reelIndex}`
          );

          await this._triggerCascadeOnReelInternal(
            reelIndex,
            cascade.extract,
            cascade.insert,
            animationName,
            cascadeOptions?.configs
          );

          // Add delay between cascades if specified and not the last cascade
          if (delayBetweenCascades > 0 && i < targetReels.length - 1) {
            await new Promise((resolve) =>
              setTimeout(resolve, delayBetweenCascades * 1000)
            );
          }
        }
      } else {
        // Execute cascades in parallel with optional delays
        const cascadePromises = targetReels.map((rIndex, index) => {
          const delay = delayBetweenCascades * parseInt(rIndex, 10) * 1000; // Convert to milliseconds
          const reelIndex = parseInt(rIndex, 10);
          const cascade = cascadeData[reelIndex];

          return new Promise<void>((resolve, reject) => {
            setTimeout(async () => {
              try {
                Logger.log(
                  `Executing parallel cascade ${index + 1}/${
                    targetReels.length
                  } on reel ${reelIndex}`
                );

                await this._triggerCascadeOnReelInternal(
                  reelIndex,
                  cascade.extract,
                  cascade.insert,
                  animationName,
                  cascadeOptions?.configs
                );

                resolve();
              } catch (error) {
                reject(error);
              }
            }, delay);
          });
        });

        // Wait for all cascades to complete
        await Promise.all(cascadePromises);
      }

      this.events.emit(MachineEvent.MACHINE_CASCADE_COMPLETE, this);
      Logger.log("All cascades completed successfully");
    } catch (error) {
      Logger.error("Error during multiple cascades:", error);
      throw error;
    } finally {
      // STATE MANAGEMENT: Restore idle state after multiple cascades processing
      this._isCascading = false;
      this._isIdle = true;
      this.showMask(false);
      Logger.log(
        "Machine returned to idle state after multiple cascades processing."
      );
    }
  }

  public destroy(): void {
    Logger.log("Destroying machine...");
    this._isSpinning = false;
    this._isIdle = true;
    this._isWaitingForStopData = false;
    this._isForceStopped = false;
    this._isNudging = false;
    this._isCascading = false;
    // PROBLEM #5 FIX: Simplified timer cleanup using only Map
    this._activeReelStopTimers.forEach((timerId) => {
      clearTimeout(timerId);
    });
    this._activeReelStopTimers.clear();

    this.reels.forEach((reel) => {
      reel.off(ReelEvent.REEL_STOP_COMPLETE, this._handleReelStop, this);
      reel.destroy();
    });
    this.reels = [];

    // PROBLEM #4 FIX: Clear reel index map
    this._reelsByIndex.clear();

    if (this._symbolPoolInstance) {
      this._symbolPoolInstance.destroy();
    }

    super.destroy();
    Logger.log("Machine destroyed.");
  }

  // PROBLEM #6 FIX: Efficient repositioning for affected reels only
  private _repositionReelsFromIndex(startIndex: number): void {
    for (let i = startIndex; i < this.reels.length; i++) {
      this.reels[i].x =
        i * (this._machineCfg.cellWidth + this._machineCfg.reelSpacing);
      this.reels[i].y = 0;
    }
  }

  /**
   * Dynamically reconfigures the machine with new options without destroying the instance
   * @param newOptions - New machine configuration options
   * @param preserveReelStates - Whether to preserve current reel states when possible
   */
  public setOptions(
    newOptions: MachineOptions,
    preserveReelStates: boolean = false
  ): void {
    try {
      this._validateMachineState("reconfigure machine");
    } catch (error) {
      Logger.warn(
        "Machine reconfiguration request ignored:",
        (error as Error).message
      );
      return;
    }

    Logger.log("Machine: Starting dynamic reconfiguration...");

    // Store current reel states if preservation is requested
    const currentReelStates: string[][] = [];
    if (preserveReelStates) {
      this.reels.forEach((reel) => {
        // Get visible symbols by slicing the symbol list
        const visibleSymbols = reel.symbolList.slice(
          reel.extraCount,
          reel.extraCount + reel.visibleCount
        );
        const currentSymbols = visibleSymbols.map((symbol) => symbol.label);
        currentReelStates.push(currentSymbols);
      });
    }

    // Clear existing reels and their event listeners
    this._clearAllReels();

    // Update machine configuration
    this._updateMachineConfiguration(newOptions);

    // Create new reels with new configuration
    this._createReelsFromConfiguration(
      newOptions,
      preserveReelStates ? currentReelStates : undefined
    );

    // Re-arrange reels with new configuration
    this.arrangeReels();

    // Add reels to display
    this.reels.forEach((reel) => this.addChild(reel as any));

    // Update mask if needed
    this._updateMask(newOptions.machineConfig);

    Logger.log("Machine: Dynamic reconfiguration completed successfully");

    // Emit reconfiguration event
    this.events.emit(MachineEvent.MACHINE_RECONFIGURED, this, newOptions);
  }

  showMask(value: boolean) {
    value = this._showMask ? true : value;
    this.mask = value && this._maskObject ? this._maskObject : null;
    if (this._maskObject) {
      this._maskObject.visible = value;
    }
  }

  showReelMask(reelIndex: number, value: boolean) {
    const reel = this._reelsByIndex.get(reelIndex);
    if (reel && reel.showMask) {
      reel.showMask(value);
    }
  }

  showExcessSymbols(value: boolean) {
    value = this._showExcess ? true : value;
    this.reels.forEach((reel) => {
      if (reel.showExcessSymbols) {
        reel.showExcessSymbols(value);
      }
    });
  }

  /**
   * Clears all existing reels and their event listeners
   * @private
   */
  private _clearAllReels(): void {
    // Remove event listeners and clean up reels
    this.reels.forEach((reel) => {
      reel.events.off(ReelEvent.REEL_STOP_COMPLETE, this._handleReelStop, this);
      this.removeChild(reel as any);
      reel.destroy();
    });

    // Clear arrays and maps
    this.reels = [];
    this._reelsByIndex.clear();

    // Clear any active timers
    this._activeReelStopTimers.forEach((timerId) => clearTimeout(timerId));
    this._activeReelStopTimers.clear();
  }

  /**
   * Updates machine configuration properties
   * @private
   */
  private _updateMachineConfiguration(newOptions: MachineOptions): void {
    // Update machine configuration
    this._machineCfg = newOptions.machineConfig;

    // Update global symbol configuration
    this._globalSymbolCfg = newOptions.symbolConfig;

    // Update other machine properties
    this.reelSpinDelay = newOptions.machineConfig.reelSpinDelay ?? 0;
    this.reelStopDelay = newOptions.machineConfig.reelStopDelay ?? 0;

    // Update default reel set
    const defaultReelSet =
      newOptions.machineConfig.defaultReelSet ??
      Object.keys(this._globalSymbolCfg).length * 2;

    if (typeof defaultReelSet === "number") {
      const availableSymbolIds = Object.keys(this._globalSymbolCfg);
      if (availableSymbolIds.length === 0) {
        Logger.error(
          `Cannot generate random reelSet of length ${defaultReelSet} because symbolConfig is empty.`
        );
        this.defaultReelSet = Array(defaultReelSet).fill("DEFAULT_SYMBOL_ID");
      } else {
        this.defaultReelSet = [];
        for (let i = 0; i < defaultReelSet; i++) {
          const randomIndex = Math.floor(
            Math.random() * availableSymbolIds.length
          );
          this.defaultReelSet.push(availableSymbolIds[randomIndex]);
        }
      }
    } else if (!Array.isArray(defaultReelSet)) {
      Logger.warn(
        `Machine defaultReelSet should be an array or a number, got ${typeof defaultReelSet}. Using empty array.`
      );
      this.defaultReelSet = [];
    } else {
      this.defaultReelSet = defaultReelSet;
    }

    // Update default adrenaline spin config
    this._defaultAdrenalineSpinConfig =
      newOptions.machineConfig.defaultAdrenalineSpinConfig;

    this._defaultSpinParams = newOptions.machineConfig.defaultSpinParams ?? {};
    this._defaultStopParams = newOptions.machineConfig.defaultStopParams ?? {
      landingSymbols: [],
    };
    this._defaultShuffleReels =
      newOptions.machineConfig.defaultShuffleReels ?? true;

    // Update default reel length
    this._defaultReelLength =
      newOptions.machineConfig.defaultReelSetLength ?? 20;

    // Recreate symbol pool with new configuration
    const symbolFactory = SymbolPool.createSymbolFactory(this._globalSymbolCfg);
    this._symbolPoolInstance = new SymbolPool(
      symbolFactory,
      this._globalSymbolCfg
    );

    // Apply common properties from new options
    Engine.Utils.ApplyCommonProperties(this as any, newOptions);
  }

  /**
   * Creates reels from new configuration
   * @private
   */
  private _createReelsFromConfiguration(
    newOptions: MachineOptions,
    preservedStates?: string[][]
  ): void {
    const initialSymbols =
      preservedStates || newOptions.machineConfig.initialSymbols || [];
    const reelConfigs = newOptions.reelConfig || {};
    let totalReelCount = 0;
    reelConfigs.forEach((config) => {
      config.options = config.options || {};
      const size = config.count || 1;
      for (let i = 0; i < size; i++) {
        config.options.initialSymbols =
          initialSymbols[totalReelCount] || config.options.initialSymbols;
        if (config.options.reelSet === undefined) {
          config.options.reelSet = this.defaultReelSet;
        }
        // Create a new reel instance based on the configuration
        const newReel = this.createReelFromConfig(config, totalReelCount);
        if (newReel) {
          totalReelCount++;
          this.reels.push(newReel);
          // PROBLEM #4 FIX: Maintain reel index map for O(1) lookup
          this._reelsByIndex.set(newReel.reelIndex, newReel);
          newReel.events.on(
            ReelEvent.REEL_STOP_COMPLETE,
            this._handleReelStop,
            this
          );
        }
      }
    });
  }

  /**
   * Updates mask configuration
   * @private
   */
  private _updateMask(machineConfig: MachineOptions["machineConfig"]): void {
    // Remove existing mask if present
    if (this.mask) {
      this.removeChild(this.mask as any);
      (this.mask as any)?.destroy?.();
      this.mask = null;
      this._maskObject = null;
    }

    this._showMask = machineConfig.showMask ?? false;
    this._showExcess = machineConfig.showExcess ?? false;

    // Create new mask if needed
    if (machineConfig.useMask !== false) {
      const maskGraphic = new Graphics();
      const x = machineConfig.mask?.x ?? 0;
      const y = machineConfig.mask?.y ?? 0;
      if (!machineConfig.mask?.points) {
        const width =
          machineConfig.mask?.width ??
          this._machineCfg.cellWidth * this.reels.length;
        const height =
          machineConfig.mask?.height ??
          this._machineCfg.cellHeight * this._machineCfg.visibleCount;
        maskGraphic.rect(x, y, width, height);
      } else {
        const points = machineConfig.mask?.points ?? [];
        maskGraphic.poly(points);
        maskGraphic.position.set(x, y);
      }
      maskGraphic.fill(0xffffff);
      this._maskObject = maskGraphic;
      this.mask = this._maskObject;
      this.addChild(maskGraphic as any);
    }
  }
  // getter and setter
  get displaySymbols(): SlotSymbol[][] {
    const displaySymbols: SlotSymbol[][] = [];
    this.reels.forEach((reel) => {
      displaySymbols.push(reel.displaySymbols);
    });

    return displaySymbols;
  }
}
