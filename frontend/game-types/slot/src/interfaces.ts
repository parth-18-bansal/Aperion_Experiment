/* eslint-disable @typescript-eslint/no-empty-object-type */
import { Engine } from "game-engine";
import {
  AnimatedSpriteOptions,
  BlurFilterOptions,
  Container,
  ContainerOptions,
  EventEmitter,
  PointData,
  Sprite,
  SpriteOptions,
  Texture,
  ViewContainer,
} from "pixi.js";
import type { AbstractReel } from "./reels/AbstractReel";
import type { SymbolPool } from "./utils/SymbolPool";
import { MachineEvents } from "./events";
import {
  ActorRef,
  ActorRefFrom,
  AnyActorLogic,
  ContextFrom,
  EventFrom,
} from "xstate";
import type {
  GameEvent,
  GameLogicType,
  GameMachineType,
} from "./core/GameStates";
import { SlotSymbol } from "./SlotSymbol";

/**
 * Common interface for visual representations of slot symbols.
 * Defines the required methods for all symbol visual implementations.
 */
export interface ISymbolVisual {
  /**
   * The display object that will be rendered.
   * ViewContainer might be more appropriate than DisplayObject
   */
  displayObject: ViewContainer;
  cover?: Sprite;

  /**
   * Sets the position of the visual element.
   * @param x - X coordinate position
   * @param y - Y Coordinate position
   */
  setPos(x: number, y: number): void;

  /**
   * Sets the visibility of the visual element.
   * @param visible - Whether the visual should be visible
   */
  setVisible(visible: boolean): void;

  /**
   * Plays an animation on the visual element.
   * @param animName - Name of the animation to play
   * @param loop - Whether the animation should loop
   * @param onComplete - Optional callback when animation completes
   * @param animSpeed - Animation speed multiplier (optional, default: 1)
   */
  playAnim(
    animName: string,
    loop: boolean,
    onComplete?: () => void,
    animSpeed?: number
  ): void;

  /**
   * Stops the currently playing animation.
   */
  stopAnim(): void;

  /**
   * Cleans up resources used by the visual element.
   */
  destroy(): void;
}

/**
 * Slot sembolü oluşturulurken kullanılacak opsiyonlar.
 */
export interface SymbolOptions extends ContainerOptions {
  visualType?: "sprite" | "animatedSprite" | "spine";
  visualOptions?:
    | (Omit<SpriteOptions, "texture"> & { texture: string | Texture })
    | (Omit<AnimatedSpriteOptions, "textures"> & {
        textures: string[] | Texture[];
      })
    | Engine.SpineOptions;
  animations?: { [key: string]: string[] | Texture[] | string };
  symName?: string;
  description?: string;
  payouts?: { [count: string]: number };
  isWild?: boolean;
  isScatter?: boolean;
  isBonus?: boolean;
  [key: string]: unknown; // Diğer özel özellikler
}

export interface UISymbolOptions {
  texture: Texture;
  scale?: number;
}

/**
 * Adrenalin dönüşü için yapılandırma seçenekleri.
 */
export interface AdrenalineSpinConfig {
  speedMultiplier?: number;
  minLoopsToStopExtension?: number;
}

/**
 * Slot makinesi oluşturulurken kullanılacak opsiyonlar.
 */
export interface MachineOptions extends ContainerOptions {
  reelConfig: {
    type: "normal" | "individual" | "fall" | ReelClassConstructor; // Updated type
    count?: number;
    options?: Partial<Omit<ReelOptions, "symbolConfig" | "reelIndex">> &
      Partial<Omit<IndividualReelOptions, "symbolConfig" | "reelIndex">> & {
        symbolConfig?: MachineOptions["symbolConfig"];
      };
  }[];
  symbolConfig: {
    [symbolId: string]: SymbolOptions;
  };
  machineConfig: {
    useMask?: boolean;
    showMask?: boolean;
    showExcess?: boolean;
    mask?: {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      points?: number[] | PointData[];
    };
    cellWidth: number;
    reelSpacing: number;
    cellHeight: number;
    visibleCount: number;
    reelSpinDelay?: number;
    reelStopDelay?: number;
    defaultAdrenalineSpinConfig?: AdrenalineSpinConfig;
    defaultSpinParams?: MachineSpinParams;
    defaultStopParams?: MachineStopParams;
    defaultReelSetLength?: number;
    defaultReelSet?: string[] | number;
    initialSymbols?: string[][];
    defaultShuffleReels?: boolean; // Whether to shuffle the initial reel strips
  };
}

