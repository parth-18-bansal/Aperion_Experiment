import { Container, Ticker } from "pixi.js";
import { BaseGame } from "../core";

/**
 * Interface for app screens
 * Defines the contract for all screen implementations in the application
 */
export interface IScene extends Container {
  isCreated?: boolean;
  game: BaseGame;
  create?(): Promise<void>;
  /**
   * Show the screen - called when the screen becomes visible
   * @returns Promise that resolves when the screen is fully shown
   */
  show?(): Promise<void>;

  /**
   * Hide the screen - called when the screen is being removed
   * @returns Promise that resolves when the screen is fully hidden
   */
  hide?(): Promise<void>;

  /**
   * Pause the screen - called when screen is temporarily inactive (e.g., when showing a popup)
   * @returns Promise that resolves when the screen is fully paused
   */
  pause?(): Promise<void>;

  /**
   * Resume the screen - called when screen becomes active again
   * @returns Promise that resolves when the screen is fully resumed
   */
  resume?(): Promise<void>;

  /**
   * Prepare screen - called before the screen is shown
   * Use for initial setup before showing the screen
   */
  prepare?(): void;

  /**
   * Reset screen - called after the screen is hidden
   * Use for cleanup to allow screen reuse
   */
  reset?(): void;

  /**
   * Update the screen - called every frame when the screen is active
   * @param time Ticker instance that provides timing information
   */
  update?(time: Ticker): void;

  /**
   * Resize the screen - called when the application window changes size
   * @param width New width of the application
   * @param height New height of the application
   */
  resize?(
    width: number,
    height: number,
    orientation: "landscape" | "portrait"
  ): void;

  /**
   * Called when the application loses focus
   */
  blur?(): void;

  /**
   * Called when the application gains focus
   */
  focus?(): void;

  /**
   * Method to react on assets loading progress
   * @param progress Loading progress from 0 to 100
   */
  onLoad?: (progress: number) => void;
}

/**
 * Interface for app screens constructors
 * Defines the contract for screen class constructors
 */
export interface Scene {
  new(): IScene;

  /**
   * List of assets bundles required by the screen
   * These bundles will be automatically loaded before showing the screen
   */
  assetBundles?: string[];
}
