import { BaseGame, getEngine } from "../core";
import { String2Ref } from "../utils";
import {
  RunnerOptions,
  IRunner,
  IRunnerVisual,
  RunnerEvents,
  RunnerData,
  RunnerState,
  RunnerConstructor,
  RunnerFactoryConfig,
  RunnerVisualConstructor,
} from "./interfaces";

export class Runner<
  TData extends RunnerData = RunnerData,
  TOptions extends RunnerOptions = RunnerOptions,
  TState extends RunnerState = RunnerState
> implements IRunner<TData, TOptions, TState>
{
  visual?: IRunnerVisual<TData, TOptions, TState>;
  state!: TState;
  options!: TOptions;
  events!: RunnerEvents<TData, TState>;
  game!: BaseGame;

  constructor(
    options: TOptions,
    events: RunnerEvents<TData, TState> = {},
    visual?:
      | IRunnerVisual<TData, TOptions, TState>
      | RunnerVisualConstructor<TData, TOptions, TState>
      | undefined
  ) {
    this.game = getEngine();
    this.options = options;
    this.events = events;
    this.reset();
    if (typeof visual === "function") {
      visual = new visual();
    }
    this.visual = visual;
    this.state.phase = "initialized";
  }

  static Create({
    className,
    options,
    events,
    visual,
  }: RunnerFactoryConfig): IRunner | null {
    let runner: IRunner | null = null;
    if (typeof className === "string") {
      className = String2Ref(className) as RunnerConstructor;
    }
    if (className) {
      if (typeof visual === "string") {
        visual = String2Ref(visual) as IRunnerVisual | RunnerVisualConstructor;
      }
      if (typeof visual === "function") {
        visual = new visual();
      }
      runner = new className(options, events, visual) as IRunner;
    }
    return runner;
  }

  initialize(data: TData[]): TState {
    const validateDatas = this.validateData(data);
    this.reset();
    this.state = {
      ...this.state,
      total: validateDatas.length,
      remaining: validateDatas.length,
      pendingsData: validateDatas,
      phase: "processing",
    } as TState;

    this.events.onInitialize?.(validateDatas, this.state);

    let prom = null;
    if (this.visual) {
      prom = this.visual.initialize(this.options, this.events.onInteraction);
    }
    if (prom && prom instanceof Promise) {
      prom
        .catch((error) => {
          this.addError(`Visual initialize error: ${error}`);
        })
        .finally(() => {
          setTimeout(() => this.runNext(), this.options?.autoStartDelay || 0);
        });
    } else if (this.options?.autoStart !== false) {
      setTimeout(() => this.runNext(), this.options?.autoStartDelay || 0);
    }
    return this.state;
  }

  hasMore(): boolean {
    const result = this.state.pendingsData.length > 0;

    if (!result && this.state.phase !== "completed") this.tryFinalizeRunner();

    return result;
  }

  runNext(): void {
    if (!this.hasMore()) {
      return;
    }
    const nextData = this.state.pendingsData.shift();
    if (!nextData) {
      this.runNext();
      return;
    }
    nextData.processingStartTime = Date.now();
    nextData.processingStartTime = Date.now();
    this.state.currentData = nextData as TData;
    this.state.rIndex++;

    this.events.onCurrentStart?.(nextData as TData);

    if (this.visual) {
      const prom = this.visual.show(nextData as TData, this.options as TOptions);
      if (prom && prom instanceof Promise) {
        prom
          .catch((error) => {
            this.addError(
              `Visual data sbow error: ${error}`,
              nextData as TData
            );
          })
          .finally(() => {
            this.completeCurrent();
          });
      } else if (nextData?.duration) {
        setTimeout(() => this.completeCurrent(), nextData.duration);
      }
    } else if (nextData?.duration) {
      setTimeout(() => this.completeCurrent(), nextData.duration);
    }
  }

  getCurrent(): TData | null {
    return this.state.currentData as TData | null;
  }

  completeCurrent(): void {
    const item = this.getCurrent();
    if (item) {
      item.isProcessed = true;
      item.processingEndTime = Date.now();
      this.state.processed++;
      this.state.remaining--;
      this.state.currentData = null;
      this.state.completedData.push(item);

      this.events.onCurrentComplete?.(item);
      if (this.visual && this.visual.updateContent) {
        const prom = this.visual.updateContent(item);
        if (prom && prom instanceof Promise) {
          prom
            .catch((error) => {
              this.addError(`Visual update content error: ${error}`);
            })
            .finally(() => {
              if (this.state.phase === "processing") {
                this.runNext();
              }
            });
        } else if (this.state.phase === "processing") {
          this.runNext();
        }
      } else if (this.state.phase === "processing") {
        this.runNext();
      }
    } else {
      this.tryFinalizeRunner();
    }
  }

  tryFinalizeRunner(): void {
    if (this.state.pendingsData.length === 0) {
      if (this.visual && this.visual.finish) {
        const prom = this.visual.finish(this.getState());
        if (prom && prom instanceof Promise) {
          prom
            .catch((error) => {
              this.addError(`Visual finalizing error: ${error}`);
            })
            .finally(() => {
              this.hideVisual();
            });
        } else {
          this.hideVisual();
        }
      } else {
        this.hideVisual();
      }
    }
  }

  protected hideVisual(): void {
    if (this.visual && this.visual.hide) {
      const prom = this.visual?.hide();
      if (prom && prom instanceof Promise) {
        prom
          .catch((error) => {
            this.addError(`Visual hide error: ${error}`);
          })
          .finally(() => {
            this.finalizeRunner();
          });
      } else {
        this.finalizeRunner();
      }
    } else {
      this.finalizeRunner();
    }
  }

  finalizeRunner() {
    this.state.phase = "completed";
    const state = this.getState();
    if (this.events.onFinish) {
      this.events.onFinish(
        [
          ...this.state.completedData,
          ...this.state.pendingsData,
          ...this.state.skippedData,
        ] as TData[],
        state
      );
    }
  }

  skipCurrent(): void {
    if (this.options?.skipAllowed === false) {
      return;
    }
    const item = this.getCurrent();
    if (item) {
      item.isSkipped = true;
      item.processingEndTime = Date.now();
      this.state.processed++;
      this.state.remaining--;
      this.state.currentData = null;
      this.state.skippedData.push(item);
      this.events.onCurrentSkip?.(item);
      if (this.visual?.skip) {
        const prom = this.visual.skip();
        if (prom && prom instanceof Promise) {
          prom
            .catch((error) => {
              this.addError(`Visual data skip error: ${error}`);
            })
            .finally(() => {
              this.runNext();
            });
        } else {
          this.runNext();
        }
      } else {
        this.runNext();
      }
    } else {
      this.tryFinalizeRunner();
    }
  }

  sortByPriority(data: TData[]): TData[] {
    return [...data].sort((a: any, b: any) => {
      const priorityA = a.priority || 5;
      const priorityB = b.priority || 5;
      return priorityB - priorityA;
    });
  }

  getState(): TState {
    return { ...this.state };
  }
  reset(): void {
    this.state = {
      ...this.createState(),
    } as TState;
  }

  addError(error: string, item?: TData | undefined): void {
    this.state.errors.push({ message: error, item });
    this.events.onError?.(error, item);
  }

  createState(): TState {
    return {
      total: 0,
      rIndex: 0,
      processed: 0,
      remaining: 0,
      currentData: null,
      pendingsData: [],
      skippedData: [],
      completedData: [],
      errors: [],
      warnings: [],
      phase: "initialized",
    } as unknown as TState;
  }

  enhanceData(data: TData[]): TData[] {
    return data;
  }

  validateData(data: TData[]): TData[] {
    data = this.enhanceData(data);
    if (this.options?.priorityBased) {
      data = this.sortByPriority(data);
    }
    return data;
  }
  destroy(): void {
    this.reset();
    if (this.visual) {
      this.visual.destroy();
    }
    this.visual = undefined;
  }
}