/**
 * Slot makarası oluşturulurken kullanılacak tam opsiyonlar.
 */
export interface ReelOptions extends ContainerOptions {
  reelIndex: number;
  cellHeight: number;
  cellWidth: number;
  visibleCount: number;
  direction?: "up" | "down";
  reelSet?: string[] | number;
  extraCount?: number;
  initialSymbols?: string[];
  symbolConfig: MachineOptions["symbolConfig"];
  adrenalineSpinConfig?: AdrenalineSpinConfig;
  useMask?: boolean;
  stripes?: string[]; // For reels, the textures that will be used for the strip
  stripeBlur?: BlurFilterOptions;
  shuffle?: boolean; // Whether to shuffle the reel strip symbols
}

export interface ReelSpinParams {
  duration?: number;
  easeInType?: string; // Easing type for the initial spin animation
  easeInDuration?: number; // Duration for the initial spin easing
  spinEase?: string;
}

export interface ReelStopParams {
  landingSymbols: string[];
  stopDuration?: number;
  stopEase?: string;
}
/**
 * Configuration for a single cell within an IndividualReel.
 * Inherits most of ReelOptions but excludes some that IndividualReel will manage.
 */
export interface CellReelConfig
  extends Partial<
    Omit<
      ReelOptions,
      | "reelIndex"
      | "visibleCount"
      | "cellHeight"
      | "cellWidth"
      | "initialSymbols"
    >
  > {
  // reelIndex, visibleCount, cellHeight, cellWidth will be set by IndividualReel.
  // initialSymbols for cell reels will be derived from IndividualReel's initialSymbols.
  // Specific symbolConfig or reelSet for this cell can be provided here.
  // If symbolConfig is not provided, it will inherit from IndividualReel or Machine.
}

/**
 * Options specific to an IndividualReel.
 * IndividualReel's cellHeight and cellWidth in its base ReelOptions
 * will define the dimensions of each individual cell.
 */
export interface IndividualReelOptions extends ReelOptions {
  rowCount: number;
  columnCount: number;
  /** Common configuration for all cell reels. */
  reelDefaultConfig?: CellReelConfig;
  /** Specific configurations for each cell reel, indexed row by row. Overrides cellReelDefaultConfig. */
  reelConfigs?: (CellReelConfig | undefined)[]; // Array of configs, length = rowCount * columnCount
  /** Delay in milliseconds between spinning/stopping each cell reel. */
  startDelay?: number;
  /** The class constructor to use for creating cell reels. Defaults to NormalReel. */
  cellReelClass?: ReelClassConstructor;
}

/**
 * Bir makaranın nasıl kurulacağını tanımlayan arayüz.
 */
export type ReelClassConstructor = new (
  options: ReelOptions,
  symbolPool: SymbolPool,
  defaultReelLengthFromMachine: number
) => AbstractReel;

// ---> MACHINE INTERFACE <---
export interface IMachine extends Container {
  // Public properties
  events: EventEmitter<MachineEvents>; // Machine events emitter
  reels: AbstractReel[]; // Array of reels in the machine
  reelSpinDelay: number; // Delay between starting each reel's spin
  reelStopDelay: number; // Delay between stopping each reel
  defaultReelSet: string[]; // Default reel strip configuration
  displaySymbols: SlotSymbol[][]; // Current symbols displayed on the reels

  // Reel management methods
  addReel(
    reelConfigOrInstance: AbstractReel | MachineOptions["reelConfig"][number],
    atIndex?: number
  ): AbstractReel | null;

