import { Assets, BigPool, Container } from "pixi.js";

import type { BaseGame } from "../core";
import { CreateInstance } from "../utils";
import { IScene, Scene } from "./Scene";

/**
 * Navigation system for managing application screens
 * Handles screen transitions, popups, and lifecycle methods
 */
export class Navigation {
  /** Reference to the main application */
  public app!: BaseGame;

  /** Container for screens - holds all active screens */
  public container = new Container();

  /** Application width */
  public width = 0;

  /** Application height */
  public height = 0;

  /** Constant background view for all screens */
  public background?: IScene;

  /** Current screen being displayed */
  public currentScreen?: IScene;

  /** Current popup being displayed */
  public currentPopup?: IScene;

  /**
   * Initialize the navigation system
   * @param app Reference to the game application
   */
  public init(app: BaseGame) {
    this.app = app;
  }

  /**
   * Set the default background screen
   * @param ctor Constructor for the background screen
   */
  public setBackground(ctor: Scene) {
    this.background = CreateInstance(ctor);
    this.background.game = this.app;
    this.addAndShowScreen(this.background);
  }

  /**
   * Add screen to the stage, link update & resize functions
   * @param screen The screen to add and show
   * @private
   */
  private async addAndShowScreen(screen: IScene) {
    // Add navigation container to stage if it does not have a parent yet
    if (!this.container.parent) {
      this.app.stage.addChild(this.container);
    }

    // Add screen to stage
    this.container.addChild(screen);

    if (screen.isCreated !== true && screen.create) {
      await screen.create();
    }
    screen.isCreated = true;

    // Setup things and pre-organize screen before showing
    if (screen.prepare) {
      screen.prepare();
    }

    // Add screen's resize handler, if available
    if (screen.resize) {
      // Trigger a first resize
      screen.resize(
        this.width,
        this.height,
        this.width > this.height ? "landscape" : "portrait"
      );
    }

    // Add update function if available
    if (screen.update) {
      this.app.ticker.add(screen.update, screen);
    }

    // Show the new screen
    if (screen.show) {
      screen.interactiveChildren = false;
      await screen.show();
      screen.interactiveChildren = true;
    }
  }

  /**
   * Remove screen from the stage, unlink update & resize functions
   * @param screen The screen to hide and remove
   * @private
   */
  private async hideAndRemoveScreen(screen: IScene) {
    // Prevent interaction in the screen
    screen.interactiveChildren = false;

    // Hide screen if method is available
    if (screen.hide) {
      await screen.hide();
    }

    // Unlink update function if method is available
    if (screen.update) {
      this.app.ticker.remove(screen.update, screen);
    }

    // Remove screen from its parent (usually app.stage, if not changed)
    if (screen.parent) {
      screen.parent.removeChild(screen);
    }

    // Clean up the screen so that instance can be reused again later
    if (screen.reset) {
      screen.reset();
    }
  }

  /**
   * Hide current screen (if there is one) and present a new screen.
   * Any class that matches AppScreen interface can be used here.
   * @param ctor Constructor for the screen to show
   */
  public async showScreen(ctor: Scene, force = false) {
    // Eğer mevcut bir ekran varsa ve force değilse, interactivity'yi kapat
    if (this.currentScreen && !force) {
      this.currentScreen.interactiveChildren = false;
    }

    // Eğer yeni ekranın assetBundles özelliği varsa, assetleri yükle
    if (ctor.assetBundles) {
      await Assets.loadBundle(ctor.assetBundles, (progress) => {
        if (this.currentScreen?.onLoad) {
          this.currentScreen.onLoad(progress * 100);
        }
      });
    }

    // Mevcut ekran varsa ve force değilse, onLoad çağır ve ekranı gizle/kaldır
    if (this.currentScreen?.onLoad && !force) {
      this.currentScreen.onLoad(100);
    }

    if (this.currentScreen && !force) {
      await this.hideAndRemoveScreen(this.currentScreen);
    }

    // Yeni ekranı oluştur ve ekle
    this.currentScreen = BigPool.get(ctor);
    this.currentScreen.game = this.app;
    await this.addAndShowScreen(this.currentScreen);
  }

  /**
   * Resize screens when viewport dimensions change
   * @param width Viewport width
   * @param height Viewport height
   */
  public resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.currentScreen?.resize?.(
      width,
      height,
      width >= height ? "landscape" : "portrait"
    );
    this.currentPopup?.resize?.(
      width,
      height,
      width >= height ? "landscape" : "portrait"
    );
    this.background?.resize?.(
      width,
      height,
      width >= height ? "landscape" : "portrait"
    );
  }

  /**
   * Show up a popup over current screen
   * Pauses the current screen and shows a modal popup on top
   * @param ctor Constructor for the popup to show
   */
  public async presentPopup(ctor: Scene) {
    // Disable interaction and pause current screen
    if (this.currentScreen) {
      this.currentScreen.interactiveChildren = false;
      await this.currentScreen.pause?.();
    }

    // Hide any existing popup
    if (this.currentPopup) {
      await this.hideAndRemoveScreen(this.currentPopup);
    }

    // Create and show the new popup
    this.currentPopup = CreateInstance(ctor);
    await this.addAndShowScreen(this.currentPopup);
  }

  /**
   * Dismiss current popup, if there is one
   * Resumes the underlying screen
   */
  public async dismissPopup() {
    if (!this.currentPopup) return;
    const popup = this.currentPopup;
    this.currentPopup = undefined;
    await this.hideAndRemoveScreen(popup);

    // Re-enable interaction and resume the main screen
    if (this.currentScreen) {
      this.currentScreen.interactiveChildren = true;
      this.currentScreen.resume?.();
    }
  }

  /**
   * Blur screens when app loses focus
   * Called when the application window loses focus
   */
  public blur() {
    this.currentScreen?.blur?.();
    this.currentPopup?.blur?.();
    this.background?.blur?.();
  }

  /**
   * Focus screens when app gains focus
   * Called when the application window gains focus
   */
  public focus() {
    this.currentScreen?.focus?.();
    this.currentPopup?.focus?.();
    this.background?.focus?.();
  }
}
