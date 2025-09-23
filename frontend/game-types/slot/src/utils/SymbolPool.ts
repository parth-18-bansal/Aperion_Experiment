import { Engine, Logger } from "game-engine";
import { AnimatedSpriteOptions, SpriteOptions, Texture } from "pixi.js";
import {
  SymbolOptions as ISymbolOptions,
  ISymbolVisual,
  MachineOptions,
} from "../interfaces";
import { SlotSymbol } from "../SlotSymbol";
import { AnimatedSpriteVisual } from "../visuals/AnimatedSpriteVisual";
import { SpineVisual } from "../visuals/SpineVisual";
import { SpriteVisual } from "../visuals/SpriteVisual";

export class SymbolPool {
  private pool: Map<string, SlotSymbol[]> = new Map();
  private symbolFactory: (id: string, options?: ISymbolOptions) => SlotSymbol;
  private globalSymbolCfg: MachineOptions["symbolConfig"];

  constructor(
    symbolFactory: (id: string, options?: ISymbolOptions) => SlotSymbol,
    globalSymbolCfg: MachineOptions["symbolConfig"]
  ) {
    this.symbolFactory = symbolFactory;
    this.globalSymbolCfg = globalSymbolCfg;
  }

  /**
   * Gets a symbol from the pool or creates a new one if none are available.
   * @param symbolId - The identifier for the symbol type.
   * @param overrideOptions - Optional configuration to override the default settings.
   * @returns A configured symbol instance ready for use.
   */
  public get(symbolId: string, overrideOptions?: ISymbolOptions): SlotSymbol {
    if (!this.pool.has(symbolId)) {
      this.pool.set(symbolId, []);
    }
    const symbols = this.pool.get(symbolId)!;
    let symbol: SlotSymbol;
    if (symbols.length > 0) {
      symbol = symbols.pop()!;
      // Override options apply (if needed, usually handled in the factory)
    } else {
      const baseSymbolConfigForId = this.globalSymbolCfg[symbolId];
      symbol = this.symbolFactory(
        symbolId,
        { ...baseSymbolConfigForId, ...overrideOptions } // overrideOptions should be passed to the factory here
      );
    }
    symbol.reset(); // Always reset
    symbol.setVisible(true); // Make visible
    symbol.label = `${symbolId}`; // Set the label
    return symbol;
  }

  /**
   * Returns a symbol to the pool for later reuse.
   * @param symbol - The symbol to return to the pool.
   */
  public return(symbol: SlotSymbol): void {
    if (!this.pool.has(symbol.id)) {
      this.pool.set(symbol.id, []);
    }
    symbol.reset(); // Reset before returning to pool
    symbol.setVisible(false); // Make invisible
    this.pool.get(symbol.id)!.push(symbol);
  }

  public destroy(): void {
    this.pool.forEach((symbols) => {
      symbols.forEach((symbol) => symbol.destroy());
    });
    this.pool.clear();
  }

  public static createSymbolFactory(
    globalSymbolConfigMaster: MachineOptions["symbolConfig"]
  ): (id: string, overrideOptions?: ISymbolOptions) => SlotSymbol {
    return (id: string, overrideOptions?: ISymbolOptions): SlotSymbol => {
      const baseConfig = globalSymbolConfigMaster[id];
      if (!baseConfig) {
        Logger.error(
          `Symbol base config not found in globalSymbolConfigMaster for ID: ${id}. Overrides:`,
          overrideOptions
        );
        // Create a dummy symbol in case of error
        const dummyTexture = Texture.EMPTY;
        const visual: ISymbolVisual = new SpriteVisual(dummyTexture);
        const finalErrorOptions: ISymbolOptions = {
          ...(overrideOptions || {}), // Apply overrides if any, but core error props take precedence
          visualType: "sprite",
          animations: undefined,
          symName: id, // Ensure symName is set
        };
        return new SlotSymbol(id, visual, finalErrorOptions);
      }

      const mergedConfig = { ...baseConfig, ...overrideOptions };

      const cfgToUse: ISymbolOptions = {
        ...mergedConfig,
        symName: mergedConfig.symName || id,
      };

      if (!cfgToUse.visualType) {
        Logger.error(
          `VisualType not found for ID: ${id} after merge. Base:`,
          baseConfig,
          "Overrides:",
          overrideOptions,
          "Merged and Final cfgToUse (before error):",
          cfgToUse
        );
        const dummyTexture = Texture.EMPTY;
        const visual: ISymbolVisual = new SpriteVisual(dummyTexture);
        const finalErrorOptions: ISymbolOptions = {
          ...cfgToUse,
          symName: cfgToUse.symName,
          visualType: "sprite",
          animations: undefined,
        };
        return new SlotSymbol(id, visual, finalErrorOptions);
      }

      let visual: ISymbolVisual;

      switch (cfgToUse.visualType) {
        case "sprite":
          visual = new SpriteVisual(
            cfgToUse.visualOptions as SpriteOptions,
            cfgToUse.animations || {}
          );
          break;
        case "animatedSprite":
          visual = new AnimatedSpriteVisual(
            cfgToUse.visualOptions as AnimatedSpriteOptions,
            cfgToUse.animations || {}
          );
          break;
        case "spine":
          visual = new SpineVisual(
            cfgToUse.visualOptions as Engine.SpineOptions,
            cfgToUse.animations || {}
          );
          break;
        default:
          Logger.warn(
            `Unknown visual type for symbol ${id}: '${cfgToUse.visualType}'. Using default SpriteVisual.`
          );
          visual = new SpriteVisual(Texture.EMPTY, cfgToUse.animations || {});
          cfgToUse.visualType = "sprite";
          cfgToUse.animations = undefined;
          break;
      }
      return new SlotSymbol(id, visual, cfgToUse);
    };
  }
}