  removeReel(reelArrayIndexToRemove: number): AbstractReel | null;

  refresh(symbols: string[][]): void;

  // Spin control methods
  spinMachine(spinParams?: MachineSpinParams, isAdrenalineSpin?: boolean): void;

  provideStopData(stopParams: MachineStopParams): void;

  forceStop(): void;

  // Nudge methods
  triggerNudgeOnReel(
    reelIndex: number,
    newSymbolId: string,
    nudgeDirection?: "up" | "down"
  ): Promise<void>;

  triggerMultipleReelNudges(
    nudgeData: Array<{
      index: number;
      symbol: string;
      direction?: "up" | "down";
    }>,
    nudgeOptions?: NudgeRunnerOptions
  ): Promise<void>;

  // Cascade methods
  triggerCascadeOnReel(
    reelIndex: number,
    extract: number[],
    insert: string[],
    animationName?: string
  ): Promise<void>;

  triggerMultipleCascades(
    cascadeData: {
      [reelIndex: number]: {
        extract: number[]; // Positions to remove symbols
        insert: string[]; // New symbols to insert
      };
    },
    cascadeOptions?: CascadeRunnerOptions,
    animationName?: string // Optional animation name for the cascade
  ): Promise<void>;

  // Cleanup method
  destroy(): void;

  // Dynamic machine configuration method
  setOptions(newOptions: MachineOptions, preserveReelStates?: boolean): void;
}

export type MachineClassConstructor = new (options: MachineOptions) => IMachine;
export interface MachineSpinParams extends Partial<ReelSpinParams> {
  reelSpinDelay?: number;
}

export interface MachineStopParams
  extends Partial<Omit<ReelStopParams, "landingSymbols">> {
  landingSymbols: string[][];
  reelStopDelay?: number;
}

// ---> UI INTERFACES <---
// !TODO : Add more specific types for symbolConfig and reelConfig
export interface UIVisualOptions {
  buyFeature?: {
    /** Buy feature button component - required for single option scenarios */
    buyFeatureButton?: IBuyFeatureButton;
    /** Buy feature menu component - required for multiple option scenarios */
    buyFeatureMenu?: IBuyFeatureMenu;
    /** Buy feature confirmation dialog - required for purchase confirmation */
    buyFeatureConfirmation?: IBuyFeatureConfirmation;
    enabled?: boolean;
  };
  symbolTextures: { [symbolId: string]: UISymbolOptions };
}
export interface InitialUIOptions {
  bets: UIBetOptions; // Bet configuration options
  credits: number; // Initial credits to display
  currencyCode?: string; // Currency code for display (e.g., "USD", "EUR")
  language?: string; // Language code for localization (e.g., "en", "tr")
  autoplayValues?: number[] | { start: number; end: number; step: number }; // Autoplay values configuration
  availableBuyFeatures: BuyFeatureOption[];
}

export interface UIBetOptions {
  betLevels?: number[]; // Array of bet levels available
  coinValues?: number[]; // Array of coin values available
  betWayValues?: number[]; // Array of bet way values available
  betLine: number; // Default bet line
  betAmount: number; // Default bet amount
  betAmounts?: number[]; // Array of bet amounts available
}

export interface IGameUI extends Container {
  availableBuyFeatures: BuyFeatureOption[]; // Available buy features
  buyFeatureButton: IBuyFeatureButton;
  buyFeatureMenu: IBuyFeatureMenu;
  buyFeatureConfirmation: IBuyFeatureConfirmation;
  initialize(
    actor: ActorRef<GameMachineType, any, GameEvent>,
    options: InitialUIOptions
  ): void;
  loadFonts(): Promise<void>; // Load custom fonts for the UI
  checkFontsLoaded(): void; // Check if fonts are loaded
  showCurrentWin?(
    params: any,
    gameMode: GameMode,
    tickupDuration?: number,
    showWinMessageDelay?: number
  ): void;
  incrementFreespinCount?(count: number): void;
  setFreespinTotalWin?(params: any, tickupDuration: number, gameMode?: GameMode): void;
  setVisibility(target: "all" | "spinArea" | "infoTextArea", visible: boolean): void;
  setTurboSwitchVisible(visible: boolean): void;
  showFreespinCountStart?(count: number): void;
}

