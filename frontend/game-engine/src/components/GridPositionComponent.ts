import { Container, isMobile } from "pixi.js";
import { Logger } from "../logger";
import { Component } from "./Component";

export interface GridPosition {
  /** Grid X coordinate (center-based, 0 = center, negative = left, positive = right) */
  x: number;
  /** Grid Y coordinate (center-based, 0 = center, negative = up, positive = down) */
  y: number;
  /** Alignment within the grid cell (0-1, 0.5 = center) */
  alignX?: number;
  /** Alignment within the grid cell (0-1, 0.5 = center) */
  alignY?: number;
}

export interface GridConfig {
  /** Number of columns in the grid */
  columns: number;
  /** Number of rows in the grid */
  rows: number;
  /** Position within the grid */
  position: GridPosition;
  /** Optional margins (in pixels) */
  margin?: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };
}

export interface GridPositionComponentOptions {
  /** Grid configuration for landscape orientation */
  landscape: GridConfig;
  /** Grid configuration for portrait orientation */
  portrait: GridConfig;
  /** Positioning mode: "global" uses screen dimensions, "local" uses parent container dimensions */
  positioning?: "global" | "local";
}

/**
 * GridPositionComponent - Positions game objects on a virtual grid system
 *
 * This component divides the screen into a grid and positions the attached
 * game object at specified grid coordinates. The grid uses a center-based
 * coordinate system where (0,0) represents the center of the screen.
 * It automatically adjusts positioning based on screen orientation (landscape/portrait).
 */
export class GridPositionComponent extends Component {
  private currentOrientation: "landscape" | "portrait" = "landscape";
  // Narrow the base class property type for this component without emitting JS
  public declare gameObject: Container;
  // Keep a stable reference for event subscription
  private readonly onResizeHandler: (width: number, height: number) => void;

  constructor(
    gameObject: Container,
    conf:
      | Record<"desktop" | "mobile" | "tablet", GridPositionComponentOptions>
      | GridPositionComponentOptions
  ) {
    super(gameObject, conf);
    this.onResizeHandler = this.onResize.bind(this);

    // Check if conf is a responsive configuration
    if (this.isResponsiveConfig(conf)) {
      // Handle responsive configuration
      const deviceType = isMobile.tablet
        ? "tablet"
        : isMobile.any
        ? "mobile"
        : "desktop";
      const selectedConfig = conf[deviceType];
      this.conf = selectedConfig;
      Logger.log(`GridPositionComponent: Using ${deviceType} configuration`);
    } else {
      // Handle single configuration
      this.conf = conf;
      Logger.log("GridPositionComponent: Using single configuration");
    }

    if (this.conf) {
      // Set default positioning mode if not provided
      if (this.conf.positioning === undefined) {
        this.conf.positioning = "global";
      }

      // Set default alignment values if not provided
      this.setDefaultAlignment(this.conf.landscape?.position);
      this.setDefaultAlignment(this.conf.portrait?.position);
    }
  }

  /**
   * Type guard to check if configuration is responsive
   */
  private isResponsiveConfig(
    conf:
      | Record<"desktop" | "mobile" | "tablet", GridPositionComponentOptions>
      | GridPositionComponentOptions
  ): conf is Record<
    "desktop" | "mobile" | "tablet",
    GridPositionComponentOptions
  > {
    return (
      typeof conf === "object" &&
      ("desktop" in conf || "mobile" in conf || "tablet" in conf)
    );
  }

  private setDefaultAlignment(position: GridPosition | undefined): void {
    if (position) {
      if (position.alignX === undefined) position.alignX = 0.5;
      if (position.alignY === undefined) position.alignY = 0.5;
    }
  }

