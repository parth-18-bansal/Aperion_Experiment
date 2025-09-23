import type { FederatedPointerEvent } from "pixi.js"; // For FederatedPointerEvent
import type { Machine } from "./machine/Machine";
import type { AbstractReel } from "./reels/AbstractReel";
import type { SlotSymbol } from "./SlotSymbol";
import { MachineOptions } from "./interfaces";

export enum MachineEvent {
  MACHINE_SPIN_REQUESTED = "machine:spin:requested",
  MACHINE_REELS_SPINNING = "machine:reels:spinning",
  MACHINE_REEL_STOP_INITIATED = "machine:reel:stop:initiated",
  MACHINE_REEL_STOPPED = "machine:reel:stopped",
  MACHINE_ALL_REELS_STOPPED = "machine:all:reels:stopped",
  MACHINE_REEL_ADDED = "machine:reel:added",
  MACHINE_REEL_REMOVED = "machine:reel:removed",
  MACHINE_FORCE_STOP_REQUESTED = "machine:force:stop:requested",
  MACHINE_NUDGE_START = "machine:nudge:start",
  MACHINE_NUDGE_COMPLETE = "machine:nudge:complete",
  MACHINE_CASCADE_START = "machine:cascade:start",
  MACHINE_CASCADE_COMPLETE = "machine:cascade:complete",
  MACHINE_RECONFIGURED = "machine:reconfigured",
}

export interface MachineEvents {
  [MachineEvent.MACHINE_SPIN_REQUESTED]: [machine: Machine];
  [MachineEvent.MACHINE_REELS_SPINNING]: [machine: Machine];
  [MachineEvent.MACHINE_FORCE_STOP_REQUESTED]: [machine: Machine];
  [MachineEvent.MACHINE_REEL_STOP_INITIATED]: [machine: Machine];
  [MachineEvent.MACHINE_REEL_STOPPED]: [reel: AbstractReel, machine: Machine];
  [MachineEvent.MACHINE_ALL_REELS_STOPPED]: [
    machine: Machine,
    landedSymbolsPerReel: string[][]
  ];
  [MachineEvent.MACHINE_REEL_ADDED]: [
    machine: Machine,
    addedReel: AbstractReel,
    newReelCount: number
  ];
  [MachineEvent.MACHINE_REEL_REMOVED]: [
    machine: Machine,
    removedReelIndex: number,
    newReelCount: number
  ];
  [MachineEvent.MACHINE_NUDGE_START]: [
    machine: Machine,
    reelIndex?: number,
    direction?: "up" | "down",
    symbolId?: string
  ];
  [MachineEvent.MACHINE_NUDGE_COMPLETE]: [machine: Machine];
  [MachineEvent.MACHINE_CASCADE_START]: [
    machine: Machine,
    reelIndex?: number,
    winningSymbolIndices?: number[],
    newSymbolIds?: string[]
  ];
  [MachineEvent.MACHINE_CASCADE_COMPLETE]: [machine: Machine];
  [MachineEvent.MACHINE_RECONFIGURED]: [
    machine: Machine,
    newOptions: MachineOptions
  ];
}

export enum ReelEvent {
  REEL_SPIN_START = "reel:spin:start",
  REEL_STOP_START = "reel:stop:start",
  REEL_STOP_COMPLETE = "reel:stop:complete",
  REEL_LANDING = "reel:landing",
  REEL_NUDGE_START = "reel:nudge:start",
  REEL_NUDGE_COMPLETE = "reel:nudge:complete",
  REEL_CASCADE_START = "reel:cascade:start",
  REEL_CASCADE_COMPLETE = "reel:cascade:complete",
  REEL_ERROR = "reel:error",
}

/**
 * Interface defining all reel event types and their associated data
 * Provides type safety for event emitters and listeners
 */
export interface ReelEvents {
  /** Emitted when a reel starts spinning */
  [ReelEvent.REEL_SPIN_START]: [reel: AbstractReel];

  /** Emitted when a reel begins its stopping animation */
  [ReelEvent.REEL_STOP_START]: [reel: AbstractReel];

  /** Emitted when a reel has completely stopped, includes array of visible symbols */
  [ReelEvent.REEL_STOP_COMPLETE]: [
    reel: AbstractReel,
    landedSymbols: SlotSymbol[]
  ];

  /** Emitted when symbols have landed in their final positions */
  [ReelEvent.REEL_LANDING]: [reel: AbstractReel, landedSymbols: SlotSymbol[]];

  /** Emitted when a reel starts a nudge movement in the specified direction */
  [ReelEvent.REEL_NUDGE_START]: [reel: AbstractReel, direction: "up" | "down"];

  /** Emitted when a nudge movement completes */
  [ReelEvent.REEL_NUDGE_COMPLETE]: [reel: AbstractReel];

  /** Emitted when a cascade animation begins (for games with falling/cascading symbols) */
  [ReelEvent.REEL_CASCADE_START]: [
    reel: AbstractReel,
    winningSymbolIndices: number[],
    newSymbolIds: string[]
  ];

  /** Emitted when a cascade animation completes */
  [ReelEvent.REEL_CASCADE_COMPLETE]: [
    reel: AbstractReel,
    landedSymbols: SlotSymbol[]
  ];

  /** Emitted when a reel encounters an error during operation */
  [ReelEvent.REEL_ERROR]: [
    reel: AbstractReel,
    errorData: { message: string; originalError?: any }
  ];
}

/**
 * Enum defining all possible symbol events
 */
export enum SymbolEvent {
  /** Emitted when a symbol animation starts */
  ANIMATION_START = "symbol:animation:start",

  /** Emitted when a symbol animation completes */
  ANIMATION_COMPLETE = "symbol:animation:complete",

  /** Emitted when a symbol is clicked */
  CLICK = "symbol:click",

  /** Emitted when a symbol is being destroyed */
  DESTROY = "symbol:destroy",
}

/**
 * Interface defining all symbol event types and their associated data
 * Provides type safety for event emitters and listeners
 */
export interface SymbolEvents {
  /** Event data for animation start: symbol instance, animation name, and loop flag */
  [SymbolEvent.ANIMATION_START]: [
    symbol: SlotSymbol,
    animName: string,
    loop: boolean
  ];

  /** Event data for animation complete: symbol instance and animation name */
  [SymbolEvent.ANIMATION_COMPLETE]: [symbol: SlotSymbol, animName: string];

  /** Event data for symbol click: symbol instance and pointer event data */
  [SymbolEvent.CLICK]: [symbol: SlotSymbol, eventData: FederatedPointerEvent];

  /** Event data for symbol destruction: symbol instance */
  [SymbolEvent.DESTROY]: [symbol: SlotSymbol];
}