export type GameUIConstructor = new (
  options?: InitialUIOptions,
  visual?: UIVisualOptions
) => IGameUI;

export interface PopupData {
  type: string;
  data: any;
}

// ---> PROVIDER INTERFACES <---
export interface IProviderInfo {
  id: string; // Unique identifier for the provider
  name: string; // Display name of the provider
  gameId: string; // Unique identifier for the game instance
  lobbyUrl?: string; // Optional URL to the provider's lobby
  logoUrl?: string; // Optional URL to the provider's logo
  description?: string; // Optional description of the provider
  currency?: string; // Optional currency used by the provider
  gameplayMode?: GameplayMode; // Gameplay mode supported by the provider
  token?: string;
  testerToken?: string; // Optional token for testing purposes
  clientId?: string; // Optional client ID for the provider
  historyDetailType?: string; // Optional history detail type
  historyDetailId?: string; // Optional history detail ID
}
export type ProviderNames = "everymatrix";
export type ProviderList = {
  [K in ProviderNames]?: (url: string) => IProviderInfo;
};
// ---> SERVER INTERFACES <---
export interface IServer {
  provider: IProviderInfo; // Provider information
  domain: string; // Server domain
  device: "desktop" | "mobile" | "tablet";
  readonly gameType: string; // Game type (e.g., "slot")
  request<T = any>(params: { path: string; payload?: any }): Promise<T>;
  destroy(): void; // Cleanup method to destroy the server instance
}
export interface ServerOptions {
  url: string;
  protocol: "http" | "https";
}
export type ServerEndPoint = "init" | "spin" | "freespin" | "bonusBuy";
export interface ServerData {
  currentAction?: ServerEndPoint; // Current action being processed
  nextAction?: ServerEndPoint; // Next action to be processed
  prevCredits?: number; // Previous player credits
  credits?: number; // Player credits
  betAmount?: number; // Bet amount
  betAmounts?: number[]; // Available bet amounts
  betLine?: number; // Bet line
  betLevel?: number; // Bet level
  coinValue?: number; // Coin value
  betLevels?: number[]; // Available bet levels
  coinValues?: number[]; // Available coin values
  betWayValues?: number[]; // Available bet ways
  roundWinAmount?: number; // Round win total
  totalWinAmount?: number; // Session win total
  freeSpins?: number; // Free spins remaining
  freeSpinExtra: number; // Extra free spins to animate (not yet added to freeSpins)
  freeSpinsUsed?: number; // Free spins used in current session
  freeSpinMultiplier?: number; // Free spin multiplier
  reels?: string[][]; // Reel state for animation
  finalReels?: string[][]; // Final reel state
  wins?: WinRunnerData[] | CascadeRunnerData[]; // Detailed win info
  nudges?: NudgeRunnerData[]; // Win actions
  bigWins?: BigWinRunnerData[]; // Big win actions

  // Free round packages
  availableFreeRoundPackages?: FreeRoundsPackage[];
  activeFreeRoundPackage?: FreeRoundsPackage | null;
  // Replay round packages
  replayRoundPackage?: ReplayRoundPackage | null;
}
// Adapter Function Types
export type RequestAdapterFn = (params: { path: string; payload?: any }) => {
  path: string;
  payload?: any;
};
export type ResponseAdapterFn = (rawResponse: any) => {
  nextGameState: ServerData | null;
  rawGameState: any;
};

// ---> SLOT GAME INTERFACES <---
export type FeatureTypes =
  | "win"
  | "bigWin"
  | "freeSpinIntro"
  | "freeSpinOutro"
  | "nudge";
