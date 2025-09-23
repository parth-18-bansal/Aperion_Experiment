// ---> RUNNER INTERFACES <---
export interface RunnerOptions {
  sequential?: boolean;
  priorityBased?: boolean;
  skipAllowed?: boolean;
  autoStart?: boolean;
  autoStartDelay?: number;
  [key: string]: any; // Allow additional properties for flexibility
}
export interface RunnerEvents<TData = RunnerData, TState = RunnerState> {
  onInitialize?: (datas: TData[], result: TState) => void;
  onCurrentStart?: (data: TData) => void;
  onCurrentComplete?: (data: TData) => void;
  onCurrentSkip?: (data: TData) => void;
  onInteraction?: (type: string, data: any) => void;
  onFinish?: (datas: TData[], result: TState) => void;
  onError?: (error: string, data?: TData) => void;
}
export interface RunnerData {
  skipable?: boolean;
  priority?: number;
  isProcessed?: boolean;
  isSkipped?: boolean;
  processingStartTime?: number;
  processingEndTime?: number;
  duration?: number; // Duration of the animation
  [key: string]: any; // Allow additional properties for flexibility
}
export type RunnerPhase =
  | "initialized"
  | "processing"
  | "completed"
  | "destroyed";

export interface RunnerState {
  total: number;
  processed: number;
  remaining: number;
  currentData: RunnerData | null;
  pendingsData: RunnerData[];
  skippedData: RunnerData[];
  completedData: RunnerData[];
  errors: Array<{ message: string; item?: RunnerData }>;
  phase: RunnerPhase;
  rIndex: number; // Index of the current data being processed
  [key: string]: any; // Allow additional properties for flexibility
}
/**
 * Generic processor visual interface for handling presentation layer
 */
export interface IRunnerVisual<
  TData extends RunnerData = RunnerData,
  TOptions extends RunnerOptions = RunnerOptions,
  TState extends RunnerState = RunnerState
> {
  /**
   * Initialize the visual with configuration
   */
  initialize(
    config?: TOptions,
    onInteraction?: (type: string, data: any) => void
  ): Promise<void> | void;

  show(data: TData, options?: TOptions): Promise<void> | void;

  hide(): Promise<void> | void;

  /**
   * Update the visual with new data
   */
  updateContent?(data: TData): Promise<void> | void;

  destroy(): void;

  skip?(): Promise<void> | void;

  finish?(result?: TState): Promise<void> | void;
}
/**
 * Generic processor interface
 */
export interface IRunner<
  TData extends RunnerData = RunnerData,
  TOptions extends RunnerOptions = RunnerOptions,
  TState extends RunnerState = RunnerState
> {
  visual?: IRunnerVisual<TData, TOptions, TState>;
  state: TState;
  options: TOptions;
  events: RunnerEvents<TData, TState>;

  initialize(data: TData[]): TState;

  hasMore(): boolean;

  runNext(): void;

  completeCurrent(): void;

  tryFinalizeRunner(): void;

  skipCurrent(): void;

  getCurrent(): TData | null;

  getState(): TState;

  reset(): void;

  addError(error: string, item?: TData): void;

  createState(): TState;

  enhanceData(data: TData[]): TData[];

  validateData(data: TData[]): TData[];

  sortByPriority(data: TData[]): TData[];

  destroy(): void;
}

export type RunnerConstructor<
  TData extends RunnerData = RunnerData,
  TOptions extends RunnerOptions = RunnerOptions,
  TState extends RunnerState = RunnerState
> = new (
  options: TOptions,
  events?: RunnerEvents<TData, TState>,
  visual?: IRunnerVisual<TData, TOptions, TState>
) => IRunner<TData, TOptions, TState>;

export type RunnerVisualConstructor<
  TData extends RunnerData = RunnerData,
  TOptions extends RunnerOptions = RunnerOptions,
  TState extends RunnerState = RunnerState
> = new (...args: any[]) => IRunnerVisual<TData, TOptions, TState>;

export interface RunnerFactoryConfig<
  TData extends RunnerData = RunnerData,
  TOptions extends RunnerOptions = RunnerOptions,
  TState extends RunnerState = RunnerState
> {
  className: string | RunnerConstructor<TData, TOptions, TState>;
  options: TOptions;
  events?: RunnerEvents<TData, TState>;
  visual?:
    | IRunnerVisual<TData, TOptions, TState>
    | RunnerVisualConstructor<TData, TOptions, TState>
    | string;
  data?: TData[];
}