  /**
   * Handles resize events from the renderer
   */
  private onResize(_width: number, _height: number): void {
    if (!this.conf) {
      Logger.warn(
        "GridPositionComponent: No configuration provided for resize"
      );
      return;
    }
    // Determine orientation (respect forceOrientation if set)
    const forced = this.game.resizeOptions?.forceOrientation;
    if (this.conf.positioning === "global") {
      const screenSize = this.getAvailableScreenSize();
      const availWidth = screenSize.availWidth;
      const availHeight = screenSize.availHeight;
      const newOrientation =
        forced && forced !== "auto"
          ? forced
          : availWidth >= availHeight
          ? "landscape"
          : "portrait";
      this.currentOrientation = newOrientation;
      // Compute visible world rect to position within (handles cover mode cropping)
      const rect = this.getVisibleWorldRect(
        newOrientation,
        availWidth,
        availHeight
      );
      const visibleWidth = rect.visibleWidth;
      const visibleHeight = rect.visibleHeight;
      const offsetX = rect.offsetX;
      const offsetY = rect.offsetY;

      Logger.log(
        `GridPositionComponent.onResize: vis(${visibleWidth.toFixed(
          0
        )}x${visibleHeight.toFixed(0)}) offs(${offsetX.toFixed(
          1
        )},${offsetY.toFixed(1)}) (${newOrientation})`
      );

      this.updatePosition(visibleWidth, visibleHeight, offsetX, offsetY);
    } else {
      // For local positioning, get parent container dimensions
      if (this.gameObject.parent) {
        const newOrientation =
          forced && forced !== "auto"
            ? forced
            : this.gameObject.parent.width >= this.gameObject.parent.height
            ? "landscape"
            : "portrait";
        this.currentOrientation = newOrientation;

        Logger.log(
          `GridPositionComponent.onResize (local): ${this.gameObject.parent.width}x${this.gameObject.parent.height} (${newOrientation})`
        );

        this.updatePosition(
          this.gameObject.parent.width,
          this.gameObject.parent.height
        );
      }
    }
  }

  /**
   * Updates the position of the game object based on current grid configuration
   */
  private updatePosition(
    screenWidth: number,
    screenHeight: number,
    offsetX: number = 0,
    offsetY: number = 0
  ): void {
    if (!this.conf) {
      Logger.warn("GridPositionComponent: No configuration provided");
      return;
    }
    const config =
      this.currentOrientation === "landscape"
        ? this.conf.landscape || null
        : this.conf.portrait || null;

    if (!config) {
      Logger.warn(
        "GridPositionComponent: No grid configuration found for current orientation"
      );
      return;
    }

    const margin = config.margin || {};
    const marginLeft = margin.left || 0;
    const marginRight = margin.right || 0;
    const marginTop = margin.top || 0;
    const marginBottom = margin.bottom || 0;

    // Calculate available space after margins
    const availableWidth = screenWidth - marginLeft - marginRight;
    const availableHeight = screenHeight - marginTop - marginBottom;

    // Calculate grid cell dimensions
    const cellWidth = availableWidth / (config.columns ?? 2);
    const cellHeight = availableHeight / (config.rows ?? 2);

    // Calculate center position of the available area
    const centerX = marginLeft + availableWidth / 2;
    const centerY = marginTop + availableHeight / 2;

    // Calculate position within the specified grid cell (center-based)
    const position = config.position;
    const cellStartX = centerX + position.x * cellWidth;
    const cellStartY = centerY + position.y * cellHeight;

    // Apply alignment within the cell
    const finalX = cellStartX + cellWidth * (position.alignX! - 0.5) + offsetX;
    const finalY = cellStartY + cellHeight * (position.alignY! - 0.5) + offsetY;

    // Update game object position
    this.gameObject.x = finalX;
    this.gameObject.y = finalY;

    Logger.log(
      `GridPositionComponent: Positioned at (${finalX.toFixed(
        2
      )}, ${finalY.toFixed(2)}) ` +
        `in grid cell (${position.x}, ${position.y}) with alignment (${position.alignX}, ${position.alignY})`
    );
  }

  /**
   * Get the available screen size from app.resizeTo target
   */
  private getAvailableScreenSize(): {
    availWidth: number;
    availHeight: number;
  } {
    const target = (this.game as any).resizeTo as Window | HTMLElement | null;
    if (!target || target === globalThis.window) {
      return {
        availWidth: globalThis.innerWidth,
        availHeight: globalThis.innerHeight,
      };
    }
    const el = target as HTMLElement;
    return { availWidth: el.clientWidth, availHeight: el.clientHeight };
  }