export type FeatureList = {
  [K in FeatureTypes]?: Engine.RunnerFactoryConfig;
};
// Interfaces
export interface AutoplaySettings {
  count: number; // Number of auto spins
  winLimit: number | null; // Win limit (null = unlimited)
  lossLimit: number | null; // Loss limit (null = unlimited)
  stopOnFeature: boolean; // Stop when feature is triggered
}

export type GameSpeedMode = "normal" | "quick" | "turbo";
export type GameMode = "spin" | "freespin";
export type GameplayMode = "real" | "fun" | "replay"; // Gameplay modes
export interface GameRules {
  // Removed showWinFirst - using standard flow now
  disableAutoplay?: boolean; // Whether to disable autoplay functionality
  disableBuyFeature?: boolean; // Whether to disable buy feature functionality
  autoplayDelay?: number; // Delay in milliseconds before next autoplay spin (default: 500ms)
  minimumSpinDuration?: number; // Minimum spin duration in milliseconds before processing server response (default: 1000ms)
  forceMinimumSpinDuration?: boolean; // Whether to enforce minimum spin duration even if server response is fast
  autoplayValues?: number[] | { start: number; end: number; step: number }; // Autoplay values configuration
  winStartDelay?: number; // Delay before starting win animations (default: 1000ms)
  delayAfterBigWin?: number; // Delay after big win completion before continuing (default: 1000ms)
  delayAfterFreeSpinIntro?: number; // Delay after free spin intro completion before continuing (default: 1000ms)
  delayAfterFreeSpinOutro?: number; // Delay after free spin outro completion before continuing (default: 1000ms)
  delayShowWinMessageUI?: number; // Delay to show winning amounts in win area
  delayShowWinMessageUITurbo?: number; // Delay to show winning amounts in win area in Turbo mode
  winTickupDuration?: number; // counting duration for winning amounts in win area
  winTickupDurationTurbo?: number; // counting duration for winning amounts in win area in Turbo mode
  /**
   * If a server response takes longer than this threshold (in ms),
   * trigger a simple loading overlay until the response arrives.
   * Default set in GameStates (e.g., 5000ms).
   */
  longRequestDelay?: number;
  /**
   * Extra pause after each spin fully completes (win or no-win, base or free).
   * Applied before transitioning to next spin/idle/free spin step.
   */
  delayAfterSpinEnd?: number;

  /**
   * Delay after free spins conclude before transitioning to the next state.
   */
  postFreeSpinsDelay?: number;
}
export interface ReplayRoundPackage {
  isReplayModeCompleted: boolean;
}
export interface FreeRoundsPackage {
  id: string;
  name: string;
  betValue: number; // Bet value for this package
  totalWin: number;
  roundCount: number;
  usedCount: number;
  endDate: string;
  isBonus: boolean; // Whether this package is a bonus or regular free rounds
}
export interface BuyFeatureOption {
  id: string;
  name: string;
  description: string;
  basePrice: number; // Base price multiplier (e.g., 100 = 100x bet)
  icon?: string; // Optional icon path
  isAvailable: boolean; // Whether this feature is currently available
}

// Buy feature visual component interfaces
export interface IBuyFeatureButton {
  // Container properties
  container: Container;
  add?: boolean; // Whether to add this menu to the UI

  // Methods to update button state
  setEnabled(enabled: boolean): void;
  setVisible(visible: boolean): void;
  updatePrice(price: string): void;
  updateFeatureId(featureId: string): void;
  setActiveText?(bonusActivated: boolean): void; // optional method

  // Event callback setters
  onButtonClick?: (featureId?: string, price?: number) => void;
}

export interface IBuyFeatureMenu {
  // Container properties
  container: Container;
  add?: boolean; // Whether to add this menu to the UI

  // Methods to update menu state
  setEnabled(enabled: boolean): void;
  setVisible(visible: boolean): void;
  updateOptions(options: BuyFeatureOption[]): void;
  updatePrices(betAmount: number): void;
  close(): void;

  // Event callback setters
  onOptionSelected?: (featureId: string, price: number) => void;
}

export interface IBuyFeatureConfirmation {
  // Container properties
  container: Container;
  add?: boolean;
  // Methods to update confirmation state
  setEnabled(enabled: boolean | { cancel?: boolean; confirm?: boolean }): void;
  setVisible(visible: boolean): void;
  showConfirmation(featureId: string, betAmount: number): void;
  close(): void;
  updatePrice(price: string): void;
  // Event callback setters
  onConfirmed?: (featureId: string) => void;
  onCancelled?: () => void;
}
export interface GameContext extends ServerData {
  game: Engine.BaseGame; // Game instance
  server: IServer; // Server instance for API requests
  machine: IMachine; // Machine options for the slot game
  ui?: IGameUI; // UI configuration, optional
  features?: FeatureList; // List of available features
  requestAdapterFn: RequestAdapterFn; // Request adapter function
  responseAdapterFn: ResponseAdapterFn; // Response adapter function

  error: string | null; // Error message
  popup: PopupData | null; // Popup data
  timeouts: Record<string | "minimumDuration", NodeJS.Timeout | null>; // Timeout references for various operations

  // ---> Autoplay State <---
  autoplayCount: number;
  autoplayTotalWin: number;
  autoplayWinLimit: number | null;
  autoplayLossLimit: number | null;
  isAutoplayActive: boolean;
  isAutoplayStopped: boolean; // Flag to indicate if autoplay was stopped by user
  initialAutoplayCredits: number;
  autoplaySettings: AutoplaySettings | null;

  // ---> Server Game State <---
  nextGameState: ServerData | null; // Processed game state
  rawGameState: any; // Raw server response
  savedGameData: ServerData | null;

  // ---> Slot Game State <---
  isNonBaseGameActive: boolean; // Indicates special game mode (freespin/feature)
  isSpinBlocked: boolean; // NEW: Separate flag for blocking spins during animations
  ping: number; // Server response time in milliseconds
  rules: GameRules; // Game rules configuration
  gameMode: GameMode; // NEW: Current game mode (spin/freespin/respin)
  gameplayMode: GameplayMode; // Current gameplay mode (real/fun/replay)
  stateBeforeAction: GameContext | null;
  stateBeforePopup: any | null; // Previous state before popup
  gameSpeed: GameSpeedMode; // Current game speed mode
  skipSwitch: boolean; // Current skip switch state
  isSpinning: boolean;
  isWaitingForStopData: boolean;
  isForceStopped: boolean;
  reelsExpectedToStop: number;
  isWinRunning: boolean; // Flag to indicate if win processing is active
  isBigWinRunning: boolean; // Flag to indicate if big win processing is active
  isNudgeRunning: boolean; // Flag to indicate if nudge processing is active
  /**
   * When true, do not start the reels immediately on spin. Send the server request first and
   * only start the machine after a successful response. Used when credits are insufficient
   * but a server-validated spin is allowed.
   */
  deferMachineSpin: boolean;
  featureId?: string; // Currently active feature ID
  freeRoundRejected: boolean; // Flag to indicate if free round was rejected
  oldBetAmount: number; // Previous bet amount
}

export interface IStateMachineAction<TLogic extends AnyActorLogic> {
  (args: {
    context: ContextFrom<TLogic>;
    event: EventFrom<TLogic>;
    self: ActorRefFrom<TLogic>;
  }): void;
}

export interface GameOptions {
  machine?: {
    className: MachineClassConstructor | string;
    options: MachineOptions;
  };
  ui?: {
    className: GameUIConstructor | string;
    options?: InitialUIOptions;
    visual?: UIVisualOptions;
  };
  requestAdapterFn?: RequestAdapterFn;
  responseAdapterFn?: ResponseAdapterFn;
  rules?: GameRules;
  features?: FeatureList; // List of available features
  provideConf?: GameProvideConfig; // Type-safe slot game specific configuration
}

export type GameActionNames = ActionNamesFromLogic<GameLogicType>;

// ---> WIN PROCESSING INTERFACES <---
export interface WinRunnerData extends Engine.RunnerData {
  matrix: number[][]; // Matrix of symbols on the reels
  multiplier?: number;
  amount: number; // Base win amount
  finalAmount?: number;
  animationName?: string; // Animation to play for the win
}
// Win processing options
export interface WinRunnerOptions extends Engine.RunnerOptions {}