  /**
   * Compute the visible world rect (width/height) and world offset for cover mode cropping.
   * For contain/stretch, offset is 0 and visible area equals full game world.
   */
  private getVisibleWorldRect(
    orientation: "landscape" | "portrait",
    availWidth: number,
    availHeight: number
  ): {
    visibleWidth: number;
    visibleHeight: number;
    offsetX: number;
    offsetY: number;
  } {
    const resizeOptions = this.game.resizeOptions ?? {};
    let scaleMode = (resizeOptions as any).scaleMode ?? "contain";
    const alignOpt = (resizeOptions as any).align ?? 0.5;
    const alignX = typeof alignOpt === "number" ? alignOpt : alignOpt.x ?? 0.5;
    const alignY = typeof alignOpt === "number" ? alignOpt : alignOpt.y ?? 0.5;

    const cfg = resizeOptions.gameConfig?.[orientation];
    // Fallbacks to renderer size if config missing
    const gameWidth = cfg?.width ?? this.game.renderer.width ?? 1280;
    const gameHeight = cfg?.height ?? this.game.renderer.height ?? 720;
    const minWidth = cfg?.minWidth ?? gameWidth;
    const minHeight = cfg?.minHeight ?? gameHeight;

    // If cover is requested but the available size is below minimums, fallback to contain
    if (
      scaleMode === "cover" &&
      (availWidth < minWidth || availHeight < minHeight)
    ) {
      scaleMode = "contain";
    }

    if (scaleMode === "cover") {
      const scale = Math.max(availWidth / gameWidth, availHeight / gameHeight);
      const minScale = Math.max(
        minWidth / gameWidth,
        minHeight / gameHeight,
        0
      );
      const s = Math.max(scale, minScale);
      const visibleWidth = availWidth / s;
      const visibleHeight = availHeight / s;
      const offsetX = (gameWidth - visibleWidth) * alignX;
      const offsetY = (gameHeight - visibleHeight) * alignY;
      return { visibleWidth, visibleHeight, offsetX, offsetY };
    }

    // contain or stretch: full world is visible
    return {
      visibleWidth: gameWidth,
      visibleHeight: gameHeight,
      offsetX: 0,
      offsetY: 0,
    };
  }

  /**
   * Called when the component is added to an entity
   */
  onAdded(): void {
    Logger.log("GridPositionComponent.onAdded");

    // Listen to resize events from the renderer for global positioning
    this.gameObject.game.renderer.on("resize", this.onResizeHandler);
    if (this.conf?.positioning !== "global") {
      this.gameObject.on("added", this.onGameObjectAdded, this);
    }
    // Initial positioning
    this.onResize(
      this.gameObject.game.renderer.width,
      this.gameObject.game.renderer.height
    );
  }

  private onGameObjectAdded(): void {
    Logger.log("GridPositionComponent: GameObject added to parent");
    this.onResize(
      this.gameObject.game.renderer.width,
      this.gameObject.game.renderer.height
    );
  }

  /**
   * Called when the component is removed from an entity
   */
  onRemoved(): void {
    Logger.log("GridPositionComponent.onRemoved");

    if (this.gameObject.game?.renderer) {
      this.gameObject.game.renderer.off("resize", this.onResizeHandler);
    }
    this.gameObject.off("added", this.onGameObjectAdded, this);
  }

  /**
   * Called when the component is destroyed
   */
  destroy(): void {
    Logger.log("GridPositionComponent.destroy");
    this.onRemoved();
  }

  /**
   * Updates the grid configuration for a specific orientation
   */
  updateGridConfig(
    orientation: "landscape" | "portrait",
    config: GridConfig
  ): void {
    this.conf[orientation] = config;
    this.setDefaultAlignment(config.position);

    // Re-apply positioning if this is the current orientation
    if (this.currentOrientation === orientation) {
      if (this.conf.positioning === "global") {
        // Reuse same logic as onResize for consistency
        this.onResize(this.game.renderer.width, this.game.renderer.height);
      } else if (this.conf.positioning === "local") {
        if (this.gameObject.parent) {
          this.updatePosition(
            this.gameObject.parent.width,
            this.gameObject.parent.height
          );
        }
      }
    }
  }

  /**
   * Gets the current grid configuration based on orientation
   */
  getCurrentGridConfig(): GridConfig {
    return this.currentOrientation === "landscape"
      ? this.conf.landscape
      : this.conf.portrait;
  }

  /**
   * Gets the current orientation
   */
  getCurrentOrientation(): "landscape" | "portrait" {
    return this.currentOrientation;
  }
}