// ---> BIG WIN PROCESSING INTERFACES <---
export interface BigWinRunnerData extends Engine.RunnerData {
  amount: number;
  winType: BigWinType;
}
export type BigWinType =
  | "NORMAL"
  | "BIG"
  | "SUPER"
  | "MEGA"
  | "SENSATIONAL"
  | null;
// Big win processing options
export interface BigWinRunnerOptions extends Engine.RunnerOptions {
  totalDuration?: number; // Default duration for big win animations
}

// --> CASCADE PROCESSING INTERFACES <--
export interface CascadeRunnerData extends Engine.RunnerData {
  matrix: {
    [reelIndex: number]: {
      extract: number[]; // Positions to remove symbols
      insert: string[]; // New symbols to insert
    };
  };
  multiplier?: number;
  amount: number; // Base win amount
  finalAmount?: number;
  subAmounts?: number[]; // Sub amounts for each symbol inserted
  symbols?: string[]; // Winning symbols
  animationName?: string; // Animation to play for the win
  winnerSymbols?: IWinnerSymbol[];
  waysWins?: WaysWin[];
}

export interface WaysWin {
  symbolId: number;
  ways: number;
  amount: number;
}

// Cascade processing options
export interface CascadeRunnerOptions extends Engine.RunnerOptions {
  delayBetweenReels?: number; // Delay between processing different reels
  configs?: ICascadeConfigs;
  symbolWinAmountLabelsAllowed?: boolean;
}

export interface ICascadeConfigs {
  dropDuration?: number;
  staggerDelay?: number;
  easing?: gsap.EaseString;
}

export type IPosition = [row: number, col: number, symbolId: number];
export type IWinnerSymbol = [symbolId: number, positions: IPosition[]];

// ---> NUDGE PROCESSING INTERFACES <---
export interface NudgeRunnerData extends Engine.RunnerData {
  reelIndex: number; // Index of the reel to nudge
  direction: "up" | "down";
  symbolId: string;
}
// Nudge processing options
export interface NudgeRunnerOptions extends Engine.RunnerOptions {
  delayBetweenReels?: number; // Delay between nudging different reels
  allowMultipleNudges?: boolean; // Allow multiple nudges in a single processing phase
}

// ---> FREE SPIN INTRO INTERFACES <---
export interface FreeSpinIntroRunnerData extends Engine.RunnerData {
  totalFreeSpin: number;
}
export interface FreeSpinIntroRunnerOptions extends Engine.RunnerOptions {}

// ---> FREE SPIN OUTRO INTERFACES <---
export interface FreeSpinOutroRunnerData extends Engine.RunnerData {
  totalFreeSpin: number;
  totalWin: number; // Total win amount during free spins
}
export interface FreeSpinOutroRunnerOptions extends Engine.RunnerOptions {}

// ---> XSTATE V5 PROVIDE METHOD INTERFACES <---

/**
 * XState v5 provide() method parameters interface
 * This interface defines all the possible parameters that can be overridden
 * when using stateMachine.provide() to customize a state machine
 */
export interface StateMachineProvideConfig<
  TLogic extends AnyActorLogic,
  TActionNames extends string = string
> {
  /**
   * Override or add custom actions
   * Actions are functions that perform side effects (no state changes)
   */
  actions?: Record<TActionNames, IStateMachineAction<TLogic>>;

  /**
   * Override or add custom guards (conditions)
   * Guards determine whether transitions should occur
   */
  guards?: Record<
    string,
    (args: {
      context: ContextFrom<TLogic>;
      event: EventFrom<TLogic>;
      self: ActorRefFrom<TLogic>;
    }) => boolean
  >;

  /**
   * Override or add custom actors (child machines, promises, observables, etc.)
   * Actors are spawnable entities that can be invoked or spawned
   */
  actors?: Record<string, AnyActorLogic>;

  /**
   * Override delays used in `after` transitions
   * Can be static numbers or functions that return numbers
   */
  delays?: Record<
    string,
    | number
    | ((args: {
        context: ContextFrom<TLogic>;
        event: EventFrom<TLogic>;
        self: ActorRefFrom<TLogic>;
      }) => number)
  >;

  /**
   * Custom schemas for validation and type checking
   * Used for runtime validation of events and context
   */
  schemas?: Record<string, any>;

  /**
   * Override input validation and transformation
   * Function to validate and transform input when machine is created
   */
  input?: (input: any) => any;

  /**
   * Override output transformation
   * Function to transform output when machine reaches final state
   */
  output?: (args: {
    context: ContextFrom<TLogic>;
    event: EventFrom<TLogic>;
    self: ActorRefFrom<TLogic>;
  }) => any;
}

// ---> TYPE-SAFE SLOT GAME PROVIDE CONFIGURATION EXAMPLES <---

/**
 * Type-safe action names that can be used in GameProvideConfig.actions
 * These are extracted from the actual slot game logic setup
 */
export type ValidGameActionNames = ActionNamesFromLogic<GameLogicType>;

/**
 * Type-safe guard names that can be used in GameProvideConfig.guards
 * These are extracted from the actual slot game logic setup
 */
export type ValidGameGuardNames = GuardNamesFromLogic<GameLogicType>;

/**
 * Type-safe actor names that can be used in GameProvideConfig.actors
 * These are extracted from the actual slot game logic setup
 */
export type ValidGameActorNames = ActorNamesFromLogic<GameLogicType>;

/**
 * Specific interface for Slot Game state machine customization
 * Provides slot-specific implementations for state machine overrides
 * Type-safe with actual slot game logic types
 */
export interface GameProvideConfig {
  /**
   * Override or add custom actions for slot game state machine
   * Type-safe: only allows actions that exist in the slot game logic setup
   */
  actions?: Partial<
    Record<
      ActionNamesFromLogic<GameLogicType>,
      IStateMachineAction<GameLogicType>
    >
  >;

  /**
   * Override or add custom guards for slot game state machine
   * Type-safe: only allows guards that exist in the slot game logic setup
   */
  guards?: Partial<
    Record<
      GuardNamesFromLogic<GameLogicType>,
      (args: {
        context: GameContext;
        event: EventFrom<GameLogicType>;
        self: ActorRefFrom<GameLogicType>;
      }) => boolean
    >
  >;

  /**
   * Override or add custom actors for slot game state machine
   * Type-safe: only allows actors that exist in the slot game logic setup
   */
  actors?: Partial<Record<ActorNamesFromLogic<GameLogicType>, AnyActorLogic>>;

  /**
   * Override delays used in `after` transitions
   */
  delays?: Record<
    string,
    | number
    | ((args: {
        context: GameContext;
        event: EventFrom<GameLogicType>;
        self: ActorRefFrom<GameLogicType>;
      }) => number)
  >;

  /**
   * Custom schemas for validation and type checking
   */
  schemas?: Record<string, any>;

  /**
   * Override input validation and transformation
   */
  input?: (input: any) => any;

  /**
   * Override output transformation
   */
  output?: (args: {
    context: GameContext;
    event: EventFrom<GameLogicType>;
    self: ActorRefFrom<GameLogicType>;
  }) => any;
}

/**
 * Utility type for extracting action names from a state machine logic
 */
export type ActionNamesFromLogic<T> = T extends { actions: infer A }
  ? A extends Record<infer K, any>
    ? K
    : never
  : never;

/**
 * Utility type for extracting guard names from a state machine logic
 */
export type GuardNamesFromLogic<T> = T extends { guards: infer G }
  ? G extends Record<infer K, any>
    ? K
    : never
  : never;

/**
 * Utility type for extracting actor names from a state machine logic
 */
export type ActorNamesFromLogic<T> = T extends { actors: infer A }
  ? A extends Record<infer K, any>
    ? K
    : never
  : never;
